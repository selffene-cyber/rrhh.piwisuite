/**
 * Servicio de Notificaciones de Compliance
 * Detecta vencimientos críticos de certificados, licencias, cursos y exámenes
 * según la criticidad definida en cada ítem
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type ComplianceAlertType = 'expired' | 'expires_today' | 'expiring_critical' | 'expiring_urgent' | 'expiring_soon'

export interface ComplianceNotification {
  id: string
  employee: {
    id: string
    full_name: string
    rut: string
  }
  item: {
    id: string
    nombre: string
    tipo: 'CERTIFICADO' | 'LICENCIA' | 'CURSO' | 'EXAMEN' | 'OTRO'
    criticidad: 'ALTA' | 'MEDIA' | 'BAJA'
  }
  fecha_emision: string
  fecha_vencimiento: string
  dias_restantes: number
  status: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'EN_RENOVACION' | 'EXENTO'
  evidencia_url: string | null
  alertType: ComplianceAlertType
  priority: number // 1 = crítico, 2 = alto, 3 = medio
  message: string
  icon: string
}

export interface ComplianceNotificationCounts {
  critical: number
  high: number
  medium: number
  total: number
}

/**
 * Calcula el tipo de alerta y prioridad basado en días restantes y criticidad
 */
function calculateComplianceAlertType(
  diasRestantes: number,
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA',
  status: string
): { alertType: ComplianceAlertType; priority: number; message: string } {
  
  // VENCIDO
  if (diasRestantes < 0) {
    return {
      alertType: 'expired',
      priority: 1,
      message: `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}. Requiere renovación inmediata.`
    }
  }
  
  // VENCE HOY
  if (diasRestantes === 0) {
    return {
      alertType: 'expires_today',
      priority: 1,
      message: 'Vence hoy. Acción inmediata requerida.'
    }
  }
  
  // CRÍTICO: 1-7 días (o cualquier plazo si es criticidad ALTA)
  if (diasRestantes <= 7 || (criticidad === 'ALTA' && diasRestantes <= 15)) {
    return {
      alertType: 'expiring_critical',
      priority: criticidad === 'ALTA' ? 1 : 2,
      message: `Vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}. ${criticidad === 'ALTA' ? 'Criticidad ALTA.' : 'Urgente.'}`
    }
  }
  
  // URGENTE: 8-15 días
  if (diasRestantes <= 15) {
    return {
      alertType: 'expiring_urgent',
      priority: 2,
      message: `Vence en ${diasRestantes} días. Planificar renovación.`
    }
  }
  
  // PRÓXIMO: 16-30 días
  if (diasRestantes <= 30) {
    return {
      alertType: 'expiring_soon',
      priority: 3,
      message: `Vence en ${diasRestantes} días.`
    }
  }
  
  // No requiere notificación
  return {
    alertType: 'expiring_soon',
    priority: 4,
    message: `Vence en ${diasRestantes} días.`
  }
}

/**
 * Obtiene el icono según el tipo de ítem
 */
function getComplianceIcon(tipo: string): string {
  const icons: { [key: string]: string } = {
    'CERTIFICADO': '📜',
    'LICENCIA': '🪪',
    'CURSO': '📚',
    'EXAMEN': '📝',
    'OTRO': '📋'
  }
  return icons[tipo] || '📋'
}

/**
 * Obtiene las notificaciones de compliance para una empresa
 * @param companyId ID de la empresa
 * @param supabase Cliente de Supabase
 * @returns Array de notificaciones ordenadas por prioridad
 */
export async function getComplianceNotifications(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<ComplianceNotification[]> {
  try {
    // Obtener cumplimientos activos que requieren atención (próximos 30 días o vencidos)
    const { data: complianceData, error } = await supabase
      .from('worker_compliance')
      .select(`
        id,
        employee_id,
        compliance_item_id,
        fecha_emision,
        fecha_vencimiento,
        status,
        evidencia_url,
        employees:employee_id (
          id,
          full_name,
          rut
        ),
        compliance_items:compliance_item_id (
          id,
          nombre,
          tipo,
          criticidad
        )
      `)
      .eq('company_id', companyId)
      .in('status', ['VIGENTE', 'POR_VENCER', 'VENCIDO'])
      .order('fecha_vencimiento', { ascending: true })
    
    if (error) throw error
    
    if (!complianceData || complianceData.length === 0) {
      return []
    }
    
    const notifications: ComplianceNotification[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (const item of complianceData) {
      // Validar que tenga los datos necesarios y que no sean arrays vacíos
      if (!item.employees || !item.compliance_items) continue
      
      // Acceder al primer elemento si es un array
      const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees
      const complianceItem = Array.isArray(item.compliance_items) ? item.compliance_items[0] : item.compliance_items
      
      if (!employee || !complianceItem) continue
      
      const fechaVencimiento = new Date(item.fecha_vencimiento)
      fechaVencimiento.setHours(0, 0, 0, 0)
      
      const diasRestantes = Math.ceil((fechaVencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      // Solo notificar si vence en 30 días o menos, o ya está vencido
      if (diasRestantes > 30) continue
      
      const { alertType, priority, message } = calculateComplianceAlertType(
        diasRestantes,
        complianceItem.criticidad,
        item.status
      )
      
      // Filtrar por prioridad (solo mostrar críticas, altas y medias)
      if (priority > 3) continue
      
      notifications.push({
        id: item.id,
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          rut: employee.rut
        },
        item: {
          id: complianceItem.id,
          nombre: complianceItem.nombre,
          tipo: complianceItem.tipo,
          criticidad: complianceItem.criticidad
        },
        fecha_emision: item.fecha_emision,
        fecha_vencimiento: item.fecha_vencimiento,
        dias_restantes: diasRestantes,
        status: item.status,
        evidencia_url: item.evidencia_url,
        alertType,
        priority,
        message,
        icon: getComplianceIcon(complianceItem.tipo)
      })
    }
    
    // Ordenar por prioridad (1 primero) y luego por días restantes
    notifications.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.dias_restantes - b.dias_restantes
    })
    
    return notifications
  } catch (error) {
    console.error('Error al obtener notificaciones de compliance:', error)
    return []
  }
}

/**
 * Calcula contadores de notificaciones por prioridad
 */
export function getComplianceNotificationCounts(notifications: ComplianceNotification[]): ComplianceNotificationCounts {
  return {
    total: notifications.length,
    critical: notifications.filter(n => n.priority === 1).length,
    high: notifications.filter(n => n.priority === 2).length,
    medium: notifications.filter(n => n.priority === 3).length
  }
}

/**
 * Agrupa notificaciones por tipo de alerta
 */
export function groupComplianceNotificationsByType(notifications: ComplianceNotification[]): {
  expired: ComplianceNotification[]
  expiresToday: ComplianceNotification[]
  expiringCritical: ComplianceNotification[]
  expiringUrgent: ComplianceNotification[]
  expiringSoon: ComplianceNotification[]
} {
  return {
    expired: notifications.filter(n => n.alertType === 'expired'),
    expiresToday: notifications.filter(n => n.alertType === 'expires_today'),
    expiringCritical: notifications.filter(n => n.alertType === 'expiring_critical'),
    expiringUrgent: notifications.filter(n => n.alertType === 'expiring_urgent'),
    expiringSoon: notifications.filter(n => n.alertType === 'expiring_soon')
  }
}

