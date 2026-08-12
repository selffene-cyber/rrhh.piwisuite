import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    const { id } = params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: book, error: bookError } = await supabase
      .from('payroll_books')
      .select('id, status')
      .eq('id', id)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    if (book.status === 'closed' || book.status === 'sent_dt') {
      return NextResponse.json({ error: 'No se puede eliminar un libro cerrado o enviado a DT' }, { status: 400 })
    }

    const { error: entriesError } = await supabase
      .from('payroll_book_entries')
      .delete()
      .eq('payroll_book_id', id)

    if (entriesError) {
      throw entriesError
    }

    const { error: deleteError } = await supabase
      .from('payroll_books')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error al eliminar libro:', error)
    return NextResponse.json({ error: error.message || 'Error al eliminar libro' }, { status: 500 })
  }
}