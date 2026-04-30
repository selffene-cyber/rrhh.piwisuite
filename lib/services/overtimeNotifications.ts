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
    console.log('🔍 [OVERTIME NOTIF] Detectando trabajadores sin pacto...')
    console.log('🔍 [OVERTIME NOTIF] Company ID:', companyId)
    console.log('🔍 [OVERTIME NOTIF] Employee IDs count:', employeeIds.length)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    const notifications: OvertimeNotification[] = []
    
    // Obtener información completa de todos los empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, rut')
      .in('id', employeeIds)
      .eq('status', 'active')
    
    if (empError) {
      console.error('❌ [OVERTIME NOTIF] Error obteniendo empleados:', empError)
      throw empError
    }
    
    if (!employees || employees.length === 0) {
      console.log('⚠️ [OVERTIME NOTIF] No se encontraron empleados activos')
      return []
    }
    
    console.log('✅ [OVERTIME NOTIF] Empleados activos encontrados:', employees.length)
    
    // Obtener TODOS los pactos activos de una vez (más eficiente)
    const { data: allActivePacts, error: pactsError } = await supabase
      .from('overtime_pacts')
      .select('id, employee_id, start_date, end_date, status')
      .in('employee_id', employeeIds)
      .eq('status', 'active')
      .gte('end_date', todayStr)
      .lte('start_date', todayStr)
    
    if (pactsError) {
      console.error('❌ [OVERTIME NOTIF] Error obteniendo pactos:', pactsError)
      throw pactsError
    }
    
    console.log('📋 [OVERTIME NOTIF] Pactos vigentes encontrados:', allActivePacts?.length || 0)
    
    // Crear un Set de employee_ids que SÍ tienen pacto vigente
    const employeesWithPact = new Set(allActivePacts?.map(p => p.employee_id) || [])
    
    console.log('👥 [OVERTIME NOTIF] Empleados con pacto vigente:', employeesWithPact.size)
    
    // Para cada trabajador activo, verificar si NO está en el Set
    for (const employee of employees) {
      if (!employeesWithPact.has(employee.id)) {
        console.log('⚠️ [OVERTIME NOTIF] Trabajador SIN pacto:', employee.full_name, employee.rut)
        
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
          priority: 2,
          message: `Trabajador sin pacto de horas extras vigente. Debe generar pacto si requiere trabajar horas extras.`,
          legalReference: 'Art. 32 CT - Pacto previo obligatorio para trabajar horas extraordinarias.',
          recentOvertimeHours: undefined,
          lastOvertimeDate: undefined
        })
      }
    }
    
    console.log('🔔 [OVERTIME NOTIF] Total notificaciones "sin pacto" generadas:', notifications.length)
    
    return notifications
  } catch (error) {
    console.error('❌ [OVERTIME NOTIF] Error detectando trabajadores sin pacto:', error)
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
    console.log('🚀 [OVERTIME NOTIF] Iniciando getOvertimeNotifications para company:', companyId)
    
    // Primero obtener los empleados de la empresa
    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
    
    if (empError) throw empError
    
    if (!employeesData || employeesData.length === 0) {
      console.log('⚠️ [OVERTIME NOTIF] No hay empleados en esta empresa')
      return []
    }
    
    console.log('👥 [OVERTIME NOTIF] Total empleados en empresa:', employeesData.length)
    
    const employeeIds = employeesData.map((emp: any) => emp.id)
    
    // 1. No generar alertas de "sin pacto" para todos los empleados
    // Solo mostrar alertas de pactos próximos a vencer o vencidos
    const noPactNotifications: OvertimeNotification[] = []
    
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
    
    const notifications: OvertimeNotification[] = []
    
    // Si no hay pactos, solo retornar las notificaciones de "sin pacto"
    if (!pactsData || pactsData.length === 0) {
      console.log('📋 [OVERTIME NOTIF] No hay pactos activos/expired. Retornando solo notificaciones "sin pacto"')
      return noPactNotifications
    }
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
    
    console.log('🔔 [OVERTIME NOTIF] Total notificaciones combinadas:', allNotifications.length)
    console.log('   - Sin pacto:', noPactNotifications.length)
    console.log('   - Pactos por vencer/vencidos:', notifications.length)
    
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
    
    console.log('✅ [OVERTIME NOTIF] Retornando', allNotifications.length, 'notificaciones')
    
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


