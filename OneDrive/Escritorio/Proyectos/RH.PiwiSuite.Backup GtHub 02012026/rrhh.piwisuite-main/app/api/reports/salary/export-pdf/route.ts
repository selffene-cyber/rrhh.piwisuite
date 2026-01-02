import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSalaryReport } from '@/lib/services/reports/salaryReports'
import { ReportFilters } from '@/types'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import SalaryReportPDF from '@/components/reports/SalaryReportPDF'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    const { rows, summary } = await getSalaryReport(filters, supabase)

    let company = null
    if (filters.companyId) {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', filters.companyId)
        .single()
      company = data
    }

    const pdfBuffer = await renderToBuffer(
      React.createElement(SalaryReportPDF, { rows, summary, company, filters })
    )

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_Sueldos_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar PDF:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar PDF' }, { status: 500 })
  }
}

