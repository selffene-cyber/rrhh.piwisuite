import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getPayrollReport } from '@/lib/services/reports/payrollReports'
import { ReportFilters } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    const { rows } = await getPayrollReport(filters, supabase)

    const headers = [
      'Período',
      'RUT',
      'Nombre',
      'Centro de Costo',
      'Haberes Imponibles',
      'Haberes No Imponibles',
      'Descuentos Legales',
      'Otros Descuentos',
      'Líquido a Pagar',
    ]

    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        [
          row.period,
          row.rut,
          `"${row.full_name}"`,
          row.cost_center_code ? `"${row.cost_center_code} - ${row.cost_center_name}"` : '',
          row.total_taxable_earnings,
          row.total_non_taxable_earnings,
          row.total_legal_deductions,
          row.total_other_deductions,
          row.net_pay,
        ].join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Reporte_Remuneraciones_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar CSV:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar CSV' }, { status: 500 })
  }
}

