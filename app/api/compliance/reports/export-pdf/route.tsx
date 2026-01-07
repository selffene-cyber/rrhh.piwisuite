import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export const dynamic = 'force-dynamic'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  companyInfo: {
    marginBottom: 20,
    fontSize: 9,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#000',
    fontSize: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
})

const ComplianceReportPDF = ({ data, company, filters }: any) => {
  const currentDate = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Reporte de Cumplimientos y Vencimientos</Text>
        
        <View style={styles.companyInfo}>
          <Text>Empresa: {company?.name || 'N/A'}</Text>
          <Text>RUT: {company?.rut || 'N/A'}</Text>
          <Text>Fecha de emisión: {currentDate}</Text>
          {filters && (
            <>
              {filters.status && filters.status !== 'all' && (
                <Text>Filtro Estado: {filters.status}</Text>
              )}
              {filters.tipo && filters.tipo !== 'all' && (
                <Text>Filtro Tipo: {filters.tipo}</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { width: '20%' }]}>Trabajador</Text>
            <Text style={[styles.tableCell, { width: '20%' }]}>Ítem</Text>
            <Text style={[styles.tableCell, { width: '10%' }]}>Tipo</Text>
            <Text style={[styles.tableCell, { width: '12%' }]}>Emisión</Text>
            <Text style={[styles.tableCell, { width: '12%' }]}>Vencimiento</Text>
            <Text style={[styles.tableCell, { width: '10%' }]}>Días Rest.</Text>
            <Text style={[styles.tableCell, { width: '16%' }]}>Estado</Text>
          </View>

          {/* Rows */}
          {data.map((item: any, index: number) => {
            const diasRestantes = Math.ceil(
              (new Date(item.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {item.employee_name || 'N/A'}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {item.item_nombre || 'N/A'}
                </Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>
                  {item.item_tipo || 'N/A'}
                </Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>
                  {new Date(item.fecha_emision).toLocaleDateString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>
                  {new Date(item.fecha_vencimiento).toLocaleDateString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>
                  {diasRestantes < 0 ? `-${Math.abs(diasRestantes)}` : diasRestantes}
                </Text>
                <Text style={[styles.tableCell, { width: '16%' }]}>
                  {item.status || 'N/A'}
                </Text>
              </View>
            )
          })}
        </View>

        <Text style={styles.footer}>
          Total de registros: {data.length} | Generado el {currentDate}
        </Text>
      </Page>
    </Document>
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const status = searchParams.get('status')
    const tipo = searchParams.get('tipo')
    const criticidad = searchParams.get('criticidad')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
    }

    // Obtener datos de cumplimientos
    const params = new URLSearchParams({ company_id: companyId })
    if (status) params.append('status', status)

    const complianceResponse = await fetch(
      `${request.nextUrl.origin}/api/compliance/worker?${params.toString()}`
    )
    if (!complianceResponse.ok) {
      throw new Error('Error al obtener cumplimientos')
    }
    const complianceData = await complianceResponse.json()

    // Obtener items para completar información
    const itemsResponse = await fetch(
      `${request.nextUrl.origin}/api/compliance/items?company_id=${companyId}`
    )
    const items = itemsResponse.ok ? await itemsResponse.json() : []
    const itemsMap = new Map(items.map((item: any) => [item.id, item]))

    // Transformar datos
    const transformed = complianceData.map((item: any) => {
      const complianceItem = itemsMap.get(item.compliance_item_id) as any
      return {
        employee_name: item.employees?.full_name || 'N/A',
        employee_rut: item.employees?.rut || 'N/A',
        item_nombre: complianceItem?.nombre || item.compliance_items?.nombre || 'N/A',
        item_tipo: complianceItem?.tipo || item.compliance_items?.tipo || 'OTRO',
        item_criticidad: complianceItem?.criticidad || item.compliance_items?.criticidad || 'MEDIA',
        fecha_emision: item.fecha_emision,
        fecha_vencimiento: item.fecha_vencimiento,
        status: item.status,
      }
    })

    // Aplicar filtros adicionales
    let filtered = transformed
    if (tipo && tipo !== 'all') {
      filtered = filtered.filter((c: any) => c.item_tipo === tipo)
    }
    if (criticidad && criticidad !== 'all') {
      filtered = filtered.filter((c: any) => c.item_criticidad === criticidad)
    }

    // Obtener información de la empresa
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    // Generar PDF
    const pdfDoc = (
      <ComplianceReportPDF
        data={filtered}
        company={company}
        filters={{ status, tipo, criticidad }}
      />
    )

    // Generar buffer del PDF
    const pdfInstance = pdf(pdfDoc as any)
    let buffer: Uint8Array | Buffer
    
    try {
      // Intentar generar blob primero (más confiable)
      const blob = await pdfInstance.toBlob()
      if (blob && blob.size > 0) {
        const arrayBuffer = await blob.arrayBuffer()
        buffer = new Uint8Array(arrayBuffer)
      } else {
        // Fallback a toBuffer
        buffer = Buffer.from(await pdfInstance.toBuffer() as any)
      }
    } catch (error) {
      // Si falla, intentar toBuffer directamente
      buffer = Buffer.from(await pdfInstance.toBuffer() as any)
    }
    
    // Validar buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('El PDF generado está vacío')
    }
    
    // Validar header PDF
    if (buffer.length < 4 || String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]) !== '%PDF') {
      throw new Error('El PDF generado no tiene un encabezado válido')
    }

    const finalBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
    
    return new NextResponse(finalBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-cumplimientos-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error generando reporte PDF:', error)
    return NextResponse.json({ error: 'Error al generar reporte PDF' }, { status: 500 })
  }
}

