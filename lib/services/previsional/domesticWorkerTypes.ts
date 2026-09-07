/**
 * Tipos para Trabajadora de Casa Particular
 * Soporta las reglas especiales delCodigo del Trabajo Art. 146-151 bis
 * y la Ley 19.728 (AFC) con tratamiento especial para domestic workers.
 */

// ============================================
// TIPOS DE TRABAJADOR
// ============================================

export type WorkerType = 'REGULAR' | 'DOMESTIC_WORKER'

export type DomesticWorkerMode = 'LIVE_IN' | 'LIVE_OUT'

export type GratificationType = 'NONE' | 'LEGAL_ARTICLE_47' | 'LEGAL_ARTICLE_50' | 'CONTRACTUAL'

export type MinimumWageType = 'FULL' | 'PROPORTIONAL'

export type Law16744Organism = 'MUTUAL' | 'ISL'

// ============================================
// CONCEPTOS DE HABERES CON ATRIBUTOS EXPLICITOS
// ============================================

export type EarningConceptLegalNature = 'taxable' | 'non_taxable'

export interface EarningConceptDefinition {
  code: string
  label: string
  isTaxable: boolean
  isPensionable: boolean
  isHealthBase: boolean
  isAfcBase: boolean
  isLaw16744Base: boolean
  legalNature: EarningConceptLegalNature
  canBeUsedToCompleteMinimumWage: boolean
}

export const EARNING_CONCEPTS: Record<string, EarningConceptDefinition> = {
  SUELDO_BASE: {
    code: 'SUELDO_BASE',
    label: 'Sueldo Base',
    isTaxable: true,
    isPensionable: true,
    isHealthBase: true,
    isAfcBase: true,
    isLaw16744Base: true,
    legalNature: 'taxable',
    canBeUsedToCompleteMinimumWage: true,
  },
  GRATIFICATION_LEGAL_ART_50: {
    code: 'GRATIFICATION_LEGAL_ART_50',
    label: 'Gratificacion Legal Art. 50',
    isTaxable: true,
    isPensionable: true,
    isHealthBase: true,
    isAfcBase: true,
    isLaw16744Base: true,
    legalNature: 'taxable',
    canBeUsedToCompleteMinimumWage: true,
  },
  GRATIFICATION_LEGAL_ART_47: {
    code: 'GRATIFICATION_LEGAL_ART_47',
    label: 'Gratificacion Legal Art. 47',
    isTaxable: true,
    isPensionable: true,
    isHealthBase: true,
    isAfcBase: true,
    isLaw16744Base: true,
    legalNature: 'taxable',
    canBeUsedToCompleteMinimumWage: true,
  },
  GRATIFICATION_CONTRACTUAL: {
    code: 'GRATIFICATION_CONTRACTUAL',
    label: 'Gratificacion Contractual',
    isTaxable: true,
    isPensionable: true,
    isHealthBase: true,
    isAfcBase: true,
    isLaw16744Base: true,
    legalNature: 'taxable',
    canBeUsedToCompleteMinimumWage: true,
  },
  BONUSES: {
    code: 'BONUSES',
    label: 'Bonos',
    isTaxable: true,
    isPensionable: true,
    isHealthBase: true,
    isAfcBase: true,
    isLaw16744Base: true,
    legalNature: 'taxable',
    canBeUsedToCompleteMinimumWage: false,
  },
  OVERTIME: {
    code: 'OVERTIME',
    label: 'Horas Extras',
    isTaxable: true,
    isPensionable: true,
    isHealthBase: true,
    isAfcBase: true,
    isLaw16744Base: true,
    legalNature: 'taxable',
    canBeUsedToCompleteMinimumWage: false,
  },
  VACATION: {
    code: 'VACATION',
    label: 'Vacaciones',
    isTaxable: true,
    isPensionable: true,
    isHealthBase: true,
    isAfcBase: true,
    isLaw16744Base: true,
    legalNature: 'taxable',
    canBeUsedToCompleteMinimumWage: false,
  },
  MOVILIZACION: {
    code: 'MOVILIZACION',
    label: 'Movilizacion',
    isTaxable: false,
    isPensionable: false,
    isHealthBase: false,
    isAfcBase: false,
    isLaw16744Base: false,
    legalNature: 'non_taxable',
    canBeUsedToCompleteMinimumWage: false,
  },
  COLACION: {
    code: 'COLACION',
    label: 'Colacion',
    isTaxable: false,
    isPensionable: false,
    isHealthBase: false,
    isAfcBase: false,
    isLaw16744Base: false,
    legalNature: 'non_taxable',
    canBeUsedToCompleteMinimumWage: false,
  },
  AGUINALDO: {
    code: 'AGUINALDO',
    label: 'Aguinaldo',
    isTaxable: false,
    isPensionable: false,
    isHealthBase: false,
    isAfcBase: false,
    isLaw16744Base: false,
    legalNature: 'non_taxable',
    canBeUsedToCompleteMinimumWage: false,
  },
}

// ============================================
// CONFIGURACION DE CASA PARTICULAR
// ============================================

export interface DomesticWorkerConfig {
  workerType: WorkerType
  domesticWorkerMode?: DomesticWorkerMode
  gratificationType: GratificationType
  weeklyHours?: number
  maxWeeklyHours: number
  minimumWageType: MinimumWageType
  law16744Organism?: Law16744Organism
  law16744Rate?: number
  law16744AdditionalRate?: number
  targetNetSalary?: number
}

export const DEFAULT_DOMESTIC_WORKER_CONFIG: DomesticWorkerConfig = {
  workerType: 'DOMESTIC_WORKER',
  domesticWorkerMode: 'LIVE_OUT',
  gratificationType: 'NONE',
  weeklyHours: 26.25,
  maxWeeklyHours: 42,
  minimumWageType: 'PROPORTIONAL',
  law16744Organism: 'ISL',
  law16744Rate: 0.93,
  law16744AdditionalRate: 0,
  targetNetSalary: undefined,
}

export const DEFAULT_REGULAR_WORKER_CONFIG: DomesticWorkerConfig = {
  workerType: 'REGULAR',
  gratificationType: 'LEGAL_ARTICLE_50',
  maxWeeklyHours: 42,
  minimumWageType: 'FULL',
}

// ============================================
// RESULTADO DE VALIDACION DE SALARIO MINIMO
// ============================================

export interface MinimumWageValidation {
  isValid: boolean
  minimumWageType: MinimumWageType
  immValue: number
  weeklyHours?: number
  maxWeeklyHours: number
  proportionalMinimumWage?: number
  actualBaseSalary: number
  shortfall?: number
  error?: string
}

// ============================================
// RESULTADO DE CALCULO INVERSO (LIQUIDO -> BRUTO)
// ============================================

export interface GrossUpResult {
  targetNetSalary: number
  nonTaxableTotal: number
  grossTaxable: number
  employeeDeductionRate: number
  employeeDeductions: {
    pensionObligatory: number
    pensionCommission: number
    health: number
    afc: number
    uniqueTax: number
    total: number
  }
  employerContributions: {
    afc: number
    afcRate: number
    indemnization: number
    indemnizationRate: number
    law16744: number
    law16744Rate: number
    pensionReform: number
    pensionReformRate: number
    total: number
  }
  netPay: number
  roundingDifference: number
}

// ============================================
// CONCEPTOS PREVISIONALES PARA CASA PARTICULAR
// ============================================

export const DOMESTIC_WORKER_PREVISIONAL_CONCEPTS = {
  AFC_WORKER: 'AFC_TRABAJADOR_CASA_PARTICULAR',
  AFC_EMPLOYER: 'AFC_EMPLEADOR_CASA_PARTICULAR',
  INDEMNIZATION: 'INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR',
  LAW16744_ISL: 'LEY16744_ISL_CASA_PARTICULAR',
  EMPLOYER_PENSION_REFORM_TOTAL: 'EMPLOYER_PENSION_REFORM_TOTAL',
} as const

// ============================================
// FUNCIONES HELPER
// ============================================

export function isDomesticWorker(workerType?: WorkerType | string): boolean {
  return workerType === 'DOMESTIC_WORKER'
}

export function shouldCalculateGratification(gratificationType?: GratificationType | string): boolean {
  return gratificationType !== 'NONE' && gratificationType !== undefined && gratificationType !== null
}

export function calculateProportionalMinimumWage(
  immValue: number,
  weeklyHours: number,
  maxWeeklyHours: number
): number {
  return Math.round(immValue * weeklyHours / maxWeeklyHours)
}