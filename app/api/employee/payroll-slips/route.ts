import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API para que un trabajador vea sus liquidaciones de sueldo
 * Solo puede ver sus propias liquidaciones
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que es trabajador y obtener su employee_id
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ 
        error: 'No se encontró información del trabajador' 
      }, { status: 403 })
    }

    // Obtener parámetros de filtro
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Obtener solo liquidaciones emitidas (no borradores)
    const { data: allSlips, error: slipsError } = await supabase
      .from('payroll_slips')
      .select(`
        *,
        payroll_periods (year, month)
      `)
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .in('status', ['issued', 'sent']) // Solo liquidaciones emitidas oficialmente
      .order('created_at', { ascending: false })

    if (slipsError) {
      console.error('Error al obtener liquidaciones:', slipsError)
      return NextResponse.json({ slips: [] })
    }

    // Filtrar por año y mes en el cliente
    let slips = allSlips || []
    if (year) {
      slips = slips.filter((slip: any) => 
        slip.payroll_periods && slip.payroll_periods.year === parseInt(year)
      )
    }
    if (month) {
      slips = slips.filter((slip: any) => 
        slip.payroll_periods && slip.payroll_periods.month === parseInt(month)
      )
    }

    return NextResponse.json({ slips })
  } catch (error: any) {
    console.error('Error al obtener liquidaciones:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

