import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { createAuditService } from '@/lib/services/auditService'
import { getVacationPeriods } from '@/lib/services/vacationPeriods'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API para que un trabajador solicite vacaciones
 * Solo puede solicitar vacaciones para sí mismo
 * Valida días disponibles antes de crear la solicitud
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que es trabajador
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, company_id, full_name, rut, hire_date')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ 
        error: 'No se encontró información del trabajador' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { start_date, end_date, notes } = body

    // Validaciones
    if (!start_date || !end_date) {
      return NextResponse.json({ 
        error: 'Las fechas de inicio y fin son requeridas' 
      }, { status: 400 })
    }

    const start = new Date(start_date)
    const end = new Date(end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (start < today) {
      return NextResponse.json({ 
        error: 'La fecha de inicio no puede ser anterior a hoy' 
      }, { status: 400 })
    }

    if (end < start) {
      return NextResponse.json({ 
        error: 'La fecha de fin debe ser posterior a la fecha de inicio' 
      }, { status: 400 })
    }

    // Calcular días hábiles (excluyendo sábados y domingos)
    let daysCount = 0
    const currentDate = new Date(start)
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No es domingo (0) ni sábado (6)
        daysCount++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (daysCount <= 0) {
      return NextResponse.json({ 
        error: 'Debe seleccionar al menos un día hábil' 
      }, { status: 400 })
    }

    // ✅ Determinar el período usando FIFO (del más antiguo con días disponibles)
    // Obtener TODOS los períodos (incluyendo archivados) para FIFO correcto
    const allPeriods = await getVacationPeriods(employee.id, true) // ✅ true = incluir archivados
    const sortedPeriods = [...allPeriods].sort((a, b) => a.period_year - b.period_year)
    
    // Encontrar el primer período con días disponibles (FIFO)
    // Incluye archivados si tienen días disponibles (legal en Chile por mutuo acuerdo)
    const firstAvailablePeriod = sortedPeriods.find(p => 
      (p.accumulated_days - p.used_days) > 0
    )
    
    // Si no hay periodo disponible, usar el año de la fecha de inicio como fallback
    const periodYear = firstAvailablePeriod ? firstAvailablePeriod.period_year : start.getFullYear()

    // Crear solicitud de vacaciones
    const vacationData: any = {
      employee_id: employee.id,
      start_date,
      end_date,
      days_count: daysCount,
      status: 'solicitada', // Estado: solicitada
      request_date: new Date().toISOString().split('T')[0],
      requested_by: user.id,
      requested_at: new Date().toISOString(),
      period_year: periodYear, // ✅ Asignar período FIFO
    }

    if (notes?.trim()) {
      vacationData.notes = notes.trim()
    }

    const { data: vacation, error: vacError } = await supabase
      .from('vacations')
      .insert(vacationData)
      .select()
      .single()

    if (vacError) {
      console.error('Error al crear vacaciones:', vacError)
      return NextResponse.json({ 
        error: vacError.message || 'Error al crear la solicitud de vacaciones' 
      }, { status: 500 })
    }

    // Registrar evento de auditoría
    try {
      const auditService = createAuditService(supabase)
      await auditService.logEvent({
        companyId: employee.company_id,
        employeeId: employee.id,
        actorUserId: user.id,
        source: 'employee_portal',
        actionType: 'vacation.requested',
        module: 'vacations',
        entityType: 'vacations',
        entityId: vacation.id,
        status: 'success',
        afterData: {
          start_date: start_date,
          end_date: end_date,
          days_count: daysCount,
          status: 'solicitada',
        },
        metadata: {
          notes: notes || null,
        },
      }).catch((err) => console.error('Error al registrar auditoría:', err))
    } catch (auditError) {
      // No interrumpir el flujo si falla el logging
      console.error('Error al registrar auditoría:', auditError)
    }

    return NextResponse.json({ 
      success: true, 
      vacation,
      message: `Solicitud de vacaciones creada exitosamente por ${daysCount} día(s) hábil(es). Será revisada por un administrador.` 
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error al solicitar vacaciones:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}




