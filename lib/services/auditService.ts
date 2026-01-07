import { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { Database } from '@/types/database'

/**
 * Tipos para el sistema de auditoría
 */
export type AuditSource = 'admin_dashboard' | 'employee_portal' | 'api' | 'cron'
export type AuditStatus = 'success' | 'error'
export type AuditModule = 
  | 'contracts' 
  | 'annexes' 
  | 'employees' 
  | 'payroll' 
  | 'vacations' 
  | 'permissions' 
  | 'loans' 
  | 'advances' 
  | 'overtime' 
  | 'compliance' 
  | 'raat' 
  | 'settlements'
  | 'certificates'
  | 'disciplinary'

export type AuditActionType =
  // Contratos
  | 'contract.created'
  | 'contract.updated'
  | 'contract.issued'
  | 'contract.signed'
  | 'contract.activated'
  | 'contract.terminated'
  // Anexos
  | 'annex.created'
  | 'annex.updated'
  | 'annex.issued'
  | 'annex.signed'
  | 'annex.activated'
  | 'annex.expired'
  // Trabajadores
  | 'employee.created'
  | 'employee.updated'
  | 'employee.status_changed'
  // Liquidaciones
  | 'payroll.created'
  | 'payroll.updated'
  | 'payroll.issued'
  | 'payroll.sent'
  | 'payroll.pdf_generated'
  // Vacaciones
  | 'vacation.requested'
  | 'vacation.approved'
  | 'vacation.rejected'
  | 'vacation.taken'
  | 'vacation.cancelled'
  // Permisos
  | 'permission.requested'
  | 'permission.approved'
  | 'permission.rejected'
  | 'permission.taken'
  | 'permission.cancelled'
  // Préstamos
  | 'loan.created'
  | 'loan.issued'
  | 'loan.payment_applied'
  | 'loan.completed'
  | 'loan.cancelled'
  // Anticipos
  | 'advance.created'
  | 'advance.signed'
  | 'advance.paid'
  | 'advance.discounted'
  | 'advance.reversed'
  // Horas extra
  | 'overtime_pact.created'
  | 'overtime_pact.renewed'
  | 'overtime_pact.expired'
  // Otros
  | 'settlement.created'
  | 'settlement.approved'
  | 'certificate.requested'
  | 'certificate.approved'
  | 'certificate.issued'
  | 'disciplinary_action.created'
  | 'disciplinary_action.issued'

export interface AuditEventPayload {
  companyId: string
  employeeId?: string | null
  actorUserId: string
  source: AuditSource
  actionType: AuditActionType
  module: AuditModule
  entityType: string // Nombre de la tabla (ej: "contracts", "contract_annexes")
  entityId?: string | null
  status?: AuditStatus
  beforeData?: any
  afterData?: any
  diffData?: any
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Calcula el fingerprint (huella digital) del evento
 * Formato: sha256(company_id + employee_id + action_type + entity_id + happened_at + JSON.stringify(after_data|metadata))
 */
function calculateFingerprint(
  companyId: string,
  employeeId: string | null | undefined,
  actionType: string,
  entityId: string | null | undefined,
  happenedAt: string,
  afterData: any,
  metadata: Record<string, any> | undefined
): string {
  const dataString = `${companyId}${employeeId || ''}${actionType}${entityId || ''}${happenedAt}${JSON.stringify(afterData || metadata || {})}`
  return createHash('sha256').update(dataString).digest('hex')
}

/**
 * Servicio centralizado de auditoría
 * Single entry point para registrar todos los eventos del sistema
 */
export class AuditService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Registra un evento en el sistema de auditoría
   * NUNCA debe lanzar excepciones que interrumpan el flujo principal
   */
  async logEvent(payload: AuditEventPayload): Promise<void> {
    try {
      // Obtener datos del actor (usuario)
      const { data: userProfile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('full_name, email, role')
        .eq('id', payload.actorUserId)
        .maybeSingle()

      if (profileError) {
        console.error('[AuditService] Error al obtener perfil del usuario:', profileError)
      }

      // Obtener email del usuario
      // Si no está en user_profiles, intentar obtenerlo desde la sesión actual
      const profile = userProfile as any
      let actorEmail = profile?.email || null
      if (!actorEmail) {
        // Intentar obtener el email del usuario actual si coincide
        try {
          const { data: { user } } = await this.supabase.auth.getUser()
          if (user && user.id === payload.actorUserId) {
            actorEmail = user.email || null
          }
        } catch (error) {
          // Si falla, dejar como null
          actorEmail = null
        }
      }

      // Timestamp actual
      const happenedAt = new Date().toISOString()

      // Calcular fingerprint
      const fingerprint = calculateFingerprint(
        payload.companyId,
        payload.employeeId || null,
        payload.actionType,
        payload.entityId || null,
        happenedAt,
        payload.afterData,
        payload.metadata
      )

      // Preparar datos del evento
      const eventData: any = {
        company_id: payload.companyId,
        employee_id: payload.employeeId || null,
        actor_user_id: payload.actorUserId,
        actor_name: profile?.full_name || null,
        actor_email: actorEmail || null,
        actor_role: profile?.role || null,
        source: payload.source,
        action_type: payload.actionType,
        module: payload.module,
        entity_type: payload.entityType,
        entity_id: payload.entityId || null,
        status: payload.status || 'success',
        happened_at: happenedAt,
        ip_address: payload.ipAddress || null,
        user_agent: payload.userAgent || null,
        fingerprint,
        before_data: payload.beforeData || null,
        after_data: payload.afterData || null,
        diff_data: payload.diffData || null,
        metadata: payload.metadata || {},
      }

      // Insertar evento (usando supabase directo ya que la tabla puede no estar en types aún)
      const { data: insertedData, error: insertError } = await (this.supabase
        .from('audit_events') as any)
        .insert(eventData)
        .select()

      if (insertError) {
        console.error('[AuditService] Error al insertar evento de auditoría:', insertError)
        console.error('[AuditService] Código de error:', insertError.code)
        console.error('[AuditService] Mensaje:', insertError.message)
        console.error('[AuditService] Detalles:', insertError.details)
        console.error('[AuditService] Hint:', insertError.hint)
        console.error('[AuditService] Datos del evento:', JSON.stringify(eventData, null, 2))
        // NO lanzar excepción - solo loggear
      } else {
        console.log(`[AuditService] Evento insertado exitosamente. ID: ${insertedData?.[0]?.id}, employee_id: ${eventData.employee_id}`)
      }
    } catch (error: any) {
      // Capturar cualquier error y solo loggearlo, nunca interrumpir el flujo principal
      console.error('[AuditService] Error inesperado al registrar evento:', error)
      console.error('[AuditService] Payload:', JSON.stringify(payload, null, 2))
    }
  }

  /**
   * Helper para obtener datos del usuario actual desde el contexto
   * Útil cuando se llama desde API Routes con sesión activa
   */
  async getCurrentActor(): Promise<{ userId: string; email: string | null } | null> {
    try {
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      
      if (userError || !user) {
        return null
      }

      return {
        userId: user.id,
        email: user.email || null,
      }
    } catch (error) {
      console.error('[AuditService] Error al obtener usuario actual:', error)
      return null
    }
  }
}

/**
 * Función helper para crear instancia del servicio
 */
export function createAuditService(supabase: SupabaseClient<Database>): AuditService {
  return new AuditService(supabase)
}

