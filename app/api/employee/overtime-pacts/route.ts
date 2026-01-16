import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus pactos de horas extra
 * Solo puede ver sus propios pactos
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

    // Primero intentar obtener TODOS los pactos (sin filtro de status) para diagnóstico
    console.log('Buscando pactos para employee_id:', employee.id, 'company_id:', employee.company_id)
    
    const { data: allPactsRaw, error: pactsRawError } = await supabase
      .from('overtime_pacts')
      .select('id, status, employee_id, company_id')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
    
    console.log('Todos los pactos (sin filtro status):', allPactsRaw?.length || 0)
    if (allPactsRaw && allPactsRaw.length > 0) {
      console.log('Detalles de pactos encontrados:', allPactsRaw.map((p: any) => ({ id: p.id, status: p.status })))
    }
    
    // Obtener pactos de horas extra (incluyendo borradores para que el trabajador los vea)
    // Usar una query más simple sin filtro de status primero para debug
    let pactsQuery = supabase
      .from('overtime_pacts')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
    
    // Intentar primero obtener todos y luego filtrar en el cliente para debug
    const { data: allPactsNoFilter, error: noFilterError } = await pactsQuery
      .order('start_date', { ascending: false })
    
    console.log('Pactos sin filtro de status:', allPactsNoFilter?.length || 0)
    if (allPactsNoFilter && allPactsNoFilter.length > 0) {
      console.log('Status de pactos encontrados:', allPactsNoFilter.map((p: any) => p.status))
    }
    
    // Ahora aplicar el filtro de status
    const { data: pacts, error: pactsError } = await supabase
      .from('overtime_pacts')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .in('status', ['draft', 'active', 'renewed'])
      .order('start_date', { ascending: false })

    // Si hay error o no encuentra con filtro, pero sí encontró sin filtro, usar los sin filtro
    let finalPacts = pacts || []
    
    if (pactsError || (finalPacts.length === 0 && allPactsNoFilter && allPactsNoFilter.length > 0)) {
      console.warn('No se encontraron pactos con filtro, usando todos los encontrados sin filtrar')
      // Filtrar manualmente por status
      finalPacts = (allPactsNoFilter || []).filter((p: any) => 
        ['draft', 'active', 'renewed'].includes(p.status)
      )
      console.log('Pactos filtrados manualmente:', finalPacts.length)
    }

    if (pactsError && !allPactsNoFilter) {
      console.error('Error al obtener pactos:', pactsError)
      console.error('Detalles del error:', JSON.stringify(pactsError, null, 2))
      return NextResponse.json({ pacts: [], error: pactsError.message, details: pactsError })
    }

    console.log('Pactos encontrados con status draft/active/renewed:', finalPacts?.length || 0)
    if (finalPacts && finalPacts.length > 0) {
      console.log('Pactos detalles:', finalPacts.map((p: any) => ({ id: p.id, status: p.status, start_date: p.start_date })))
    }
    
    // Incluir información de diagnóstico en desarrollo
    return NextResponse.json({ 
      pacts: finalPacts || [],
      debug: process.env.NODE_ENV === 'development' ? {
        employee_id: employee.id,
        company_id: employee.company_id,
        allPactsFound: allPactsRaw?.length || 0,
        allPactsNoFilterFound: allPactsNoFilter?.length || 0,
        filteredPactsFound: finalPacts?.length || 0,
        rawError: pactsRawError?.message,
        queryError: pactsError?.message,
        usedManualFilter: finalPacts.length > 0 && pacts?.length === 0
      } : undefined
    })
  } catch (error: any) {
    console.error('Error al obtener pactos:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

