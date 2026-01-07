import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, tipo, vigencia_dias, requiere_evidencia, criticidad, aplica_a_cargo, aplica_a_cc, aplica_a_condicion, descripcion, activo } = body

    // Obtener el ítem para verificar company_id
    const { data: existingItem, error: fetchError } = await supabase
      .from('compliance_items')
      .select('company_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', existingItem.company_id)
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
      return NextResponse.json({ error: 'No tienes permisos para editar ítems' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('compliance_items')
      .update({
        nombre,
        tipo,
        vigencia_dias,
        requiere_evidencia,
        criticidad,
        aplica_a_cargo,
        aplica_a_cc,
        aplica_a_condicion: aplica_a_condicion || null,
        descripcion: descripcion || null,
        activo: activo !== undefined ? activo : true,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error actualizando compliance_item:', error)
      return NextResponse.json({ error: 'Error al actualizar ítem' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error en PUT /api/compliance/items/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el ítem para verificar company_id
    const { data: existingItem, error: fetchError } = await supabase
      .from('compliance_items')
      .select('company_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', existingItem.company_id)
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
      return NextResponse.json({ error: 'No tienes permisos para eliminar ítems' }, { status: 403 })
    }

    // Verificar si hay cumplimientos asociados
    const { count: complianceCount } = await supabase
      .from('worker_compliance')
      .select('id', { count: 'exact', head: true })
      .eq('compliance_item_id', params.id)

    if (complianceCount && complianceCount > 0) {
      // En lugar de eliminar, desactivar
      const { data, error } = await supabase
        .from('compliance_items')
        .update({ activo: false })
        .eq('id', params.id)
        .select()
        .single()

      if (error) {
        console.error('Error desactivando compliance_item:', error)
        return NextResponse.json({ error: 'Error al desactivar ítem' }, { status: 500 })
      }

      return NextResponse.json({ ...data, message: 'Ítem desactivado (tiene cumplimientos asociados)' })
    }

    // Si no hay cumplimientos, eliminar
    const { error } = await supabase
      .from('compliance_items')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error eliminando compliance_item:', error)
      return NextResponse.json({ error: 'Error al eliminar ítem' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Ítem eliminado correctamente' })
  } catch (error: any) {
    console.error('Error en DELETE /api/compliance/items/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

