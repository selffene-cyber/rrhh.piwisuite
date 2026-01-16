import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

/**
 * API para sincronizar feriados desde la API del Gobierno Digital de Chile
 * Solo accesible para administradores
 */

interface GobiernoDigitalHoliday {
  fecha: string // "YYYY-MM-DD"
  nombre: string
  tipo: string // "Religioso", "Civil", etc.
  irrenunciable: string // "1" o "0"
  ley?: string
}

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { year } = await request.json()

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que sea admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden sincronizar feriados' },
        { status: 403 }
      )
    }

    // Validar año
    if (!year || typeof year !== 'number') {
      return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
    }

    if (year < 2019 || year > 2030) {
      return NextResponse.json(
        { error: 'El año debe estar entre 2019 y 2030' },
        { status: 400 }
      )
    }

    // Intentar obtener feriados desde la API del gobierno
    let apiResponse
    try {
      apiResponse = await fetch(`https://apis.digital.gob.cl/fl/feriados/${year}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })
    } catch (fetchError) {
      console.error('Error al conectar con API del gobierno:', fetchError)
      return NextResponse.json(
        {
          error: 'No se pudo conectar con la API del gobierno',
          details: 'La API podría estar temporalmente fuera de servicio',
        },
        { status: 503 }
      )
    }

    if (!apiResponse.ok) {
      console.warn(`API del gobierno retornó status ${apiResponse.status} para año ${year}`)
      return NextResponse.json(
        {
          error: `La API del gobierno retornó error ${apiResponse.status}`,
          details: 'Los feriados para este año podrían no estar disponibles aún',
        },
        { status: apiResponse.status }
      )
    }

    const data: GobiernoDigitalHoliday[] = await apiResponse.json()

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron feriados para este año' },
        { status: 404 }
      )
    }

    // Transformar a nuestro formato
    const holidays = data.map(holiday => ({
      date: holiday.fecha,
      year: parseInt(holiday.fecha.split('-')[0]),
      name: holiday.nombre,
      type: mapTipoToType(holiday.tipo),
      is_irrenunciable: holiday.irrenunciable === '1',
      law_number: holiday.ley || null,
      source: 'api',
    }))

    // Eliminar feriados existentes del año (solo los obtenidos por API, no manuales)
    const { error: deleteError } = await supabase
      .from('holidays')
      .delete()
      .eq('year', year)
      .eq('source', 'api')

    if (deleteError) {
      console.error('Error al eliminar feriados existentes:', deleteError)
      return NextResponse.json(
        { error: 'Error al limpiar feriados existentes' },
        { status: 500 }
      )
    }

    // Insertar nuevos feriados
    const { error: insertError } = await supabase
      .from('holidays')
      .insert(holidays)

    if (insertError) {
      console.error('Error al insertar feriados:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar feriados' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      year,
      count: holidays.length,
      message: `Se sincronizaron ${holidays.length} feriados para el año ${year}`,
    })
  } catch (error: any) {
    console.error('Error al sincronizar feriados:', error)
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar feriados' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener estadísticas de feriados
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('year, source')
      .order('year', { ascending: true })

    if (error) throw error

    const yearsCovered = [...new Set(holidays?.map(h => h.year) || [])]
    const byYear = yearsCovered.reduce((acc, year) => {
      const yearHolidays = holidays?.filter(h => h.year === year) || []
      acc[year] = {
        total: yearHolidays.length,
        fromAPI: yearHolidays.filter(h => h.source === 'api').length,
        manual: yearHolidays.filter(h => h.source === 'manual').length,
      }
      return acc
    }, {} as any)

    return NextResponse.json({
      totalHolidays: holidays?.length || 0,
      yearsCovered,
      byYear,
    })
  } catch (error: any) {
    console.error('Error al obtener estadísticas de feriados:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
