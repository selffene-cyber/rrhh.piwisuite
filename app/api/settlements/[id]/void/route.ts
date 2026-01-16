/**
 * API Route para anular un finiquito
 * POST: Cambia estado a 'void'
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

    const body = await request.json()
    const { void_reason, notes } = body

    if (!void_reason) {
      return NextResponse.json(
        { error: 'Se debe especificar el motivo de anulación' },
        { status: 400 }
      )
    }

    const settlement = await updateSettlementStatus(
      params.id,
      'void',
      user.id,
      supabase,
      { void_reason, notes }
    )

    return NextResponse.json({ settlement })
  } catch (error: any) {
    console.error('Error al anular finiquito:', error)
    return NextResponse.json(
      { error: error.message || 'Error al anular finiquito' },
      { status: 500 }
    )
  }
}

