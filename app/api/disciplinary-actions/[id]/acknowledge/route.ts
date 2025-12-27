import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { acknowledgeDisciplinaryAction } from '@/lib/services/disciplinaryActionService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()
    const { ack_method } = body

    if (!ack_method) {
      return NextResponse.json(
        { error: 'ack_method es requerido' },
        { status: 400 }
      )
    }

    const action = await acknowledgeDisciplinaryAction(
      params.id,
      ack_method,
      supabase
    )

    return NextResponse.json(action)
  } catch (error: any) {
    console.error('Error al registrar acuse:', error)
    return NextResponse.json(
      { error: error.message || 'Error al registrar acuse' },
      { status: 500 }
    )
  }
}

