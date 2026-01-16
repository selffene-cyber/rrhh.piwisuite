/**
 * Servicio de validación de contratos y anexos
 * Centraliza todas las reglas de negocio relacionadas con contratos
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { ValidationResult, allowed, denied, ValidationCodes, ContractStatus, AnnexStatus, ContractType } from './validationTypes'
import { EmployeeEligibilityService } from './employeeEligibilityService'

// Tipos para contratos y anexos (no están en database.ts, usar tipos genéricos)
type Contract = {
  id: string
  employee_id: string
  company_id: string
  contract_number?: string | null
  contract_type: ContractType
  start_date: string
  end_date?: string | null
  status: ContractStatus
  position: string
  base_salary: number
  [key: string]: any
}

type Annex = {
  id: string
  contract_id: string
  employee_id: string
  company_id: string
  annex_number?: string | null
  annex_type: string
  start_date: string
  end_date?: string | null
  status: AnnexStatus
  [key: string]: any
}

export class ContractValidationService {
  private employeeEligibility: EmployeeEligibilityService

  constructor(private supabase: SupabaseClient<Database>) {
    this.employeeEligibility = new EmployeeEligibilityService(supabase)
  }

  /**
   * Obtiene el contrato activo de un empleado
   */
  async getActiveContract(employeeId: string): Promise<Contract | null> {
    const { data, error } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  }

  /**
   * Valida si se puede crear un contrato
   * Regla 1.1: employee.active + NO contract.active
   */
  async canCreateContract(employeeId: string): Promise<ValidationResult> {
    return await this.employeeEligibility.canCreateContract(employeeId)
  }

  /**
   * Valida si se puede terminar un contrato
   * Regla 1.2: El contrato debe estar activo para poder terminarlo
   */
  async canTerminateContract(contractId: string): Promise<ValidationResult> {
    const { data: contract, error } = await this.supabase
      .from('contracts')
      .select('*, employees (*)')
      .eq('id', contractId)
      .maybeSingle()

    if (error || !contract) {
      return denied(
        ValidationCodes.CONTRACT_NOT_ACTIVE,
        'Contrato no encontrado'
      )
    }

    const contractData = contract as any

    if (contractData.status !== 'active') {
      return denied(
        ValidationCodes.CONTRACT_INVALID_STATUS,
        `El contrato no está activo (estado actual: "${contractData.status}"). Solo se pueden terminar contratos activos.`,
        { currentStatus: contractData.status }
      )
    }

    // Verificar que el empleado esté activo
    const employeeCheck = await this.employeeEligibility.isEmployeeActive(contractData.employee_id)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    return allowed('El contrato puede ser terminado', { 
      contractId: contractData.id,
      employeeId: contractData.employee_id
    })
  }

  /**
   * Valida si se puede crear un nuevo contrato después de terminar uno
   * Regla 1.2: Requiere que el finiquito esté aprobado
   */
  async canCreateContractAfterTermination(employeeId: string): Promise<ValidationResult> {
    // Verificar que el empleado esté activo
    const employeeCheck = await this.employeeEligibility.isEmployeeActive(employeeId)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    // Verificar que no tenga contrato activo
    const { hasActive } = await this.employeeEligibility.hasActiveContract(employeeId)
    if (hasActive) {
      return denied(
        ValidationCodes.EMPLOYEE_HAS_ACTIVE_CONTRACT,
        'El trabajador ya posee un contrato activo. Debe terminar el contrato actual antes de crear uno nuevo.',
        { suggestion: 'terminate_contract' }
      )
    }

    // Verificar si hay contratos terminados recientes sin finiquito aprobado
    const { data: terminatedContracts, error } = await this.supabase
      .from('contracts')
      .select('id, terminated_at')
      .eq('employee_id', employeeId)
      .eq('status', 'terminated')
      .order('terminated_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error al verificar contratos terminados:', error)
    } else if (terminatedContracts && terminatedContracts.length > 0) {
      // Verificar si hay finiquito aprobado para el último contrato terminado
      const lastTerminatedContract = terminatedContracts[0] as { id: string; terminated_at: string | null }
      const { data: settlements, error: settlementError } = await this.supabase
        .from('settlements')
        .select('id, status')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .limit(1)

      if (settlementError) {
        console.error('Error al verificar finiquitos:', settlementError)
      } else if (!settlements || settlements.length === 0) {
        return denied(
          ValidationCodes.CONTRACT_SETTLEMENT_REQUIRED,
          'El trabajador tiene un contrato terminado sin finiquito aprobado. Debe completar el proceso de finiquito antes de crear un nuevo contrato.',
          { 
            terminatedContractId: lastTerminatedContract.id,
            suggestion: 'complete_settlement'
          }
        )
      }
    }

    return allowed('El trabajador puede recibir un nuevo contrato después de la terminación')
  }

  /**
   * Valida si se puede crear un anexo
   * Regla 2: Requiere contrato activo, employee.active y sin licencia médica
   */
  async canCreateAnnex(employeeId: string, contractId?: string): Promise<ValidationResult> {
    // Usar el servicio de elegibilidad de empleados
    const eligibilityCheck = await this.employeeEligibility.canCreateAnnex(employeeId)
    if (!eligibilityCheck.allowed) {
      return eligibilityCheck
    }

    // Si se proporciona contractId, validar que sea el contrato activo
    if (contractId) {
      const activeContract = await this.getActiveContract(employeeId)
      
      if (!activeContract) {
        return denied(
          ValidationCodes.EMPLOYEE_NO_ACTIVE_CONTRACT,
          'El trabajador no posee un contrato activo.'
        )
      }

      if (activeContract.id !== contractId) {
        return denied(
          ValidationCodes.ANNEX_CONTRACT_INVALID_STATUS,
          'El contrato especificado no es el contrato activo del trabajador.',
          { 
            providedContractId: contractId,
            activeContractId: activeContract.id
          }
        )
      }

      // Validar que el contrato tenga un estado válido para anexos
      if (!['active', 'signed'].includes(activeContract.status)) {
        return denied(
          ValidationCodes.ANNEX_CONTRACT_INVALID_STATUS,
          `No se pueden crear anexos sobre contratos con estado "${activeContract.status}". El contrato debe estar activo o firmado.`,
          { contractStatus: activeContract.status }
        )
      }
    }

    return allowed('Se puede crear un anexo')
  }

  /**
   * Valida si se puede crear un anexo sobre un contrato específico
   * Regla 2: El contrato debe estar activo, no terminated, cancelled o draft
   */
  async canCreateAnnexForContract(contractId: string): Promise<ValidationResult> {
    const { data: contract, error } = await this.supabase
      .from('contracts')
      .select('*, employees (*)')
      .eq('id', contractId)
      .maybeSingle()

    if (error || !contract) {
      return denied(
        ValidationCodes.CONTRACT_NOT_ACTIVE,
        'Contrato no encontrado'
      )
    }

    const contractData = contract as any

    // Validar estado del contrato
    const invalidStatuses: ContractStatus[] = ['terminated', 'cancelled', 'draft']
    if (invalidStatuses.includes(contractData.status as ContractStatus)) {
      return denied(
        ValidationCodes.ANNEX_CONTRACT_INVALID_STATUS,
        `No se pueden crear anexos sobre contratos con estado "${contractData.status}". El contrato debe estar activo, emitido o firmado.`,
        { 
          contractStatus: contractData.status,
          allowedStatuses: ['active', 'issued', 'signed']
        }
      )
    }

    // Validar empleado
    const employeeCheck = await this.employeeEligibility.isEmployeeActive(contractData.employee_id)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    // Validar licencia médica
    const hasMedicalLeave = await this.employeeEligibility.hasActiveMedicalLeave(contractData.employee_id)
    if (hasMedicalLeave) {
      return denied(
        ValidationCodes.EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE,
        'No se pueden crear anexos mientras el trabajador tenga una licencia médica activa.'
      )
    }

    return allowed('Se puede crear un anexo para este contrato', { 
      contractId: contractData.id,
      contractStatus: contractData.status
    })
  }

  /**
   * Valida si se puede modificar un contrato
   * Regla 1.4: No se puede modificar si hay licencia médica activa
   */
  async canModifyContract(employeeId: string, contractId: string): Promise<ValidationResult> {
    // Verificar que el contrato exista
    const { data: contract, error } = await this.supabase
      .from('contracts')
      .select('*, employees (*)')
      .eq('id', contractId)
      .maybeSingle()

    if (error || !contract) {
      return denied(
        ValidationCodes.CONTRACT_NOT_ACTIVE,
        'Contrato no encontrado'
      )
    }

    const contractData = contract as any

    // Verificar que el contrato pertenezca al empleado
    if (contractData.employee_id !== employeeId) {
      return denied(
        ValidationCodes.CONTRACT_NOT_ACTIVE,
        'El contrato no pertenece al trabajador especificado'
      )
    }

    // Usar el servicio de elegibilidad para validar modificación
    return await this.employeeEligibility.canModifyContract(employeeId)
  }

  /**
   * Valida el tipo de contrato para operaciones específicas
   */
  validateContractType(contract: Contract, allowedTypes: ContractType[]): ValidationResult {
    if (!allowedTypes.includes(contract.contract_type as ContractType)) {
      return denied(
        ValidationCodes.CONTRACT_INVALID_STATUS,
        `Esta operación solo está permitida para contratos tipo: ${allowedTypes.join(', ')}. El contrato actual es tipo "${contract.contract_type}".`,
        { 
          currentType: contract.contract_type,
          allowedTypes
        }
      )
    }

    return allowed('El tipo de contrato es válido para esta operación')
  }

  /**
   * Valida si un contrato puede cambiar de estado
   */
  async canChangeContractStatus(
    contractId: string,
    newStatus: ContractStatus
  ): Promise<ValidationResult> {
    const { data: contract, error } = await this.supabase
      .from('contracts')
      .select('*, employees (*)')
      .eq('id', contractId)
      .maybeSingle()

    if (error || !contract) {
      return denied(
        ValidationCodes.CONTRACT_NOT_ACTIVE,
        'Contrato no encontrado'
      )
    }

    const contractData = contract as any
    const currentStatus = contractData.status as ContractStatus

    // Validaciones específicas por transición de estado
    if (newStatus === 'active' && currentStatus !== 'signed') {
      return denied(
        ValidationCodes.CONTRACT_INVALID_STATUS,
        `Un contrato solo puede activarse si está en estado "signed". Estado actual: "${currentStatus}".`,
        { currentStatus, requiredStatus: 'signed' }
      )
    }

    if (newStatus === 'terminated' && currentStatus !== 'active') {
      return denied(
        ValidationCodes.CONTRACT_INVALID_STATUS,
        `Solo se pueden terminar contratos activos. Estado actual: "${currentStatus}".`,
        { currentStatus, requiredStatus: 'active' }
      )
    }

    return allowed('El cambio de estado es válido', { 
      currentStatus,
      newStatus
    })
  }
}

