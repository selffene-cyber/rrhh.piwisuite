import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API para obtener eventos de auditoría de un trabajador (admin)
 * GET /api/employees/[id]/audit-events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo admin/owner/super_admin)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isSuperAdmin = profile?.role === 'super_admin'

    if (!isSuperAdmin) {
      // Verificar que el usuario es admin/owner de la empresa del trabajador
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', params.id)
        .single()

      if (!employee) {
        return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
      }

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', employee.company_id)
        .eq('status', 'active')
        .maybeSingle()

      if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const module = searchParams.get('module')
    const actionType = searchParams.get('action_type')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construir query
    let query = supabase
      .from('audit_events')
      .select('*')
      .eq('employee_id', params.id)
      .order('happened_at', { ascending: false })
      .range(offset, offset + limit - 1)

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

    const { data, error } = await query

    if (error) {
      console.error('Error al obtener eventos de auditoría:', error)
      return NextResponse.json(
        { error: error.message || 'Error al obtener eventos' },
        { status: 500 }
      )
    }

    // Obtener total para paginación
    let countQuery = supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', params.id)

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





