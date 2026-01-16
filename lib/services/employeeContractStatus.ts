/**
 * Servicio para obtener el estado del contrato activo de un trabajador
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { calculateExpirationStatus, type ContractExpirationStatus } from './contractNotifications'

export interface EmployeeContractStatus {
  hasActiveContract: boolean
  contractId?: string
  contractNumber?: string
  contractType?: string
  endDate?: string | null
  expiration?: ReturnType<typeof calculateExpirationStatus>
}

/**
 * Obtiene el estado del contrato activo de un trabajador
 */
export async function getEmployeeContractStatus(
  employeeId: string,
  supabase: SupabaseClient
): Promise<EmployeeContractStatus> {
  try {
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('id, contract_number, contract_type, end_date')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .maybeSingle()
    
    if (error || !contract) {
      return { hasActiveContract: false }
    }
    
    const expiration = calculateExpirationStatus(
      contract.end_date,
      contract.contract_type
    )
    
    return {
      hasActiveContract: true,
      contractId: contract.id,
      contractNumber: contract.contract_number || undefined,
      contractType: contract.contract_type,
      endDate: contract.end_date,
      expiration
    }
  } catch (error) {
    console.error('Error obteniendo estado del contrato:', error)
    return { hasActiveContract: false }
  }
}

/**
 * Obtiene el estado de contratos para múltiples trabajadores (optimizado)
 */
export async function getMultipleEmployeesContractStatus(
  employeeIds: string[],
  supabase: SupabaseClient
): Promise<Map<string, EmployeeContractStatus>> {
  const statusMap = new Map<string, EmployeeContractStatus>()
  
  if (employeeIds.length === 0) {
    return statusMap
  }
  
  try {
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('id, contract_number, contract_type, end_date, employee_id')
      .in('employee_id', employeeIds)
      .eq('status', 'active')
    
    if (error) throw error
    
    // Inicializar todos como sin contrato
    employeeIds.forEach(id => {
      statusMap.set(id, { hasActiveContract: false })
    })
    
    // Actualizar con contratos activos
    contracts?.forEach((contract: any) => {
      const expiration = calculateExpirationStatus(
        contract.end_date,
        contract.contract_type
      )
      
      statusMap.set(contract.employee_id, {
        hasActiveContract: true,
        contractId: contract.id,
        contractNumber: contract.contract_number || undefined,
        contractType: contract.contract_type,
        endDate: contract.end_date,
        expiration
      })
    })
    
    return statusMap
  } catch (error) {
    console.error('Error obteniendo estados de contratos:', error)
    return statusMap
  }
}

