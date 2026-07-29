/**
 * Motor central de cotizaciones previsionales
 * Fase 1: Arquitectura de la Reforma Previsional 2026
 *
 * Este modulo centraliza toda la logica de cotizaciones previsionales.
 * Los motores V1, V2, finiquitos, reliquidaciones y libro de remuneraciones
 * delegaran a este motor en lugar de calcular directamente.
 */

export type {
  PrevisionalConceptCode,
  FinancingParty,
  TaxableBaseType,
  ValidationStatus,
  PrevisionalDataSource,
  CalculationType,
  LimitUnit,
  PrevisionRegimeType,
  OtherRegimeType,
  ManualBaseType,
  PrevisionalRateResult,
  PrevisionalLimitResult,
  EmployerContribution,
  CalculationContext,
  PrevisionalCalculationResult,
  PrevisionRateRow,
  PrevisionLimitRow,
  PrevisionalAuditEntry,
  PreviredIndicators,
} from './types'

export { calculatePrevisional } from './previsionalEngine'
export { getPrevisionalRate } from './previsionalRates'
export { getPrevisionalLimit, getPrevisionalLimits, getLimitFromIndicators } from './previsionalLimits'
export { registerPrevisionalAudit, registerPrevisionalAuditBatch, hashIndicators } from './previsionalAudit'
export { validatePrevisionalRate, validateAllRatesForPeriod, canClosePeriod } from './previsionalValidation'
export { calculatePrevisionalFromV2, mergePrevisionalResultIntoV2, comparePrevisionalResults, PrevisionalRateBlockedException } from './previsionalAdapter'
export { getEmployerContributionsForBookEntry } from './payrollBookAdapter'
export type { EmployerContributionsForBook } from './payrollBookAdapter'
export { calculateSettlementEmployerContributions } from './settlementAdapter'
export type { SettlementEmployerContributions, SettlementPrevisionalInput } from './settlementAdapter'