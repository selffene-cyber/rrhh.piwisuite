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
  healthPlanPercentage?: number // Porcentaje adicional del plan ISAPRE (solo para ISAPRE)
  // Haberes adicionales
  bonuses?: number
  overtime?: number
  vacation?: number
  // Haberes no imponibles
  transportation?: number
  mealAllowance?: number
  aguinaldo?: number
  // Otros descuentos
  loans?: number
  advances?: number
}

export type PayrollCalculationResult = {
  taxableBase: number
  taxableEarnings: {
    baseSalary: number
    bonuses: number
    monthlyGratification: number
    overtime: number
    vacation: number
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
    total: number
  }
  netPay: number
}

