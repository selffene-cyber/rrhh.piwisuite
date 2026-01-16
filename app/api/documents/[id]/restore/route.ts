import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { restoreDocument } from '@/lib/services/documentBankService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const document = await restoreDocument(params.id, supabase)
    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Error al restaurar documento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al restaurar documento' },
      { status: 500 }
    )
  }
}

