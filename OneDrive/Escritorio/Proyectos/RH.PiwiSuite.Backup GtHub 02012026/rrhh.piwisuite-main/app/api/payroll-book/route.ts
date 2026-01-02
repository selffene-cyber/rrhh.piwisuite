import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getPayrollBookByPeriod } from '@/lib/services/payrollBookGenerator'

/**
 * GET /api/payroll-book?company_id=xxx&year=2025&month=12
 * Obtiene el libro de remuneraciones para un período específico
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    
    const companyId = searchParams.get('company_id')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!companyId || !year || !month) {
      return NextResponse.json(
        { error: 'company_id, year y month son requeridos' },
        { status: 400 }
      )
    }

    const book = await getPayrollBookByPeriod(
      companyId,
      parseInt(year),
      parseInt(month),
      supabase
    )

    return NextResponse.json(book)
  } catch (error: any) {
    console.error('Error al obtener libro de remuneraciones:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener libro de remuneraciones' },
      { status: 500 }
    )
  }
}

