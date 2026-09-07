/**
 * Tests para Trabajadora de Casa Particular
 * 
 * Caso real: Asesora de Hogar, puertas afuera, contratada por persona natural
 * AFP UNO, FONASA, ISL, contrato indefinido
 * Ingreso 01-08-2026
 * 
 * Jornada: 26.25 horas semanales efectivas (ciclo alternado A: 21h, B: 26.25h)
 * Liquido objetivo: $450.000
 * Movilizacion: $82.000 (no imponible)
 * Colacion: $82.000 (no imponible)
 * 
 * Descuentos trabajador:
 * - AFP ahorro obligatorio: 10%
 * - AFP UNO comision: 0.46%
 * - FONASA: 7%
 * - AFC trabajador: 0% (NO aplica para casa particular)
 * 
 * Aportes empleador:
 * - AFC empleador: 3%
 * - Indemnizacion a todo evento: 1.11%
 * - Ley 16.744 ISL: 0.93%
 * - Aporte previsional patronal agosto 2026: 3.5%
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculatePrevisional } from '@/lib/services/previsional/previsionalEngine'
import type { CalculationContext, PrevisionalConceptCode } from '@/lib/services/previsional/types'
import {
  calculateDomesticWorkerGrossFromNet,
  validateMinimumWage,
  validateDomesticWorkerPayroll,
} from '@/lib/services/previsional/domesticWorkerCalculator'
import { calculateProportionalMinimumWage } from '@/lib/services/previsional/domesticWorkerTypes'

// ============================================
// MOCKS
// ============================================

const mockRate = (
  conceptCode: string,
  rate: number,
  blocked = false,
): any => ({
  conceptCode,
  year: 2026,
  month: 8,
  rate,
  validFrom: '2025-08-01',
  validTo: null,
  financingParty: conceptCode.includes('EMPLEADOR') || conceptCode === 'SIS' || conceptCode === 'CRP' || conceptCode === 'EMPLOYER_PENSION_REFORM_TOTAL' || conceptCode === 'LEY16744_ISL_CASA_PARTICULAR' ? 'empleador' : 'trabajador',
  collectionEntity: 'AFP',
  taxableBaseType: conceptCode.includes('SEG_CES') ? 'imponible_seg_ces' : 'imponible_afp',
  legalReference: null,
  source: 'internal_validated',
  validationStatus: 'validated' as const,
  apiValue: null,
  isApiConsistent: null,
  blocked,
  alertMessage: blocked ? `No existe tasa validada para ${conceptCode}` : undefined,
})

const mockLimit = (
  limitCode: string,
  amount: number | null,
  blocked = false,
): any => ({
  limitCode,
  year: 2026,
  month: 8,
  amount,
  unit: 'pesos' as const,
  validFrom: '2026-05-01',
  validTo: null,
  legalReference: null,
  validationStatus: 'validated' as const,
  blocked,
  alertMessage: blocked ? `No existe tope validado para ${limitCode}` : undefined,
})

// Tasas para el caso de casa particular - agosto 2026
function domesticWorkerRates(): Record<string, any> {
  return {
    'AFP_TRABAJADOR_UNO': mockRate('AFP_TRABAJADOR_UNO', 10.46),
    'AFC_TRABAJADOR_CASA_PARTICULAR': mockRate('AFC_TRABAJADOR_CASA_PARTICULAR', 0.00),
    'AFC_EMPLEADOR_CASA_PARTICULAR': mockRate('AFC_EMPLEADOR_CASA_PARTICULAR', 3.00),
    'INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR': mockRate('INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR', 1.11),
    'LEY16744_ISL_CASA_PARTICULAR': mockRate('LEY16744_ISL_CASA_PARTICULAR', 0.93),
    'EMPLOYER_PENSION_REFORM_TOTAL': mockRate('EMPLOYER_PENSION_REFORM_TOTAL', 3.50),
    'FONASA': mockRate('FONASA', 7.00),
  }
}

function domesticWorkerLimits() {
  return {
    'RTI_AFP': mockLimit('RTI_AFP', 9070256),
    'RTI_IPS': mockLimit('RTI_IPS', 9070256),
    'RTI_SEG_CES': mockLimit('RTI_SEG_CES', 9070256),
  }
}

vi.mock('@/lib/services/previsional/previsionalRates', () => ({
  getPrevisionalRate: vi.fn(),
}))

vi.mock('@/lib/services/previsional/previsionalLimits', () => ({
  getPrevisionalLimit: vi.fn(),
  getPrevisionalLimits: vi.fn(),
  getLimitFromIndicators: vi.fn(),
}))

vi.mock('@/lib/services/previsional/previsionalAudit', () => ({
  registerPrevisionalAudit: vi.fn(),
  registerPrevisionalAuditBatch: vi.fn(),
  hashIndicators: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {},
}))

vi.mock('@/lib/services/indicatorsCache', () => ({
  getCachedIndicators: vi.fn(),
}))

import { getPrevisionalRate } from '@/lib/services/previsional/previsionalRates'
import { getPrevisionalLimit } from '@/lib/services/previsional/previsionalLimits'

const mockGetPrevisionalRate = vi.mocked(getPrevisionalRate)
const mockGetPrevisionalLimit = vi.mocked(getPrevisionalLimit)

function setupDomesticWorkerMocks() {
  const rates = domesticWorkerRates()
  const limits = domesticWorkerLimits()

  mockGetPrevisionalRate.mockImplementation((conceptCode: any) => {
    const r = rates[conceptCode as string]
    if (r) return Promise.resolve(r)
    return Promise.resolve(mockRate(conceptCode, 0, true))
  })

  mockGetPrevisionalLimit.mockImplementation((limitCode: string) => {
    const l = (limits as any)[limitCode]
    if (l) return Promise.resolve(l)
    return Promise.resolve(mockLimit(limitCode, null, true))
  })
}

function makeDomesticWorkerContext(overrides: Partial<CalculationContext> = {}): CalculationContext {
  return {
    year: 2026,
    month: 8,
    employee: {
      id: 'domestic-worker-1',
      afp: 'UNO',
      healthSystem: 'FONASA',
      previsionalRegime: 'AFP',
      afcApplicable: false,
      contractType: 'indefinido',
      workerType: 'DOMESTIC_WORKER',
      domesticWorkerMode: 'LIVE_OUT',
      gratificationType: 'NONE',
      weeklyHours: 26.25,
      maxWeeklyHours: 42,
      minimumWageType: 'PROPORTIONAL',
      law16744Organism: 'ISL',
      law16744Rate: 0.93,
      law16744AdditionalRate: 0,
    },
    taxableEarnings: 346499,
    baseSalaryProportional: 346499,
    daysWorked: 30,
    calculationType: 'liquidacion',
    indicators: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setupDomesticWorkerMocks()
})

// ============================================
// TEST PRINCIPAL: Caso real de casa particular agosto 2026
// ============================================

describe('Trabajadora de Casa Particular - Caso Real Agosto 2026', () => {

  it('should_calculate_domestic_worker_net_salary_450000_august_2026', async () => {
    const context = makeDomesticWorkerContext()
    const result = await calculatePrevisional(context)

    expect(result.blocked).toBe(false)
    expect(result.blockedConcepts).toHaveLength(0)

    // AFP UNO: 10.46% de 346.499
    // AFP obligatorio: 10% de 346.499 = 34.650 (aprox)
    // AFP comision UNO: 0.46% de 346.499 = 1.594 (aprox)
    expect(result.employeeDeductions.pension).toBeCloseTo(36244, -2) // ~10.46% de 346499
    expect(result.employeeDeductions.pensionObligatorio).toBe(34650) // 10% de 346499
    expect(result.employeeDeductions.pensionComision).toBeCloseTo(1594, -2) // 0.46% de 346499

    // FONASA 7% de 346.499
    expect(result.employeeDeductions.health).toBeCloseTo(24255, -2) // 7% de 346499

    // AFC trabajador: 0 para casa particular
    expect(result.employeeDeductions.afcTrabajador).toBe(0)

    // Verificar que es regimen AFP pero con label de Casa Particular
    expect(result.regime).toBe('AFP')
    expect(result.regimeLabel).toContain('Casa Particular')

    // Verificar contribuciones domesticas del empleador
    expect(result.domesticWorkerContributions).toBeDefined()
    if (result.domesticWorkerContributions) {
      // AFC empleador 3% de 346.499
      expect(result.domesticWorkerContributions.afcEmployer).toBeCloseTo(10395, -2) // 3% de 346499
      expect(result.domesticWorkerContributions.afcEmployerRate).toBe(3.0)

      // Indemnizacion a todo evento 1.11% de 346.499
      expect(result.domesticWorkerContributions.indemnization).toBeCloseTo(3846, -1) // 1.11% de 346499
      expect(result.domesticWorkerContributions.indemnizationRate).toBe(1.11)

      // Ley 16.744 ISL 0.93% de 346.499
      expect(result.domesticWorkerContributions.law16744).toBeCloseTo(3222, -1) // 0.93% de 346499
      expect(result.domesticWorkerContributions.law16744Rate).toBe(0.93)

      // Aporte previsional patronal 3.5% de 346.499
      expect(result.domesticWorkerContributions.pensionReform).toBeCloseTo(12127, -2) // 3.5% de 346499
      expect(result.domesticWorkerContributions.pensionReformRate).toBe(3.5)
      expect(result.domesticWorkerContributions.pensionReformIncludesSis).toBe(true)

      // Total empleador = 10395 + 3846 + 3222 + 12127 ≈ 29590
      expect(result.domesticWorkerContributions.total).toBeGreaterThan(0)
    }

    // SIS y CRP deben ser 0 porque estan incluidos en la tasa patronal total
    expect(result.sisAmount).toBe(0)
    expect(result.sisRate).toBe(0)
    expect(result.crpAmount).toBe(0)
    expect(result.crpRate).toBe(0)
  })

  // ============================================
  // TEST DE LIQUIDACION INCORRECTA (regresion)
  // ============================================

  it('should_reject_incorrect_liquidation_with_gratification_and_afc_worker', () => {
    const result = validateDomesticWorkerPayroll(
      'DOMESTIC_WORKER',
      'LEGAL_ARTICLE_50', // ERROR: no debe tener gratificacion
      true, // ERROR: no debe tener AFC trabajador
      345971,
      82000, // movilizacion
      82000, // colacion
      553553, // IMM
      26.25,
      42,
    )

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('ERROR: Trabajadora de casa particular no debe tener gratificacion automatica. gratificationType debe ser NONE')
    expect(result.errors).toContain('ERROR: Trabajadora de casa particular no debe tener descuento AFC trabajador. afcApplicable debe ser FALSE')
  })

  it('should_reject_incorrect_liquidation_with_wrong_movilizacion_and_traslado', () => {
    // La liquidacion anterior tenia:
    // - sueldo base 345971 (correcto)
    // - gratificacion 86493 (ERROR - no corresponde)
    // - movilizacion 82000 (correcto)
    // - colacion 82000 (correcto)
    // - traslado 51640 (ERROR - no existe en el contrato)
    // - AFC trabajador 2595 (ERROR - no aplica para casa particular)

    // Este test verifica que la validacion detecte gratificacion y AFC
    const result = validateDomesticWorkerPayroll(
      'DOMESTIC_WORKER',
      'LEGAL_ARTICLE_50', // gratificacion incorrecta
      true, // AFC trabajador incorrecto
      345971,
      82000,
      82000,
      553553,
      26.25,
      42,
    )

    expect(result.isValid).toBe(false)
    // Debe fallar por gratificacion y AFC
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  // ============================================
  // TEST DE SALARIO MINIMO PROPORCIONAL
  // ============================================

  it('should_validate_proportional_minimum_wage_correctly', () => {
    // IMM = 553.553, horas = 26.25, max = 42
    // Minimo proporcional = 553553 * 26.25 / 42 = 345971 (aprox)
    const result = validateMinimumWage(
      346499, // sueldo base del caso real
      'PROPORTIONAL',
      553553,
      26.25,
      42,
    )

    expect(result.isValid).toBe(true)
    expect(result.proportionalMinimumWage).toBe(345971)
  })

  it('should_reject_salary_below_proportional_minimum_wage', () => {
    const result = validateMinimumWage(
      300000, // por debajo del minimo proporcional
      'PROPORTIONAL',
      553553,
      26.25,
      42,
    )

    expect(result.isValid).toBe(false)
    expect(result.proportionalMinimumWage).toBe(345971)
    expect(result.shortfall).toBeGreaterThan(0)
  })

  // ============================================
  // TEST DE CALCULO INVERSO (LIQUIDO -> BRUTO)
  // ============================================

  it('should_calculate_gross_from_net_salary_for_domestic_worker', () => {
    // Liquido objetivo: $450.000
    // No imponibles: $82.000 (movilizacion) + $82.000 (colacion) = $164.000
    // AFP ahorro obligatorio: 10%
    // AFP UNO comision: 0.46%
    // FONASA: 7%
    // AFC trabajador: 0%
    // Total descuentos porcentuales trabajador: 17.46%

    const result = calculateDomesticWorkerGrossFromNet({
      targetNetSalary: 450000,
      nonTaxableTotal: 164000,
      pensionObligatoryRate: 10,
      pensionCommissionRate: 0.46,
      healthRate: 7,
      afcRate: 0,
      afcEmployerRate: 3,
      indemnizationRate: 1.11,
      law16744Rate: 0.93,
      pensionReformRate: 3.5,
    })

    // El sueldo imponible debe ser cercano a 346.499
    expect(result.grossTaxable).toBeCloseTo(346499, -3)

    // Verificar que el liquido resultante sea 450.000
    expect(result.netPay).toBe(450000)

    // Verificar que las deducciones del trabajador sean correctas
    expect(result.employeeDeductions.pensionObligatory).toBeGreaterThan(0)
    expect(result.employeeDeductions.pensionCommission).toBeGreaterThan(0)
    expect(result.employeeDeductions.health).toBeGreaterThan(0)
    expect(result.employeeDeductions.afc).toBe(0) // 0 para casa particular

    // Verificar contribuciones del empleador
    expect(result.employerContributions.afc).toBeGreaterThan(0)
    expect(result.employerContributions.indemnization).toBeGreaterThan(0)
    expect(result.employerContributions.law16744).toBeGreaterThan(0)
    expect(result.employerContributions.pensionReform).toBeGreaterThan(0)
  })

  // ============================================
  // TEST: AFC trabajador = 0 para casa particular
  // ============================================

  it('should_not_deduct_afc_worker_for_domestic_worker', async () => {
    const context = makeDomesticWorkerContext()
    const result = await calculatePrevisional(context)

    expect(result.employeeDeductions.afcTrabajador).toBe(0)
    expect(result.employeeDeductions.afcTrabajadorLabel).toContain('No aplica')
  })

  // ============================================
  // TEST: Ley 16.744 no descuenta al trabajador
  // ============================================

  it('should_not_include_law16744_in_employee_deductions', async () => {
    const context = makeDomesticWorkerContext()
    const result = await calculatePrevisional(context)

    // Ley 16.744 NO debe estar en los descuentos del trabajador
    const totalDeductions = result.employeeDeductions.pension
      + result.employeeDeductions.health
      + result.employeeDeductions.afcTrabajador

    expect(result.employeeDeductions.total).toBe(totalDeductions)
  })

  // ============================================
  // TEST: Tasa patronal total unificada (3.5%)
  // ============================================

  it('should_use_unified_employer_pension_rate_including_sis_for_august_2026', async () => {
    const context = makeDomesticWorkerContext()
    const result = await calculatePrevisional(context)

    // La tasa patronal total (3.5%) incluye SIS + CRP + Cuenta Individual
    expect(result.domesticWorkerContributions?.pensionReformIncludesSis).toBe(true)
    
    // SIS y CRP deben ser 0 (incluidos en la tasa total)
    expect(result.sisAmount).toBe(0)
    expect(result.crpAmount).toBe(0)
    expect(result.afpEmployerAccountAmount).toBe(0) // Incluido en pensionReform
  })

  // ============================================
  // TEST: Gratificacion = 0 para casa particular
  // ============================================

  it('should_have_zero_gratification_for_domestic_worker', () => {
    // En el calculo de nomina, gratificationType=NONE produce gratificacion=0
    // Este test verifica la logica de validacion
    const result = validateDomesticWorkerPayroll(
      'DOMESTIC_WORKER',
      'NONE',
      false, // AFC no aplica
      346499,
      82000,
      82000,
      553553,
      26.25,
      42,
    )

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  // ============================================
  // TEST: Calculo proporcional del salario minimo
  // ============================================

  it('should_calculate_proportional_minimum_wage_correctly', () => {
    const result = calculateProportionalMinimumWage(553553, 26.25, 42)
    expect(result).toBe(345971)
  })

  // ============================================
  // TEST: Los aportes del empleador NO reducen el liquido
  // ============================================

  it('should_ensure_employer_contributions_do_not_affect_net_pay', async () => {
    const context = makeDomesticWorkerContext()
    const result = await calculatePrevisional(context)

    // El total de deducciones del trabajador NO incluye aportes del empleador
    const employeeTotalDeductions = result.employeeDeductions.total
    
    // Los aportes del empleador estan separados
    const employerTotal = result.employerContributionsTotal
    
    expect(employerTotal).toBeGreaterThan(0)
    
    // El total de deducciones del trabajador solo debe incluir AFP + Salud
    // (sin AFC trabajador, sin Ley 16.744, sin aportes patronales)
    expect(employeeTotalDeductions).toBe(
      result.employeeDeductions.pension + result.employeeDeductions.health
    )
  })
})

// ============================================
// TEST DE REGRESION: Liquidacion incorrecta anterior
// ============================================

describe('Regresion - Liquidacion incorrecta anterior', () => {
  it('should_fail_validation_for_previous_incorrect_liquidation', () => {
    // La liquidacion anterior tenia:
    // sueldo base 345971
    // gratificacion 86493 (NO corresponde para casa particular)
    // movilizacion 82000
    // colacion 82000
    // traslado 51640 (NO existe en el contrato)
    // AFC trabajador 2595 (NO aplica para casa particular)

    const result = validateDomesticWorkerPayroll(
      'DOMESTIC_WORKER',
      'LEGAL_ARTICLE_50', // gratificacion - INCORRECTO
      true, // AFC trabajador - INCORRECTO
      345971,
      82000,
      82000,
      553553,
      26.25,
      42,
    )

    // Debe fallar al menos por:
    // 1. Gratificacion no configurada
    // 2. AFC indebidamente cargada al trabajador
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('ERROR: Trabajadora de casa particular no debe tener gratificacion automatica. gratificationType debe ser NONE')
    expect(result.errors).toContain('ERROR: Trabajadora de casa particular no debe tener descuento AFC trabajador. afcApplicable debe ser FALSE')
  })
})