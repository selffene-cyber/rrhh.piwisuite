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
   * Un contrato se considera activo si:
   * - Tiene estado 'active' (si está marcado como activo, se considera válido independientemente de fechas)
   * - O tiene estado 'signed' y la fecha de inicio ya pasó o es hoy
   * - Y no tiene fecha de término o la fecha de término es futura
   */
  async hasActiveContract(employeeId: string): Promise<{ hasActive: boolean; contract: Contract | null }> {
    const today = new Date().toISOString().split('T')[0]
    
      // Buscar contratos que estén activos o firmados
      // Si está 'active', se considera válido sin importar la fecha de inicio
      // Si está 'signed', se verifica que la fecha de inicio ya haya pasado
      // IMPORTANTE: Usar .order() con múltiples campos para obtener el contrato más reciente
      // y asegurar que obtenemos el contrato actualizado (no caché)
      const { data, error } = await this.supabase
        .from('contracts')
        .select('*')
        .eq('employee_id', employeeId)
        .in('status', ['active', 'signed'])
        .order('updated_at', { ascending: false }) // Ordenar por updated_at para obtener el más reciente
        .order('start_date', { ascending: false })
      
      // Log para depuración
      if (data && data.length > 0) {
        console.log(`[hasActiveContract] Encontrados ${data.length} contratos para employee_id: ${employeeId}`)
        data.forEach((c: any, idx: number) => {
          console.log(`[hasActiveContract] Contrato ${idx + 1}: id=${c.id}, contract_type=${c.contract_type}, status=${c.status}, updated_at=${c.updated_at}, end_date=${c.end_date}`)
        })
      }

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!data || data.length === 0) {
      return {
        hasActive: false,
        contract: null,
      }
    }

    // Buscar el contrato más reciente que cumpla las condiciones
    for (const contract of data) {
      const contractAny = contract as any
      
      // IMPORTANTE: Si el contrato es tipo 'indefinido', ignorar end_date
      // porque los contratos indefinidos no tienen fecha de término válida
      // (incluso si tienen end_date en la BD por razones históricas)
      const isIndefinite = contractAny.contract_type === 'indefinido'
      
      // Si el contrato está 'active', se considera válido (confiamos en el estado)
      if (contractAny.status === 'active') {
        // Verificar que no haya expirado (solo si NO es indefinido)
        if (!isIndefinite && contractAny.end_date) {
          const endDate = new Date(contractAny.end_date)
          const todayDate = new Date(today)
          if (endDate < todayDate) {
            // El contrato expiró, continuar con el siguiente
            continue
          }
        }
        return {
          hasActive: true,
          contract: contract as Contract,
        }
      }
      
      // Si está 'signed', verificar que la fecha de inicio ya haya pasado
      if (contractAny.status === 'signed') {
        const startDate = new Date(contractAny.start_date)
        const todayDate = new Date(today)
        if (startDate <= todayDate) {
          // Verificar que no haya expirado (solo si NO es indefinido)
          if (!isIndefinite && contractAny.end_date) {
            const endDate = new Date(contractAny.end_date)
            if (endDate < todayDate) {
              // El contrato expiró, continuar con el siguiente
              continue
            }
          }
          return {
            hasActive: true,
            contract: contract as Contract,
          }
        }
      }
    }

    // No se encontró ningún contrato válido
    return {
      hasActive: false,
      contract: null,
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

  /**
   * Valida si se puede generar un certificado laboral
   * Regla especial: Requiere contrato activo, PERO se permite durante licencia médica (excepción)
   * Regla 3 + Regla 1.4: Certificados requieren contrato activo, pero sí se pueden emitir durante licencia médica
   */
  async canGenerateCertificate(employeeId: string): Promise<ValidationResult> {
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
        'El trabajador no posee un contrato activo. No se pueden generar certificados laborales.',
        { suggestion: 'create_contract' }
      )
    }

    // NOTA: Aunque tenga licencia médica activa, se permite generar certificados (excepción según regla 1.4)
    // No validamos licencia médica aquí

    return allowed('El trabajador puede recibir un certificado laboral', { contractId: contract?.id })
  }

  /**
   * Valida si se puede crear una amonestación
   * Regla 3: Requiere contrato activo
   */
  async canCreateDisciplinaryAction(employeeId: string): Promise<ValidationResult> {
    return await this.canOperateContractDependentModule(employeeId, 'Amonestaciones')
  }

  /**
   * Valida si se puede crear un anticipo
   * Regla 3: Requiere contrato activo
   */
  async canCreateAdvance(employeeId: string): Promise<ValidationResult> {
    return await this.canOperateContractDependentModule(employeeId, 'Anticipos')
  }

  /**
   * Valida si se puede crear un pacto de horas extraordinarias
   * Regla 3: Requiere contrato activo
   */
  async canCreateOvertimePact(employeeId: string): Promise<ValidationResult> {
    return await this.canOperateContractDependentModule(employeeId, 'Pactos de horas extraordinarias')
  }

  /**
   * Valida si se puede crear una vacación
   * Regla 3: Requiere contrato activo
   */
  async canCreateVacation(employeeId: string): Promise<ValidationResult> {
    return await this.canOperateContractDependentModule(employeeId, 'Vacaciones')
  }

  /**
   * Valida si se puede generar una liquidación de sueldo
   * Regla 3: Requiere contrato activo
   */
  async canGeneratePayrollSlip(employeeId: string): Promise<ValidationResult> {
    return await this.canOperateContractDependentModule(employeeId, 'Liquidaciones de sueldo')
  }
}

