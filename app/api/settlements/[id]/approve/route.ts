/**
 * API Route para aprobar un finiquito
 * POST: Cambia estado a 'approved'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { updateSettlementStatus } from '@/lib/services/settlementService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rawBody = await request.text()
    let notes: string | undefined
    if (rawBody !== '') {
      let body: unknown
      try {
        body = JSON.parse(rawBody)
      } catch {
        return NextResponse.json(
          { error: 'El cuerpo de la solicitud no contiene JSON válido' },
          { status: 400 }
        )
      }

      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json(
          { error: 'El cuerpo de la solicitud debe ser un objeto JSON' },
          { status: 400 }
        )
      }

      if ('notes' in body) {
        if (typeof body.notes !== 'string') {
          return NextResponse.json({ error: 'Las notas deben ser texto' }, { status: 400 })
        }
        notes = body.notes
      }
    }

    const settlement = await updateSettlementStatus(
      params.id,
      'approved',
      user.id,
      supabase,
      { notes }
    )

    return NextResponse.json({ settlement })
  } catch (error) {
    console.error('Error al aprobar finiquito:', error)
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : ''
    return NextResponse.json(
      { error: message || 'Error al aprobar finiquito' },
      { status: 500 }
    )
  }
}

