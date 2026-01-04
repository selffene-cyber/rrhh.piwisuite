/**
 * API Route para obtener causales de término
 * GET: Lista todas las causales disponibles
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getSettlementCauses } from '@/lib/services/settlementService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const causes = await getSettlementCauses(supabase)

    return NextResponse.json({ causes })
  } catch (error: any) {
    console.error('Error al obtener causales:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener causales' },
      { status: 500 }
    )
  }
}

