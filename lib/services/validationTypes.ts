/**
 * Tipos para respuestas de validación de reglas de negocio
 */

export type ValidationResult = {
  allowed: boolean
  code: string
  message: string
  details?: Record<string, any>
}

export type EmployeeStatus = 'active' | 'inactive' | 'renuncia' | 'despido'
export type ContractStatus = 'draft' | 'issued' | 'signed' | 'active' | 'terminated' | 'cancelled'
export type AnnexStatus = 'draft' | 'issued' | 'signed' | 'active' | 'cancelled'
export type ContractType = 'indefinido' | 'plazo_fijo' | 'obra_faena' | 'part_time'

/**
 * Códigos de error estándar para validaciones
 */
export const ValidationCodes = {
  // Empleado
  EMPLOYEE_NOT_ACTIVE: 'EMPLOYEE_NOT_ACTIVE',
  EMPLOYEE_INACTIVE: 'EMPLOYEE_INACTIVE',
  EMPLOYEE_HAS_ACTIVE_CONTRACT: 'EMPLOYEE_HAS_ACTIVE_CONTRACT',
  EMPLOYEE_NO_ACTIVE_CONTRACT: 'EMPLOYEE_NO_ACTIVE_CONTRACT',
  EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE: 'EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE',
  
  // Contrato
  CONTRACT_ALREADY_ACTIVE: 'CONTRACT_ALREADY_ACTIVE',
  CONTRACT_NOT_ACTIVE: 'CONTRACT_NOT_ACTIVE',
  CONTRACT_INVALID_STATUS: 'CONTRACT_INVALID_STATUS',
  CONTRACT_TERMINATION_REQUIRED: 'CONTRACT_TERMINATION_REQUIRED',
  CONTRACT_SETTLEMENT_REQUIRED: 'CONTRACT_SETTLEMENT_REQUIRED',
  
  // Anexo
  ANNEX_REQUIRES_ACTIVE_CONTRACT: 'ANNEX_REQUIRES_ACTIVE_CONTRACT',
  ANNEX_CONTRACT_INVALID_STATUS: 'ANNEX_CONTRACT_INVALID_STATUS',
  
  // Préstamo
  LOAN_REQUIRES_INDEFINIDO_CONTRACT: 'LOAN_REQUIRES_INDEFINIDO_CONTRACT',
  
  // Permiso
  PERMISSION_ALREADY_ACTIVE: 'PERMISSION_ALREADY_ACTIVE',
  
  // General
  OPERATION_ALLOWED: 'OPERATION_ALLOWED',
} as const

/**
 * Helper para crear respuestas de validación
 */
export function createValidationResult(
  allowed: boolean,
  code: string,
  message: string,
  details?: Record<string, any>
): ValidationResult {
  return { allowed, code, message, details }
}

/**
 * Helper para respuestas exitosas
 */
export function allowed(message: string = 'Operación permitida', details?: Record<string, any>): ValidationResult {
  return createValidationResult(true, ValidationCodes.OPERATION_ALLOWED, message, details)
}

/**
 * Helper para respuestas denegadas
 */
export function denied(code: string, message: string, details?: Record<string, any>): ValidationResult {
  return createValidationResult(false, code, message, details)
}


