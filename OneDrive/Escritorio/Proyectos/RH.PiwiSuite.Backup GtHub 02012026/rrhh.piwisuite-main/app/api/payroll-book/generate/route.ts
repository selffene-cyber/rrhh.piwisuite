import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { generatePayrollBook } from '@/lib/services/payrollBookGenerator'

/**
 * POST /api/payroll-book/generate
 * Genera o regenera el libro de remuneraciones para un período
 * Body: { company_id, year, month }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { company_id, year, month } = body

    if (!company_id || !year || !month) {
      return NextResponse.json(
        { error: 'company_id, year y month son requeridos' },
        { status: 400 }
      )
    }

    // Validar que el usuario tiene acceso a la empresa
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .single()

    if (!companyUser) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta empresa' },
        { status: 403 }
      )
    }

    const book = await generatePayrollBook(
      company_id,
      parseInt(year),
      parseInt(month),
      user.id,
      supabase
    )

    return NextResponse.json(book)
  } catch (error: any) {
    console.error('Error al generar libro de remuneraciones:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar libro de remuneraciones' },
      { status: 500 }
    )
  }
}

