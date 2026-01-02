import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getHeadcountReport } from '@/lib/services/reports/headcountReports'
import { ReportFilters } from '@/types'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import HeadcountReportPDF from '@/components/reports/HeadcountReportPDF'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const filters: ReportFilters = body.filters || {}

    // Obtener datos del reporte
    const { rows, summary } = await getHeadcountReport(filters, supabase)

    // Obtener información de la empresa
    let company = null
    if (filters.companyId) {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', filters.companyId)
        .single()
      company = data
    }

    // Generar PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(HeadcountReportPDF, { rows, summary, company, filters })
    )

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_Dotacion_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar PDF:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar PDF' }, { status: 500 })
  }
}

