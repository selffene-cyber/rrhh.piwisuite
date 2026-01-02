import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSalaryReport } from '@/lib/services/reports/salaryReports'
import { ReportFilters } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    const { rows } = await getSalaryReport(filters, supabase)

    const headers = [
      'RUT',
      'Nombre',
      'Centro de Costo',
      'Cargo',
      'Sueldo Base',
      'Movilización',
      'Colación',
      'Anticipo',
      'Solicita Anticipo',
      'Total Remuneración',
    ]

    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        [
          row.rut,
          `"${row.full_name}"`,
          row.cost_center_code ? `"${row.cost_center_code} - ${row.cost_center_name}"` : '',
          row.position ? `"${row.position}"` : '',
          row.base_salary,
          row.transportation,
          row.meal_allowance,
          row.advance_amount,
          row.requests_advance ? 'Sí' : 'No',
          row.total_remuneration,
        ].join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Reporte_Sueldos_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar CSV:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar CSV' }, { status: 500 })
  }
}

