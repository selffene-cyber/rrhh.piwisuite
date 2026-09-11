import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    
    const company_id = searchParams.get('company_id')
    const employee_id = searchParams.get('employee_id')
    const date = searchParams.get('date')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const status = searchParams.get('status')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!company_id) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
    }

    let query = supabase
      .from('attendance_records')
      .select(`
        id,
        employee_id,
        company_id,
        date,
        clock_in,
        clock_out,
        clock_in_source,
        clock_out_source,
        hours_worked,
        overtime_minutes,
        late_minutes,
        early_departure_minutes,
        status,
        absence_type,
        absence_reason,
        notes,
        correction_requested,
        created_at,
        updated_at,
        employees (
          id,
          full_name,
          rut,
          position
        )
      `)
      .eq('company_id', company_id)
      .order('date', { ascending: false })

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (date) query = query.eq('date', date)
    if (date_from) query = query.gte('date', date_from)
    if (date_to) query = query.lte('date', date_to)
    if (status) query = query.eq('status', status)
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const endDate = `${year}-${month.padStart(2, '0')}-31`
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ records: data })
  } catch (error: any) {
    console.error('Error fetching attendance records:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener registros' }, { status: 500 })
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

    const required = ['employee_id', 'company_id', 'date', 'status']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Campo requerido: ${field}` }, { status: 400 })
      }
    }

    const record = {
      employee_id: body.employee_id,
      company_id: body.company_id,
      date: body.date,
      clock_in: body.clock_in || null,
      clock_out: body.clock_out || null,
      clock_in_source: body.clock_in_source || 'app',
      clock_out_source: body.clock_out_source || null,
      clock_in_latitude: body.clock_in_latitude || null,
      clock_in_longitude: body.clock_in_longitude || null,
      clock_out_latitude: body.clock_out_latitude || null,
      clock_out_longitude: body.clock_out_longitude || null,
      hours_worked: body.hours_worked || null,
      overtime_minutes: body.overtime_minutes || 0,
      late_minutes: body.late_minutes || 0,
      early_departure_minutes: body.early_departure_minutes || 0,
      status: body.status,
      absence_type: body.absence_type || null,
      absence_reason: body.absence_reason || null,
      notes: body.notes || null,
      created_by: user.id,
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(record, { onConflict: 'employee_id,date' })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un registro para este empleado en esta fecha' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ record: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating attendance record:', error)
    return NextResponse.json({ error: error.message || 'Error al crear registro' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ record: data })
  } catch (error: any) {
    console.error('Error updating attendance record:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar registro' }, { status: 500 })
  }
}