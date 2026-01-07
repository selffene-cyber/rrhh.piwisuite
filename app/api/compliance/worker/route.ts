import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const employeeId = searchParams.get('employee_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('worker_compliance')
      .select(`
        *,
        employees(id, full_name, rut, position, cost_center_id),
        compliance_items(id, nombre, tipo, criticidad, vigencia_dias)
      `)
      .order('fecha_vencimiento', { ascending: true })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error obteniendo worker_compliance:', error)
      return NextResponse.json({ error: 'Error al obtener cumplimientos' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error en GET /api/compliance/worker:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { company_id, employee_id, compliance_item_id, fecha_emision, fecha_vencimiento, evidencia_url, evidencia_nombre, notas, source } = body

    if (!company_id || !employee_id || !compliance_item_id || !fecha_emision || !fecha_vencimiento) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verificar permisos
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .single()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'
    const isAdmin = companyUser?.role === 'admin' || companyUser?.role === 'owner'

    // Verificar si el usuario es el mismo trabajador
    const { data: employee } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', employee_id)
      .single()

    const isOwnEmployee = employee?.user_id === user.id

    if (!isSuperAdmin && !isAdmin && !isOwnEmployee) {
      return NextResponse.json({ error: 'No tienes permisos para crear cumplimientos' }, { status: 403 })
    }

    // Calcular status inicial
    const vencimientoDate = new Date(fecha_vencimiento)
    const hoy = new Date()
    const diasRestantes = Math.ceil((vencimientoDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    
    let status = 'VIGENTE'
    if (diasRestantes < 0) {
      status = 'VENCIDO'
    } else if (diasRestantes <= 30) {
      status = 'POR_VENCER'
    }

    const { data, error } = await supabase
      .from('worker_compliance')
      .insert({
        company_id,
        employee_id,
        compliance_item_id,
        fecha_emision,
        fecha_vencimiento,
        status,
        evidencia_url: evidencia_url || null,
        evidencia_nombre: evidencia_nombre || null,
        notas: notas || null,
        source: source || 'manual',
        created_by: user.id,
      })
      .select(`
        *,
        employees(id, full_name, rut),
        compliance_items(id, nombre, tipo, criticidad)
      `)
      .single()

    if (error) {
      console.error('Error creando worker_compliance:', error)
      return NextResponse.json({ error: 'Error al crear cumplimiento' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error en POST /api/compliance/worker:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

