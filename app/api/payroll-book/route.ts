import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')

    let query = supabase
      .from('payroll_books')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (company_id) {
      query = query.eq('company_id', company_id)
    }

    const { data: books, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ books: books || [] })
  } catch (error: any) {
    console.error('Error al obtener libros:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener libros' }, { status: 500 })
  }
}

