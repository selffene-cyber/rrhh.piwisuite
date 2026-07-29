/**
 * Tipos centralizados para el motor previsional
 * Fase 1: Arquitectura de la Reforma Previsional 2026
 *
 * Estos tipos son la base para todo el sistema de cotizaciones previsionales.
 * No contienen logica, solo definiciones.
 */

// ============================================
// CODIGOS DE CONCEPTOS PREVISIONALES
// ============================================

export type PrevisionalConceptCode =
  | 'AFP_TRABAJADOR_OBLIGATORIO'
  | 'AFP_TRABAJADOR_COMISION'
  | 'AFP_TRABAJADOR_CAPITAL'
  | 'AFP_TRABAJADOR_CUPRUM'
  | 'AFP_TRABAJADOR_HABITAT'
  | 'AFP_TRABAJADOR_PLANVITAL'
  | 'AFP_TRABAJADOR_PROVIDA'
  | 'AFP_TRABAJADOR_MODELO'
  | 'AFP_TRABAJADOR_UNO'
  | 'AFP_EMPLEADOR_CUENTA_INDIVIDUAL'
  | 'SIS'
  | 'CRP'
  | 'AFC_TRABAJADOR_INDEFINIDO'
  | 'AFC_TRABAJADOR_PLAZO_FIJO'
  | 'AFC_TRABAJADOR_TEMPORAL'
  | 'AFC_EMPLEADOR_INDEFINIDO'
  | 'AFC_EMPLEADOR_PLAZO_FIJO'
  | 'AFC_EMPLEADOR_TEMPORAL'
  | 'FONASA'
  | 'ISAPRE'
  | 'IMPUESTO_UNICO'
  | 'MUTUAL'
  | 'LEY_SANNA'
  | 'CAJA_COMPENSACION'

export type FinancingParty = 'trabajador' | 'empleador'

export type TaxableBaseType =
  | 'imponible_afp'
  | 'imponible_ips'
  | 'imponible_seg_ces'
  | 'imponible_salud'
  | 'imponible_general'
  | 'sueldo_base'

export type ValidationStatus = 'pending' | 'validated' | 'rejected' | 'expired'

export type PrevisionalDataSource = 'previred_api' | 'internal_validated' | 'manual_entry' | 'sii_scraper'

export type CalculationType = 'liquidacion' | 'finiquito' | 'reliquidacion' | 'libro_remuneraciones'

export type LimitUnit = 'pesos' | 'uf' | 'utm'

export type PrevisionRegimeType = 'AFP' | 'OTRO_REGIMEN'

export type OtherRegimeType = 'DIPRECA' | 'CAPREDENA' | 'SIN_PREVISION' | 'OTRO'

export type ManualBaseType = 'imponible' | 'sueldo_base'

// ============================================
// RESULTADO DE getPrevisionalRate()
// ============================================

export interface PrevisionalRateResult {
  conceptCode: PrevisionalConceptCode
  year: number
  month: number
  rate: number
  validFrom: string
  validTo: string | null
  financingParty: FinancingParty
  collectionEntity: string
  taxableBaseType: TaxableBaseType
  legalReference: string | null
  source: PrevisionalDataSource
  validationStatus: ValidationStatus
  apiValue: number | null
  isApiConsistent: boolean | null
  blocked: boolean
  alertMessage?: string
}

// ============================================
// RESULTADO DE getPrevisionalLimit()
// ============================================

export interface PrevisionalLimitResult {
  limitCode: string
  year: number
  month: number
  amount: number | null
  unit: LimitUnit
  validFrom: string
  validTo: string | null
  legalReference: string | null
  validationStatus: ValidationStatus
  blocked: boolean
  alertMessage?: string
}

// ============================================
// APORTE DEL EMPLEADOR (para payroll_employer_contributions)
// ============================================

export interface EmployerContribution {
  id?: string
  payroll_slip_id?: string
  concept_code: PrevisionalConceptCode
  base_amount: number
  rate: number
  amount: number
  taxable_base_type: TaxableBaseType
  source: 'calculation' | 'reliquidation' | 'settlement' | 'manual'
  created_at?: string
}

// ============================================
// CONTEXTO DE CALCULO (entrada del motor central)
// ============================================

export interface CalculationContext {
  year: number
  month: number
  employee: {
    id: string
    afp?: string | null
    healthSystem?: string | null
    healthPlan?: string | null
    healthPlanPercentage?: number
    previsionalRegime: PrevisionRegimeType
    otherRegimeType?: OtherRegimeType | null
    manualPensionRate?: number | null
    manualHealthRate?: number | null
    manualEmployerRate?: number | null
    manualBaseType?: ManualBaseType | null
    manualRegimeLabel?: string | null
    contractType?: string | null
    afcApplicable: boolean
  }
  taxableEarnings: number
  baseSalaryProportional?: number
  daysWorked: number
  calculationType: CalculationType
  indicators?: PreviredIndicators | null
}

// ============================================
// RESULTADO DEL MOTOR PREVISIONAL
// ============================================

export interface PrevisionalCalculationResult {
  regime: PrevisionRegimeType
  regimeType?: OtherRegimeType | string
  regimeLabel: string

  baseImponibleAFP: number
  baseImponibleIPS: number
  baseImponibleSegCes: number
  baseImponibleGeneral: number

  employeeDeductions: {
    pension: number
    pensionObligatorio: number
    pensionComision: number
    health: number
    healthLabel: string
    afcTrabajador: number
    afcTrabajadorLabel: string
    uniqueTax: number
    total: number
  }

  employerContributions: EmployerContribution[]
  employerContributionsTotal: number

  sisAmount: number
  sisRate: number
  sisBase: number

  crpAmount: number
  crpRate: number
  crpBase: number

  afpEmployerAccountAmount: number
  afpEmployerAccountRate: number
  afpEmployerAccountBase: number

  afcEmployerAmount: number
  afcEmployerRate: number
  afcEmployerLabel: string
  afcEmployerBase: number

  rates: PrevisionalRateResult[]
  limits: PrevisionalLimitResult[]

  blocked: boolean
  blockedConcepts: string[]
  warnings: string[]
}

// ============================================
// TIPOS PARA BASE DE DATOS (prevision_rates)
// ============================================

export interface PrevisionRateRow {
  id: string
  concept_code: PrevisionalConceptCode | string
  valid_from: string
  valid_to: string | null
  rate: number
  financing_party: FinancingParty
  taxable_base_type: TaxableBaseType
  collection_entity: string
  legal_reference: string | null
  data_source: PrevisionalDataSource
  validation_status: ValidationStatus
  validated_by: string | null
  validated_at: string | null
  created_at: string
  updated_at: string
}

// ============================================
// TIPOS PARA BASE DE DATOS (prevision_limits)
// ============================================

export interface PrevisionLimitRow {
  id: string
  limit_code: string
  valid_from: string
  valid_to: string | null
  amount: number
  unit: LimitUnit
  legal_reference: string | null
  validation_status: ValidationStatus
  validated_by: string | null
  validated_at: string | null
  created_at: string
  updated_at: string
}

// ============================================
// TIPOS PARA AUDITORIA
// ============================================

export interface PrevisionalAuditEntry {
  id?: string
  concept_code: PrevisionalConceptCode | string
  year: number
  month: number
  rate_used: number
  rate_from_table: number | null
  api_value: number | null
  is_consistent: boolean | null
  source: PrevisionalDataSource
  validated_by: string | null
  validated_at: string | null
  indicators_hash: string | null
  created_at?: string
}

// ============================================
// TIPOS RE-EXPORTADOS PARA COMPATIBILIDAD
// ============================================

export interface PreviredIndicators {
  PreviredID: number
  Fecha: string
  PeriodoMY: string
  PeriodoYM: string
  UFDescPeriodo: string
  UFValPeriodo: string
  UFDescPeridoAnt: string
  UFValPeriodoAnt: string
  UTMDesc: string
  UTMVal: string
  UTAVal: string
  RTIAfpUF: string
  RTIIpsUF: string
  RTISegCesUF: string
  RTIAfpPesos: string
  RTIIpsPesos: string
  RTISegCesPesos: string
  RMITrabDepeInd: string
  RMIMen18May65: string
  RMITrabCasaPart: string
  RMINoRemu: string
  APVTopeMensUF: string
  APVTopeAnuUF: string
  APVTopeMensPesos: string
  APVTopeAnuPesos: string
  DepConvenTopeAnuUF?: string
  DepConvenTopeAnuPesos?: string
  DepConvenidoUF?: string
  DepConvenidoPesos?: string
  TasaSIS?: string
  AFCCpiEmpleador?: string
  AFCCpfEmpleador?: string
  AFCTcpEmpleador?: string
  AFCCpiTrabajador?: string
  AFCCpfTrabajador?: string
  AFCTcpTrabajador?: string
  AFPCapitalTasaDepTrab?: string
  AFPCapitalTasaDepAPagar?: string
  AFPCapitalTasaInd?: string
  AFPCuprumTasaDepTrab?: string
  AFPCuprumTasaDepAPagar?: string
  AFPCuprumTasaInd?: string
  AFPHabitatTasaDepTrab?: string
  AFPHabitatTasaDepAPagar?: string
  AFPHabitatTasaInd?: string
  AFPPlanVitalTasaDepTrab?: string
  AFPPlanVitalTasaDepAPagar?: string
  AFPPlanVitalTasaInd?: string
  AFPProVidaTasaDepTrab?: string
  AFPProVidaTasaDepAPagar?: string
  AFPProVidaTasaInd?: string
  AFPModeloTasaDepTrab?: string
  AFPModeloTasaDepAPagar?: string
  AFPModeloTasaInd?: string
  AFPUnoTasaDepTrab?: string
  AFPUnoTasaDepAPagar?: string
  AFPUnoTasaInd?: string
  AFP?: {
    [key: string]: {
      trabajador: number
      empleador: number
      total: number
      independientes: number
    }
  }
  SeguroCesantia?: {
    plazoIndefinido: {
      empleador: number
      trabajador: number
    }
    plazoFijo: {
      empleador: number
      trabajador: number
    }
  }
  ExpVida?: string
  Dist7PorcCCAF?: string
  Dist7PorcFonasa?: string
  TrabPesadoEmpl?: string
  TrabPesadoCalif?: string
  TrabPesadoTrabaj?: string
  TrabMenosPesadoEmpl?: string
  TrabMenosPesadoCalif?: string
  TrabMenosPesadoTrabaj?: string
  AFamTramoADesde?: string
  AFamTramoAHasta?: string
  AFamTramoAMonto?: string
  AFamTramoBDesde?: string
  AFamTramoBHasta?: string
  AFamTramoBMonto?: string
  AFamTramoCDesde?: string
  AFamTramoCHasta?: string
  AFamTramoCMonto?: string
  AFamTramoDDesde?: string
  AFamTramoDHasta?: string
  AFamTramoDMonto?: string
  AFCCpi11Empleador?: string
  AFCCpi11Trabajador?: string
}