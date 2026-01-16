/**
 * API Route: /api/admin/geo/sync-dpa
 * POST: Sincronizar datos de división político-administrativa desde API DPA
 * Solo: super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-component'

const DPA_API_BASE = 'https://apis.digital.gob.cl/dpa'

interface DPARegion {
  codigo: string
  nombre: string
}

interface DPAProvince {
  codigo: string
  nombre: string
  region_codigo: string
}

interface DPACommune {
  codigo: string
  nombre: string
  region_codigo: string
  provincia_codigo: string
}

/**
 * POST /api/admin/geo/sync-dpa
 * Sincroniza regiones, provincias y comunas desde API DPA del Gobierno de Chile
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
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

    // Verificar que sea super_admin
    const isSuperAdmin = user.user_metadata?.role === 'super_admin'
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Permisos insuficientes. Solo super admins pueden ejecutar sincronización DPA.' },
        { status: 403 }
      )
    }

    console.log('[DPA Sync] Iniciando sincronización...')

    // 1. Sincronizar Regiones
    console.log('[DPA Sync] Obteniendo regiones...')
    const regionsResponse = await fetch(`${DPA_API_BASE}/regiones`)
    
    if (!regionsResponse.ok) {
      throw new Error(`Error obteniendo regiones: ${regionsResponse.status}`)
    }

    const regionsData: DPARegion[] = await regionsResponse.json()
    console.log(`[DPA Sync] ${regionsData.length} regiones obtenidas`)

    // Map para tracking de códigos recibidos
    const regionCodesReceived = new Set<string>()
    const regionCodeToId = new Map<string, string>()

    // Upsert regiones
    for (const region of regionsData) {
      regionCodesReceived.add(region.codigo)
      
      const { data, error } = await supabase
        .from('geo_regions')
        .upsert(
          {
            code: region.codigo,
            name: region.nombre,
            active: true
          },
          {
            onConflict: 'code',
            ignoreDuplicates: false
          }
        )
        .select('id, code')
        .single()

      if (error) {
        console.error(`Error upserting región ${region.codigo}:`, error)
      } else if (data) {
        regionCodeToId.set(data.code, data.id)
      }
    }

    // Marcar regiones no recibidas como inactivas
    await supabase
      .from('geo_regions')
      .update({ active: false })
      .not('code', 'in', `(${Array.from(regionCodesReceived).join(',')})`)

    // 2. Sincronizar Provincias
    console.log('[DPA Sync] Obteniendo provincias...')
    const provincesResponse = await fetch(`${DPA_API_BASE}/provincias`)
    
    if (!provincesResponse.ok) {
      throw new Error(`Error obteniendo provincias: ${provincesResponse.status}`)
    }

    const provincesData: DPAProvince[] = await provincesResponse.json()
    console.log(`[DPA Sync] ${provincesData.length} provincias obtenidas`)

    const provinceCodesReceived = new Set<string>()
    const provinceCodeToId = new Map<string, string>()

    // Upsert provincias
    for (const province of provincesData) {
      provinceCodesReceived.add(province.codigo)
      
      // Obtener region_id desde el map
      const regionId = regionCodeToId.get(province.region_codigo)
      
      if (!regionId) {
        console.warn(`Región ${province.region_codigo} no encontrada para provincia ${province.codigo}`)
        continue
      }

      const { data, error } = await supabase
        .from('geo_provinces')
        .upsert(
          {
            code: province.codigo,
            name: province.nombre,
            region_id: regionId,
            active: true
          },
          {
            onConflict: 'code',
            ignoreDuplicates: false
          }
        )
        .select('id, code')
        .single()

      if (error) {
        console.error(`Error upserting provincia ${province.codigo}:`, error)
      } else if (data) {
        provinceCodeToId.set(data.code, data.id)
      }
    }

    // Marcar provincias no recibidas como inactivas
    await supabase
      .from('geo_provinces')
      .update({ active: false })
      .not('code', 'in', `(${Array.from(provinceCodesReceived).join(',')})`)

    // 3. Sincronizar Comunas
    console.log('[DPA Sync] Obteniendo comunas...')
    const communesResponse = await fetch(`${DPA_API_BASE}/comunas`)
    
    if (!communesResponse.ok) {
      throw new Error(`Error obteniendo comunas: ${communesResponse.status}`)
    }

    const communesData: DPACommune[] = await communesResponse.json()
    console.log(`[DPA Sync] ${communesData.length} comunas obtenidas`)

    const communeCodesReceived = new Set<string>()

    // Upsert comunas
    for (const commune of communesData) {
      communeCodesReceived.add(commune.codigo)
      
      // Obtener region_id y province_id
      const regionId = regionCodeToId.get(commune.region_codigo)
      const provinceId = provinceCodeToId.get(commune.provincia_codigo)
      
      if (!regionId) {
        console.warn(`Región ${commune.region_codigo} no encontrada para comuna ${commune.codigo}`)
        continue
      }

      const { error } = await supabase
        .from('geo_communes')
        .upsert(
          {
            code: commune.codigo,
            name: commune.nombre,
            region_id: regionId,
            province_id: provinceId || null,
            active: true
          },
          {
            onConflict: 'code',
            ignoreDuplicates: false
          }
        )

      if (error) {
        console.error(`Error upserting comuna ${commune.codigo}:`, error)
      }
    }

    // Marcar comunas no recibidas como inactivas
    await supabase
      .from('geo_communes')
      .update({ active: false })
      .not('code', 'in', `(${Array.from(communeCodesReceived).join(',')})`)

    // 4. Guardar log de sincronización
    const duration = Date.now() - startTime

    await supabase
      .from('geo_sync_logs')
      .insert({
        user_id: user.id,
        sync_type: 'full',
        status: 'success',
        regions_count: regionsData.length,
        provinces_count: provincesData.length,
        communes_count: communesData.length,
        duration_ms: duration
      })

    console.log(`[DPA Sync] Sincronización completada en ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Sincronización DPA completada exitosamente',
      data: {
        regions: regionsData.length,
        provinces: provincesData.length,
        communes: communesData.length,
        duration_ms: duration
      }
    })

  } catch (error: any) {
    console.error('[DPA Sync] Error:', error)
    
    const duration = Date.now() - startTime

    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('geo_sync_logs')
          .insert({
            user_id: user.id,
            sync_type: 'full',
            status: 'failed',
            error_message: error.message || 'Error desconocido',
            duration_ms: duration
          })
      }
    } catch (logError) {
      console.error('[DPA Sync] Error guardando log:', logError)
    }

    return NextResponse.json(
      { 
        error: 'Error en sincronización DPA',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/geo/sync-dpa
 * Retorna último log de sincronización
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

    // Obtener último log
    const { data: lastSync, error } = await supabase
      .from('geo_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json({
        synced: false,
        message: 'No hay sincronizaciones previas'
      })
    }

    return NextResponse.json({
      synced: true,
      last_sync: lastSync
    })

  } catch (error) {
    console.error('Error obteniendo último sync:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


