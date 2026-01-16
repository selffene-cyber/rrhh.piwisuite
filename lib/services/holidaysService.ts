/**
 * Servicio para gestionar feriados legales de Chile
 * Fuente oficial: API Gobierno Digital Chile
 * https://apis.digital.gob.cl/fl/feriados
 */

import { supabase } from '@/lib/supabase/client'

export interface Holiday {
  id?: string
  date: string // YYYY-MM-DD
  year: number
  name: string
  type: 'nacional' | 'regional' | 'religioso'
  is_irrenunciable: boolean
  law_number?: string | null
  region?: string | null
  communes?: string[] | null
  source: 'api' | 'manual'
  created_at?: string
  updated_at?: string
}

interface GobiernoDigitalHoliday {
  fecha: string // "YYYY-MM-DD"
  nombre: string
  tipo: string // "Religioso", "Civil", etc.
  irrenunciable: string // "1" o "0"
  ley?: string
}

/**
 * Obtiene feriados desde la API del Gobierno Digital de Chile
 * @param year Año a consultar
 * @returns Array de feriados o null si falla
 */
export async function fetchHolidaysFromGovernmentAPI(year: number): Promise<Holiday[] | null> {
  try {
    // Endpoint oficial del gobierno de Chile
    const response = await fetch(`https://apis.digital.gob.cl/fl/feriados/${year}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`API del gobierno retornó status ${response.status} para año ${year}`)
      return null
    }

    const data: GobiernoDigitalHoliday[] = await response.json()

    // Transformar a nuestro formato
    const holidays: Holiday[] = data.map(holiday => ({
      date: holiday.fecha,
      year: parseInt(holiday.fecha.split('-')[0]),
      name: holiday.nombre,
      type: mapTipoToType(holiday.tipo),
      is_irrenunciable: holiday.irrenunciable === '1',
      law_number: holiday.ley || null,
      source: 'api',
    }))

    return holidays
  } catch (error) {
    console.error('Error al obtener feriados desde API del gobierno:', error)
    return null
  }
}

/**
 * Mapea el tipo de la API del gobierno a nuestro tipo
 */
function mapTipoToType(tipo: string): 'nacional' | 'regional' | 'religioso' {
  const tipoLower = tipo.toLowerCase()
  
  if (tipoLower.includes('religio')) {
    return 'religioso'
  }
  if (tipoLower.includes('region')) {
    return 'regional'
  }
  return 'nacional'
}

/**
 * Sincroniza feriados de un año desde la API del gobierno a la base de datos
 * @param year Año a sincronizar
 * @returns true si se sincronizó exitosamente, false si falló
 */
export async function syncHolidaysFromAPI(year: number): Promise<boolean> {
  try {
    // Obtener feriados desde la API
    const holidays = await fetchHolidaysFromGovernmentAPI(year)

    if (!holidays || holidays.length === 0) {
      console.warn(`No se pudieron obtener feriados para el año ${year} desde la API`)
      return false
    }

    // Eliminar feriados existentes del año (solo los obtenidos por API, no manuales)
    const { error: deleteError } = await supabase
      .from('holidays')
      .delete()
      .eq('year', year)
      .eq('source', 'api')

    if (deleteError) {
      console.error('Error al eliminar feriados existentes:', deleteError)
      return false
    }

    // Insertar nuevos feriados
    const { error: insertError } = await supabase
      .from('holidays')
      .insert(holidays)

    if (insertError) {
      console.error('Error al insertar feriados:', insertError)
      return false
    }

    console.log(`✅ Sincronizados ${holidays.length} feriados para el año ${year}`)
    return true
  } catch (error) {
    console.error('Error al sincronizar feriados:', error)
    return false
  }
}

/**
 * Sincroniza múltiples años desde la API
 * @param startYear Año inicial
 * @param endYear Año final
 * @returns Objeto con resultados por año
 */
export async function syncHolidaysForYears(
  startYear: number,
  endYear: number
): Promise<{ [year: number]: boolean }> {
  const results: { [year: number]: boolean } = {}

  for (let year = startYear; year <= endYear; year++) {
    results[year] = await syncHolidaysFromAPI(year)
    // Pequeña pausa entre llamadas para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return results
}

/**
 * Obtiene feriados de un año desde la base de datos
 * @param year Año a consultar
 * @returns Array de feriados
 */
export async function getHolidaysByYear(year: number): Promise<Holiday[]> {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .order('date', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error al obtener feriados:', error)
    return []
  }
}

/**
 * Obtiene todos los feriados en un rango de fechas
 * @param startDate Fecha inicial (YYYY-MM-DD)
 * @param endDate Fecha final (YYYY-MM-DD)
 * @returns Array de feriados
 */
export async function getHolidaysInRange(startDate: string, endDate: string): Promise<Holiday[]> {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error al obtener feriados en rango:', error)
    return []
  }
}

/**
 * Verifica si una fecha es feriado
 * @param date Fecha a verificar (YYYY-MM-DD o Date)
 * @returns true si es feriado
 */
export async function isHoliday(date: string | Date): Promise<boolean> {
  try {
    const dateStr = typeof date === 'string' 
      ? date 
      : date.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('holidays')
      .select('id')
      .eq('date', dateStr)
      .maybeSingle()

    if (error) throw error

    return !!data
  } catch (error) {
    console.error('Error al verificar si es feriado:', error)
    return false
  }
}

/**
 * Crea un feriado manualmente
 * @param holiday Datos del feriado
 * @returns Feriado creado
 */
export async function createHoliday(holiday: Omit<Holiday, 'id' | 'created_at' | 'updated_at'>): Promise<Holiday | null> {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .insert({
        ...holiday,
        source: 'manual',
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error al crear feriado:', error)
    return null
  }
}

/**
 * Elimina un feriado
 * @param id ID del feriado
 * @returns true si se eliminó exitosamente
 */
export async function deleteHoliday(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error al eliminar feriado:', error)
    return false
  }
}

/**
 * Obtiene estadísticas de feriados
 */
export async function getHolidaysStats(): Promise<{
  totalHolidays: number
  yearsCovered: number[]
  lastSync: string | null
}> {
  try {
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('year, created_at')
      .order('year', { ascending: true })

    if (error) throw error

    const yearsCovered = [...new Set(holidays?.map((h: any) => h.year) || [])] as number[]
    const lastSync = holidays?.[holidays.length - 1]?.created_at || null

    return {
      totalHolidays: holidays?.length || 0,
      yearsCovered,
      lastSync,
    }
  } catch (error) {
    console.error('Error al obtener estadísticas de feriados:', error)
    return {
      totalHolidays: 0,
      yearsCovered: [],
      lastSync: null,
    }
  }
}
