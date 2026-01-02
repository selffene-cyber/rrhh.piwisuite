/**
 * Servicio para gestionar validaciones y operaciones relacionadas con contratos
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { createSettlement } from './settlementService'

/**
 * Verifica si un trabajador tiene un contrato activo
 */
export async function hasActiveContract(
  employeeId: string,
  supabase: SupabaseClient<Database>
): Promise<{ hasActive: boolean; contract?: any }> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error

  return {
    hasActive: !!data,
    contract: data || undefined
  }
}

/**
 * Verifica si un trabajador tiene un finiquito aprobado pendiente
 */
export async function hasApprovedSettlement(
  employeeId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('settlements')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .maybeSingle()

  if (error) throw error

  return !!data
}

/**
 * Termina un contrato y crea un pre-finiquito
 */
export async function terminateContractAndCreateSettlement(
  contractId: string,
  terminationDate: string,
  causeCode: string,
  noticeGiven: boolean,
  noticeDays?: number,
  notes?: string,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<{ contract: any; settlement: any }> {
  // 1. Obtener datos del contrato
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*, employees (*)')
    .eq('id', contractId)
    .single()

  if (contractError) throw contractError
  if (!contract) throw new Error('Contrato no encontrado')

  // 2. Verificar que el contrato esté activo
  if (contract.status !== 'active') {
    throw new Error('Solo se pueden terminar contratos activos')
  }

  // 3. Actualizar estado del contrato a 'terminated'
  const { error: updateError } = await supabase
    .from('contracts')
    .update({
      status: 'terminated',
      terminated_at: new Date().toISOString()
    })
    .eq('id', contractId)

  if (updateError) throw updateError

  // 4. Cambiar estado del trabajador a 'despido'
  const { error: employeeUpdateError } = await supabase
    .from('employees')
    .update({
      status: 'despido',
      termination_date: terminationDate
    })
    .eq('id', contract.employee_id)

  if (employeeUpdateError) throw employeeUpdateError

  // 5. Crear pre-finiquito
  const settlement = await createSettlement(
    {
      employee_id: contract.employee_id,
      termination_date: terminationDate,
      cause_code: causeCode,
      notice_given: noticeGiven,
      notice_days: noticeDays,
      notes: notes || `Pre-finiquito generado automáticamente al terminar contrato ${contract.contract_number}`
    },
    userId,
    supabase
  )

  return {
    contract: { ...contract, status: 'terminated' },
    settlement
  }
}

/**
 * Cambia el estado del trabajador a activo cuando se activa un contrato
 */
export async function activateEmployeeOnContractActivation(
  employeeId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  // Verificar si el trabajador tiene estado 'despido' o 'renuncia'
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('status')
    .eq('id', employeeId)
    .single()

  if (employeeError) throw employeeError

  if (employee && (employee.status === 'despido' || employee.status === 'renuncia')) {
    // Cambiar a activo y limpiar fecha de término
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        status: 'active',
        termination_date: null
      })
      .eq('id', employeeId)

    if (updateError) throw updateError
  }
}

