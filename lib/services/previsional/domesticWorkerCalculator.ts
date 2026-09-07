/**
 * Motor de calculo para Trabajadora de Casa Particular
 * Soporta calculo directo (bruto -> liquido) e inverso (liquido -> bruto)
 * Validaciones de salario minimo proporcional
 */

import type {
  WorkerType,
  GratificationType,
  MinimumWageType,
  Law16744Organism,
  MinimumWageValidation,
  GrossUpResult,
  DomesticWorkerConfig,
} from './domesticWorkerTypes'

import {
  DEFAULT_DOMESTIC_WORKER_CONFIG,
  calculateProportionalMinimumWage,
} from './domesticWorkerTypes'

// ============================================
// CALCULO INVERSO: LIQUIDO OBJETIVO -> BRUTO NECESARIO
// ============================================

export interface GrossUpInput {
  targetNetSalary: number
  nonTaxableTotal: number
  pensionObligatoryRate: number
  pensionCommissionRate: number
  healthRate: number
  afcRate: number
  uniqueTaxFn?: (taxableIncome: number) => number
}

export function calculateGrossFromNetSalary(input: GrossUpInput): GrossUpResult {
  const {
    targetNetSalary,
    nonTaxableTotal,
    pensionObligatoryRate,
    pensionCommissionRate,
    healthRate,
    afcRate,
    uniqueTaxFn,
  } = input

  const totalEmployeeRate = (pensionObligatoryRate + pensionCommissionRate + healthRate + afcRate) / 100

  // Estimacion inicial sin impuesto unico
  let grossTaxable = Math.round((targetNetSalary - nonTaxableTotal) / (1 - totalEmployeeRate))

  // Iterar para converger con impuesto unico si se proporciona la funcion
  if (uniqueTaxFn) {
    for (let i = 0; i < 10; i++) {
      const taxableIncome = grossTaxable
      const pension = Math.ceil(grossTaxable * (pensionObligatoryRate / 100))
        + Math.ceil(grossTaxable * (pensionCommissionRate / 100))
      const health = Math.ceil(grossTaxable * (healthRate / 100))
      const afc = Math.ceil(grossTaxable * (afcRate / 100))
      const uniqueTax = uniqueTaxFn(taxableIncome - pension - health - afc)

      const totalDeductions = pension + health + afc + uniqueTax
      const netPay = grossTaxable + nonTaxableTotal - totalDeductions

      if (netPay === targetNetSalary) break

      // Ajustar grossTaxable por la diferencia
      const diff = targetNetSalary - netPay
      grossTaxable = grossTaxable + Math.round(diff)

      if (Math.abs(diff) <= 1) break
    }
  }

  // Calculo final con los montos redondeados
  const pensionObligatory = Math.ceil(grossTaxable * (pensionObligatoryRate / 100))
  const pensionCommission = Math.ceil(grossTaxable * (pensionCommissionRate / 100))
  const health = Math.ceil(grossTaxable * (healthRate / 100))
  const afc = Math.ceil(grossTaxable * (afcRate / 100))

  let uniqueTax = 0
  if (uniqueTaxFn) {
    const taxableIncome = grossTaxable - pensionObligatory - pensionCommission - health - afc
    uniqueTax = uniqueTaxFn(taxableIncome)
  }

  const totalDeductions = pensionObligatory + pensionCommission + health + afc + uniqueTax
  const netPay = grossTaxable + nonTaxableTotal - totalDeductions
  const roundingDifference = targetNetSalary - netPay

  // Si hay diferencia de redondeo, ajustar el sueldo base
  if (roundingDifference !== 0) {
    grossTaxable = grossTaxable + roundingDifference
  }

  return {
    targetNetSalary,
    nonTaxableTotal,
    grossTaxable,
    employeeDeductionRate: totalEmployeeRate * 100,
    employeeDeductions: {
      pensionObligatory,
      pensionCommission,
      health,
      afc,
      uniqueTax,
      total: pensionObligatory + pensionCommission + health + afc + uniqueTax,
    },
    employerContributions: {
      afc: 0,
      afcRate: 0,
      indemnization: 0,
      indemnizationRate: 0,
      law16744: 0,
      law16744Rate: 0,
      pensionReform: 0,
      pensionReformRate: 0,
      total: 0,
    },
    netPay: grossTaxable + nonTaxableTotal - totalDeductions,
    roundingDifference: roundingDifference,
  }
}

// ============================================
// CALCULO INVERSO PARA CASA PARTICULAR
// ============================================

export interface DomesticWorkerGrossUpInput {
  targetNetSalary: number
  nonTaxableTotal: number
  pensionObligatoryRate: number
  pensionCommissionRate: number
  healthRate: number
  afcRate: number
  afcEmployerRate: number
  indemnizationRate: number
  law16744Rate: number
  pensionReformRate: number
  uniqueTaxFn?: (taxableIncome: number) => number
}

export function calculateDomesticWorkerGrossFromNet(input: DomesticWorkerGrossUpInput): GrossUpResult {
  const {
    targetNetSalary,
    nonTaxableTotal,
    pensionObligatoryRate,
    pensionCommissionRate,
    healthRate,
    afcRate,
    afcEmployerRate,
    indemnizationRate,
    law16744Rate,
    pensionReformRate,
    uniqueTaxFn,
  } = input

  // AFC trabajador = 0 para casa particular
  const effectiveAfcRate = 0
  const totalEmployeeRate = (pensionObligatoryRate + pensionCommissionRate + healthRate + effectiveAfcRate) / 100

  // Estimacion inicial sin impuesto unico
  let grossTaxable = Math.round((targetNetSalary - nonTaxableTotal) / (1 - totalEmployeeRate))

  // Iterar para converger con impuesto unico
  if (uniqueTaxFn) {
    for (let i = 0; i < 10; i++) {
      const pension = Math.ceil(grossTaxable * (pensionObligatoryRate / 100))
        + Math.ceil(grossTaxable * (pensionCommissionRate / 100))
      const health = Math.ceil(grossTaxable * (healthRate / 100))
      const afc = 0 // Casa particular: AFC trabajador = 0

      const taxableIncome = grossTaxable - pension - health - afc
      const uniqueTax = uniqueTaxFn(taxableIncome)

      const totalDeductions = pension + health + afc + uniqueTax
      const netPay = grossTaxable + nonTaxableTotal - totalDeductions

      if (netPay === targetNetSalary) break

      const diff = targetNetSalary - netPay
      grossTaxable = grossTaxable + Math.round(diff)

      if (Math.abs(diff) <= 1) break
    }
  }

  // Calculo final
  const pensionObligatory = Math.ceil(grossTaxable * (pensionObligatoryRate / 100))
  const pensionCommission = Math.ceil(grossTaxable * (pensionCommissionRate / 100))
  const health = Math.ceil(grossTaxable * (healthRate / 100))
  const afc = 0

  let uniqueTax = 0
  if (uniqueTaxFn) {
    const taxableIncome = grossTaxable - pensionObligatory - pensionCommission - health - afc
    uniqueTax = uniqueTaxFn(taxableIncome)
  }

  const totalDeductions = pensionObligatory + pensionCommission + health + afc + uniqueTax
  let netPay = grossTaxable + nonTaxableTotal - totalDeductions

  // Ajuste de redondeo
  const roundingDifference = targetNetSalary - netPay
  if (roundingDifference !== 0) {
    grossTaxable = grossTaxable + roundingDifference
    // Recalcular deducciones con el nuevo bruto
    const adjustedPensionObl = Math.ceil(grossTaxable * (pensionObligatoryRate / 100))
    const adjustedPensionCom = Math.ceil(grossTaxable * (pensionCommissionRate / 100))
    const adjustedHealth = Math.ceil(grossTaxable * (healthRate / 100))

    let adjustedUniqueTax = 0
    if (uniqueTaxFn) {
      const taxableIncome = grossTaxable - adjustedPensionObl - adjustedPensionCom - adjustedHealth
      adjustedUniqueTax = uniqueTaxFn(taxableIncome)
    }

    netPay = grossTaxable + nonTaxableTotal - (adjustedPensionObl + adjustedPensionCom + adjustedHealth + adjustedUniqueTax)
  }

  // Contribuciones del empleador
  const afcEmployer = Math.ceil(grossTaxable * (afcEmployerRate / 100))
  const indemnization = Math.ceil(grossTaxable * (indemnizationRate / 100))
  const law16744 = Math.ceil(grossTaxable * (law16744Rate / 100))
  const pensionReform = Math.ceil(grossTaxable * (pensionReformRate / 100))

  return {
    targetNetSalary,
    nonTaxableTotal,
    grossTaxable,
    employeeDeductionRate: totalEmployeeRate * 100,
    employeeDeductions: {
      pensionObligatory,
      pensionCommission,
      health,
      afc: 0,
      uniqueTax,
      total: pensionObligatory + pensionCommission + health + uniqueTax,
    },
    employerContributions: {
      afc: afcEmployer,
      afcRate: afcEmployerRate,
      indemnization,
      indemnizationRate,
      law16744,
      law16744Rate,
      pensionReform,
      pensionReformRate,
      total: afcEmployer + indemnization + law16744 + pensionReform,
    },
    netPay,
    roundingDifference: targetNetSalary - netPay,
  }
}

// ============================================
// VALIDACION DE SALARIO MINIMO PROPORCIONAL
// ============================================

export function validateMinimumWage(
  baseSalary: number,
  minimumWageType: MinimumWageType,
  immValue: number,
  weeklyHours?: number,
  maxWeeklyHours: number = 42,
): MinimumWageValidation {
  if (minimumWageType === 'FULL') {
    const isValid = baseSalary >= immValue
    return {
      isValid,
      minimumWageType: 'FULL',
      immValue,
      maxWeeklyHours,
      actualBaseSalary: baseSalary,
      shortfall: isValid ? 0 : immValue - baseSalary,
      error: isValid ? undefined : `Sueldo base ($${baseSalary}) es inferior al ingreso minimo mensual ($${immValue})`,
    }
  }

  // PROPORTIONAL (casa particular puertas afuera)
  if (!weeklyHours) {
    return {
      isValid: false,
      minimumWageType: 'PROPORTIONAL',
      immValue,
      weeklyHours,
      maxWeeklyHours,
      actualBaseSalary: baseSalary,
      error: 'Se requiere weeklyHours para salario minimo proporcional',
    }
  }

  const proportionalMinimumWage = calculateProportionalMinimumWage(immValue, weeklyHours, maxWeeklyHours)
  const isValid = baseSalary >= proportionalMinimumWage

  return {
    isValid,
    minimumWageType: 'PROPORTIONAL',
    immValue,
    weeklyHours,
    maxWeeklyHours,
    proportionalMinimumWage,
    actualBaseSalary: baseSalary,
    shortfall: isValid ? 0 : proportionalMinimumWage - baseSalary,
    error: isValid
      ? undefined
      : `Sueldo base ($${baseSalary}) es inferior al minimo proporcional ($${proportionalMinimumWage} = $${immValue} x ${weeklyHours}h / ${maxWeeklyHours}h)`,
  }
}

// ============================================
// VALIDACIONES DE CASA PARTICULAR
// ============================================

export interface DomesticWorkerValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateDomesticWorkerPayroll(
  workerType: WorkerType,
  gratificationType: GratificationType,
  afcApplicable: boolean,
  baseSalary: number,
  transportation: number,
  mealAllowance: number,
  immValue: number,
  weeklyHours: number,
  maxWeeklyHours: number,
): DomesticWorkerValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (workerType !== 'DOMESTIC_WORKER') {
    return { isValid: true, errors: [], warnings: [] }
  }

  // 1. Gratificacion automatica prohibida
  if (gratificationType !== 'NONE') {
    errors.push('ERROR: Trabajadora de casa particular no debe tener gratificacion automatica. gratificationType debe ser NONE')
  }

  // 2. AFC trabajador prohibida
  if (afcApplicable) {
    errors.push('ERROR: Trabajadora de casa particular no debe tener descuento AFC trabajador. afcApplicable debe ser FALSE')
  }

  // 3. Sueldo minimo proporcional
  const minWageValidation = validateMinimumWage(
    baseSalary,
    'PROPORTIONAL',
    immValue,
    weeklyHours,
    maxWeeklyHours,
  )
  if (!minWageValidation.isValid) {
    errors.push(minWageValidation.error || 'Sueldo base inferior al minimo proporcional')
  }

  // 4. No permitir completar sueldo base con no imponibles
  if (minWageValidation.proportionalMinimumWage) {
    const minimumWage = minWageValidation.proportionalMinimumWage
    if (baseSalary < minimumWage) {
      if (baseSalary + transportation + mealAllowance >= minimumWage) {
        warnings.push('AVISO: Movilizacion y colacion no deben usarse para completar el sueldo base minimo proporcional')
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}