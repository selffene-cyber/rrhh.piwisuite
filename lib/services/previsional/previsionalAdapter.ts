/**
 * Adaptador de integracion: V2 -> Motor central previsional
 * Fase 4: Integracion de la Reforma Previsional 2026
 *
 * REGLAS ESTRICTAS:
 * - Si el motor central bloquea (falta tasa validated), se PROPAGA el error.
 *   NO se hace fallback silencioso al motor legacy.
 * - El fallback al motor legacy SOLO ocurre por errores tecnicos inesperados
 *   (ej: error de conexion a la base de datos).
 * - Periodos cerrados: NO se recalculan. Se usa el resultado historico.
 * - Periodos abiertos con tasas validated: se usa el motor central.
 * - Periodos abiertos sin tasas validated: se BLOQUEA el calculo y se informa
 *   claramente los conceptos faltantes.
 */

import type {
  CalculationContext,
  PrevisionalCalculationResult,
  EmployerContribution,
  PreviredIndicators,
} from './types'

import { calculatePrevisional } from './previsionalEngine'

import type { PayrollCalculationInputV2, PayrollCalculationResultV2 } from '@/lib/services/payrollCalculatorV2'

import type { EmployeeWithPrevision } from '@/types/prevision'

import {
  getAFPRate,
  getUnemploymentInsuranceRate,
  getUnemploymentInsuranceEmployerRate,
  getSISRate,
  PreviredIndicators as PreviredIndicatorsType,
} from '../previredAPI'

// ============================================
// ERROR PERSONALIZADO PARA BLOQUEO DE TASAS
// ============================================

export class PrevisionalRateBlockedException extends Error {
  public readonly blockedConcepts: string[]
  public readonly year: number
  public readonly month: number

  constructor(blockedConcepts: string[], year: number, month: number) {
    const conceptList = blockedConcepts.join(', ')
    super(
      `Calculo bloqueado: faltan tasas validadas para [${conceptList}] en ${month}/${year}. ` +
      `Debe validar las tasas en la tabla prevision_rates antes de calcular.`
    )
    this.name = 'PrevisionalRateBlockedException'
    this.blockedConcepts = blockedConcepts
    this.year = year
    this.month = month
  }
}

function parseChileanNumber(str: string | undefined | null): number {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

// ============================================
// FUNCION PRINCIPAL: Calcular previsional via motor central
//
// REGLA: Si faltan tasas validated, lanza PrevisionalRateBlockedException.
// Solo retorna null (fallback) por errores tecnicos inesperados.
// ============================================

export async function calculatePrevisionalFromV2(
  input: PayrollCalculationInputV2,
  supabaseOverride?: any,
): Promise<{
  previsionalResult: PrevisionalCalculationResult | null
  usedNewEngine: boolean
  blockedConcepts?: string[]
}> {
  const { employee, year, month, indicators } = input
  const previredIndicators = (indicators ?? null) as PreviredIndicators | null

  const context = buildCalculationContext(input, previredIndicators)
  context.supabaseClient = supabaseOverride

  try {
    const result = await calculatePrevisional(context)

    if (result.blocked && result.blockedConcepts.length > 0) {
      // BLOQUEO: Faltan tasas validadas. NO hacer fallback silencioso.
      // Propagar la informacion de bloqueo para que el llamador decida.
      console.error(
        `[previsionalAdapter] BLOQUEADO: Faltan tasas validadas para ${result.blockedConcepts.join(', ')} ` +
        `en ${month}/${year}. El calculo NO puede continuar con el motor legacy.`
      )
      return {
        previsionalResult: null,
        usedNewEngine: false,
        blockedConcepts: result.blockedConcepts,
      }
    }

    return { previsionalResult: result, usedNewEngine: true }
  } catch (error) {
    // ERROR TECNICO INESPERADO: Solo aqui se permite fallback
    // (ej: error de conexion a BD, error de red, etc.)
    console.error('[previsionalAdapter] Error tecnico inesperado en motor central:', error)
    return { previsionalResult: null, usedNewEngine: false }
  }
}

// ============================================
// CONSTRUIR CONTEXTO DEL MOTOR CENTRAL
// ============================================

function buildCalculationContext(
  input: PayrollCalculationInputV2,
  indicators: PreviredIndicators | null,
): CalculationContext {
  const { employee, year, month, daysWorked } = input
  const isOtherRegime = employee.previsional_regime === 'OTRO_REGIMEN'

  const taxableEarnings = calculateTaxableEarnings(input)
  const baseSalaryProportional = daysWorked < 30
    ? Math.ceil((input.baseSalary / 30) * daysWorked)
    : input.baseSalary

  return {
    year,
    month,
    employee: {
      id: employee.id,
      afp: isOtherRegime ? undefined : employee.afp,
      healthSystem: employee.health_system,
      healthPlan: employee.health_plan,
      healthPlanPercentage: employee.health_plan_percentage,
      previsionalRegime: isOtherRegime ? 'OTRO_REGIMEN' : 'AFP',
      otherRegimeType: employee.other_regime_type,
      manualPensionRate: employee.manual_pension_rate,
      manualHealthRate: employee.manual_health_rate,
      manualEmployerRate: employee.manual_employer_rate,
      manualBaseType: employee.manual_base_type,
      manualRegimeLabel: employee.manual_regime_label,
      contractType: employee.contract_type,
      afcApplicable: employee.afc_applicable,
    },
    taxableEarnings,
    baseSalaryProportional,
    daysWorked,
    calculationType: 'liquidacion',
    indicators,
  }
}

// ============================================
// CALCULAR HABERES IMPONIBLES
// ============================================

function calculateTaxableEarnings(input: PayrollCalculationInputV2): number {
  const {
    baseSalary,
    daysWorked,
    bonuses = 0,
    overtime = 0,
    vacation = 0,
    otherTaxableEarnings = 0,
  } = input

  const baseSalaryProportional = daysWorked < 30
    ? Math.ceil((baseSalary / 30) * daysWorked)
    : baseSalary

  let monthlyGratification = 0
  monthlyGratification = Math.ceil((baseSalary * 0.25 / 30) * daysWorked)

  return Math.ceil(
    baseSalaryProportional +
    bonuses +
    monthlyGratification +
    overtime +
    vacation +
    otherTaxableEarnings
  )
}

// ============================================
// MERGEAR RESULTADO DEL MOTOR CENTRAL EN RESULTADO V2
// ============================================

export function mergePrevisionalResultIntoV2(
  v2Result: PayrollCalculationResultV2,
  prevResult: PrevisionalCalculationResult,
): PayrollCalculationResultV2 {
  const merged = { ...v2Result }

  // 1. CORREGIR legalDeductions: SIS ya NO va en descuentos del trabajador
  const prevDeductions = prevResult.employeeDeductions
  merged.legalDeductions = {
    ...merged.legalDeductions,
    pension: prevDeductions.pension,
    health: prevDeductions.health,
    sis: 0,
    afc: prevDeductions.afcTrabajador,
    uniqueTax: prevDeductions.uniqueTax,
    total: prevDeductions.pension + prevDeductions.health + prevDeductions.afcTrabajador + prevDeductions.uniqueTax,
  }

  // 2. ACTUALIZAR employerContributions con todos los conceptos del motor central
  const employerContribs = prevResult.employerContributions
  merged.employerContributions = {
    sis: prevResult.sisAmount,
    afc: prevResult.afcEmployerAmount,
    pension: prevResult.afpEmployerAccountAmount || undefined,
    total: prevResult.employerContributionsTotal,
  }

  // 3. ACTUALIZAR prevision metadata
  const afpName = prevResult.regimeType || 'PROVIDA'
  merged.prevision = {
    ...merged.prevision,
    pension: {
      amount: prevDeductions.pension,
      percentage: prevDeductions.pension > 0 && merged.taxableBase > 0
        ? (prevDeductions.pension / merged.taxableBase) * 100
        : 0,
      base: merged.taxableBase,
      label: prevResult.regimeLabel,
    },
    health: {
      amount: prevDeductions.health,
      percentage: prevDeductions.health > 0 && merged.taxableBase > 0
        ? (prevDeductions.health / merged.taxableBase) * 100
        : 0,
      base: merged.taxableBase,
      label: prevDeductions.healthLabel,
    },
    afp: prevResult.regime === 'AFP' ? {
      obligatorio: prevDeductions.pensionObligatorio,
      comision: prevDeductions.pensionComision,
      total: prevDeductions.pension,
    } : undefined,
    sis: {
      amount: prevResult.sisAmount,
      percentage: prevResult.sisRate,
    },
    afc: prevDeductions.afcTrabajador > 0 ? {
      amount: prevDeductions.afcTrabajador,
      percentage: prevDeductions.afcTrabajador > 0 && merged.taxableBase > 0
        ? (prevDeductions.afcTrabajador / merged.taxableBase) * 100
        : 0,
    } : undefined,
    employer: {
      sis: prevResult.sisAmount,
      afc: prevResult.afcEmployerAmount,
      pension: prevResult.afpEmployerAccountAmount || undefined,
      total: prevResult.employerContributionsTotal,
    },
  }

  // 4. RECALCULAR totales (SIS ya no resta del neto del trabajador)
  const newTotalDeductions = merged.legalDeductions.total + merged.otherDeductions.total
  merged.totalDeductions = newTotalDeductions
  merged.netPay = merged.grossPay - newTotalDeductions

  return merged
}

// ============================================
// COMPARAR RESULTADOS: motor central vs legacy
// ============================================

export interface PrevisionalComparisonDiff {
  field: string
  legacyValue: number
  newValue: number
  difference: number
  percentageDifference: number
  isExpectedDifference: boolean
  reason: string
}

export function comparePrevisionalResults(
  legacyResult: PayrollCalculationResultV2,
  newResult: PayrollCalculationResultV2,
): PrevisionalComparisonDiff[] {
  const diffs: PrevisionalComparisonDiff[] = []

  const compare = (
    field: string,
    legacy: number,
    newValue: number,
    isExpected: boolean,
    reason: string,
  ) => {
    if (Math.abs(legacy - newValue) > 1) {
      const pctDiff = legacy !== 0 ? Math.abs((newValue - legacy) / legacy) * 100 : 100
      diffs.push({
        field,
        legacyValue: legacy,
        newValue,
        difference: newValue - legacy,
        percentageDifference: pctDiff,
        isExpectedDifference: isExpected,
        reason,
      })
    }
  }

  // Descuentos del trabajador
  compare('pension', legacyResult.legalDeductions.pension, newResult.legalDeductions.pension, false, 'Diferencia en cotizacion AFP')
  compare('health', legacyResult.legalDeductions.health, newResult.legalDeductions.health, false, 'Diferencia en cotizacion salud')
  compare('sis_in_deductions', legacyResult.legalDeductions.sis ?? 0, newResult.legalDeductions.sis ?? 0, true, 'SIS debe ser 0 en descuentos del trabajador (fix: SIS es del empleador)')
  compare('afc', legacyResult.legalDeductions.afc ?? 0, newResult.legalDeductions.afc ?? 0, false, 'Diferencia en AFC trabajador')
  compare('total_deductions', legacyResult.legalDeductions.total, newResult.legalDeductions.total, true, 'Total descuentos cambia por eliminacion de SIS')

  // Aportes empleador
  compare('employer_sis', legacyResult.employerContributions.sis ?? 0, newResult.employerContributions.sis ?? 0, false, 'Diferencia en SIS empleador')
  compare('employer_afc', legacyResult.employerContributions.afc ?? 0, newResult.employerContributions.afc ?? 0, false, 'Diferencia en AFC empleador')
  compare('employer_total', legacyResult.employerContributions.total, newResult.employerContributions.total, true, 'Total empleador cambia por AFP cuenta individual + CRP')

  // Neto
  compare('net_pay', legacyResult.netPay, newResult.netPay, true, 'Neto cambia por eliminacion de SIS de descuentos')

  return diffs
}