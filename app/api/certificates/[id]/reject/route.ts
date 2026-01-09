import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API para rechazar una solicitud de certificado
 * Solo admin/owner pueden rechazar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
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

    // Obtener certificado
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select('*, employees!inner(company_id)')
      .eq('id', params.id)
      .single()

    if (certError || !certificate) {
      return NextResponse.json({ 
        error: 'Certificado no encontrado' 
      }, { status: 404 })
    }

    // Si no es super admin, verificar que pertenece a una empresa del usuario
    if (!isSuperAdmin) {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role, company_id')
        .eq('user_id', user.id)
        .eq('company_id', (certificate.employees as any).company_id)
        .eq('status', 'active')
        .single()

      if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
        return NextResponse.json({ 
          error: 'No autorizado para rechazar este certificado' 
        }, { status: 403 })
      }
    }

    // Verificar que el certificado está en estado 'requested'
    if (certificate.status !== 'requested') {
      return NextResponse.json({ 
        error: `El certificado no puede ser rechazado. Estado actual: ${certificate.status}` 
      }, { status: 400 })
    }

    const body = await request.json()
    const { rejection_reason } = body

    if (!rejection_reason?.trim()) {
      return NextResponse.json({ 
        error: 'El motivo del rechazo es requerido' 
      }, { status: 400 })
    }

    // Actualizar estado a 'rejected'
    const { data: updated, error: updateError } = await supabase
      .from('certificates')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error al rechazar certificado:', updateError)
      return NextResponse.json({ 
        error: updateError.message || 'Error al rechazar certificado' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      certificate: updated,
      message: 'Certificado rechazado' 
    })
  } catch (error: any) {
    console.error('Error al rechazar certificado:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}








