import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'
import { createAuditService } from '@/lib/services/auditService'

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
        .select('company_id')
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
    }

    // Insertar vacación (period_year se pasa desde el cliente si es necesario)
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
