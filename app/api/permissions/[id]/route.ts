import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getPermission,
  updatePermission,
  deletePermission,
} from '@/lib/services/permissionService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const permission = await getPermission(params.id, supabase)

    if (!permission) {
      return NextResponse.json(
        { error: 'Permiso no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(permission)
  } catch (error: any) {
    console.error('Error al obtener permiso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener permiso' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const permission = await updatePermission(params.id, body, supabase)
    return NextResponse.json(permission)
  } catch (error: any) {
    console.error('Error al actualizar permiso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar permiso' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    await deletePermission(params.id, supabase)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error al eliminar permiso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar permiso' },
      { status: 500 }
    )
  }
}

