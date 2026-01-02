import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getLeavesReport } from '@/lib/services/reports/leavesReports'
import { ReportFilters } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    const { rows } = await getLeavesReport(filters, supabase)

    const headers = [
      'RUT',
      'Nombre',
      'Estado',
      'Licencia Activa',
      'Días Licencia',
      'Inicio Licencia',
      'Fin Licencia',
      'Días Vacaciones Tomadas',
    ]

    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        [
          row.rut,
          `"${row.full_name}"`,
          row.status,
          row.medical_leave_active ? 'Sí' : 'No',
          row.medical_leave_days,
          row.medical_leave_start || '',
          row.medical_leave_end || '',
          row.vacation_days_taken || 0,
        ].join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Reporte_Licencias_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar CSV:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar CSV' }, { status: 500 })
  }
}

