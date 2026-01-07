import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para obtener los tipos de permisos disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que es trabajador y obtener su company_id
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ 
        error: 'No se encontró información del trabajador' 
      }, { status: 403 })
    }

    // Obtener tipos de permisos (todos son públicos según RLS)
    const { data: permissionTypes, error: typeError } = await supabase
      .from('permission_types')
      .select('code, label, description, affects_payroll')
      .order('code', { ascending: true })

    if (typeError) {
      console.error('Error al obtener tipos de permisos:', typeError)
      return NextResponse.json({ 
        error: typeError.message || 'Error al obtener tipos de permisos' 
      }, { status: 500 })
    }

    return NextResponse.json({ permissionTypes: permissionTypes || [] })
  } catch (error: any) {
    console.error('Error al obtener tipos de permisos:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}



