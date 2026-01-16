import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { markDIATAsSent } from '@/lib/services/raatService'

// POST: Marcar DIAT como enviada
export async function POST(
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

    const { diat_number } = body

    if (!diat_number) {
      return NextResponse.json(
        { error: 'diat_number es requerido' },
        { status: 400 }
      )
    }

    const accident = await markDIATAsSent(params.id, diat_number, supabase)
    return NextResponse.json(accident)
  } catch (error: any) {
    console.error('Error al marcar DIAT como enviada:', error)
    return NextResponse.json(
      { error: error.message || 'Error al marcar DIAT como enviada' },
      { status: 500 }
    )
  }
}








