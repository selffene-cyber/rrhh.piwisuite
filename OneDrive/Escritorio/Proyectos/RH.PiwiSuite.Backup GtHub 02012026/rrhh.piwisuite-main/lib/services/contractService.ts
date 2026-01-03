import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Activa un empleado cuando se activa su contrato
 */
export async function activateEmployeeOnContractActivation(
  employeeId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { error } = await (supabase
    .from('employees') as any)
    .update({ status: 'active' })
    .eq('id', employeeId)

  if (error) throw error
}

/**
 * Verifica si un empleado tiene un contrato activo
 */
export async function hasActiveContract(
  employeeId: string,
  supabase: SupabaseClient<Database>
): Promise<{ hasActive: boolean; contract: any | null }> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return {
    hasActive: !!data,
    contract: data || null,
  }
}

/**
 * Verifica si un empleado tiene un finiquito aprobado
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
    .limit(1)

  if (error) throw error
  return (data || []).length > 0
}

/**
 * Termina un contrato y crea un finiquito
 */
export async function terminateContractAndCreateSettlement(
  contractId: string,
  terminationDate: string,
  causeCode: string,
  noticeGiven: boolean,
  userId: string,
  supabase: SupabaseClient<Database>,
  noticeDays?: number,
  notes?: string
): Promise<{ contract: any; settlement: any }> {
  // Obtener contrato
  const { data: contractData, error: contractError } = await supabase
    .from('contracts')
    .select('*, employees (*)')
    .eq('id', contractId)
    .maybeSingle()

  if (contractError || !contractData) {
    throw new Error('Contrato no encontrado')
  }

  const contract = contractData as any

  // Terminar contrato
  const { error: updateError } = await (supabase
    .from('contracts') as any)
    .update({
      end_date: terminationDate,
      status: 'terminated',
    })
    .eq('id', contractId)

  if (updateError) throw updateError

  // Crear finiquito
  const { data: settlement, error: settlementError } = await (supabase
    .from('settlements') as any)
    .insert({
      employee_id: contract.employee_id,
      termination_date: terminationDate,
      cause_code: causeCode,
      notice_given: noticeGiven,
      notice_days: noticeDays || null,
      notes: notes || null,
      status: 'draft',
    })
    .select()
    .single()

  if (settlementError) throw settlementError

  return {
    contract: { ...contract, end_date: terminationDate, status: 'terminated' },
    settlement,
  }
}

