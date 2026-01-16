import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

    // Primero intentar obtener TODAS las liquidaciones (sin filtro de status) para diagnóstico
    console.log('Buscando liquidaciones para employee_id:', employee.id, 'company_id:', employee.company_id)
    
    const { data: allSlipsRaw, error: slipsRawError } = await supabase
      .from('payroll_slips')
      .select('id, status, employee_id')
      .eq('employee_id', employee.id)
    
    console.log('Todas las liquidaciones (sin filtro status):', allSlipsRaw?.length || 0, allSlipsRaw?.map((s: any) => ({ id: s.id, status: s.status })))
    
    // Obtener liquidaciones emitidas y enviadas
    // Nota: payroll_slips NO tiene company_id directamente, solo employee_id
    // IMPORTANTE: Solo mostrar liquidaciones que realmente existen (no eliminadas)
    const { data: allSlips, error: slipsError } = await supabase
      .from('payroll_slips')
      .select(`
        *,
        payroll_periods (year, month)
      `)
      .eq('employee_id', employee.id)
      .in('status', ['issued', 'sent']) // Solo liquidaciones emitidas oficialmente
      .order('created_at', { ascending: false })
      .not('id', 'is', null) // Asegurar que el ID existe (por si hay algún problema)

    // Guardar el mensaje de error antes del return si existe
    const slipsErrorMessage = slipsError ? String(slipsError.message || slipsError) : undefined

    console.log('Liquidaciones con status issued/sent:', allSlips?.length || 0, 'Error:', slipsErrorMessage)

    if (slipsError) {
      console.error('Error al obtener liquidaciones:', slipsError)
      return NextResponse.json({ 
        slips: [],
        debug: process.env.NODE_ENV === 'development' ? {
          employee_id: employee.id,
          company_id: employee.company_id,
          allSlipsFound: allSlipsRaw?.length || 0,
          filteredSlipsFound: 0,
          rawError: slipsRawError ? String(slipsRawError.message || slipsRawError) : undefined,
          queryError: slipsErrorMessage,
          allSlipsStatuses: allSlipsRaw?.map((s: any) => s.status) || []
        } : undefined
      })
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

    // Incluir información de diagnóstico en desarrollo
    return NextResponse.json({ 
      slips,
      debug: process.env.NODE_ENV === 'development' ? {
        employee_id: employee.id,
        company_id: employee.company_id,
        allSlipsFound: allSlipsRaw?.length || 0,
        filteredSlipsFound: allSlips?.length || 0,
        rawError: slipsRawError ? String(slipsRawError.message || slipsRawError) : undefined,
        queryError: slipsErrorMessage,
        allSlipsStatuses: allSlipsRaw?.map((s: any) => s.status) || []
      } : undefined
    })
  } catch (error: any) {
    console.error('Error al obtener liquidaciones:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

