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

    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
    }

    // Usar adminClient para bypass RLS si es necesario, o confiar en RLS
    const { data, error } = await supabase
      .from('compliance_items')
      .select('*')
      .eq('company_id', companyId)
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error obteniendo compliance_items:', error)
      return NextResponse.json({ error: 'Error al obtener ítems' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error en GET /api/compliance/items:', error)
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
    const { company_id, nombre, tipo, vigencia_dias, requiere_evidencia, criticidad, aplica_a_cargo, aplica_a_cc, aplica_a_condicion, descripcion } = body

    if (!company_id || !nombre || !tipo) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verificar permisos (solo admins/owners pueden crear)
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

    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos para crear ítems' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('compliance_items')
      .insert({
        company_id,
        nombre,
        tipo,
        vigencia_dias: vigencia_dias || 365,
        requiere_evidencia: requiere_evidencia !== false,
        criticidad: criticidad || 'MEDIA',
        aplica_a_cargo: aplica_a_cargo || false,
        aplica_a_cc: aplica_a_cc || false,
        aplica_a_condicion: aplica_a_condicion || null,
        descripcion: descripcion || null,
        activo: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creando compliance_item:', error)
      return NextResponse.json({ error: 'Error al crear ítem' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error en POST /api/compliance/items:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

