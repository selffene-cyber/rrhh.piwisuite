/**
 * API Route para recalcular un finiquito
 * POST: Recalcula el finiquito con nuevos datos (incrementa versión)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { recalculateSettlement } from '@/lib/services/settlementService'

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
    const { termination_date, cause_code, notice_given, notice_days, reason } = body

    const newData: any = {}
    if (termination_date) newData.termination_date = termination_date
    if (cause_code) newData.cause_code = cause_code
    if (notice_given !== undefined) newData.notice_given = notice_given
    if (notice_days !== undefined) newData.notice_days = notice_days

    const settlement = await recalculateSettlement(
      params.id,
      newData,
      user.id,
      reason || 'Recálculo manual',
      supabase
    )

    return NextResponse.json({ settlement })
  } catch (error: any) {
    console.error('Error al recalcular finiquito:', error)
    return NextResponse.json(
      { error: error.message || 'Error al recalcular finiquito' },
      { status: 500 }
    )
  }
}

