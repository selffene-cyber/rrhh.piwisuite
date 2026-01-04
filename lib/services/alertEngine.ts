/**
 * Alert Engine - Genera y actualiza alertas automáticamente
 */

import { getCachedIndicators } from './indicatorsCache'

export type AlertSeverity = 'critical' | 'high' | 'info'
export type AlertType = 
  | 'contract_expiry'
  | 'vacation_balance'
  | 'legal_params_missing'
  | 'min_wage_risk'
  | 'ot_pending_approval'
  | 'sick_leave_active'
  | 'scheduled_raise'
  | 'overtime_pact_expiring'

export type AlertEntityType = 'employee' | 'payroll_period' | 'company'
export type AlertStatus = 'open' | 'dismissed' | 'resolved'

interface AlertMetadata {
  employeeName?: string
  rut?: string
  daysRemaining?: number
  period?: string
  [key: string]: any
}

interface AlertInput {
  company_id: string
  severity: AlertSeverity
  type: AlertType
  title: string
  message: string
  entity_type?: AlertEntityType
  entity_id?: string
  due_date?: Date | string
  metadata?: AlertMetadata
}

/**
 * Crea o actualiza una alerta (idempotente)
 * Evita duplicados basándose en type + entity_type + entity_id + due_date
 */
async function upsertAlert(alert: AlertInput, supabase: any): Promise<void> {
  // Buscar alerta existente con los mismos criterios
  let query = supabase
    .from('alerts')
    .select('id, status')
    .eq('company_id', alert.company_id)
    .eq('type', alert.type)
    .eq('entity_type', alert.entity_type || null)
    .eq('entity_id', alert.entity_id || null)
  
  // Si hay due_date, incluirlo en la búsqueda
  if (alert.due_date) {
    const dueDateStr = new Date(alert.due_date).toISOString().split('T')[0]
    query = query.eq('due_date', dueDateStr)
  } else {
    query = query.is('due_date', null)
  }
  
  const { data: existing } = await query.maybeSingle()

  const alertData = {
    company_id: alert.company_id,
    severity: alert.severity,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    entity_type: alert.entity_type || null,
    entity_id: alert.entity_id || null,
    due_date: alert.due_date ? new Date(alert.due_date).toISOString().split('T')[0] : null,
    metadata: alert.metadata || {},
    status: 'open' as AlertStatus,
    updated_at: new Date().toISOString()
  }

  if (existing) {
    // Si existe y está abierta, solo actualizar si cambió algo importante
    if (existing.status === 'open') {
      await supabase
        .from('alerts')
        .update({
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: alert.metadata || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    }
    // Si está resuelta o descartada, no hacer nada (no reactivar)
  } else {
    // Crear nueva alerta solo si no existe
    await supabase
      .from('alerts')
      .insert(alertData)
  }
}

/**
 * Resuelve alertas que ya no aplican
 */
async function resolveAlerts(
  company_id: string,
  type: AlertType,
  condition: (alert: any) => boolean | Promise<boolean>,
  supabase: any
): Promise<void> {
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('company_id', company_id)
    .eq('type', type)
    .eq('status', 'open')

  if (!alerts) return

  for (const alert of alerts) {
    const shouldResolve = await condition(alert)
    if (!shouldResolve) {
      await supabase
        .from('alerts')
        .update({ status: 'resolved' })
        .eq('id', alert.id)
    }
  }
}

/**
 * Regla 1: Contract Expiry (plazo fijo)
 */
async function checkContractExpiry(company_id: string, supabase: any): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, rut, contract_type, contract_end_date')
    .eq('company_id', company_id)
    .eq('status', 'active')
    .eq('contract_type', 'plazo_fijo')
    .not('contract_end_date', 'is', null)

  if (!employees) return

  for (const emp of employees) {
    if (!emp.contract_end_date) continue

    const endDate = new Date(emp.contract_end_date)
    endDate.setHours(0, 0, 0, 0)
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 30 && daysRemaining > 0) {
      const severity: AlertSeverity = daysRemaining <= 10 ? 'critical' : 'high'
      
      await upsertAlert({
        company_id,
        severity,
        type: 'contract_expiry',
        title: `Contrato próximo a vencer`,
        message: `A ${emp.full_name} le quedan ${daysRemaining} días para vencimiento de contrato (vence ${endDate.toLocaleDateString('es-CL')}).`,
        entity_type: 'employee',
        entity_id: emp.id,
        due_date: endDate,
        metadata: {
          employeeName: emp.full_name,
          rut: emp.rut,
          daysRemaining
        }
      }, supabase)
    }
  }

  // Resolver alertas de contratos que ya vencieron o se renovaron
  await resolveAlerts(company_id, 'contract_expiry', (alert) => {
    if (!alert.due_date) return false
    const endDate = new Date(alert.due_date)
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysRemaining <= 30 && daysRemaining > 0
  }, supabase)
}

/**
 * Regla 2: Vacaciones con saldo alto
 */
async function checkVacationBalance(company_id: string, supabase: any): Promise<void> {
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, rut, hire_date')
    .eq('company_id', company_id)
    .eq('status', 'active')

  if (!employees) return

  for (const emp of employees) {
    // Calcular vacaciones acumuladas (1.25 días por mes trabajado)
    const hireDate = new Date(emp.hire_date)
    const today = new Date()
    const monthsWorked = (today.getFullYear() - hireDate.getFullYear()) * 12 + 
                         (today.getMonth() - hireDate.getMonth())
    const accumulated = monthsWorked * 1.25

    // Calcular vacaciones usadas
    const { data: vacations } = await supabase
      .from('vacations')
      .select('days_count')
      .eq('employee_id', emp.id)
      .in('status', ['aprobada', 'tomada'])

    const used = vacations?.reduce((sum: number, v: any) => sum + (v.days_count || 0), 0) || 0
    const balance = accumulated - used

    if (balance >= 30) {
      await upsertAlert({
        company_id,
        severity: 'critical',
        type: 'vacation_balance',
        title: `Saldo alto de vacaciones`,
        message: `${emp.full_name} tiene ${Math.round(balance)} días hábiles disponibles. Recomendar planificación.`,
        entity_type: 'employee',
        entity_id: emp.id,
        metadata: {
          employeeName: emp.full_name,
          rut: emp.rut,
          daysRemaining: Math.round(balance)
        }
      }, supabase)
    } else if (balance >= 20) {
      await upsertAlert({
        company_id,
        severity: 'high',
        type: 'vacation_balance',
        title: `Saldo alto de vacaciones`,
        message: `${emp.full_name} tiene ${Math.round(balance)} días hábiles disponibles. Recomendar planificación.`,
        entity_type: 'employee',
        entity_id: emp.id,
        metadata: {
          employeeName: emp.full_name,
          rut: emp.rut,
          daysRemaining: Math.round(balance)
        }
      }, supabase)
    }
  }

  // Resolver alertas cuando el saldo baja
  await resolveAlerts(company_id, 'vacation_balance', async (alert) => {
    if (!alert.entity_id) return false
    const { data: emp } = await supabase
      .from('employees')
      .select('hire_date')
      .eq('id', alert.entity_id)
      .single()
    
    if (!emp) return false

    const hireDate = new Date(emp.hire_date)
    const today = new Date()
    const monthsWorked = (today.getFullYear() - hireDate.getFullYear()) * 12 + 
                         (today.getMonth() - hireDate.getMonth())
    const accumulated = monthsWorked * 1.25

    const { data: vacations } = await supabase
      .from('vacations')
      .select('days_count')
      .eq('employee_id', alert.entity_id)
      .in('status', ['aprobada', 'tomada'])

    const used = vacations?.reduce((sum: number, v: any) => sum + (v.days_count || 0), 0) || 0
    const balance = accumulated - used

    return balance >= 20
  }, supabase)
}

/**
 * Regla 3: Parámetros legales del periodo
 */
async function checkLegalParams(company_id: string, supabase: any): Promise<void> {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  
  // Verificar mes actual y siguiente
  for (let offset = 0; offset <= 1; offset++) {
    let month = currentMonth + offset
    let year = currentYear
    if (month > 12) {
      month = 1
      year++
    }

    const { data: indicators } = await supabase
      .from('previred_indicators')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single()

    if (!indicators || !indicators.uf_value || !indicators.utm_value) {
      const period = `${year}-${String(month).padStart(2, '0')}`
      await upsertAlert({
        company_id,
        severity: 'critical',
        type: 'legal_params_missing',
        title: `Faltan parámetros legales`,
        message: `Faltan parámetros legales del periodo ${period} (UTM/UF/topes/tabla impuesto).`,
        entity_type: 'payroll_period',
        metadata: {
          period,
          year,
          month
        }
      }, supabase)
    }
  }

  // Resolver alertas cuando se cargan los parámetros
  await resolveAlerts(company_id, 'legal_params_missing', async (alert) => {
    const period = alert.metadata?.period
    if (!period) return false
    
    const [year, month] = period.split('-').map(Number)
    const { data: indicators } = await supabase
      .from('previred_indicators')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single()

    return !indicators || !indicators.uf_value || !indicators.utm_value
  }, supabase)
}

/**
 * Regla 4: Pactos de horas extra por vencer
 */
async function checkOvertimePactsExpiring(company_id: string, supabase: any): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in15Days = new Date(today)
  in15Days.setDate(today.getDate() + 15)

  // Obtener empleados de la empresa
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', company_id)

  if (!employees || employees.length === 0) return

  const employeeIds = employees.map((emp: { id: string }) => emp.id)

  // Obtener pactos activos que vencen en los próximos 15 días
  const { data: pacts } = await supabase
    .from('overtime_pacts')
    .select(`
      id,
      employee_id,
      end_date,
      employees!inner(id, full_name, rut, company_id)
    `)
    .in('employee_id', employeeIds)
    .eq('status', 'active')
    .gte('end_date', today.toISOString().split('T')[0])
    .lte('end_date', in15Days.toISOString().split('T')[0])

  if (!pacts) return

  for (const pact of pacts) {
    const employee = (pact as any).employees
    if (!employee) continue

    const endDate = new Date(pact.end_date)
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const severity: AlertSeverity = daysRemaining <= 7 ? 'critical' : 'high'

    await upsertAlert({
      company_id,
      severity,
      type: 'overtime_pact_expiring',
      title: `Pacto de horas extra por vencer`,
      message: `El pacto de horas extra de ${employee.full_name} vence en ${daysRemaining} día(s) (${endDate.toLocaleDateString('es-CL')}). Debe renovarse o crear uno nuevo para continuar registrando horas extra.`,
      entity_type: 'employee',
      entity_id: employee.id,
      due_date: endDate,
      metadata: {
        employeeName: employee.full_name,
        rut: employee.rut,
        daysRemaining,
        pactId: pact.id
      }
    }, supabase)
  }

  // Resolver alertas de pactos que ya vencieron o se renovaron
  await resolveAlerts(company_id, 'overtime_pact_expiring', async (alert) => {
    if (!alert.due_date) return false
    const endDate = new Date(alert.due_date)
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    // Verificar si el pacto sigue activo
    if (alert.metadata?.pactId) {
      const { data: pact } = await supabase
        .from('overtime_pacts')
        .select('status')
        .eq('id', alert.metadata.pactId)
        .single()
      
      if (!pact || pact.status !== 'active') return false
    }
    
    return daysRemaining <= 15 && daysRemaining > 0
  }, supabase)
}

/**
 * Regla 5: Licencias activas (informativa)
 */
async function checkActiveLeaves(company_id: string, supabase: any): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: leaves } = await supabase
    .from('medical_leaves')
    .select(`
      id,
      employee_id,
      start_date,
      end_date,
      employees!inner(id, full_name, rut, company_id)
    `)
    .eq('is_active', true)
    .eq('employees.company_id', company_id)
    .lte('start_date', today.toISOString().split('T')[0])
    .gte('end_date', today.toISOString().split('T')[0])

  if (!leaves) return

  for (const leave of leaves) {
    const employee = (leave as any).employees
    if (!employee) continue

    await upsertAlert({
      company_id,
      severity: 'info',
      type: 'sick_leave_active',
      title: `Licencia médica activa`,
      message: `${employee.full_name} tiene licencia activa hasta ${new Date(leave.end_date).toLocaleDateString('es-CL')}. Liquidación será proporcional; no incluir subsidio en haberes.`,
      entity_type: 'employee',
      entity_id: employee.id,
      due_date: leave.end_date,
      metadata: {
        employeeName: employee.full_name,
        rut: employee.rut,
        leaveId: leave.id
      }
    }, supabase)
  }

  // Resolver alertas cuando la licencia termina
  await resolveAlerts(company_id, 'sick_leave_active', async (alert) => {
    if (!alert.due_date) return false
    const endDate = new Date(alert.due_date)
    return endDate >= today
  }, supabase)
}

/**
 * Ejecuta todas las reglas de alertas para una empresa
 */
export async function runAlertEngine(company_id: string, supabaseClient: any): Promise<{ created: number; resolved: number }> {
  try {
    const beforeCount = await supabaseClient
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('status', 'open')

    await Promise.all([
      checkContractExpiry(company_id, supabaseClient),
      checkVacationBalance(company_id, supabaseClient),
      checkLegalParams(company_id, supabaseClient),
      checkActiveLeaves(company_id, supabaseClient),
      checkOvertimePactsExpiring(company_id, supabaseClient)
    ])

    const afterCount = await supabaseClient
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('status', 'open')

    return {
      created: (afterCount.count || 0) - (beforeCount.count || 0),
      resolved: 0 // Se calcula en cada función resolveAlerts
    }
  } catch (error) {
    console.error('Error en Alert Engine:', error)
    throw error
  }
}
