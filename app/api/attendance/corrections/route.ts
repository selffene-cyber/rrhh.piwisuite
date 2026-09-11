import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)

    const company_id = searchParams.get('company_id')
    const status = searchParams.get('status') || 'pending'

    if (!company_id) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
    }

    let query = supabase
      .from('attendance_corrections')
      .select(`
        *,
        employees (id, full_name, rut, position)
      `)
      .eq('company_id', company_id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ corrections: data })
  } catch (error: any) {
    console.error('Error fetching corrections:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener correcciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const required = ['employee_id', 'company_id', 'record_date', 'reason']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Campo requerido: ${field}` }, { status: 400 })
      }
    }

    const correction = {
      employee_id: body.employee_id,
      company_id: body.company_id,
      record_date: body.record_date,
      current_clock_in: body.current_clock_in || null,
      current_clock_out: body.current_clock_out || null,
      requested_clock_in: body.requested_clock_in || null,
      requested_clock_out: body.requested_clock_out || null,
      reason: body.reason,
      status: 'pending',
    }

    const { data, error } = await supabase
      .from('attendance_corrections')
      .insert(correction)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ correction: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating correction:', error)
    return NextResponse.json({ error: error.message || 'Error al crear corrección' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id, action, review_notes } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'id y action son requeridos' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action debe ser approve o reject' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { data: correction, error: corrError } = await supabase
      .from('attendance_corrections')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (corrError) throw corrError

    if (action === 'approve') {
      const { data: record, error: recordError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('employee_id', correction.employee_id)
        .eq('date', correction.record_date)
        .single()

      if (record) {
        const updateData: Record<string, any> = {
          correction_requested: false,
        }
        if (correction.requested_clock_in) updateData.clock_in = correction.requested_clock_in
        if (correction.requested_clock_out) updateData.clock_out = correction.requested_clock_out

        if (correction.requested_clock_in && correction.requested_clock_out) {
          const [inH, inM] = correction.requested_clock_in.split(':').map(Number)
          const [outH, outM] = correction.requested_clock_out.split(':').map(Number)
          const diff = (outH * 60 + outM) - (inH * 60 + inM) - 60
          updateData.hours_worked = Math.max(0, Math.round(diff * 100 / 60) / 100)
        }

        await supabase
          .from('attendance_records')
          .update(updateData)
          .eq('id', record.id)
      }
    }

    return NextResponse.json({ correction })
  } catch (error: any) {
    console.error('Error reviewing correction:', error)
    return NextResponse.json({ error: error.message || 'Error al revisar corrección' }, { status: 500 })
  }
}