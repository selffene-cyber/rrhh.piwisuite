import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Servicio para gestión avanzada de anexos de contrato
 * Implementa la lógica contextual según Prompt 1
 */
export class AnnexService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Obtiene el contrato activo de un trabajador
   * Un contrato se considera activo si tiene status 'active' o 'signed'
   * y no ha expirado
   */
  async getActiveContract(employeeId: string): Promise<any | null> {
    const today = new Date().toISOString().split('T')[0]

    // Buscar contratos activos o firmados
    const { data, error } = await this.supabase
      .from('contracts')
      .select('*, employees (*), companies (*)')
      .eq('employee_id', employeeId)
      .in('status', ['active', 'signed'])
      .order('start_date', { ascending: false })

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!data || data.length === 0) {
      return null
    }

    // Para cada contrato, verificar si está vigente
    for (const contract of data as any[]) {
      const startDate = contract.start_date
      const endDate = contract.end_date

      // Si está marcado como 'active', siempre está vigente
      if (contract.status === 'active') {
        // Verificar que no haya expirado
        if (!endDate || endDate >= today) {
          return contract
        }
      }

      // Si está 'signed', verificar que la fecha de inicio ya haya pasado
      if (contract.status === 'signed') {
        if (startDate <= today && (!endDate || endDate >= today)) {
          return contract
        }
      }
    }

    return null
  }

  /**
   * Obtiene todos los anexos asociados a un contrato
   * Incluye información de vigencia
   */
  async getContractAnnexes(contractId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('contract_annexes')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const today = new Date().toISOString().split('T')[0]

    // Agregar información de vigencia a cada anexo
    return ((data || []) as any[]).map((annex: any) => {
      const startDate = annex.start_date
      const endDate = annex.end_date

      let isActive = false
      let isExpired = false

      if (annex.status === 'active' || annex.status === 'signed') {
        if (startDate <= today) {
          if (!endDate || endDate >= today) {
            isActive = true
          } else {
            isExpired = true
          }
        }
      }

      return {
        ...annex,
        isActive,
        isExpired,
      }
    })
  }

  /**
   * Obtiene el valor vigente de un campo considerando contrato base + anexos activos
   * Si un anexo activo modifica el campo, retorna el valor del anexo más reciente
   */
  async getCurrentFieldValue(
    contractId: string,
    fieldName: string
  ): Promise<{ value: any; source: 'contract' | 'annex' | null; sourceId: string | null; sourceDate: string | null }> {
    // Obtener contrato
    const { data: contractData, error: contractError } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (contractError || !contractData) {
      return { value: null, source: null, sourceId: null, sourceDate: null }
    }

    const contract = contractData as any

    // Valor base del contrato
    let currentValue = contract[fieldName]
    let source: 'contract' | 'annex' = 'contract'
    let sourceId: string | null = contract.id
    let sourceDate: string | null = contract.created_at

    // Obtener anexos activos del contrato ordenados por fecha (más reciente primero)
    const annexes = await this.getContractAnnexes(contractId)
    const activeAnnexes = annexes
      .filter((a: any) => a.isActive && (a.status === 'active' || a.status === 'signed'))
      .sort((a: any, b: any) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())

    // Buscar si algún anexo activo modifica este campo
    // Por ahora, si hay anexos activos, asumimos que pueden haber modificado campos
    // TODO: Mejorar lógica para parsear el contenido del anexo y determinar qué campos modificó

    return {
      value: currentValue,
      source,
      sourceId,
      sourceDate,
    }
  }

  /**
   * Obtiene todos los valores vigentes de los campos de un concepto
   */
  async getCurrentConceptValues(
    contractId: string,
    conceptFields: string[]
  ): Promise<Record<string, { value: any; source: 'contract' | 'annex'; sourceId: string; sourceDate: string }>> {
    const { data: contractData, error: contractError } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (contractError || !contractData) {
      return {}
    }

    const contract = contractData as any

    const result: Record<string, { value: any; source: 'contract' | 'annex'; sourceId: string; sourceDate: string }> = {}

    for (const fieldName of conceptFields) {
      const fieldValue = await this.getCurrentFieldValue(contractId, fieldName)
      if (fieldValue.value !== null && fieldValue.value !== undefined) {
        result[fieldName] = {
          value: fieldValue.value,
          source: fieldValue.source || 'contract',
          sourceId: fieldValue.sourceId || contract.id,
          sourceDate: fieldValue.sourceDate || contract.created_at,
        }
      }
    }

    return result
  }

  /**
   * Detecta si un concepto ya fue modificado previamente mediante anexos
   */
  async getPreviousModifications(
    contractId: string,
    concept: string
  ): Promise<Array<{ annex: any; date: string; status: string; isActive: boolean }>> {
    const annexes = await this.getContractAnnexes(contractId)

    // Filtrar anexos que modificaron este concepto
    // Por ahora retornamos todos los anexos activos/firmados
    // TODO: Implementar mapeo concepto -> campos modificados

    return annexes
      .filter((a: any) => a.status === 'signed' || a.status === 'active')
      .map((annex: any) => ({
        annex,
        date: annex.created_at,
        status: annex.status,
        isActive: annex.isActive,
      }))
  }
}

/**
 * Función helper para crear instancia del servicio
 */
export function createAnnexService(supabase: SupabaseClient<Database>): AnnexService {
  return new AnnexService(supabase)
}

