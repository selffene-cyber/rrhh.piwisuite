import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getHeadcountReport } from '@/lib/services/reports/headcountReports'
import { ReportFilters } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    const { rows } = await getHeadcountReport(filters, supabase)

    // Generar CSV
    const headers = [
      'RUT',
      'Nombre',
      'Centro de Costo',
      'Cargo',
      'AFP',
      'Sistema de Salud',
      'Plan de Salud',
      'Tipo de Contrato',
      'Estado',
      'Fecha de Ingreso',
      'Fecha Fin de Contrato',
    ]

    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        [
          row.rut,
          `"${row.full_name}"`,
          row.cost_center_code ? `"${row.cost_center_code} - ${row.cost_center_name}"` : '',
          row.position ? `"${row.position}"` : '',
          row.afp || '',
          row.health_system || '',
          row.health_plan || '',
          row.contract_type || '',
          row.status,
          row.hire_date || '',
          row.contract_end_date || '',
        ].join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Reporte_Dotacion_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar CSV:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar CSV' }, { status: 500 })
  }
}

