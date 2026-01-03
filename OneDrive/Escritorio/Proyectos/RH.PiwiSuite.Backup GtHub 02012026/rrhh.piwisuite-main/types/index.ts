import { Database } from './database'

export type Company = Database['public']['Tables']['companies']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type PayrollPeriod = Database['public']['Tables']['payroll_periods']['Row']
export type PayrollSlip = Database['public']['Tables']['payroll_slips']['Row']
export type PayrollItem = Database['public']['Tables']['payroll_items']['Row']

export type EmployeeWithCompany = Employee & {
  companies?: Company | null
}

export type PayrollSlipWithDetails = PayrollSlip & {
  employees?: Employee | null
  payroll_periods?: PayrollPeriod | null
  payroll_items?: PayrollItem[]
}

export type PayrollCalculationInput = {
  baseSalary: number
  daysWorked: number
  daysLeave: number
  afp: string
  healthSystem: string
  healthPlanPercentage?: number // Monto del plan ISAPRE en UF (Unidades de Fomento). Se multiplicará por el valor de UF del día al calcular la liquidación.
  // Haberes imponibles adicionales
  bonuses?: number
  overtime?: number
  vacation?: number
  otherTaxableEarnings?: number // Otros haberes imponibles (opcional)
  // Haberes no imponibles
  transportation?: number
  mealAllowance?: number
  aguinaldo?: number
  // Otros descuentos
  loans?: number
  advances?: number
  permissionDiscount?: number // Descuento por permisos sin goce de sueldo
}

export type PayrollCalculationResult = {
  taxableBase: number
  taxableEarnings: {
    baseSalary: number
    bonuses: number
    monthlyGratification: number
    overtime: number
    vacation: number
    otherTaxableEarnings?: number
    total: number
  }
  nonTaxableEarnings: {
    transportation: number
    mealAllowance: number
    aguinaldo: number
    total: number
  }
  legalDeductions: {
    afp10: number
    afpAdditional: number
    health: number
    unemploymentInsurance: number
    uniqueTax: number
    total: number
  }
  otherDeductions: {
    loans: number
    advances: number
    permissionDiscount?: number
    total: number
  }
  netPay: number
}

// Tipos para Libro de Remuneraciones / LRE
export type PayrollBook = {
  id: string
  company_id: string
  year: number
  month: number
  status: 'draft' | 'closed' | 'sent_dt'
  generated_by: string | null
  generated_at: string
  closed_at: string | null
  sent_to_dt_at: string | null
  total_employees: number
  total_taxable_earnings: number
  total_non_taxable_earnings: number
  total_legal_deductions: number
  total_other_deductions: number
  total_employer_contributions: number
  total_net_pay: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export type PayrollBookEntry = {
  id: string
  payroll_book_id: string
  employee_id: string
  payroll_slip_id: string | null
  // Snapshot del trabajador
  employee_rut: string
  employee_name: string
  employee_hire_date: string | null
  employee_contract_end_date: string | null
  employee_contract_type: string | null
  employee_afp: string
  employee_health_system: string
  employee_health_plan: string | null
  employee_position: string | null
  employee_cost_center: string | null
  // Haberes imponibles
  base_salary: number
  monthly_gratification: number
  bonuses: number
  overtime: number
  vacation_paid: number
  other_taxable_earnings: number
  total_taxable_earnings: number
  // Haberes no imponibles
  transportation: number
  meal_allowance: number
  aguinaldo: number
  other_non_taxable_earnings: number
  total_non_taxable_earnings: number
  // Descuentos legales
  afp_deduction: number
  health_deduction: number
  unemployment_insurance_deduction: number
  unique_tax_deduction: number
  total_legal_deductions: number
  // Otros descuentos
  loans_deduction: number
  advances_deduction: number
  other_deductions: number
  total_other_deductions: number
  // Aportes empleador
  employer_afp_contribution: number
  employer_sis_contribution: number
  employer_afc_contribution: number
  total_employer_contributions: number
  // Totales
  total_earnings: number
  total_deductions: number
  net_pay: number
  // Días
  days_worked: number
  days_leave: number
  created_at: string
}

export type PayrollBookWithEntries = PayrollBook & {
  entries?: PayrollBookEntry[]
  company?: Company | null
}

// Tipos para Centros de Costo
// @ts-expect-error - cost_centers table may not be in Database type yet
export type CostCenter = Database['public']['Tables']['cost_centers']['Row']
// @ts-expect-error - user_cost_centers table may not be in Database type yet
export type UserCostCenter = Database['public']['Tables']['user_cost_centers']['Row']

export type CostCenterWithCompany = CostCenter & {
  companies?: Company | null
}

export type UserCostCenterWithDetails = UserCostCenter & {
  cost_centers?: CostCenter | null
  companies?: Company | null
}

// Report Types
export type ReportFilters = {
  companyId?: string
  costCenterId?: string
  year?: number
  month?: number
  employeeStatus?: string
  contractType?: string
  afp?: string
  healthSystem?: string
  startDate?: string
  endDate?: string
}

export type HeadcountReportRow = {
  rut: string
  full_name: string
  cost_center_code?: string | null
  cost_center_name?: string | null
  position?: string | null
  afp?: string | null
  health_system?: string | null
  health_plan?: string | null
  contract_type?: string | null
  status: string
  hire_date?: string | null
  contract_end_date?: string | null
}

export type HeadcountSummary = {
  totalEmployees: number
  byCostCenter: Array<{ costCenter: string; count: number }>
  byAFP: Array<{ afp: string; count: number }>
  byHealthSystem: Array<{ system: string; count: number }>
  byContractType: Array<{ type: string; count: number }>
}

export type SalaryReportRow = {
  rut: string
  full_name: string
  cost_center_code?: string | null
  cost_center_name?: string | null
  position?: string | null
  base_salary: number
  transportation: number
  meal_allowance: number
  advance_amount: number
  requests_advance: boolean
  total_remuneration: number
}

export type SalarySummary = {
  totalBaseSalary: number
  totalTransportation: number
  totalMealAllowance: number
  totalAdvanceAmount: number
  totalRemuneration: number
  byCostCenter: Array<{
    costCenter: string
    totalBaseSalary: number
    totalRemuneration: number
    count: number
  }>
  byPosition: Array<{
    position: string
    avgBaseSalary: number
    totalBaseSalary: number
    count: number
  }>
}

export type LeaveReportRow = {
  rut: string
  full_name: string
  status: string
  medical_leave_active: boolean
  medical_leave_days: number
  medical_leave_start?: string
  medical_leave_end?: string
  vacation_days_accumulated?: number
  vacation_days_taken?: number
}

export type LeaveSummary = {
  totalActiveMedicalLeaves: number
  totalMedicalLeaveDays: number
  byStatus: Array<{ status: string; count: number }>
  employeesWithActiveLeaves: number
}

export type OrganizationalReportRow = {
  position?: string
  cost_center_code?: string | null
  cost_center_name?: string | null
  employee_count: number
}

export type PayrollReportRow = {
  period: string
  rut: string
  full_name: string
  cost_center_code?: string | null
  cost_center_name?: string | null
  total_taxable_earnings: number
  total_non_taxable_earnings: number
  total_legal_deductions: number
  total_other_deductions: number
  net_pay: number
}

export type PayrollSummary = {
  totalNetPay: number
  totalTaxableEarnings: number
  totalNonTaxableEarnings: number
  totalLegalDeductions: number
  totalOtherDeductions: number
  byCostCenter: Array<{
    costCenter: string
    totalNetPay: number
    count: number
  }>
}

export type LoanAdvanceReportRow = {
  rut: string
  full_name: string
  cost_center_code?: string | null
  cost_center_name?: string | null
  loan_amount: number
  loan_balance: number
  advance_amount: number
  advance_status?: string
  total_debt: number
}

export type LoanAdvanceSummary = {
  totalLoans: number
  totalLoanBalance: number
  totalAdvances: number
  totalDebt: number
  byCostCenter: Array<{
    costCenter: string
    totalLoanBalance: number
    totalAdvances: number
    count: number
  }>
}

