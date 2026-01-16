/**
 * API Route: /api/geo/communes
 * GET: Obtener comunas activas desde BD local, filtradas por región
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-component'

/**
 * GET /api/geo/communes?regionId=xxx&q=search
 * Retorna comunas activas por región (con búsqueda opcional)
 * 
 * Query params:
 * - regionId: UUID de la región (requerido)
 * - q: búsqueda por nombre (opcional)
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

    // Obtener query params
    const searchParams = request.nextUrl.searchParams
    const regionId = searchParams.get('regionId')
    const searchQuery = searchParams.get('q') || ''

    // Validar que regionId sea proporcionado
    if (!regionId) {
      return NextResponse.json(
        { error: 'Parámetro regionId es requerido' },
        { status: 400 }
      )
    }

    // Query base: comunas activas de una región específica
    let query = supabase
      .from('geo_communes')
      .select('id, code, name, province_id')
      .eq('active', true)
      .eq('region_id', regionId)

    // Si hay búsqueda, filtrar por nombre (case-insensitive)
    if (searchQuery.trim()) {
      query = query.ilike('name', `%${searchQuery.trim()}%`)
    }

    // Ordenar por nombre
    query = query.order('name', { ascending: true })

    const { data: communes, error } = await query

    if (error) {
      console.error('Error obteniendo comunas:', error)
      return NextResponse.json(
        { error: 'Error al obtener comunas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      communes: communes || [],
      count: communes?.length || 0,
      region_id: regionId
    })

  } catch (error) {
    console.error('Error en GET /api/geo/communes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


