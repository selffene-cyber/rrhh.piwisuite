/**
 * Funcion centralizada para obtener topes imponibles
 * con vigencia temporal y validacion.
 *
 * Fase 1: Arquitectura de la Reforma Previsional 2026
 *
 * Los topes se almacenan en la tabla prevision_limits
 * y se obtienen de la API de Previred (campos RTIAfpPesos, etc.)
 * como respaldo para validacion.
 */

import type {
  PrevisionalLimitResult,
  ValidationStatus,
  LimitUnit,
  PreviredIndicators,
} from './types'

import { supabase } from '@/lib/supabase/client'

// ============================================
// MAPEO DE CODIGOS DE TOPES A CAMPOS DE LA API
// ============================================

const LIMIT_TO_API_FIELD: Record<string, string> = {
  'RTI_AFP': 'RTIAfpPesos',
  'RTI_IPS': 'RTIIpsPesos',
  'RTI_SEG_CES': 'RTISegCesPesos',
  'UF': 'UFValPeriodo',
  'UTM': 'UTMVal',
  'RMI_TRAB_DEPE': 'RMITrabDepeInd',
}

function parseChileanNumber(str: string | undefined | null): number {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

// ============================================
// FUNCION PRINCIPAL
// ============================================

export async function getPrevisionalLimit(
  limitCode: string,
  year: number,
  month: number,
): Promise<PrevisionalLimitResult> {
  const periodDate = `${year}-${month.toString().padStart(2, '0')}-01`

  // 1. Buscar tope validado en prevision_limits
  const { data: limits, error } = await supabase
    .from('prevision_limits')
    .select('*')
    .eq('limit_code', limitCode)
    .lte('valid_from', periodDate)
    .or(`valid_to.is.null,valid_to.gte.${periodDate}`)
    .eq('validation_status', 'validated')
    .order('valid_from', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[previsionalLimits] Error querying prevision_limits:', error)
  }

  if (!limits || limits.length === 0) {
    // 2. Si no existe tope validado, bloquear
    return {
      limitCode,
      year,
      month,
      amount: null,
      unit: 'pesos' as LimitUnit,
      validFrom: '',
      validTo: null,
      legalReference: null,
      validationStatus: 'pending' as ValidationStatus,
      blocked: true,
      alertMessage: `No existe tope validado para ${limitCode} en ${month}/${year}. El calculo esta bloqueado hasta que se valide un tope.`,
    }
  }

  const limit = limits[0]

  return {
    limitCode,
    year,
    month,
    amount: limit.amount,
    unit: limit.unit as LimitUnit,
    validFrom: limit.valid_from,
    validTo: limit.valid_to,
    legalReference: limit.legal_reference,
    validationStatus: limit.validation_status as ValidationStatus,
    blocked: false,
  }
}

// ============================================
// FUNCION PARA OBTENER TOPE DESDE INDICADORES
// (Usada como fallback cuando no hay tope validado en la tabla)
// ============================================

export function getLimitFromIndicators(
  limitCode: string,
  indicators: PreviredIndicators | null,
): number | null {
  if (!indicators) return null

  const apiField = LIMIT_TO_API_FIELD[limitCode]
  if (!apiField) return null

  const rawValue = (indicators as any)[apiField]
  if (!rawValue) return null

  return parseChileanNumber(rawValue) || null
}

// ============================================
// FUNCION PARA OBTENER MULTIPLES TOPES
// ============================================

export async function getPrevisionalLimits(
  limitCodes: string[],
  year: number,
  month: number,
): Promise<Record<string, PrevisionalLimitResult>> {
  const results: Record<string, PrevisionalLimitResult> = {}

  for (const code of limitCodes) {
    results[code] = await getPrevisionalLimit(code, year, month)
  }

  return results
}