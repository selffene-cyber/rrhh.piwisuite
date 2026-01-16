import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getAccident,
  updateAccident,
} from '@/lib/services/raatService'

// GET: Obtener un accidente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const accident = await getAccident(params.id, supabase)

    if (!accident) {
      return NextResponse.json(
        { error: 'Accidente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(accident)
  } catch (error: any) {
    console.error('Error al obtener accidente:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener accidente' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar un accidente
export async function PATCH(
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

    const updates: any = {}
    if (body.event_date !== undefined) updates.event_date = body.event_date
    if (body.event_time !== undefined) updates.event_time = body.event_time
    if (body.event_location !== undefined) updates.event_location = body.event_location.trim()
    if (body.event_type !== undefined) updates.event_type = body.event_type
    if (body.administrator !== undefined) updates.administrator = body.administrator?.trim() || null
    if (body.work_performed !== undefined) updates.work_performed = body.work_performed?.trim() || null
    if (body.description !== undefined) updates.description = body.description.trim()
    if (body.hazards_identified !== undefined) updates.hazards_identified = body.hazards_identified?.trim() || null
    if (body.body_part_affected !== undefined) updates.body_part_affected = body.body_part_affected?.trim() || null
    if (body.injury_type !== undefined) updates.injury_type = body.injury_type?.trim() || null
    if (body.witnesses !== undefined) updates.witnesses = body.witnesses?.trim() || null
    if (body.possible_sequelae !== undefined) updates.possible_sequelae = body.possible_sequelae?.trim() || null
    if (body.immediate_actions !== undefined) updates.immediate_actions = body.immediate_actions?.trim() || null
    if (body.medical_transfer !== undefined) updates.medical_transfer = body.medical_transfer
    if (body.medical_transfer_location !== undefined) updates.medical_transfer_location = body.medical_transfer_location?.trim() || null
    if (body.notification_date !== undefined) updates.notification_date = body.notification_date || null
    if (body.status !== undefined) updates.status = body.status
    if (body.diat_status !== undefined) updates.diat_status = body.diat_status
    if (body.diat_number !== undefined) updates.diat_number = body.diat_number?.trim() || null

    const accident = await updateAccident(params.id, updates, supabase)
    return NextResponse.json(accident)
  } catch (error: any) {
    console.error('Error al actualizar accidente:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar accidente' },
      { status: 500 }
    )
  }
}








