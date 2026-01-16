import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getDocuments,
  createDocument,
} from '@/lib/services/documentBankService'

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
    const categoryId = searchParams.get('category_id')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')

    if (categoryId) filters.category_id = categoryId
    if (status) filters.status = status
    if (search) filters.search = search
    if (tags) filters.tags = tags.split(',')

    const documents = await getDocuments(companyId, supabase, filters)
    return NextResponse.json(documents)
  } catch (error: any) {
    console.error('Error al obtener documentos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener documentos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const document = await createDocument(
      {
        ...body,
        created_by: user.id,
      },
      supabase
    )

    return NextResponse.json(document, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear documento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear documento' },
      { status: 500 }
    )
  }
}

