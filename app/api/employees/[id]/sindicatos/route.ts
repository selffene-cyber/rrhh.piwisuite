import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('employee_sindicatos')
    .select('*')
    .eq('employee_id', params.id)
    .order('sindicato_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const body = await request.json()
  const { sindicato_order, rut_sindicato, nombre_sindicato } = body

  if (!sindicato_order || !rut_sindicato) {
    return NextResponse.json({ error: 'sindicato_order y rut_sindicato son obligatorios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('employee_sindicatos')
    .insert({
      employee_id: params.id,
      sindicato_order,
      rut_sindicato,
      nombre_sindicato: nombre_sindicato || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un sindicato en esa posición para este trabajador' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const body = await request.json()
  const { sindicato_id, sindicato_order, rut_sindicato, nombre_sindicato } = body

  if (!sindicato_id) {
    return NextResponse.json({ error: 'sindicato_id es obligatorio' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (sindicato_order !== undefined) updateData.sindicato_order = sindicato_order
  if (rut_sindicato !== undefined) updateData.rut_sindicato = rut_sindicato
  if (nombre_sindicato !== undefined) updateData.nombre_sindicato = nombre_sindicato

  const { data, error } = await supabase
    .from('employee_sindicatos')
    .update(updateData)
    .eq('id', sindicato_id)
    .eq('employee_id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { searchParams } = new URL(request.url)
  const sindicatoId = searchParams.get('sindicato_id')

  if (!sindicatoId) {
    return NextResponse.json({ error: 'sindicato_id es obligatorio' }, { status: 400 })
  }

  const { error } = await supabase
    .from('employee_sindicatos')
    .delete()
    .eq('id', sindicatoId)
    .eq('employee_id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}