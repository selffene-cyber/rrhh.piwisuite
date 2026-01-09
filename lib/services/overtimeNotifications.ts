/**
 * Servicio de Notificaciones de Pactos de Horas Extras
 * Los pactos tienen una duración máxima de 90 días (Art. 32 Código del Trabajo)
 * y deben renovarse antes de su vencimiento para mantener la legalidad
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type OvertimeAlertType = 'no_pact' | 'expired' | 'expires_today' | 'expiring_critical' | 'expiring_urgent' | 'expiring_soon'

export interface OvertimeNotification {
  id: string
  employee: {
    id: string
    full_name: string
    rut: string
  }
  pact: {
    id: string | null
    pact_number: string | null
    start_date: string | null
    end_date: string | null
    max_daily_hours: number | null
    reason: string | null
  }
  dias_restantes: number | null
  status: 'draft' | 'active' | 'expired' | 'renewed' | 'void' | 'no_pact'
  alertType: OvertimeAlertType
  priority: number // 1 = crítico, 2 = alto, 3 = medio
  message: string
  legalReference: string
  recentOvertimeHours?: number // Horas extras trabajadas recientemente
  lastOvertimeDate?: string // Última fecha con horas extras
}

export interface OvertimeNotificationCounts {
  critical: number
  high: number
  medium: number
  total: number
}

/**
 * Calcula el tipo de alerta basado en días restantes
 */
function calculateOvertimeAlertType(
  diasRestantes: number,
  status: string
): { alertType: OvertimeAlertType; priority: number; message: string; legalReference: string } {
  
  // VENCIDO
  if (diasRestantes < 0) {
    return {
      alertType: 'expired',
      priority: 1,
      message: `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}. El trabajador NO PUEDE hacer horas extras sin pacto vigente.`,
      legalReference: 'Art. 32 Código del Trabajo - Pacto de horas extras obligatorio'
    }
  }
  
  // VENCE HOY
  if (diasRestantes === 0) {
    return {
      alertType: 'expires_today',
      priority: 1,
      message: 'Vence hoy. Renovar inmediatamente o el trabajador no podrá hacer horas extras.',
      legalReference: 'Art. 32 inc. 1° CT - Máximo 2 horas diarias con pacto previo'
    }
  }
  
  // CRÍTICO: 1-7 días
  if (diasRestantes <= 7) {
    return {
      alertType: 'expiring_critical',
      priority: 1,
      message: `Vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}. Urgente: preparar renovación.`,
      legalReference: 'DT Ord. N°1263/2019 - Pacto debe estar vigente al momento de trabajar horas extras'
    }
  }
  
  // URGENTE: 8-15 días
  if (diasRestantes <= 15) {
    return {
      alertType: 'expiring_urgent',
      priority: 2,
      message: `Vence en ${diasRestantes} días. Planificar renovación pronto.`,
      legalReference: 'Art. 32 CT - Duración máxima 90 días renovables'
    }
  }
  
  // PRÓXIMO: 16-30 días
  if (diasRestantes <= 30) {
    return {
      alertType: 'expiring_soon',
      priority: 3,
      message: `Vence en ${diasRestantes} días. Considerar renovación.`,
      legalReference: 'Art. 32 CT - Pacto escrito renovable'
    }
  }
  
  // No requiere notificación urgente
  return {
    alertType: 'expiring_soon',
    priority: 4,
    message: `Vence en ${diasRestantes} días.`,
    legalReference: 'Art. 32 CT'
  }
}

/**
 * Detecta trabajadores activos que NO tienen ningún pacto vigente
 * (todos los trabajadores deberían tener pacto para poder hacer HH.EE.)
 */
async function detectEmployeesWithoutValidPact(
  companyId: string,
  employeeIds: string[],
  supabase: SupabaseClient<any>
): Promise<OvertimeNotification[]> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const notifications: OvertimeNotification[] = []
    
    // Obtener información completa de todos los empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, rut')
      .in('id', employeeIds)
      .eq('status', 'active')
    
    if (empError) throw empError
    if (!employees || employees.length === 0) return []
    
    // Para cada trabajador activo, verificar si tiene un pacto VIGENTE
    for (const employee of employees) {
      const { data: activePacts } = await supabase
        .from('overtime_pacts')
        .select('id, start_date, end_date, status')
        .eq('employee_id', employee.id)
        .eq('status', 'active')
        .gte('end_date', today.toISOString().split('T')[0])
        .lte('start_date', today.toISOString().split('T')[0])
      
      // Si NO tiene pacto vigente, generar alerta
      if (!activePacts || activePacts.length === 0) {
        notifications.push({
          id: `no_pact_${employee.id}`,
          employee: {
            id: employee.id,
            full_name: employee.full_name,
            rut: employee.rut
          },
          pact: {
            id: null,
            pact_number: null,
            start_date: null,
            end_date: null,
            max_daily_hours: null,
            reason: null
          },
          dias_restantes: null,
          status: 'no_pact',
          alertType: 'no_pact',
          priority: 2, // ALTA (no crítico porque puede que no necesite hacer HH.EE.)
          message: `Trabajador sin pacto de horas extras vigente. Debe generar pacto si requiere trabajar horas extras.`,
          legalReference: 'Art. 32 CT - Pacto previo obligatorio para trabajar horas extraordinarias.',
          recentOvertimeHours: undefined,
          lastOvertimeDate: undefined
        })
      }
    }
    
    return notifications
  } catch (error) {
    console.error('Error detectando trabajadores sin pacto:', error)
    return []
  }
}

/**
 * Obtiene las notificaciones de pactos de horas extras para una empresa
 * @param companyId ID de la empresa
 * @param supabase Cliente de Supabase
 * @returns Array de notificaciones ordenadas por prioridad
 */
export async function getOvertimeNotifications(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<OvertimeNotification[]> {
  try {
    // Primero obtener los empleados de la empresa
    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
    
    if (empError) throw empError
    
    if (!employeesData || employeesData.length === 0) {
      return []
    }
    
    const employeeIds = employeesData.map((emp: any) => emp.id)
    
    // 1. Detectar trabajadores SIN PACTO pero con horas extras recientes (CRÍTICO)
    const noPactNotifications = await detectEmployeesWithoutValidPact(companyId, employeeIds, supabase)
    
    // 2. Obtener pactos activos que requieren atención (próximos 30 días o vencidos)
    const { data: pactsData, error } = await supabase
      .from('overtime_pacts')
      .select(`
        id,
        employee_id,
        start_date,
        end_date,
        max_daily_hours,
        reason,
        status,
        pact_number,
        employees:employee_id (
          id,
          full_name,
          rut
        )
      `)
      .in('employee_id', employeeIds)
      .in('status', ['active', 'expired'])
      .order('end_date', { ascending: true })
    
    if (error) throw error
    
    if (!pactsData || pactsData.length === 0) {
      return []
    }
    
    const notifications: OvertimeNotification[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (const pact of pactsData) {
      // Validar que tenga los datos necesarios
      if (!pact.employees) continue
      
      // Acceder al empleado (puede ser array o objeto)
      const employee = Array.isArray(pact.employees) ? pact.employees[0] : pact.employees
      if (!employee) continue
      
      const fechaVencimiento = new Date(pact.end_date)
      fechaVencimiento.setHours(0, 0, 0, 0)
      
      const diasRestantes = Math.ceil((fechaVencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      // Solo notificar si vence en 30 días o menos, o ya está vencido
      if (diasRestantes > 30) continue
      
      const { alertType, priority, message, legalReference } = calculateOvertimeAlertType(
        diasRestantes,
        pact.status
      )
      
      // Filtrar por prioridad (solo mostrar críticas, altas y medias)
      if (priority > 3) continue
      
      notifications.push({
        id: pact.id,
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          rut: employee.rut
        },
        pact: {
          id: pact.id,
          pact_number: pact.pact_number,
          start_date: pact.start_date,
          end_date: pact.end_date,
          max_daily_hours: pact.max_daily_hours,
          reason: pact.reason
        },
        dias_restantes: diasRestantes,
        status: pact.status,
        alertType,
        priority,
        message,
        legalReference
      })
    }
    
    // Combinar notificaciones de trabajadores sin pacto + pactos por vencer
    const allNotifications = [...noPactNotifications, ...notifications]
    
    // Ordenar por prioridad (1 primero) y luego por días restantes
    allNotifications.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      // Para 'no_pact', considerar como más urgente que otros de prioridad 1
      if (a.alertType === 'no_pact' && b.alertType !== 'no_pact') return -1
      if (b.alertType === 'no_pact' && a.alertType !== 'no_pact') return 1
      // Si ambos tienen dias_restantes, ordenar por eso
      if (a.dias_restantes !== null && b.dias_restantes !== null) {
        return a.dias_restantes - b.dias_restantes
      }
      return 0
    })
    
    return allNotifications
  } catch (error) {
    console.error('Error al obtener notificaciones de pactos de horas extras:', error)
    return []
  }
}

/**
 * Calcula contadores de notificaciones por prioridad
 */
export function getOvertimeNotificationCounts(notifications: OvertimeNotification[]): OvertimeNotificationCounts {
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
export function groupOvertimeNotificationsByType(notifications: OvertimeNotification[]): {
  expired: OvertimeNotification[]
  expiresToday: OvertimeNotification[]
  expiringCritical: OvertimeNotification[]
  expiringUrgent: OvertimeNotification[]
  expiringSoon: OvertimeNotification[]
} {
  return {
    expired: notifications.filter(n => n.alertType === 'expired'),
    expiresToday: notifications.filter(n => n.alertType === 'expires_today'),
    expiringCritical: notifications.filter(n => n.alertType === 'expiring_critical'),
    expiringUrgent: notifications.filter(n => n.alertType === 'expiring_urgent'),
    expiringSoon: notifications.filter(n => n.alertType === 'expiring_soon')
  }
}


