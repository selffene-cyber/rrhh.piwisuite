import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { closePayrollBook } from '@/lib/services/payrollBookGenerator'

/**
 * POST /api/payroll-book/[id]/close
 * Cierra el libro de remuneraciones (cambia estado a 'closed')
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Validar que el usuario es admin
    const { data: book } = await supabase
      .from('payroll_books')
      .select('company_id')
      .eq('id', params.id)
      .single()

    if (!book) {
      return NextResponse.json(
        { error: 'Libro no encontrado' },
        { status: 404 }
      )
    }

    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', book.company_id)
      .eq('status', 'active')
      .single()

    if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
      return NextResponse.json(
        { error: 'Solo administradores pueden cerrar el libro' },
        { status: 403 }
      )
    }

    const closedBook = await closePayrollBook(params.id, user.id, supabase)

    return NextResponse.json(closedBook)
  } catch (error: any) {
    console.error('Error al cerrar libro de remuneraciones:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cerrar libro de remuneraciones' },
      { status: 500 }
    )
  }
}

