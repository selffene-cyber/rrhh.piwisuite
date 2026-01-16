/**
 * API Route: /api/geo/regions
 * GET: Obtener regiones activas desde BD local
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-component'

/**
 * GET /api/geo/regions
 * Retorna regiones activas, ordenadas por nombre
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener regiones activas
    const { data: regions, error } = await supabase
      .from('geo_regions')
      .select('id, code, name')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error obteniendo regiones:', error)
      return NextResponse.json(
        { error: 'Error al obtener regiones' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      regions: regions || [],
      count: regions?.length || 0
    })

  } catch (error) {
    console.error('Error en GET /api/geo/regions:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


