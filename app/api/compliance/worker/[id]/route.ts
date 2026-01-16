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
    const { fecha_emision, fecha_vencimiento, evidencia_url, evidencia_nombre, notas, status } = body

    // Obtener el cumplimiento para verificar permisos
    const { data: existing, error: fetchError } = await supabase
      .from('worker_compliance')
      .select('company_id, employee_id, employees(user_id)')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Cumplimiento no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', existing.company_id)
      .eq('status', 'active')
      .single()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'
    const isAdmin = companyUser?.role === 'admin' || companyUser?.role === 'owner'
    const isOwnEmployee = (existing.employees as any)?.user_id === user.id

    // Solo admins pueden cambiar status, trabajadores solo pueden subir evidencia
    const updateData: any = {}
    if (fecha_emision) updateData.fecha_emision = fecha_emision
    if (fecha_vencimiento) updateData.fecha_vencimiento = fecha_vencimiento
    if (evidencia_url !== undefined) updateData.evidencia_url = evidencia_url
    if (evidencia_nombre !== undefined) updateData.evidencia_nombre = evidencia_nombre
    if (notas !== undefined) updateData.notas = notas
    if (status && (isSuperAdmin || isAdmin)) {
      updateData.status = status
      if (status === 'VIGENTE') {
        updateData.verificado_por = user.id
        updateData.fecha_verificacion = new Date().toISOString()
      }
    }

    // Si es trabajador subiendo evidencia, cambiar a EN_RENOVACION
    if (evidencia_url && isOwnEmployee && !isAdmin) {
      updateData.status = 'EN_RENOVACION'
    }

    // Recalcular status si cambió la fecha de vencimiento
    if (fecha_vencimiento && (isSuperAdmin || isAdmin)) {
      const vencimientoDate = new Date(fecha_vencimiento)
      const hoy = new Date()
      const diasRestantes = Math.ceil((vencimientoDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diasRestantes < 0) {
        updateData.status = 'VENCIDO'
      } else if (diasRestantes <= 30) {
        updateData.status = 'POR_VENCER'
      } else if (!updateData.status) {
        updateData.status = 'VIGENTE'
      }
    }

    const { data, error } = await supabase
      .from('worker_compliance')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        employees(id, full_name, rut),
        compliance_items(id, nombre, tipo, criticidad)
      `)
      .single()

    if (error) {
      console.error('Error actualizando worker_compliance:', error)
      return NextResponse.json({ error: 'Error al actualizar cumplimiento' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error en PUT /api/compliance/worker/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

