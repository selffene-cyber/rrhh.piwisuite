/**
 * Validación de Contratos para Generación de Liquidaciones
 * Previene la generación de liquidaciones para trabajadores con contratos vencidos
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getEmployeeContractStatus, type EmployeeContractStatus } from './employeeContractStatus'

export interface PayrollValidationResult {
  isValid: boolean
  canGeneratePayroll: boolean
  message: string
  blockReason?: string
  contractStatus?: EmployeeContractStatus
  suggestions?: string[]
}

/**
 * Valida si se puede generar liquidación para un trabajador
 */
export async function validatePayrollGeneration(
  employeeId: string,
  period: { year: number; month: number },
  supabase: SupabaseClient
): Promise<PayrollValidationResult> {
  try {
    // Obtener el estado del contrato del trabajador
    const contractStatus = await getEmployeeContractStatus(employeeId, supabase)
    
    // Si no tiene contrato activo
    if (!contractStatus.hasActiveContract) {
      return {
        isValid: false,
        canGeneratePayroll: false,
        message: 'El trabajador no tiene un contrato activo',
        blockReason: 'sin_contrato',
        contractStatus,
        suggestions: [
          'Crear un nuevo contrato para el trabajador',
          'Activar un contrato existente',
          'Verificar si el contrato fue terminado correctamente'
        ]
      }
    }
    
    const { expiration } = contractStatus
    
    // Si no hay expiration o contractType es indefinido, está OK
    if (!expiration) {
      return {
        isValid: true,
        canGeneratePayroll: true,
        message: 'El trabajador tiene un contrato activo vigente',
        contractStatus
      }
    }
    
    // Si el contrato está vencido o vence hoy
    if (expiration.status === 'expired' || expiration.status === 'expires_today') {
      const daysExpired = Math.abs(expiration.daysUntilExpiration)
      
      return {
        isValid: false,
        canGeneratePayroll: false,
        message: expiration.status === 'expires_today'
          ? 'El contrato del trabajador vence hoy'
          : `El contrato del trabajador venció hace ${daysExpired} día${daysExpired > 1 ? 's' : ''}`,
        blockReason: 'contrato_vencido',
        contractStatus,
        suggestions: [
          'Si el trabajador sigue laborando: Crear anexo de prórroga o convertir a indefinido',
          'Si el trabajador ya no labora: Terminar el contrato y generar finiquito',
          'Regularizar la situación contractual antes de generar liquidación'
        ]
      }
    }
    
    // Si el contrato está por vencer (crítico: 1-7 días)
    if (expiration.status === 'expiring_critical') {
      return {
        isValid: true,
        canGeneratePayroll: true,
        message: `⚠️ ADVERTENCIA: El contrato vence en ${expiration.daysUntilExpiration} día${expiration.daysUntilExpiration > 1 ? 's' : ''}`,
        contractStatus,
        suggestions: [
          'Tomar acción urgente: Crear prórroga o terminar contrato',
          'Evitar que el contrato venza sin acción'
        ]
      }
    }
    
    // Si el contrato está por vencer (urgente: 8-15 días)
    if (expiration.status === 'expiring_urgent') {
      return {
        isValid: true,
        canGeneratePayroll: true,
        message: `⚠️ El contrato vence en ${expiration.daysUntilExpiration} días`,
        contractStatus,
        suggestions: [
          'Planificar: Crear prórroga o preparar finiquito',
        ]
      }
    }
    
    // Cualquier otro caso (expiring_soon o active)
    return {
      isValid: true,
      canGeneratePayroll: true,
      message: 'El trabajador tiene un contrato activo vigente',
      contractStatus
    }
    
  } catch (error) {
    console.error('Error validando contrato para liquidación:', error)
    return {
      isValid: false,
      canGeneratePayroll: false,
      message: 'Error al validar el estado del contrato',
      blockReason: 'error_sistema',
      suggestions: [
        'Reintentar la operación',
        'Contactar soporte si el error persiste'
      ]
    }
  }
}

/**
 * Valida múltiples trabajadores para generación masiva de liquidaciones
 */
export async function validateBatchPayrollGeneration(
  employeeIds: string[],
  period: { year: number; month: number },
  supabase: SupabaseClient
): Promise<{
  valid: string[]
  invalid: Array<{ employeeId: string; reason: string }>
  warnings: Array<{ employeeId: string; message: string }>
}> {
  const valid: string[] = []
  const invalid: Array<{ employeeId: string; reason: string }> = []
  const warnings: Array<{ employeeId: string; message: string }> = []
  
  for (const employeeId of employeeIds) {
    const validation = await validatePayrollGeneration(employeeId, period, supabase)
    
    if (validation.canGeneratePayroll) {
      valid.push(employeeId)
      
      // Agregar advertencia si hay una
      if (validation.contractStatus?.expiration?.status === 'expiring_critical' || 
          validation.contractStatus?.expiration?.status === 'expiring_urgent') {
        warnings.push({
          employeeId,
          message: validation.message
        })
      }
    } else {
      invalid.push({
        employeeId,
        reason: validation.message
      })
    }
  }
  
  return { valid, invalid, warnings }
}

/**
 * Obtiene un mensaje user-friendly para mostrar en la UI
 */
export function getBlockReasonMessage(validation: PayrollValidationResult): {
  title: string
  message: string
  actions: string[]
} {
  if (!validation.canGeneratePayroll) {
    if (validation.blockReason === 'sin_contrato') {
      return {
        title: '🚫 No se puede generar liquidación',
        message: 'El trabajador no tiene un contrato activo.',
        actions: validation.suggestions || []
      }
    }
    
    if (validation.blockReason === 'contrato_vencido') {
      return {
        title: '🚫 Contrato Vencido',
        message: validation.message,
        actions: validation.suggestions || []
      }
    }
    
    return {
      title: '🚫 Error',
      message: validation.message,
      actions: validation.suggestions || []
    }
  }
  
  // Si es válido pero tiene advertencia
  if (validation.contractStatus?.expiration?.urgencyLevel === 'critical') {
    return {
      title: '⚠️ Advertencia',
      message: validation.message,
      actions: validation.suggestions || []
    }
  }
  
  return {
    title: '✅ Validación exitosa',
    message: validation.message,
    actions: []
  }
}

