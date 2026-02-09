import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

// GET: Obtener un préstamo específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('loans')
      .select(`
        *,
        employees (*),
        loan_payments (*),
        loan_installments (*)
      `)
      .eq('id', params.id)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error al obtener préstamo:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener préstamo' },
      { status: 500 }
    )
  }
}

// PUT: Actualizar un préstamo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar si el préstamo tiene pagos asociados
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        status,
        paid_installments,
        loan_payments (id),
        loan_installments (id, status)
      `)
      .eq('id', params.id)
      .single()

    if (loanError) throw loanError

    // Si tiene pagos o cuotas pagadas, no se puede editar
    const hasPayments = loanData.loan_payments && loanData.loan_payments.length > 0
    const hasPaidInstallments = loanData.paid_installments > 0
    const hasPaidInstallmentsInTable = loanData.loan_installments?.some(
      (inst: any) => inst.status === 'paid' || inst.status === 'partial'
    )

    if (hasPayments || hasPaidInstallments || hasPaidInstallmentsInTable) {
      return NextResponse.json(
        { 
          error: 'No se puede editar un préstamo que ya tiene pagos o cuotas pagadas. Solo se puede cancelar.' 
        },
        { status: 400 }
      )
    }

    // Si el préstamo está pagado o cancelado, no se puede editar
    if (loanData.status === 'paid' || loanData.status === 'cancelled') {
      return NextResponse.json(
        { 
          error: `No se puede editar un préstamo con estado "${loanData.status}".` 
        },
        { status: 400 }
      )
    }

    // Actualizar el préstamo
    const { data, error } = await supabase
      .from('loans')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error al actualizar préstamo:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar préstamo' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar un préstamo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar si el préstamo tiene pagos asociados
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        status,
        paid_installments,
        loan_payments (id),
        loan_installments (id, status)
      `)
      .eq('id', params.id)
      .single()

    if (loanError) throw loanError

    // Verificar restricciones
    const hasPayments = loanData.loan_payments && loanData.loan_payments.length > 0
    const hasPaidInstallments = loanData.paid_installments > 0
    const hasPaidInstallmentsInTable = loanData.loan_installments?.some(
      (inst: any) => inst.status === 'paid' || inst.status === 'partial'
    )

    // Solo se puede eliminar si:
    // 1. Está cancelado Y no tiene pagos
    // 2. O está activo pero no tiene pagos ni cuotas pagadas
    const canDelete = 
      (loanData.status === 'cancelled' && !hasPayments && !hasPaidInstallments && !hasPaidInstallmentsInTable) ||
      (loanData.status === 'active' && !hasPayments && !hasPaidInstallments && !hasPaidInstallmentsInTable)

    if (!canDelete) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar este préstamo porque tiene pagos o cuotas pagadas asociadas. Solo se puede cancelar.' 
        },
        { status: 400 }
      )
    }

    // Eliminar el préstamo (las relaciones se eliminan en cascada)
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Préstamo eliminado correctamente' })
  } catch (error: any) {
    console.error('Error al eliminar préstamo:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar préstamo' },
      { status: 500 }
    )
  }
}

// PATCH: Cancelar un préstamo
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Si el body contiene action: 'cancel', cancelar el préstamo
    if (body.action === 'cancel') {
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('id, status')
        .eq('id', params.id)
        .single()

      if (loanError) throw loanError

      if (loanData.status === 'paid') {
        return NextResponse.json(
          { error: 'No se puede cancelar un préstamo que ya está pagado.' },
          { status: 400 }
        )
      }

      if (loanData.status === 'cancelled') {
        return NextResponse.json(
          { error: 'El préstamo ya está cancelado.' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('loans')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    console.error('Error al cancelar préstamo:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cancelar préstamo' },
      { status: 500 }
    )
  }
}
