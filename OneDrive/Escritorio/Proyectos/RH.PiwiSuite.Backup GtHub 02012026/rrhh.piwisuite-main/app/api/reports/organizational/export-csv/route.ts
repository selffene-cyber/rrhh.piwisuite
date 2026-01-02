import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getOrganizationalReport } from '@/lib/services/reports/organizationalReports'
import { ReportFilters } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    const rows = await getOrganizationalReport(filters, supabase)

    const headers = ['Centro de Costo', 'Cargo', 'Número de Trabajadores']

    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        [
          row.cost_center_code ? `"${row.cost_center_code} - ${row.cost_center_name}"` : 'Sin Centro de Costo',
          row.position ? `"${row.position}"` : 'Sin Cargo',
          row.employee_count,
        ].join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Reporte_Organizacional_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar CSV:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar CSV' }, { status: 500 })
  }
}

