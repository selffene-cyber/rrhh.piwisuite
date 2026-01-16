/**
 * Servicio de Notificaciones de Vacaciones
 * Basado en el Código del Trabajo de Chile:
 * - Art. 70: Máximo 2 períodos acumulados (60 días)
 * - Ord. N°6287/2017: Obligación de otorgar vacaciones antes de perder días
 * - Ord. N°307/2025: Empleador debe gestionar acumulación
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getVacationSummary } from './vacationPeriods'

export type VacationAlertType = 'critical_loss' | 'high_accumulation' | 'moderate_accumulation' | 'pending_expiry'

export interface VacationNotification {
  id: string
  employee: {
    id: string
    full_name: string
    rut: string
    hire_date: string
  }
  totalAccumulated: number
  totalUsed: number
  totalAvailable: number
  periodsCount: number
  alertType: VacationAlertType
  priority: number // 1 = crítico, 2 = alto, 3 = medio
  message: string
  legalReference: string
}

export interface VacationNotificationCounts {
  critical: number
  urgent: number
  moderate: number
  total: number
}

/**
 * Calcula el tipo de alerta basado en días DISPONIBLES (no acumulados históricos)
 * Los días acumulados siguen creciendo, pero las alertas deben basarse en días disponibles reales
 */
function calculateVacationAlertType(
  totalAccumulated: number,
  totalAvailable: number,
  periodsCount: number
): { alertType: VacationAlertType; priority: number; message: string; legalReference: string } | null {
  
  // CRÍTICO: Tiene 60+ días DISPONIBLES o 2+ períodos activos con muchos días disponibles
  // Esto significa riesgo real de pérdida de días
  if (totalAvailable >= 60 && periodsCount >= 2) {
    return {
      alertType: 'critical_loss',
      priority: 1,
      message: `¡CRÍTICO! Trabajador con ${totalAvailable.toFixed(2)} días disponibles (${periodsCount} períodos). Puede perder días si no toma vacaciones pronto.`,
      legalReference: 'Art. 70 Código del Trabajo - Máximo 2 períodos acumulados'
    }
  }
  
  // URGENTE: Más de 45 días DISPONIBLES (cerca del límite de 60)
  if (totalAvailable >= 45) {
    return {
      alertType: 'high_accumulation',
      priority: 2,
      message: `Trabajador con ${totalAvailable.toFixed(2)} días disponibles. Planificar vacaciones pronto para evitar pérdida.`,
      legalReference: 'Ord. N°6287/2017 DT - Obligación de otorgar feriado antes de nuevo período'
    }
  }
  
  // MODERADO: Más de 30 días DISPONIBLES (1 período completo + excedente)
  if (totalAvailable >= 30) {
    return {
      alertType: 'moderate_accumulation',
      priority: 3,
      message: `Trabajador con ${totalAvailable.toFixed(2)} días disponibles. Considerar programación de vacaciones.`,
      legalReference: 'Ord. N°307/2025 DT - Empleador debe gestionar acumulación'
    }
  }
  
  return null
}

/**
 * Obtiene las notificaciones de vacaciones para una empresa
 * @param companyId ID de la empresa
 * @param supabase Cliente de Supabase
 * @returns Array de notificaciones ordenadas por prioridad
 */
export async function getVacationNotifications(
  companyId: string,
  supabase: SupabaseClient<any> // Usar 'any' por compatibilidad
): Promise<VacationNotification[]> {
  try {
    // Obtener todos los trabajadores activos de la empresa
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, rut, hire_date')
      .eq('status', 'active')
      .eq('company_id', companyId)
    
    if (empError) throw empError
    if (!employees || employees.length === 0) return []
    
    const notifications: VacationNotification[] = []
    
    // Para cada trabajador, calcular su situación de vacaciones
    for (const employee of employees) {
      try {
        // Obtener resumen de vacaciones
        const summary = await getVacationSummary(employee.id, employee.hire_date)
        
        // Determinar si requiere notificación
        const alert = calculateVacationAlertType(
          summary.totalAccumulated,
          summary.totalAvailable,
          summary.periods.length
        )
        
        if (alert) {
          notifications.push({
            id: `vac-${employee.id}`,
            employee: {
              id: employee.id,
              full_name: employee.full_name,
              rut: employee.rut,
              hire_date: employee.hire_date,
            },
            totalAccumulated: summary.totalAccumulated,
            totalUsed: summary.totalUsed,
            totalAvailable: summary.totalAvailable,
            periodsCount: summary.periods.length,
            alertType: alert.alertType,
            priority: alert.priority,
            message: alert.message,
            legalReference: alert.legalReference,
          })
        }
      } catch (error) {
        console.error(`Error al procesar vacaciones de ${employee.full_name}:`, error)
        // Continuar con el siguiente empleado
      }
    }
    
    // Ordenar por prioridad (crítico primero) y luego por días DISPONIBLES (mayor primero)
    notifications.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return b.totalAvailable - a.totalAvailable
    })
    
    return notifications
  } catch (error) {
    console.error('Error al obtener notificaciones de vacaciones:', error)
    return []
  }
}

/**
 * Obtiene los contadores de notificaciones por tipo
 * @param notifications Array de notificaciones
 * @returns Contadores por tipo
 */
export function getVacationNotificationCounts(
  notifications: VacationNotification[]
): VacationNotificationCounts {
  return {
    critical: notifications.filter(n => n.alertType === 'critical_loss').length,
    urgent: notifications.filter(n => n.alertType === 'high_accumulation').length,
    moderate: notifications.filter(n => n.alertType === 'moderate_accumulation' || n.alertType === 'pending_expiry').length,
    total: notifications.length,
  }
}

/**
 * Agrupa notificaciones de vacaciones por tipo de alerta
 * @param notifications Array de notificaciones
 * @returns Objeto con notificaciones agrupadas
 */
export function groupVacationNotificationsByType(
  notifications: VacationNotification[]
): Record<VacationAlertType, VacationNotification[]> {
  return {
    critical_loss: notifications.filter(n => n.alertType === 'critical_loss'),
    high_accumulation: notifications.filter(n => n.alertType === 'high_accumulation'),
    moderate_accumulation: notifications.filter(n => n.alertType === 'moderate_accumulation'),
    pending_expiry: notifications.filter(n => n.alertType === 'pending_expiry'),
  }
}

/**
 * Obtiene el mensaje de resumen para el header del dropdown
 * @param counts Contadores de notificaciones
 * @returns Mensaje de resumen
 */
export function getVacationNotificationSummary(counts: VacationNotificationCounts): string {
  const parts: string[] = []
  
  if (counts.critical > 0) {
    parts.push(`${counts.critical} crítica${counts.critical > 1 ? 's' : ''}`)
  }
  if (counts.urgent > 0) {
    parts.push(`${counts.urgent} urgente${counts.urgent > 1 ? 's' : ''}`)
  }
  if (counts.moderate > 0) {
    parts.push(`${counts.moderate} moderada${counts.moderate > 1 ? 's' : ''}`)
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Sin alertas'
}

