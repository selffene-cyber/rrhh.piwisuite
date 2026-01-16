import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { createAuditService } from '@/lib/services/auditService'

/**
 * API para rechazar una solicitud de vacaciones
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

    // Obtener vacación
    const { data: vacation, error: vacError } = await supabase
      .from('vacations')
      .select('*, employees!inner(company_id)')
      .eq('id', params.id)
      .single()

    if (vacError || !vacation) {
      return NextResponse.json({ 
        error: 'Vacación no encontrada' 
      }, { status: 404 })
    }

    // Si no es super admin, verificar que pertenece a una empresa del usuario
    if (!isSuperAdmin) {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role, company_id')
        .eq('user_id', user.id)
        .eq('company_id', (vacation.employees as any).company_id)
        .eq('status', 'active')
        .single()

      if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
        return NextResponse.json({ 
          error: 'No autorizado para rechazar esta vacación' 
        }, { status: 403 })
      }
    }

    // Verificar que la vacación está en estado 'solicitada'
    if (vacation.status !== 'solicitada') {
      return NextResponse.json({ 
        error: `La vacación no puede ser rechazada. Estado actual: ${vacation.status}` 
      }, { status: 400 })
    }

    const body = await request.json()
    const { rejection_reason } = body

    if (!rejection_reason?.trim()) {
      return NextResponse.json({ 
        error: 'El motivo del rechazo es requerido' 
      }, { status: 400 })
    }

    // Actualizar estado a 'rechazada'
    const { data: updated, error: updateError } = await supabase
      .from('vacations')
      .update({
        status: 'rechazada',
        rejection_reason: rejection_reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error al rechazar vacación:', updateError)
      return NextResponse.json({ 
        error: updateError.message || 'Error al rechazar vacación' 
      }, { status: 500 })
    }

    // Registrar evento de auditoría
    try {
      const auditService = createAuditService(supabase)
      await auditService.logEvent({
        companyId: (vacation.employees as any).company_id,
        employeeId: vacation.employee_id,
        actorUserId: user.id,
        source: 'admin_dashboard',
        actionType: 'vacation.rejected',
        module: 'vacations',
        entityType: 'vacations',
        entityId: params.id,
        status: 'success',
        beforeData: { status: vacation.status },
        afterData: { 
          status: 'rechazada',
          rejection_reason: rejection_reason.trim(),
        },
        metadata: {
          rejection_reason: rejection_reason.trim(),
        },
      })
    } catch (auditError) {
      console.error('Error al registrar auditoría:', auditError)
      // No interrumpir el flujo
    }

    return NextResponse.json({ 
      success: true, 
      vacation: updated,
      message: 'Vacación rechazada' 
    })
  } catch (error: any) {
    console.error('Error al rechazar vacación:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}




