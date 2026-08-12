/**
 * Motor central de cotizaciones previsionales
 * Fase 1: Arquitectura de la Reforma Previsional 2026
 *
 * Este modulo centraliza toda la logica de calculo de cotizaciones previsionales.
 * Los motores V1, V2, finiquitos, reliquidaciones y libro de remuneraciones
 * delegaran a este motor en lugar de calcular directamente.
 *
 * COMPATIBILIDAD: Las firmas publicas existentes no se modifican en esta fase.
 * Este motor se integra en fases posteriores.
 */

import type {
  CalculationContext,
  PrevisionalCalculationResult,
  PrevisionalRateResult,
  PrevisionalLimitResult,
  EmployerContribution,
  PrevisionalConceptCode,
  TaxableBaseType,
  FinancingParty,
  PreviredIndicators,
} from './types'

import { SupabaseClient } from '@supabase/supabase-js'
import { getPrevisionalRate } from './previsionalRates'
import { getPrevisionalLimit } from './previsionalLimits'

// ============================================
// HELPERS
// ============================================

function parseChileanNumber(str: string | undefined | null): number {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

function monthToDate(year: number, month: number): string {
  const m = month.toString().padStart(2, '0')
  return `${year}-${m}-01`
}

// ============================================
// MAPEO DE CONCEPTOS A TOPES IMPONIBLES
// ============================================

const CONCEPT_TO_LIMIT_CODE: Record<PrevisionalConceptCode, string> = {
  'AFP_TRABAJADOR_OBLIGATORIO': 'RTI_AFP',
  'AFP_TRABAJADOR_COMISION': 'RTI_AFP',
  'AFP_TRABAJADOR_CAPITAL': 'RTI_AFP',
  'AFP_TRABAJADOR_CUPRUM': 'RTI_AFP',
  'AFP_TRABAJADOR_HABITAT': 'RTI_AFP',
  'AFP_TRABAJADOR_PLANVITAL': 'RTI_AFP',
  'AFP_TRABAJADOR_PROVIDA': 'RTI_AFP',
  'AFP_TRABAJADOR_MODELO': 'RTI_AFP',
  'AFP_TRABAJADOR_UNO': 'RTI_AFP',
  'AFP_EMPLEADOR_CUENTA_INDIVIDUAL': 'RTI_AFP',
  'SIS': 'RTI_AFP',
  'CRP': 'RTI_AFP',
  'AFC_TRABAJADOR_INDEFINIDO': 'RTI_SEG_CES',
  'AFC_TRABAJADOR_PLAZO_FIJO': 'RTI_SEG_CES',
  'AFC_TRABAJADOR_TEMPORAL': 'RTI_SEG_CES',
  'AFC_EMPLEADOR_INDEFINIDO': 'RTI_SEG_CES',
  'AFC_EMPLEADOR_PLAZO_FIJO': 'RTI_SEG_CES',
  'AFC_EMPLEADOR_TEMPORAL': 'RTI_SEG_CES',
  'FONASA': 'RTI_IPS',
  'ISAPRE': 'RTI_IPS',
  'IMPUESTO_UNICO': 'RTI_IPS',
  'MUTUAL': 'RTI_AFP',
  'LEY_SANNA': 'RTI_AFP',
  'CAJA_COMPENSACION': 'RTI_IPS',
}

const CONCEPT_TO_TAXABLE_BASE_TYPE: Record<PrevisionalConceptCode, TaxableBaseType> = {
  'AFP_TRABAJADOR_OBLIGATORIO': 'imponible_afp',
  'AFP_TRABAJADOR_COMISION': 'imponible_afp',
  'AFP_TRABAJADOR_CAPITAL': 'imponible_afp',
  'AFP_TRABAJADOR_CUPRUM': 'imponible_afp',
  'AFP_TRABAJADOR_HABITAT': 'imponible_afp',
  'AFP_TRABAJADOR_PLANVITAL': 'imponible_afp',
  'AFP_TRABAJADOR_PROVIDA': 'imponible_afp',
  'AFP_TRABAJADOR_MODELO': 'imponible_afp',
  'AFP_TRABAJADOR_UNO': 'imponible_afp',
  'AFP_EMPLEADOR_CUENTA_INDIVIDUAL': 'imponible_afp',
  'SIS': 'imponible_afp',
  'CRP': 'imponible_afp',
  'AFC_TRABAJADOR_INDEFINIDO': 'imponible_seg_ces',
  'AFC_TRABAJADOR_PLAZO_FIJO': 'imponible_seg_ces',
  'AFC_TRABAJADOR_TEMPORAL': 'imponible_seg_ces',
  'AFC_EMPLEADOR_INDEFINIDO': 'imponible_seg_ces',
  'AFC_EMPLEADOR_PLAZO_FIJO': 'imponible_seg_ces',
  'AFC_EMPLEADOR_TEMPORAL': 'imponible_seg_ces',
  'FONASA': 'imponible_ips',
  'ISAPRE': 'imponible_ips',
  'IMPUESTO_UNICO': 'imponible_ips',
  'MUTUAL': 'imponible_afp',
  'LEY_SANNA': 'imponible_afp',
  'CAJA_COMPENSACION': 'imponible_ips',
}

// Conceptos que solo aplican a partir de cierta fecha.
// Si no hay tasa validada para el periodo, NO bloquean el calculo,
// simplemente se omiten del resultado.
const CONCEPTS_WITH_START_DATE: Record<string, string> = {
  'CRP': '2026-08-01',
  'AFP_EMPLEADOR_CUENTA_INDIVIDUAL': '2025-08-01',
}

function isConceptNotYetApplicable(
  conceptCode: PrevisionalConceptCode | string,
  year: number,
  month: number,
): boolean {
  const startDate = CONCEPTS_WITH_START_DATE[conceptCode]
  if (!startDate) return false
  const periodDate = `${year}-${month.toString().padStart(2, '0')}-01`
  return periodDate < startDate
}

// ============================================
// FUNCION PRINCIPAL
// ============================================

export async function calculatePrevisional(
  context: CalculationContext
): Promise<PrevisionalCalculationResult> {
  const {
    year,
    month,
    employee,
    taxableEarnings,
    baseSalaryProportional,
    indicators,
    calculationType,
  } = context

  const supabaseOverride = context.supabaseClient || undefined

  const isSpecialRegime = employee.previsionalRegime === 'OTRO_REGIMEN'
  const blockedConcepts: string[] = []
  const warnings: string[] = []
  const rates: PrevisionalRateResult[] = []
  const limits: PrevisionalLimitResult[] = []

  // Calcular bases imponibles con topes
  const bases = await calculateTaxableBases(year, month, taxableEarnings, baseSalaryProportional, limits, blockedConcepts, supabaseOverride)

  // Resultado por defecto para regimenes especiales
  if (isSpecialRegime) {
    return calculateOtherRegime(context, bases, rates, limits, blockedConcepts, warnings)
  }

  return calculateAFPRegime(context, bases, rates, limits, blockedConcepts, warnings)
}

// ============================================
// CALCULO DE BASES IMPONIBLES CON TOPES
// ============================================

async function calculateTaxableBases(
  year: number,
  month: number,
  taxableEarnings: number,
  baseSalaryProportional: number | undefined,
  limits: PrevisionalLimitResult[],
  blockedConcepts: string[],
  supabaseOverride?: SupabaseClient<any>,
): Promise<{
  imponibleAFP: number
  imponibleIPS: number
  imponibleSegCes: number
  imponibleGeneral: number
}> {
  const limitAFP = await getPrevisionalLimit('RTI_AFP', year, month, supabaseOverride)
  const limitIPS = await getPrevisionalLimit('RTI_IPS', year, month, supabaseOverride)
  const limitSegCes = await getPrevisionalLimit('RTI_SEG_CES', year, month, supabaseOverride)

  limits.push(limitAFP, limitIPS, limitSegCes)

  // Si algun tope esta bloqueado (sin tasa validated), agregar a blockedConcepts
  if (limitAFP.blocked) {
    blockedConcepts.push('RTI_AFP')
  }
  if (limitIPS.blocked) {
    blockedConcepts.push('RTI_IPS')
  }
  if (limitSegCes.blocked) {
    blockedConcepts.push('RTI_SEG_CES')
  }

  // Si el tope esta bloqueado (amount null), usar taxableEarnings como fallback
  // pero el calculo se marcara como bloqueado
  const imponibleAFP = limitAFP.amount
    ? Math.min(taxableEarnings, limitAFP.amount)
    : taxableEarnings

  const imponibleIPS = limitIPS.amount
    ? Math.min(taxableEarnings, limitIPS.amount)
    : taxableEarnings

  const imponibleSegCes = limitSegCes.amount
    ? Math.min(taxableEarnings, limitSegCes.amount)
    : taxableEarnings

  const imponibleGeneral = taxableEarnings

  return { imponibleAFP, imponibleIPS, imponibleSegCes, imponibleGeneral }
}

// ============================================
// CALCULO REGIMEN AFP
// ============================================

async function calculateAFPRegime(
  context: CalculationContext,
  bases: Awaited<ReturnType<typeof calculateTaxableBases>>,
  rates: PrevisionalRateResult[],
  limits: PrevisionalLimitResult[],
  blockedConcepts: string[],
  warnings: string[],
): Promise<PrevisionalCalculationResult> {
  const { year, month, employee, indicators, daysWorked } = context
  const { imponibleAFP, imponibleIPS, imponibleSegCes, imponibleGeneral } = bases

  // AFP trabajador
  const afpName = employee.afp || 'PROVIDA'
  const afpConceptCode = `AFP_TRABAJADOR_${afpName.toUpperCase()}` as PrevisionalConceptCode

  // Obtener tasa AFP trabajador
  const afpTrabResult = await getPrevisionalRate(
    mapAFPNameToConceptCode(afpName),
    year,
    month,
    indicators ?? null,
    context.supabaseClient,
  )
  rates.push(afpTrabResult)

  if (afpTrabResult.blocked) {
    blockedConcepts.push(mapAFPNameToConceptCode(afpName))
  }

  const afpTrabRate = afpTrabResult.rate
  const afpTrabAmount = Math.ceil(imponibleAFP * (afpTrabRate / 100))

  // Separar 10% obligatorio y comision
  const afp10Rate = 10.0
  const afp10Amount = Math.ceil(imponibleAFP * (afp10Rate / 100))
  const afpComisionAmount = Math.ceil(afpTrabAmount - afp10Amount)

  // AFP empleador (cuenta individual 0.1%)
  // Antes de agosto 2025, este concepto no aplica y no bloquea el calculo
  const afpEmplNotApplicable = isConceptNotYetApplicable('AFP_EMPLEADOR_CUENTA_INDIVIDUAL', year, month)
  let afpEmplRate = 0
  let afpEmplAmount = 0

  if (afpEmplNotApplicable) {
    // Concepto no aplica para este periodo, omitir sin bloquear
    warnings.push(`AFP_EMPLEADOR_CUENTA_INDIVIDUAL no aplica para periodos anteriores a agosto 2025`)
  } else {
    const afpEmplResult = await getPrevisionalRate('AFP_EMPLEADOR_CUENTA_INDIVIDUAL', year, month, indicators ?? null, context.supabaseClient)
    rates.push(afpEmplResult)

    if (afpEmplResult.blocked) {
      blockedConcepts.push('AFP_EMPLEADOR_CUENTA_INDIVIDUAL')
    }

    afpEmplRate = afpEmplResult.rate
    afpEmplAmount = Math.ceil(imponibleAFP * (afpEmplRate / 100))
  }

  // SIS
  const sisResult = await getPrevisionalRate('SIS', year, month, indicators ?? null, context.supabaseClient)
  rates.push(sisResult)

  if (sisResult.blocked) {
    blockedConcepts.push('SIS')
  }

  const sisRate = sisResult.rate
  const sisAmount = Math.ceil(imponibleAFP * (sisRate / 100))

  // CRP (solo desde agosto 2026)
  // Antes de agosto 2026, este concepto no aplica y no bloquea el calculo
  const crpNotApplicable = isConceptNotYetApplicable('CRP', year, month)
  let crpRate = 0
  let crpAmount = 0

  if (crpNotApplicable) {
    // Concepto no aplica para este periodo, omitir sin bloquear
    warnings.push(`CRP no aplica para periodos anteriores a agosto 2026`)
  } else {
    const crpResult = await getPrevisionalRate('CRP', year, month, indicators ?? null, context.supabaseClient)
    rates.push(crpResult)

    if (crpResult.blocked) {
      blockedConcepts.push('CRP')
    }

    crpRate = crpResult.rate
    crpAmount = Math.ceil(imponibleAFP * (crpRate / 100))
  }

  // Salud
  let healthAmount = 0
  let healthLabel = ''
  if (employee.healthSystem === 'FONASA') {
    healthLabel = 'FONASA 7%'
    healthAmount = Math.ceil(imponibleIPS * 0.07)
  } else if (employee.healthSystem === 'ISAPRE') {
    healthLabel = `ISAPRE ${employee.healthPlan || ''}`
    const ufValue = indicators ? parseChileanNumber(indicators.UFValPeriodo) : 0
    const healthPlanUF = employee.healthPlanPercentage || 0
    if (healthPlanUF > 0 && ufValue > 0) {
      healthAmount = Math.ceil(healthPlanUF * ufValue)
    } else {
      healthAmount = Math.ceil(imponibleIPS * 0.07)
    }
  }

  // AFC trabajador
  const contractType = employee.contractType || 'indefinido'
  const afcTrabConceptCode = mapContractTypeToAFCConcept(contractType, 'trabajador')
  const afcTrabResult = await getPrevisionalRate(afcTrabConceptCode, year, month, indicators ?? null, context.supabaseClient)
  rates.push(afcTrabResult)

  if (afcTrabResult.blocked) {
    blockedConcepts.push(afcTrabConceptCode)
  }

  const afcTrabRate = afcTrabResult.rate
  const afcTrabAmount = employee.afcApplicable
    ? Math.ceil(imponibleSegCes * (afcTrabRate / 100))
    : 0
  const afcTrabLabel = `AFC Trabajador ${contractType}`

  // AFC empleador
  const afcEmplConceptCode = mapContractTypeToAFCConcept(contractType, 'empleador')
  const afcEmplResult = await getPrevisionalRate(afcEmplConceptCode, year, month, indicators ?? null, context.supabaseClient)
  rates.push(afcEmplResult)

  if (afcEmplResult.blocked) {
    blockedConcepts.push(afcEmplConceptCode)
  }

  const afcEmplRate = afcEmplResult.rate
  const afcEmplAmount = employee.afcApplicable
    ? Math.ceil(imponibleSegCes * (afcEmplRate / 100))
    : 0
  const afcEmplLabel = `AFC Empleador ${contractType}`

  // Aportes del empleador
  const employerContributions: EmployerContribution[] = []

  employerContributions.push({
    concept_code: 'AFP_EMPLEADOR_CUENTA_INDIVIDUAL',
    base_amount: imponibleAFP,
    rate: afpEmplRate,
    amount: afpEmplAmount,
    taxable_base_type: 'imponible_afp',
    source: 'calculation',
  })

  employerContributions.push({
    concept_code: 'SIS',
    base_amount: imponibleAFP,
    rate: sisRate,
    amount: sisAmount,
    taxable_base_type: 'imponible_afp',
    source: 'calculation',
  })

  if (crpAmount > 0) {
    employerContributions.push({
      concept_code: 'CRP',
      base_amount: imponibleAFP,
      rate: crpRate,
      amount: crpAmount,
      taxable_base_type: 'imponible_afp',
      source: 'calculation',
    })
  }

  if (afcEmplAmount > 0) {
    employerContributions.push({
      concept_code: afcEmplConceptCode,
      base_amount: imponibleSegCes,
      rate: afcEmplRate,
      amount: afcEmplAmount,
      taxable_base_type: 'imponible_seg_ces',
      source: 'calculation',
    })
  }

  const employerContributionsTotal = employerContributions.reduce((sum, c) => sum + c.amount, 0)

  // Descuentos del trabajador (SIS NO se incluye - es del empleador)
  const employeeDeductions = {
    pension: afpTrabAmount,
    pensionObligatorio: afp10Amount,
    pensionComision: afpComisionAmount,
    health: healthAmount,
    healthLabel,
    afcTrabajador: afcTrabAmount,
    afcTrabajadorLabel: afcTrabLabel,
    uniqueTax: 0,
    total: afpTrabAmount + healthAmount + afcTrabAmount,
  }

  const isBlocked = blockedConcepts.length > 0

  return {
    regime: 'AFP',
    regimeType: afpName,
    regimeLabel: `AFP ${afpName}`,
    baseImponibleAFP: imponibleAFP,
    baseImponibleIPS: imponibleIPS,
    baseImponibleSegCes: imponibleSegCes,
    baseImponibleGeneral: imponibleGeneral,
    employeeDeductions,
    employerContributions,
    employerContributionsTotal,
    sisAmount,
    sisRate,
    sisBase: imponibleAFP,
    crpAmount,
    crpRate,
    crpBase: imponibleAFP,
    afpEmployerAccountAmount: afpEmplAmount,
    afpEmployerAccountRate: afpEmplRate,
    afpEmployerAccountBase: imponibleAFP,
    afcEmployerAmount: afcEmplAmount,
    afcEmployerRate: afcEmplRate,
    afcEmployerLabel: afcEmplLabel,
    afcEmployerBase: imponibleSegCes,
    rates,
    limits,
    blocked: isBlocked,
    blockedConcepts,
    warnings,
  }
}

// ============================================
// CALCULO REGIMEN ESPECIAL
// ============================================

async function calculateOtherRegime(
  context: CalculationContext,
  bases: Awaited<ReturnType<typeof calculateTaxableBases>>,
  rates: PrevisionalRateResult[],
  limits: PrevisionalLimitResult[],
  blockedConcepts: string[],
  warnings: string[],
): Promise<PrevisionalCalculationResult> {
  const { year, month, employee, taxableEarnings } = context
  const { imponibleAFP, imponibleIPS, imponibleGeneral } = bases

  const pensionRate = employee.manualPensionRate || 0
  const healthRate = employee.manualHealthRate || 7
  const baseType = employee.manualBaseType || 'imponible'
  const calculationBase = baseType === 'sueldo_base'
    ? (context.baseSalaryProportional || taxableEarnings)
    : taxableEarnings

  const pensionAmount = Math.ceil(calculationBase * (pensionRate / 100))
  const healthAmount = Math.ceil(calculationBase * (healthRate / 100))

  // SIS y CRP no aplican a regimenes especiales
  // AFC no aplica a regimenes especiales

  const employerContributions: EmployerContribution[] = []

  if (employee.manualEmployerRate && employee.manualEmployerRate > 0) {
    const employerPension = Math.ceil(calculationBase * (employee.manualEmployerRate / 100))
    employerContributions.push({
      concept_code: 'AFP_EMPLEADOR_CUENTA_INDIVIDUAL',
      base_amount: calculationBase,
      rate: employee.manualEmployerRate,
      amount: employerPension,
      taxable_base_type: baseType === 'sueldo_base' ? 'sueldo_base' : 'imponible_general',
      source: 'calculation',
    })
  }

  const employerContributionsTotal = employerContributions.reduce((sum, c) => sum + c.amount, 0)

  const regimeLabel = employee.manualRegimeLabel || getRegimeLabelByType(employee.otherRegimeType || 'OTRO')

  const employeeDeductions = {
    pension: pensionAmount,
    pensionObligatorio: pensionAmount,
    pensionComision: 0,
    health: healthAmount,
    healthLabel: `Cotización Salud ${employee.otherRegimeType || ''}`,
    afcTrabajador: 0,
    afcTrabajadorLabel: 'No aplica',
    uniqueTax: 0,
    total: pensionAmount + healthAmount,
  }

  return {
    regime: 'OTRO_REGIMEN',
    regimeType: employee.otherRegimeType || 'OTRO',
    regimeLabel,
    baseImponibleAFP: imponibleAFP,
    baseImponibleIPS: imponibleIPS,
    baseImponibleSegCes: bases.imponibleSegCes,
    baseImponibleGeneral: imponibleGeneral,
    employeeDeductions,
    employerContributions,
    employerContributionsTotal,
    sisAmount: 0,
    sisRate: 0,
    sisBase: 0,
    crpAmount: 0,
    crpRate: 0,
    crpBase: 0,
    afpEmployerAccountAmount: employerContributionsTotal,
    afpEmployerAccountRate: employee.manualEmployerRate || 0,
    afpEmployerAccountBase: calculationBase,
    afcEmployerAmount: 0,
    afcEmployerRate: 0,
    afcEmployerLabel: 'No aplica',
    afcEmployerBase: 0,
    rates,
    limits,
    blocked: false,
    blockedConcepts: [],
    warnings,
  }
}

// ============================================
// HELPERS DE MAPEO
// ============================================

function mapAFPNameToConceptCode(afpName: string): PrevisionalConceptCode {
  return `AFP_TRABAJADOR_${afpName.toUpperCase()}` as PrevisionalConceptCode
}

function mapContractTypeToAFCConcept(contractType: string, party: 'trabajador' | 'empleador'): PrevisionalConceptCode {
  const suffix = party === 'trabajador' ? 'TRABAJADOR' : 'EMPLEADOR'

  switch (contractType) {
    case 'plazo_fijo':
      return `AFC_${suffix}_PLAZO_FIJO` as PrevisionalConceptCode
    case 'temporal':
    case 'otro':
      return `AFC_${suffix}_TEMPORAL` as PrevisionalConceptCode
    default:
      return `AFC_${suffix}_INDEFINIDO` as PrevisionalConceptCode
  }
}

function getRegimeLabelByType(type: string): string {
  const labels: Record<string, string> = {
    'DIPRECA': 'Cotización DIPRECA',
    'CAPREDENA': 'Cotización CAPREDENA',
    'SIN_PREVISION': 'Sin Previsión',
    'OTRO': 'Cotización Previsional',
  }
  return labels[type] || 'Cotización Previsional'
}