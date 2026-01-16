import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { calculateAccumulatedVacations, calculateBusinessDays } from '@/lib/services/vacationCalculator'

export const dynamic = 'force-dynamic'

/**
 * API para obtener el dashboard del trabajador
 * Incluye: saldo de vacaciones, resumen de solicitudes, próximas vacaciones
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que es trabajador y obtener su información
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

    // Calcular vacaciones acumuladas y disponibles
    let vacationBalance = {
      accumulated: 0,
      used: 0,
      available: 0,
    }

    if (employee.hire_date) {
      const accumulated = calculateAccumulatedVacations(employee.hire_date)
      
      // Obtener días usados (solo vacaciones aprobadas o tomadas)
      const { data: usedVacations } = await supabase
        .from('vacations')
        .select('days_count')
        .eq('employee_id', employee.id)
        .in('status', ['aprobada', 'tomada'])

      const used = usedVacations?.reduce((sum, v) => sum + (v.days_count || 0), 0) || 0
      
      vacationBalance = {
        accumulated: Math.round(accumulated * 100) / 100,
        used,
        available: Math.max(0, Math.round((accumulated - used) * 100) / 100),
      }
    }

    // Obtener resumen de solicitudes
    // Certificados
    const { data: certificates } = await supabase
      .from('certificates')
      .select('id, status')
      .eq('employee_id', employee.id)

    const certificatesStats = {
      total: certificates?.length || 0,
      approved: certificates?.filter(c => c.status === 'approved' || c.status === 'issued').length || 0,
      pending: certificates?.filter(c => c.status === 'requested').length || 0,
      rejected: certificates?.filter(c => c.status === 'rejected').length || 0,
    }

    // Vacaciones
    const { data: vacations } = await supabase
      .from('vacations')
      .select('id, status')
      .eq('employee_id', employee.id)

    const vacationsStats = {
      total: vacations?.length || 0,
      approved: vacations?.filter(v => v.status === 'aprobada' || v.status === 'tomada').length || 0,
      pending: vacations?.filter(v => v.status === 'solicitada').length || 0,
      rejected: vacations?.filter(v => v.status === 'rechazada' || v.status === 'rejected').length || 0,
    }

    // Permisos
    const { data: permissions } = await supabase
      .from('permissions')
      .select('id, status')
      .eq('employee_id', employee.id)

    const permissionsStats = {
      total: permissions?.length || 0,
      approved: permissions?.filter(p => p.status === 'approved' || p.status === 'applied').length || 0,
      pending: permissions?.filter(p => p.status === 'requested').length || 0,
      rejected: permissions?.filter(p => p.status === 'rejected').length || 0,
    }

    // Próximas vacaciones aprobadas
    const { data: upcomingVacations } = await supabase
      .from('vacations')
      .select('id, start_date, end_date, days_count, status')
      .eq('employee_id', employee.id)
      .in('status', ['aprobada', 'tomada'])
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(5)

    // Próximos permisos aprobados
    const { data: upcomingPermissions } = await supabase
      .from('permissions')
      .select('id, start_date, end_date, days, permission_type_code, permission_types (name)')
      .eq('employee_id', employee.id)
      .in('status', ['approved', 'applied'])
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(5)

    return NextResponse.json({
      employee: {
        id: employee.id,
        full_name: employee.full_name,
        rut: employee.rut,
      },
      vacationBalance,
      stats: {
        certificates: certificatesStats,
        vacations: vacationsStats,
        permissions: permissionsStats,
      },
      upcoming: {
        vacations: upcomingVacations || [],
        permissions: upcomingPermissions || [],
      },
    })
  } catch (error: any) {
    console.error('Error al obtener dashboard:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}



