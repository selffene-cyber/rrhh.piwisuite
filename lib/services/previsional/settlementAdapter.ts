/**
 * Adaptador para el calculador de finiquitos
 * Fase 5: Integracion de la Reforma Previsional 2026
 *
 * Agrega aportes del empleador (SIS, AFP cuenta individual, CRP, AFC)
 * al resultado del calculador de finiquitos existente.
 *
 * REGLAS:
 * - Periodos cerrados: NO se recalculan. Se usa el resultado historico.
 * - Si faltan tasas validated: BLOQUEA obligatoriamente (lanza Error).
 * - Solo fallback legacy por errores tecnicos inesperados.
 */

import { calculatePrevisional } from './previsionalEngine'
import type { CalculationContext, PrevisionalCalculationResult, PreviredIndicators } from './types'

export interface SettlementEmployerContributions {
  sisAmount: number
  sisRate: number
  sisBase: number
  afpEmployerAccountAmount: number
  afpEmployerAccountRate: number
  crpAmount: number
  crpRate: number
  afcEmployerAmount: number
  afcEmployerRate: number
  afcEmployerLabel: string
  totalEmployerContributions: number
  warnings: string[]
}

export interface SettlementPrevisionalInput {
  employeeId: string
  afp?: string | null
  healthSystem?: string | null
  healthPlan?: string | null
  healthPlanPercentage?: number
  previsionalRegime?: string | null
  otherRegimeType?: string | null
  manualPensionRate?: number | null
  manualHealthRate?: number | null
  manualEmployerRate?: number | null
  manualBaseType?: string | null
  contractType?: string | null
  afcApplicable?: boolean
  year: number
  month: number
  taxableBase: number
  indicators?: PreviredIndicators | null
  supabaseClient?: any
}

export async function calculateSettlementEmployerContributions(
  input: SettlementPrevisionalInput,
): Promise<SettlementEmployerContributions> {
  const regime = input.previsionalRegime === 'OTRO_REGIMEN' ? 'OTRO_REGIMEN' as const : 'AFP' as const

  const context: CalculationContext = {
    year: input.year,
    month: input.month,
    employee: {
      id: input.employeeId,
      afp: input.afp ?? undefined,
      healthSystem: input.healthSystem ?? undefined,
      healthPlan: input.healthPlan ?? undefined,
      healthPlanPercentage: input.healthPlanPercentage ?? undefined,
      previsionalRegime: regime,
      otherRegimeType: input.otherRegimeType as any,
      manualPensionRate: input.manualPensionRate ?? undefined,
      manualHealthRate: input.manualHealthRate ?? undefined,
      manualEmployerRate: input.manualEmployerRate ?? undefined,
      manualBaseType: input.manualBaseType as any ?? undefined,
      contractType: input.contractType ?? undefined,
      afcApplicable: input.afcApplicable ?? true,
    },
    taxableEarnings: input.taxableBase,
    baseSalaryProportional: input.taxableBase,
    daysWorked: 30,
    calculationType: 'finiquito',
    indicators: input.indicators ?? null,
    supabaseClient: input.supabaseClient,
  }

  const result = await calculatePrevisional(context)

  if (result.blocked && result.blockedConcepts.length > 0) {
    throw new Error(
      `Calculo de finiquito bloqueado: faltan tasas previsionales validadas para [${result.blockedConcepts.join(', ')}] ` +
      `en ${input.month}/${input.year}. Valide las tasas en la tabla prevision_rates antes de calcular.`
    )
  }

  return {
    sisAmount: result.sisAmount,
    sisRate: result.sisRate,
    sisBase: result.sisBase,
    afpEmployerAccountAmount: result.afpEmployerAccountAmount,
    afpEmployerAccountRate: result.afpEmployerAccountRate,
    crpAmount: result.crpAmount,
    crpRate: result.crpRate,
    afcEmployerAmount: result.afcEmployerAmount,
    afcEmployerRate: result.afcEmployerRate,
    afcEmployerLabel: result.afcEmployerLabel,
    totalEmployerContributions: result.employerContributionsTotal,
    warnings: result.warnings,
  }
}