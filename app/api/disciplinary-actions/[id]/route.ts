import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getDisciplinaryAction,
  updateDisciplinaryAction,
  deleteDisciplinaryAction,
} from '@/lib/services/disciplinaryActionService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const action = await getDisciplinaryAction(params.id, supabase)

    if (!action) {
      return NextResponse.json(
        { error: 'Amonestación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(action)
  } catch (error: any) {
    console.error('Error al obtener amonestación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener amonestación' },
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

    const action = await updateDisciplinaryAction(params.id, body, supabase)
    return NextResponse.json(action)
  } catch (error: any) {
    console.error('Error al actualizar amonestación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar amonestación' },
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
    await deleteDisciplinaryAction(params.id, supabase)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error al eliminar amonestación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar amonestación' },
      { status: 500 }
    )
  }
}

