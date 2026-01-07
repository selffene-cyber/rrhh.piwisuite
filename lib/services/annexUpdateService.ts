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
      // Puede estar como concept_values (snake_case) o conceptValues (camelCase)
      // IMPORTANTE: Si se pasa annexData directamente (desde la activación), usarlo como fallback
      const conceptValues = annex.metadata?.concept_values || annex.metadata?.conceptValues || annexData || {}
      
      // Usar conceptValues si está disponible, sino usar annexData directamente
      const sourceData = Object.keys(conceptValues).length > 0 ? conceptValues : annexData

      console.log('[AnnexUpdateService] ===== INICIO ACTUALIZACIÓN CONTRATO =====')
      console.log('[AnnexUpdateService] Anexo ID:', annexId)
      console.log('[AnnexUpdateService] Anexo status:', annex.status)
      console.log('[AnnexUpdateService] Metadata completo del anexo:', JSON.stringify(annex.metadata, null, 2))
      console.log('[AnnexUpdateService] annexData recibido como parámetro:', JSON.stringify(annexData, null, 2))
      console.log('[AnnexUpdateService] ConceptValues extraídos:', JSON.stringify(conceptValues, null, 2))
      console.log('[AnnexUpdateService] SourceData final (lo que se usará para actualizar):', JSON.stringify(sourceData, null, 2))
      console.log('[AnnexUpdateService] ¿Tiene contract_type?', !!sourceData.contract_type, 'Valor:', sourceData.contract_type)
      console.log('[AnnexUpdateService] ===========================================')

      const updateFields: any = {}

      // Extraer campos modificados desde conceptValues
      // NOTA: Solo actualizar campos que existen en la tabla contracts
      if (sourceData.position) updateFields.position = sourceData.position
      if (sourceData.position_description) updateFields.position_description = sourceData.position_description
      if (sourceData.work_schedule) updateFields.work_schedule = sourceData.work_schedule
      // work_schedule_type, work_schedule_monday_thursday, work_schedule_friday NO existen en contracts
      // Estos campos se manejan a través de work_schedule que es un campo JSONB
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
      
      // IMPORTANTE: Actualizar contract_type si se modificó en el anexo
      // Verificar tanto contract_type como contractType (camelCase)
      const contractType = sourceData.contract_type || sourceData.contractType
      const endDateValue = sourceData.end_date || sourceData.endDate
      
      if (contractType) {
        updateFields.contract_type = contractType
        console.log(`[AnnexUpdateService] Actualizando contract_type a: ${contractType}`)
        
        // Actualizar end_date si se modificó el tipo de contrato a plazo fijo
        if (contractType === 'plazo_fijo' && endDateValue) {
          updateFields.end_date = endDateValue
          console.log(`[AnnexUpdateService] Actualizando end_date a: ${endDateValue}`)
        } else if (contractType === 'indefinido') {
          // Si cambia a indefinido, eliminar end_date
          updateFields.end_date = null
          console.log(`[AnnexUpdateService] Cambiando a contrato indefinido, eliminando end_date`)
        }
      } else {
        console.log('[AnnexUpdateService] ⚠️ No se encontró contract_type en sourceData. Campos disponibles:', Object.keys(sourceData))
      }

      // Solo actualizar si hay campos para actualizar
      if (Object.keys(updateFields).length > 0) {
        console.log(`[AnnexUpdateService] Actualizando contrato ${contract.id} con campos:`, JSON.stringify(updateFields, null, 2))
        
        const { data: updatedContract, error: updateError } = await (this.supabase
          .from('contracts') as any)
          .update(updateFields)
          .eq('id', contract.id)
          .select()
          .single()

        if (updateError) {
          console.error('[AnnexUpdateService] ❌ Error al actualizar contrato desde anexo:', updateError)
          throw updateError
        }
        
        if (updatedContract) {
          console.log(`[AnnexUpdateService] ✅ Contrato actualizado exitosamente. Nuevo contract_type: ${updatedContract.contract_type}, end_date: ${updatedContract.end_date}, updated_at: ${updatedContract.updated_at}`)
        } else {
          console.warn('[AnnexUpdateService] ⚠️ No se devolvió el contrato actualizado')
        }
      } else {
        console.log('[AnnexUpdateService] ⚠️ No hay campos para actualizar en el contrato')
      }
    } catch (error: any) {
      console.error('[AnnexUpdateService] ❌ Error en updateContractFromAnnex:', error)
      console.error('[AnnexUpdateService] Detalles del error:', JSON.stringify(error, null, 2))
      console.error('[AnnexUpdateService] Stack trace:', error?.stack)
      // No lanzar excepción para no interrumpir el flujo principal, pero loguear claramente
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

      // Obtener conceptValues desde metadata (igual que en updateContractFromAnnex)
      const conceptValues = annex.metadata?.concept_values || annex.metadata?.conceptValues || annexData || {}
      const sourceData = Object.keys(conceptValues).length > 0 ? conceptValues : annexData

      console.log('[AnnexUpdateService] Actualizando empleado con sourceData:', sourceData)

      const updateFields: any = {}

      // Campos que impactan en la ficha del empleado
      // IMPORTANTE: Usar sourceData (conceptValues) en lugar de annexData directamente
      if (sourceData.position) updateFields.position = sourceData.position
      if (sourceData.base_salary) {
        const salary = typeof sourceData.base_salary === 'string'
          ? parseFormattedNumber(sourceData.base_salary)
          : sourceData.base_salary
        if (salary) updateFields.base_salary = salary
      }

      // Solo actualizar si hay campos para actualizar
      if (Object.keys(updateFields).length > 0) {
        console.log(`[AnnexUpdateService] Actualizando empleado ${employee.id} con campos:`, JSON.stringify(updateFields, null, 2))
        
        const { data: updatedEmployee, error: updateError } = await (this.supabase
          .from('employees') as any)
          .update(updateFields)
          .eq('id', employee.id)
          .select()
          .single()

        if (updateError) {
          console.error('[AnnexUpdateService] ❌ Error al actualizar empleado desde anexo:', updateError)
          throw updateError
        }
        
        if (updatedEmployee) {
          console.log(`[AnnexUpdateService] ✅ Empleado actualizado exitosamente. Nuevo position: ${updatedEmployee.position}, base_salary: ${updatedEmployee.base_salary}`)
        }
      } else {
        console.log('[AnnexUpdateService] ⚠️ No hay campos para actualizar en el empleado')
      }
    } catch (error: any) {
      console.error('[AnnexUpdateService] ❌ Error en updateEmployeeFromAnnex:', error)
      console.error('[AnnexUpdateService] Detalles del error:', JSON.stringify(error, null, 2))
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

