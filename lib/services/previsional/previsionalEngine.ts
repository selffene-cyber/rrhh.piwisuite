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
  'AFC_TRABAJADOR_CASA_PARTICULAR': 'RTI_SEG_CES',
  'AFC_EMPLEADOR_INDEFINIDO': 'RTI_SEG_CES',
  'AFC_EMPLEADOR_PLAZO_FIJO': 'RTI_SEG_CES',
  'AFC_EMPLEADOR_TEMPORAL': 'RTI_SEG_CES',
  'AFC_EMPLEADOR_CASA_PARTICULAR': 'RTI_SEG_CES',
  'INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR': 'RTI_SEG_CES',
  'EMPLOYER_PENSION_REFORM_TOTAL': 'RTI_AFP',
  'FONASA': 'RTI_IPS',
  'ISAPRE': 'RTI_IPS',
  'IMPUESTO_UNICO': 'RTI_IPS',
  'MUTUAL': 'RTI_AFP',
  'LEY_SANNA': 'RTI_AFP',
  'LEY16744_ISL_CASA_PARTICULAR': 'RTI_AFP',
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
  'AFC_TRABAJADOR_CASA_PARTICULAR': 'imponible_seg_ces',
  'AFC_EMPLEADOR_INDEFINIDO': 'imponible_seg_ces',
  'AFC_EMPLEADOR_PLAZO_FIJO': 'imponible_seg_ces',
  'AFC_EMPLEADOR_TEMPORAL': 'imponible_seg_ces',
  'AFC_EMPLEADOR_CASA_PARTICULAR': 'imponible_seg_ces',
  'INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR': 'imponible_seg_ces',
  'EMPLOYER_PENSION_REFORM_TOTAL': 'imponible_afp',
  'FONASA': 'imponible_ips',
  'ISAPRE': 'imponible_ips',
  'IMPUESTO_UNICO': 'imponible_ips',
  'MUTUAL': 'imponible_afp',
  'LEY_SANNA': 'imponible_afp',
  'LEY16744_ISL_CASA_PARTICULAR': 'imponible_afp',
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
  const isDomesticWorker = employee.workerType === 'DOMESTIC_WORKER'
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

  // Trabajador de casa particular con AFP
  if (isDomesticWorker) {
    return calculateDomesticWorkerRegime(context, bases, rates, limits, blockedConcepts, warnings)
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
// CALCULO TRABAJADOR DE CASA PARTICULAR
// ============================================

async function calculateDomesticWorkerRegime(
  context: CalculationContext,
  bases: Awaited<ReturnType<typeof calculateTaxableBases>>,
  rates: PrevisionalRateResult[],
  limits: PrevisionalLimitResult[],
  blockedConcepts: string[],
  warnings: string[],
): Promise<PrevisionalCalculationResult> {
  const { year, month, employee, indicators } = context
  const { imponibleAFP, imponibleIPS, imponibleSegCes, imponibleGeneral } = bases

  const afpName = employee.afp || 'UNO'

  // ==========================================
  // 1. AFP TRABAJADOR (ahorro obligatorio + comision)
  // Casa particular usa el mismo sistema AFP que trabajadores regulares
  // ==========================================
  const afpConceptCode = mapAFPNameToConceptCode(afpName)
  const afpTrabResult = await getPrevisionalRate(afpConceptCode, year, month, indicators ?? null, context.supabaseClient)
  rates.push(afpTrabResult)

  if (afpTrabResult.blocked) {
    blockedConcepts.push(afpConceptCode)
  }

  const afpTrabRate = afpTrabResult.rate
  const afpTrabAmount = Math.ceil(imponibleAFP * (afpTrabRate / 100))
  const afp10Rate = 10.0
  const afp10Amount = Math.ceil(imponibleAFP * (afp10Rate / 100))
  const afpComisionAmount = Math.ceil(afpTrabAmount - afp10Amount)

  // ==========================================
  // 2. SALUD (FONASA o ISAPRE - desde tasas versionadas)
  // ==========================================
  let healthAmount = 0
  let healthLabel = ''
  if (employee.healthSystem === 'FONASA') {
    const fonasaResult = await getPrevisionalRate('FONASA', year, month, indicators ?? null, context.supabaseClient)
    rates.push(fonasaResult)
    if (fonasaResult.blocked) blockedConcepts.push('FONASA')
    const fonasaRate = fonasaResult.rate
    healthLabel = `FONASA ${fonasaRate}%`
    healthAmount = Math.ceil(imponibleIPS * (fonasaRate / 100))
  } else if (employee.healthSystem === 'ISAPRE') {
    healthLabel = `ISAPRE ${employee.healthPlan || ''}`
    const ufValue = indicators ? parseChileanNumber(indicators.UFValPeriodo) : 0
    const healthPlanUF = employee.healthPlanPercentage || 0
    if (healthPlanUF > 0 && ufValue > 0) {
      healthAmount = Math.ceil(healthPlanUF * ufValue)
    } else {
      // Fallback a FONASA si no hay datos de ISAPRE
      const fonasaResult = await getPrevisionalRate('FONASA', year, month, indicators ?? null, context.supabaseClient)
      rates.push(fonasaResult)
      if (fonasaResult.blocked) blockedConcepts.push('FONASA')
      healthAmount = Math.ceil(imponibleIPS * (fonasaResult.rate / 100))
    }
  }

  // ==========================================
  // 3. AFC TRABAJADOR = 0% (NO aplica para casa particular)
  // ==========================================
  const afcTrabAmount = 0
  const afcTrabRate = 0
  const afcTrabLabel = 'AFC Trabajador Casa Particular (0%)'

  // ==========================================
  // 4. SIS y CRP - PATRONAL TOTAL UNIFICADA
  // Para casa particular desde agosto 2026, la tasa patronal previsional
  // total es 3.5% (EMPLOYER_PENSION_REFORM_TOTAL) que incluye SIS + CRP + Cuenta Individual.
  // NO se deben sumar SIS y CRP por separado.
  // ==========================================

  const crpNotApplicable = isConceptNotYetApplicable('CRP', year, month)
  const pensionReformNotApplicable = isConceptNotYetApplicable('EMPLOYER_PENSION_REFORM_TOTAL', year, month)

  let sisRate = 0
  let sisAmount = 0
  let crpRate = 0
  let crpAmount = 0
  let afpEmplRate = 0
  let afpEmplAmount = 0
  let pensionReformTotalRate = 0
  let pensionReformTotalAmount = 0
  let pensionReformIncludesSis = false

  if (pensionReformNotApplicable) {
    // Antes de agosto 2026: usar SIS + CRP + Cuenta Individual por separado
    warnings.push('EMPLOYER_PENSION_REFORM_TOTAL no aplica para periodos anteriores a agosto 2026, usando SIS + CRP + Cuenta Individual separados')

    // AFP Empleador Cuenta Individual
    const afpEmplNotApplicable = isConceptNotYetApplicable('AFP_EMPLEADOR_CUENTA_INDIVIDUAL', year, month)
    if (!afpEmplNotApplicable) {
      const afpEmplResult = await getPrevisionalRate('AFP_EMPLEADOR_CUENTA_INDIVIDUAL', year, month, indicators ?? null, context.supabaseClient)
      rates.push(afpEmplResult)
      if (afpEmplResult.blocked) blockedConcepts.push('AFP_EMPLEADOR_CUENTA_INDIVIDUAL')
      afpEmplRate = afpEmplResult.rate
      afpEmplAmount = Math.ceil(imponibleAFP * (afpEmplRate / 100))
    }

    // SIS
    const sisResult = await getPrevisionalRate('SIS', year, month, indicators ?? null, context.supabaseClient)
    rates.push(sisResult)
    if (sisResult.blocked) blockedConcepts.push('SIS')
    sisRate = sisResult.rate
    sisAmount = Math.ceil(imponibleAFP * (sisRate / 100))

    // CRP (si aplica)
    if (!crpNotApplicable) {
      const crpResult = await getPrevisionalRate('CRP', year, month, indicators ?? null, context.supabaseClient)
      rates.push(crpResult)
      if (crpResult.blocked) blockedConcepts.push('CRP')
      crpRate = crpResult.rate
      crpAmount = Math.ceil(imponibleAFP * (crpRate / 100))
    }

    pensionReformIncludesSis = false
  } else {
    // Desde agosto 2026: usar tasa patronal total unificada (3.5%)
    const pensionReformResult = await getPrevisionalRate('EMPLOYER_PENSION_REFORM_TOTAL', year, month, indicators ?? null, context.supabaseClient)
    rates.push(pensionReformResult)
    if (pensionReformResult.blocked) blockedConcepts.push('EMPLOYER_PENSION_REFORM_TOTAL')
    pensionReformTotalRate = pensionReformResult.rate
    pensionReformTotalAmount = Math.ceil(imponibleAFP * (pensionReformTotalRate / 100))
    pensionReformIncludesSis = true

    // No se suman SIS, CRP ni Cuenta Individual por separado
    warnings.push('EMPLOYER_PENSION_REFORM_TOTAL (3.5%) incluye SIS + CRP + Cuenta Individual - no se suman por separado')
  }

  // ==========================================
  // 5. AFC EMPLEADOR CASA PARTICULAR (3%)
  // ==========================================
  const afcEmplResult = await getPrevisionalRate('AFC_EMPLEADOR_CASA_PARTICULAR', year, month, indicators ?? null, context.supabaseClient)
  rates.push(afcEmplResult)
  if (afcEmplResult.blocked) blockedConcepts.push('AFC_EMPLEADOR_CASA_PARTICULAR')

  const afcEmplRate = afcEmplResult.rate
  const afcEmplAmount = Math.ceil(imponibleSegCes * (afcEmplRate / 100))
  const afcEmplLabel = 'AFC Empleador Casa Particular 3%'

  // ==========================================
  // 6. INDEMNIZACION A TODO EVENTO (1.11%)
  // ==========================================
  const indemnizationResult = await getPrevisionalRate('INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR', year, month, indicators ?? null, context.supabaseClient)
  rates.push(indemnizationResult)
  if (indemnizationResult.blocked) blockedConcepts.push('INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR')

  const indemnizationRate = indemnizationResult.rate
  const indemnizationAmount = Math.ceil(imponibleSegCes * (indemnizationRate / 100))

  // ==========================================
  // 7. LEY 16.744 ISL (desde tasas versionadas)
  // ==========================================
  const law16744Result = await getPrevisionalRate('LEY16744_ISL_CASA_PARTICULAR', year, month, indicators ?? null, context.supabaseClient)
  rates.push(law16744Result)
  if (law16744Result.blocked) blockedConcepts.push('LEY16744_ISL_CASA_PARTICULAR')

  const law16744BaseRate = law16744Result.rate
  const law16744AdditionalRate = employee.law16744AdditionalRate ?? 0
  const totalLaw16744Rate = law16744BaseRate + law16744AdditionalRate
  const law16744Amount = Math.ceil(imponibleAFP * (totalLaw16744Rate / 100))

  // ==========================================
  // APORTES DEL EMPLEADOR
  // ==========================================
  const employerContributions: EmployerContribution[] = []

  // AFC Empleador 3%
  employerContributions.push({
    concept_code: 'AFC_EMPLEADOR_CASA_PARTICULAR',
    base_amount: imponibleSegCes,
    rate: afcEmplRate,
    amount: afcEmplAmount,
    taxable_base_type: 'imponible_seg_ces',
    source: 'calculation',
  })

  // Indemnizacion a todo evento 1.11%
  employerContributions.push({
    concept_code: 'INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR',
    base_amount: imponibleSegCes,
    rate: indemnizationRate,
    amount: indemnizationAmount,
    taxable_base_type: 'imponible_seg_ces',
    source: 'calculation',
  })

  // Ley 16.744 ISL
  employerContributions.push({
    concept_code: 'LEY16744_ISL_CASA_PARTICULAR',
    base_amount: imponibleAFP,
    rate: totalLaw16744Rate,
    amount: law16744Amount,
    taxable_base_type: 'imponible_afp',
    source: 'calculation',
  })

  // Aporte previsional patronal
  if (pensionReformIncludesSis) {
    // Tasa total unificada (3.5%)
    employerContributions.push({
      concept_code: 'EMPLOYER_PENSION_REFORM_TOTAL',
      base_amount: imponibleAFP,
      rate: pensionReformTotalRate,
      amount: pensionReformTotalAmount,
      taxable_base_type: 'imponible_afp',
      source: 'calculation',
    })
  } else {
    // Componentes separados (pre agosto 2026)
    if (afpEmplAmount > 0) {
      employerContributions.push({
        concept_code: 'AFP_EMPLEADOR_CUENTA_INDIVIDUAL',
        base_amount: imponibleAFP,
        rate: afpEmplRate,
        amount: afpEmplAmount,
        taxable_base_type: 'imponible_afp',
        source: 'calculation',
      })
    }
    if (sisAmount > 0) {
      employerContributions.push({
        concept_code: 'SIS',
        base_amount: imponibleAFP,
        rate: sisRate,
        amount: sisAmount,
        taxable_base_type: 'imponible_afp',
        source: 'calculation',
      })
    }
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
  }

  const employerContributionsTotal = employerContributions.reduce((sum, c) => sum + c.amount, 0)

  // ==========================================
  // DESCUENTOS DEL TRABAJADOR
  // SIS NO se incluye - es del empleador
  // AFC trabajador = 0 para casa particular
  // ==========================================
  const employeeDeductions = {
    pension: afpTrabAmount,
    pensionObligatorio: afp10Amount,
    pensionComision: afpComisionAmount,
    health: healthAmount,
    healthLabel,
    afcTrabajador: 0,
    afcTrabajadorLabel: 'No aplica (Casa Particular)',
    uniqueTax: 0,
    total: afpTrabAmount + healthAmount,
  }

  const domesticWorkerContributions = {
    afcEmployer: afcEmplAmount,
    afcEmployerRate: afcEmplRate,
    afcEmployerLabel: afcEmplLabel,
    indemnization: indemnizationAmount,
    indemnizationRate,
    indemnizationLabel: `Indemnizacion a todo evento ${indemnizationRate}%`,
    law16744: law16744Amount,
    law16744Rate: totalLaw16744Rate,
    law16744Label: `Ley 16.744 ISL ${totalLaw16744Rate}%`,
    pensionReform: pensionReformTotalAmount,
    pensionReformRate: pensionReformTotalRate,
    pensionReformLabel: pensionReformIncludesSis
      ? `Aporte previsional patronal ${pensionReformTotalRate}% (incluye SIS + CRP + Cta. Individual)`
      : `Aporte previsional patronal componentes separados`,
    pensionReformIncludesSis,
    total: afcEmplAmount + indemnizationAmount + law16744Amount + pensionReformTotalAmount,
  }

  const isBlocked = blockedConcepts.length > 0

  return {
    regime: 'AFP',
    regimeType: afpName,
    regimeLabel: `AFP ${afpName} (Casa Particular)`,
    baseImponibleAFP: imponibleAFP,
    baseImponibleIPS: imponibleIPS,
    baseImponibleSegCes: imponibleSegCes,
    baseImponibleGeneral: imponibleGeneral,
    employeeDeductions,
    employerContributions,
    employerContributionsTotal,
    sisAmount: pensionReformIncludesSis ? 0 : sisAmount,
    sisRate: pensionReformIncludesSis ? 0 : sisRate,
    sisBase: pensionReformIncludesSis ? 0 : imponibleAFP,
    crpAmount: pensionReformIncludesSis ? 0 : crpAmount,
    crpRate: pensionReformIncludesSis ? 0 : crpRate,
    crpBase: pensionReformIncludesSis ? 0 : imponibleAFP,
    afpEmployerAccountAmount: pensionReformIncludesSis ? 0 : afpEmplAmount,
    afpEmployerAccountRate: pensionReformIncludesSis ? 0 : afpEmplRate,
    afpEmployerAccountBase: pensionReformIncludesSis ? 0 : imponibleAFP,
    afcEmployerAmount: afcEmplAmount,
    afcEmployerRate: afcEmplRate,
    afcEmployerLabel: afcEmplLabel,
    afcEmployerBase: imponibleSegCes,
    rates,
    limits,
    blocked: isBlocked,
    blockedConcepts,
    warnings,
    domesticWorkerContributions,
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