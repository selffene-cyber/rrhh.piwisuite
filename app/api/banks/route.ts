/**
 * API Route: /api/banks
 * GET: Obtener bancos activos (con búsqueda opcional)
 * POST: Crear nuevo banco (solo admins)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-component'

/**
 * GET /api/banks
 * Retorna bancos activos, ordenados por tipo y nombre
 * Query params:
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

    // Obtener query param de búsqueda
    const searchParams = request.nextUrl.searchParams
    const searchQuery = searchParams.get('q') || ''

    // Query base: solo bancos activos
    let query = supabase
      .from('banks')
      .select('id, name, type')
      .eq('active', true)

    // Si hay búsqueda, filtrar por nombre (case-insensitive)
    if (searchQuery.trim()) {
      query = query.ilike('name', `%${searchQuery.trim()}%`)
    }

    // Ordenar por tipo (para agrupar) y luego por nombre
    // El orden de tipos será: banco, cooperativa, otros, prepago (alfabético)
    query = query.order('type', { ascending: true })
    query = query.order('name', { ascending: true })

    const { data: banks, error } = await query

    if (error) {
      console.error('Error obteniendo bancos:', error)
      return NextResponse.json(
        { error: 'Error al obtener bancos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      banks: banks || [],
      count: banks?.length || 0
    })

  } catch (error) {
    console.error('Error en GET /api/banks:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/banks
 * Crea un nuevo banco
 * Solo disponible para: super_admin, owner, admin
 * 
 * Body: { name: string, type: 'banco' | 'cooperativa' | 'prepago' | 'otro' }
 */
export async function POST(request: NextRequest) {
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

    // Verificar que el usuario sea admin, owner o super_admin
    const isSuperAdmin = user.user_metadata?.role === 'super_admin'
    
    if (!isSuperAdmin) {
      // Verificar si es admin u owner en alguna empresa
      const { data: companyUsers, error: companyError } = await supabase
        .from('company_users')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .limit(1)

      if (companyError || !companyUsers || companyUsers.length === 0) {
        return NextResponse.json(
          { error: 'Permisos insuficientes. Solo admins pueden crear bancos.' },
          { status: 403 }
        )
      }
    }

    // Parsear body
    const body = await request.json()
    const { name, type } = body

    // Validaciones
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del banco es requerido' },
        { status: 400 }
      )
    }

    if (!type || !['banco', 'cooperativa', 'prepago', 'otro'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Debe ser: banco, cooperativa, prepago u otro' },
        { status: 400 }
      )
    }

    // Insertar banco
    const { data: bank, error: insertError } = await supabase
      .from('banks')
      .insert({
        name: name.trim(),
        type: type,
        active: true
      })
      .select('id, name, type')
      .single()

    if (insertError) {
      // Error de duplicado (constraint violation por nombre único)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe un banco con ese nombre' },
          { status: 409 }
        )
      }
      
      console.error('Error insertando banco:', insertError)
      return NextResponse.json(
        { error: 'Error al crear banco' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      bank,
      message: 'Banco creado exitosamente'
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/banks:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

