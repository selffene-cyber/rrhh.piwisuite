import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

/**
 * API para aprobar un permiso sin firma digital (para firmar manualmente)
 * Solo admin/owner pueden aprobar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar permisos (solo admin/owner)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'

    // Obtener permiso con datos del empleado y empresa
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select(`
        *,
        employees!inner(
          id,
          company_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (permError || !permission) {
      return NextResponse.json({ 
        error: 'Permiso no encontrado' 
      }, { status: 404 })
    }

    const employee = permission.employees as any
    const companyId = employee.company_id

    // Si no es super admin, verificar que pertenece a una empresa del usuario
    if (!isSuperAdmin) {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role, company_id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .single()

      if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
        return NextResponse.json({ 
          error: 'No autorizado para aprobar este permiso' 
        }, { status: 403 })
      }
    }

    // Verificar que el permiso está en estado 'requested' o 'draft'
    if (permission.status !== 'requested' && permission.status !== 'draft') {
      return NextResponse.json({ 
        error: `El permiso no puede ser aprobado. Estado actual: ${permission.status}` 
      }, { status: 400 })
    }

    // Actualizar permiso a estado 'approved' sin firma digital
    const { data: updated, error: updateError } = await supabase
      .from('permissions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error al aprobar permiso:', updateError)
      return NextResponse.json({ 
        error: updateError.message || 'Error al aprobar permiso' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      permission: updated,
      message: 'Permiso aprobado correctamente (para firmar manualmente)' 
    })
  } catch (error: any) {
    console.error('Error al aprobar permiso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al aprobar permiso' },
      { status: 500 }
    )
  }
}






