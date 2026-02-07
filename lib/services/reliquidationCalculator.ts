import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { PayrollSlipWithDetails, PayrollCalculationInput, PayrollCalculationResult, PayrollReliquidationDelta, PayrollReliquidationItem } from '@/types'
import { calculatePayroll } from './payrollCalculator'
import { getCachedIndicators } from './indicatorsCache'

/**
 * Parámetros modificables para una reliquidación
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
 * Resultado del cálculo de reliquidación
 */
export type ReliquidationCalculationResult = {
  original: PayrollSlipWithDetails
  corrected: PayrollCalculationResult
  delta: PayrollReliquidationDelta
  items: PayrollReliquidationItem[]
  total_diff_net_pay: number
}

/**
 * Calcula una reliquidación basándose en una liquidación original
 * @param originalSlip Liquidación original (debe estar emitida o enviada)
 * @param modifications Modificaciones a aplicar
 * @param supabase Cliente de Supabase
 * @returns Resultado del cálculo con deltas
 */
export async function calculateReliquidation(
  originalSlip: PayrollSlipWithDetails,
  modifications: ReliquidationModifications,
  supabase: SupabaseClient<Database>
): Promise<ReliquidationCalculationResult> {
  if (!originalSlip.employees) {
    throw new Error('La liquidación original debe incluir datos del empleado')
  }

  if (!originalSlip.payroll_periods) {
    throw new Error('La liquidación original debe incluir datos del período')
  }

  const employee = originalSlip.employees
  const period = originalSlip.payroll_periods

  // Obtener indicadores del período
  const indicators = await getCachedIndicators(period.year, period.month)

  // Preparar input para cálculo corregido
  const correctedInput: PayrollCalculationInput = {
    baseSalary: modifications.base_salary ?? originalSlip.base_salary,
    daysWorked: modifications.days_worked ?? originalSlip.days_worked,
    daysLeave: modifications.days_leave ?? originalSlip.days_leave,
    afp: employee.afp || 'PROVIDA',
    healthSystem: employee.health_system || 'FONASA',
    healthPlanPercentage: employee.health_plan_percentage || undefined,
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
  }

  // Obtener valores originales de los ítems
  const originalItems = originalSlip.payroll_items || []
  
  // Extraer valores originales de los ítems
  for (const item of originalItems) {
    if (item.type === 'taxable_earning') {
      if (item.category === 'sueldo_base') {
        correctedInput.baseSalary = modifications.base_salary ?? originalSlip.base_salary
      } else if (item.category === 'bonos') {
        correctedInput.bonuses = (modifications.bonuses ?? Number(item.amount)) || 0
      } else if (item.category === 'horas_extras') {
        correctedInput.overtime = (modifications.overtime ?? Number(item.amount)) || 0
      } else if (item.category === 'vacaciones') {
        correctedInput.vacation = (modifications.vacation ?? Number(item.amount)) || 0
      } else {
        correctedInput.otherTaxableEarnings = (correctedInput.otherTaxableEarnings || 0) + ((modifications.other_taxable_earnings ?? Number(item.amount)) || 0)
      }
    } else if (item.type === 'non_taxable_earning') {
      if (item.category === 'movilizacion') {
        correctedInput.transportation = (modifications.transportation ?? Number(item.amount)) || 0
      } else if (item.category === 'colacion') {
        correctedInput.mealAllowance = (modifications.meal_allowance ?? Number(item.amount)) || 0
      } else if (item.category === 'aguinaldo') {
        correctedInput.aguinaldo = (modifications.aguinaldo ?? Number(item.amount)) || 0
      }
    } else if (item.type === 'other_deduction') {
      if (item.category === 'prestamos') {
        correctedInput.loans = (modifications.loans ?? Number(item.amount)) || 0
      } else if (item.category === 'anticipos') {
        correctedInput.advances = (modifications.advances ?? Number(item.amount)) || 0
      }
    }
  }

  // Calcular liquidación corregida
  const correctedResult = await calculatePayroll(
    correctedInput,
    indicators,
    period.year,
    period.month
  )

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
  const diffBaseSalary = correctedInput.baseSalary - originalSlip.base_salary
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
    // Originales
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
    // Corregidos
    corrected_days_worked: modifications.days_worked ?? originalSlip.days_worked,
    corrected_days_leave: (modifications.days_leave ?? originalSlip.days_leave) || 0,
    corrected_base_salary: correctedInput.baseSalary,
    corrected_taxable_base: correctedTaxableBase,
    corrected_total_taxable_earnings: correctedTotalTaxableEarnings,
    corrected_total_non_taxable_earnings: correctedTotalNonTaxableEarnings,
    corrected_total_earnings: correctedTotalEarnings,
    corrected_total_legal_deductions: correctedTotalLegalDeductions,
    corrected_total_other_deductions: correctedTotalOtherDeductions,
    corrected_total_deductions: correctedTotalDeductions,
    corrected_net_pay: correctedNetPay,
    // Diferencias
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

  // Crear ítems de reliquidación (deltas por concepto)
  const items: Omit<PayrollReliquidationItem, 'id' | 'reliquidation_id' | 'created_at'>[] = []

  // Haberes imponibles
  const originalBaseSalary = originalItems
    .filter(i => i.type === 'taxable_earning' && i.category === 'sueldo_base')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  if (originalBaseSalary !== correctedInput.baseSalary || modifications.base_salary !== undefined) {
    items.push({
      original_item_id: originalItems.find(i => i.type === 'taxable_earning' && i.category === 'sueldo_base')?.id || null,
      type: 'taxable_earning',
      category: 'sueldo_base',
      description: 'Sueldo Base',
      original_amount: originalBaseSalary,
      corrected_amount: correctedInput.baseSalary,
      difference: correctedInput.baseSalary - originalBaseSalary,
      is_taxable: true,
      is_tributable: true,
      affects_deductions: true,
      affects_gratification: true,
    })
  }

  // Bonos
  const originalBonuses = originalItems
    .filter(i => i.type === 'taxable_earning' && i.category === 'bonos')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  if (originalBonuses !== correctedInput.bonuses || modifications.bonuses !== undefined) {
    items.push({
      original_item_id: originalItems.find(i => i.type === 'taxable_earning' && i.category === 'bonos')?.id || null,
      type: 'taxable_earning',
      category: 'bonos',
      description: 'Bonos',
      original_amount: originalBonuses,
      corrected_amount: correctedInput.bonuses || 0,
      difference: (correctedInput.bonuses || 0) - originalBonuses,
      is_taxable: true,
      is_tributable: true,
      affects_deductions: true,
      affects_gratification: true,
    })
  }

  // Horas extras
  const originalOvertime = originalItems
    .filter(i => i.type === 'taxable_earning' && i.category === 'horas_extras')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  if (originalOvertime !== correctedInput.overtime || modifications.overtime !== undefined) {
    items.push({
      original_item_id: originalItems.find(i => i.type === 'taxable_earning' && i.category === 'horas_extras')?.id || null,
      type: 'taxable_earning',
      category: 'horas_extras',
      description: 'Horas Extras',
      original_amount: originalOvertime,
      corrected_amount: correctedInput.overtime || 0,
      difference: (correctedInput.overtime || 0) - originalOvertime,
      is_taxable: true,
      is_tributable: true,
      affects_deductions: true,
      affects_gratification: true,
    })
  }

  // Vacaciones
  const originalVacation = originalItems
    .filter(i => i.type === 'taxable_earning' && i.category === 'vacaciones')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  if (originalVacation !== correctedInput.vacation || modifications.vacation !== undefined) {
    items.push({
      original_item_id: originalItems.find(i => i.type === 'taxable_earning' && i.category === 'vacaciones')?.id || null,
      type: 'taxable_earning',
      category: 'vacaciones',
      description: 'Vacaciones',
      original_amount: originalVacation,
      corrected_amount: correctedInput.vacation || 0,
      difference: (correctedInput.vacation || 0) - originalVacation,
      is_taxable: true,
      is_tributable: true,
      affects_deductions: true,
      affects_gratification: true,
    })
  }

  // Descuentos legales (AFP, Salud, etc.)
  const originalLegalDeductions = originalSlip.total_legal_deductions
  if (originalLegalDeductions !== correctedTotalLegalDeductions) {
    items.push({
      original_item_id: null,
      type: 'legal_deduction',
      category: 'descuentos_legales',
      description: 'Descuentos Legales (AFP, Salud, Cesantía, Impuesto Único)',
      original_amount: originalLegalDeductions,
      corrected_amount: correctedTotalLegalDeductions,
      difference: correctedTotalLegalDeductions - originalLegalDeductions,
      is_taxable: false,
      is_tributable: false,
      affects_deductions: true,
      affects_gratification: false,
    })
  }

  // Otros descuentos (préstamos, anticipos)
  const originalOtherDeductions = originalSlip.total_other_deductions
  if (originalOtherDeductions !== correctedTotalOtherDeductions) {
    items.push({
      original_item_id: null,
      type: 'other_deduction',
      category: 'otros_descuentos',
      description: 'Otros Descuentos (Préstamos, Anticipos)',
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
    delta: delta as PayrollReliquidationDelta,
    items: items as PayrollReliquidationItem[],
    total_diff_net_pay: diffNetPay,
  }
}
