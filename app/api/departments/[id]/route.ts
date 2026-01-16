import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/lib/services/departmentService'

// GET: Obtener un departamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const department = await getDepartment(params.id, supabase)

    if (!department) {
      return NextResponse.json(
        { error: 'Departamento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(department)
  } catch (error: any) {
    console.error('Error al obtener departamento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener departamento' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar un departamento
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

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

    const updates: any = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.code !== undefined) updates.code = body.code?.trim() || null
    if (body.status !== undefined) updates.status = body.status
    if (body.parent_department_id !== undefined) {
      updates.parent_department_id = body.parent_department_id || null
    }

    const department = await updateDepartment(params.id, updates, supabase)
    return NextResponse.json(department)
  } catch (error: any) {
    console.error('Error al actualizar departamento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar departamento' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar (desactivar) un departamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)

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

    await deleteDepartment(params.id, supabase)
    return NextResponse.json({ message: 'Departamento desactivado correctamente' })
  } catch (error: any) {
    console.error('Error al eliminar departamento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar departamento' },
      { status: 500 }
    )
  }
}

