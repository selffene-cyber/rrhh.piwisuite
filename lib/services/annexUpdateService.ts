import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { parseFormattedNumber } from '@/lib/utils/formatNumber'

/**
 * Servicio para actualizar contratos y empleados cuando se emite/activa un anexo
 * Implementa la lógica de actualización automática según Prompt 1
 */
export class AnnexUpdateService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Actualiza el contrato con los valores modificados del anexo
   * Solo actualiza si el anexo está en estado 'active' o 'signed'
   */
  async updateContractFromAnnex(annexId: string, annexData: any): Promise<void> {
    try {
      // Obtener el anexo completo
      const { data: annexDataResult, error: annexError } = await this.supabase
        .from('contract_annexes')
        .select('*, contracts (*), employees (*)')
        .eq('id', annexId)
        .single()

      if (annexError || !annexDataResult) {
        throw new Error('Anexo no encontrado')
      }

      const annex = annexDataResult as any
      const contract = annex.contracts as any
      if (!contract) {
        throw new Error('Contrato asociado no encontrado')
      }

      // Solo actualizar si el anexo está activo o firmado
      if (annex.status !== 'active' && annex.status !== 'signed') {
        return // No actualizar si el anexo no está activo
      }

      // Verificar vigencia del anexo
      const today = new Date().toISOString().split('T')[0]
      const startDate = annex.start_date
      const endDate = annex.end_date

      if (startDate > today) {
        return // Aún no está vigente
      }

      if (endDate && endDate < today) {
        return // Ya expiró
      }

      // Obtener conceptValues desde metadata (si existe)
      const conceptValues = annex.metadata?.concept_values || annexData || {}
      
      // Usar conceptValues si está disponible, sino usar annexData directamente
      const sourceData = Object.keys(conceptValues).length > 0 ? conceptValues : annexData

      const updateFields: any = {}

      // Extraer campos modificados desde conceptValues
      if (sourceData.position) updateFields.position = sourceData.position
      if (sourceData.position_description) updateFields.position_description = sourceData.position_description
      if (sourceData.work_schedule) updateFields.work_schedule = sourceData.work_schedule
      if (sourceData.work_schedule_type) updateFields.work_schedule_type = sourceData.work_schedule_type
      if (sourceData.work_schedule_monday_thursday) updateFields.work_schedule_monday_thursday = sourceData.work_schedule_monday_thursday
      if (sourceData.work_schedule_friday) updateFields.work_schedule_friday = sourceData.work_schedule_friday
      if (sourceData.lunch_break_duration) updateFields.lunch_break_duration = sourceData.lunch_break_duration
      if (sourceData.base_salary) {
        const salary = typeof sourceData.base_salary === 'string' 
          ? parseFormattedNumber(sourceData.base_salary)
          : sourceData.base_salary
        if (salary) updateFields.base_salary = salary
      }
      if (sourceData.gratuity !== undefined) updateFields.gratuity = sourceData.gratuity
      if (sourceData.gratuity_amount) {
        const gratuity = typeof sourceData.gratuity_amount === 'string'
          ? parseFormattedNumber(sourceData.gratuity_amount)
          : sourceData.gratuity_amount
        if (gratuity) updateFields.gratuity_amount = gratuity
      }
      if (sourceData.work_location) updateFields.work_location = sourceData.work_location
      if (sourceData.payment_method) updateFields.payment_method = sourceData.payment_method
      if (sourceData.payment_periodicity) updateFields.payment_periodicity = sourceData.payment_periodicity
      if (sourceData.bank_name) updateFields.bank_name = sourceData.bank_name
      if (sourceData.account_type) updateFields.account_type = sourceData.account_type
      if (sourceData.account_number) updateFields.account_number = sourceData.account_number

      // Solo actualizar si hay campos para actualizar
      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await (this.supabase
          .from('contracts') as any)
          .update(updateFields)
          .eq('id', contract.id)

        if (updateError) {
          console.error('Error al actualizar contrato desde anexo:', updateError)
          throw updateError
        }
      }
    } catch (error) {
      console.error('Error en updateContractFromAnnex:', error)
      // No lanzar excepción para no interrumpir el flujo principal
    }
  }

  /**
   * Actualiza la ficha del empleado con campos que impactan en ella
   * (position, base_salary principalmente)
   */
  async updateEmployeeFromAnnex(annexId: string, annexData: any): Promise<void> {
    try {
      // Obtener el anexo completo
      const { data: annexDataResult, error: annexError } = await this.supabase
        .from('contract_annexes')
        .select('*, employees (*)')
        .eq('id', annexId)
        .single()

      if (annexError || !annexDataResult) {
        throw new Error('Anexo no encontrado')
      }

      const annex = annexDataResult as any
      const employee = annex.employees as any
      if (!employee) {
        throw new Error('Empleado asociado no encontrado')
      }

      // Solo actualizar si el anexo está activo o firmado
      if (annex.status !== 'active' && annex.status !== 'signed') {
        return
      }

      // Verificar vigencia del anexo
      const today = new Date().toISOString().split('T')[0]
      const startDate = annex.start_date
      const endDate = annex.end_date

      if (startDate > today) {
        return
      }

      if (endDate && endDate < today) {
        return
      }

      const updateFields: any = {}

      // Campos que impactan en la ficha del empleado
      if (annexData.position) updateFields.position = annexData.position
      if (annexData.base_salary) {
        const salary = parseFormattedNumber(annexData.base_salary)
        if (salary) updateFields.base_salary = salary
      }

      // Solo actualizar si hay campos para actualizar
      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await (this.supabase
          .from('employees') as any)
          .update(updateFields)
          .eq('id', employee.id)

        if (updateError) {
          console.error('Error al actualizar empleado desde anexo:', updateError)
          throw updateError
        }
      }
    } catch (error) {
      console.error('Error en updateEmployeeFromAnnex:', error)
      // No lanzar excepción para no interrumpir el flujo principal
    }
  }

  /**
   * Actualiza tanto el contrato como el empleado desde un anexo
   */
  async updateContractAndEmployeeFromAnnex(annexId: string, annexData: any): Promise<void> {
    await Promise.all([
      this.updateContractFromAnnex(annexId, annexData),
      this.updateEmployeeFromAnnex(annexId, annexData),
    ])
  }
}

/**
 * Función helper para crear instancia del servicio
 */
export function createAnnexUpdateService(supabase: SupabaseClient<Database>): AnnexUpdateService {
  return new AnnexUpdateService(supabase)
}

