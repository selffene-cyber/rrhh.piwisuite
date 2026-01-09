import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus préstamos
 * Solo puede ver sus propios préstamos
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

    // Obtener préstamos del trabajador (excluyendo cancelados)
    console.log('Buscando préstamos para employee_id:', employee.id, 'company_id:', employee.company_id)
    
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .in('status', ['active', 'paid']) // Solo préstamos activos o pagados
      .order('loan_date', { ascending: false })

    if (loansError) {
      console.error('Error al obtener préstamos:', loansError)
      return NextResponse.json({ loans: [], error: loansError.message })
    }

    console.log('Préstamos encontrados:', loans?.length || 0)
    
    return NextResponse.json({ 
      loans: loans || [],
      debug: process.env.NODE_ENV === 'development' ? {
        employee_id: employee.id,
        company_id: employee.company_id,
        loansFound: loans?.length || 0
      } : undefined
    })
  } catch (error: any) {
    console.error('Error al obtener préstamos:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}






