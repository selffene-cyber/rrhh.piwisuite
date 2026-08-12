import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getPayrollBook } from '@/lib/services/payrollBookGenerator'
import { MONTHS } from '@/lib/utils/date'
import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

export const dynamic = 'force-dynamic'

function formatCurrency(value: number): string {
  if (value === 0 || value === null || value === undefined) return ''
  return '$' + Math.round(value).toLocaleString('es-CL')
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = dateStr.split('T')[0]
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

interface ColumnDef {
  key: string
  header: string
  width: string
  align?: 'left' | 'right' | 'center'
}

const columns: ColumnDef[] = [
  { key: 'employee_rut', header: 'RUT', width: '3.2%', align: 'left' },
  { key: 'employee_name', header: 'Nombre', width: '6.5%', align: 'left' },
  { key: 'employee_hire_date', header: 'F. Ingreso', width: '2.8%', align: 'center' },
  { key: 'base_salary', header: 'Sueldo Base', width: '3.5%', align: 'right' },
  { key: 'monthly_gratification', header: 'Grat. Mensual', width: '3.5%', align: 'right' },
  { key: 'bonuses', header: 'Bonos', width: '2.8%', align: 'right' },
  { key: 'overtime', header: 'Horas Extra', width: '3%', align: 'right' },
  { key: 'vacation_paid', header: 'Vacaciones', width: '3%', align: 'right' },
  { key: 'other_taxable_earnings', header: 'Otros Hab. Imp.', width: '3.5%', align: 'right' },
  { key: 'total_taxable_earnings', header: 'T. Hab. Imp.', width: '3.5%', align: 'right' },
  { key: 'transportation', header: 'Transporte', width: '3%', align: 'right' },
  { key: 'meal_allowance', header: 'Colación', width: '2.8%', align: 'right' },
  { key: 'aguinaldo', header: 'Aguinaldo', width: '2.8%', align: 'right' },
  { key: 'other_non_taxable_earnings', header: 'Otros Hab. No Imp.', width: '3.8%', align: 'right' },
  { key: 'total_non_taxable_earnings', header: 'T. Hab. No Imp.', width: '3.6%', align: 'right' },
  { key: 'afp_deduction', header: 'AFP', width: '2.8%', align: 'right' },
  { key: 'health_deduction', header: 'Salud', width: '2.8%', align: 'right' },
  { key: 'unemployment_insurance_deduction', header: 'Seg. Cesantía', width: '3.3%', align: 'right' },
  { key: 'unique_tax_deduction', header: 'Imp. Único', width: '3.1%', align: 'right' },
  { key: 'total_legal_deductions', header: 'T. Desc. Legales', width: '3.6%', align: 'right' },
  { key: 'loans_deduction', header: 'Prestamos', width: '3%', align: 'right' },
  { key: 'advances_deduction', header: 'Anticipos', width: '2.9%', align: 'right' },
  { key: 'other_deductions', header: 'Otros Desc.', width: '3%', align: 'right' },
  { key: 'total_other_deductions', header: 'T. Otros Desc.', width: '3.4%', align: 'right' },
  { key: 'employer_afp_contribution', header: 'Aporte AFP Emp.', width: '3.6%', align: 'right' },
  { key: 'employer_sis_contribution', header: 'Aporte SIS Emp.', width: '3.6%', align: 'right' },
  { key: 'employer_afc_contribution', header: 'Aporte AFC Emp.', width: '3.6%', align: 'right' },
  { key: 'total_employer_contributions', header: 'T. Aportes Emp.', width: '3.6%', align: 'right' },
  { key: 'net_pay', header: 'Líquido', width: '3.6%', align: 'right' },
]

const styles = StyleSheet.create({
  page: {
    padding: 20,
    paddingBottom: 35,
    fontSize: 5.5,
    fontFamily: 'Helvetica',
  },
  headerContainer: {
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
  },
  subtitle: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  companyInfo: {
    fontSize: 6.5,
    color: '#555',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  separator: {
    height: 1,
    backgroundColor: '#1e3a5f',
    marginVertical: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 4.8,
    paddingHorizontal: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 1.5,
    paddingHorizontal: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
  },
  tableRowEven: {
    backgroundColor: '#f0f4f8',
  },
  tableCell: {
    fontSize: 5,
    paddingHorizontal: 1,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: '#d4e6f1',
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  totalsCell: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 1,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 7,
    color: '#666',
  },
})

function getCellValue(entry: any, key: string): string {
  const val = entry[key]
  if (val === null || val === undefined) return ''
  if (key === 'employee_rut') return String(val)
  if (key === 'employee_name') return String(val)
  if (key === 'employee_hire_date') return formatDateShort(val)
  if (typeof val === 'number') return formatCurrency(val)
  return String(val)
}

function getColAlign(col: ColumnDef): any {
  if (col.align === 'right') return 'flex-end'
  if (col.align === 'center') return 'center'
  return 'flex-start'
}

const PayrollBookPDF = ({ book, entries, company, periodLabel }: any) => {
  const companyParts: string[] = []
  if (company?.name) companyParts.push(company.name)
  if (company?.rut) companyParts.push(`RUT: ${company.rut}`)
  if (company?.activity) companyParts.push(`Giro: ${company.activity}`)
  const companyLine = companyParts.join('  |  ')

  const addrParts: string[] = []
  if (company?.address) addrParts.push(company.address)
  if (company?.city) addrParts.push(company.city)
  const addressLine = addrParts.join(', ')

  const ROWS_PER_PAGE = 28

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
    vacation_paid: '',
    other_taxable_earnings: '',
    total_taxable_earnings: formatCurrency(book.total_taxable_earnings || 0),
    transportation: '',
    meal_allowance: '',
    aguinaldo: '',
    other_non_taxable_earnings: '',
    total_non_taxable_earnings: formatCurrency(book.total_non_taxable_earnings || 0),
    afp_deduction: '',
    health_deduction: '',
    unemployment_insurance_deduction: '',
    unique_tax_deduction: '',
    total_legal_deductions: formatCurrency(book.total_legal_deductions || 0),
    loans_deduction: '',
    advances_deduction: '',
    other_deductions: '',
    total_other_deductions: formatCurrency(book.total_other_deductions || 0),
    employer_afp_contribution: '',
    employer_sis_contribution: '',
    employer_afc_contribution: '',
    total_employer_contributions: formatCurrency(book.total_employer_contributions || 0),
    net_pay: formatCurrency(book.total_net_pay || 0),
  }

  const lastPage = pages.length
  const totalEmployees = entries.length

  return (
    <Document>
      {pages.map((pageEntries, pageIndex) => (
        <Page
          key={pageIndex}
          size="LETTER"
          orientation="landscape"
          style={styles.page}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>LIBRO REMUNERACIONES</Text>
                <Text style={styles.subtitle}>{periodLabel}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.companyInfo}>{companyLine}</Text>
                {addressLine && <Text style={styles.companyInfo}>{addressLine}</Text>}
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Column Headers */}
          <View style={styles.tableHeader}>
            {columns.map((col) => (
              <View
                key={col.key}
                style={{
                  width: col.width,
                  justifyContent: getColAlign(col) as any,
                }}
              >
                <Text style={styles.tableHeaderCell}>{col.header}</Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {pageEntries.map((entry: any, idx: number) => (
            <View
              key={entry.id || idx}
              style={[
                styles.tableRow,
                idx % 2 === 0 ? styles.tableRowEven : {},
              ]}
            >
              {columns.map((col) => (
                <View
                  key={col.key}
                  style={{
                    width: col.width,
                    justifyContent: getColAlign(col) as any,
                  }}
                >
                  <Text style={styles.tableCell}>
                    {getCellValue(entry, col.key)}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* Totals row on last page */}
          {pageIndex === lastPage - 1 && (
            <View style={styles.totalsRow}>
              {columns.map((col) => (
                <View
                  key={col.key}
                  style={{
                    width: col.width,
                    justifyContent: getColAlign(col) as any,
                  }}
                >
                  <Text style={styles.totalsCell}>
                    {totalsData[col.key] || ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Page number */}
          <View style={styles.pageNumber}>
            <Text>
              Página {pageIndex + 1} de {lastPage}  |  Trabajadores: {totalEmployees}
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
      .select('name, rut, address, city, activity, legal_representative')
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