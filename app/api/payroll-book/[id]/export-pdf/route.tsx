import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getPayrollBook } from '@/lib/services/payrollBookGenerator'
import { MONTHS } from '@/lib/utils/date'
import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export const dynamic = 'force-dynamic'

function fc(value: number): string {
  if (value === 0 || value === null || value === undefined) return ''
  return '$' + Math.round(value).toLocaleString('es-CL')
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = dateStr.split('T')[0]
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// Letter landscape = 792pt wide. Margins 12pt each side = 768pt usable.
// 24 columns after removing 5: Aguinaldo, Vacaciones, OtrosHabNoImp, Prestamos, Anticipos
// Total width = 768pt
interface Col {
  key: string
  header: string[]
  width: number
  align: 'left' | 'right' | 'center'
  group: 'id' | 'hab' | 'desc' | 'aport' | 'liq'
}

const columns: Col[] = [
  // Identificación (156)
  { key: 'employee_rut', header: ['RUT'], width: 42, align: 'center', group: 'id' },
  { key: 'employee_name', header: ['Nombre'], width: 80, align: 'left', group: 'id' },
  { key: 'employee_hire_date', header: ['Fecha', 'Ingreso'], width: 34, align: 'center', group: 'id' },

  // Haberes Imponibles (180)
  { key: 'base_salary', header: ['Sueldo', 'Base'], width: 34, align: 'right', group: 'hab' },
  { key: 'monthly_gratification', header: ['Grat.', 'Mensual'], width: 32, align: 'right', group: 'hab' },
  { key: 'bonuses', header: ['Bonos'], width: 24, align: 'right', group: 'hab' },
  { key: 'overtime', header: ['Horas', 'Extra'], width: 28, align: 'right', group: 'hab' },
  { key: 'other_taxable_earnings', header: ['Otros', 'Hab. Imp.'], width: 30, align: 'right', group: 'hab' },
  { key: 'total_taxable_earnings', header: ['T. Hab.', 'Imp.'], width: 32, align: 'right', group: 'hab' },

  // Haberes No Imponibles (84)
  { key: 'transportation', header: ['Transporte'], width: 28, align: 'right', group: 'hab' },
  { key: 'meal_allowance', header: ['Colación'], width: 24, align: 'right', group: 'hab' },
  { key: 'total_non_taxable_earnings', header: ['T. Hab.', 'No Imp.'], width: 32, align: 'right', group: 'hab' },

  // Descuentos Legales (144)
  { key: 'afp_deduction', header: ['AFP'], width: 26, align: 'right', group: 'desc' },
  { key: 'health_deduction', header: ['Salud'], width: 26, align: 'right', group: 'desc' },
  { key: 'unemployment_insurance_deduction', header: ['Seg.', 'Cesantía'], width: 28, align: 'right', group: 'desc' },
  { key: 'unique_tax_deduction', header: ['Imp.', 'Único'], width: 28, align: 'right', group: 'desc' },
  { key: 'total_legal_deductions', header: ['T. Desc.', 'Legales'], width: 32, align: 'right', group: 'desc' },

  // Descuentos Otros (56)
  { key: 'other_deductions', header: ['Otros', 'Desc.'], width: 26, align: 'right', group: 'desc' },
  { key: 'total_other_deductions', header: ['T. Otros', 'Desc.'], width: 30, align: 'right', group: 'desc' },

  // Aportes Empleador (114)
  { key: 'employer_afp_contribution', header: ['Aporte', 'AFP Emp.'], width: 28, align: 'right', group: 'aport' },
  { key: 'employer_sis_contribution', header: ['Aporte', 'SIS Emp.'], width: 28, align: 'right', group: 'aport' },
  { key: 'employer_afc_contribution', header: ['Aporte', 'AFC Emp.'], width: 28, align: 'right', group: 'aport' },
  { key: 'total_employer_contributions', header: ['T. Aportes', 'Empleador'], width: 30, align: 'right', group: 'aport' },

  // Líquido (36)
  { key: 'net_pay', header: ['Líquido'], width: 36, align: 'right', group: 'liq' },
]

const GROUP_SEPARATORS = (() => {
  const seps: number[] = []
  let w = 0
  let prevGroup = columns[0].group
  for (const col of columns) {
    if (col.group !== prevGroup) {
      seps.push(w)
    }
    w += col.width
    prevGroup = col.group
  }
  return seps
})()

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 1,
  },
  companyLine: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#333333',
    lineHeight: 1.4,
  },
  companyName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  thinLine: {
    height: 0.5,
    backgroundColor: '#000000',
    marginVertical: 2,
  },
  thickLine: {
    height: 1.5,
    backgroundColor: '#000000',
    marginVertical: 2,
  },
  columnHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 1,
    paddingTop: 2,
  },
  colHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  colHeaderText: {
    fontSize: 5.2,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 1.15,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 1.5,
    paddingHorizontal: 1,
    borderBottomWidth: 0.3,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
  },
  dataCell: {
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  dataCellText: {
    fontSize: 5.5,
    fontFamily: 'Helvetica',
    color: '#000000',
    lineHeight: 1.1,
  },
  totalsRow: {
    flexDirection: 'row',
    paddingTop: 2,
    paddingBottom: 2,
    paddingHorizontal: 1,
  },
  totalsCell: {
    paddingHorizontal: 2,
  },
  totalsCellText: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 6,
    left: 12,
    right: 12,
    textAlign: 'center',
    fontSize: 6.5,
    fontFamily: 'Helvetica',
    color: '#555555',
  },
  groupHeaderText: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    textAlign: 'center',
  },
})

function getCellValue(entry: any, key: string): string {
  const val = entry[key]
  if (val === null || val === undefined) return ''
  if (key === 'employee_rut') return String(val)
  if (key === 'employee_name') return String(val)
  if (key === 'employee_hire_date') return fmtDate(val)
  if (typeof val === 'number') return fc(val)
  return String(val)
}

function cellAlignStyle(align: 'left' | 'right' | 'center'): any {
  if (align === 'right') return { alignItems: 'flex-end' as const }
  if (align === 'center') return { alignItems: 'center' as const }
  return { alignItems: 'flex-start' as const }
}

function centerAlignStyle(): any {
  return { alignItems: 'center' as const }
}

const PayrollBookPDF = ({ book, entries, company, periodLabel }: any) => {
  const companyName = company?.name || company?.employer_name || ''
  const companyRut = company?.rut || ''
  const companyAddress = company?.address || ''
  const companyCity = company?.city || ''
  const companyEmployer = company?.employer_name || ''

  const ROWS_PER_PAGE = 26
  const pages: any[][] = []
  for (let i = 0; i < entries.length; i += ROWS_PER_PAGE) {
    pages.push(entries.slice(i, i + ROWS_PER_PAGE))
  }
  if (pages.length === 0) pages.push([])

  const totalsData: Record<string, string> = {
    employee_rut: '',
    employee_name: 'TOTALES',
    employee_hire_date: '',
    base_salary: '',
    monthly_gratification: '',
    bonuses: '',
    overtime: '',
    other_taxable_earnings: '',
    total_taxable_earnings: fc(book.total_taxable_earnings || 0),
    transportation: '',
    meal_allowance: '',
    total_non_taxable_earnings: fc(book.total_non_taxable_earnings || 0),
    afp_deduction: '',
    health_deduction: '',
    unemployment_insurance_deduction: '',
    unique_tax_deduction: '',
    total_legal_deductions: fc(book.total_legal_deductions || 0),
    other_deductions: '',
    total_other_deductions: fc(book.total_other_deductions || 0),
    employer_afp_contribution: '',
    employer_sis_contribution: '',
    employer_afc_contribution: '',
    total_employer_contributions: fc(book.total_employer_contributions || 0),
    net_pay: fc(book.total_net_pay || 0),
  }

  const totalPages = pages.length
  const totalEmployees = entries.length

  const groups: { label: string; startCol: number; endCol: number }[] = []
  let currentGroup = columns[0].group
  let startIdx = 0
  for (let i = 1; i <= columns.length; i++) {
    const g = i < columns.length ? columns[i].group : null
    if (g !== currentGroup) {
      groups.push({
        label: currentGroup === 'id' ? 'Identificación' :
               currentGroup === 'hab' ? 'Haberes' :
               currentGroup === 'desc' ? 'Descuentos' :
               currentGroup === 'aport' ? 'Aportes Empleador' : 'Líquido',
        startCol: startIdx,
        endCol: i - 1,
      })
      startIdx = i
      currentGroup = g!
    }
  }

  return (
    <Document>
      {pages.map((pageEntries, pageIndex) => (
        <Page key={pageIndex} size="LETTER" orientation="landscape" style={styles.page}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>LIBRO REMUNERACIONES</Text>
              <Text style={styles.subtitle}>{periodLabel}</Text>
            </View>
            <View style={styles.headerRight}>
              {companyName && <Text style={styles.companyName}>{companyName}</Text>}
              {companyEmployer && companyEmployer !== companyName && (
                <Text style={styles.companyLine}>{companyEmployer}</Text>
              )}
              {companyRut && <Text style={styles.companyLine}>RUT: {companyRut}</Text>}
              {companyAddress && (
                <Text style={styles.companyLine}>
                  {companyAddress}{companyCity ? `, ${companyCity}` : ''}
                </Text>
              )}
              {!companyAddress && companyCity && (
                <Text style={styles.companyLine}>{companyCity}</Text>
              )}
            </View>
          </View>

          <View style={styles.thinLine} />

          {/* Group headers */}
          <View style={{ flexDirection: 'row', marginBottom: 1 }}>
            {groups.map((grp, gi) => {
              const gw = columns.slice(grp.startCol, grp.endCol + 1).reduce((s, c) => s + c.width, 0)
              return (
                <View key={gi} style={{ width: gw, alignItems: 'center' }}>
                  <Text style={styles.groupHeaderText}>{grp.label}</Text>
                </View>
              )
            })}
          </View>
          <View style={styles.thinLine} />

          {/* Column headers */}
          <View style={styles.columnHeaderRow}>
            {columns.map((col, ci) => {
              const prevWidth = columns.slice(0, ci).reduce((s, c) => s + c.width, 0)
              const isSep = GROUP_SEPARATORS.includes(prevWidth)
              return (
                <View
                  key={col.key}
                  style={[
                    styles.colHeaderCell,
                    { width: col.width },
                    centerAlignStyle(),
                    isSep ? { borderLeftWidth: 1, borderLeftColor: '#000000' } : {},
                  ]}
                >
                  {col.header.map((line, li) => (
                    <Text key={li} style={styles.colHeaderText}>{line}</Text>
                  ))}
                </View>
              )
            })}
          </View>

          {/* Data rows */}
          {pageEntries.map((entry: any, idx: number) => (
            <View key={entry.id || idx} style={styles.dataRow}>
              {columns.map((col, ci) => {
                const prevWidth = columns.slice(0, ci).reduce((s, c) => s + c.width, 0)
                const isSep = GROUP_SEPARATORS.includes(prevWidth)
                return (
                  <View
                    key={col.key}
                    style={[
                      styles.dataCell,
                      { width: col.width },
                      cellAlignStyle(col.align),
                      isSep ? { borderLeftWidth: 0.5, borderLeftColor: '#888888' } : {},
                    ]}
                  >
                    <Text style={styles.dataCellText}>
                      {getCellValue(entry, col.key)}
                    </Text>
                  </View>
                )
              })}
            </View>
          ))}

          {/* Totals row on last page */}
          {pageIndex === totalPages - 1 && (
            <>
              <View style={styles.thickLine} />
              <View style={styles.totalsRow}>
                {columns.map((col, ci) => {
                  const prevWidth = columns.slice(0, ci).reduce((s, c) => s + c.width, 0)
                  const isSep = GROUP_SEPARATORS.includes(prevWidth)
                  return (
                    <View
                      key={col.key}
                      style={[
                        styles.totalsCell,
                        { width: col.width },
                        cellAlignStyle(col.align),
                        isSep ? { borderLeftWidth: 0.5, borderLeftColor: '#888888' } : {},
                      ]}
                    >
                      <Text style={styles.totalsCellText}>
                        {totalsData[col.key] || ''}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </>
          )}

          {/* Page number */}
          <View style={styles.pageNumber}>
            <Text>
              Página {pageIndex + 1} de {totalPages}  —  Trabajadores: {totalEmployees}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const bookId = params.id
    if (!bookId) {
      return NextResponse.json({ error: 'ID del libro es requerido' }, { status: 400 })
    }

    const book = await getPayrollBook(bookId, supabase)

    const { data: companyData } = await supabase
      .from('companies')
      .select('name, employer_name, rut, address, city')
      .eq('id', book.company_id)
      .single()

    const company = companyData as any
    const periodLabel = `${MONTHS[book.month - 1]} - ${book.year}`

    const pdfDoc = (
      <PayrollBookPDF
        book={book}
        entries={book.entries}
        company={company}
        periodLabel={periodLabel}
      />
    )

    const pdfInstance = pdf(pdfDoc as any)
    let buffer: Uint8Array | Buffer

    try {
      const blob = await pdfInstance.toBlob()
      if (blob && blob.size > 0) {
        const arrayBuffer = await blob.arrayBuffer()
        buffer = new Uint8Array(arrayBuffer)
      } else {
        buffer = Buffer.from(await pdfInstance.toBuffer() as any)
      }
    } catch {
      buffer = Buffer.from(await pdfInstance.toBuffer() as any)
    }

    if (!buffer || buffer.length === 0) {
      throw new Error('El PDF generado está vacío')
    }

    const finalBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)

    return new NextResponse(finalBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="libro-remuneraciones-${book.year}-${String(book.month).padStart(2, '0')}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar PDF:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar PDF' }, { status: 500 })
  }
}