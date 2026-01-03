import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { closePayrollBook } from '@/lib/services/payrollBookGenerator'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const bookId = params.id

    if (!bookId) {
      return NextResponse.json({ error: 'ID del libro es requerido' }, { status: 400 })
    }

    const closedBook = await closePayrollBook(bookId, user.id, supabase)

    return NextResponse.json({ success: true, book: closedBook })
  } catch (error: any) {
    console.error('Error al cerrar libro:', error)
    return NextResponse.json({ error: error.message || 'Error al cerrar libro' }, { status: 500 })
  }
}

