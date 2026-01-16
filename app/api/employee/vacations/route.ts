import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus vacaciones
 * Solo puede ver sus propias vacaciones
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
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ 
        error: 'No se encontró información del trabajador' 
      }, { status: 403 })
    }

    // Obtener vacaciones del trabajador
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', employee.id)
      .order('start_date', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: vacations, error: vacError } = await query

    if (vacError) {
      console.error('Error al obtener vacaciones:', vacError)
      return NextResponse.json({ 
        error: vacError.message || 'Error al obtener vacaciones' 
      }, { status: 500 })
    }

    return NextResponse.json({ vacations: vacations || [] })
  } catch (error: any) {
    console.error('Error al obtener vacaciones:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}



