/**
 * Servicio para gestionar finiquitos
 * Interfaz con la base de datos para operaciones CRUD de finiquitos
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { calculateSettlement, createCalculationSnapshot, SettlementCalculationInput, SettlementCalculationResult } from './settlementCalculator'
import { getVacationSummary } from './vacationPeriods'
import { formatDateLegal } from '@/lib/utils/contractText'
import { getCachedIndicators } from './indicatorsCache'
import { getSettlementRule, evaluateSettlementRule, SettlementRuleConfig } from './settlementRulesEngine'

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
  bonuses: Array<{ name: string; amount: number }>
  transportation: number
  meal_allowance: number
  worked_days_last_month: number
  vacation_days_pending: number
  loan_balance: number
  advance_balance: number
  previsional_regime: 'AFP' | 'OTRO_REGIMEN'
  afp?: string | null
  health_system?: string | null
  health_plan_percentage?: number
  contract_type?: string
  afc_applicable?: boolean
  manual_pension_rate?: number | null
  manual_health_rate?: number | null
  manual_base_type?: 'imponible' | 'sueldo_base' | null
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
    .select('id, company_id, hire_date, base_salary, transportation, meal_allowance, previsional_regime, afp, health_system, health_plan_percentage, afc_applicable, manual_pension_rate, manual_health_rate, manual_base_type')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) {
    throw new Error('Trabajador no encontrado')
  }

  // 2. Obtener contrato activo más reciente
  const { data: activeContract } = await supabase
    .from('contracts')
    .select('id, start_date, base_salary, other_allowances, transportation, meal_allowance, contract_type')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Usar datos del contrato activo si existe, sino del empleado
  const contract_start_date = (activeContract as any)?.start_date || (employee as any).hire_date
  const last_salary_monthly = (activeContract as any)?.base_salary || (employee as any).base_salary

  // Parsear bonos del contrato (other_allowances format: "Bono Nombre: $Monto; Otro Bono: $Monto")
  const bonuses: Array<{ name: string; amount: number }> = []
  if ((activeContract as any)?.other_allowances) {
    const bonusStrings = (activeContract as any).other_allowances.split(';').map((b: string) => b.trim()).filter((b: string) => b)
    for (const bonusStr of bonusStrings) {
      const match = bonusStr.match(/^(.+?):\s*\$\s*(.+)$/)
      if (match) {
        const bonusName = match[1].trim()
        const bonusAmount = parseFloat(match[2].trim().replace(/\./g, '').replace(',', '.')) || 0
        if (bonusName && bonusAmount > 0) {
          bonuses.push({ name: bonusName, amount: bonusAmount })
        }
      }
    }
  }

  // Movilización y colación del contrato (o fallback a ficha del empleado)
  const contractTransportation = (activeContract as any)?.transportation || 0
  const contractMealAllowance = (activeContract as any)?.meal_allowance || 0
  // Si el contrato tiene valores > 0, usar los del contrato; si no, usar los del empleado
  const transportation = contractTransportation > 0 ? contractTransportation : ((employee as any).transportation || 0)
  const meal_allowance = contractMealAllowance > 0 ? contractMealAllowance : ((employee as any).meal_allowance || 0)

  // 3. Calcular días trabajados del último mes
  const termination = typeof terminationDate === 'string' 
    ? new Date(terminationDate + 'T00:00:00')
    : terminationDate

  const start = typeof (employee as any).hire_date === 'string'
    ? new Date(((employee as any).hire_date) + 'T00:00:00')
    : new Date((employee as any).hire_date)

  const lastMonthStart = new Date(termination.getFullYear(), termination.getMonth(), 1)
  const effectiveStart = start > lastMonthStart ? start : lastMonthStart
  const worked_days_last_month = Math.max(1, Math.ceil((termination.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)

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
    bonuses,
    transportation,
    meal_allowance,
    worked_days_last_month,
    vacation_days_pending,
    loan_balance,
    advance_balance,
    previsional_regime: (employee as any).previsional_regime || 'AFP',
    afp: (employee as any).afp,
    health_system: (employee as any).health_system,
    health_plan_percentage: (employee as any).health_plan_percentage,
    contract_type: (activeContract as any)?.contract_type,
    afc_applicable: (employee as any).afc_applicable !== false,
    manual_pension_rate: (employee as any).manual_pension_rate,
    manual_health_rate: (employee as any).manual_health_rate,
    manual_base_type: (employee as any).manual_base_type,
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
    voluntary_indemnity?: number
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

  // 2b. Obtener indicadores previred del mes anterior al término
  const terminationDate = typeof input.termination_date === 'string'
    ? new Date(input.termination_date + 'T00:00:00')
    : input.termination_date
  const termYear = terminationDate.getFullYear()
  const termMonth = terminationDate.getMonth() + 1
  let indicators = null
  try {
    const prevMonthDate = new Date(termYear, termMonth - 2, 1)
    indicators = await getCachedIndicators(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1)
  } catch (e) {
    console.warn('No se pudieron obtener indicadores previred para finiquito:', e)
  }

  // 2c. Obtener indicadores del mes de término para gratificación
  let gratificationIndicators = null
  try {
    gratificationIndicators = await getCachedIndicators(termYear, termMonth)
  } catch (e) {
    gratificationIndicators = indicators
  }
  const indicatorsToUse = gratificationIndicators || indicators

  // 3. Preparar input para cálculo
  const calculationInput: SettlementCalculationInput = {
    contract_start_date: employeeData.contract_start_date,
    termination_date: input.termination_date,
    last_salary_monthly: employeeData.last_salary_monthly,
    worked_days_last_month: employeeData.worked_days_last_month,
    bonuses: employeeData.bonuses || [],
    transportation: employeeData.transportation || 0,
    meal_allowance: employeeData.meal_allowance || 0,
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
    previsional_regime: employeeData.previsional_regime || 'AFP',
    afp: employeeData.afp,
    health_system: employeeData.health_system,
    health_plan_percentage: employeeData.health_plan_percentage,
    contract_type: employeeData.contract_type,
    afc_applicable: employeeData.afc_applicable,
    manual_pension_rate: employeeData.manual_pension_rate,
    manual_health_rate: employeeData.manual_health_rate,
    manual_base_type: employeeData.manual_base_type,
    indicators: indicatorsToUse,
    termination_year: termYear,
    termination_month: termMonth,
    loan_balance: employeeData.loan_balance,
    advance_balance: employeeData.advance_balance,
    voluntary_indemnity: input.voluntary_indemnity ?? 0
  }

  // 4. Calcular finiquito
  const calculation = await calculateSettlement(calculationInput, supabase)

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
    vacation_days_proportional: calculation.vacation_calc?.vacation_days_proportional ?? 0,
    vacation_proportional_payout: calculation.vacation_proportional_payout ?? 0,
    feriado_progresivo_days: calculation.vacation_calc?.feriado_progresivo_days ?? 0,
    feriado_progresivo_payout: calculation.feriado_progresivo_payout ?? 0,
    semana_corrida_payout: calculation.semana_corrida_payout ?? 0,
    notice_given: input.notice_given,
    notice_days: input.notice_days || 0,
    salary_balance: calculation.salary_balance,
    gratification: calculation.gratification,
    bonuses_payout: calculation.bonuses_payout,
    taxable_earnings_total: calculation.taxable_earnings_total,
    transportation_payout: calculation.transportation_payout,
    meal_allowance_payout: calculation.meal_allowance_payout,
    non_taxable_earnings_total: calculation.non_taxable_earnings_total,
    vacation_payout: calculation.vacation_payout,
    ias_amount: calculation.ias_amount,
    iap_amount: calculation.iap_amount,
    voluntary_indemnity: calculation.voluntary_indemnity ?? 0,
    total_earnings: calculation.total_earnings,
    afp_total: calculation.afp_total,
    afp_10: calculation.afp_10,
    afp_additional: calculation.afp_additional,
    health_total: calculation.health_total,
    unemployment_insurance: calculation.unemployment_insurance,
    legal_deductions_total: calculation.legal_deductions_total,
    taxable_base_for_tax: calculation.taxable_base_for_tax,
    unique_tax: calculation.unique_tax,
    loan_balance: calculation.loan_balance,
    advance_balance: calculation.advance_balance,
    other_deductions: calculation.other_deductions ?? 0,
    other_deductions_total: calculation.other_deductions_total,
    total_deductions: calculation.total_deductions,
    net_to_pay: calculation.net_to_pay,
    employer_sis: calculation.employer_sis,
    employer_sis_rate: calculation.employer_sis_rate,
    employer_afp_account: calculation.employer_afp_account,
    employer_afp_account_rate: calculation.employer_afp_account_rate,
    employer_crp: calculation.employer_crp,
    employer_crp_rate: calculation.employer_crp_rate,
    employer_afc: calculation.employer_afc,
    employer_afc_rate: calculation.employer_afc_rate,
    employer_total: calculation.employer_total,
    legal_clauses: calculation.legal_clauses ?? [],
    rule_evaluation: calculation.rule_evaluation ?? null,
    rule_config_snapshot: calculation.rule_evaluation?.ruleConfig ?? null,
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

  // 7. Crear items detallados usando el motor de reglas
  const ruleEvaluation = calculation.rule_evaluation
  const items: any[] = []

  // Funcion helper para crear items solo si el concepto aplica segun la regla
  const addEarningItem = (category: string, description: string, amount: number, applies: boolean, metadata?: any) => {
    if (amount > 0 && applies) {
      items.push({
        settlement_id: (settlement as any).id,
        type: 'earning',
        category,
        description,
        amount,
        ...(metadata ? { metadata } : {})
      })
    }
  }

  const addDeductionItem = (category: string, description: string, amount: number, applies: boolean, metadata?: any) => {
    if (amount > 0 && applies) {
      items.push({
        settlement_id: (settlement as any).id,
        type: 'deduction',
        category,
        description,
        amount,
        ...(metadata ? { metadata } : {})
      })
    }
  }

  const conceptos = ruleEvaluation?.conceptos

  // Haberes imponibles
  addEarningItem('salary_balance', 'Saldo de sueldo proporcional', calculation.salary_balance, conceptos?.saldoSueldo?.aplica ?? true)
  addEarningItem('gratification', 'Gratificacion proporcional', calculation.gratification, conceptos?.gratificacionProporcional?.aplica ?? true)

  if (calculation.bonus_details && calculation.bonus_details.length > 0) {
    for (const bonus of calculation.bonus_details) {
      if (bonus.amount > 0 && (conceptos?.bonosProporcionales?.aplica ?? true)) {
        items.push({
          settlement_id: (settlement as any).id,
          type: 'earning',
          category: 'bonus',
          description: `${bonus.name} proporcional`,
          amount: bonus.amount,
          metadata: { bonus_name: bonus.name }
        })
      }
    }
  }

  // Haberes no imponibles
  addEarningItem('transportation', `Movilizacion proporcional (${employeeData.worked_days_last_month} dias)`, calculation.transportation_payout, conceptos?.movilizacion?.aplica ?? true, { days: employeeData.worked_days_last_month })
  addEarningItem('meal_allowance', `Colacion proporcional (${employeeData.worked_days_last_month} dias)`, calculation.meal_allowance_payout, conceptos?.colacion?.aplica ?? true, { days: employeeData.worked_days_last_month })

  if (calculation.semana_corrida_payout > 0 && (conceptos?.semanaCorrida?.aplica ?? false)) {
    addEarningItem('semana_corrida', 'Semana corrida proporcional (remuneracion variable)', calculation.semana_corrida_payout, true)
  }

  // Vacaciones
  addEarningItem('vacation', `Pago de vacaciones pendientes (${employeeData.vacation_days_pending} dias)`, calculation.vacation_payout, conceptos?.vacacionesPendientes?.aplica ?? true, { vacation_days: employeeData.vacation_days_pending })

  if (calculation.vacation_proportional_payout > 0 && (conceptos?.vacacionesProporcionales?.aplica ?? true)) {
    addEarningItem('vacation_proportional', `Pago de vacaciones proporcionales (${(calculation.vacation_calc?.vacation_days_proportional ?? 0).toFixed(2)} dias)`, calculation.vacation_proportional_payout, true, { vacation_days_proportional: calculation.vacation_calc?.vacation_days_proportional ?? 0 })
  }

  if (calculation.feriado_progresivo_payout > 0 && (conceptos?.feriadoProgresivo?.aplica ?? false)) {
    addEarningItem('feriado_progresivo', `Feriado progresivo (${calculation.vacation_calc?.feriado_progresivo_days ?? 0} dias)`, calculation.feriado_progresivo_payout, true)
  }

  // Indemnizaciones
  addEarningItem('ias', `Indemnizacion por anos de servicio (${calculation.service_time.service_years_capped} anos)`, calculation.ias_amount, conceptos?.ias?.aplica ?? true, { service_years: calculation.service_time.service_years_capped })
  addEarningItem('iap', 'Indemnizacion sustitutiva del aviso previo', calculation.iap_amount, conceptos?.iap?.aplica ?? true, { notice_given: input.notice_given })

  if (calculation.voluntary_indemnity > 0 && (conceptos?.indemnizacionVoluntaria?.aplica ?? true)) {
    addEarningItem('voluntary_indemnity', 'Indemnizacion voluntaria (ex gratia)', calculation.voluntary_indemnity, true, { voluntary: true })
  }

  // Descuentos legales
  addDeductionItem('afp', `AFP${employeeData.afp ? ` (${employeeData.afp})` : ''}`, calculation.afp_total, conceptos?.descuentoAFP?.aplica ?? true, { afp_10: calculation.afp_10, afp_additional: calculation.afp_additional })
  addDeductionItem('health', employeeData.health_system === 'ISAPRE' ? 'ISAPRE' : 'FONASA 7%', calculation.health_total, conceptos?.descuentoSalud?.aplica ?? true)
  addDeductionItem('unemployment_insurance', 'Seguro de cesantia (AFC)', calculation.unemployment_insurance, conceptos?.descuentoAFC?.aplica ?? true)
  addDeductionItem('unique_tax', 'Impuesto unico a la renta', calculation.unique_tax, conceptos?.descuentoImpuestoUnico?.aplica ?? true)

  // Otros descuentos
  addDeductionItem('loan', 'Descuento por prestamos pendientes', calculation.loan_balance, conceptos?.descuentoPrestamos?.aplica ?? true)
  addDeductionItem('advance', 'Descuento por anticipos pendientes', calculation.advance_balance, conceptos?.descuentoAnticipos?.aplica ?? true)

  if (calculation.other_deductions > 0 && (conceptos?.descuentoHaberesPendientes?.aplica ?? true)) {
    addDeductionItem('other_deductions', 'Otros descuentos pendientes', calculation.other_deductions, true)
  }

  // Aportes del empleador (motor central previsional)
  if (calculation.employer_sis > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'employer_contribution',
      category: 'sis',
      description: `SIS (${calculation.employer_sis_rate}%)`,
      amount: calculation.employer_sis,
      metadata: { rate: calculation.employer_sis_rate }
    })
  }

  if (calculation.employer_afp_account > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'employer_contribution',
      category: 'afp_account',
      description: `AFP Cuenta Individual Empleador (${calculation.employer_afp_account_rate}%)`,
      amount: calculation.employer_afp_account,
      metadata: { rate: calculation.employer_afp_account_rate }
    })
  }

  if (calculation.employer_crp > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'employer_contribution',
      category: 'crp',
      description: `CRP (${calculation.employer_crp_rate}%)`,
      amount: calculation.employer_crp,
      metadata: { rate: calculation.employer_crp_rate }
    })
  }

  if (calculation.employer_afc > 0) {
    items.push({
      settlement_id: (settlement as any).id,
      type: 'employer_contribution',
      category: 'afc_employer',
      description: 'AFC Empleador',
      amount: calculation.employer_afc,
      metadata: { rate: calculation.employer_afc_rate }
    })
  }

  // Insertar items
  if (items.length > 0) {
    const { error: itemsError } = await (supabase as any)
      .from('settlement_items')
      .insert(items)

    if (itemsError) throw itemsError
  }

  // 8. Guardar auditoria del motor de reglas
  if (ruleEvaluation && ruleEvaluation.auditLog && ruleEvaluation.auditLog.length > 0) {
    try {
      await (supabase as any)
        .from('settlement_rule_audit')
        .insert({
          settlement_id: (settlement as any).id,
          cause_code: input.cause_code,
          rule_config_snapshot: ruleEvaluation.ruleConfig,
          evaluation_result: ruleEvaluation.conceptos,
          warnings: ruleEvaluation.warnings,
          blocked: ruleEvaluation.blocked,
          blocked_reason: ruleEvaluation.blockedReason,
          evaluated_by: userId
        })
    } catch (auditError) {
      console.warn('[settlementService] Error guardando auditoria del motor de reglas:', auditError)
    }
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

  // 3b. Obtener indicadores previred
  const termDate = typeof terminationDate === 'string'
    ? new Date(terminationDate + 'T00:00:00')
    : terminationDate
  const tYear = termDate.getFullYear()
  const tMonth = termDate.getMonth() + 1
  let recalcIndicators = null
  try {
    const prevMonthDate = new Date(tYear, tMonth - 2, 1)
    recalcIndicators = await getCachedIndicators(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1)
  } catch (e) { /* ignore */ }
  let recalcGratIndicators = null
  try {
    recalcGratIndicators = await getCachedIndicators(tYear, tMonth)
  } catch (e) {
    recalcGratIndicators = recalcIndicators
  }
  const recalcIndicatorsToUse = recalcGratIndicators || recalcIndicators

  // 4. Preparar input para cálculo
  const calculationInput: SettlementCalculationInput = {
    contract_start_date: current.contract_start_date,
    termination_date: terminationDate,
    last_salary_monthly: employeeData.last_salary_monthly,
    worked_days_last_month: employeeData.worked_days_last_month,
    bonuses: employeeData.bonuses || [],
    transportation: employeeData.transportation || 0,
    meal_allowance: employeeData.meal_allowance || 0,
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
    previsional_regime: employeeData.previsional_regime || 'AFP',
    afp: employeeData.afp,
    health_system: employeeData.health_system,
    health_plan_percentage: employeeData.health_plan_percentage,
    contract_type: employeeData.contract_type,
    afc_applicable: employeeData.afc_applicable,
    manual_pension_rate: employeeData.manual_pension_rate,
    manual_health_rate: employeeData.manual_health_rate,
    manual_base_type: employeeData.manual_base_type,
    indicators: recalcIndicatorsToUse,
    termination_year: tYear,
    termination_month: tMonth,
    loan_balance: employeeData.loan_balance,
    advance_balance: employeeData.advance_balance,
    voluntary_indemnity: (current as any).voluntary_indemnity ?? 0
  }

  // 5. Calcular finiquito
  const calculation = await calculateSettlement(calculationInput, supabase)

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
    gratification: calculation.gratification,
    bonuses_payout: calculation.bonuses_payout,
    taxable_earnings_total: calculation.taxable_earnings_total,
    transportation_payout: calculation.transportation_payout,
    meal_allowance_payout: calculation.meal_allowance_payout,
    non_taxable_earnings_total: calculation.non_taxable_earnings_total,
    vacation_payout: calculation.vacation_payout,
    ias_amount: calculation.ias_amount,
    iap_amount: calculation.iap_amount,
    total_earnings: calculation.total_earnings,
    afp_total: calculation.afp_total,
    afp_10: calculation.afp_10,
    afp_additional: calculation.afp_additional,
    health_total: calculation.health_total,
    unemployment_insurance: calculation.unemployment_insurance,
    legal_deductions_total: calculation.legal_deductions_total,
    taxable_base_for_tax: calculation.taxable_base_for_tax,
    unique_tax: calculation.unique_tax,
    loan_balance: calculation.loan_balance,
    advance_balance: calculation.advance_balance,
    other_deductions_total: calculation.other_deductions_total,
    total_deductions: calculation.total_deductions,
    net_to_pay: calculation.net_to_pay,
    employer_sis: calculation.employer_sis,
    employer_sis_rate: calculation.employer_sis_rate,
    employer_afp_account: calculation.employer_afp_account,
    employer_afp_account_rate: calculation.employer_afp_account_rate,
    employer_crp: calculation.employer_crp,
    employer_crp_rate: calculation.employer_crp_rate,
    employer_afc: calculation.employer_afc,
    employer_afc_rate: calculation.employer_afc_rate,
    employer_total: calculation.employer_total,
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

  if (calculation.gratification > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'earning',
      category: 'gratification',
      description: 'Gratificación proporcional',
      amount: calculation.gratification
    })
  }

  if (calculation.bonus_details && calculation.bonus_details.length > 0) {
    for (const bonus of calculation.bonus_details) {
      if (bonus.amount > 0) {
        items.push({
          settlement_id: settlementId,
          type: 'earning',
          category: 'bonus',
          description: `${bonus.name} proporcional`,
          amount: bonus.amount,
          metadata: { bonus_name: bonus.name }
        })
      }
    }
  }

  if (calculation.transportation_payout > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'earning',
      category: 'transportation',
      description: `Movilización proporcional (${employeeData.worked_days_last_month} días)`,
      amount: calculation.transportation_payout,
      metadata: { days: employeeData.worked_days_last_month }
    })
  }

  if (calculation.meal_allowance_payout > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'earning',
      category: 'meal_allowance',
      description: `Colación proporcional (${employeeData.worked_days_last_month} días)`,
      amount: calculation.meal_allowance_payout,
      metadata: { days: employeeData.worked_days_last_month }
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

  // Descuentos legales
  if (calculation.afp_total > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'deduction',
      category: 'afp',
      description: `AFP${employeeData.afp ? ` (${employeeData.afp})` : ''}`,
      amount: calculation.afp_total,
      metadata: { afp_10: calculation.afp_10, afp_additional: calculation.afp_additional }
    })
  }

  if (calculation.health_total > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'deduction',
      category: 'health',
      description: employeeData.health_system === 'ISAPRE' ? 'ISAPRE' : 'FONASA 7%',
      amount: calculation.health_total
    })
  }

  if (calculation.unemployment_insurance > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'deduction',
      category: 'unemployment_insurance',
      description: 'Seguro de cesantía (AFC)',
      amount: calculation.unemployment_insurance
    })
  }

  if (calculation.unique_tax > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'deduction',
      category: 'unique_tax',
      description: 'Impuesto único a la renta',
      amount: calculation.unique_tax
    })
  }

  // Otros descuentos
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

  // Aportes del empleador (motor central previsional)
  if (calculation.employer_sis > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'employer_contribution',
      category: 'sis',
      description: `SIS (${calculation.employer_sis_rate}%)`,
      amount: calculation.employer_sis,
      metadata: { rate: calculation.employer_sis_rate }
    })
  }

  if (calculation.employer_afp_account > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'employer_contribution',
      category: 'afp_account',
      description: `AFP Cuenta Individual Empleador (${calculation.employer_afp_account_rate}%)`,
      amount: calculation.employer_afp_account,
      metadata: { rate: calculation.employer_afp_account_rate }
    })
  }

  if (calculation.employer_crp > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'employer_contribution',
      category: 'crp',
      description: `CRP (${calculation.employer_crp_rate}%)`,
      amount: calculation.employer_crp,
      metadata: { rate: calculation.employer_crp_rate }
    })
  }

  if (calculation.employer_afc > 0) {
    items.push({
      settlement_id: settlementId,
      type: 'employer_contribution',
      category: 'afc_employer',
      description: 'AFC Empleador',
      amount: calculation.employer_afc,
      metadata: { rate: calculation.employer_afc_rate }
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

