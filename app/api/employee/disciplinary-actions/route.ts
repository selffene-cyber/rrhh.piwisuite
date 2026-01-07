import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus cartas de amonestación
 * Solo puede ver sus propias amonestaciones
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

    // Obtener amonestaciones emitidas
    const { data: actions, error: actionsError } = await supabase
      .from('disciplinary_actions')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .in('status', ['issued', 'active'])
      .order('incident_date', { ascending: false })

    if (actionsError) {
      console.error('Error al obtener amonestaciones:', actionsError)
      return NextResponse.json({ actions: [] })
    }

    return NextResponse.json({ actions: actions || [] })
  } catch (error: any) {
    console.error('Error al obtener amonestaciones:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

