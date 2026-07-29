/**
 * Validacion cruzada de tasas previsionales
 * Compara los valores de la API de Previred con las tasas validadas
 * en la tabla interna prevision_rates.
 *
 * Fase 1: Arquitectura de la Reforma Previsional 2026
 *
 * Reglas:
 * 1. Buscar tasa validada en prevision_rates
 * 2. Si no existe → bloquear calculo
 * 3. Si existe → comparar con API
 * 4. Si API coincide → registrar OK
 * 5. Si API difiere → registrar advertencia, NO bloquear
 * 6. Si API falla → usar tasa validada
 * 7. Si no existe tasa validada → bloquear
 */

import type {
  PrevisionalConceptCode,
  PreviredIndicators,
  ValidationStatus,
  PrevisionalDataSource,
} from './types'

import { getPrevisionalRate } from './previsionalRates'

// ============================================
// RESULTADO DE VALIDACION
// ============================================

export interface PrevisionalValidationResult {
  conceptCode: PrevisionalConceptCode | string
  year: number
  month: number
  rateValidated: number | null
  rateFromApi: number | null
  isConsistent: boolean | null
  isBlocked: boolean
  source: 'previred_api' | 'internal_validated' | 'manual_entry' | 'sii_scraper' | 'none'
  messages: string[]
}

// ============================================
// VALIDACION CRUZADA
// ============================================

export async function validatePrevisionalRate(
  conceptCode: PrevisionalConceptCode | string,
  year: number,
  month: number,
  indicators: PreviredIndicators | null,
): Promise<PrevisionalValidationResult> {
  const result = await getPrevisionalRate(conceptCode, year, month, indicators)

  const messages: string[] = []

  if (result.blocked) {
    messages.push(`BLOQUEADO: No existe tasa validada para ${conceptCode} en ${month}/${year}`)
  }

  if (result.apiValue !== null && result.rate !== null) {
    const diff = Math.abs(result.apiValue - result.rate)
    if (diff > 0.01) {
      messages.push(
        `ADVERTENCIA: ${conceptCode} - API=${result.apiValue}%, Tabla=${result.rate}%. Diferencia: ${diff.toFixed(4)}%. Se usa tasa de la tabla.`
      )
    }
  }

  if (result.apiValue === null && !result.blocked) {
    messages.push(`INFO: No hay valor en API para ${conceptCode} en ${month}/${year}. Se usa tasa validada de la tabla.`)
  }

  return {
    conceptCode: result.conceptCode,
    year: result.year,
    month: result.month,
    rateValidated: result.rate,
    rateFromApi: result.apiValue,
    isConsistent: result.isApiConsistent,
    isBlocked: result.blocked,
    source: result.source,
    messages,
  }
}

// ============================================
// VALIDACION MASIVA PARA UN PERIODO
// ============================================

export async function validateAllRatesForPeriod(
  year: number,
  month: number,
  indicators: PreviredIndicators | null,
): Promise<PrevisionalValidationResult[]> {
  const concepts: PrevisionalConceptCode[] = [
    'AFP_TRABAJADOR_PROVIDA',
    'AFP_EMPLEADOR_CUENTA_INDIVIDUAL',
    'SIS',
    'CRP',
    'AFC_TRABAJADOR_INDEFINIDO',
    'AFC_EMPLEADOR_PLAZO_FIJO',
    'AFC_EMPLEADOR_INDEFINIDO',
    'AFC_EMPLEADOR_TEMPORAL',
    'FONASA',
  ]

  const results: PrevisionalValidationResult[] = []

  for (const concept of concepts) {
    const validation = await validatePrevisionalRate(concept, year, month, indicators)
    results.push(validation)
  }

  return results
}

// ============================================
// VERIFICAR SI UN PERIODO PUEDE CERRARSE
// ============================================

export async function canClosePeriod(
  year: number,
  month: number,
  indicators: PreviredIndicators | null,
): Promise<{ canClose: boolean; blockedConcepts: string[]; warnings: string[] }> {
  const validations = await validateAllRatesForPeriod(year, month, indicators)

  const blockedConcepts: string[] = []
  const warnings: string[] = []

  for (const v of validations) {
    if (v.isBlocked) {
      blockedConcepts.push(v.conceptCode as string)
    }
    if (v.messages.length > 0) {
      warnings.push(...v.messages)
    }
  }

  return {
    canClose: blockedConcepts.length === 0,
    blockedConcepts,
    warnings,
  }
}