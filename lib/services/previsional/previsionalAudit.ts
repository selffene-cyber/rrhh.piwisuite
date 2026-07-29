/**
 * Registro de auditoria para tasas previsionales
 *
 * Fase 1: Arquitectura de la Reforma Previsional 2026
 *
 * Cada tasa utilizada en un calculo se registra con:
 * - fuente (tabla interna)
 * - vigencia
 * - valor de la API (si disponible)
 * - consistencia entre API y tabla
 * - hash del JSON recibido
 */

import type {
  PrevisionalConceptCode,
  PrevisionalDataSource,
  ValidationStatus,
  PrevisionalAuditEntry,
} from './types'

import { supabase } from '@/lib/supabase/client'

// ============================================
// FUNCION PRINCIPAL
// ============================================

export async function registerPrevisionalAudit(
  entry: PrevisionalAuditEntry
): Promise<void> {
  try {
    const { error } = await supabase
      .from('prevision_audit')
      .insert({
        concept_code: entry.concept_code,
        year: entry.year,
        month: entry.month,
        rate_used: entry.rate_used,
        rate_from_table: entry.rate_from_table,
        api_value: entry.api_value,
        is_consistent: entry.is_consistent,
        source: entry.source,
        validated_by: entry.validated_by,
        validated_at: entry.validated_at,
        indicators_hash: entry.indicators_hash,
      })

    if (error) {
      console.error('[previsionalAudit] Error registering audit:', error)
    }
  } catch (err) {
    console.error('[previsionalAudit] Exception registering audit:', err)
  }
}

// ============================================
// FUNCION PARA GENERAR HASH DE INDICADORES
// ============================================

export async function hashIndicators(indicators: any): Promise<string> {
  const text = JSON.stringify(indicators)
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================
// FUNCION PARA REGISTRAR AUDITORIA MASIVA
// ============================================

export async function registerPrevisionalAuditBatch(
  entries: PrevisionalAuditEntry[]
): Promise<void> {
  if (entries.length === 0) return

  try {
    const rows = entries.map(entry => ({
      concept_code: entry.concept_code,
      year: entry.year,
      month: entry.month,
      rate_used: entry.rate_used,
      rate_from_table: entry.rate_from_table,
      api_value: entry.api_value,
      is_consistent: entry.is_consistent,
      source: entry.source,
      validated_by: entry.validated_by,
      validated_at: entry.validated_at,
      indicators_hash: entry.indicators_hash,
    }))

    const { error } = await supabase
      .from('prevision_audit')
      .insert(rows)

    if (error) {
      console.error('[previsionalAudit] Error registering audit batch:', error)
    }
  } catch (err) {
    console.error('[previsionalAudit] Exception registering audit batch:', err)
  }
}