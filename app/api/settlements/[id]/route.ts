/**
 * API Routes para un finiquito específico
 * GET: Obtiene finiquito por ID
 * PUT: Actualiza finiquito
 * DELETE: Elimina finiquito (solo drafts o void)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getSettlement, recalculateSettlement, updateSettlementStatus } from '@/lib/services/settlementService'

export async function GET(
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

    const settlement = await getSettlement(params.id, supabase)

    if (!settlement) {
      return NextResponse.json({ error: 'Finiquito no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ settlement })
  } catch (error: any) {
    console.error('Error al obtener finiquito:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener finiquito' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { recalculate, recalculate_reason, status, void_reason, notes } = body

    // Si se solicita recálculo
    if (recalculate) {
      const newData: any = {}
      if (body.termination_date) newData.termination_date = body.termination_date
      if (body.cause_code) newData.cause_code = body.cause_code
      if (body.notice_given !== undefined) newData.notice_given = body.notice_given
      if (body.notice_days !== undefined) newData.notice_days = body.notice_days

      const settlement = await recalculateSettlement(
        params.id,
        newData,
        user.id,
        recalculate_reason || 'Recálculo manual',
        supabase
      )

      return NextResponse.json({ settlement })
    }

    // Si se cambia estado
    if (status) {
      const settlement = await updateSettlementStatus(
        params.id,
        status,
        user.id,
        supabase,
        { void_reason, notes }
      )

      return NextResponse.json({ settlement })
    }

    return NextResponse.json({ error: 'No se especificó acción (recalculate o status)' }, { status: 400 })
  } catch (error: any) {
    console.error('Error al actualizar finiquito:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar finiquito' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Verificar que el finiquito existe y está en estado eliminable
    const settlement = await getSettlement(params.id, supabase)
    if (!settlement) {
      return NextResponse.json({ error: 'Finiquito no encontrado' }, { status: 404 })
    }

    if (!['draft', 'void'].includes((settlement as any).status)) {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar finiquitos en estado draft o void' },
        { status: 400 }
      )
    }

    // Eliminar items primero (cascada debería hacerlo, pero por si acaso)
    await supabase
      .from('settlement_items')
      .delete()
      .eq('settlement_id', params.id)

    // Eliminar settlement
    const { error } = await supabase
      .from('settlements')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error al eliminar finiquito:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar finiquito' },
      { status: 500 }
    )
  }
}

