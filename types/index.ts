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
  afp?: string | null // Opcional para regímenes especiales (DIPRECA, CAPREDENA, etc.)
  healthSystem?: string | null // Opcional para regímenes especiales
  healthPlanPercentage?: number // Monto del plan ISAPRE en UF (Unidades de Fomento). Se multiplicará por el valor de UF del día al calcular la liquidación.
  // Campos para regímenes especiales
  previsionalRegime?: 'AFP' | 'OTRO_REGIMEN' | null
  manualPensionRate?: number | null // Porcentaje de cotización previsional manual
  manualHealthRate?: number | null // Porcentaje de cotización de salud manual
  manualBaseType?: 'imponible' | 'sueldo_base' | null // Base de cálculo para régimen especial
  afcApplicable?: boolean // Si aplica AFC (Seguro de Cesantía)
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
  taxableBase: number // Base imponible (suma de haberes imponibles)
  taxableBaseForTax: number // Base tributable (haberes imponibles - descuentos legales del trabajador: AFP + Salud + Cesantía)
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
  // Campos de reliquidación
  is_reliquidation?: boolean
  reliquidation_id?: string | null
  reference_period_year?: number | null
  reference_period_month?: number | null
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
  employer_rentabilidad_protegida?: number
  employer_afp_account?: number
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

// Tipos para Reliquidaciones de Remuneraciones
export type PayrollReliquidation = {
  id: string
  company_id: string
  employee_id: string
  period_id: string
  reference_payroll_slip_id: string
  type: 'rectificatoria' | 'complementaria'
  reason_category: 'horas_extra' | 'retroactivo' | 'licencia' | 'tope_imponible' | 'descuento' | 'gratificacion' | 'otro'
  reason_text: string | null
  diff_taxable_earnings: number
  diff_non_taxable_earnings: number
  diff_total_earnings: number
  diff_legal_deductions: number
  diff_other_deductions: number
  diff_total_deductions: number
  diff_net_pay: number
  status: 'draft' | 'approved' | 'issued' | 'paid'
  created_by: string | null
  approved_by: string | null
  issued_by: string | null
  created_at: string
  approved_at: string | null
  issued_at: string | null
  paid_at: string | null
  updated_at: string
  metadata: Record<string, any>
  pdf_url: string | null
}

export type PayrollReliquidationItem = {
  id: string
  reliquidation_id: string
  original_item_id: string | null
  type: 'taxable_earning' | 'non_taxable_earning' | 'legal_deduction' | 'other_deduction'
  category: string
  description: string
  original_amount: number
  corrected_amount: number
  difference: number
  is_taxable: boolean
  is_tributable: boolean
  affects_deductions: boolean
  affects_gratification: boolean
  created_at: string
}

export type PayrollReliquidationDelta = {
  id: string
  reliquidation_id: string
  // Originales
  original_days_worked: number | null
  original_days_leave: number | null
  original_base_salary: number | null
  original_taxable_base: number | null
  original_total_taxable_earnings: number | null
  original_total_non_taxable_earnings: number | null
  original_total_earnings: number | null
  original_total_legal_deductions: number | null
  original_total_other_deductions: number | null
  original_total_deductions: number | null
  original_net_pay: number | null
  // Corregidos
  corrected_days_worked: number | null
  corrected_days_leave: number | null
  corrected_base_salary: number | null
  corrected_taxable_base: number | null
  corrected_total_taxable_earnings: number | null
  corrected_total_non_taxable_earnings: number | null
  corrected_total_earnings: number | null
  corrected_total_legal_deductions: number | null
  corrected_total_other_deductions: number | null
  corrected_total_deductions: number | null
  corrected_net_pay: number | null
  // Diferencias
  diff_days_worked: number
  diff_days_leave: number
  diff_base_salary: number
  diff_taxable_base: number
  diff_total_taxable_earnings: number
  diff_total_non_taxable_earnings: number
  diff_total_earnings: number
  diff_total_legal_deductions: number
  diff_total_other_deductions: number
  diff_total_deductions: number
  diff_net_pay: number
  created_at: string
}

export type PayrollReliquidationWithDetails = PayrollReliquidation & {
  employees?: Employee | null
  payroll_periods?: PayrollPeriod | null
  payroll_slips?: PayrollSlipWithDetails | null
  payroll_reliquidation_items?: PayrollReliquidationItem[]
  payroll_reliquidation_deltas?: PayrollReliquidationDelta | null
}

export type ReliquidationReasonCategory = 
  | 'horas_extra'
  | 'retroactivo'
  | 'licencia'
  | 'tope_imponible'
  | 'descuento'
  | 'gratificacion'
  | 'otro'

export const RELIQUIDATION_REASON_CATEGORIES: Record<ReliquidationReasonCategory, string> = {
  horas_extra: 'Error en horas extra / trato / comisiones',
  retroactivo: 'Retroactivo por reajuste / convenio',
  licencia: 'Licencia médica / subsidio / días no trabajados',
  tope_imponible: 'Tope imponible / renta vital / cambio AFP/Isapre/Fonasa',
  descuento: 'Descuento mal aplicado (préstamo, atraso, inasistencia)',
  gratificacion: 'Gratificación mal calculada',
  otro: 'Otro'
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

// ============================================================
// Tipos para Roles y Permisos (Sistema Executive)
// ============================================================// Roles del sistema
export type UserRole = 'super_admin' | 'admin' | 'ejecutivo' | 'user'

// Permisos granulares por usuario
export interface UserPermissions {
  // ===== PERMISOS DE VISTA =====
  can_view_employees: boolean              // Ver lista de trabajadores
  can_view_employee_details: boolean       // Ver detalles completos de trabajadores
  can_view_employee_salary: boolean        // Ver información salarial de trabajadores
  can_view_contracts: boolean              // Ver contratos
  
  // ===== PERMISOS DE DESCARGA =====
  can_download_contracts: boolean          // Descargar contratos
  can_download_payroll: boolean            // Descargar liquidaciones
  can_download_certificates: boolean       // Descargar certificados
  can_download_settlements: boolean        // Descargar finiquitos
  can_download_employee_documents: boolean // Descargar documentos adjuntos de trabajadores
  
  // ===== PERMISOS DE DOCUMENTOS (crear vs aprobar) =====
  can_create_permissions: boolean
  can_approve_permissions: boolean
  can_create_vacations: boolean
  can_approve_vacations: boolean
  can_create_contracts: boolean
  can_approve_contracts: boolean
  can_edit_contracts: boolean              // Editar contratos
  can_delete_contracts: boolean            // Eliminar contratos
  can_create_amendments: boolean
  can_approve_amendments: boolean
  can_create_certificates: boolean
  can_approve_certificates: boolean
  can_create_disciplinary: boolean
  can_approve_disciplinary: boolean
  can_create_overtime_pacts: boolean
  can_approve_overtime_pacts: boolean
  
  // ===== PERMISOS FINANCIEROS =====
  can_create_payroll: boolean
  can_approve_payroll: boolean
  can_create_settlements: boolean
  can_approve_settlements: boolean
  can_create_advances: boolean
  can_approve_advances: boolean
  can_view_reliquidations: boolean          // Ver reliquidaciones
  can_create_reliquidations: boolean        // Crear reliquidaciones
  can_approve_reliquidations: boolean       // Aprobar reliquidaciones
  can_view_legal_holidays: boolean          // Ver feriados legales
  
  // ===== PERMISOS DE PRÉSTAMOS (granular) =====
  can_view_loans: boolean                  // Ver lista de préstamos
  can_create_loans: boolean                // Crear nuevos préstamos
  can_edit_loans: boolean                  // Editar préstamos existentes
  can_delete_loans: boolean                // Eliminar préstamos
  can_download_loans: boolean              // Descargar PDF de préstamos
  
  // ===== PERMISOS DE CUMPLIMIENTO (granular) =====
  can_view_compliance: boolean             // Ver cumplimientos
  can_create_compliance: boolean           // Crear cumplimientos
  can_edit_compliance: boolean             // Editar cumplimientos
  can_delete_compliance: boolean           // Eliminar cumplimientos
  can_download_compliance_reports: boolean // Descargar reportes de cumplimiento
  
  // ===== PERMISOS DE RAAT (granular) =====
  can_view_raat: boolean                   // Ver RAAT
  can_create_raat: boolean                 // Crear registros RAAT
  can_edit_raat: boolean                   // Editar registros RAAT
  can_delete_raat: boolean                 // Eliminar registros RAAT
  can_download_raat_reports: boolean       // Descargar reportes RAAT
  
  // ===== PERMISOS DE BANCO DE DOCUMENTOS (granular) =====
  can_view_documents: boolean              // Ver banco de documentos
  can_upload_documents: boolean            // Subir documentos
  can_download_documents: boolean          // Descargar documentos del banco
  can_edit_documents: boolean              // Editar metadatos de documentos
  can_delete_documents: boolean            // Eliminar documentos
  can_manage_document_categories: boolean  // Gestionar categorías de documentos
  
  // ===== PERMISOS DE DEPARTAMENTOS (granular) =====
  can_view_departments: boolean            // Ver departamentos
  can_create_departments: boolean          // Crear departamentos
  can_edit_departments: boolean            // Editar departamentos
  can_delete_departments: boolean          // Eliminar departamentos
  
  // ===== PERMISOS DE CENTROS DE COSTO (granular) =====
  can_view_cost_centers: boolean           // Ver centros de costo
  can_create_cost_centers: boolean         // Crear centros de costo
  can_edit_cost_centers: boolean           // Editar centros de costo
  can_delete_cost_centers: boolean         // Eliminar centros de costo
  can_assign_cost_centers: boolean         // Asignar trabajadores a centros de costo
  
  // ===== PERMISOS DE ORGANIGRAMA (granular) =====
  can_view_org_chart: boolean              // Ver organigrama
  can_edit_org_chart: boolean              // Editar estructura jerárquica
  can_download_org_chart: boolean          // Descargar organigrama
  
  // ===== PERMISOS DE CONFIGURACIÓN (granular) =====
  can_edit_company_settings: boolean       // Editar datos de empresa (RUT, razón social, etc.)
  can_manage_indicators: boolean           // Gestionar indicadores económicos
  can_manage_signatures: boolean           // Gestionar firmas digitales
  can_manage_tax_brackets: boolean         // Gestionar tramos tributarios
  can_manage_users_roles: boolean          // Gestionar usuarios y roles (crear/editar/eliminar usuarios)
  can_manage_company_settings: boolean     // DEPRECATED: Mantener por compatibilidad, usar los permisos específicos arriba
}

// Permisos por defecto para cada rol
export const DEFAULT_PERMISSIONS: Record<UserRole, Partial<UserPermissions>> = {
  super_admin: {
    // Super admin tiene TODOS los permisos
    // Vista
    can_view_employees: true,
    can_view_employee_details: true,
    can_view_employee_salary: true,
    can_view_contracts: true,
    // Descarga
    can_download_contracts: true,
    can_download_payroll: true,
    can_download_certificates: true,
    can_download_settlements: true,
    can_download_employee_documents: true,
    // Documentos
    can_create_permissions: true,
    can_approve_permissions: true,
    can_create_vacations: true,
    can_approve_vacations: true,
    can_create_contracts: true,
    can_approve_contracts: true,
    can_edit_contracts: true,
    can_delete_contracts: true,
    can_create_amendments: true,
    can_approve_amendments: true,
    can_create_certificates: true,
    can_approve_certificates: true,
    can_create_disciplinary: true,
    can_approve_disciplinary: true,
    can_create_overtime_pacts: true,
    can_approve_overtime_pacts: true,
    // Finanzas
    can_create_payroll: true,
    can_approve_payroll: true,
    can_create_settlements: true,
    can_approve_settlements: true,
    can_create_advances: true,
    can_approve_advances: true,
    can_view_reliquidations: true,
    can_create_reliquidations: true,
    can_approve_reliquidations: true,
    can_view_legal_holidays: true,
    // Préstamos
    can_view_loans: true,
    can_create_loans: true,
    can_edit_loans: true,
    can_delete_loans: true,
    can_download_loans: true,
    // Cumplimiento
    can_view_compliance: true,
    can_create_compliance: true,
    can_edit_compliance: true,
    can_delete_compliance: true,
    can_download_compliance_reports: true,
    // RAAT
    can_view_raat: true,
    can_create_raat: true,
    can_edit_raat: true,
    can_delete_raat: true,
    can_download_raat_reports: true,
    // Banco de Documentos
    can_view_documents: true,
    can_upload_documents: true,
    can_download_documents: true,
    can_edit_documents: true,
    can_delete_documents: true,
    can_manage_document_categories: true,
    // Departamentos
    can_view_departments: true,
    can_create_departments: true,
    can_edit_departments: true,
    can_delete_departments: true,
    // Centros de Costo
    can_view_cost_centers: true,
    can_create_cost_centers: true,
    can_edit_cost_centers: true,
    can_delete_cost_centers: true,
    can_assign_cost_centers: true,
    // Organigrama
    can_view_org_chart: true,
    can_edit_org_chart: true,
    can_download_org_chart: true,
    // Configuración
    can_edit_company_settings: true,
    can_manage_indicators: true,
    can_manage_signatures: true,
    can_manage_tax_brackets: true,
    can_manage_users_roles: true,
    can_manage_company_settings: true, // DEPRECATED
  },
  admin: {
    // Admin tiene todos los permisos excepto algunos de configuración global
    // Vista
    can_view_employees: true,
    can_view_employee_details: true,
    can_view_employee_salary: true,
    can_view_contracts: true,
    // Descarga
    can_download_contracts: true,
    can_download_payroll: true,
    can_download_certificates: true,
    can_download_settlements: true,
    can_download_employee_documents: true,
    // Documentos
    can_create_permissions: true,
    can_approve_permissions: true,
    can_create_vacations: true,
    can_approve_vacations: true,
    can_create_contracts: true,
    can_approve_contracts: true,
    can_edit_contracts: true,
    can_delete_contracts: true,
    can_create_amendments: true,
    can_approve_amendments: true,
    can_create_certificates: true,
    can_approve_certificates: true,
    can_create_disciplinary: true,
    can_approve_disciplinary: true,
    can_create_overtime_pacts: true,
    can_approve_overtime_pacts: true,
    // Finanzas
    can_create_payroll: true,
    can_approve_payroll: true,
    can_create_settlements: true,
    can_approve_settlements: true,
    can_create_advances: true,
    can_approve_advances: true,
    can_view_reliquidations: true,
    can_create_reliquidations: true,
    can_approve_reliquidations: true,
    can_view_legal_holidays: true,
    // Préstamos
    can_view_loans: true,
    can_create_loans: true,
    can_edit_loans: true,
    can_delete_loans: true,
    can_download_loans: true,
    // Cumplimiento
    can_view_compliance: true,
    can_create_compliance: true,
    can_edit_compliance: true,
    can_delete_compliance: true,
    can_download_compliance_reports: true,
    // RAAT
    can_view_raat: true,
    can_create_raat: true,
    can_edit_raat: true,
    can_delete_raat: true,
    can_download_raat_reports: true,
    // Banco de Documentos
    can_view_documents: true,
    can_upload_documents: true,
    can_download_documents: true,
    can_edit_documents: true,
    can_delete_documents: true,
    can_manage_document_categories: true,
    // Departamentos
    can_view_departments: true,
    can_create_departments: true,
    can_edit_departments: true,
    can_delete_departments: true,
    // Centros de Costo
    can_view_cost_centers: true,
    can_create_cost_centers: true,
    can_edit_cost_centers: true,
    can_delete_cost_centers: true,
    can_assign_cost_centers: true,
    // Organigrama
    can_view_org_chart: true,
    can_edit_org_chart: true,
    can_download_org_chart: true,
    // Configuración
    can_edit_company_settings: true,       // Admin puede editar datos de empresa
    can_manage_indicators: true,           // Admin puede gestionar indicadores
    can_manage_signatures: true,           // Admin puede gestionar firmas
    can_manage_tax_brackets: true,         // Admin puede gestionar tramos
    can_manage_users_roles: true,          // Admin puede gestionar usuarios
    can_manage_company_settings: true,     // DEPRECATED
  },
  ejecutivo: {
    // Ejecutivo: puede CREAR documentos pero NO aprobar
    // Vista: puede ver trabajadores y detalles básicos, pero NO salarios
    can_view_employees: true,              // ✅ Puede ver lista de trabajadores
    can_view_employee_details: true,       // ✅ Puede ver detalles básicos
    can_view_employee_salary: false,       // ❌ NO puede ver salarios
    can_view_contracts: true,              // ✅ Puede ver contratos
    // Descarga: puede descargar documentos pero NO liquidaciones/finiquitos
    can_download_contracts: true,
    can_download_payroll: false,           // ❌ NO puede descargar liquidaciones
    can_download_certificates: true,
    can_download_settlements: false,       // ❌ NO puede descargar finiquitos
    can_download_employee_documents: true,
    // Documentos: puede CREAR pero NO aprobar
    can_create_permissions: true,
    can_approve_permissions: false,
    can_create_vacations: true,
    can_approve_vacations: false,
    can_create_contracts: true,            // ✅ Ahora SÍ puede crear contratos
    can_approve_contracts: false,
    can_edit_contracts: false,             // ❌ NO puede editar contratos
    can_delete_contracts: false,           // ❌ NO puede eliminar contratos
    can_create_amendments: true,
    can_approve_amendments: false,
    can_create_certificates: true,
    can_approve_certificates: false,
    can_create_disciplinary: true,
    can_approve_disciplinary: false,
    can_create_overtime_pacts: true,
    can_approve_overtime_pacts: false,
    // Finanzas: sin acceso
    can_create_payroll: false,
    can_approve_payroll: false,
    can_create_settlements: false,
    can_approve_settlements: false,
    can_create_advances: false,
    can_approve_advances: false,
    can_view_reliquidations: false,
    can_create_reliquidations: false,
    can_approve_reliquidations: false,
    can_view_legal_holidays: true,
    // Préstamos: puede ver, crear, pero NO editar/eliminar
    can_view_loans: true,
    can_create_loans: true,
    can_edit_loans: false,
    can_delete_loans: false,
    can_download_loans: true,
    // Cumplimiento: puede ver y crear, pero NO editar/eliminar
    can_view_compliance: true,
    can_create_compliance: true,
    can_edit_compliance: false,
    can_delete_compliance: false,
    can_download_compliance_reports: true,
    // RAAT: puede ver y crear, pero NO editar/eliminar
    can_view_raat: true,
    can_create_raat: true,
    can_edit_raat: false,
    can_delete_raat: false,
    can_download_raat_reports: true,
    // Banco de Documentos: puede ver, subir y descargar, pero NO editar/eliminar
    can_view_documents: true,
    can_upload_documents: true,
    can_download_documents: true,
    can_edit_documents: false,
    can_delete_documents: false,
    can_manage_document_categories: false,
    // Departamentos: solo ver
    can_view_departments: true,
    can_create_departments: false,
    can_edit_departments: false,
    can_delete_departments: false,
    // Centros de Costo: solo ver
    can_view_cost_centers: true,
    can_create_cost_centers: false,
    can_edit_cost_centers: false,
    can_delete_cost_centers: false,
    can_assign_cost_centers: false,
    // Organigrama: solo ver y descargar
    can_view_org_chart: true,
    can_edit_org_chart: false,
    can_download_org_chart: true,
    // Configuración: sin acceso
    can_edit_company_settings: false,
    can_manage_indicators: false,
    can_manage_signatures: false,
    can_manage_tax_brackets: false,
    can_manage_users_roles: false,
    can_manage_company_settings: false, // DEPRECATED
  },
  user: {
    // User (trabajador): sin permisos administrativos
    // Vista: solo puede ver su propia información (no lista de trabajadores)
    can_view_employees: false,             // ❌ NO puede ver lista de trabajadores
    can_view_employee_details: false,      // ❌ NO puede ver detalles de otros
    can_view_employee_salary: false,       // ❌ NO puede ver salarios
    can_view_contracts: false,             // ❌ NO puede ver contratos de otros
    // Descarga: solo puede descargar sus propios documentos
    can_download_contracts: false,
    can_download_payroll: false,
    can_download_certificates: false,
    can_download_settlements: false,
    can_download_employee_documents: false,
    // Documentos: sin permisos
    can_create_permissions: false,
    can_approve_permissions: false,
    can_create_vacations: false,
    can_approve_vacations: false,
    can_create_contracts: false,
    can_approve_contracts: false,
    can_edit_contracts: false,
    can_delete_contracts: false,
    can_create_amendments: false,
    can_approve_amendments: false,
    can_create_certificates: false,
    can_approve_certificates: false,
    can_create_disciplinary: false,
    can_approve_disciplinary: false,
    can_create_overtime_pacts: false,
    can_approve_overtime_pacts: false,
    // Finanzas: sin permisos
    can_create_payroll: false,
    can_approve_payroll: false,
    can_create_settlements: false,
    can_approve_settlements: false,
    can_create_advances: false,
    can_approve_advances: false,
    can_view_reliquidations: false,
    can_create_reliquidations: false,
    can_approve_reliquidations: false,
    can_view_legal_holidays: false,
    // Préstamos: sin permisos
    can_view_loans: false,
    can_create_loans: false,
    can_edit_loans: false,
    can_delete_loans: false,
    can_download_loans: false,
    // Cumplimiento: sin permisos
    can_view_compliance: false,
    can_create_compliance: false,
    can_edit_compliance: false,
    can_delete_compliance: false,
    can_download_compliance_reports: false,
    // RAAT: sin permisos
    can_view_raat: false,
    can_create_raat: false,
    can_edit_raat: false,
    can_delete_raat: false,
    can_download_raat_reports: false,
    // Banco de Documentos: sin permisos
    can_view_documents: false,
    can_upload_documents: false,
    can_download_documents: false,
    can_edit_documents: false,
    can_delete_documents: false,
    can_manage_document_categories: false,
    // Departamentos: sin permisos
    can_view_departments: false,
    can_create_departments: false,
    can_edit_departments: false,
    can_delete_departments: false,
    // Centros de Costo: sin permisos
    can_view_cost_centers: false,
    can_create_cost_centers: false,
    can_edit_cost_centers: false,
    can_delete_cost_centers: false,
    can_assign_cost_centers: false,
    // Organigrama: sin permisos
    can_view_org_chart: false,
    can_edit_org_chart: false,
    can_download_org_chart: false,
    // Configuración: sin permisos
    can_edit_company_settings: false,
    can_manage_indicators: false,
    can_manage_signatures: false,
    can_manage_tax_brackets: false,
    can_manage_users_roles: false,
    can_manage_company_settings: false, // DEPRECATED
  },
}

// =====================================================
// Tipos LRE (Libro de Remuneraciones Electrónico - DT)
// =====================================================

export type LREValidationStatus = 'valid' | 'warnings' | 'errors'

export type LREValidationError = {
  employee_id: string
  employee_rut: string
  employee_name: string
  field_code: number
  field_name: string
  error_type: 'missing_mandatory' | 'invalid_type' | 'invalid_size' | 'invalid_code' | 'invalid_business_rule'
  severity: 'blocking' | 'warning'
  message: string
  current_value?: unknown
}

export type LREExportResult = {
  success: boolean
  validation_status: LREValidationStatus
  blocking_errors: number
  warnings: number
  errors: LREValidationError[]
  file_name?: string
  file_content?: string
  total_employees?: number
}

export type LREEmployeeRow = {
  // Categoría 1: Identificación
  rut_trabajador: string
  fecha_inicio_contrato: string
  fecha_termino_contrato?: string
  causal_termino?: number
  region_servicios: number
  comuna_servicios: number
  tipo_impuesto_renta: number
  tecnico_extranjero: number
  tipo_jornada: number
  discapacidad: number
  pensionado_vejez: number
  afp: number
  ips_exinp: number
  fonasa_isapre: number
  afc: number
  ccaf: number
  organismo_ley16744: number
  cargas_familiares_legales?: number
  cargas_familiares_maternales?: number
  cargas_familiares_invalidez?: number
  tramo_asignacion_familiar?: string
  rut_sindicatos?: string[]
  dias_trabajados: number
  dias_licencia_medica?: number
  dias_vacaciones?: number
  subsidio_trabajador_joven: number
  puesto_trabajo_pesado?: string
  ahorro_previsional_voluntario: number
  ahorro_previsional_colectivo: number
  indemnizacion_a_todo_evento: number
  tasa_indemnizacion?: number
  // Categoría 2: Haberes
  sueldo_base?: number
  sobresueldo?: number
  comisiones?: number
  semana_corrida?: number
  participacion?: number
  gratificacion_mensual?: number
  recargo_30_domingo?: number
  rem_variable_vacaciones?: number
  rem_variable_clausura?: number
  aguinaldo_imp?: number
  bonos_fijos_mensuales?: number
  tratos?: number
  bonos_variables?: number
  ejercicio_opcion?: number
  beneficios_especie?: number
  rem_bimestrales?: number
  rem_trimestrales?: number
  rem_cuatrimestrales?: number
  rem_semestrales?: number
  rem_anuales?: number
  participacion_anual?: number
  gratificacion_anual?: number
  otras_rem_mas_1_mes?: number
  pago_horas_sindical?: number
  sueldo_empresarial?: number
  subsidio_incapacidad?: number
  beca_estudio?: number
  gratificacion_zona?: number
  otros_ingresos_no_renta?: number
  colacion?: number
  movilizacion?: number
  viaticos?: number
  perdida_caja?: number
  desgaste_herramienta?: number
  asignacion_familiar_legal?: number
  gastos_causa_trabajo?: number
  gastos_cambio_residencia?: number
  sala_cuna?: number
  trabajo_distancia?: number
  deposito_convenido_uf900?: number
  alojamiento?: number
  asignacion_traslacion?: number
  indemnizacion_feriado_legal?: number
  indemnizacion_anos_servicio?: number
  indemnizacion_sustitutiva_aviso?: number
  indemnizacion_fuero_maternal?: number
  indemnizacion_a_todo_evento_no_trib?: number
  indemnizacion_voluntaria_tributable?: number
  indemnizacion_contractual_tributable?: number
  // Categoría 3: Descuentos
  cotizacion_obligatoria_afp?: number
  cotizacion_obligatoria_salud?: number
  cotizacion_voluntaria_salud?: number
  cotizacion_afc_trabajador?: number
  cotizacion_tecnico_extranjero?: number
  descuento_deposito_convenido?: number
  apv_individual_modalidad_a?: number
  apv_individual_modalidad_b?: number
  apv_colectivo_modalidad_a?: number
  apv_colectivo_modalidad_b?: number
  impuesto_retenido_remuneraciones?: number
  impuesto_retenido_indemnizaciones?: number
  mayor_retencion_solicitada?: number
  reliquidacion_impuesto?: number
  reliquidacion_indemnizaciones?: number
  retencion_prestamo_clase_media?: number
  rebaja_zona_extrema?: number
  cuotas_sindicales?: number[]
  credito_social_ccaf?: number
  cuota_vivienda_educacion?: number
  credito_cooperativas?: number
  otros_descuentos_autorizados?: number
  cotizacion_adicional_trabajo_pesado?: number
  donaciones_culturales?: number
  otros_descuentos_art58?: number
  pensiones_alimentos?: number
  descuento_mujer_casada?: number
  descuentos_anticipos_prestamos?: number
  // Categoría 4: Aportes empleador
  aporte_afc_empleador?: number
  aporte_seguro_accidentes?: number
  aporte_seguro_invalidez?: number
  aporte_indemnizacion_evento?: number
  aporte_adicional_trabajo_pesado?: number
  aporte_apv_colectivo_empleador?: number
  // Categoría 5: Totales
  total_haberes?: number
  total_haberes_imp_trib?: number
  total_haberes_imp_no_trib?: number
  total_haberes_no_imp_no_trib?: number
  total_haberes_no_imp_trib?: number
  total_descuentos?: number
  total_descuentos_impuestos_rem?: number
  total_descuentos_impuestos_ind?: number
  total_descuentos_cotizaciones?: number
  total_otros_descuentos?: number
  total_aportes_empleador?: number
  total_liquido?: number
  total_indemnizaciones?: number
  total_indemnizaciones_tributables?: number
  total_indemnizaciones_no_tributables?: number
}