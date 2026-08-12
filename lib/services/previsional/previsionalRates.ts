/**
 * Funcion centralizada para obtener tasas previsionales
 * con vigencia temporal y validacion cruzada contra la API.
 *
 * Fase 1: Arquitectura de la Reforma Previsional 2026
 *
 * NUNCA usa tasas hardcodeadas.
 * La fuente de verdad es la tabla prevision_rates en la base de datos.
 * La API solo sirve para validacion, completar y actualizar.
 */

import type {
  PrevisionalConceptCode,
  PrevisionalRateResult,
  PreviredIndicators,
  FinancingParty,
  TaxableBaseType,
  ValidationStatus,
  PrevisionalDataSource,
} from './types'

import { supabase } from '@/lib/supabase/client'

// ============================================
// MAPEO DE CONCEPTOS A CAMPOS DE LA API
// ============================================

const CONCEPT_TO_API_FIELD: Record<string, string> = {
  'SIS': 'TasaSIS',
  'AFC_TRABAJADOR_INDEFINIDO': 'AFCCpiTrabajador',
  'AFC_EMPLEADOR_INDEFINIDO': 'AFCCpiEmpleador',
  'AFC_EMPLEADOR_PLAZO_FIJO': 'AFCCpfEmpleador',
  'AFC_EMPLEADOR_TEMPORAL': 'AFCTcpEmpleador',
}

// AFP mapeo por nombre
const AFP_CONCEPT_TO_API_FIELD: Record<string, string> = {
  'AFP_TRABAJADOR_CAPITAL': 'AFPCapitalTasaDepTrab',
  'AFP_TRABAJADOR_CUPRUM': 'AFPCuprumTasaDepTrab',
  'AFP_TRABAJADOR_HABITAT': 'AFPHabitatTasaDepTrab',
  'AFP_TRABAJADOR_PLANVITAL': 'AFPPlanVitalTasaDepTrab',
  'AFP_TRABAJADOR_PROVIDA': 'AFPProVidaTasaDepTrab',
  'AFP_TRABAJADOR_MODELO': 'AFPModeloTasaDepTrab',
  'AFP_TRABAJADOR_UNO': 'AFPUnoTasaDepTrab',
}

function parseChileanNumber(str: string | undefined | null): number {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

// ============================================
// FUNCION PRINCIPAL
// ============================================

export async function getPrevisionalRate(
  conceptCode: PrevisionalConceptCode | string,
  year: number,
  month: number,
  indicators: PreviredIndicators | null,
): Promise<PrevisionalRateResult> {
  const periodDate = `${year}-${month.toString().padStart(2, '0')}-01`

  // 1. Buscar tasa validada en prevision_rates
  const { data: rates, error } = await supabase
    .from('prevision_rates')
    .select('*')
    .eq('concept_code', conceptCode)
    .lte('valid_from', periodDate)
    .or(`valid_to.is.null,valid_to.gte.${periodDate}`)
    .eq('validation_status', 'validated')
    .order('valid_from', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[previsionalRates] Error querying prevision_rates:', error)
  }

  if (!rates || rates.length === 0) {
    // 2. Si no existe tasa validated, buscar tasa pending como fallback
    const { data: pendingRates, error: pendingError } = await supabase
      .from('prevision_rates')
      .select('*')
      .eq('concept_code', conceptCode)
      .lte('valid_from', periodDate)
      .or(`valid_to.is.null,valid_to.gte.${periodDate}`)
      .eq('validation_status', 'pending')
      .order('valid_from', { ascending: false })
      .limit(1)

    if (pendingError) {
      console.error('[previsionalRates] Error querying pending prevision_rates:', pendingError)
    }

    if (pendingRates && pendingRates.length > 0) {
      // Usar tasa pending como fallback con warning
      const pendingRate = pendingRates[0]
      console.warn(`[previsionalRates] Usando tasa PENDING para ${conceptCode} en ${month}/${year}: ${pendingRate.rate}%. Se recomienda validar esta tasa.`)
      return {
        conceptCode: conceptCode as PrevisionalConceptCode,
        year,
        month,
        rate: pendingRate.rate,
        validFrom: pendingRate.valid_from,
        validTo: pendingRate.valid_to,
        financingParty: pendingRate.financing_party as FinancingParty,
        collectionEntity: pendingRate.collection_entity,
        taxableBaseType: pendingRate.taxable_base_type as TaxableBaseType,
        legalReference: pendingRate.legal_reference,
        source: pendingRate.data_source as PrevisionalDataSource,
        validationStatus: 'pending' as ValidationStatus,
        apiValue: null,
        isApiConsistent: null,
        blocked: false,
        alertMessage: `Tasa ${conceptCode} en ${month}/${year} usa valor PENDING (${pendingRate.rate}%). Se recomienda validar.`,
      }
    }

    // 3. Si no existe ninguna tasa, bloquear
    return {
      conceptCode: conceptCode as PrevisionalConceptCode,
      year,
      month,
      rate: 0,
      validFrom: '',
      validTo: null,
      financingParty: 'empleador' as FinancingParty,
      collectionEntity: '',
      taxableBaseType: 'imponible_general' as TaxableBaseType,
      legalReference: null,
      source: 'internal_validated' as PrevisionalDataSource,
      validationStatus: 'pending' as ValidationStatus,
      apiValue: null,
      isApiConsistent: null,
      blocked: true,
      alertMessage: `No existe tasa para ${conceptCode} en ${month}/${year}. El calculo esta bloqueado hasta que se ingrese una tasa.`,
    }
  }

  const rate = rates[0]

  // 3. Si existe tasa validada, comparar con API si hay campo correspondiente
  let apiValue: number | null = null
  let isApiConsistent: boolean | null = null
  let alertMessage: string | undefined

  const apiFieldName = CONCEPT_TO_API_FIELD[conceptCode] || AFP_CONCEPT_TO_API_FIELD[conceptCode]

  if (indicators && apiFieldName) {
    const apiRawValue = (indicators as any)[apiFieldName]
    if (apiRawValue !== undefined && apiRawValue !== null) {
      apiValue = parseChileanNumber(apiRawValue)

      // Comparar con tolerancia de 0.01%
      const tolerance = 0.01
      isApiConsistent = Math.abs(apiValue - rate.rate) <= tolerance

      if (!isApiConsistent) {
        alertMessage = `Tasa ${conceptCode}: API=${apiValue}%, tabla=${rate.rate}%. Se usa tasa validada de la tabla.`
        console.warn(`[previsionalRates] ${alertMessage}`)
      }
    }
  }

  // Caso especial: SIS usa campo TasaSIS en la API
  if (conceptCode === 'SIS' && indicators?.TasaSIS) {
    apiValue = parseChileanNumber(indicators.TasaSIS)
    const tolerance = 0.01
    isApiConsistent = Math.abs(apiValue - rate.rate) <= tolerance

    if (!isApiConsistent) {
      alertMessage = `Tasa SIS: API=${apiValue}%, tabla=${rate.rate}%. Se usa tasa validada de la tabla.`
      console.warn(`[previsionalRates] ${alertMessage}`)
    }
  }

  return {
    conceptCode: conceptCode as PrevisionalConceptCode,
    year,
    month,
    rate: rate.rate,
    validFrom: rate.valid_from,
    validTo: rate.valid_to,
    financingParty: rate.financing_party as FinancingParty,
    collectionEntity: rate.collection_entity,
    taxableBaseType: rate.taxable_base_type as TaxableBaseType,
    legalReference: rate.legal_reference,
    source: rate.data_source as PrevisionalDataSource,
    validationStatus: rate.validation_status as ValidationStatus,
    apiValue,
    isApiConsistent,
    blocked: false,
    alertMessage,
  }
}