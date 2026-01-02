import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getLoansAdvancesReport } from '@/lib/services/reports/loansAdvancesReports'
import { ReportFilters } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    const { rows } = await getLoansAdvancesReport(filters, supabase)

    const headers = [
      'RUT',
      'Nombre',
      'Centro de Costo',
      'Saldo Préstamo',
      'Anticipos',
      'Estado Anticipo',
      'Deuda Total',
    ]

    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        [
          row.rut,
          `"${row.full_name}"`,
          row.cost_center_code ? `"${row.cost_center_code} - ${row.cost_center_name}"` : '',
          row.loan_balance,
          row.advance_amount,
          row.advance_status || '',
          row.total_debt,
        ].join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Reporte_Prestamos_Anticipos_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar CSV:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar CSV' }, { status: 500 })
  }
}

