import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { issueDisciplinaryAction } from '@/lib/services/disciplinaryActionService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const action = await issueDisciplinaryAction(params.id, supabase)
    return NextResponse.json(action)
  } catch (error: any) {
    console.error('Error al emitir amonestación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al emitir amonestación' },
      { status: 500 }
    )
  }
}

