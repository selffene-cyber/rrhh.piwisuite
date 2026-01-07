import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getDepartmentTree } from '@/lib/services/departmentService'

export const dynamic = 'force-dynamic'

// GET: Obtener árbol jerárquico completo de departamentos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    
    const companyId = searchParams.get('company_id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id es requerido' },
        { status: 400 }
      )
    }

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const status = searchParams.get('status') as 'active' | 'inactive' | 'all' | null
    const includeEmployeeCount = searchParams.get('include_employee_count') === 'true'

    const tree = await getDepartmentTree(companyId, supabase, {
      status: status || 'all',
      includeEmployeeCount,
    })

    return NextResponse.json({ tree }, { status: 200 })
  } catch (error: any) {
    console.error('Error al obtener árbol de departamentos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener árbol de departamentos' },
      { status: 500 }
    )
  }
}

