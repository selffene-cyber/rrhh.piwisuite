'use client'

import { useRef } from 'react'
import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer'
import { formatDate, formatMonthYear, MONTHS } from '@/lib/utils/date'
import { formatCurrency, numberToWords } from '@/lib/services/payrollCalculator'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  rowTwoCol: {
    flexDirection: 'row',
    marginBottom: 3,
    justifyContent: 'space-between',
  },
  label: {
    width: '35%',
    fontWeight: 'bold',
    fontSize: 8,
  },
  value: {
    width: '65%',
    fontSize: 8,
  },
  labelTwoCol: {
    width: '48%',
    fontWeight: 'bold',
    fontSize: 8,
  },
  valueTwoCol: {
    width: '48%',
    fontSize: 8,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
  tableCellRight: {
    flex: 1,
    paddingHorizontal: 5,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#000',
    fontWeight: 'bold',
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#000',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#000',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    textAlign: 'center',
  },
})

interface PayrollPDFProps {
  slip: any
  company: any
  vacations?: any[] | null
}

// Componente interno para el Document (necesario para usar pdf())
const PayrollDocument = ({ slip, company, vacations, generateFileName }: any) => {
  const taxableItems = slip.payroll_items?.filter((item: any) => item.type === 'taxable_earning') || []
  const nonTaxableItems = slip.payroll_items?.filter((item: any) => item.type === 'non_taxable_earning') || []
  const legalDeductions = slip.payroll_items?.filter((item: any) => item.type === 'legal_deduction') || []
  const otherDeductions = slip.payroll_items?.filter((item: any) => item.type === 'other_deduction') || []

  return (
    <Document title={generateFileName()}>
          <Page size="A4" style={styles.page}>
            {/* Encabezado */}
            <View style={styles.header}>
              {company && (
                <>
                  <Text>{company.name || ''}</Text>
                  <Text>{company.employer_name || ''}</Text>
                  <Text>{company.rut || ''}</Text>
                  {company.address && <Text>{company.address}</Text>}
                  {company.city && <Text>{company.city}</Text>}
                </>
              )}
              <Text style={styles.title}>LIQUIDACIÓN DE SUELDO</Text>
            </View>

            {/* Datos del trabajador en dos columnas */}
            <View style={styles.section}>
              <View style={styles.rowTwoCol}>
                <View style={{ width: '48%' }}>
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>NOMBRE:</Text>
                    <Text style={styles.valueTwoCol}>{slip.employees?.full_name || ''}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>RUT:</Text>
                    <Text style={styles.valueTwoCol}>{slip.employees?.rut || ''}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>AFP:</Text>
                    <Text style={styles.valueTwoCol}>{slip.employees?.afp || ''}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>ISAPRE:</Text>
                    <Text style={styles.valueTwoCol}>
                      {slip.employees?.health_system === 'ISAPRE' 
                        ? `${slip.employees?.health_system || ''} ${slip.employees?.health_plan || ''}` 
                        : slip.employees?.health_system || ''}
                    </Text>
                  </View>
                </View>
                <View style={{ width: '48%' }}>
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>FECHA INGRESO:</Text>
                    <Text style={styles.valueTwoCol}>
                      {slip.employees?.hire_date ? formatDate(slip.employees.hire_date, 'dd/MM/yyyy') : ''}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>CARGO:</Text>
                    <Text style={styles.valueTwoCol}>{slip.employees?.position || ''}</Text>
                  </View>
                  <View style={styles.row}>
                    <View style={{ width: '48%' }}>
                      <Text style={{ fontSize: 8, fontWeight: 'bold' }}>DIAS</Text>
                      <Text style={{ fontSize: 8, fontWeight: 'bold' }}>TRABAJADOS:</Text>
                    </View>
                    <Text style={{ width: '48%', fontSize: 8 }}>{slip.days_worked}</Text>
                  </View>
                  {vacations && vacations.length > 0 && (() => {
                    const vacationDays = vacations.reduce((sum: number, v: any) => {
                      if (!slip.payroll_periods) return sum
                      const periodStart = new Date(slip.payroll_periods.year, slip.payroll_periods.month - 1, 1)
                      const periodEnd = new Date(slip.payroll_periods.year, slip.payroll_periods.month, 0)
                      const vacStart = new Date(v.start_date)
                      const vacEnd = new Date(v.end_date)
                      const overlapStart = vacStart > periodStart ? vacStart : periodStart
                      const overlapEnd = vacEnd < periodEnd ? vacEnd : periodEnd
                      if (overlapStart <= overlapEnd) {
                        const diffTime = overlapEnd.getTime() - overlapStart.getTime()
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                        return sum + diffDays
                      }
                      return sum
                    }, 0)
                    return (
                      <View style={styles.row}>
                        <View style={{ width: '48%' }}>
                          <Text style={{ fontSize: 8, fontWeight: 'bold' }}>DIAS</Text>
                          <Text style={{ fontSize: 8, fontWeight: 'bold' }}>VACACIONES:</Text>
                        </View>
                        <Text style={{ width: '48%', fontSize: 8 }}>{vacationDays}</Text>
                      </View>
                    )
                  })()}
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>MES:</Text>
                    <Text style={styles.valueTwoCol}>
                      {slip.payroll_periods ? 
                        formatMonthYear(slip.payroll_periods.year, slip.payroll_periods.month) : 
                        ''
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Haberes, Descuentos e Información en tres columnas */}
            <View style={{ flexDirection: 'row', marginTop: 15, gap: 8 }}>
              {/* Columna 1: HABERES */}
              <View style={{ width: '32%' }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 3 }}>
                  HABERES
                </Text>
                
                <Text style={{ fontWeight: 'bold', marginTop: 8, fontSize: 8 }}>HABERES IMPONIBLES</Text>
                {taxableItems.map((item: any) => {
                  const description = item.description.toUpperCase()
                  // Detectar si contiene "DÍAS TRABAJADOS" o "DIAS TRABAJADOS" y dividirlo manualmente
                  const needsSplit = description.includes('DÍAS TRABAJADOS') || description.includes('DIAS TRABAJADOS')
                  
                  if (needsSplit) {
                    // Dividir en "SUELDO BASE DÍAS" y "TRABAJADOS" (con cualquier texto adicional)
                    // Buscar la posición de "TRABAJADOS"
                    const trabajadosIndex = description.indexOf('TRABAJADOS')
                    if (trabajadosIndex > 0) {
                      const firstPart = description.substring(0, trabajadosIndex).trim()
                      const secondPart = description.substring(trabajadosIndex).trim()
                      
                      return (
                        <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                          <View style={{ width: '55%' }}>
                            <Text style={{ fontSize: 7 }}>{firstPart}</Text>
                            <Text style={{ fontSize: 7 }}>{secondPart}:</Text>
                          </View>
                          <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(item.amount)}</Text>
                        </View>
                      )
                    }
                  }
                  
                  return (
                    <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>{description}:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(item.amount)}</Text>
                    </View>
                  )
                })}
                <View style={[styles.row, { marginTop: 3, marginBottom: 5, fontWeight: 'bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7 }}>TOTAL HABERES</Text>
                    <Text style={{ fontSize: 7 }}>IMPONIBLES:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_taxable_earnings)}</Text>
                </View>

                <Text style={{ fontWeight: 'bold', marginTop: 5, fontSize: 8 }}>HABERES NO IMPONIBLES</Text>
                {nonTaxableItems.map((item: any) => (
                  <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                    <Text style={{ width: '55%', fontSize: 7 }}>{item.description.toUpperCase()}:</Text>
                    <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
                {nonTaxableItems.length === 0 && (
                  <>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>ASIGN. DE MOVILIZACION:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>0</Text>
                    </View>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>ASIGN. DE COLACION:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>0</Text>
                    </View>
                  </>
                )}
                <View style={[styles.row, { marginTop: 3, marginBottom: 5, fontWeight: 'bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7 }}>TOTAL HABERES NO</Text>
                    <Text style={{ fontSize: 7 }}>IMPONIBLES:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_non_taxable_earnings)}</Text>
                </View>

                <View style={[styles.row, { marginTop: 5, fontWeight: 'bold', borderTopWidth: 2, borderTopColor: '#000', paddingTop: 5 }]}>
                  <Text style={{ width: '55%', fontSize: 8 }}>TOTAL HABERES:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 8 }}>{formatCurrency(slip.total_earnings)}</Text>
                </View>
              </View>

              {/* Columna 2: DESCUENTOS */}
              <View style={{ width: '32%' }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 3 }}>
                  DESCUENTOS
                </Text>
                
                <Text style={{ fontWeight: 'bold', marginTop: 8, fontSize: 8 }}>DESCUENTOS LEGALES</Text>
                {legalDeductions.length > 0 ? (
                  legalDeductions.map((item: any) => (
                    <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>{item.description.toUpperCase()}:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(item.amount)}</Text>
                    </View>
                  ))
                ) : (
                  <>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>AFP:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_legal_deductions * 0.55)}</Text>
                    </View>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>
                        {slip.employees?.health_system === 'ISAPRE' ? 'ISAPRE:' : 'SALUD:'}
                      </Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_legal_deductions * 0.34)}</Text>
                    </View>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>SEGURO DE CESANTIA:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_legal_deductions * 0.03)}</Text>
                    </View>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>IMPUESTO:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_legal_deductions * 0.08)}</Text>
                    </View>
                  </>
                )}
                <View style={[styles.row, { marginTop: 3, marginBottom: 5, fontWeight: 'bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
                  <Text style={{ width: '55%', fontSize: 7 }}>DESCUENTOS LEGALES:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_legal_deductions)}</Text>
                </View>

                <Text style={{ fontWeight: 'bold', marginTop: 5, fontSize: 8 }}>OTROS DESCUENTOS</Text>
                {otherDeductions.map((item: any) => (
                  <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                    <Text style={{ width: '55%', fontSize: 7 }}>{item.description.toUpperCase()}:</Text>
                    <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
                {otherDeductions.length === 0 && (
                  <>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>PRESTAMO:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>0</Text>
                    </View>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>ANTICIPO:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>0</Text>
                    </View>
                  </>
                )}
                <View style={[styles.row, { marginTop: 3, marginBottom: 5, fontWeight: 'bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7 }}>TOTAL OTROS</Text>
                    <Text style={{ fontSize: 7 }}>DESCUENTOS:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_other_deductions)}</Text>
                </View>

                <View style={[styles.row, { marginTop: 5, fontWeight: 'bold', borderTopWidth: 2, borderTopColor: '#000', paddingTop: 5 }]}>
                  <Text style={{ width: '55%', fontSize: 8 }}>TOTAL DESCUENTOS:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 8 }}>{formatCurrency(slip.total_deductions)}</Text>
                </View>
              </View>

              {/* Columna 3: INFORMACION */}
              <View style={{ width: '32%' }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 3 }}>
                  INFORMACION
                </Text>
                
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>SUELDO BASE</Text>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>PACTADO:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.base_salary)}</Text>
                </View>
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>SUELDO LIQUIDO</Text>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>PACTADO:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.net_pay)}</Text>
                </View>
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>DIAS</Text>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>TRABAJADOS:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{slip.days_worked}</Text>
                </View>
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <Text style={{ width: '55%', fontSize: 7, fontWeight: 'bold' }}>BASE IMPONIBLE:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.taxable_base)}</Text>
                </View>
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <Text style={{ width: '55%', fontSize: 7, fontWeight: 'bold' }}>BASE TRIBUTABLE:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                    {formatCurrency(Math.max(0, slip.taxable_base - 
                      (legalDeductions.find((d: any) => d.category === 'afp_10')?.amount || 0) - 
                      (legalDeductions.find((d: any) => d.category === 'afp_adicional')?.amount || 0) - 
                      (legalDeductions.find((d: any) => d.category === 'cesantia')?.amount || 0)))}
                  </Text>
                </View>
                {slip.employees?.health_system === 'ISAPRE' && (
                  <View style={[styles.row, { marginBottom: 3 }]}>
                    <Text style={{ width: '55%', fontSize: 7, fontWeight: 'bold' }}>
                      {slip.employees?.health_plan_percentage 
                        ? `${7 + (slip.employees.health_plan_percentage || 0)}% ISAPRE:` 
                        : '7% ISAPRE:'}
                    </Text>
                    <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                      {formatCurrency(legalDeductions.find((d: any) => d.category === 'salud')?.amount || slip.total_legal_deductions * 0.34)}
                    </Text>
                  </View>
                )}
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <Text style={{ width: '55%', fontSize: 7, fontWeight: 'bold' }}>SEGURO DE CESANTIA EMPRESA:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                    {formatCurrency((slip.taxable_base * 0.024) || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Resumen - Líquido a Pagar */}
            <View style={{ marginTop: 15, padding: 10, borderWidth: 2, borderColor: '#000' }}>
              <View style={[styles.row, { marginBottom: 3 }]}>
                <Text style={{ width: '50%', fontWeight: 'bold', fontSize: 9 }}>PRE LIQUIDO A PAGO:</Text>
                <Text style={{ width: '50%', textAlign: 'right', fontSize: 9 }}>{formatCurrency(slip.net_pay)}</Text>
              </View>
              <View style={[styles.row, { marginBottom: 3 }]}>
                <Text style={{ width: '50%', fontWeight: 'bold', fontSize: 9 }}>LIQUIDO A PAGAR REMUNERACION:</Text>
                <Text style={{ width: '50%', textAlign: 'right', fontSize: 9 }}>{formatCurrency(slip.net_pay)}</Text>
              </View>
              <View style={[styles.row, { marginTop: 5, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }]}>
                <Text style={{ width: '50%', fontWeight: 'bold', fontSize: 10 }}>SALDO LIQUIDO A PAGAR....$:</Text>
                <Text style={{ width: '50%', textAlign: 'right', fontWeight: 'bold', fontSize: 10 }}>{formatCurrency(slip.net_pay)}</Text>
              </View>
            </View>

            {/* Texto legal */}
            <View style={styles.footer}>
              <Text style={{ marginBottom: 8, fontSize: 9 }}>
                SON: {numberToWords(Math.round(slip.net_pay))} ********** Pesos.
              </Text>
              <Text style={{ marginBottom: 8, fontSize: 7, lineHeight: 1.3 }}>
                Certifico que recibo de: <Text style={{ textTransform: 'uppercase' }}>{company?.employer_name || ''}</Text>
              </Text>
              <Text style={{ marginBottom: 8, fontSize: 7, lineHeight: 1.3 }}>
                A mi entera satisfacción la suma antes indicada y no tengo cargo ni cobro alguno
              </Text>
              <Text style={{ fontSize: 7, lineHeight: 1.3 }}>
                posterior que hacer, por ninguno de los conceptos comprendidos en esta liquidación.
              </Text>
            </View>

            {/* Firmas */}
            <View style={styles.signatureRow}>
              <View style={styles.signatureBox}>
                <Text>Vo Bo REMUNERACIONES</Text>
              </View>
              <View style={styles.signatureBox}>
                <Text>FIRMA DEL TRABAJADOR</Text>
              </View>
            </View>
          </Page>
        </Document>
  )
}

export default function PayrollPDF({ slip, company, vacations }: PayrollPDFProps) {
  // Generar nombre del archivo: LIQUIDACIÓN-{RUT}-{MES}-{AÑO}
  const generateFileName = () => {
    const rut = slip.employees?.rut || 'SIN-RUT'
    const month = slip.payroll_periods?.month || new Date().getMonth() + 1
    const year = slip.payroll_periods?.year || new Date().getFullYear()
    const monthAbbr = MONTHS[month - 1]?.substring(0, 3) || 'XXX'
    return `LIQUIDACIÓN-${rut}-${monthAbbr}-${year}`
  }

  const handleDownload = async () => {
    try {
      const fileName = generateFileName()
      const blob = await pdf(
        <PayrollDocument 
          slip={slip} 
          company={company} 
          vacations={vacations} 
          generateFileName={generateFileName}
        />
      ).toBlob()
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      alert('Error al descargar el PDF')
    }
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 1000,
        padding: '8px 16px',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}>
        <button 
          onClick={handleDownload}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Descargar PDF
        </button>
      </div>
      <PDFViewer width="100%" height="100%">
        <PayrollDocument 
          slip={slip} 
          company={company} 
          vacations={vacations} 
          generateFileName={generateFileName}
        />
      </PDFViewer>
    </div>
  )
}

