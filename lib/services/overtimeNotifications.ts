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
  priority: number
  message: string
  legalReference: string
  recentOvertimeHours?: number
  lastOvertimeDate?: string
}

export interface OvertimeNotificationCounts {
  critical: number
  high: number
  medium: number
  total: number
}

function calculateOvertimeAlertType(
  diasRestantes: number,
  status: string
): { alertType: OvertimeAlertType; priority: number; message: string; legalReference: string } {
  if (diasRestantes < 0) {
    return {
      alertType: 'expired',
      priority: 1,
      message: `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}. El trabajador NO PUEDE hacer horas extras sin pacto vigente.`,
      legalReference: 'Art. 32 Código del Trabajo - Pacto de horas extras obligatorio'
    }
  }
  if (diasRestantes === 0) {
    return {
      alertType: 'expires_today',
      priority: 1,
      message: 'Vence hoy. Renovar inmediatamente o el trabajador no podrá hacer horas extras.',
      legalReference: 'Art. 32 inc. 1° CT - Máximo 2 horas diarias con pacto previo'
    }
  }
  if (diasRestantes <= 7) {
    return {
      alertType: 'expiring_critical',
      priority: 1,
      message: `Vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}. Urgente: preparar renovación.`,
      legalReference: 'DT Ord. N°1263/2019 - Pacto debe estar vigente al momento de trabajar horas extras'
    }
  }
  if (diasRestantes <= 15) {
    return {
      alertType: 'expiring_urgent',
      priority: 2,
      message: `Vence en ${diasRestantes} días. Planificar renovación pronto.`,
      legalReference: 'Art. 32 CT - Duración máxima 90 días renovables'
    }
  }
  if (diasRestantes <= 30) {
    return {
      alertType: 'expiring_soon',
      priority: 3,
      message: `Vence en ${diasRestantes} días. Considerar renovación.`,
      legalReference: 'Art. 32 CT - Pacto escrito renovable'
    }
  }
  return {
    alertType: 'expiring_soon',
    priority: 4,
    message: `Vence en ${diasRestantes} días.`,
    legalReference: 'Art. 32 CT'
  }
}

async function detectEmployeesWithoutValidPact(
  companyId: string,
  employeeIds: string[],
  supabase: SupabaseClient<any>
): Promise<OvertimeNotification[]> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    const notifications: OvertimeNotification[] = []

    // Obtener empleados activos o con licencia_medica que NO tengan regimen Art. 22 inc. 2
    const { data: employees, error: empError } = await supabase
      .from('contracts')
      .select(`employee_id, schedule_regime, employees!inner (id, full_name, rut, status)`)
      .in('employee_id', employeeIds)
      .in('status', ['active', 'signed'])

    if (empError) {
      console.error('Error obteniendo contratos:', empError)
      // Fallback: obtener todos los empleados y filtrar después
      const { data: allEmps, error: emp2Error } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .in('id', employeeIds)
        .in('status', ['active', 'licencia_medica'])

      if (emp2Error || !allEmps) return []

      for (const employee of allEmps) {
        notifications.push({
          id: `no_pact_${employee.id}`,
          employee: { id: employee.id, full_name: employee.full_name, rut: employee.rut },
          pact: { id: null, pact_number: null, start_date: null, end_date: null, max_daily_hours: null, reason: null },
          dias_restantes: null,
          status: 'no_pact',
          alertType: 'no_pact',
          priority: 2,
          message: `Trabajador sin pacto de horas extras vigente. Debe generar pacto si requiere trabajar horas extras.`,
          legalReference: 'Art. 32 CT - Pacto previo obligatorio para trabajar horas extraordinarias.',
        })
      }
      return notifications
    }

    // Filtrar: solo empleados con regimen ordinary o partial (NO excluded_art22)
    // y que tengan status active o licencia_medica
    const eligibleEmployeeIds = new Set<string>()
    const art22EmployeeIds = new Set<string>()

    for (const contract of (employees || [])) {
      const emp = Array.isArray(contract.employees) ? contract.employees[0] : contract.employees
      if (!emp) continue
      if (emp.status !== 'active' && emp.status !== 'licencia_medica') continue

      if (contract.schedule_regime === 'excluded_art22') {
        art22EmployeeIds.add(emp.id)
      } else {
        eligibleEmployeeIds.add(emp.id)
      }
    }

    // Obtener TODOS los pactos activos y vigentes
    const { data: allActivePacts, error: pactsError } = await supabase
      .from('overtime_pacts')
      .select('id, employee_id, start_date, end_date, status')
      .in('employee_id', employeeIds)
      .eq('status', 'active')
      .gte('end_date', todayStr)
      .lte('start_date', todayStr)

    if (pactsError) {
      console.error('Error obteniendo pactos:', pactsError)
      throw pactsError
    }

    // Crear Set de employee_ids que SÍ tienen pacto vigente
    const employeesWithPact = new Set(allActivePacts?.map(p => p.employee_id) || [])

    // Obtener info de empleados elegibles sin pacto
    const { data: eligibleEmps } = await supabase
      .from('employees')
      .select('id, full_name, rut')
      .in('id', Array.from(eligibleEmployeeIds))

    for (const employee of (eligibleEmps || [])) {
      if (!employeesWithPact.has(employee.id)) {
        notifications.push({
          id: `no_pact_${employee.id}`,
          employee: { id: employee.id, full_name: employee.full_name, rut: employee.rut },
          pact: { id: null, pact_number: null, start_date: null, end_date: null, max_daily_hours: null, reason: null },
          dias_restantes: null,
          status: 'no_pact',
          alertType: 'no_pact',
          priority: 2,
          message: `Trabajador sin pacto de horas extras vigente. Debe generar pacto si requiere trabajar horas extras.`,
          legalReference: 'Art. 32 CT - Pacto previo obligatorio para trabajar horas extraordinarias.',
        })
      }
    }

    return notifications
  } catch (error) {
    console.error('Error detectando trabajadores sin pacto:', error)
    return []
  }
}

export async function getOvertimeNotifications(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<OvertimeNotification[]> {
  try {
    // Obtener los empleados de la empresa
    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)

    if (empError) throw empError

    if (!employeesData || employeesData.length === 0) {
      return []
    }

    const employeeIds = employeesData.map((emp: any) => emp.id)

    // 1. Detectar trabajadores sin pacto (excluyendo Art. 22 inc. 2)
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

    const notifications: OvertimeNotification[] = []

    if (!pactsData || pactsData.length === 0) {
      return noPactNotifications
    }

    // Obtener employees con regimen Art. 22 para excluir sus pactos de las alertas
    const { data: art22Contracts } = await supabase
      .from('contracts')
      .select('employee_id')
      .in('employee_id', employeeIds)
      .in('status', ['active', 'signed'])
      .eq('schedule_regime', 'excluded_art22')

    const art22EmployeeIds = new Set((art22Contracts || []).map((c: any) => c.employee_id))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const pact of pactsData) {
      if (!pact.employees) continue

      const employee = Array.isArray(pact.employees) ? pact.employees[0] : pact.employees
      if (!employee) continue

      // Excluir trabajadores con regimen Art. 22 inc. 2
      if (art22EmployeeIds.has(employee.id)) continue

      const fechaVencimiento = new Date(pact.end_date)
      fechaVencimiento.setHours(0, 0, 0, 0)

      const diasRestantes = Math.ceil((fechaVencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Solo notificar si vence en 30 días o menos, o ya está vencido
      if (diasRestantes > 30) continue

      const { alertType, priority, message, legalReference } = calculateOvertimeAlertType(
        diasRestantes,
        pact.status
      )

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

    const allNotifications = [...noPactNotifications, ...notifications]

    allNotifications.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.alertType === 'no_pact' && b.alertType !== 'no_pact') return -1
      if (b.alertType === 'no_pact' && a.alertType !== 'no_pact') return 1
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

export function getOvertimeNotificationCounts(notifications: OvertimeNotification[]): OvertimeNotificationCounts {
  return {
    total: notifications.length,
    critical: notifications.filter(n => n.priority === 1).length,
    high: notifications.filter(n => n.priority === 2).length,
    medium: notifications.filter(n => n.priority === 3).length
  }
}

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