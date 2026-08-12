/**
 * Adaptador para el generador del Libro de Remuneraciones
 * Fase 4: Integracion de la Reforma Previsional 2026
 *
 * REGLAS:
 * - Si faltan tasas validated, lanza error (BLOQUEA la generacion del libro).
 * - Solo cae al calculo legacy por errores tecnicos inesperados.
 * - Periodos cerrados NO se recalculan: se usa el resultado historico de la BD.
 */

import type { PrevisionalCalculationResult, EmployerContribution } from './types'
import { calculatePrevisional } from './previsionalEngine'

import type { PreviredIndicators } from '../previredAPI'

interface EmployeeForBook {
  id: string
  afp?: string
  health_system?: string
  health_plan?: string
  health_plan_percentage?: number
  previsional_regime?: string
  other_regime_type?: string
  manual_pension_rate?: number
  manual_health_rate?: number
  manual_employer_rate?: number
  manual_base_type?: string
  manual_regime_label?: string
  contract_type?: string
  afc_applicable?: boolean
}

export interface EmployerContributionsForBook {
  afpAccount: number
  sis: number
  crp: number
  afc: number
  total: number
  blocked: boolean
  blockedConcepts: string[]
}

export async function getEmployerContributionsForBookEntry(
  employee: EmployeeForBook,
  year: number,
  month: number,
  taxableBase: number,
  indicators: PreviredIndicators | null,
  supabaseOverride?: any,
): Promise<EmployerContributionsForBook> {
  const regime = employee.previsional_regime === 'OTRO_REGIMEN' ? 'OTRO_REGIMEN' : 'AFP'

  const context = {
    year,
    month,
    employee: {
      id: employee.id,
      afp: employee.afp,
      healthSystem: employee.health_system,
      healthPlan: employee.health_plan,
      healthPlanPercentage: employee.health_plan_percentage,
      previsionalRegime: regime as 'AFP' | 'OTRO_REGIMEN',
      otherRegimeType: employee.other_regime_type as 'DIPRECA' | 'CAPREDENA' | 'SIN_PREVISION' | 'OTRO' | null | undefined,
      manualPensionRate: employee.manual_pension_rate,
      manualHealthRate: employee.manual_health_rate,
      manualEmployerRate: employee.manual_employer_rate,
      manualBaseType: employee.manual_base_type as 'imponible' | 'sueldo_base' | undefined,
      manualRegimeLabel: employee.manual_regime_label,
      contractType: employee.contract_type,
      afcApplicable: employee.afc_applicable ?? true,
    },
    taxableEarnings: taxableBase,
    baseSalaryProportional: taxableBase,
    daysWorked: 30,
    calculationType: 'libro_remuneraciones' as const,
    indicators: indicators as any,
    supabaseClient: supabaseOverride,
  }

  const result = await calculatePrevisional(context)

  if (result.blocked && result.blockedConcepts.length > 0) {
    // BLOQUEO: Faltan tasas validated. Retornar resultado parcial con blocked=true.
    // El generador del libro DEBE decidir si bloquea o usa legacy.
    return {
      afpAccount: 0,
      sis: 0,
      crp: 0,
      afc: 0,
      total: 0,
      blocked: true,
      blockedConcepts: result.blockedConcepts,
    }
  }

  const contributions = result.employerContributions
  let afpAccount = 0
  let sis = 0
  let crp = 0
  let afc = 0

  for (const c of contributions) {
    switch (c.concept_code) {
      case 'AFP_EMPLEADOR_CUENTA_INDIVIDUAL':
        afpAccount = c.amount
        break
      case 'SIS':
        sis = c.amount
        break
      case 'CRP':
        crp = c.amount
        break
      default:
        if (c.concept_code.startsWith('AFC_EMPLEADOR')) {
          afc += c.amount
        }
        break
    }
  }

  return {
    afpAccount,
    sis,
    crp,
    afc,
    total: contributions.reduce((sum, c) => sum + c.amount, 0),
    blocked: false,
    blockedConcepts: [],
  }
}