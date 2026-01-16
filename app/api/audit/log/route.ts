import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { createAuditService } from '@/lib/services/auditService'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route para registrar eventos de auditoría
 * Permite registrar eventos desde el cliente con contexto del servidor
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const auditService = createAuditService(supabase)

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener datos del request
    const body = await request.json()
    const {
      companyId,
      employeeId,
      source,
      actionType,
      module,
      entityType,
      entityId,
      status,
      beforeData,
      afterData,
      diffData,
      metadata,
      ipAddress,
      userAgent,
    } = body

    // Validar campos requeridos
    if (!companyId || !actionType || !module || !entityType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Registrar evento
    await auditService.logEvent({
      companyId,
      employeeId: employeeId || null,
      actorUserId: user.id,
      source: source || 'admin_dashboard',
      actionType,
      module,
      entityType,
      entityId: entityId || null,
      status: status || 'success',
      beforeData,
      afterData,
      diffData,
      metadata,
      ipAddress: ipAddress || request.ip || null,
      userAgent: userAgent || request.headers.get('user-agent') || null,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error al registrar evento de auditoría:', error)
    return NextResponse.json(
      { error: error.message || 'Error al registrar evento' },
      { status: 500 }
    )
  }
}

