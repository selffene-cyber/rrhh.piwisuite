/**
 * Servicio para calcular finiquitos conforme a Código del Trabajo chileno
 * 
 * Calcula automáticamente:
 * - Saldo de sueldo proporcional
 * - Pago de vacaciones pendientes
 * - Indemnización por años de servicio (IAS) - según causal
 * - Indemnización por aviso previo (IAP) - según causal
 * - Descuentos por préstamos y anticipos
 * 
 * Principio: La coherencia entre causal, cálculo y práctica prevalece sobre la redacción.
 */

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
  last_salary_monthly: number // Último sueldo mensual
  worked_days_last_month: number // Días trabajados del último mes (0-31)
  
  // Vacaciones
  vacation_days_pending: number // Días de vacaciones pendientes
  
  // Causa de término
  cause_code: string // Código de la causal
  cause: SettlementCause // Objeto causal (con has_ias, has_iap)
  
  // Aviso previo
  notice_given: boolean // Si se dio aviso previo
  notice_days?: number // Días de aviso previo (opcional)
  
  // Descuentos
  loan_balance: number // Saldo total de préstamos pendientes
  advance_balance: number // Saldo total de anticipos no descontados
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
  // Tiempo de servicio
  service_time: ServiceTimeCalculation
  
  // Haberes
  salary_balance: number // Sueldo proporcional último mes
  vacation_payout: number // Pago de vacaciones
  ias_amount: number // Indemnización años servicio (si aplica)
  iap_amount: number // Indemnización aviso previo (si aplica)
  total_earnings: number // Total haberes
  
  // Descuentos
  loan_balance: number
  advance_balance: number
  total_deductions: number
  
  // Total
  net_to_pay: number // Líquido a pagar
  
  // Validaciones y alertas
  errors: string[]
  warnings: string[]
}

/**
 * Calcula el tiempo de servicio con la lógica especial según ley chilena
 * 
 * Lógica:
 * - service_days = termination_date - contract_start_date
 * - service_years_raw = service_days / 365
 * - service_years_floor = floor(service_years_raw)
 * - service_months_fraction = (service_days % 365) / 30
 * - service_years_effective = service_years_floor + (service_months_fraction > 6 ? 1 : 0)
 * - service_years_capped = min(11, service_years_effective) [tope para IAS]
 */
export function calculateServiceTime(
  contractStartDate: Date | string,
  terminationDate: Date | string
): ServiceTimeCalculation {
  // Parsear fechas
  const start = typeof contractStartDate === 'string' 
    ? new Date(contractStartDate + 'T00:00:00')
    : new Date(contractStartDate.getFullYear(), contractStartDate.getMonth(), contractStartDate.getDate())
  
  const end = typeof terminationDate === 'string'
    ? new Date(terminationDate + 'T00:00:00')
    : new Date(terminationDate.getFullYear(), terminationDate.getMonth(), terminationDate.getDate())
  
  // Calcular diferencia en días
  const diffTime = end.getTime() - start.getTime()
  const service_days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  
  // Años de servicio con decimales
  const service_years_raw = service_days / 365
  
  // Parte entera (años completos)
  const service_years_floor = Math.floor(service_years_raw)
  
  // Fracción de meses restantes
  const service_months_fraction = (service_days % 365) / 30
  
  // Años efectivos: si la fracción es > 6 meses, cuenta como año completo adicional
  const service_years_effective = service_years_floor + (service_months_fraction > 6 ? 1 : 0)
  
  // Tope máximo de 11 años para cálculo de IAS
  const service_years_capped = Math.min(11, service_years_effective)
  
  return {
    service_days,
    service_years_raw: Math.round(service_years_raw * 10000) / 10000, // 4 decimales
    service_years_floor,
    service_months_fraction: Math.round(service_months_fraction * 100) / 100, // 2 decimales
    service_years_effective,
    service_years_capped
  }
}

/**
 * Valida los inputs antes de calcular el finiquito
 */
export function validateSettlementInput(input: SettlementCalculationInput): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Parsear fechas
  const start = typeof input.contract_start_date === 'string'
    ? new Date(input.contract_start_date + 'T00:00:00')
    : input.contract_start_date
  
  const end = typeof input.termination_date === 'string'
    ? new Date(input.termination_date + 'T00:00:00')
    : input.termination_date
  
  // Validaciones de errores (bloquean el cálculo)
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
  
  // Validaciones de advertencias (no bloquean pero se reportan)
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
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Calcula la indemnización por años de servicio (IAS)
 * 
 * Fórmula: service_years_capped * last_salary_monthly
 * Solo se calcula si cause.has_ias === true
 */
export function calculateIAS(
  serviceYearsCapped: number,
  lastSalaryMonthly: number,
  cause: SettlementCause
): number {
  if (!cause.has_ias) {
    return 0
  }
  
  // Si tiene menos de 1 año efectivo, no hay IAS
  if (serviceYearsCapped < 1) {
    return 0
  }
  
  const ias = serviceYearsCapped * lastSalaryMonthly
  return Math.ceil(ias) // Redondear hacia arriba
}

/**
 * Calcula la indemnización por aviso previo (IAP)
 * 
 * Fórmula: Si no se dio aviso previo Y cause.has_iap === true → last_salary_monthly
 * Si se dio aviso previo → 0
 */
export function calculateIAP(
  lastSalaryMonthly: number,
  noticeGiven: boolean,
  cause: SettlementCause
): number {
  if (!cause.has_iap) {
    return 0
  }
  
  if (noticeGiven) {
    return 0 // Se dio aviso previo, no hay IAP
  }
  
  return Math.ceil(lastSalaryMonthly) // Redondear hacia arriba
}

/**
 * Función principal que calcula todo el finiquito
 */
export function calculateSettlement(input: SettlementCalculationInput): SettlementCalculationResult {
  // Validar inputs
  const validation = validateSettlementInput(input)
  if (!validation.valid) {
    return {
      service_time: calculateServiceTime(input.contract_start_date, input.termination_date),
      salary_balance: 0,
      vacation_payout: 0,
      ias_amount: 0,
      iap_amount: 0,
      total_earnings: 0,
      loan_balance: input.loan_balance,
      advance_balance: input.advance_balance,
      total_deductions: input.loan_balance + input.advance_balance,
      net_to_pay: 0,
      errors: validation.errors,
      warnings: validation.warnings
    }
  }
  
  // Calcular tiempo de servicio
  const serviceTime = calculateServiceTime(input.contract_start_date, input.termination_date)
  
  // 1. Saldo de sueldo proporcional del último mes
  const salary_balance = Math.ceil((input.last_salary_monthly / 30) * input.worked_days_last_month)
  
  // 2. Pago de vacaciones pendientes
  const vacation_payout = Math.ceil((input.last_salary_monthly / 30) * input.vacation_days_pending)
  
  // 3. Indemnización por años de servicio (IAS)
  const ias_amount = calculateIAS(serviceTime.service_years_capped, input.last_salary_monthly, input.cause)
  
  // 4. Indemnización por aviso previo (IAP)
  const iap_amount = calculateIAP(input.last_salary_monthly, input.notice_given, input.cause)
  
  // 5. Total haberes
  const total_earnings = Math.ceil(salary_balance + vacation_payout + ias_amount + iap_amount)
  
  // 6. Total descuentos
  const loan_balance = Math.ceil(Math.max(0, input.loan_balance))
  const advance_balance = Math.ceil(Math.max(0, input.advance_balance))
  const total_deductions = Math.ceil(loan_balance + advance_balance)
  
  // 7. Líquido a pagar
  const net_to_pay = Math.max(0, Math.ceil(total_earnings - total_deductions))
  
  return {
    service_time: serviceTime,
    salary_balance,
    vacation_payout,
    ias_amount,
    iap_amount,
    total_earnings,
    loan_balance,
    advance_balance,
    total_deductions,
    net_to_pay,
    errors: [],
    warnings: validation.warnings
  }
}

/**
 * Crea un snapshot completo del cálculo para auditoría
 * Guarda todas las variables de entrada y resultados
 */
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
      vacation_days_pending: input.vacation_days_pending,
      cause_code: input.cause_code,
      cause: input.cause,
      notice_given: input.notice_given,
      notice_days: input.notice_days,
      loan_balance: input.loan_balance,
      advance_balance: input.advance_balance
    },
    result: {
      service_time: result.service_time,
      salary_balance: result.salary_balance,
      vacation_payout: result.vacation_payout,
      ias_amount: result.ias_amount,
      iap_amount: result.iap_amount,
      total_earnings: result.total_earnings,
      loan_balance: result.loan_balance,
      advance_balance: result.advance_balance,
      total_deductions: result.total_deductions,
      net_to_pay: result.net_to_pay
    },
    errors: result.errors,
    warnings: result.warnings
  }
}

