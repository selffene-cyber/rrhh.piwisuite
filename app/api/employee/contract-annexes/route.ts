import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus anexos de contratos
 * Solo puede ver sus propios anexos
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

    // Primero intentar obtener TODOS los anexos (sin filtro de status) para diagnóstico
    console.log('Buscando anexos para employee_id:', employee.id, 'company_id:', employee.company_id)
    
    const { data: allAnnexesRaw, error: annexesRawError } = await supabase
      .from('contract_annexes')
      .select('id, status, employee_id, company_id')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
    
    console.log('Todos los anexos (sin filtro status):', allAnnexesRaw?.length || 0)
    if (allAnnexesRaw && allAnnexesRaw.length > 0) {
      console.log('Detalles de anexos encontrados:', allAnnexesRaw.map((a: any) => ({ id: a.id, status: a.status })))
    }
    
    // Obtener anexos firmados
    const { data: annexes, error: annexesError } = await supabase
      .from('contract_annexes')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .in('status', ['signed', 'active'])
      .order('start_date', { ascending: false })

    // Guardar el mensaje de error antes del return si existe
    const annexesErrorMessage = annexesError ? String(annexesError.message || annexesError) : undefined

    if (annexesError) {
      console.error('Error al obtener anexos:', annexesError)
      console.error('Detalles del error:', JSON.stringify(annexesError, null, 2))
      return NextResponse.json({ 
        annexes: [], 
        error: annexesErrorMessage || 'Error al obtener anexos',
        debug: process.env.NODE_ENV === 'development' ? {
          employee_id: employee.id,
          company_id: employee.company_id,
          allAnnexesFound: allAnnexesRaw?.length || 0,
          filteredAnnexesFound: 0,
          rawError: annexesRawError ? String(annexesRawError.message || annexesRawError) : undefined,
          queryError: annexesErrorMessage
        } : undefined
      })
    }

    console.log('Anexos encontrados con status signed/active:', annexes?.length || 0)
    
    return NextResponse.json({ 
      annexes: annexes || [],
      debug: process.env.NODE_ENV === 'development' ? {
        employee_id: employee.id,
        company_id: employee.company_id,
        allAnnexesFound: allAnnexesRaw?.length || 0,
        filteredAnnexesFound: annexes?.length || 0,
        rawError: annexesRawError ? String(annexesRawError.message || annexesRawError) : undefined,
        queryError: annexesErrorMessage
      } : undefined
    })
  } catch (error: any) {
    console.error('Error al obtener anexos:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

