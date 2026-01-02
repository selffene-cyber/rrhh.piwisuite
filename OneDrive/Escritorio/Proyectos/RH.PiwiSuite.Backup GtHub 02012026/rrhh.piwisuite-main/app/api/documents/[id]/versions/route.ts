import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getDocumentVersions,
  createDocumentVersion,
  setCurrentVersion,
} from '@/lib/services/documentBankService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const versions = await getDocumentVersions(params.id, supabase)
    return NextResponse.json(versions)
  } catch (error: any) {
    console.error('Error al obtener versiones:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener versiones' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const version = await createDocumentVersion(
      {
        ...body,
        document_id: params.id,
        uploaded_by: user.id,
      },
      supabase
    )

    return NextResponse.json(version, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear versión:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear versión' },
      { status: 500 }
    )
  }
}

