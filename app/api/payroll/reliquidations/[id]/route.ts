import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    const { id } = params

    const { data, error } = await supabase
      .from('payroll_reliquidations')
      .select(`
        *,
        employees (*),
        payroll_periods (*),
        payroll_slips!payroll_reliquidations_reference_payroll_slip_id_fkey (
          *,
          employees (*),
          payroll_periods (*),
          payroll_items (*)
        ),
        payroll_reliquidation_items (*),
        payroll_reliquidation_deltas (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error al obtener reliquidación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener reliquidación' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    const { id } = params
    const body = await request.json()

    const { status, ...updates } = body

    // Si se está cambiando el estado, registrar quién lo hizo
    const updateData: any = { ...updates }
    if (status) {
      updateData.status = status
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        if (status === 'approved') {
          updateData.approved_by = user.id
          updateData.approved_at = new Date().toISOString()
        } else if (status === 'issued') {
          updateData.issued_by = user.id
          updateData.issued_at = new Date().toISOString()
        } else if (status === 'paid') {
          updateData.paid_at = new Date().toISOString()
        }
      }
    }

    const { data, error } = await supabase
      .from('payroll_reliquidations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error al actualizar reliquidación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar reliquidación' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    const { id } = params

    // Verificar que solo se puedan eliminar borradores o aprobadas
    const { data: reliquidation } = await supabase
      .from('payroll_reliquidations')
      .select('status')
      .eq('id', id)
      .single()

    if (reliquidation && (reliquidation.status === 'issued' || reliquidation.status === 'paid')) {
      return NextResponse.json(
        { error: 'No se pueden eliminar reliquidaciones emitidas o pagadas' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('payroll_reliquidations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error al eliminar reliquidación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar reliquidación' },
      { status: 500 }
    )
  }
}
