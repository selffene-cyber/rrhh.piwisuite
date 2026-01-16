/**
 * Helper para gestión de bancos de empleados
 * Garantiza retrocompatibilidad entre bank_id (nuevo) y bank_name (legacy)
 */

import { supabase } from '@/lib/supabase/client'

export interface Bank {
  id: string
  name: string
  type: 'banco' | 'cooperativa' | 'prepago' | 'otro'
  active: boolean
}

export interface Employee {
  id: string
  bank_id?: string | null
  bank_name?: string | null
  bank?: Bank | null
  [key: string]: any
}

/**
 * Obtiene el nombre del banco para mostrar (UI, PDFs, reportes)
 * Lógica de fallback: bank_id → bank_name → "Sin banco"
 * 
 * @param employee - Objeto de empleado con bank_id y/o bank_name
 * @returns Nombre del banco a mostrar (nunca null)
 */
export function getEmployeeBankDisplay(employee: Employee | null | undefined): string {
  if (!employee) {
    return 'Sin banco'
  }

  // Caso 1: Si tiene bank_id y el objeto bank cargado (join)
  if (employee.bank_id && employee.bank) {
    return employee.bank.name
  }

  // Caso 2: Si tiene bank_id pero no el objeto bank (necesita fetch)
  // En este caso, el llamador debería hacer el join o fetch
  // Pero como fallback, si solo tenemos el ID, intentamos usar bank_name
  if (employee.bank_id && !employee.bank && employee.bank_name) {
    return employee.bank_name
  }

  // Caso 3: Legacy - Solo tiene bank_name (trabajadores antiguos)
  if (!employee.bank_id && employee.bank_name) {
    return employee.bank_name
  }

  // Caso 4: No tiene ninguno
  return 'Sin banco'
}

/**
 * Obtiene el tipo de banco para mostrar
 * 
 * @param employee - Objeto de empleado
 * @returns Tipo de banco: 'banco' | 'cooperativa' | 'prepago' | 'otro' | null
 */
export function getEmployeeBankType(employee: Employee | null | undefined): string | null {
  if (!employee || !employee.bank) {
    return null
  }

  return employee.bank.type
}

/**
 * Verifica si un empleado usa el sistema legacy (bank_name)
 * 
 * @param employee - Objeto de empleado
 * @returns true si usa bank_name (legacy), false si usa bank_id (nuevo)
 */
export function isLegacyBank(employee: Employee | null | undefined): boolean {
  if (!employee) {
    return false
  }

  return !employee.bank_id && !!employee.bank_name
}

/**
 * Obtiene todos los bancos activos de la base de datos
 * Ordenados por: tipo (banco→cooperativa→prepago→otro) y luego nombre
 * 
 * @param searchQuery - Opcional: filtrar por nombre
 * @returns Array de bancos activos
 */
export async function getActiveBanks(searchQuery?: string): Promise<Bank[]> {
  let query = supabase
    .from('banks')
    .select('id, name, type, active')
    .eq('active', true)

  // Si hay búsqueda, filtrar por nombre (case-insensitive)
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike('name', `%${searchQuery.trim()}%`)
  }

  // Ordenar: primero por tipo (usando CASE), luego por nombre
  query = query.order('type', { ascending: true })
  query = query.order('name', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('Error obteniendo bancos:', error)
    return []
  }

  return data || []
}

/**
 * Agrupa bancos por tipo para mostrar en dropdown
 * 
 * @param banks - Array de bancos
 * @returns Objeto con bancos agrupados por tipo
 */
export function groupBanksByType(banks: Bank[]): {
  bancos: Bank[]
  cooperativas: Bank[]
  prepago: Bank[]
  otros: Bank[]
} {
  return {
    bancos: banks.filter(b => b.type === 'banco'),
    cooperativas: banks.filter(b => b.type === 'cooperativa'),
    prepago: banks.filter(b => b.type === 'prepago'),
    otros: banks.filter(b => b.type === 'otro')
  }
}

/**
 * Crea un nuevo banco en la base de datos
 * Solo disponible para admins/owners
 * 
 * @param name - Nombre del banco
 * @param type - Tipo de institución
 * @returns Banco creado o error
 */
export async function createBank(
  name: string,
  type: 'banco' | 'cooperativa' | 'prepago' | 'otro'
): Promise<{ data: Bank | null; error: any }> {
  // Validar que el nombre no esté vacío
  if (!name || !name.trim()) {
    return {
      data: null,
      error: { message: 'El nombre del banco no puede estar vacío' }
    }
  }

  // Intentar insertar
  const { data, error } = await supabase
    .from('banks')
    .insert({
      name: name.trim(),
      type: type,
      active: true
    })
    .select('id, name, type, active')
    .single()

  if (error) {
    // Error de duplicado (constraint violation)
    if (error.code === '23505') {
      return {
        data: null,
        error: { message: 'Ya existe un banco con ese nombre' }
      }
    }
    
    console.error('Error creando banco:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Busca un banco por nombre exacto (case-insensitive)
 * Útil para el backfill
 * 
 * @param bankName - Nombre del banco a buscar
 * @returns Banco encontrado o null
 */
export async function findBankByName(bankName: string): Promise<Bank | null> {
  if (!bankName || !bankName.trim()) {
    return null
  }

  const { data, error } = await supabase
    .from('banks')
    .select('id, name, type, active')
    .ilike('name', bankName.trim())
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Normaliza el banco de un empleado (migra de bank_name a bank_id)
 * 
 * @param employeeId - ID del empleado
 * @returns true si se normalizó, false si no fue necesario o falló
 */
export async function normalizeEmployeeBank(employeeId: string): Promise<boolean> {
  try {
    // Obtener empleado
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('id, bank_id, bank_name')
      .eq('id', employeeId)
      .single()

    if (fetchError || !employee) {
      console.error('Error obteniendo empleado:', fetchError)
      return false
    }

    // Si ya tiene bank_id, no es necesario normalizar
    if (employee.bank_id) {
      return false
    }

    // Si no tiene bank_name, no hay nada que normalizar
    if (!employee.bank_name || !employee.bank_name.trim()) {
      return false
    }

    // Buscar banco por nombre
    let bank = await findBankByName(employee.bank_name)

    // Si no existe, crearlo como 'otro'
    if (!bank) {
      const { data: newBank, error: createError } = await createBank(
        employee.bank_name,
        'otro'
      )

      if (createError || !newBank) {
        console.error('Error creando banco para normalización:', createError)
        return false
      }

      bank = newBank
    }

    // Actualizar empleado con bank_id
    const { error: updateError } = await supabase
      .from('employees')
      .update({ bank_id: bank.id })
      .eq('id', employeeId)

    if (updateError) {
      console.error('Error actualizando bank_id del empleado:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error en normalizeEmployeeBank:', error)
    return false
  }
}

/**
 * Obtiene estadísticas de uso de bancos
 * Útil para reportes
 */
export async function getBankUsageStats(): Promise<{
  total_employees: number
  using_bank_id: number
  using_bank_name: number
  no_bank: number
}> {
  const { data, error } = await supabase
    .from('employees')
    .select('bank_id, bank_name')

  if (error || !data) {
    return {
      total_employees: 0,
      using_bank_id: 0,
      using_bank_name: 0,
      no_bank: 0
    }
  }

  const stats = {
    total_employees: data.length,
    using_bank_id: data.filter((e: any) => e.bank_id).length,
    using_bank_name: data.filter((e: any) => !e.bank_id && e.bank_name).length,
    no_bank: data.filter((e: any) => !e.bank_id && !e.bank_name).length
  }

  return stats
}

