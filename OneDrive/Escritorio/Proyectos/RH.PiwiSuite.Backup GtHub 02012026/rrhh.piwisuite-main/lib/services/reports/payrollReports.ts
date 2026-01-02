import { SupabaseClient } from '@supabase/supabase-js'
import { Database, PayrollReportRow, PayrollSummary, ReportFilters } from '@/types'

export async function getPayrollReport(
  filters: ReportFilters,
  supabase: SupabaseClient<Database>
): Promise<{ rows: PayrollReportRow[]; summary: PayrollSummary }> {
  // Obtener IDs de empleados según filtros
  let employeesQuery = supabase
    .from('employees')
    .select('id, rut, full_name, cost_centers (code, name)')

  if (filters.companyId) {
    employeesQuery = employeesQuery.eq('company_id', filters.companyId)
  }

  if (filters.costCenterId) {
    employeesQuery = employeesQuery.eq('cost_center_id', filters.costCenterId)
  }

  const { data: employees, error: employeesError } = await employeesQuery

  if (employeesError) {
    throw new Error(`Error al obtener empleados: ${employeesError.message}`)
  }

  const employeeIds = (employees || []).map((emp: any) => emp.id)

  if (employeeIds.length === 0) {
    return {
      rows: [],
      summary: {
        totalNetPay: 0,
        totalTaxableEarnings: 0,
        totalNonTaxableEarnings: 0,
        totalLegalDeductions: 0,
        totalOtherDeductions: 0,
        byCostCenter: [],
      },
    }
  }

  // Construir query de liquidaciones
  let payrollQuery = supabase
    .from('payroll_slips')
    .select(`
      id,
      total_taxable_earnings,
      total_non_taxable_earnings,
      total_legal_deductions,
      total_other_deductions,
      net_pay,
      payroll_periods (year, month)
    `)
    .in('employee_id', employeeIds)
    .in('status', ['issued', 'sent'])

  if (filters.year) {
    payrollQuery = payrollQuery.eq('payroll_periods.year', filters.year)
  }

  if (filters.month) {
    payrollQuery = payrollQuery.eq('payroll_periods.month', filters.month)
  }

  const { data: payrollSlips, error: payrollError } = await payrollQuery

  if (payrollError) {
    throw new Error(`Error al obtener liquidaciones: ${payrollError.message}`)
  }

  // Crear mapa de empleados por ID
  const employeesMap = new Map<string, any>()
  ;(employees || []).forEach((emp: any) => {
    employeesMap.set(emp.id, emp)
  })

  // Construir filas del reporte
  const rows: PayrollReportRow[] = (payrollSlips || []).map((slip: any) => {
    const employee = employeesMap.get(slip.employee_id)
    const period = slip.payroll_periods
      ? `${String(slip.payroll_periods.month).padStart(2, '0')}/${slip.payroll_periods.year}`
      : 'N/A'

    return {
      period,
      rut: employee?.rut || '',
      full_name: employee?.full_name || '',
      cost_center_code: employee?.cost_centers?.code || null,
      cost_center_name: employee?.cost_centers?.name || null,
      total_taxable_earnings: Number(slip.total_taxable_earnings) || 0,
      total_non_taxable_earnings: Number(slip.total_non_taxable_earnings) || 0,
      total_legal_deductions: Number(slip.total_legal_deductions) || 0,
      total_other_deductions: Number(slip.total_other_deductions) || 0,
      net_pay: Number(slip.net_pay) || 0,
    }
  })

  // Calcular resumen
  const summary: PayrollSummary = {
    totalNetPay: rows.reduce((sum, row) => sum + row.net_pay, 0),
    totalTaxableEarnings: rows.reduce((sum, row) => sum + row.total_taxable_earnings, 0),
    totalNonTaxableEarnings: rows.reduce((sum, row) => sum + row.total_non_taxable_earnings, 0),
    totalLegalDeductions: rows.reduce((sum, row) => sum + row.total_legal_deductions, 0),
    totalOtherDeductions: rows.reduce((sum, row) => sum + row.total_other_deductions, 0),
    byCostCenter: [],
  }

  // Agrupar por centro de costo
  const costCenterMap = new Map<string, { totalNetPay: number; count: number }>()
  rows.forEach((row) => {
    const key = row.cost_center_code ? `${row.cost_center_code} - ${row.cost_center_name}` : 'Sin Centro de Costo'
    const existing = costCenterMap.get(key) || { totalNetPay: 0, count: 0 }
    costCenterMap.set(key, {
      totalNetPay: existing.totalNetPay + row.net_pay,
      count: existing.count + 1,
    })
  })
  summary.byCostCenter = Array.from(costCenterMap.entries()).map(([costCenter, data]) => ({
    costCenter,
    ...data,
  }))

  return { rows, summary }
}

