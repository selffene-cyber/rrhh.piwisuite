import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus permisos
 * Solo puede ver sus propios permisos
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

    // Obtener permisos del trabajador
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('permissions')
      .select(`
        *,
        permission_types (code, label, affects_payroll)
      `)
      .eq('employee_id', employee.id)
      .eq('company_id', employee.company_id)
      .order('start_date', { ascending: false })

    // No aplicar filtro de status si no se especifica o es 'all'
    // Los permisos pueden tener estados: 'draft', 'requested', 'approved', 'rejected', 'applied', 'void'
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: permissions, error: permError } = await query

    // Si hay error, loguear pero no fallar completamente
    if (permError) {
      console.error('Error al obtener permisos:', permError)
      // Retornar array vacío en lugar de error para no romper la UI
      return NextResponse.json({ permissions: [] })
    }

    return NextResponse.json({ permissions: permissions || [] })
  } catch (error: any) {
    console.error('Error al obtener permisos:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

