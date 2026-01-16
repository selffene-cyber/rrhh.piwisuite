import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getDocumentCategories,
  createDocumentCategory,
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

    const categories = await getDocumentCategories(companyId, supabase)
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error al obtener categorías:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener categorías' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const category = await createDocumentCategory(body, supabase)
    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear categoría:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear categoría' },
      { status: 500 }
    )
  }
}

