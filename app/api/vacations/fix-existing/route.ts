import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { assignVacationDays, syncVacationPeriods } from '@/lib/services/vacationPeriods'

/**
 * API para corregir vacaciones existentes que no tienen period_year ni descuentos
 * Solo accesible para super_admin
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que sea super admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Solo super administradores pueden ejecutar esta corrección' },
        { status: 403 }
      )
    }

    // Obtener todas las vacaciones aprobadas o tomadas sin period_year
    const { data: vacations, error: vacError } = await supabase
      .from('vacations')
      .select(`
        *,
        employees!inner(
          id,
          hire_date
        )
      `)
      .in('status', ['aprobada', 'tomada'])
      .is('period_year', null)

    if (vacError) throw vacError

    if (!vacations || vacations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay vacaciones para corregir',
        fixed: 0,
      })
    }

    const results = []
    let fixed = 0
    let errors = 0

    for (const vacation of vacations) {
      try {
        const employee = vacation.employees as any
        const periodYear = new Date(vacation.start_date).getFullYear()

        // Sincronizar períodos del empleado
        await syncVacationPeriods(vacation.employee_id, employee.hire_date)

        // Asignar días usando FIFO
        await assignVacationDays(vacation.employee_id, vacation.days_count)

        // Actualizar vacación con period_year y request_date
        const { error: updateError } = await supabase
          .from('vacations')
          .update({
            period_year: periodYear,
            request_date: vacation.request_date || vacation.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          })
          .eq('id', vacation.id)

        if (updateError) throw updateError

        results.push({
          vacation_id: vacation.id,
          employee_id: vacation.employee_id,
          days: vacation.days_count,
          period_year: periodYear,
          status: 'success',
        })

        fixed++
      } catch (err: any) {
        results.push({
          vacation_id: vacation.id,
          employee_id: vacation.employee_id,
          error: err.message,
          status: 'error',
        })
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Corrección completada: ${fixed} vacaciones corregidas, ${errors} errores`,
      fixed,
      errors,
      details: results,
    })
  } catch (error: any) {
    console.error('Error al corregir vacaciones:', error)
    return NextResponse.json(
      { error: error.message || 'Error al corregir vacaciones' },
      { status: 500 }
    )
  }
}
