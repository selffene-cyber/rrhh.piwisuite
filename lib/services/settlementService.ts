/**
 * Servicio para gestionar finiquitos
 * Interfaz con la base de datos para operaciones CRUD de finiquitos
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { calculateSettlement, createCalculationSnapshot, SettlementCalculationInput, SettlementCalculationResult } from './settlementCalculator'
import { getVacationSummary } from './vacationPeriods'
import { formatDateLegal } from '@/lib/utils/contractText'

// Tipos temporales hasta que se actualice types/database.ts
type Settlement = any
type SettlementInsert = any
type SettlementItem = any
type SettlementCause = any

export interface SettlementWithDetails extends Settlement {
  employee?: {
    id: string
    full_name: string
    rut: string
    position?: string
  }
  cause?: SettlementCause
  items?: SettlementItem[]
  contract?: {
    id: string
    start_date: string
    base_salary: number
    position?: string
  }
}

export interface EmployeeSettlementData {
  employee_id: string
  company_id: string
  contract_id?: string
  contract_start_date: Date | string
  last_salary_monthly: number
  worked_days_last_month: number
  vacation_days_pending: number
  loan_balance: number
  advance_balance: number
}

/**
 * Obtiene todas las causales de término
 */
export async function getSettlementCauses(
  supabase: SupabaseClient<Database>
): Promise<SettlementCause[]> {
  const { data, error } = await supabase
    .from('settlement_causes')
    .select('*')
    .order('code', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Obtiene una causal por código
 */
export async function getSettlementCauseByCode(
  code: string,
  supabase: SupabaseClient<Database>
): Promise<SettlementCause | null> {
  const { data, error } = await supabase
    .from('settlement_causes')
    .select('*')
    .eq('code', code)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

/**
 * Obtiene datos del trabajador necesarios para calcular un finiquito
 */
export async function getEmployeeDataForSettlement(
  employeeId: string,
  terminationDate: Date | string,
  supabase: SupabaseClient<Database>
): Promise<EmployeeSettlementData> {
  // 1. Obtener trabajador
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, company_id, hire_date, base_salary')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) {
    throw new Error('Trabajador no encontrado')
  }

  // 2. Obtener contrato activo más reciente
  const { data: activeContract } = await supabase
    .from('contracts')
    .select('id, start_date, base_salary')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Usar datos del contrato activo si existe, sino del empleado
  const contract_start_date = (activeContract as any)?.start_date || (employee as any).hire_date
  const last_salary_monthly = (activeContract as any)?.base_salary || (employee as any).base_salary

  // 3. Calcular días trabajados del último mes
  const termination = typeof terminationDate === 'string' 
    ? new Date(terminationDate + 'T00:00:00')
    : terminationDate

  const lastMonthStart = new Date(termination.getFullYear(), termination.getMonth(), 1)
  const lastMonthEnd = termination
  const worked_days_last_month = Math.ceil((lastMonthEnd.getTime() - lastMonthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // 4. Obtener vacaciones pendientes
  const vacationSummary = await getVacationSummary(employeeId, (employee as any).hire_date)
  const vacation_days_pending = Math.max(0, vacationSummary.totalAvailable)

  // 5. Obtener saldo de préstamos activos
  const { data: activeLoans } = await supabase
    .from('loans')
    .select('remaining_amount')
    .eq('employee_id', employeeId)
    .eq('status', 'active')

  const loan_balance = (activeLoans || []).reduce((sum, loan: any) => sum + ((loan as any).remaining_amount || 0), 0)

  // 6. Obtener saldo de anticipos no descontados
  // Anticipos que estén en estado 'firmado' o 'pagado' pero no 'descontado'
  const { data: pendingAdvances } = await supabase
    .from('advances')
    .select('amount')
    .eq('employee_id', employeeId)
    .in('status', ['firmado', 'pagado'])
    .is('payroll_slip_id', null) // No descontados

  const advance_balance = (pendingAdvances || []).reduce((sum, advance: any) => sum + ((advance as any).amount || 0), 0)

  return {
    employee_id: (employee as any).id,
    company_id: (employee as any).company_id || '',
    contract_id: (activeContract as any)?.id,
    contract_start_date,
    last_salary_monthly,
    worked_days_last_month,
    vacation_days_pending,
    loan_balance,
    advance_balance
  }
}

/**
 * Crea un nuevo finiquito (calcula automáticamente)
 */
export async function createSettlement(
  input: {
    employee_id: string
    termination_date: Date | string
    cause_code: string
    notice_given: boolean
    notice_days?: number
    notes?: string
  },
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<Settlement> {
  // 1. Obtener datos del trabajador
  const employeeData = await getEmployeeDataForSettlement(
    input.employee_id,
    input.termination_date,
    supabase
  )

  // 2. Obtener causal
  const cause = await getSettlementCauseByCode(input.cause_code, supabase)
  if (!cause) {
    throw new Error('Causal no encontrada')
  }

  // 3. Preparar input para cálculo
  const calculationInput: SettlementCalculationInput = {
    contract_start_date: employeeData.contract_start_date,
    termination_date: input.termination_date,
    last_salary_monthly: employeeData.last_salary_monthly,
    worked_days_last_month: employeeData.worked_days_last_month,
    vacation_days_pending: employeeData.vacation_days_pending,
    cause_code: input.cause_code,
    cause: {
      code: cause.code,
      label: cause.label,
      article: cause.article || '',
      has_ias: cause.has_ias || false,
      has_iap: cause.has_iap || false
    },
    notice_given: input.notice_given,
    notice_days: input.notice_days,
    loan_balance: employeeData.loan_balance,
    advance_balance: employeeData.advance_balance
  }

  // 4. Calcular finiquito
  const calculation = calculateSettlement(calculationInput)

  if (calculation.errors.length > 0) {
    throw new Error(`Errores en el cálculo: ${calculation.errors.join(', ')}`)
  }

  // 5. Crear snapshot de cálculo
  const snapshot = createCalculationSnapshot(calculationInput, calculation)

  // 6. Insertar settlement
  const settlementData: SettlementInsert = {
    employee_id: input.employee_id,
    company_id: employeeData.company_id,
    contract_id: employeeData.contract_id || null,
    termination_date: typeof input.termination_date === 'string' 
      ? input.termination_date 
      : input.termination_date.toISOString().split('T')[0],
    cause_code: input.cause_code,
    contract_start_date: typeof employeeData.contract_start_date === 'string'
      ? employeeData.contract_start_date
      : employeeData.contract_start_date.toISOString().split('T')[0],
    last_salary_monthly: employeeData.last_salary_monthly,
    worked_days_last_month: employeeData.worked_days_last_month,
    service_days: calculation.service_time.service_days,
    service_years_raw: calculation.service_time.service_years_raw,
    service_years_effective: calculation.service_time.service_years_effective,
    service_years_capped: calculation.service_time.service_years_capped,
    vacation_days_pending: employeeData.vacation_days_pending,
    notice_given: input.notice_given,
    notice_days: input.notice_days || 0,
    salary_balance: calculation.salary_balance,
    vacation_payout: calculation.vacation_payout,
    ias_amount: calculation.ias_amount,
    iap_amount: calculation.iap_amount,
    total_earnings: calculation.total_earnings,
    loan_balance: calculation.loan_balance,
    advance_balance: calculation.advance_balance,
    total_deductions: calculation.total_deductions,
    net_to_pay: calculation.net_to_pay,
    status: 'draft',
    calculation_version: 1,
    calculation_snapshot: snapshot,
    calculation_log: [],
    created_by: userId,
    notes: input.notes || null
  }

  const { data: settlement, error: settlementError } = await (supabase as any)
    .from('settlements')
    .insert(settlementData)
    .select()
    .single()

  if (settlementError) throw settlementError

  // 7. Crear items detallados
  const items: any[] = []

  // Haberes
  if (calculation.salary_balance > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'earning',
      category: 'salary_balance',
      description: 'Saldo de sueldo proporcional',
      amount: calculation.salary_balance
    })
  }

  if (calculation.vacation_payout > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'earning',
      category: 'vacation',
      description: `Pago de vacaciones pendientes (${employeeData.vacation_days_pending} días)`,
      amount: calculation.vacation_payout,
      metadata: { vacation_days: employeeData.vacation_days_pending }
    })
  }

  if (calculation.ias_amount > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'earning',
      category: 'ias',
      description: `Indemnización por años de servicio (${calculation.service_time.service_years_capped} años)`,
      amount: calculation.ias_amount,
      metadata: { service_years: calculation.service_time.service_years_capped }
    })
  }

  if (calculation.iap_amount > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'earning',
      category: 'iap',
      description: 'Indemnización por aviso previo',
      amount: calculation.iap_amount,
      metadata: { notice_given: false }
    })
  }

  // Descuentos
  if (calculation.loan_balance > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'deduction',
      category: 'loan',
      description: 'Descuento por préstamos pendientes',
      amount: calculation.loan_balance
    })
  }

  if (calculation.advance_balance > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'deduction',
      category: 'advance',
      description: 'Descuento por anticipos pendientes',
      amount: calculation.advance_balance
    })
  }

  // Insertar items
  if (items.length > 0) {
    const { error: itemsError } = await (supabase as any)
      .from('settlement_items')
      .insert(items)

    if (itemsError) throw itemsError
  }

  return settlement
}

/**
 * Obtiene un finiquito con todos sus detalles
 */
export async function getSettlement(
  settlementId: string,
  supabase: SupabaseClient<Database>
): Promise<SettlementWithDetails | null> {
  // Obtener settlement
  const { data: settlement, error: settlementError } = await supabase
    .from('settlements')
    .select('*')
    .eq('id', settlementId)
    .single()

  if (settlementError) {
    if (settlementError.code === 'PGRST116') return null
    throw settlementError
  }

  // Obtener items
  const { data: items } = await supabase
    .from('settlement_items')
    .select('*')
    .eq('settlement_id', settlementId)
    .order('type', { ascending: false }) // Haberes primero, luego descuentos
    .order('created_at', { ascending: true })

  // Obtener trabajador
  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, rut, position')
    .eq('id', (settlement as any).employee_id)
    .single()

  // Obtener causal
  const cause = await getSettlementCauseByCode((settlement as any).cause_code, supabase)

  // Obtener contrato si existe
  let contract = null
  if ((settlement as any).contract_id) {
    const { data: contractData } = await supabase
      .from('contracts')
      .select('id, start_date, base_salary, position')
      .eq('id', (settlement as any).contract_id)
      .single()

    contract = contractData
  }

  return {
    ...(settlement as any),
    items: items || [],
    employee: employee || undefined,
    cause: cause || undefined,
    contract: contract || undefined
  }
}

/**
 * Lista finiquitos con filtros
 */
export async function getSettlements(
  filters: {
    company_id?: string
    employee_id?: string
    status?: string
    start_date?: string
    end_date?: string
  },
  supabase: SupabaseClient<Database>
): Promise<Settlement[]> {
  let query = supabase
    .from('settlements')
    .select('*')

  if (filters.company_id) {
    query = query.eq('company_id', filters.company_id)
  }

  if (filters.employee_id) {
    query = query.eq('employee_id', filters.employee_id)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.start_date) {
    query = query.gte('termination_date', filters.start_date)
  }

  if (filters.end_date) {
    query = query.lte('termination_date', filters.end_date)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Recalcula un finiquito existente (incrementa versión)
 */
export async function recalculateSettlement(
  settlementId: string,
  newData: {
    termination_date?: Date | string
    cause_code?: string
    notice_given?: boolean
    notice_days?: number
  },
  userId: string,
  reason: string,
  supabase: SupabaseClient<Database>
): Promise<Settlement> {
  // 1. Obtener settlement actual
  const current = await getSettlement(settlementId, supabase)
  if (!current) {
    throw new Error('Finiquito no encontrado')
  }

  // 2. Obtener datos actualizados del trabajador
  const terminationDate = newData.termination_date || current.termination_date
  const employeeData = await getEmployeeDataForSettlement(
    current.employee_id,
    terminationDate,
    supabase
  )

  // 3. Obtener causal (usar nueva si se especifica)
  const causeCode = newData.cause_code || current.cause_code
  const cause = await getSettlementCauseByCode(causeCode, supabase)
  if (!cause) {
    throw new Error('Causal no encontrada')
  }

  // 4. Preparar input para cálculo
  const calculationInput: SettlementCalculationInput = {
    contract_start_date: current.contract_start_date,
    termination_date: terminationDate,
    last_salary_monthly: employeeData.last_salary_monthly,
    worked_days_last_month: employeeData.worked_days_last_month,
    vacation_days_pending: employeeData.vacation_days_pending,
    cause_code: causeCode,
    cause: {
      code: cause.code,
      label: cause.label,
      article: cause.article || '',
      has_ias: cause.has_ias || false,
      has_iap: cause.has_iap || false
    },
    notice_given: newData.notice_given !== undefined ? newData.notice_given : current.notice_given,
    notice_days: newData.notice_days,
    loan_balance: employeeData.loan_balance,
    advance_balance: employeeData.advance_balance
  }

  // 5. Calcular finiquito
  const calculation = calculateSettlement(calculationInput)

  if (calculation.errors.length > 0) {
    throw new Error(`Errores en el cálculo: ${calculation.errors.join(', ')}`)
  }

  // 6. Crear nuevo snapshot
  const snapshot = createCalculationSnapshot(calculationInput, calculation)

  // 7. Actualizar log de recálculos
  const log = current.calculation_log || []
  const newLogEntry = {
    user_id: userId,
    date: new Date().toISOString(),
    reason,
    previous_version: current.calculation_version,
    changes: newData
  }
  log.push(newLogEntry)

  // 8. Actualizar settlement
  const updateData: any = {
    termination_date: typeof terminationDate === 'string' 
      ? terminationDate 
      : terminationDate.toISOString().split('T')[0],
    cause_code: causeCode,
    last_salary_monthly: employeeData.last_salary_monthly,
    worked_days_last_month: employeeData.worked_days_last_month,
    service_days: calculation.service_time.service_days,
    service_years_raw: calculation.service_time.service_years_raw,
    service_years_effective: calculation.service_time.service_years_effective,
    service_years_capped: calculation.service_time.service_years_capped,
    vacation_days_pending: employeeData.vacation_days_pending,
    notice_given: calculationInput.notice_given,
    notice_days: calculationInput.notice_days || 0,
    salary_balance: calculation.salary_balance,
    vacation_payout: calculation.vacation_payout,
    ias_amount: calculation.ias_amount,
    iap_amount: calculation.iap_amount,
    total_earnings: calculation.total_earnings,
    loan_balance: calculation.loan_balance,
    advance_balance: calculation.advance_balance,
    total_deductions: calculation.total_deductions,
    net_to_pay: calculation.net_to_pay,
    calculation_version: current.calculation_version + 1,
    calculation_snapshot: snapshot,
    calculation_log: log
  }

  const { data: updated, error: updateError } = await (supabase as any)
    .from('settlements')
    .update(updateData)
    .eq('id', settlementId)
    .select()
    .single()

  if (updateError) throw updateError

  // 9. Eliminar items antiguos y crear nuevos
  await supabase
    .from('settlement_items')
    .delete()
    .eq('settlement_id', settlementId)

  // Crear nuevos items (mismo código que en createSettlement)
  const items: any[] = []

  if (calculation.salary_balance > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'earning',
      category: 'salary_balance',
      description: 'Saldo de sueldo proporcional',
      amount: calculation.salary_balance
    })
  }

  if (calculation.vacation_payout > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'earning',
      category: 'vacation',
      description: `Pago de vacaciones pendientes (${employeeData.vacation_days_pending} días)`,
      amount: calculation.vacation_payout,
      metadata: { vacation_days: employeeData.vacation_days_pending }
    })
  }

  if (calculation.ias_amount > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'earning',
      category: 'ias',
      description: `Indemnización por años de servicio (${calculation.service_time.service_years_capped} años)`,
      amount: calculation.ias_amount,
      metadata: { service_years: calculation.service_time.service_years_capped }
    })
  }

  if (calculation.iap_amount > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'earning',
      category: 'iap',
      description: 'Indemnización por aviso previo',
      amount: calculation.iap_amount,
      metadata: { notice_given: false }
    })
  }

  if (calculation.loan_balance > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'deduction',
      category: 'loan',
      description: 'Descuento por préstamos pendientes',
      amount: calculation.loan_balance
    })
  }

  if (calculation.advance_balance > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'deduction',
      category: 'advance',
      description: 'Descuento por anticipos pendientes',
      amount: calculation.advance_balance
    })
  }

  if (items.length > 0) {
    const { error: itemsError } = await (supabase as any)
      .from('settlement_items')
      .insert(items)

    if (itemsError) throw itemsError
  }

  return updated
}

/**
 * Actualiza el estado de un finiquito
 */
export async function updateSettlementStatus(
  settlementId: string,
  status: 'draft' | 'under_review' | 'approved' | 'signed' | 'paid' | 'void',
  userId: string,
  supabase: SupabaseClient<Database>,
  options?: {
    void_reason?: string
    notes?: string
  }
): Promise<Settlement> {
  // Obtener el finiquito para acceder al employee_id
  const { data: settlement, error: settlementError } = await (supabase as any)
    .from('settlements')
    .select('employee_id, contract_id')
    .eq('id', settlementId)
    .single()

  if (settlementError) throw settlementError

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  }

  // Agregar fechas según estado
  if (status === 'under_review') {
    updateData.reviewed_at = new Date().toISOString()
    updateData.reviewed_by = userId
  } else if (status === 'approved') {
    updateData.approved_at = new Date().toISOString()
    updateData.approved_by = userId

    // Si se aprueba el finiquito y hay un contrato activo, cambiar estado del trabajador a "despido"
    if (settlement.contract_id) {
      // Verificar si el contrato sigue activo
      const { data: contractData } = await supabase
        .from('contracts')
        .select('status')
        .eq('id', settlement.contract_id)
        .maybeSingle()

      const contract = contractData as any
      if (contract && contract.status === 'active') {
        // Cambiar estado del trabajador a "despido"
        const { error: employeeUpdateError } = await (supabase
          .from('employees') as any)
          .update({ status: 'despido' })
          .eq('id', settlement.employee_id)

        if (employeeUpdateError) {
          console.error('Error al actualizar estado del trabajador:', employeeUpdateError)
          // No lanzar error, solo loguear, para no bloquear la aprobación del finiquito
        }
      }
    } else {
      // Si no hay contract_id pero el finiquito se aprueba, cambiar estado a "despido"
      const { error: employeeUpdateError } = await (supabase
        .from('employees') as any)
        .update({ status: 'despido' })
        .eq('id', settlement.employee_id)

      if (employeeUpdateError) {
        console.error('Error al actualizar estado del trabajador:', employeeUpdateError)
      }
    }
  } else if (status === 'signed') {
    updateData.signed_at = new Date().toISOString()
  } else if (status === 'paid') {
    updateData.paid_at = new Date().toISOString()
  } else if (status === 'void') {
    updateData.voided_at = new Date().toISOString()
    if (options?.void_reason) {
      updateData.void_reason = options.void_reason
    }
  }

  if (options?.notes) {
    updateData.notes = options.notes
  }

  const { data, error } = await (supabase as any)
    .from('settlements')
    .update(updateData)
    .eq('id', settlementId)
    .select()
    .single()

  if (error) throw error
  return data
}

