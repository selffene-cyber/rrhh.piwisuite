import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { generatePayrollBook } from '@/lib/services/payrollBookGenerator'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { company_id, year, month } = body

    if (!company_id || !year || !month) {
      return NextResponse.json({ 
        error: 'company_id, year y month son requeridos' 
      }, { status: 400 })
    }

    const book = await generatePayrollBook(company_id, year, month, user.id, supabase)

    return NextResponse.json({ success: true, book })
  } catch (error: any) {
    console.error('Error al generar libro:', error)
    return NextResponse.json({ error: error.message || 'Error al generar libro' }, { status: 500 })
  }
}

