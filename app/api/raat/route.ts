import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getAccidents,
  createAccident,
  AccidentFilters,
} from '@/lib/services/raatService'

// GET: Listar accidentes con filtros
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    
    const companyId = searchParams.get('company_id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id es requerido' },
        { status: 400 }
      )
    }

    const filters: AccidentFilters = {}
    
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const eventType = searchParams.get('event_type')
    const status = searchParams.get('status')
    const diatStatus = searchParams.get('diat_status')
    const employeeId = searchParams.get('employee_id')
    const employeeRut = searchParams.get('employee_rut')
    const costCenterId = searchParams.get('cost_center_id')

    if (startDate) filters.start_date = startDate
    if (endDate) filters.end_date = endDate
    if (eventType) filters.event_type = eventType as any
    if (status) filters.status = status === 'all' ? 'all' : (status as any)
    if (diatStatus) filters.diat_status = diatStatus === 'all' ? 'all' : (diatStatus as any)
    if (employeeId) filters.employee_id = employeeId
    if (employeeRut) filters.employee_rut = employeeRut
    if (costCenterId) filters.cost_center_id = costCenterId

    const accidents = await getAccidents(companyId, supabase, filters)
    return NextResponse.json(accidents)
  } catch (error: any) {
    console.error('Error al obtener accidentes:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener accidentes' },
      { status: 500 }
    )
  }
}

// POST: Crear un nuevo accidente
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const {
      company_id,
      event_date,
      event_time,
      event_location,
      event_type,
      employee_id,
      administrator,
      work_performed,
      description,
      hazards_identified,
      body_part_affected,
      injury_type,
      witnesses,
      possible_sequelae,
      immediate_actions,
      medical_transfer,
      medical_transfer_location,
      notification_date,
      registered_by,
    } = body

    if (!company_id || !event_date || !event_time || !event_location || !event_type || !employee_id || !description) {
      return NextResponse.json(
        { error: 'Campos requeridos: company_id, event_date, event_time, event_location, event_type, employee_id, description' },
        { status: 400 }
      )
    }

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

    // Obtener perfil del usuario para registered_by
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    const accident = await createAccident(
      {
        company_id,
        event_date,
        event_time,
        event_location: event_location.trim(),
        event_type,
        employee_id,
        administrator: administrator?.trim() || undefined,
        work_performed: work_performed?.trim() || undefined,
        description: description.trim(),
        hazards_identified: hazards_identified?.trim() || undefined,
        body_part_affected: body_part_affected?.trim() || undefined,
        injury_type: injury_type?.trim() || undefined,
        witnesses: witnesses?.trim() || undefined,
        possible_sequelae: possible_sequelae?.trim() || undefined,
        immediate_actions: immediate_actions?.trim() || undefined,
        medical_transfer: medical_transfer || false,
        medical_transfer_location: medical_transfer_location?.trim() || undefined,
        notification_date: notification_date || undefined,
        registered_by: profile?.id || undefined,
        status: 'open',
        diat_status: 'pending',
      },
      supabase
    )

    return NextResponse.json(accident, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear accidente:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear accidente' },
      { status: 500 }
    )
  }
}








