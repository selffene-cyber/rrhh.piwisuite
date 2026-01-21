import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'
import { createAuditService } from '@/lib/services/auditService'
import { getVacationPeriods, assignVacationDays, syncVacationPeriods } from '@/lib/services/vacationPeriods'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener el companyId del empleado para verificar permisos
    if (body.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id, hire_date')
        .eq('id', body.employee_id)
        .single()

      if (!employee) {
        return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
      }

      // Verificar permisos del usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const isSuperAdmin = profile?.role === 'super_admin'

      if (!isSuperAdmin) {
        const { data: permissions } = await supabase
          .from('user_permissions')
          .select('can_create_vacations')
          .eq('user_id', user.id)
          .eq('company_id', employee.company_id)
          .single()

        if (!permissions?.can_create_vacations) {
          return NextResponse.json(
            { error: 'No tienes permiso para crear vacaciones' },
            { status: 403 }
          )
        }
      }

      // Validar que el empleado pueda recibir una vacación (requiere contrato activo)
      const { employee: employeeValidator } = createValidationServices(supabase)
      const validation = await employeeValidator.canCreateVacation(body.employee_id)
      
      const errorResponse = handleValidationError(validation)
      if (errorResponse) return errorResponse

      // ✅ Determinar el período usando FIFO (del más antiguo con días disponibles)
      // Primero sincronizar períodos
      await syncVacationPeriods(body.employee_id, employee.hire_date)
      
      // Obtener TODOS los períodos (incluyendo archivados) para FIFO correcto
      const allPeriods = await getVacationPeriods(body.employee_id, true) // ✅ true = incluir archivados
      const sortedPeriods = [...allPeriods].sort((a, b) => a.period_year - b.period_year)
      
      // Encontrar el primer período con días disponibles (FIFO)
      // Incluye archivados si tienen días disponibles (legal en Chile por mutuo acuerdo)
      const firstAvailablePeriod = sortedPeriods.find(p => 
        (p.accumulated_days - p.used_days) > 0
      )
      
      // Si no hay periodo disponible o no se especifica start_date, usar el año actual como fallback
      const startDate = body.start_date ? new Date(body.start_date) : new Date()
      const periodYear = firstAvailablePeriod ? firstAvailablePeriod.period_year : startDate.getFullYear()
      
      // ✅ Asignar el period_year calculado con FIFO
      body.period_year = periodYear

      // Si el estado es 'aprobada' o 'tomada', descontar días inmediatamente
      if (body.status === 'aprobada' || body.status === 'tomada') {
        try {
          const updatedPeriods = await assignVacationDays(
            body.employee_id,
            body.days_count
          )
          
          // Actualizar period_year con el periodo real asignado
          if (updatedPeriods.length > 0) {
            body.period_year = updatedPeriods[0].period_year
          }
          
          console.log(`✅ Días asignados usando FIFO: ${body.days_count} días del periodo ${body.period_year}`)
        } catch (error) {
          console.error('Error al asignar días:', error)
          // Continuar con la creación pero advertir
        }
      }
    }

    // Insertar vacación con period_year calculado
    const { data, error } = await supabase
      .from('vacations')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    // Obtener company_id del empleado
    let companyId: string | null = null
    if (body.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', body.employee_id)
        .single()
      
      companyId = employee?.company_id || null
    }

    // Registrar evento de auditoría
    if (companyId) {
      try {
        const auditService = createAuditService(supabase)
        await auditService.logEvent({
          companyId,
          employeeId: body.employee_id,
          actorUserId: user.id,
          source: 'admin_dashboard',
          actionType: 'vacation.requested',
          module: 'vacations',
          entityType: 'vacations',
          entityId: data.id,
          status: 'success',
          afterData: {
            start_date: body.start_date,
            end_date: body.end_date,
            days_count: body.days_count,
            status: body.status,
          },
          metadata: {
            request_date: body.request_date,
          },
        })
      } catch (auditError) {
        console.error('Error al registrar auditoría:', auditError)
        // No interrumpir el flujo
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear vacación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear vacación' },
      { status: 500 }
    )
  }
}
