import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de items' }, { status: 400 })
    }

    // Verificar permisos del primer item (todos deben ser de la misma empresa)
    const firstItem = items[0]
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', firstItem.company_id)
      .eq('status', 'active')
      .single()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'
    const isAdmin = companyUser?.role === 'admin' || companyUser?.role === 'owner'

    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos para asignar cumplimientos' }, { status: 403 })
    }

    // Calcular status para cada item
    const hoy = new Date()
    const complianceData = items.map((item: any) => {
      const vencimientoDate = new Date(item.fecha_vencimiento)
      const diasRestantes = Math.ceil((vencimientoDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      
      let status = 'VIGENTE'
      if (diasRestantes < 0) {
        status = 'VENCIDO'
      } else if (diasRestantes <= 30) {
        status = 'POR_VENCER'
      }

      return {
        ...item,
        status,
        created_by: user.id,
      }
    })

    // Insertar en lote
    const { data, error } = await supabase
      .from('worker_compliance')
      .insert(complianceData)
      .select()

    if (error) {
      console.error('Error insertando cumplimientos:', error)
      return NextResponse.json({ error: 'Error al asignar cumplimientos' }, { status: 500 })
    }

    return NextResponse.json({ count: data?.length || 0, items: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error en POST /api/compliance/worker/bulk:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

