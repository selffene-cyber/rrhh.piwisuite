import { SupabaseClient } from '@supabase/supabase-js'
import { Database, SalaryReportRow, SalarySummary, ReportFilters } from '@/types'

export async function getSalaryReport(
  filters: ReportFilters,
  supabase: SupabaseClient<Database>
): Promise<{ rows: SalaryReportRow[]; summary: SalarySummary }> {
  let query = supabase
    .from('employees')
    .select(`
      id,
      rut,
      full_name,
      position,
      base_salary,
      transportation,
      meal_allowance,
      advance_amount,
      requests_advance,
      cost_centers (code, name)
    `)

  if (filters.companyId) {
    query = query.eq('company_id', filters.companyId)
  }

  if (filters.costCenterId) {
    query = query.eq('cost_center_id', filters.costCenterId)
  }

  if (filters.employeeStatus) {
    query = query.eq('status', filters.employeeStatus)
  }

  const { data, error } = await query.order('full_name', { ascending: true })

  if (error) {
    throw new Error(`Error al obtener reporte de sueldos: ${error.message}`)
  }

  const rows: SalaryReportRow[] = (data || []).map((emp: any) => {
    const baseSalary = Number(emp.base_salary) || 0
    const transportation = Number(emp.transportation) || 0
    const mealAllowance = Number(emp.meal_allowance) || 0
    const advanceAmount = emp.requests_advance ? (Number(emp.advance_amount) || 0) : 0
    const totalRemuneration = baseSalary + transportation + mealAllowance

    return {
      rut: emp.rut || '',
      full_name: emp.full_name || '',
      cost_center_code: emp.cost_centers?.code || null,
      cost_center_name: emp.cost_centers?.name || null,
      position: emp.position || null,
      base_salary: baseSalary,
      transportation: transportation,
      meal_allowance: mealAllowance,
      advance_amount: advanceAmount,
      requests_advance: emp.requests_advance || false,
      total_remuneration: totalRemuneration,
    }
  })

  // Calcular resumen
  const summary: SalarySummary = {
    totalBaseSalary: rows.reduce((sum, row) => sum + row.base_salary, 0),
    totalTransportation: rows.reduce((sum, row) => sum + row.transportation, 0),
    totalMealAllowance: rows.reduce((sum, row) => sum + row.meal_allowance, 0),
    totalAdvanceAmount: rows.reduce((sum, row) => sum + row.advance_amount, 0),
    totalRemuneration: rows.reduce((sum, row) => sum + row.total_remuneration, 0),
    byCostCenter: [],
    byPosition: [],
  }

  // Agrupar por centro de costo
  const costCenterMap = new Map<string, { totalBaseSalary: number; totalRemuneration: number; count: number }>()
  rows.forEach((row) => {
    const key = row.cost_center_code ? `${row.cost_center_code} - ${row.cost_center_name}` : 'Sin Centro de Costo'
    const existing = costCenterMap.get(key) || { totalBaseSalary: 0, totalRemuneration: 0, count: 0 }
    costCenterMap.set(key, {
      totalBaseSalary: existing.totalBaseSalary + row.base_salary,
      totalRemuneration: existing.totalRemuneration + row.total_remuneration,
      count: existing.count + 1,
    })
  })
  summary.byCostCenter = Array.from(costCenterMap.entries()).map(([costCenter, data]) => ({
    costCenter,
    ...data,
  }))

  // Agrupar por cargo
  const positionMap = new Map<string, { totalBaseSalary: number; count: number }>()
  rows.forEach((row) => {
    const key = row.position || 'Sin Cargo'
    const existing = positionMap.get(key) || { totalBaseSalary: 0, count: 0 }
    positionMap.set(key, {
      totalBaseSalary: existing.totalBaseSalary + row.base_salary,
      count: existing.count + 1,
    })
  })
  summary.byPosition = Array.from(positionMap.entries()).map(([position, data]) => ({
    position,
    avgBaseSalary: data.count > 0 ? data.totalBaseSalary / data.count : 0,
    totalBaseSalary: data.totalBaseSalary,
    count: data.count,
  }))

  return { rows, summary }
}

