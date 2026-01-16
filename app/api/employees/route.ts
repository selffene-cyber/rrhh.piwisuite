import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    
    const companyId = searchParams.get('company_id')
    const status = searchParams.get('status')
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id es requerido' },
        { status: 400 }
      )
    }

    // Construir query
    let query = supabase
      .from('employees')
      .select('id, full_name, rut, email, hire_date, status, position, department_id, company_id')
      .eq('company_id', companyId)
      .order('full_name', { ascending: true })

    // Filtrar por estado si se proporciona
    if (status) {
      query = query.eq('status', status)
    }

    const { data: employees, error } = await query

    if (error) {
      console.error('Error al obtener empleados:', error)
      return NextResponse.json(
        { error: 'Error al obtener empleados' },
        { status: 500 }
      )
    }

    return NextResponse.json(employees || [])
  } catch (error: any) {
    console.error('Error en GET /api/employees:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener empleados' },
      { status: 500 }
    )
  }
}
