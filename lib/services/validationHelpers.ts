/**
 * Helpers para facilitar el uso de los servicios de validación
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { ValidationResult } from './validationTypes'
import { EmployeeEligibilityService } from './employeeEligibilityService'
import { ContractValidationService } from './contractValidationService'

/**
 * Crea instancias de los servicios de validación
 */
export function createValidationServices(supabase: SupabaseClient<Database>) {
  return {
    employee: new EmployeeEligibilityService(supabase),
    contract: new ContractValidationService(supabase),
  }
}

/**
 * Helper para lanzar error si la validación falla
 */
export function throwIfNotAllowed(result: ValidationResult): void {
  if (!result.allowed) {
    const error = new Error(result.message)
    ;(error as any).code = result.code
    ;(error as any).details = result.details
    throw error
  }
}

/**
 * Helper para obtener mensaje de error amigable
 */
export function getValidationErrorMessage(result: ValidationResult): string {
  if (result.allowed) {
    return ''
  }

  // Mensajes personalizados según el código
  const messages: Record<string, string> = {
    EMPLOYEE_NOT_ACTIVE: 'El trabajador no está activo',
    EMPLOYEE_HAS_ACTIVE_CONTRACT: 'El trabajador ya tiene un contrato activo. Debe crear un anexo.',
    EMPLOYEE_NO_ACTIVE_CONTRACT: 'El trabajador no posee un contrato activo',
    EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE: 'El trabajador tiene una licencia médica activa',
    CONTRACT_ALREADY_ACTIVE: 'Ya existe un contrato activo',
    CONTRACT_NOT_ACTIVE: 'El contrato no está activo',
    CONTRACT_TERMINATION_REQUIRED: 'Debe terminar el contrato actual primero',
    CONTRACT_SETTLEMENT_REQUIRED: 'Debe completar el finiquito antes de crear un nuevo contrato',
    ANNEX_REQUIRES_ACTIVE_CONTRACT: 'Se requiere un contrato activo para crear anexos',
    LOAN_REQUIRES_INDEFINIDO_CONTRACT: 'Los préstamos solo están disponibles para contratos indefinidos',
    PERMISSION_ALREADY_ACTIVE: 'El trabajador ya tiene un permiso activo',
  }

  return messages[result.code] || result.message
}

/**
 * Helper para verificar múltiples validaciones
 */
export async function validateAll(
  validations: Promise<ValidationResult>[]
): Promise<ValidationResult> {
  const results = await Promise.all(validations)
  
  const failed = results.find(r => !r.allowed)
  if (failed) {
    return failed
  }

  return results[0] // Retornar el primero si todos pasan
}

/**
 * Helper para validar en API routes
 */
export function handleValidationError(result: ValidationResult): Response | null {
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: result.message,
        code: result.code,
        details: result.details,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  return null
}


