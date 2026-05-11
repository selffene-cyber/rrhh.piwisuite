/**
 * Servicio para calcular finiquitos conforme a Código del Trabajo chileno
 * 
 * Calcula automáticamente:
 * - Saldo de sueldo proporcional
 * - Gratificación legal proporcional
 * - Bonos proporcionales
 * - Movilización y colación proporcionales (no imponibles)
 * - Pago de vacaciones pendientes
 * - Indemnización por años de servicio (IAS) - según causal
 * - Indemnización por aviso previo (IAP) - según causal
 * - Descuentos legales: AFP, Salud, Seguro Cesantía, Impuesto Único
 * - Descuentos por préstamos y anticipos
 */

import { PreviredIndicators, getAFPRate, getUnemploymentInsuranceRate } from './previredAPI'
import { getCachedIndicators } from './indicatorsCache'

export interface SettlementCause {
  code: string
  label: string
  article: string
  has_ias: boolean
  has_iap: boolean
}

export interface SettlementCalculationInput {
  // Fechas
  contract_start_date: Date | string
  termination_date: Date | string
  
  // Remuneraciones
  last_salary_monthly: number
  worked_days_last_month: number
  
  // Bonos y asignaciones del contrato
  bonuses: Array<{ name: string; amount: number }>
  transportation: number
  meal_allowance: number
  
  // Vacaciones
  vacation_days_pending: number
  
  // Causa de término
  cause_code: string
  cause: SettlementCause
  
  // Aviso previo
  notice_given: boolean
  notice_days?: number
  
  // Previsión del trabajador
  previsional_regime: 'AFP' | 'OTRO_REGIMEN'
  afp?: string | null
  health_system?: string | null
  health_plan_percentage?: number
  contract_type?: string
  afc_applicable?: boolean
  manual_pension_rate?: number | null
  manual_health_rate?: number | null
  manual_base_type?: 'imponible' | 'sueldo_base' | null
  
  // Indicadores previred (mes anterior al término)
  indicators?: PreviredIndicators | null
  
  // Fecha del término para obtener indicadores
  termination_year?: number
  termination_month?: number
  
  // Descuentos
  loan_balance: number
  advance_balance: number
}

export interface ServiceTimeCalculation {
  service_days: number
  service_years_raw: number
  service_years_floor: number
  service_months_fraction: number
  service_years_effective: number
  service_years_capped: number
}

export interface SettlementCalculationResult {
  service_time: ServiceTimeCalculation
  
  // Haberes imponibles
  salary_balance: number
  gratification: number
  bonuses_payout: number
  taxable_earnings_total: number
  
  // Haberes no imponibles
  transportation_payout: number
  meal_allowance_payout: number
  non_taxable_earnings_total: number
  
  // Vacaciones e indemnizaciones
  vacation_payout: number
  ias_amount: number
  iap_amount: number
  
  // Total haberes
  total_earnings: number
  
  // Descuentos legales
  afp_total: number
  afp_10: number
  afp_additional: number
  health_total: number
  unemployment_insurance: number
  legal_deductions_total: number
  
  // Impuesto único
  taxable_base_for_tax: number
  unique_tax: number
  
  // Otros descuentos
  loan_balance: number
  advance_balance: number
  other_deductions_total: number
  
  // Total descuentos y líquido
  total_deductions: number
  net_to_pay: number
  
  errors: string[]
  warnings: string[]
  bonus_details: Array<{ name: string; amount: number }>
}

const parseChileanNumber = (str: string | null | undefined): number => {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

export function calculateServiceTime(
  contractStartDate: Date | string,
  terminationDate: Date | string
): ServiceTimeCalculation {
  const start = typeof contractStartDate === 'string'
    ? new Date(contractStartDate + 'T00:00:00')
    : new Date(contractStartDate.getFullYear(), contractStartDate.getMonth(), contractStartDate.getDate())

  const end = typeof terminationDate === 'string'
    ? new Date(terminationDate + 'T00:00:00')
    : new Date(terminationDate.getFullYear(), terminationDate.getMonth(), terminationDate.getDate())

  const diffTime = end.getTime() - start.getTime()
  const service_days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  const service_years_raw = service_days / 365
  const service_years_floor = Math.floor(service_years_raw)
  const service_months_fraction = (service_days % 365) / 30
  const service_years_effective = service_years_floor + (service_months_fraction > 6 ? 1 : 0)
  const service_years_capped = Math.min(11, service_years_effective)

  return {
    service_days,
    service_years_raw: Math.round(service_years_raw * 10000) / 10000,
    service_years_floor,
    service_months_fraction: Math.round(service_months_fraction * 100) / 100,
    service_years_effective,
    service_years_capped
  }
}

export function validateSettlementInput(input: SettlementCalculationInput): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  const start = typeof input.contract_start_date === 'string'
    ? new Date(input.contract_start_date + 'T00:00:00')
    : input.contract_start_date

  const end = typeof input.termination_date === 'string'
    ? new Date(input.termination_date + 'T00:00:00')
    : input.termination_date

  if (start.getTime() >= end.getTime()) {
    errors.push('La fecha de término debe ser posterior a la fecha de inicio del contrato')
  }

  if (input.last_salary_monthly <= 0) {
    errors.push('El sueldo mensual debe ser mayor a cero')
  }

  if (input.worked_days_last_month < 0 || input.worked_days_last_month > 31) {
    errors.push('Los días trabajados del último mes deben estar entre 0 y 31')
  }

  if (input.vacation_days_pending < 0) {
    errors.push('Los días de vacaciones pendientes no pueden ser negativos')
  }

  const serviceTime = calculateServiceTime(input.contract_start_date, input.termination_date)

  if (serviceTime.service_years_effective < 1 && input.cause.has_ias) {
    warnings.push('El trabajador tiene menos de 1 año de servicio, pero la causal requiere IAS. Se pagará 0 por IAS.')
  }

  if (input.vacation_days_pending > 30) {
    warnings.push('El trabajador tiene más de 30 días de vacaciones pendientes. Verificar cálculo.')
  }

  if (input.loan_balance < 0 || input.advance_balance < 0) {
    warnings.push('Los descuentos tienen valores negativos. Verificar.')
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function calculateIAS(
  serviceYearsCapped: number,
  lastSalaryMonthly: number,
  cause: SettlementCause
): number {
  if (!cause.has_ias) return 0
  if (serviceYearsCapped < 1) return 0
  return Math.ceil(serviceYearsCapped * lastSalaryMonthly)
}

export function calculateIAP(
  lastSalaryMonthly: number,
  noticeGiven: boolean,
  cause: SettlementCause
): number {
  if (!cause.has_iap) return 0
  if (noticeGiven) return 0
  return Math.ceil(lastSalaryMonthly)
}

export function calculateSettlement(input: SettlementCalculationInput): SettlementCalculationResult {
  const emptyResult = (errors: string[], warnings: string[]): SettlementCalculationResult => ({
    service_time: calculateServiceTime(input.contract_start_date, input.termination_date),
    salary_balance: 0, gratification: 0, bonuses_payout: 0, taxable_earnings_total: 0,
    transportation_payout: 0, meal_allowance_payout: 0, non_taxable_earnings_total: 0,
    vacation_payout: 0, ias_amount: 0, iap_amount: 0, total_earnings: 0,
    afp_total: 0, afp_10: 0, afp_additional: 0, health_total: 0,
    unemployment_insurance: 0, legal_deductions_total: 0,
    taxable_base_for_tax: 0, unique_tax: 0,
    loan_balance: input.loan_balance, advance_balance: input.advance_balance,
    other_deductions_total: Math.ceil(Math.max(0, input.loan_balance) + Math.max(0, input.advance_balance)),
    total_deductions: Math.ceil(Math.max(0, input.loan_balance) + Math.max(0, input.advance_balance)),
    net_to_pay: 0, errors, warnings, bonus_details: [],
  })

  const validation = validateSettlementInput(input)
  if (!validation.valid) {
    return emptyResult(validation.errors, validation.warnings)
  }

  const serviceTime = calculateServiceTime(input.contract_start_date, input.termination_date)
  const days = input.worked_days_last_month
  const isSpecialRegime = input.previsional_regime === 'OTRO_REGIMEN'

  // ========== HABERES IMPONIBLES ==========

  const salary_balance = Math.ceil((input.last_salary_monthly / 30) * days)

  const bonus_details: Array<{ name: string; amount: number }> = []
  let bonuses_payout = 0
  for (const bonus of input.bonuses || []) {
    const proportional = Math.ceil((bonus.amount / 30) * days)
    bonus_details.push({ name: bonus.name, amount: proportional })
    bonuses_payout += proportional
  }

  const totalWithoutGratification = salary_balance + bonuses_payout

  let gratification = 0
  let gratificationIndicators = input.indicators || null
  if (input.termination_year && input.termination_month && !gratificationIndicators) {
    gratificationIndicators = null
  }

  if (input.termination_year && input.termination_month) {
    // Try to get indicators for the termination month (same as payroll does)
    // But since this is sync, we use provided indicators
  }

  const indicatorsForGratification = gratificationIndicators
  if (indicatorsForGratification && indicatorsForGratification.RMITrabDepeInd) {
    const ingresoMinimo = parseChileanNumber(indicatorsForGratification.RMITrabDepeInd)
    const topeGratificacion = (4.75 * ingresoMinimo) / 12
    const gratificacion25Porciento = totalWithoutGratification * 0.25
    const gratificacionMensual = Math.min(topeGratificacion, gratificacion25Porciento)
    gratification = Math.ceil((gratificacionMensual / 30) * days)
  } else {
    gratification = Math.ceil((totalWithoutGratification * 0.25 / 30) * days)
  }

  const taxable_earnings_total = Math.ceil(salary_balance + bonuses_payout + gratification)

  // ========== HABERES NO IMPONIBLES ==========

  const transportation_payout = input.transportation ? Math.ceil((input.transportation / 30) * days) : 0
  const meal_allowance_payout = input.meal_allowance ? Math.ceil((input.meal_allowance / 30) * days) : 0
  const non_taxable_earnings_total = Math.ceil(transportation_payout + meal_allowance_payout)

  // ========== VACACIONES E INDEMNIZACIONES ==========

  const vacation_payout = Math.ceil((input.last_salary_monthly / 30) * input.vacation_days_pending)
  const ias_amount = calculateIAS(serviceTime.service_years_capped, input.last_salary_monthly, input.cause)
  const iap_amount = calculateIAP(input.last_salary_monthly, input.notice_given, input.cause)

  const total_earnings = Math.ceil(
    taxable_earnings_total + non_taxable_earnings_total + vacation_payout + ias_amount + iap_amount
  )

  // ========== DESCUENTOS LEGALES (sobre base imponible del saldo de sueldo) ==========

  const taxableBase = taxable_earnings_total
  let afp_total = 0, afp_10 = 0, afp_additional = 0
  let health_total = 0
  let unemployment_insurance = 0

  if (isSpecialRegime) {
    const manualPensionRate = input.manual_pension_rate || 0
    const manualHealthRate = input.manual_health_rate || 7
    const manualBaseType = input.manual_base_type || 'imponible'
    const baseCalc = manualBaseType === 'sueldo_base' ? salary_balance : taxableBase

    afp_total = Math.ceil(baseCalc * (manualPensionRate / 100))
    afp_10 = afp_total
    afp_additional = 0

    health_total = Math.ceil(baseCalc * (manualHealthRate / 100))
  } else {
    // AFP
    const afpRates = getAFPRate(input.afp || null, input.indicators || null)
    afp_total = Math.ceil(taxableBase * (afpRates.trabajador / 100))
    afp_10 = Math.ceil(taxableBase * 0.10)
    afp_additional = Math.ceil(afp_total - afp_10)

    // Salud
    if (input.health_system === 'FONASA') {
      health_total = Math.ceil(taxableBase * 0.07)
    } else if (input.health_system === 'ISAPRE') {
      const healthPlanUF = input.health_plan_percentage || 0
      const ufValue = input.indicators ? parseChileanNumber(input.indicators.UFValPeriodo) : 0
      if (healthPlanUF > 0 && ufValue > 0) {
        health_total = Math.ceil(healthPlanUF * ufValue)
      } else {
        health_total = Math.ceil(taxableBase * 0.07)
      }
    }

    // Seguro de cesantía
    const afcApplicable = input.afc_applicable !== false
    if (afcApplicable) {
      const unemploymentRate = getUnemploymentInsuranceRate(input.indicators || null)
      unemployment_insurance = Math.ceil(taxableBase * (unemploymentRate / 100))
      // Plazo fijo: trabajador no paga AFC
      if (input.contract_type === 'plazo_fijo' || input.contract_type === 'otro') {
        unemployment_insurance = 0
      }
    }
  }

  const legal_deductions_total = Math.ceil(afp_total + health_total + unemployment_insurance)

  // ========== IMPUESTO ÚNICO ==========

  const taxable_base_for_tax = Math.ceil(taxableBase - afp_total - health_total - unemployment_insurance)
  let unique_tax = 0

  // Simplified tax calculation for settlements (same fallback as payroll)
  if (taxable_base_for_tax > 3500000) {
    unique_tax = Math.ceil((taxable_base_for_tax - 3500000) * 0.23 + 135000)
  } else if (taxable_base_for_tax > 2500000) {
    unique_tax = Math.ceil((taxable_base_for_tax - 2500000) * 0.135 + 80000)
  } else if (taxable_base_for_tax > 1500000) {
    unique_tax = Math.ceil((taxable_base_for_tax - 1500000) * 0.08 + 20000)
  } else if (taxable_base_for_tax > 1000000) {
    unique_tax = Math.ceil((taxable_base_for_tax - 1000000) * 0.04)
  }

  // ========== OTROS DESCUENTOS ==========

  const loan_balance = Math.ceil(Math.max(0, input.loan_balance))
  const advance_balance = Math.ceil(Math.max(0, input.advance_balance))
  const other_deductions_total = Math.ceil(loan_balance + advance_balance)

  // ========== TOTALES FINALES ==========

  const total_deductions = Math.ceil(legal_deductions_total + unique_tax + other_deductions_total)
  const net_to_pay = Math.max(0, Math.ceil(total_earnings - total_deductions))

  return {
    service_time: serviceTime,
    salary_balance, gratification, bonuses_payout, taxable_earnings_total,
    transportation_payout, meal_allowance_payout, non_taxable_earnings_total,
    vacation_payout, ias_amount, iap_amount, total_earnings,
    afp_total, afp_10, afp_additional, health_total,
    unemployment_insurance, legal_deductions_total,
    taxable_base_for_tax, unique_tax,
    loan_balance, advance_balance, other_deductions_total,
    total_deductions, net_to_pay,
    errors: [], warnings: validation.warnings, bonus_details,
  }
}

export function createCalculationSnapshot(
  input: SettlementCalculationInput,
  result: SettlementCalculationResult
): any {
  return {
    timestamp: new Date().toISOString(),
    input: {
      contract_start_date: typeof input.contract_start_date === 'string' ? input.contract_start_date : input.contract_start_date.toISOString().split('T')[0],
      termination_date: typeof input.termination_date === 'string' ? input.termination_date : input.termination_date.toISOString().split('T')[0],
      last_salary_monthly: input.last_salary_monthly,
      worked_days_last_month: input.worked_days_last_month,
      bonuses: input.bonuses,
      transportation: input.transportation,
      meal_allowance: input.meal_allowance,
      vacation_days_pending: input.vacation_days_pending,
      cause_code: input.cause_code,
      cause: input.cause,
      notice_given: input.notice_given,
      notice_days: input.notice_days,
      previsional_regime: input.previsional_regime,
      afp: input.afp,
      health_system: input.health_system,
      health_plan_percentage: input.health_plan_percentage,
      contract_type: input.contract_type,
      afc_applicable: input.afc_applicable,
      loan_balance: input.loan_balance,
      advance_balance: input.advance_balance
    },
    result: {
      service_time: result.service_time,
      salary_balance: result.salary_balance,
      gratification: result.gratification,
      bonuses_payout: result.bonuses_payout,
      taxable_earnings_total: result.taxable_earnings_total,
      transportation_payout: result.transportation_payout,
      meal_allowance_payout: result.meal_allowance_payout,
      non_taxable_earnings_total: result.non_taxable_earnings_total,
      vacation_payout: result.vacation_payout,
      ias_amount: result.ias_amount,
      iap_amount: result.iap_amount,
      total_earnings: result.total_earnings,
      afp_total: result.afp_total,
      afp_10: result.afp_10,
      afp_additional: result.afp_additional,
      health_total: result.health_total,
      unemployment_insurance: result.unemployment_insurance,
      legal_deductions_total: result.legal_deductions_total,
      taxable_base_for_tax: result.taxable_base_for_tax,
      unique_tax: result.unique_tax,
      loan_balance: result.loan_balance,
      advance_balance: result.advance_balance,
      other_deductions_total: result.other_deductions_total,
      total_deductions: result.total_deductions,
      net_to_pay: result.net_to_pay
    },
    errors: result.errors,
    warnings: result.warnings
  }
}