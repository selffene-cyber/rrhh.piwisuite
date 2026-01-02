import { SupabaseClient } from '@supabase/supabase-js'
import { Database, LoanAdvanceReportRow, LoanAdvanceSummary, ReportFilters } from '@/types'

export async function getLoansAdvancesReport(
  filters: ReportFilters,
  supabase: SupabaseClient<Database>
): Promise<{ rows: LoanAdvanceReportRow[]; summary: LoanAdvanceSummary }> {
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
        totalLoans: 0,
        totalLoanBalance: 0,
        totalAdvances: 0,
        totalDebt: 0,
        byCostCenter: [],
      },
    }
  }

  // Obtener préstamos
  let loansQuery = supabase
    .from('loans')
    .select('id, employee_id, amount, status')
    .in('employee_id', employeeIds)
    .eq('status', 'active')

  const { data: loans, error: loansError } = await loansQuery

  if (loansError) {
    throw new Error(`Error al obtener préstamos: ${loansError.message}`)
  }

  // Obtener pagos de préstamos para calcular saldo
  const loanIds = (loans || []).map((loan: any) => loan.id)
  let paymentsQuery = supabase
    .from('loan_payments')
    .select('loan_id, amount')
    .in('loan_id', loanIds.length > 0 ? loanIds : ['00000000-0000-0000-0000-000000000000'])

  const { data: payments, error: paymentsError } = await paymentsQuery

  if (paymentsError && paymentsError.code !== 'PGRST116') {
    throw new Error(`Error al obtener pagos de préstamos: ${paymentsError.message}`)
  }

  // Calcular saldo por préstamo
  const loanBalanceMap = new Map<string, number>()
  ;(loans || []).forEach((loan: any) => {
    const totalPaid = (payments || [])
      .filter((p: any) => p.loan_id === loan.id)
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    const balance = (Number(loan.amount) || 0) - totalPaid
    loanBalanceMap.set(loan.employee_id, (loanBalanceMap.get(loan.employee_id) || 0) + balance)
  })

  // Obtener anticipos
  let advancesQuery = supabase
    .from('advances')
    .select('employee_id, amount, status')
    .in('employee_id', employeeIds)

  if (filters.startDate && filters.endDate) {
    advancesQuery = advancesQuery
      .gte('advance_date', filters.startDate)
      .lte('advance_date', filters.endDate)
  }

  const { data: advances, error: advancesError } = await advancesQuery

  if (advancesError) {
    throw new Error(`Error al obtener anticipos: ${advancesError.message}`)
  }

  // Agrupar anticipos por empleado
  const advancesMap = new Map<string, { amount: number; status?: string }>()
  ;(advances || []).forEach((advance: any) => {
    const existing = advancesMap.get(advance.employee_id) || { amount: 0 }
    advancesMap.set(advance.employee_id, {
      amount: existing.amount + (Number(advance.amount) || 0),
      status: advance.status,
    })
  })

  // Construir filas del reporte
  const rows: LoanAdvanceReportRow[] = (employees || []).map((emp: any) => {
    const loanBalance = loanBalanceMap.get(emp.id) || 0
    const advance = advancesMap.get(emp.id) || { amount: 0 }
    const totalDebt = loanBalance + advance.amount

    return {
      rut: emp.rut || '',
      full_name: emp.full_name || '',
      cost_center_code: emp.cost_centers?.code || null,
      cost_center_name: emp.cost_centers?.name || null,
      loan_amount: loanBalance > 0 ? loanBalance : 0,
      loan_balance: loanBalance,
      advance_amount: advance.amount,
      advance_status: advance.status,
      total_debt: totalDebt,
    }
  }).filter((row) => row.total_debt > 0) // Solo mostrar empleados con deuda

  // Calcular resumen
  const summary: LoanAdvanceSummary = {
    totalLoans: (loans || []).length,
    totalLoanBalance: rows.reduce((sum, row) => sum + row.loan_balance, 0),
    totalAdvances: rows.reduce((sum, row) => sum + row.advance_amount, 0),
    totalDebt: rows.reduce((sum, row) => sum + row.total_debt, 0),
    byCostCenter: [],
  }

  // Agrupar por centro de costo
  const costCenterMap = new Map<string, { totalLoanBalance: number; totalAdvances: number; count: number }>()
  rows.forEach((row) => {
    const key = row.cost_center_code ? `${row.cost_center_code} - ${row.cost_center_name}` : 'Sin Centro de Costo'
    const existing = costCenterMap.get(key) || { totalLoanBalance: 0, totalAdvances: 0, count: 0 }
    costCenterMap.set(key, {
      totalLoanBalance: existing.totalLoanBalance + row.loan_balance,
      totalAdvances: existing.totalAdvances + row.advance_amount,
      count: existing.count + 1,
    })
  })
  summary.byCostCenter = Array.from(costCenterMap.entries()).map(([costCenter, data]) => ({
    costCenter,
    ...data,
  }))

  return { rows, summary }
}

