import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

// Forzar renderizado dinámico ya que usa cookies para autenticación
export const dynamic = 'force-dynamic'

/**
 * API para obtener eventos de auditoría del trabajador actual (portal trabajador)
 * GET /api/employee/audit-events
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el empleado asociado al usuario
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (empError || !employee) {
      console.error('[Audit Events API] Error al obtener empleado:', empError)
      console.error('[Audit Events API] User ID:', user.id)
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    console.log(`[Audit Events API] Buscando eventos para employee_id: ${employee.id}, user_id: ${user.id}`)

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const module = searchParams.get('module')
    const actionType = searchParams.get('action_type')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construir query - Igual que en el admin
    let query = supabase
      .from('audit_events')
      .select('*')
      .eq('employee_id', employee.id)
      .order('happened_at', { ascending: false })

    if (module) {
      query = query.eq('module', module)
    }

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (fromDate) {
      query = query.gte('happened_at', fromDate)
    }

    if (toDate) {
      query = query.lte('happened_at', toDate)
    }

    // Aplicar paginación al final, después de todos los filtros
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('[Audit Events API] Error al obtener eventos:', error)
      return NextResponse.json(
        { error: error.message || 'Error al obtener eventos' },
        { status: 500 }
      )
    }

    // Obtener total para paginación
    let countQuery = supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employee.id)

    if (module) countQuery = countQuery.eq('module', module)
    if (actionType) countQuery = countQuery.eq('action_type', actionType)
    if (status) countQuery = countQuery.eq('status', status)
    if (fromDate) countQuery = countQuery.gte('happened_at', fromDate)
    if (toDate) countQuery = countQuery.lte('happened_at', toDate)

    const { count } = await countQuery

    return NextResponse.json({
      events: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Error al obtener eventos de auditoría:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener eventos' },
      { status: 500 }
    )
  }
}

