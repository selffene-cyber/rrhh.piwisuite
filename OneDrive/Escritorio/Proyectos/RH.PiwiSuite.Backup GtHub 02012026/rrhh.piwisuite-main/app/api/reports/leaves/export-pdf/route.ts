import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getLeavesReport } from '@/lib/services/reports/leavesReports'
import { ReportFilters } from '@/types'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import LeavesReportPDF from '@/components/reports/LeavesReportPDF'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    const { rows, summary } = await getLeavesReport(filters, supabase)

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
      React.createElement(LeavesReportPDF, { rows, summary, company, filters })
    )

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_Licencias_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar PDF:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar PDF' }, { status: 500 })
  }
}

