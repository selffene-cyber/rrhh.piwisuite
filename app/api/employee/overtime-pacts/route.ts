import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

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

    // Obtener pactos de horas extra
    const { data: pacts, error: pactsError } = await supabase
      .from('overtime_pacts')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .in('status', ['active', 'renewed'])
      .order('start_date', { ascending: false })

    if (pactsError) {
      console.error('Error al obtener pactos:', pactsError)
      return NextResponse.json({ pacts: [] })
    }

    return NextResponse.json({ pacts: pacts || [] })
  } catch (error: any) {
    console.error('Error al obtener pactos:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

