import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus contratos firmados
 * Solo puede ver sus propios contratos
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

    // Obtener contratos firmados
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .in('status', ['signed', 'active'])
      .order('start_date', { ascending: false })

    if (contractsError) {
      console.error('Error al obtener contratos:', contractsError)
      return NextResponse.json({ contracts: [] })
    }

    return NextResponse.json({ contracts: contracts || [] })
  } catch (error: any) {
    console.error('Error al obtener contratos:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

