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

    const body = await request.json()
    const { notes } = body

    const settlement = await updateSettlementStatus(
      params.id,
      'approved',
      user.id,
      supabase,
      { notes }
    )

    return NextResponse.json({ settlement })
  } catch (error: any) {
    console.error('Error al aprobar finiquito:', error)
    return NextResponse.json(
      { error: error.message || 'Error al aprobar finiquito' },
      { status: 500 }
    )
  }
}

