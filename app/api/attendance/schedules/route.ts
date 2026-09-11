import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)

    const company_id = searchParams.get('company_id')
    const employee_id = searchParams.get('employee_id')

    if (!company_id) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
    }

    let query = supabase
      .from('work_schedules')
      .select(`
        *,
        employees (id, full_name, rut, position)
      `)
      .eq('company_id', company_id)
      .order('effective_from', { ascending: false })

    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ schedules: data })
  } catch (error: any) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener horarios' }, { status: 500 })
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

    const required = ['employee_id', 'company_id', 'schedule_type', 'weekly_hours', 'effective_from']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Campo requerido: ${field}` }, { status: 400 })
      }
    }

    const schedule = {
      employee_id: body.employee_id,
      company_id: body.company_id,
      name: body.name || 'Horario Personalizado',
      schedule_type: body.schedule_type,
      monday_start: body.monday_start || null,
      monday_end: body.monday_end || null,
      tuesday_start: body.tuesday_start || null,
      tuesday_end: body.tuesday_end || null,
      wednesday_start: body.wednesday_start || null,
      wednesday_end: body.wednesday_end || null,
      thursday_start: body.thursday_start || null,
      thursday_end: body.thursday_end || null,
      friday_start: body.friday_start || null,
      friday_end: body.friday_end || null,
      saturday_start: body.saturday_start || null,
      saturday_end: body.saturday_end || null,
      sunday_start: body.sunday_start || null,
      sunday_end: body.sunday_end || null,
      lunch_break_minutes: body.lunch_break_minutes || 60,
      tolerance_minutes: body.tolerance_minutes || 10,
      weekly_hours: body.weekly_hours,
      effective_from: body.effective_from,
      effective_to: body.effective_to || null,
      is_default: body.is_default || false,
    }

    if (schedule.is_default) {
      await supabase
        .from('work_schedules')
        .update({ is_default: false })
        .eq('employee_id', schedule.employee_id)
        .eq('is_default', true)
    }

    const { data, error } = await supabase
      .from('work_schedules')
      .insert(schedule)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ schedule: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating schedule:', error)
    return NextResponse.json({ error: error.message || 'Error al crear horario' }, { status: 500 })
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
      .from('work_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ schedule: data })
  } catch (error: any) {
    console.error('Error updating schedule:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar horario' }, { status: 500 })
  }
}