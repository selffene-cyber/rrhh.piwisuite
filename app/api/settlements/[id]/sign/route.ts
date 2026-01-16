/**
 * API Route para marcar finiquito como firmado
 * POST: Cambia estado a 'signed'
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

    const settlement = await updateSettlementStatus(
      params.id,
      'signed',
      user.id,
      supabase
    )

    return NextResponse.json({ settlement })
  } catch (error: any) {
    console.error('Error al marcar finiquito como firmado:', error)
    return NextResponse.json(
      { error: error.message || 'Error al marcar finiquito como firmado' },
      { status: 500 }
    )
  }
}

