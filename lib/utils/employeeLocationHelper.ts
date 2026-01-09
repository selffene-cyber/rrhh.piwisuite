/**
 * Helper para gestión de ubicación geográfica de empleados
 * Garantiza retrocompatibilidad entre IDs (nuevo) y texto legacy
 */

import { supabase } from '@/lib/supabase/client'

export interface GeoRegion {
  id: string
  code: string
  name: string
  active: boolean
}

export interface GeoCommune {
  id: string
  code: string
  name: string
  region_id: string
  province_id: string | null
  active: boolean
}

export interface GeoProvince {
  id: string
  code: string
  name: string
  region_id: string
  active: boolean
}

export interface Employee {
  id: string
  region_id?: string | null
  commune_id?: string | null
  province_id?: string | null
  region_name_legacy?: string | null
  city_name_legacy?: string | null
  region?: GeoRegion | null
  commune?: GeoCommune | null
  province?: GeoProvince | null
  [key: string]: any
}

/**
 * Obtiene el nombre de la región para mostrar (UI, PDFs, reportes)
 * Lógica de fallback: region_id → region_name_legacy → "Sin región"
 * 
 * @param employee - Objeto de empleado con region_id y/o region_name_legacy
 * @returns Nombre de la región a mostrar (nunca null)
 */
export function getEmployeeRegionDisplay(employee: Employee | null | undefined): string {
  if (!employee) {
    return 'Sin región'
  }

  // Caso 1: Si tiene region_id y el objeto region cargado (join)
  if (employee.region_id && employee.region) {
    return employee.region.name
  }

  // Caso 2: Si tiene region_id pero no el objeto (fallback a legacy si existe)
  if (employee.region_id && !employee.region && employee.region_name_legacy) {
    return employee.region_name_legacy
  }

  // Caso 3: Legacy - Solo tiene region_name_legacy (trabajadores antiguos)
  if (!employee.region_id && employee.region_name_legacy) {
    return employee.region_name_legacy
  }

  // Caso 4: No tiene ninguno
  return 'Sin región'
}

/**
 * Obtiene el nombre de la comuna/ciudad para mostrar
 * Lógica de fallback: commune_id → city_name_legacy → "Sin comuna"
 * 
 * @param employee - Objeto de empleado
 * @returns Nombre de la comuna a mostrar (nunca null)
 */
export function getEmployeeCommuneDisplay(employee: Employee | null | undefined): string {
  if (!employee) {
    return 'Sin comuna'
  }

  // Caso 1: Si tiene commune_id y el objeto commune cargado
  if (employee.commune_id && employee.commune) {
    return employee.commune.name
  }

  // Caso 2: Si tiene commune_id pero no el objeto (fallback a legacy)
  if (employee.commune_id && !employee.commune && employee.city_name_legacy) {
    return employee.city_name_legacy
  }

  // Caso 3: Legacy - Solo tiene city_name_legacy
  if (!employee.commune_id && employee.city_name_legacy) {
    return employee.city_name_legacy
  }

  // Caso 4: No tiene ninguno
  return 'Sin comuna'
}

/**
 * Obtiene ubicación completa formateada
 * Formato: "Comuna, Región" o fallback a legacy
 * 
 * @param employee - Objeto de empleado
 * @returns String formateado con ubicación completa
 */
export function getEmployeeFullLocation(employee: Employee | null | undefined): string {
  if (!employee) {
    return 'Sin ubicación'
  }

  const commune = getEmployeeCommuneDisplay(employee)
  const region = getEmployeeRegionDisplay(employee)

  if (commune === 'Sin comuna' && region === 'Sin región') {
    return 'Sin ubicación'
  }

  if (commune === 'Sin comuna') {
    return region
  }

  if (region === 'Sin región') {
    return commune
  }

  return `${commune}, ${region}`
}

/**
 * Verifica si un empleado usa el sistema legacy (texto)
 * 
 * @param employee - Objeto de empleado
 * @returns true si usa legacy, false si usa IDs
 */
export function isLegacyLocation(employee: Employee | null | undefined): boolean {
  if (!employee) {
    return false
  }

  const hasLegacy = (employee.region_name_legacy || employee.city_name_legacy)
  const hasIds = (employee.region_id || employee.commune_id)

  return !!hasLegacy && !hasIds
}

/**
 * Obtiene todas las regiones activas de la base de datos
 * 
 * @returns Array de regiones activas
 */
export async function getActiveRegions(): Promise<GeoRegion[]> {
  const { data, error } = await supabase
    .from('geo_regions')
    .select('id, code, name, active')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error obteniendo regiones:', error)
    return []
  }

  return data || []
}

/**
 * Obtiene comunas activas de una región específica
 * 
 * @param regionId - UUID de la región
 * @param searchQuery - Opcional: filtrar por nombre
 * @returns Array de comunas activas
 */
export async function getActiveCommunes(
  regionId: string,
  searchQuery?: string
): Promise<GeoCommune[]> {
  let query = supabase
    .from('geo_communes')
    .select('id, code, name, region_id, province_id, active')
    .eq('active', true)
    .eq('region_id', regionId)

  if (searchQuery && searchQuery.trim()) {
    query = query.ilike('name', `%${searchQuery.trim()}%`)
  }

  query = query.order('name', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('Error obteniendo comunas:', error)
    return []
  }

  return data || []
}

/**
 * Busca una región por nombre (case-insensitive)
 * Útil para el backfill
 * 
 * @param regionName - Nombre de la región a buscar
 * @returns Región encontrada o null
 */
export async function findRegionByName(regionName: string): Promise<GeoRegion | null> {
  if (!regionName || !regionName.trim()) {
    return null
  }

  const { data, error } = await supabase
    .from('geo_regions')
    .select('id, code, name, active')
    .ilike('name', regionName.trim())
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Busca una comuna por nombre dentro de una región (case-insensitive)
 * Útil para el backfill
 * 
 * @param communeName - Nombre de la comuna a buscar
 * @param regionId - UUID de la región (opcional, mejora precisión)
 * @returns Comuna encontrada o null
 */
export async function findCommuneByName(
  communeName: string,
  regionId?: string
): Promise<GeoCommune | null> {
  if (!communeName || !communeName.trim()) {
    return null
  }

  let query = supabase
    .from('geo_communes')
    .select('id, code, name, region_id, province_id, active')
    .ilike('name', communeName.trim())

  if (regionId) {
    query = query.eq('region_id', regionId)
  }

  query = query.limit(1)

  const { data, error } = await query.single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Normaliza la ubicación de un empleado (migra de legacy a IDs)
 * 
 * @param employeeId - ID del empleado
 * @returns true si se normalizó, false si no fue necesario o falló
 */
export async function normalizeEmployeeLocation(employeeId: string): Promise<boolean> {
  try {
    // Obtener empleado
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('id, region_id, commune_id, region_name_legacy, city_name_legacy')
      .eq('id', employeeId)
      .single()

    if (fetchError || !employee) {
      console.error('Error obteniendo empleado:', fetchError)
      return false
    }

    // Si ya tiene IDs, no es necesario normalizar
    if (employee.region_id && employee.commune_id) {
      return false
    }

    let regionId: string | null = employee.region_id
    let communeId: string | null = employee.commune_id

    // Intentar encontrar región si no la tiene
    if (!regionId && employee.region_name_legacy) {
      const region = await findRegionByName(employee.region_name_legacy)
      if (region) {
        regionId = region.id
      }
    }

    // Intentar encontrar comuna si no la tiene
    if (!communeId && employee.city_name_legacy) {
      const commune = await findCommuneByName(
        employee.city_name_legacy,
        regionId || undefined
      )
      if (commune) {
        communeId = commune.id
        // Si encontramos comuna pero no teníamos región, usar la de la comuna
        if (!regionId) {
          regionId = commune.region_id
        }
      }
    }

    // Si no se pudo normalizar nada, retornar false
    if (!regionId && !communeId) {
      return false
    }

    // Actualizar empleado con los IDs encontrados
    const updateData: any = {}
    if (regionId) updateData.region_id = regionId
    if (communeId) updateData.commune_id = communeId

    const { error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)

    if (updateError) {
      console.error('Error actualizando ubicación del empleado:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error en normalizeEmployeeLocation:', error)
    return false
  }
}

/**
 * Obtiene estadísticas de uso de ubicación
 * Útil para reportes
 */
export async function getLocationUsageStats(): Promise<{
  total_employees: number
  using_ids: number
  using_legacy: number
  no_location: number
}> {
  const { data, error } = await supabase
    .from('employees')
    .select('region_id, commune_id, region_name_legacy, city_name_legacy')

  if (error || !data) {
    return {
      total_employees: 0,
      using_ids: 0,
      using_legacy: 0,
      no_location: 0
    }
  }

  const stats = {
    total_employees: data.length,
    using_ids: data.filter((e: any) => e.region_id || e.commune_id).length,
    using_legacy: data.filter((e: any) => 
      (!e.region_id && !e.commune_id) && 
      (e.region_name_legacy || e.city_name_legacy)
    ).length,
    no_location: data.filter((e: any) => 
      !e.region_id && !e.commune_id && 
      !e.region_name_legacy && !e.city_name_legacy
    ).length
  }

  return stats
}


