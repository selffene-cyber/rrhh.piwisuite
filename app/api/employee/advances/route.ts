import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus anticipos
 * Solo puede ver sus propios anticipos
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

    // Obtener anticipos del trabajador (excluyendo borradores)
    const { data: advances, error: advancesError } = await supabase
      .from('advances')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .neq('status', 'draft') // Excluir borradores
      .order('advance_date', { ascending: false })

    if (advancesError) {
      console.error('Error al obtener anticipos:', advancesError)
      return NextResponse.json({ advances: [] })
    }

    return NextResponse.json({ advances: advances || [] })
  } catch (error: any) {
    console.error('Error al obtener anticipos:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}






