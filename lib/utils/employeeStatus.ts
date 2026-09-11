/**
 * Constantes y helpers centralizados para el estado de trabajadores.
 *
 * Regla de negocio:
 * - ACTIVELY_EMPLOYED: puede participar en procesos operacionales (liquidaciones, anticipos, etc.)
 * - TERMINATED: vínculo laboral terminado, no participa en procesos operacionales
 *   salvo última liquidación si termination_date cae dentro del período
 * - INACTIVE: inactivo genérico, no participa en procesos operacionales
 */

export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MEDICAL_LEAVE: 'licencia_medica',
  RESIGNED: 'renuncia',
  FIRED: 'despido',
} as const

export type EmployeeStatus = (typeof EMPLOYEE_STATUS)[keyof typeof EMPLOYEE_STATUS]

export const ACTIVE_STATUSES: EmployeeStatus[] = [
  EMPLOYEE_STATUS.ACTIVE,
  EMPLOYEE_STATUS.MEDICAL_LEAVE,
]

export const TERMINATED_STATUSES: EmployeeStatus[] = [
  EMPLOYEE_STATUS.RESIGNED,
  EMPLOYEE_STATUS.FIRED,
]

export const INACTIVE_STATUSES: EmployeeStatus[] = [
  EMPLOYEE_STATUS.INACTIVE,
]

export const NON_OPERATIONAL_STATUSES: EmployeeStatus[] = [
  ...TERMINATED_STATUSES,
  ...INACTIVE_STATUSES,
]

export const ALL_STATUSES: EmployeeStatus[] = [
  EMPLOYEE_STATUS.ACTIVE,
  EMPLOYEE_STATUS.MEDICAL_LEAVE,
  EMPLOYEE_STATUS.INACTIVE,
  EMPLOYEE_STATUS.RESIGNED,
  EMPLOYEE_STATUS.FIRED,
]

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  [EMPLOYEE_STATUS.ACTIVE]: 'Activo',
  [EMPLOYEE_STATUS.INACTIVE]: 'Inactivo',
  [EMPLOYEE_STATUS.MEDICAL_LEAVE]: 'Licencia Médica',
  [EMPLOYEE_STATUS.RESIGNED]: 'Renuncia',
  [EMPLOYEE_STATUS.FIRED]: 'Despido',
}

export const STATUS_COLORS: Record<EmployeeStatus, { bg: string; color: string; border: string }> = {
  [EMPLOYEE_STATUS.ACTIVE]: { bg: '#10b98120', color: '#10b981', border: '#10b981' },
  [EMPLOYEE_STATUS.INACTIVE]: { bg: '#6b728020', color: '#6b7280', border: '#6b7280' },
  [EMPLOYEE_STATUS.MEDICAL_LEAVE]: { bg: '#f59e0b20', color: '#f59e0b', border: '#f59e0b' },
  [EMPLOYEE_STATUS.RESIGNED]: { bg: '#3b82f620', color: '#3b82f6', border: '#3b82f6' },
  [EMPLOYEE_STATUS.FIRED]: { bg: '#ef444420', color: '#ef4444', border: '#ef4444' },
}

export function getEmployeeStatusLabel(status: string): string {
  return STATUS_LABELS[status as EmployeeStatus] || status
}

export function isOperationallyActive(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as EmployeeStatus)
}

export function isTerminated(status: string): boolean {
  return TERMINATED_STATUSES.includes(status as EmployeeStatus)
}

export function canGeneratePayroll(status: string, terminationDate: string | null, periodStart: string): boolean {
  if (isOperationallyActive(status)) return true
  if (isTerminated(status) && terminationDate) {
    return terminationDate >= periodStart
  }
  return false
}

export function shouldShowContractAlert(status: string): boolean {
  return isOperationallyActive(status)
}

export function getSupabaseStatusFilter(): string[] {
  return [...ACTIVE_STATUSES]
}

export function getSupabaseAllExceptTerminatedFilter(): string[] {
  return [EMPLOYEE_STATUS.ACTIVE, EMPLOYEE_STATUS.MEDICAL_LEAVE, EMPLOYEE_STATUS.INACTIVE]
}