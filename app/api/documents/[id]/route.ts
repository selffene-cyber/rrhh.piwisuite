import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getDocument,
  updateDocument,
  archiveDocument,
  restoreDocument,
} from '@/lib/services/documentBankService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const document = await getDocument(params.id, supabase)

    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Error al obtener documento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener documento' },
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

    const document = await updateDocument(params.id, body, supabase)
    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Error al actualizar documento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar documento' },
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
    // No se elimina, se archiva
    const document = await archiveDocument(params.id, supabase)
    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Error al archivar documento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al archivar documento' },
      { status: 500 }
    )
  }
}

