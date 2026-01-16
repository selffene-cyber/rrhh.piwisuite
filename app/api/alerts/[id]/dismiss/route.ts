import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'dismissed' })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error al ocultar alerta:', error)
      return NextResponse.json({ error: 'Error al ocultar alerta' }, { status: 500 })
    }

    return NextResponse.json({ success: true, alert: data })
  } catch (error) {
    console.error('Error en POST /api/alerts/[id]/dismiss:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

