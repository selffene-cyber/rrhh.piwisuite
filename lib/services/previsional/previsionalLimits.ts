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

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as supabaseClient } from '@/lib/supabase/client'

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
  supabaseOverride?: SupabaseClient<any>,
): Promise<PrevisionalLimitResult> {
  const client = supabaseOverride || supabaseClient
  const periodDate = `${year}-${month.toString().padStart(2, '0')}-01`

  // 1. Buscar tope validado en prevision_limits
  const { data: limits, error } = await client
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
    // 2. Si no existe tope validated, buscar tope pending como fallback
    const { data: pendingLimits, error: pendingError } = await client
      .from('prevision_limits')
      .select('*')
      .eq('limit_code', limitCode)
      .lte('valid_from', periodDate)
      .or(`valid_to.is.null,valid_to.gte.${periodDate}`)
      .eq('validation_status', 'pending')
      .order('valid_from', { ascending: false })
      .limit(1)

    if (pendingError) {
      console.error('[previsionalLimits] Error querying pending prevision_limits:', pendingError)
    }

    if (pendingLimits && pendingLimits.length > 0) {
      // Usar tope pending como fallback con warning
      const pendingLimit = pendingLimits[0]
      console.warn(`[previsionalLimits] Usando tope PENDING para ${limitCode} en ${month}/${year}: ${pendingLimit.amount}. Se recomienda validar este tope.`)
      return {
        limitCode,
        year,
        month,
        amount: pendingLimit.amount,
        unit: pendingLimit.unit as LimitUnit,
        validFrom: pendingLimit.valid_from,
        validTo: pendingLimit.valid_to,
        legalReference: pendingLimit.legal_reference,
        validationStatus: 'pending' as ValidationStatus,
        blocked: false,
        alertMessage: `Tope ${limitCode} en ${month}/${year} usa valor PENDING (${pendingLimit.amount}). Se recomienda validar.`,
      }
    }

    // 3. Si no existe ningun tope, bloquear
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
      alertMessage: `No existe tope para ${limitCode} en ${month}/${year}. El calculo esta bloqueado hasta que se ingrese un tope.`,
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
  supabaseOverride?: SupabaseClient<any>,
): Promise<Record<string, PrevisionalLimitResult>> {
  const results: Record<string, PrevisionalLimitResult> = {}

  for (const code of limitCodes) {
    results[code] = await getPrevisionalLimit(code, year, month, supabaseOverride)
  }

  return results
}