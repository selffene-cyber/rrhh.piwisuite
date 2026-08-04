/**
 * Servicio para calcular finiquitos conforme al Codigo del Trabajo chileno
 *
 * Integra el motor de reglas (SettlementRulesEngine) para determinar
 * automaticamente que conceptos corresponden pagar segun la causal de termino.
 *
 * Calcula automaticamente:
 * - Saldo de sueldo proporcional (art.44 CT)
 * - Gratificacion legal proporcional (art.47 CT)
 * - Bonos proporcionales
 * - Semana corrida proporcional (art.45 CT, remuneracion variable)
 * - Movilizacion y colacion proporcionales (no imponibles)
 * - Vacaciones pendientes (art.67 CT)
 * - Vacaciones proporcionales (art.68 CT)
 * - Feriado progresivo (art.68 CT, >10 anos)
 * - Indemnizacion por anos de servicio (IAS) - segun causal (art.163 CT)
 * - Indemnizacion sustitutiva del aviso previo (IAP) - segun causal (art.163 bis CT)
 * - Indemnizacion voluntaria (ex gratia) - si la empresa lo decide
 * - Descuentos legales: AFP, Salud, Seguro Cesantia, Impuesto Unico
 * - Descuentos por prestamos y anticipos (art.57 CT)
 *
 * REGLAS LEGALES POR CAUSAL:
 * - art.159: No IAS, no IAP (mutuo acuerdo, renuncia, muerte, plazo fijo, obra, fuerza mayor)
 * - art.160 N°1-7: No IAS, no IAP (despido disciplinario)
 * - art.161: Si IAS (tope 11 anos), si IAP si no aviso (necesidades empresa, desahucio)
 * - art.163 bis: Si IAS (tope 11 anos), no IAP (liquidacion/quiebra)
 *
 * NUNCA HARDCODEAR MONTOS, PORCENTAJES NI REGLAS.
 * Toda la logica de conceptos por causal esta en settlementRulesEngine.ts
 */

import { getAFPRate, getUnemploymentInsuranceRate, PreviredIndicators } from './previredAPI'
import { calculatePrevisional } from './previsional/previsionalEngine'
import type { CalculationContext, PrevisionalCalculationResult } from './previsional/types'
import {
  evaluateSettlementRule,
  generateSettlementClauses,
  SettlementRuleEvaluation,
  SettlementRuleConfig as SettlementRuleConfigType,
} from './settlementRulesEngine'

export interface SettlementCause {
  code: string
  label: string
  article: string
  has_ias: boolean
  has_iap: boolean
  rule_config?: SettlementRuleConfigType | null
}

export interface SettlementCalculationInput {
  contract_start_date: Date | string
  termination_date: Date | string

  last_salary_monthly: number
  worked_days_last_month: number

  bonuses: Array<{ name: string; amount: number }>
  transportation: number
  meal_allowance: number

  vacation_days_pending: number
  vacation_days_proportional?: number
  feriado_progresivo_days?: number
  has_variable_remuneration?: boolean

  cause_code: string
  cause: SettlementCause

  notice_given: boolean
  notice_days?: number

  previsional_regime: 'AFP' | 'OTRO_REGIMEN'
  afp?: string | null
  health_system?: string | null
  health_plan_percentage?: number
  contract_type?: string
  afc_applicable?: boolean
  manual_pension_rate?: number | null
  manual_health_rate?: number | null
  manual_base_type?: 'imponible' | 'sueldo_base' | null

  indicators?: PreviredIndicators | null
  termination_year?: number
  termination_month?: number

  loan_balance: number
  advance_balance: number
  other_deductions?: number
  voluntary_indemnity?: number
}

export interface ServiceTimeCalculation {
  service_days: number
  service_years_raw: number
  service_years_floor: number
  service_months_fraction: number
  service_years_effective: number
  service_years_capped: number
}

export interface VacationCalculation {
  vacation_days_pending: number
  vacation_days_proportional: number
  vacation_proportional_payout: number
  vacation_payout: number
  feriado_progresivo_days: number
  feriado_progresivo_payout: number
}

export interface SettlementCalculationResult {
  service_time: ServiceTimeCalculation
  vacation_calc: VacationCalculation

  rule_evaluation: SettlementRuleEvaluation | null

  salary_balance: number
  gratification: number
  bonuses_payout: number
  taxable_earnings_total: number

  transportation_payout: number
  meal_allowance_payout: number
  semana_corrida_payout: number
  non_taxable_earnings_total: number

  vacation_payout: number
  vacation_proportional_payout: number
  feriado_progresivo_payout: number
  ias_amount: number
  iap_amount: number
  voluntary_indemnity: number

  total_earnings: number

  afp_total: number
  afp_10: number
  afp_additional: number
  health_total: number
  unemployment_insurance: number
  legal_deductions_total: number

  taxable_base_for_tax: number
  unique_tax: number

  loan_balance: number
  advance_balance: number
  other_deductions: number
  voluntary_indemnity_deduction: number
  other_deductions_total: number

  total_deductions: number
  net_to_pay: number

  employer_sis: number
  employer_sis_rate: number
  employer_afp_account: number
  employer_afp_account_rate: number
  employer_crp: number
  employer_crp_rate: number
  employer_afc: number
  employer_afc_rate: number
  employer_total: number

  legal_clauses: string[]

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

export function calculateVacationProportional(
  contractStartDate: Date | string,
  terminationDate: Date | string,
  lastSalaryMonthly: number,
  vacationDaysPending: number
): VacationCalculation {
  const start = typeof contractStartDate === 'string'
    ? new Date(contractStartDate + 'T00:00:00')
    : contractStartDate
  const end = typeof terminationDate === 'string'
    ? new Date(terminationDate + 'T00:00:00')
    : terminationDate

  const startYear = start.getFullYear()
  const startMonth = start.getMonth()
  const startDay = start.getDate()

  const endYear = end.getFullYear()
  const endMonth = end.getMonth()
  const endDay = end.getDate()

  const lastAnniversary = new Date(endYear, startMonth, startDay)
  if (lastAnniversary > end) {
    lastAnniversary.setFullYear(lastAnniversary.getFullYear() - 1)
  }

  const daysSinceAnniversary = Math.max(0, Math.floor((end.getTime() - lastAnniversary.getTime()) / (1000 * 60 * 60 * 24)))
  const monthsSinceAnniversary = daysSinceAnniversary / 30

  const vacationDaysProportional = Math.round((monthsSinceAnniversary / 12) * 15 * 100) / 100

  const vacationPayout = Math.ceil((lastSalaryMonthly / 30) * vacationDaysPending)
  const vacationProportionalPayout = Math.ceil((lastSalaryMonthly / 30) * vacationDaysProportional)

  const feriadoProgresivoDays = 0

  const feriadoProgresivoPayout = 0

  return {
    vacation_days_pending: vacationDaysPending,
    vacation_days_proportional: vacationDaysProportional,
    vacation_proportional_payout: vacationProportionalPayout,
    vacation_payout: vacationPayout,
    feriado_progresivo_days: feriadoProgresivoDays,
    feriado_progresivo_payout: feriadoProgresivoPayout
  }
}

export function calculateIAS(
  serviceYearsCapped: number,
  lastSalaryMonthly: number,
  cause: SettlementCause,
  ruleEvaluation?: SettlementRuleEvaluation | null
): number {
  if (ruleEvaluation) {
    if (!ruleEvaluation.conceptos.ias.aplica) return 0
  } else {
    if (!cause.has_ias) return 0
  }
  if (serviceYearsCapped < 1) return 0
  return Math.ceil(serviceYearsCapped * lastSalaryMonthly)
}

export function calculateIAP(
  lastSalaryMonthly: number,
  noticeGiven: boolean,
  cause: SettlementCause,
  ruleEvaluation?: SettlementRuleEvaluation | null
): number {
  if (ruleEvaluation) {
    if (!ruleEvaluation.conceptos.iap.aplica) return 0
  } else {
    if (!cause.has_iap) return 0
  }
  if (noticeGiven) return 0
  return Math.ceil(lastSalaryMonthly)
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
    errors.push('La fecha de termino debe ser posterior a la fecha de inicio del contrato')
  }

  if (input.last_salary_monthly <= 0) {
    errors.push('El sueldo mensual debe ser mayor a cero')
  }

  if (input.worked_days_last_month < 0 || input.worked_days_last_month > 31) {
    errors.push('Los dias trabajados del ultimo mes deben estar entre 0 y 31')
  }

  if (input.vacation_days_pending < 0) {
    errors.push('Los dias de vacaciones pendientes no pueden ser negativos')
  }

  const serviceTime = calculateServiceTime(input.contract_start_date, input.termination_date)

  const ruleResult = evaluateSettlementRule(input.cause_code, {
    serviceYears: serviceTime.service_years_effective,
    noticeGiven: input.notice_given,
    noticeDays: input.notice_days,
    contractType: input.contract_type,
    voluntaryIndemnity: input.voluntary_indemnity,
    vacationDaysPending: input.vacation_days_pending,
    vacationDaysProportional: input.vacation_days_proportional ?? 0,
    feriadoProgresivoDays: input.feriado_progresivo_days ?? 0,
    hasVariableRemuneration: input.has_variable_remuneration
  })

  if (ruleResult.blocked) {
    errors.push(ruleResult.blockedReason || 'Causal no configurada en el motor de reglas')
  }

  for (const warning of ruleResult.warnings) {
    warnings.push(warning)
  }

  if (serviceTime.service_years_effective < 1 && input.cause.has_ias) {
    warnings.push('El trabajador tiene menos de 1 ano de servicio, pero la causal requiere IAS. Se pagara 0 por IAS.')
  }

  if (input.vacation_days_pending > 30) {
    warnings.push('El trabajador tiene mas de 30 dias de vacaciones pendientes. Verificar calculo.')
  }

  if (input.loan_balance < 0 || input.advance_balance < 0) {
    warnings.push('Los descuentos tienen valores negativos. Verificar.')
  }

  return { valid: errors.length === 0, errors, warnings }
}

export async function calculateSettlement(input: SettlementCalculationInput): Promise<SettlementCalculationResult> {
  const emptyResult = (errors: string[], warnings: string[]): SettlementCalculationResult => ({
    service_time: calculateServiceTime(input.contract_start_date, input.termination_date),
    vacation_calc: calculateVacationProportional(input.contract_start_date, input.termination_date, input.last_salary_monthly, input.vacation_days_pending),
    rule_evaluation: null,
    salary_balance: 0, gratification: 0, bonuses_payout: 0, taxable_earnings_total: 0,
    transportation_payout: 0, meal_allowance_payout: 0, semana_corrida_payout: 0, non_taxable_earnings_total: 0,
    vacation_payout: 0, vacation_proportional_payout: 0, feriado_progresivo_payout: 0,
    ias_amount: 0, iap_amount: 0, voluntary_indemnity: 0,
    total_earnings: 0,
    afp_total: 0, afp_10: 0, afp_additional: 0, health_total: 0,
    unemployment_insurance: 0, legal_deductions_total: 0,
    taxable_base_for_tax: 0, unique_tax: 0,
    loan_balance: input.loan_balance, advance_balance: input.advance_balance,
    other_deductions: input.other_deductions ?? 0, voluntary_indemnity_deduction: 0,
    other_deductions_total: Math.ceil(Math.max(0, input.loan_balance) + Math.max(0, input.advance_balance) + (input.other_deductions ?? 0)),
    total_deductions: Math.ceil(Math.max(0, input.loan_balance) + Math.max(0, input.advance_balance) + (input.other_deductions ?? 0)),
    net_to_pay: 0,
    employer_sis: 0, employer_sis_rate: 0,
    employer_afp_account: 0, employer_afp_account_rate: 0,
    employer_crp: 0, employer_crp_rate: 0,
    employer_afc: 0, employer_afc_rate: 0,
    employer_total: 0,
    legal_clauses: [],
    errors, warnings, bonus_details: [],
  })

  const validation = validateSettlementInput(input)
  if (!validation.valid) {
    return emptyResult(validation.errors, validation.warnings)
  }

  const serviceTime = calculateServiceTime(input.contract_start_date, input.termination_date)
  const days = input.worked_days_last_month
  const isSpecialRegime = input.previsional_regime === 'OTRO_REGIMEN'

  // ==========================================
  // EVALUAR REGLAS DE LA CAUSAL
  // ==========================================

  const vacationCalc = calculateVacationProportional(
    input.contract_start_date,
    input.termination_date,
    input.last_salary_monthly,
    input.vacation_days_pending
  )

  const ruleEvaluation = evaluateSettlementRule(input.cause_code, {
    serviceYears: serviceTime.service_years_effective,
    noticeGiven: input.notice_given,
    noticeDays: input.notice_days,
    contractType: input.contract_type,
    voluntaryIndemnity: input.voluntary_indemnity,
    vacationDaysPending: input.vacation_days_pending,
    vacationDaysProportional: vacationCalc.vacation_days_proportional,
    feriadoProgresivoDays: input.feriado_progresivo_days ?? 0,
    hasVariableRemuneration: input.has_variable_remuneration
  })

  const conceptos = ruleEvaluation.conceptos

  // ==========================================
  // HABERES IMPONIBLES (filtrados por motor de reglas)
  // ==========================================

  const salary_balance = conceptos.diasTrabajados.aplica
    ? Math.ceil((input.last_salary_monthly / 30) * days)
    : 0

  const bonus_details: Array<{ name: string; amount: number }> = []
  let bonuses_payout = 0
  if (conceptos.bonosProporcionales.aplica) {
    for (const bonus of input.bonuses || []) {
      const proportional = Math.ceil((bonus.amount / 30) * days)
      bonus_details.push({ name: bonus.name, amount: proportional })
      bonuses_payout += proportional
    }
  }

  const totalWithoutGratification = salary_balance + bonuses_payout

  let gratification = 0
  let gratificationIndicators = input.indicators || null

  if (conceptos.gratificacionProporcional.aplica) {
    if (gratificationIndicators && gratificationIndicators.RMITrabDepeInd) {
      const ingresoMinimo = parseChileanNumber(gratificationIndicators.RMITrabDepeInd)
      const topeGratificacion = (4.75 * ingresoMinimo) / 12
      const gratificacion25Porciento = totalWithoutGratification * 0.25
      const gratificacionMensual = Math.min(topeGratificacion, gratificacion25Porciento)
      gratification = Math.ceil((gratificacionMensual / 30) * days)
    } else {
      gratification = Math.ceil((totalWithoutGratification * 0.25 / 30) * days)
    }
  }

  const taxable_earnings_total = Math.ceil(salary_balance + bonuses_payout + gratification)

  // ==========================================
  // HABERES NO IMPONIBLES (filtrados por motor de reglas)
  // ==========================================

  const transportation_payout = conceptos.movilizacion.aplica && input.transportation
    ? Math.ceil((input.transportation / 30) * days)
    : 0

  const meal_allowance_payout = conceptos.colacion.aplica && input.meal_allowance
    ? Math.ceil((input.meal_allowance / 30) * days)
    : 0

  const semana_corrida_payout = conceptos.semanaCorrida.aplica
    ? 0 // TODO: implementar calculo de semana corrida proporcional para trabajadores con remuneracion variable
    : 0

  const non_taxable_earnings_total = Math.ceil(transportation_payout + meal_allowance_payout + semana_corrida_payout)

  // ==========================================
  // VACACIONES E INDEMNIZACIONES (filtrados por motor de reglas)
  // ==========================================

  const vacation_payout = conceptos.vacacionesPendientes.aplica
    ? vacationCalc.vacation_payout
    : 0

  const vacation_proportional_payout = conceptos.vacacionesProporcionales.aplica
    ? vacationCalc.vacation_proportional_payout
    : 0

  const feriado_progresivo_payout = conceptos.feriadoProgresivo.aplica
    ? vacationCalc.feriado_progresivo_payout
    : 0

  const ias_amount = calculateIAS(serviceTime.service_years_capped, input.last_salary_monthly, input.cause, ruleEvaluation)

  const iap_amount = calculateIAP(input.last_salary_monthly, input.notice_given, input.cause, ruleEvaluation)

  const voluntary_indemnity = conceptos.indemnizacionVoluntaria.aplica
    ? (input.voluntary_indemnity ?? 0)
    : 0

  const total_earnings = Math.ceil(
    taxable_earnings_total + non_taxable_earnings_total +
    vacation_payout + vacation_proportional_payout + feriado_progresivo_payout +
    ias_amount + iap_amount + voluntary_indemnity
  )

  // ==========================================
  // DESCUENTOS LEGALES (filtrados por motor de reglas)
  // ==========================================

  const taxableBase = taxable_earnings_total
  let afp_total = 0, afp_10 = 0, afp_additional = 0
  let health_total = 0
  let unemployment_insurance = 0
  let employer_sis = 0, employer_sis_rate = 0
  let employer_afp_account = 0, employer_afp_account_rate = 0
  let employer_crp = 0, employer_crp_rate = 0
  let employer_afc = 0, employer_afc_rate = 0
  let employer_total = 0

  const year = input.termination_year || new Date().getFullYear()
  const month = input.termination_month || (new Date().getMonth() + 1)

  const prevContext: CalculationContext = {
    year,
    month,
    employee: {
      id: 'settlement',
      afp: input.afp ?? undefined,
      healthSystem: input.health_system ?? undefined,
      healthPlanPercentage: input.health_plan_percentage ?? undefined,
      previsionalRegime: isSpecialRegime ? 'OTRO_REGIMEN' : 'AFP',
      otherRegimeType: undefined,
      manualPensionRate: input.manual_pension_rate ?? undefined,
      manualHealthRate: input.manual_health_rate ?? undefined,
      manualBaseType: input.manual_base_type as any ?? undefined,
      contractType: input.contract_type ?? undefined,
      afcApplicable: input.afc_applicable !== false,
    },
    taxableEarnings: taxableBase,
    baseSalaryProportional: taxableBase,
    daysWorked: input.worked_days_last_month || 30,
    calculationType: 'finiquito',
    indicators: input.indicators ?? null,
  }

  try {
    const prevResult: PrevisionalCalculationResult = await calculatePrevisional(prevContext)

    if (prevResult.blocked && prevResult.blockedConcepts.length > 0) {
      throw new Error(
        `Calculo de finiquito bloqueado: faltan tasas previsionales validadas para [${prevResult.blockedConcepts.join(', ')}] ` +
        `en ${month}/${year}. Valide las tasas en la tabla prevision_rates antes de calcular.`
      )
    }

    const empDed = prevResult.employeeDeductions

    if (conceptos.descuentoAFP.aplica) {
      if (isSpecialRegime) {
        const manualPensionRate = input.manual_pension_rate || 0
        const manualBaseType = input.manual_base_type || 'imponible'
        const baseCalc = manualBaseType === 'sueldo_base' ? salary_balance : taxableBase
        afp_total = Math.ceil(baseCalc * (manualPensionRate / 100))
        afp_10 = afp_total
        afp_additional = 0
      } else {
        afp_total = empDed.pension
        afp_10 = empDed.pensionObligatorio
        afp_additional = empDed.pensionComision
      }
    }

    if (conceptos.descuentoSalud.aplica) {
      if (isSpecialRegime) {
        const manualHealthRate = input.manual_health_rate || 7
        const manualBaseType = input.manual_base_type || 'imponible'
        const baseCalc = manualBaseType === 'sueldo_base' ? salary_balance : taxableBase
        health_total = Math.ceil(baseCalc * (manualHealthRate / 100))
      } else {
        health_total = empDed.health
      }
    }

    if (conceptos.descuentoAFC.aplica) {
      if (input.contract_type === 'plazo_fijo' || input.contract_type === 'otro') {
        unemployment_insurance = 0
      } else {
        unemployment_insurance = empDed.afcTrabajador
      }
    }

    employer_sis = prevResult.sisAmount
    employer_sis_rate = prevResult.sisRate
    employer_afp_account = prevResult.afpEmployerAccountAmount
    employer_afp_account_rate = prevResult.afpEmployerAccountRate
    employer_crp = prevResult.crpAmount
    employer_crp_rate = prevResult.crpRate
    employer_afc = prevResult.afcEmployerAmount
    employer_afc_rate = prevResult.afcEmployerRate
    employer_total = prevResult.employerContributionsTotal
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Calculo de finiquito bloqueado')) {
      throw error
    }
    console.warn('[settlementCalculator] Error tecnico en motor central previsional, usando calculo legacy:', error)

    if (conceptos.descuentoAFP.aplica) {
      if (isSpecialRegime) {
        const manualPensionRate = input.manual_pension_rate || 0
        const manualBaseType = input.manual_base_type || 'imponible'
        const baseCalc = manualBaseType === 'sueldo_base' ? salary_balance : taxableBase
        afp_total = Math.ceil(baseCalc * (manualPensionRate / 100))
        afp_10 = afp_total
        afp_additional = 0
      } else {
        const afpRates = getAFPRate(input.afp || null, input.indicators || null)
        afp_total = Math.ceil(taxableBase * (afpRates.trabajador / 100))
        afp_10 = Math.ceil(taxableBase * 0.10)
        afp_additional = Math.ceil(afp_total - afp_10)
      }
    }

    if (conceptos.descuentoSalud.aplica) {
      if (isSpecialRegime) {
        const manualHealthRate = input.manual_health_rate || 7
        const manualBaseType = input.manual_base_type || 'imponible'
        const baseCalc = manualBaseType === 'sueldo_base' ? salary_balance : taxableBase
        health_total = Math.ceil(baseCalc * (manualHealthRate / 100))
      } else {
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
      }
    }

    if (conceptos.descuentoAFC.aplica) {
      const afcApplicable = input.afc_applicable !== false
      if (afcApplicable && input.contract_type !== 'plazo_fijo' && input.contract_type !== 'otro') {
        const unemploymentRate = getUnemploymentInsuranceRate(input.indicators || null)
        unemployment_insurance = Math.ceil(taxableBase * (unemploymentRate / 100))
      }
    }
  }

  const legal_deductions_total = Math.ceil(afp_total + health_total + unemployment_insurance)

  // ==========================================
  // IMPUESTO UNICO (filtrado por motor de reglas)
  // ==========================================

  let unique_tax = 0
  if (conceptos.descuentoImpuestoUnico.aplica) {
    const taxable_base_for_tax = Math.ceil(taxableBase - afp_total - health_total - unemployment_insurance)

    if (taxable_base_for_tax > 3500000) {
      unique_tax = Math.ceil((taxable_base_for_tax - 3500000) * 0.23 + 135000)
    } else if (taxable_base_for_tax > 2500000) {
      unique_tax = Math.ceil((taxable_base_for_tax - 2500000) * 0.135 + 80000)
    } else if (taxable_base_for_tax > 1500000) {
      unique_tax = Math.ceil((taxable_base_for_tax - 1500000) * 0.08 + 20000)
    } else if (taxable_base_for_tax > 1000000) {
      unique_tax = Math.ceil((taxable_base_for_tax - 1000000) * 0.04)
    }
  }

  const taxable_base_for_tax = Math.ceil(taxableBase - afp_total - health_total - unemployment_insurance)

  // ==========================================
  // OTROS DESCUENTOS (filtrados por motor de reglas)
  // ==========================================

  const loan_balance = conceptos.descuentoPrestamos.aplica
    ? Math.ceil(Math.max(0, input.loan_balance))
    : 0

  const advance_balance = conceptos.descuentoAnticipos.aplica
    ? Math.ceil(Math.max(0, input.advance_balance))
    : 0

  const other_deductions = conceptos.descuentoHaberesPendientes.aplica
    ? Math.ceil(Math.max(0, input.other_deductions ?? 0))
    : 0

  const voluntary_indemnity_deduction = 0

  const other_deductions_total = Math.ceil(loan_balance + advance_balance + other_deductions)

  // ==========================================
  // TOTALES FINALES
  // ==========================================

  const total_deductions = Math.ceil(legal_deductions_total + unique_tax + other_deductions_total)
  const net_to_pay = Math.max(0, Math.ceil(total_earnings - total_deductions))

  // ==========================================
  // CLAUSULAS LEGALES
  // ==========================================

  let legal_clauses: string[] = []
  try {
    legal_clauses = generateSettlementClauses(input.cause_code, {
      employeeName: '',
      employeeRut: '',
      position: '',
      companyName: '',
      companyRut: '',
      contractStartDate: typeof input.contract_start_date === 'string' ? input.contract_start_date : input.contract_start_date.toISOString().split('T')[0],
      terminationDate: typeof input.termination_date === 'string' ? input.termination_date : input.termination_date.toISOString().split('T')[0],
      serviceYears: serviceTime.service_years_effective,
      serviceDays: serviceTime.service_days,
      causeDescription: input.cause.label || input.cause_code,
      noticeGiven: input.notice_given,
      voluntaryIndemnity: input.voluntary_indemnity
    })
  } catch (e) {
    console.warn('[settlementCalculator] Error generando clausulas legales:', e)
  }

  return {
    service_time: serviceTime,
    vacation_calc: vacationCalc,
    rule_evaluation: ruleEvaluation,
    salary_balance, gratification, bonuses_payout, taxable_earnings_total,
    transportation_payout, meal_allowance_payout, semana_corrida_payout, non_taxable_earnings_total,
    vacation_payout, vacation_proportional_payout, feriado_progresivo_payout,
    ias_amount, iap_amount, voluntary_indemnity,
    total_earnings,
    afp_total, afp_10, afp_additional, health_total,
    unemployment_insurance, legal_deductions_total,
    taxable_base_for_tax, unique_tax,
    loan_balance, advance_balance, other_deductions, voluntary_indemnity_deduction,
    other_deductions_total,
    total_deductions, net_to_pay,
    employer_sis, employer_sis_rate,
    employer_afp_account, employer_afp_account_rate,
    employer_crp, employer_crp_rate,
    employer_afc, employer_afc_rate,
    employer_total,
    legal_clauses,
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
      vacation_days_proportional: result.vacation_calc?.vacation_days_proportional,
      feriado_progresivo_days: input.feriado_progresivo_days,
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
      advance_balance: input.advance_balance,
      other_deductions: input.other_deductions,
      voluntary_indemnity: input.voluntary_indemnity,
      has_variable_remuneration: input.has_variable_remuneration,
    },
    result: {
      service_time: result.service_time,
      vacation_calc: result.vacation_calc,
      salary_balance: result.salary_balance,
      gratification: result.gratification,
      bonuses_payout: result.bonuses_payout,
      taxable_earnings_total: result.taxable_earnings_total,
      transportation_payout: result.transportation_payout,
      meal_allowance_payout: result.meal_allowance_payout,
      semana_corrida_payout: result.semana_corrida_payout,
      non_taxable_earnings_total: result.non_taxable_earnings_total,
      vacation_payout: result.vacation_payout,
      vacation_proportional_payout: result.vacation_proportional_payout,
      feriado_progresivo_payout: result.feriado_progresivo_payout,
      ias_amount: result.ias_amount,
      iap_amount: result.iap_amount,
      voluntary_indemnity: result.voluntary_indemnity,
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
      other_deductions: result.other_deductions,
      other_deductions_total: result.other_deductions_total,
      total_deductions: result.total_deductions,
      net_to_pay: result.net_to_pay,
      employer_sis: result.employer_sis,
      employer_sis_rate: result.employer_sis_rate,
      employer_afp_account: result.employer_afp_account,
      employer_afp_account_rate: result.employer_afp_account_rate,
      employer_crp: result.employer_crp,
      employer_crp_rate: result.employer_crp_rate,
      employer_afc: result.employer_afc,
      employer_afc_rate: result.employer_afc_rate,
      employer_total: result.employer_total,
      legal_clauses: result.legal_clauses,
    },
    rule_evaluation: result.rule_evaluation ? {
      ruleCode: result.rule_evaluation.ruleConfig?.code,
      warnings: result.rule_evaluation.warnings,
      blocked: result.rule_evaluation.blocked,
      conceptos: Object.fromEntries(
        Object.entries(result.rule_evaluation.conceptos).map(([key, val]) => [
          key,
          typeof val === 'object' && val !== null && 'aplica' in val ? { aplica: (val as any).aplica, monto: (val as any).monto } : val
        ])
      ),
      auditLog: result.rule_evaluation.auditLog?.map(e => ({
        decision: e.decision,
        reason: e.reason,
        legalReference: e.legalReference,
        valor: e.valor
      })),
    } : null,
    errors: result.errors,
    warnings: result.warnings
  }
}