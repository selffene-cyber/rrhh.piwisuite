import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { PayrollSlipWithDetails, PayrollCalculationResult, PayrollReliquidationDelta, PayrollReliquidationItem } from '@/types'
import { calculatePayrollV2, PayrollCalculationInputV2, PayrollCalculationResultV2 } from './payrollCalculatorV2'
import { getCachedIndicators } from './indicatorsCache'
import type { EmployeeWithPrevision } from '@/types/prevision'

/**
 * Parametros modificables para una reliquidacion
 */
export type ReliquidationModifications = {
  days_worked?: number
  days_leave?: number
  base_salary?: number
  bonuses?: number
  overtime?: number
  vacation?: number
  other_taxable_earnings?: number
  transportation?: number
  meal_allowance?: number
  aguinaldo?: number
  loans?: number
  advances?: number
  permission_discount?: number
}

/**
 * Resultado del calculo de reliquidacion
 */
export type ReliquidationCalculationResult = {
  original: PayrollSlipWithDetails
  corrected: PayrollCalculationResult
  correctedV2: PayrollCalculationResultV2
  delta: PayrollReliquidationDelta
  items: PayrollReliquidationItem[]
  total_diff_net_pay: number
}

/**
 * Convierte un resultado V2 al formato V1 (PayrollCalculationResult)
 * para compatibilidad con el sistema de reliquidaciones existente.
 */
function mapV2ToV1Result(v2: PayrollCalculationResultV2): PayrollCalculationResult {
  return {
    taxableBase: v2.taxableBase,
    taxableBaseForTax: v2.taxableBase - v2.legalDeductions.total,
    taxableEarnings: v2.taxableEarnings,
    nonTaxableEarnings: v2.nonTaxableEarnings,
    legalDeductions: {
      afp10: v2.legalDeductions.pension > 0
        ? Math.ceil(v2.taxableBase * 0.10)
        : 0,
      afpAdditional: v2.legalDeductions.pension > 0
        ? v2.legalDeductions.pension - Math.ceil(v2.taxableBase * 0.10)
        : 0,
      health: v2.legalDeductions.health,
      unemploymentInsurance: v2.legalDeductions.afc ?? 0,
      uniqueTax: v2.legalDeductions.uniqueTax,
      total: v2.legalDeductions.total,
    },
    otherDeductions: v2.otherDeductions,
    netPay: v2.netPay,
  }
}

/**
 * Calcula una reliquidacion basandose en una liquidacion original
 *
 * FASE 5: Integracion con motor central previsional.
 * - Delega a V2 (que a su vez delega al motor central).
 * - Si faltan tasas validated, BLOQUEA el calculo (lanza error).
 * - Si el periodo esta cerrado, BLOQUEA el calculo (lanza error).
 * - Periodos cerrados NUNCA se recalculan.
 *
 * @param originalSlip Liquidacion original (debe estar emitida o enviada)
 * @param modifications Modificaciones a aplicar
 * @param supabase Cliente de Supabase
 * @throws Error si el periodo esta cerrado o faltan tasas validated
 */
export async function calculateReliquidation(
  originalSlip: PayrollSlipWithDetails,
  modifications: ReliquidationModifications,
  supabase: SupabaseClient<Database>
): Promise<ReliquidationCalculationResult> {
  if (!originalSlip.employees) {
    throw new Error('La liquidacion original debe incluir datos del empleado')
  }

  if (!originalSlip.payroll_periods) {
    throw new Error('La liquidacion original debe incluir datos del periodo')
  }

  const employee = originalSlip.employees
  const period = originalSlip.payroll_periods

  // BLOQUEO: Periodos cerrados NO se recalculan
  if (period.status === 'closed') {
    throw new Error(
      `No se puede recalcular una reliquidacion para un periodo cerrado (${period.month}/${period.year}). ` +
      `Los periodos cerrados tienen resultados historicos inmutables.`
    )
  }

  // Obtener indicadores del periodo
  const indicators = await getCachedIndicators(period.year, period.month)

  // Construir EmployeeWithPrevision desde los datos del empleado
  const employeeWithPrevision: EmployeeWithPrevision = {
    id: employee.id,
    rut: employee.rut,
    full_name: employee.full_name,
    base_salary: modifications.base_salary ?? originalSlip.base_salary,
    previsional_regime: (employee as any).previsional_regime || 'AFP',
    afp: employee.afp || undefined,
    health_system: employee.health_system || undefined,
    health_plan: employee.health_plan || undefined,
    health_plan_percentage: employee.health_plan_percentage ?? undefined,
    other_regime_type: (employee as any).other_regime_type as any ?? undefined,
    manual_pension_rate: (employee as any).manual_pension_rate ?? undefined,
    manual_health_rate: (employee as any).manual_health_rate ?? undefined,
    manual_employer_rate: (employee as any).manual_employer_rate ?? undefined,
    manual_base_type: (employee as any).manual_base_type as any ?? undefined,
    manual_regime_label: (employee as any).manual_regime_label ?? undefined,
    afc_applicable: (employee as any).afc_applicable ?? true,
    contract_type: (employee as any).contract_type ?? undefined,
    transportation: (employee as any).transportation ?? undefined,
    meal_allowance: (employee as any).meal_allowance ?? undefined,
    status: employee.status,
  }

  // Preparar input para V2
  const correctedInputV2: PayrollCalculationInputV2 = {
    employee: employeeWithPrevision,
    year: period.year,
    month: period.month,
    daysWorked: modifications.days_worked ?? originalSlip.days_worked,
    daysLeave: modifications.days_leave ?? originalSlip.days_leave ?? 0,
    baseSalary: modifications.base_salary ?? originalSlip.base_salary,
    bonuses: modifications.bonuses ?? 0,
    overtime: modifications.overtime ?? 0,
    vacation: modifications.vacation ?? 0,
    otherTaxableEarnings: modifications.other_taxable_earnings ?? 0,
    transportation: modifications.transportation ?? 0,
    mealAllowance: modifications.meal_allowance ?? 0,
    aguinaldo: modifications.aguinaldo ?? 0,
    loans: modifications.loans ?? 0,
    advances: modifications.advances ?? 0,
    permissionDiscount: modifications.permission_discount ?? 0,
    indicators,
  }

  // Calcular liquidacion corregida usando V2 (que delega al motor central)
  // Si faltan tasas validated, V2 lanza Error con mensaje "Calculo bloqueado"
  const correctedResultV2 = await calculatePayrollV2(correctedInputV2)

  // Mapear resultado V2 a V1 para compatibilidad con el delta
  const correctedResult = mapV2ToV1Result(correctedResultV2)

  // Calcular base imponible corregida
  const correctedTaxableBase = correctedResult.taxableBase

  // Calcular totales corregidos
  const correctedTotalTaxableEarnings = correctedResult.taxableEarnings.total
  const correctedTotalNonTaxableEarnings = correctedResult.nonTaxableEarnings.total
  const correctedTotalEarnings = correctedTotalTaxableEarnings + correctedTotalNonTaxableEarnings
  const correctedTotalLegalDeductions = correctedResult.legalDeductions.total
  const correctedTotalOtherDeductions = correctedResult.otherDeductions.total
  const correctedTotalDeductions = correctedTotalLegalDeductions + correctedTotalOtherDeductions
  const correctedNetPay = correctedResult.netPay

  // Calcular diferencias
  const diffDaysWorked = (modifications.days_worked ?? originalSlip.days_worked) - originalSlip.days_worked
  const diffDaysLeave = (modifications.days_leave ?? originalSlip.days_leave) - (originalSlip.days_leave || 0)
  const diffBaseSalary = correctedInputV2.baseSalary - originalSlip.base_salary
  const diffTaxableBase = correctedTaxableBase - originalSlip.taxable_base
  const diffTotalTaxableEarnings = correctedTotalTaxableEarnings - originalSlip.total_taxable_earnings
  const diffTotalNonTaxableEarnings = correctedTotalNonTaxableEarnings - originalSlip.total_non_taxable_earnings
  const diffTotalEarnings = correctedTotalEarnings - originalSlip.total_earnings
  const diffTotalLegalDeductions = correctedTotalLegalDeductions - originalSlip.total_legal_deductions
  const diffTotalOtherDeductions = correctedTotalOtherDeductions - originalSlip.total_other_deductions
  const diffTotalDeductions = correctedTotalDeductions - originalSlip.total_deductions
  const diffNetPay = correctedNetPay - originalSlip.net_pay

  // Crear delta
  const delta: Omit<PayrollReliquidationDelta, 'id' | 'reliquidation_id' | 'created_at'> = {
    original_days_worked: originalSlip.days_worked,
    original_days_leave: originalSlip.days_leave || 0,
    original_base_salary: originalSlip.base_salary,
    original_taxable_base: originalSlip.taxable_base,
    original_total_taxable_earnings: originalSlip.total_taxable_earnings,
    original_total_non_taxable_earnings: originalSlip.total_non_taxable_earnings,
    original_total_earnings: originalSlip.total_earnings,
    original_total_legal_deductions: originalSlip.total_legal_deductions,
    original_total_other_deductions: originalSlip.total_other_deductions,
    original_total_deductions: originalSlip.total_deductions,
    original_net_pay: originalSlip.net_pay,
    corrected_days_worked: modifications.days_worked ?? originalSlip.days_worked,
    corrected_days_leave: (modifications.days_leave ?? originalSlip.days_leave) || 0,
    corrected_base_salary: correctedInputV2.baseSalary,
    corrected_taxable_base: correctedTaxableBase,
    corrected_total_taxable_earnings: correctedTotalTaxableEarnings,
    corrected_total_non_taxable_earnings: correctedTotalNonTaxableEarnings,
    corrected_total_earnings: correctedTotalEarnings,
    corrected_total_legal_deductions: correctedTotalLegalDeductions,
    corrected_total_other_deductions: correctedTotalOtherDeductions,
    corrected_total_deductions: correctedTotalDeductions,
    corrected_net_pay: correctedNetPay,
    diff_days_worked: diffDaysWorked,
    diff_days_leave: diffDaysLeave,
    diff_base_salary: diffBaseSalary,
    diff_taxable_base: diffTaxableBase,
    diff_total_taxable_earnings: diffTotalTaxableEarnings,
    diff_total_non_taxable_earnings: diffTotalNonTaxableEarnings,
    diff_total_earnings: diffTotalEarnings,
    diff_total_legal_deductions: diffTotalLegalDeductions,
    diff_total_other_deductions: diffTotalOtherDeductions,
    diff_total_deductions: diffTotalDeductions,
    diff_net_pay: diffNetPay,
  } as Omit<PayrollReliquidationDelta, 'id' | 'reliquidation_id' | 'created_at'>

  // Crear items de reliquidacion (deltas por concepto)
  const items: Omit<PayrollReliquidationItem, 'id' | 'reliquidation_id' | 'created_at'>[] = []

  const originalItems = originalSlip.payroll_items || []

  // Haberes imponibles
  const originalBaseSalary = originalItems
    .filter(i => i.type === 'taxable_earning' && i.category === 'sueldo_base')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  if (originalBaseSalary !== correctedInputV2.baseSalary || modifications.base_salary !== undefined) {
    items.push({
      original_item_id: originalItems.find(i => i.type === 'taxable_earning' && i.category === 'sueldo_base')?.id || null,
      type: 'taxable_earning',
      category: 'sueldo_base',
      description: 'Sueldo Base',
      original_amount: originalBaseSalary,
      corrected_amount: correctedInputV2.baseSalary,
      difference: correctedInputV2.baseSalary - originalBaseSalary,
      is_taxable: true,
      is_tributable: true,
      affects_deductions: true,
      affects_gratification: true,
    })
  }

  const originalBonuses = originalItems
    .filter(i => i.type === 'taxable_earning' && i.category === 'bonos')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  if (originalBonuses !== correctedInputV2.bonuses || modifications.bonuses !== undefined) {
    items.push({
      original_item_id: originalItems.find(i => i.type === 'taxable_earning' && i.category === 'bonos')?.id || null,
      type: 'taxable_earning',
      category: 'bonos',
      description: 'Bonos',
      original_amount: originalBonuses,
      corrected_amount: correctedInputV2.bonuses || 0,
      difference: (correctedInputV2.bonuses || 0) - originalBonuses,
      is_taxable: true,
      is_tributable: true,
      affects_deductions: true,
      affects_gratification: true,
    })
  }

  const originalOvertime = originalItems
    .filter(i => i.type === 'taxable_earning' && i.category === 'horas_extras')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  if (originalOvertime !== correctedInputV2.overtime || modifications.overtime !== undefined) {
    items.push({
      original_item_id: originalItems.find(i => i.type === 'taxable_earning' && i.category === 'horas_extras')?.id || null,
      type: 'taxable_earning',
      category: 'horas_extras',
      description: 'Horas Extras',
      original_amount: originalOvertime,
      corrected_amount: correctedInputV2.overtime || 0,
      difference: (correctedInputV2.overtime || 0) - originalOvertime,
      is_taxable: true,
      is_tributable: true,
      affects_deductions: true,
      affects_gratification: true,
    })
  }

  const originalVacation = originalItems
    .filter(i => i.type === 'taxable_earning' && i.category === 'vacaciones')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  if (originalVacation !== correctedInputV2.vacation || modifications.vacation !== undefined) {
    items.push({
      original_item_id: originalItems.find(i => i.type === 'taxable_earning' && i.category === 'vacaciones')?.id || null,
      type: 'taxable_earning',
      category: 'vacaciones',
      description: 'Vacaciones',
      original_amount: originalVacation,
      corrected_amount: correctedInputV2.vacation || 0,
      difference: (correctedInputV2.vacation || 0) - originalVacation,
      is_taxable: true,
      is_tributable: true,
      affects_deductions: true,
      affects_gratification: true,
    })
  }

  // Descuentos legales
  const originalLegalDeductions = originalSlip.total_legal_deductions
  if (originalLegalDeductions !== correctedTotalLegalDeductions) {
    items.push({
      original_item_id: null,
      type: 'legal_deduction',
      category: 'descuentos_legales',
      description: 'Descuentos Legales (AFP, Salud, Cesantia, Impuesto Unico)',
      original_amount: originalLegalDeductions,
      corrected_amount: correctedTotalLegalDeductions,
      difference: correctedTotalLegalDeductions - originalLegalDeductions,
      is_taxable: false,
      is_tributable: false,
      affects_deductions: true,
      affects_gratification: false,
    })
  }

  // Otros descuentos
  const originalOtherDeductions = originalSlip.total_other_deductions
  if (originalOtherDeductions !== correctedTotalOtherDeductions) {
    items.push({
      original_item_id: null,
      type: 'other_deduction',
      category: 'otros_descuentos',
      description: 'Otros Descuentos (Prestamos, Anticipos)',
      original_amount: originalOtherDeductions,
      corrected_amount: correctedTotalOtherDeductions,
      difference: correctedTotalOtherDeductions - originalOtherDeductions,
      is_taxable: false,
      is_tributable: false,
      affects_deductions: true,
      affects_gratification: false,
    })
  }

  return {
    original: originalSlip,
    corrected: correctedResult,
    correctedV2: correctedResultV2,
    delta: delta as PayrollReliquidationDelta,
    items: items as PayrollReliquidationItem[],
    total_diff_net_pay: diffNetPay,
  }
}