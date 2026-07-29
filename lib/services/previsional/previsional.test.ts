/**
 * Phase 6: Unit tests for previsional engine integration
 *
 * Tests cover:
 * - Normal liquidation (indefinido)
 * - Contrato a plazo fijo
 * - ISAPRE
 * - Sueldo sobre tope imponible
 * - July 2026 (pre-CRP)
 * - August 2026 (with CRP)
 * - Missing validated rate (blocked)
 * - API unavailable (fallback)
 * - Settlement (finiquito)
 * - Reliquidation
 * - Closed period
 * - Legacy vs central engine comparison
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// MOCKS: previsionalRates and previsionalLimits
// ============================================

const mockRate = (
  conceptCode: string,
  rate: number,
  blocked = false,
): any => ({
  conceptCode,
  year: 2026,
  month: 7,
  rate,
  validFrom: '2025-01-01',
  validTo: null,
  financingParty: 'trabajador',
  collectionEntity: 'AFP',
  taxableBaseType: 'imponible_afp',
  legalReference: null,
  source: 'internal_validated',
  validationStatus: 'validated' as const,
  apiValue: null,
  isApiConsistent: null,
  blocked,
  alertMessage: blocked
    ? `No existe tasa validada para ${conceptCode}`
    : undefined,
})

const mockEmployerRate = (
  conceptCode: string,
  rate: number,
  blocked = false,
): any => ({
  ...mockRate(conceptCode, rate, blocked),
  financingParty: 'empleador',
})

const mockLimit = (
  limitCode: string,
  amount: number | null,
  blocked = false,
): any => ({
  limitCode,
  year: 2026,
  month: 7,
  amount,
  unit: 'pesos' as const,
  validFrom: '2025-01-01',
  validTo: null,
  legalReference: null,
  validationStatus: 'validated' as const,
  blocked,
  alertMessage: blocked
    ? `No existe tope validado para ${limitCode}`
    : undefined,
})

// Standard rate set for a "normal" period (July 2026, PROVIDA, indefinido)
function standardRates(year: number, month: number) {
  const periodDate = `${year}-${month.toString().padStart(2, '0')}-01`

  const rates: Record<string, any> = {
    'AFP_TRABAJADOR_PROVIDA': mockRate('AFP_TRABAJADOR_PROVIDA', 11.45),
    'AFP_EMPLEADOR_CUENTA_INDIVIDUAL': mockEmployerRate('AFP_EMPLEADOR_CUENTA_INDIVIDUAL', 0.1),
    'SIS': mockEmployerRate('SIS', 1.62),
    'AFC_TRABAJADOR_INDEFINIDO': mockRate('AFC_TRABAJADOR_INDEFINIDO', 0.6),
    'AFC_EMPLEADOR_INDEFINIDO': mockEmployerRate('AFC_EMPLEADOR_INDEFINIDO', 2.4),
    'FONASA': mockRate('FONASA', 7.0),
  }

  if (periodDate >= '2026-08-01') {
    rates['CRP'] = mockEmployerRate('CRP', 0.9)
  }

  return rates
}

function standardLimits() {
  return {
    'RTI_AFP': mockLimit('RTI_AFP', 9070256),
    'RTI_IPS': mockLimit('RTI_IPS', 9070256),
    'RTI_SEG_CES': mockLimit('RTI_SEG_CES', 9070256),
  }
}

// ============================================
// MOCK SETUP
// ============================================

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
import { calculatePrevisional } from '@/lib/services/previsional/previsionalEngine'
import type { CalculationContext, PrevisionalCalculationResult } from '@/lib/services/previsional/types'
import { calculateSettlement } from '@/lib/services/settlementCalculator'
import type { SettlementCalculationInput, SettlementCause } from '@/lib/services/settlementCalculator'
import { calculateReliquidation } from '@/lib/services/reliquidationCalculator'
import { calculatePayrollV2 } from '@/lib/services/payrollCalculatorV2'
import type { PayrollCalculationInputV2 } from '@/lib/services/payrollCalculatorV2'

const mockGetPrevisionalRate = vi.mocked(getPrevisionalRate)
const mockGetPrevisionalLimit = vi.mocked(getPrevisionalLimit)

function setupStandardMocks(year = 2026, month = 7) {
  const rates = standardRates(year, month)
  const limits = standardLimits()

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

function setupBlockedMocks(missingConcepts: string[]) {
  const rates = standardRates(2026, 7)
  const limits = standardLimits()

  mockGetPrevisionalRate.mockImplementation((conceptCode: any) => {
    if (missingConcepts.includes(conceptCode as string)) {
      return Promise.resolve(mockRate(conceptCode, 0, true))
    }
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

function makeEmployeeContext(overrides: Partial<CalculationContext['employee']> = {}): CalculationContext['employee'] {
  return {
    id: 'test-employee',
    afp: 'PROVIDA',
    healthSystem: 'FONASA',
    previsionalRegime: 'AFP',
    afcApplicable: true,
    contractType: 'indefinido',
    ...overrides,
  }
}

function makeContext(overrides: Partial<CalculationContext> = {}): CalculationContext {
  return {
    year: 2026,
    month: 7,
    employee: makeEmployeeContext(),
    taxableEarnings: 500000,
    baseSalaryProportional: 500000,
    daysWorked: 30,
    calculationType: 'liquidacion',
    indicators: null,
    ...overrides,
  }
}

function makeV2Input(overrides: Partial<PayrollCalculationInputV2> = {}): PayrollCalculationInputV2 {
  return {
    employee: {
      id: 'test-employee',
      rut: '12345678-9',
      full_name: 'Test Employee',
      base_salary: 500000,
      previsional_regime: 'AFP',
      afp: 'PROVIDA',
      health_system: 'FONASA',
      afc_applicable: true,
      contract_type: 'indefinido',
      status: 'active',
      ...overrides.employee,
    },
    year: 2026,
    month: 7,
    daysWorked: 30,
    baseSalary: 500000,
    indicators: null,
    ...overrides,
  }
}

const standardCause: SettlementCause = {
  code: '160',
  label: 'Necesidades de la empresa',
  article: '161',
  has_ias: true,
  has_iap: true,
}

function makeSettlementInput(overrides: Partial<SettlementCalculationInput> = {}): SettlementCalculationInput {
  return {
    contract_start_date: '2020-01-01',
    termination_date: '2026-07-31',
    last_salary_monthly: 500000,
    worked_days_last_month: 30,
    bonuses: [],
    transportation: 0,
    meal_allowance: 0,
    vacation_days_pending: 15,
    cause_code: '160',
    cause: standardCause,
    notice_given: false,
    previsional_regime: 'AFP',
    afp: 'PROVIDA',
    health_system: 'FONASA',
    loan_balance: 0,
    advance_balance: 0,
    termination_year: 2026,
    termination_month: 7,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setupStandardMocks()
})

// ============================================
// TESTS
// ============================================

describe('Motor central previsional - Fase 6', () => {

  // 1. Liquidación normal con contrato indefinido
  describe('Liquidación normal - contrato indefinido', () => {
    it('calcula AFP trabajador 11.45%, SIS 1.62%, AFC trabajador 0.6%, AFC empleador 2.4%', async () => {
      const context = makeContext()
      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(false)
      expect(result.blockedConcepts).toHaveLength(0)

      // AFP trabajador: 11.45% de 500000
      expect(result.employeeDeductions.pension).toBeCloseTo(57250, -1)
      expect(result.employeeDeductions.pensionObligatorio).toBe(50000)
      expect(result.employeeDeductions.health).toBeCloseTo(35000, -1) // FONASA 7%
      expect(result.employeeDeductions.afcTrabajador).toBeCloseTo(3000, -1) // 0.6%

      // Empleador
      expect(result.sisRate).toBe(1.62)
      expect(result.sisAmount).toBeCloseTo(8100, -1) // 1.62% de 500000
      expect(result.afpEmployerAccountRate).toBe(0.1)
      expect(result.afpEmployerAccountAmount).toBeCloseTo(500, -1) // 0.1% de 500000
      expect(result.afcEmployerRate).toBe(2.4)
      expect(result.afcEmployerAmount).toBeCloseTo(12000, -1) // 2.4% de 500000

      // CRP no aplica en julio 2026 (antes de agosto 2026)
      expect(result.crpAmount).toBe(0)
      expect(result.crpRate).toBe(0)
    })
  })

  // 2. Contrato a plazo fijo
  describe('Contrato a plazo fijo', () => {
    it('AFC trabajador es 0, AFC empleador es 2.4% (plazo fijo)', async () => {
      setupStandardMocks(2026, 7)
      mockGetPrevisionalRate.mockImplementation((conceptCode: any) => {
        const rates = standardRates(2026, 7)
        if (conceptCode === 'AFC_TRABAJADOR_PLAZO_FIJO') {
          return Promise.resolve(mockRate('AFC_TRABAJADOR_PLAZO_FIJO', 0))
        }
        if (conceptCode === 'AFC_EMPLEADOR_PLAZO_FIJO') {
          return Promise.resolve(mockEmployerRate('AFC_EMPLEADOR_PLAZO_FIJO', 3.0))
        }
        const r = rates[conceptCode as string]
        if (r) return Promise.resolve(r)
        return Promise.resolve(mockRate(conceptCode, 0, true))
      })

      const context = makeContext({
        employee: makeEmployeeContext({ contractType: 'plazo_fijo' }),
      })
      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(false)
      expect(result.employeeDeductions.afcTrabajador).toBe(0) // Plazo fijo: 0%
      expect(result.afcEmployerAmount).toBeCloseTo(15000, -1) // 3.0% de 500000
      expect(result.afcEmployerLabel).toContain('plazo_fijo')
    })
  })

  // 3. ISAPRE
  describe('ISAPRE', () => {
    it('calcula salud como UF * valorUF cuando hay plan', async () => {
      const context = makeContext({
        employee: makeEmployeeContext({
          healthSystem: 'ISAPRE',
          healthPlan: 'CONSALUD',
          healthPlanPercentage: 3.5,
        }),
        indicators: {
          UFValPeriodo: '36695,83',
          RMITrabDepeInd: '260000',
        } as any,
      })

      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(false)
      // 3.5 UF * 36695.83 = 128435.405
      expect(result.employeeDeductions.health).toBeCloseTo(128435, -2)
      expect(result.employeeDeductions.healthLabel).toContain('ISAPRE')
    })

    it('usa FONASA 7% como fallback cuando no hay indicadores UF', async () => {
      const context = makeContext({
        employee: makeEmployeeContext({
          healthSystem: 'ISAPRE',
          healthPlan: 'CONSALUD',
          healthPlanPercentage: 3.5,
        }),
        indicators: null,
      })

      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(false)
      // Sin UF, cae a 7% de 500000 = 35000
      expect(result.employeeDeductions.health).toBeCloseTo(35000, -1)
    })
  })

  // 4. Sueldo sobre tope imponible
  describe('Sueldo sobre tope imponible', () => {
    it('aplica tope AFP de 9070256 al calcular cotizaciones', async () => {
      const context = makeContext({
        taxableEarnings: 15000000, // 15M over tope
        baseSalaryProportional: 15000000,
      })

      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(false)
      // Base imponible AFP topeada a 9070256
      expect(result.baseImponibleAFP).toBe(9070256)
      // AFP trabajador: 11.45% de 9070256 (no de 15M)
      const expectedAFP = Math.ceil(9070256 * 0.1145)
      expect(result.employeeDeductions.pension).toBeCloseTo(expectedAFP, -2)
      // SIS: 1.62% de 9070256 (no de 15M)
      const expectedSIS = Math.ceil(9070256 * 0.0162)
      expect(result.sisAmount).toBeCloseTo(expectedSIS, -2)
    })
  })

  // 5. Julio 2026 (pre-CRP)
  describe('Julio 2026 (pre-CRP)', () => {
    it('CRP es 0 y no bloquea el calculo', async () => {
      setupStandardMocks(2026, 7)

      const context = makeContext({ year: 2026, month: 7 })
      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(false)
      expect(result.crpAmount).toBe(0)
      expect(result.crpRate).toBe(0)
      expect(result.warnings).toContain('CRP no aplica para periodos anteriores a agosto 2026')
    })
  })

  // 6. Agosto 2026 (con CRP)
  describe('Agosto 2026 (con CRP)', () => {
    it('CRP 0.9% se calcula sobre base imponible AFP', async () => {
      setupStandardMocks(2026, 8)

      mockGetPrevisionalRate.mockImplementation((conceptCode: any) => {
        const rates = standardRates(2026, 8)
        const r = rates[conceptCode as string]
        if (r) return Promise.resolve(r)
        return Promise.resolve(mockRate(conceptCode, 0, true))
      })

      const context = makeContext({ year: 2026, month: 8 })
      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(false)
      expect(result.crpRate).toBe(0.9)
      expect(result.crpAmount).toBeCloseTo(4500, -1) // 0.9% de 500000
      expect(result.warnings).not.toContain('CRP no aplica para periodos anteriores a agosto 2026')
    })
  })

  // 7. Ausencia de tasa validated (bloqueo)
  describe('Ausencia de tasa validated', () => {
    it('bloquea el calculo cuando falta SIS validated', async () => {
      setupBlockedMocks(['SIS'])

      const context = makeContext()
      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(true)
      expect(result.blockedConcepts).toContain('SIS')
    })

    it('bloquea el calculo cuando falta AFP validated', async () => {
      setupBlockedMocks(['AFP_TRABAJADOR_PROVIDA'])

      const context = makeContext()
      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(true)
      expect(result.blockedConcepts).toContain('AFP_TRABAJADOR_PROVIDA')
    })

    it('bloquea finiquito cuando faltan tasas', async () => {
      setupBlockedMocks(['SIS'])

      const input = makeSettlementInput()

      await expect(calculateSettlement(input)).rejects.toThrow('Calculo de finiquito bloqueado')
    })

    it('bloquea liquidacion V2 cuando faltan tasas', async () => {
      setupBlockedMocks(['SIS'])

      const v2Input = makeV2Input()

      await expect(calculatePayrollV2(v2Input)).rejects.toThrow('Calculo bloqueado')
    })
  })

  // 8. API no disponible (fallback solo para errores tecnicos)
  describe('API no disponible', () => {
    it('usa tasas validated de la tabla cuando la API no responde', async () => {
      // Las tasas de la tabla se usan directamente, la API solo se usa
      // para validacion cruzada. Si no hay indicators, el resultado
      // se basa 100% en la tabla.
      const context = makeContext({ indicators: null })

      const result = await calculatePrevisional(context)

      expect(result.blocked).toBe(false)
      // AFP se calcula con tasa de la tabla
      expect(result.employeeDeductions.pension).toBeCloseTo(57250, -1)
    })

    it('errores tecnicos de BD caen al legacy en settlement', async () => {
      // Simular error tecnico en getPrevisionalRate
      mockGetPrevisionalRate.mockRejectedValue(new Error('Connection refused'))
      mockGetPrevisionalLimit.mockRejectedValue(new Error('Connection refused'))

      const input = makeSettlementInput()

      // El settlement catch el error y cae al legacy
      const result = await calculateSettlement(input)

      // Deberia calcular con el legacy (sin motor central)
      expect(result.afp_total).toBeGreaterThan(0)
      expect(result.health_total).toBeGreaterThan(0)
      expect(result.employer_sis).toBe(0) // Legacy no tiene employer contributions
    })
  })

  // 9. Finiquito
  describe('Finiquito', () => {
    it('calcula finiquito con aportes del empleador', async () => {
      setupStandardMocks(2026, 7)

      const input = makeSettlementInput()
      const result = await calculateSettlement(input)

      expect(result.errors).toHaveLength(0)
      expect(result.afp_total).toBeGreaterThan(0)
      expect(result.health_total).toBeGreaterThan(0)
      expect(result.employer_sis).toBeGreaterThan(0)
      expect(result.employer_afp_account).toBeGreaterThan(0)
      expect(result.employer_afc).toBeGreaterThan(0)
      expect(result.employer_total).toBeGreaterThan(0)
    })

    it('calcula finiquito con regimen especial (OTRO_REGIMEN)', async () => {
      const input = makeSettlementInput({
        previsional_regime: 'OTRO_REGIMEN',
        manual_pension_rate: 6,
        manual_health_rate: 7,
      })

      const result = await calculateSettlement(input)

      expect(result.errors).toHaveLength(0)
      // OTRO_REGIMEN: pension = 6% of base, health = 7% of base
      expect(result.afp_total).toBeGreaterThan(0)
      expect(result.health_total).toBeGreaterThan(0)
      // OTRO_REGIMEN should not have employer SIS, CRP, or AFC from central engine
      // (the central engine returns 0 for these in OTRO_REGIMEN)
    })
  })

  // 10. Reliquidación
  describe('Reliquidación', () => {
    it('lanza error si el periodo esta cerrado', async () => {
      const mockSlip = {
        id: 'slip-1',
        base_salary: 500000,
        days_worked: 30,
        days_leave: 0,
        taxable_base: 500000,
        total_taxable_earnings: 500000,
        total_non_taxable_earnings: 0,
        total_earnings: 500000,
        total_legal_deductions: 100000,
        total_other_deductions: 0,
        total_deductions: 100000,
        net_pay: 400000,
        employees: {
          id: 'emp-1',
          rut: '12345678-9',
          full_name: 'Test Employee',
          base_salary: 500000,
          status: 'active',
          afp: 'PROVIDA',
          health_system: 'FONASA',
          health_plan_percentage: null,
        },
        payroll_periods: {
          id: 'period-1',
          year: 2026,
          month: 7,
          status: 'closed',
        },
        payroll_items: [],
      } as any

      const supabase = {} as any

      await expect(
        calculateReliquidation(mockSlip, { base_salary: 600000 }, supabase)
      ).rejects.toThrow('No se puede recalcular una reliquidacion para un periodo cerrado')
    })

    it('permite recalcular cuando el periodo esta abierto', async () => {
      // Este test requiere mockear getCachedIndicators y supabase
      // Solo verificamos que NO lanza error de periodo cerrado
      const mockSlip = {
        id: 'slip-1',
        base_salary: 500000,
        days_worked: 30,
        days_leave: 0,
        taxable_base: 500000,
        total_taxable_earnings: 500000,
        total_non_taxable_earnings: 0,
        total_earnings: 500000,
        total_legal_deductions: 100000,
        total_other_deductions: 0,
        total_deductions: 100000,
        net_pay: 400000,
        employees: {
          id: 'emp-1',
          rut: '12345678-9',
          full_name: 'Test Employee',
          base_salary: 500000,
          status: 'active',
          afp: 'PROVIDA',
          health_system: 'FONASA',
          health_plan_percentage: null,
          previsional_regime: 'AFP',
          afc_applicable: true,
          contract_type: 'indefinido',
        },
        payroll_periods: {
          id: 'period-1',
          year: 2026,
          month: 7,
          status: 'open',
        },
        payroll_items: [],
      } as any

      // Verificamos que NO lanza error de periodo cerrado
      // (Puede fallar por otros motivos como DB, pero no por periodo cerrado)
      try {
        const result = await calculateReliquidation(
          mockSlip,
          { base_salary: 600000 },
          {} as any,
        )
        // Si llega aquí, no lanzó error de periodo cerrado
        expect(result).toBeDefined()
      } catch (error: any) {
        // No debe ser error de periodo cerrado
        expect(error.message).not.toContain('No se puede recalcular una reliquidacion para un periodo cerrado')
      }
    })
  })

  // 11. Período cerrado
  describe('Período cerrado', () => {
    it('reliquidacion lanza error para periodo cerrado', async () => {
      const mockSlip = {
        id: 'slip-1',
        base_salary: 500000,
        days_worked: 30,
        days_leave: 0,
        taxable_base: 500000,
        total_taxable_earnings: 500000,
        total_non_taxable_earnings: 0,
        total_earnings: 500000,
        total_legal_deductions: 100000,
        total_other_deductions: 0,
        total_deductions: 100000,
        net_pay: 400000,
        employees: { id: 'emp-1', rut: '1-9', full_name: 'T', base_salary: 500000, status: 'active' },
        payroll_periods: { id: 'p-1', year: 2026, month: 7, status: 'closed' },
        payroll_items: [],
      } as any

      await expect(
        calculateReliquidation(mockSlip, {}, {} as any)
      ).rejects.toThrow('No se puede recalcular una reliquidacion para un periodo cerrado')
    })
  })

  // 12. Comparación legacy vs motor central
  describe('Comparación legacy vs motor central', () => {
    it('motor central calcula SIS como aporte del empleador (no en descuentos)', async () => {
      const context = makeContext()
      const result = await calculatePrevisional(context)

      // SIS no debe estar en descuentos del trabajador
      expect(result.employeeDeductions.total).toBe(
        result.employeeDeductions.pension +
        result.employeeDeductions.health +
        result.employeeDeductions.afcTrabajador
      )
      // SIS si debe estar en aportes del empleador
      expect(result.sisAmount).toBeGreaterThan(0)
    })

    it('motor central calcula AFP empleador 0.1% como aporte separado', async () => {
      const context = makeContext()
      const result = await calculatePrevisional(context)

      expect(result.afpEmployerAccountRate).toBe(0.1)
      expect(result.afpEmployerAccountAmount).toBeCloseTo(500, -1)
    })

    it('motor central aplica topes imponibles correctamente', async () => {
      // Sueldo 15M, tope AFP 9070256
      const context = makeContext({
        taxableEarnings: 15000000,
        baseSalaryProportional: 15000000,
      })

      const result = await calculatePrevisional(context)

      expect(result.baseImponibleAFP).toBe(9070256)
      // Las cotizaciones AFP deben calcularse sobre el tope, no sobre 15M
      const expectedAFP = Math.ceil(9070256 * 0.1145)
      expect(result.employeeDeductions.pension).toBeCloseTo(expectedAFP, -2)
    })

    it('regimen especial (OTRO_REGIMEN) no calcula SIS, CRP ni AFC', async () => {
      const context = makeContext({
        employee: makeEmployeeContext({
          previsionalRegime: 'OTRO_REGIMEN',
          otherRegimeType: 'DIPRECA',
          manualPensionRate: 6,
          manualHealthRate: 7,
        }),
      })

      const result = await calculatePrevisional(context)

      expect(result.regime).toBe('OTRO_REGIMEN')
      expect(result.sisAmount).toBe(0)
      expect(result.crpAmount).toBe(0)
      expect(result.afcEmployerAmount).toBe(0)
      expect(result.employeeDeductions.afcTrabajador).toBe(0)
    })

    it('AFC trabajador es 0 para contrato plazo fijo', async () => {
      mockGetPrevisionalRate.mockImplementation((conceptCode: any) => {
        const rates = standardRates(2026, 7)
        if (conceptCode === 'AFC_TRABAJADOR_PLAZO_FIJO') {
          return Promise.resolve(mockRate('AFC_TRABAJADOR_PLAZO_FIJO', 0))
        }
        if (conceptCode === 'AFC_EMPLEADOR_PLAZO_FIJO') {
          return Promise.resolve(mockEmployerRate('AFC_EMPLEADOR_PLAZO_FIJO', 3.0))
        }
        const r = rates[conceptCode as string]
        if (r) return Promise.resolve(r)
        return Promise.resolve(mockRate(conceptCode, 0, true))
      })

      const context = makeContext({
        employee: makeEmployeeContext({ contractType: 'plazo_fijo' }),
      })
      const result = await calculatePrevisional(context)

      expect(result.employeeDeductions.afcTrabajador).toBe(0)
      expect(result.afcEmployerAmount).toBeCloseTo(15000, -1) // 3.0% de 500000
    })
  })

  // Extra: Verificar que conceptos con start date no bloquean pre-applicability
  describe('Conceptos con fecha de inicio', () => {
    it('AFP_EMPLEADOR_CUENTA_INDIVIDUAL no bloquea en julio 2025 (pre-applicability)', async () => {
      setupStandardMocks(2025, 7)
      mockGetPrevisionalRate.mockImplementation((conceptCode: any) => {
        const rates = standardRates(2025, 7)
        // AFP_EMPLEADOR_CUENTA_INDIVIDUAL starts 2025-08-01, so in 2025-07 it's not applicable
        // and should NOT block
        const r = rates[conceptCode as string]
        if (r) return Promise.resolve(r)
        return Promise.resolve(mockRate(conceptCode, 0, true))
      })

      const context = makeContext({ year: 2025, month: 7 })
      const result = await calculatePrevisional(context)

      // Should not block on AFP_EMPLEADOR_CUENTA_INDIVIDUAL
      // because isConceptNotYetApplicable returns true for 2025-07
      expect(result.blockedConcepts).not.toContain('AFP_EMPLEADOR_CUENTA_INDIVIDUAL')
      expect(result.warnings).toContain('AFP_EMPLEADOR_CUENTA_INDIVIDUAL no aplica para periodos anteriores a agosto 2025')
    })
  })
})