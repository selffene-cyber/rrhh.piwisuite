import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API para gestionar una firma digital específica
 * PUT: Actualizar firma digital
 * DELETE: Eliminar firma digital (soft delete: is_active = false)
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
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

    const body = await request.json()
    const { is_active, signer_name, signer_position, signer_rut } = body

    // Obtener firma
    const { data: signature, error: sigError } = await supabase
      .from('digital_signatures')
      .select('*, companies!inner(id)')
      .eq('id', params.id)
      .single()

    if (sigError || !signature) {
      return NextResponse.json({ error: 'Firma no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    if (!isSuperAdmin) {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role, company_id')
        .eq('user_id', user.id)
        .eq('company_id', (signature.companies as any).id)
        .eq('status', 'active')
        .single()

      if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Actualizar firma
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (is_active !== undefined) updates.is_active = is_active
    if (signer_name) updates.signer_name = signer_name
    if (signer_position) updates.signer_position = signer_position
    if (signer_rut) updates.signer_rut = signer_rut

    const { data: updated, error: updateError } = await supabase
      .from('digital_signatures')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error al actualizar firma:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      signature: updated,
      message: 'Firma digital actualizada exitosamente'
    })
  } catch (error: any) {
    console.error('Error al actualizar firma digital:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar la solicitud' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
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

    // Obtener firma
    const { data: signature, error: sigError } = await supabase
      .from('digital_signatures')
      .select('*, companies!inner(id)')
      .eq('id', params.id)
      .single()

    if (sigError || !signature) {
      return NextResponse.json({ error: 'Firma no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    if (!isSuperAdmin) {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role, company_id')
        .eq('user_id', user.id)
        .eq('company_id', (signature.companies as any).id)
        .eq('status', 'active')
        .single()

      if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Verificar si la firma está siendo usada en documentos
    const { data: certificates } = await supabase
      .from('certificates')
      .select('id')
      .eq('signature_id', params.id)
      .limit(1)

    const { data: vacations } = await supabase
      .from('vacations')
      .select('id')
      .eq('signature_id', params.id)
      .limit(1)

    const { data: permissions } = await supabase
      .from('permissions')
      .select('id')
      .eq('signature_id', params.id)
      .limit(1)

    if (certificates && certificates.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar la firma porque está siendo usada en certificados. Desactívela en su lugar.' 
      }, { status: 400 })
    }

    if (vacations && vacations.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar la firma porque está siendo usada en vacaciones. Desactívela en su lugar.' 
      }, { status: 400 })
    }

    if (permissions && permissions.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar la firma porque está siendo usada en permisos. Desactívela en su lugar.' 
      }, { status: 400 })
    }

    // Obtener la URL de la imagen para eliminarla del Storage
    const signatureImageUrl = signature.signature_image_url
    let imagePath: string | null = null

    // Extraer el path del archivo de la URL
    if (signatureImageUrl) {
      try {
        const url = new URL(signatureImageUrl)
        // La URL de Supabase Storage tiene el formato: /storage/v1/object/public/bucket/path
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/digital-signatures\/(.+)/)
        if (pathMatch) {
          imagePath = pathMatch[1]
        }
      } catch (e) {
        console.error('Error al parsear URL de imagen:', e)
      }
    }

    // Eliminar la imagen del Storage si existe
    if (imagePath) {
      const { error: storageError } = await supabase.storage
        .from('digital-signatures')
        .remove([imagePath])

      if (storageError) {
        console.error('Error al eliminar imagen del Storage:', storageError)
        // Continuar con la eliminación de la firma aunque falle la eliminación de la imagen
      }
    }

    // Eliminar la firma de la base de datos (hard delete)
    const { error: deleteError } = await supabase
      .from('digital_signatures')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error al eliminar firma:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Firma digital eliminada exitosamente'
    })
  } catch (error: any) {
    console.error('Error al desactivar firma digital:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar la solicitud' }, { status: 500 })
  }
}

