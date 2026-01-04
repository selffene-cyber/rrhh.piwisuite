/**
 * Servicio de validación de elegibilidad de empleados
 * Centraliza todas las reglas de negocio relacionadas con el estado de empleados
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { ValidationResult, allowed, denied, ValidationCodes, EmployeeStatus, ContractStatus, ContractType } from './validationTypes'

type Employee = Database['public']['Tables']['employees']['Row']

// Tipos para contratos y licencias médicas (no están en database.ts, usar tipos genéricos)
type Contract = {
  id: string
  employee_id: string
  contract_number?: string | null
  contract_type: ContractType
  status: ContractStatus
  [key: string]: any
}

type MedicalLeave = {
  id: string
  employee_id: string
  is_active: boolean
  [key: string]: any
}

export class EmployeeEligibilityService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Verifica si un empleado está activo
   */
  async isEmployeeActive(employeeId: string): Promise<ValidationResult> {
    const { data: employee, error } = await this.supabase
      .from('employees')
      .select('status')
      .eq('id', employeeId)
      .single()

    if (error || !employee) {
      return denied(
        ValidationCodes.EMPLOYEE_NOT_ACTIVE,
        'Empleado no encontrado'
      )
    }

    const employeeData = employee as { status: string }
    if (employeeData.status !== 'active') {
      return denied(
        ValidationCodes.EMPLOYEE_NOT_ACTIVE,
        `El trabajador está en estado "${employeeData.status}". Solo se permiten operaciones con trabajadores activos.`,
        { status: employeeData.status }
      )
    }

    return allowed('El trabajador está activo')
  }

  /**
   * Verifica si un empleado tiene un contrato activo
   */
  async hasActiveContract(employeeId: string): Promise<{ hasActive: boolean; contract: Contract | null }> {
    const { data, error } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return {
      hasActive: !!data,
      contract: data || null,
    }
  }

  /**
   * Verifica si un empleado tiene licencia médica activa
   */
  async hasActiveMedicalLeave(employeeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('medical_leaves')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .limit(1)

    if (error) {
      console.error('Error al verificar licencia médica:', error)
      return false
    }

    return (data || []).length > 0
  }

  /**
   * Valida si se puede crear un contrato para un empleado
   * Regla 1.1: Se permite crear contrato SOLO si employee.status = 'active' y NO existe contrato activo
   */
  async canCreateContract(employeeId: string): Promise<ValidationResult> {
    // Verificar que el empleado esté activo
    const employeeCheck = await this.isEmployeeActive(employeeId)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    // Verificar que no tenga contrato activo
    const { hasActive, contract } = await this.hasActiveContract(employeeId)
    
    if (hasActive) {
      return denied(
        ValidationCodes.EMPLOYEE_HAS_ACTIVE_CONTRACT,
        'El trabajador ya posee un contrato activo. Para realizar modificaciones, debe crear un anexo al contrato existente.',
        { 
          contractId: contract?.id,
          contractNumber: contract?.contract_number,
          suggestion: 'create_annex'
        }
      )
    }

    return allowed('El trabajador puede recibir un nuevo contrato')
  }

  /**
   * Valida si se puede crear un anexo para un empleado
   * Regla 2: Un anexo SOLO se puede crear si existe contrato activo, employee.active y sin licencia médica
   */
  async canCreateAnnex(employeeId: string): Promise<ValidationResult> {
    // Verificar que el empleado esté activo
    const employeeCheck = await this.isEmployeeActive(employeeId)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    // Verificar que tenga contrato activo
    const { hasActive, contract } = await this.hasActiveContract(employeeId)
    
    if (!hasActive || !contract) {
      return denied(
        ValidationCodes.EMPLOYEE_NO_ACTIVE_CONTRACT,
        'El trabajador no posee un contrato activo. Debe crear un contrato antes de generar anexos.',
        { suggestion: 'create_contract' }
      )
    }

    // Verificar que no tenga licencia médica activa
    const hasMedicalLeave = await this.hasActiveMedicalLeave(employeeId)
    if (hasMedicalLeave) {
      return denied(
        ValidationCodes.EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE,
        'No se pueden crear anexos mientras el trabajador tenga una licencia médica activa.',
        { suggestion: 'wait_medical_leave_end' }
      )
    }

    return allowed('El trabajador puede recibir un anexo', { contractId: contract.id })
  }

  /**
   * Valida si se puede operar módulos que requieren contrato activo
   * Regla 3: Módulos dependientes requieren contrato activo
   */
  async canOperateContractDependentModule(
    employeeId: string,
    moduleName: string
  ): Promise<ValidationResult> {
    // Verificar que el empleado esté activo
    const employeeCheck = await this.isEmployeeActive(employeeId)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    // Verificar que tenga contrato activo
    const { hasActive, contract } = await this.hasActiveContract(employeeId)
    
    if (!hasActive) {
      return denied(
        ValidationCodes.EMPLOYEE_NO_ACTIVE_CONTRACT,
        `El trabajador no posee un contrato activo. No se puede operar el módulo "${moduleName}".`,
        { 
          module: moduleName,
          suggestion: 'create_contract'
        }
      )
    }

    return allowed(`El trabajador puede operar en ${moduleName}`, { contractId: contract?.id })
  }

  /**
   * Valida si se puede crear un préstamo
   * Regla 4.1: Solo se pueden generar préstamos si existe contrato activo y es tipo 'indefinido'
   */
  async canCreateLoan(employeeId: string): Promise<ValidationResult> {
    // Verificar que el empleado esté activo
    const employeeCheck = await this.isEmployeeActive(employeeId)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    // Verificar que tenga contrato activo
    const { hasActive, contract } = await this.hasActiveContract(employeeId)
    
    if (!hasActive || !contract) {
      return denied(
        ValidationCodes.EMPLOYEE_NO_ACTIVE_CONTRACT,
        'El trabajador no posee un contrato activo. No se pueden generar préstamos.',
        { suggestion: 'create_contract' }
      )
    }

    // Verificar que el contrato sea tipo 'indefinido'
    if (contract.contract_type !== 'indefinido') {
      return denied(
        ValidationCodes.LOAN_REQUIRES_INDEFINIDO_CONTRACT,
        `Los préstamos solo se pueden generar para trabajadores con contrato indefinido. El contrato actual es tipo "${contract.contract_type}".`,
        { 
          contractType: contract.contract_type,
          allowedTypes: ['indefinido']
        }
      )
    }

    return allowed('El trabajador puede recibir un préstamo', { contractId: contract.id })
  }

  /**
   * Valida si se puede crear un permiso laboral
   * Regla 4.2: Solo se puede generar permiso si existe contrato activo y no hay permiso vigente
   */
  async canCreatePermission(employeeId: string): Promise<ValidationResult> {
    // Verificar que el empleado esté activo
    const employeeCheck = await this.isEmployeeActive(employeeId)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    // Verificar que tenga contrato activo
    const { hasActive, contract } = await this.hasActiveContract(employeeId)
    
    if (!hasActive || !contract) {
      return denied(
        ValidationCodes.EMPLOYEE_NO_ACTIVE_CONTRACT,
        'El trabajador no posee un contrato activo. No se pueden generar permisos laborales.',
        { suggestion: 'create_contract' }
      )
    }

    // Verificar que no tenga permiso activo
    const today = new Date().toISOString().split('T')[0]
    const { data: activePermissions, error } = await this.supabase
      .from('permissions')
      .select('id, start_date, end_date')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)

    if (error) {
      console.error('Error al verificar permisos activos:', error)
      // No bloquear por error de consulta, permitir continuar
    } else if (activePermissions && activePermissions.length > 0) {
      return denied(
        ValidationCodes.PERMISSION_ALREADY_ACTIVE,
        'El trabajador ya tiene un permiso laboral vigente. No se pueden generar permisos superpuestos.',
        { 
          activePermissions: activePermissions.map((p: any) => ({
            id: p.id,
            startDate: p.start_date,
            endDate: p.end_date
          }))
        }
      )
    }

    return allowed('El trabajador puede recibir un permiso laboral', { contractId: contract.id })
  }

  /**
   * Valida si se puede modificar un contrato (requiere que no haya licencia médica activa)
   * Regla 1.4: No se pueden modificar contratos si hay licencia médica activa
   */
  async canModifyContract(employeeId: string): Promise<ValidationResult> {
    // Verificar que el empleado esté activo
    const employeeCheck = await this.isEmployeeActive(employeeId)
    if (!employeeCheck.allowed) {
      return employeeCheck
    }

    // Verificar que no tenga licencia médica activa
    const hasMedicalLeave = await this.hasActiveMedicalLeave(employeeId)
    if (hasMedicalLeave) {
      return denied(
        ValidationCodes.EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE,
        'No se pueden modificar contratos mientras el trabajador tenga una licencia médica activa.',
        { suggestion: 'wait_medical_leave_end' }
      )
    }

    return allowed('El contrato puede ser modificado')
  }

  /**
   * Valida si se puede generar un documento/certificado
   * Los documentos se pueden generar si el empleado está activo (no requiere contrato activo)
   */
  async canGenerateDocument(employeeId: string): Promise<ValidationResult> {
    return await this.isEmployeeActive(employeeId)
  }
}

