import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getDepartments,
  createDepartment,
} from '@/lib/services/departmentService'

// GET: Listar todos los departamentos de una empresa
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

    const filters: any = {}
    const status = searchParams.get('status')
    const parentId = searchParams.get('parent_id')

    if (status) {
      filters.status = status === 'all' ? 'all' : (status as 'active' | 'inactive')
    } else {
      filters.status = 'all' // Por defecto mostrar todos
    }

    if (parentId !== null) {
      if (parentId === 'null' || parentId === '') {
        filters.parent_id = null
      } else {
        filters.parent_id = parentId
      }
    }

    const departments = await getDepartments(companyId, supabase, filters)
    return NextResponse.json(departments)
  } catch (error: any) {
    console.error('Error al obtener departamentos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener departamentos' },
      { status: 500 }
    )
  }
}

// POST: Crear un nuevo departamento
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const { company_id, name, code, status, parent_department_id } = body

    if (!company_id || !name) {
      return NextResponse.json(
        { error: 'company_id y name son requeridos' },
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

    const department = await createDepartment(
      {
        company_id,
        name: name.trim(),
        code: code?.trim() || undefined,
        status: status || 'active',
        parent_department_id: parent_department_id || undefined,
      },
      supabase
    )

    return NextResponse.json(department, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear departamento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear departamento' },
      { status: 500 }
    )
  }
}

