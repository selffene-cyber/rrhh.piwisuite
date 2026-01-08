'use client'

import { useRef } from 'react'
import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer'
import { formatDate, formatMonthYear, MONTHS } from '@/lib/utils/date'
import { formatCurrency, numberToWords } from '@/lib/services/payrollCalculator'
import { formatRut } from '@/lib/utils/rutHelper'

// Función para dividir texto largo sin cortar palabras
const splitLongText = (text: string, maxLength: number = 20): string[] => {
  if (text.length <= maxLength) {
    return [text]
  }
  
  // Buscar patrones comunes antes de palabras largas (ej: "BONO DE RESPONSABILIDAD")
  const commonPrepositions = [' DE ', ' POR ', ' Y ', ' O ', ' EN ', ' CON ', ' SIN ', ' DEL ', ' DE LA ', ' DE LOS ']
  let bestSplitIndex = -1
  
  // Buscar la mejor posición de división considerando preposiciones
  for (const prep of commonPrepositions) {
    const index = text.lastIndexOf(prep, maxLength)
    if (index > 0 && index < maxLength) {
      // Dividir después de la preposición (incluyendo el espacio final)
      const candidateIndex = index + prep.length
      if (candidateIndex <= maxLength + 5) { // Permitir un poco de flexibilidad
        bestSplitIndex = candidateIndex
        break
      }
    }
  }
  
  // Si no encontramos una preposición, buscar el último espacio antes del límite
  if (bestSplitIndex === -1) {
    for (let i = maxLength; i >= Math.max(0, maxLength - 15); i--) {
      if (text[i] === ' ' || text[i] === '/' || text[i] === '-' || text[i] === ':') {
        bestSplitIndex = i + 1 // Dividir después del espacio
        break
      }
    }
  }
  
  // Si aún no encontramos, usar el último espacio en todo el texto antes del límite
  if (bestSplitIndex === -1) {
    const lastSpace = text.lastIndexOf(' ', maxLength)
    if (lastSpace > 0) {
      bestSplitIndex = lastSpace + 1
    } else {
      // Último recurso: dividir en el límite (cortará la palabra)
      bestSplitIndex = maxLength
    }
  }
  
  const firstPart = text.substring(0, bestSplitIndex).trim()
  const secondPart = text.substring(bestSplitIndex).trim()
  
  return [firstPart, secondPart]
}

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
    fontFamily: 'Helvetica-Bold',
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
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  value: {
    width: '65%',
    fontSize: 8,
  },
  labelTwoCol: {
    width: '48%',
    fontFamily: 'Helvetica-Bold',
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
    fontFamily: 'Helvetica-Bold',
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
    fontFamily: 'Helvetica-Bold',
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
  loanPayments?: any[]
  advances?: any[]
}

// Componente interno para el Document (necesario para usar pdf())
export const PayrollDocument = ({ slip, company, vacations, loanPayments, advances, generateFileName }: any) => {
  const taxableItems = slip.payroll_items?.filter((item: any) => item.type === 'taxable_earning') || []
  const nonTaxableItems = slip.payroll_items?.filter((item: any) => item.type === 'non_taxable_earning') || []
  const allLegalDeductions = slip.payroll_items?.filter((item: any) => item.type === 'legal_deduction') || []
  
  // Combinar AFP 10% y AFP adicional en un solo concepto
  const afp10Item = allLegalDeductions.find((item: any) => item.category === 'afp_10')
  const afpAdditionalItem = allLegalDeductions.find((item: any) => item.category === 'afp_adicional')
  const afpTotal = (afp10Item?.amount || 0) + (afpAdditionalItem?.amount || 0)
  
  // Filtrar descuentos legales excluyendo los dos conceptos de AFP separados
  const legalDeductions = allLegalDeductions.filter((item: any) => 
    item.category !== 'afp_10' && item.category !== 'afp_adicional'
  )
  
  // Si hay AFP, agregar un solo concepto unificado
  if (afpTotal > 0) {
    legalDeductions.unshift({
      id: 'afp_unified',
      category: 'afp',
      description: 'FONDO DE PENSIONES AFP',
      amount: afpTotal,
      type: 'legal_deduction'
    })
  }
  
  const otherDeductions = slip.payroll_items?.filter((item: any) => item.type === 'other_deduction') || []
  
  // Calcular total de otros descuentos dinámicamente
  const otherDeductionsFromItems = otherDeductions
    .filter((item: any) => item.category !== 'prestamo' && item.category !== 'anticipo')
    .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  
  const loansTotal = (loanPayments || []).reduce((sum: number, lp: any) => sum + Number(lp.amount || 0), 0)
  const advancesTotal = (advances || []).reduce((sum: number, adv: any) => sum + Number(adv.amount || 0), 0)
  
  const calculatedTotalOtherDeductions = otherDeductionsFromItems + loansTotal + advancesTotal

  return (
    <Document title={generateFileName()}>
          <Page size="A4" style={styles.page}>
            {/* Encabezado */}
            <View style={styles.header}>
              {company && (
                <>
                  <Text>{company.name || ''}</Text>
                  <Text>{company.employer_name || ''}</Text>
                  <Text>{company.rut ? formatRut(company.rut) : ''}</Text>
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
                    <Text style={styles.valueTwoCol}>{slip.employees?.rut ? formatRut(slip.employees.rut) : ''}</Text>
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
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>DIAS</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>TRABAJADOS:</Text>
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
                          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>DIAS</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>VACACIONES:</Text>
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
                <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8, fontSize: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 3 }}>
                  HABERES
                </Text>
                
                <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 8, fontSize: 8 }}>HABERES IMPONIBLES</Text>
                {taxableItems.map((item: any) => {
                  const description = item.description.toUpperCase()
                  // Detectar si contiene "DÍAS TRABAJADOS" o "DIAS TRABAJADOS" y dividirlo manualmente
                  const needsSplitDias = description.includes('DÍAS TRABAJADOS') || description.includes('DIAS TRABAJADOS')
                  
                  // Detectar si contiene "HORAS EXTRAS" y dividirlo manualmente
                  const needsSplitHoras = description.includes('HORAS EXTRAS')
                  
                  if (needsSplitDias) {
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
                  
                  if (needsSplitHoras) {
                    // Dividir en "HORAS EXTRAS" y el número de horas entre paréntesis
                    // Buscar la posición del paréntesis de apertura
                    const parenIndex = description.indexOf('(')
                    if (parenIndex > 0) {
                      const firstPart = description.substring(0, parenIndex).trim() // "HORAS EXTRAS"
                      const secondPart = description.substring(parenIndex).trim() // "(4 HORAS)"
                      
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
                  
                  // Para descripciones largas, dividir inteligentemente sin cortar palabras
                  const maxLength = 20 // Aproximadamente el ancho disponible en la columna
                  if (description.length > maxLength) {
                    const parts = splitLongText(description, maxLength)
                    if (parts.length === 2) {
                      return (
                        <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                          <View style={{ width: '55%' }}>
                            <Text style={{ fontSize: 7 }}>{parts[0]}</Text>
                            <Text style={{ fontSize: 7 }}>{parts[1]}:</Text>
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
                <View style={[styles.row, { marginTop: 3, marginBottom: 5, fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7 }}>TOTAL HABERES</Text>
                    <Text style={{ fontSize: 7 }}>IMPONIBLES:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_taxable_earnings)}</Text>
                </View>

                <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 5, fontSize: 8 }}>HABERES NO IMPONIBLES</Text>
                {nonTaxableItems.map((item: any) => {
                  const description = item.description.toUpperCase()
                  // Para descripciones largas, dividir inteligentemente sin cortar palabras
                  const maxLength = 20 // Aproximadamente el ancho disponible en la columna
                  if (description.length > maxLength) {
                    const parts = splitLongText(description, maxLength)
                    if (parts.length === 2) {
                      return (
                        <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                          <View style={{ width: '55%' }}>
                            <Text style={{ fontSize: 7 }}>{parts[0]}</Text>
                            <Text style={{ fontSize: 7 }}>{parts[1]}:</Text>
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
                <View style={[styles.row, { marginTop: 3, marginBottom: 5, fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7 }}>TOTAL HABERES NO</Text>
                    <Text style={{ fontSize: 7 }}>IMPONIBLES:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_non_taxable_earnings)}</Text>
                </View>

                <View style={[styles.row, { marginTop: 5, fontFamily: 'Helvetica-Bold', borderTopWidth: 2, borderTopColor: '#000', paddingTop: 5 }]}>
                  <Text style={{ width: '55%', fontSize: 8 }}>TOTAL HABERES:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 8 }}>{formatCurrency(slip.total_earnings)}</Text>
                </View>
              </View>

              {/* Columna 2: DESCUENTOS */}
              <View style={{ width: '32%' }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8, fontSize: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 3 }}>
                  DESCUENTOS
                </Text>
                
                <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 8, fontSize: 8 }}>DESCUENTOS LEGALES</Text>
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
                <View style={[styles.row, { marginTop: 3, marginBottom: 5, fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
                  <Text style={{ width: '55%', fontSize: 7 }}>DESCUENTOS LEGALES:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_legal_deductions)}</Text>
                </View>

                <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 5, fontSize: 8 }}>OTROS DESCUENTOS</Text>
                {/* Mostrar préstamos una sola vez si existen */}
                {loanPayments && loanPayments.length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>PRESTAMO:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                        {formatCurrency(loanPayments.reduce((sum: number, lp: any) => sum + Number(lp.amount || 0), 0))}
                      </Text>
                    </View>
                    {loanPayments.map((lp: any, idx: number) => {
                      const loan = lp.loans
                      return (
                        <View key={lp.id || idx} style={[styles.row, { marginBottom: 1, marginLeft: 8 }]}>
                          <Text style={{ width: '55%', fontSize: 6 }}>
                            {loan?.loan_number || 'PT-XX'} - Cuota {lp.installment_number}/{loan?.installments || 0}
                          </Text>
                          <Text style={{ width: '45%', textAlign: 'right', fontSize: 6 }}>{formatCurrency(lp.amount || 0)}</Text>
                        </View>
                      )
                    })}
                  </View>
                )}
                {/* Mostrar anticipos una sola vez si existen */}
                {advances && advances.length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>ANTICIPO:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                        {formatCurrency(advances.reduce((sum: number, adv: any) => sum + Number(adv.amount || 0), 0))}
                      </Text>
                    </View>
                    {advances.map((adv: any, idx: number) => (
                      <View key={adv.id || idx} style={[styles.row, { marginBottom: 1, marginLeft: 8 }]}>
                        <Text style={{ width: '55%', fontSize: 6 }}>
                          {adv.advance_number || `ANT-${adv.id.substring(0, 8).toUpperCase()}`} - {formatDate(adv.advance_date)}
                        </Text>
                        <Text style={{ width: '45%', textAlign: 'right', fontSize: 6 }}>{formatCurrency(adv.amount || 0)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Mostrar otros descuentos que no sean préstamos ni anticipos */}
                {otherDeductions
                  .filter((item: any) => item.category !== 'prestamo' && item.category !== 'anticipo')
                  .map((item: any) => (
                    <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                      <Text style={{ width: '55%', fontSize: 7 }}>{item.description.toUpperCase()}:</Text>
                      <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(item.amount)}</Text>
                    </View>
                  ))}
                {otherDeductions.length === 0 && (!loanPayments || loanPayments.length === 0) && (!advances || advances.length === 0) && (
                  <View style={[styles.row, { marginBottom: 2 }]}>
                    <Text style={{ width: '55%', fontSize: 7 }}>No hay otros descuentos</Text>
                    <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>0</Text>
                  </View>
                )}
                <View style={[styles.row, { marginTop: 3, marginBottom: 5, fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7 }}>TOTAL OTROS</Text>
                    <Text style={{ fontSize: 7 }}>DESCUENTOS:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(calculatedTotalOtherDeductions)}</Text>
                </View>

                <View style={[styles.row, { marginTop: 5, fontFamily: 'Helvetica-Bold', borderTopWidth: 2, borderTopColor: '#000', paddingTop: 5 }]}>
                  <Text style={{ width: '55%', fontSize: 8 }}>TOTAL DESCUENTOS:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 8 }}>{formatCurrency(Number(slip.total_legal_deductions || 0) + calculatedTotalOtherDeductions)}</Text>
                </View>
              </View>

              {/* Columna 3: INFORMACION */}
              <View style={{ width: '32%' }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8, fontSize: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 3 }}>
                  INFORMACION
                </Text>
                
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>SUELDO BASE</Text>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>PACTADO:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.base_salary)}</Text>
                </View>
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>SUELDO LIQUIDO</Text>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>PACTADO:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.net_pay)}</Text>
                </View>
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <View style={{ width: '55%' }}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>DIAS</Text>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>TRABAJADOS:</Text>
                  </View>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{slip.days_worked}</Text>
                </View>
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <Text style={{ width: '55%', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>BASE IMPONIBLE:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.taxable_base)}</Text>
                </View>
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <Text style={{ width: '55%', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>BASE TRIBUTABLE:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                    {formatCurrency(Math.max(0, slip.taxable_base - 
                      (legalDeductions.find((d: any) => d.category === 'afp')?.amount || 0) - 
                      (legalDeductions.find((d: any) => d.category === 'cesantia')?.amount || 0)))}
                  </Text>
                </View>
                {slip.employees?.health_system === 'ISAPRE' && (
                  <View style={[styles.row, { marginBottom: 3 }]}>
                    <Text style={{ width: '55%', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>
                      {slip.employees?.health_plan_percentage 
                        ? `${slip.employees.health_plan_percentage || 0} UF ISAPRE:` 
                        : 'ISAPRE:'}
                    </Text>
                    <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                      {formatCurrency(legalDeductions.find((d: any) => d.category === 'salud')?.amount || slip.total_legal_deductions * 0.34)}
                    </Text>
                  </View>
                )}
                <View style={[styles.row, { marginBottom: 3 }]}>
                  <Text style={{ width: '55%', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>SEGURO DE CESANTIA EMPRESA:</Text>
                  <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                    {formatCurrency((slip.taxable_base * 0.024) || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Resumen - Líquido a Pagar */}
            <View style={{ marginTop: 15, padding: 10, borderWidth: 2, borderColor: '#000' }}>
              <View style={[styles.row, { marginBottom: 3 }]}>
                <Text style={{ width: '50%', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>PRE LIQUIDO A PAGO:</Text>
                <Text style={{ width: '50%', textAlign: 'right', fontSize: 9 }}>{formatCurrency(slip.net_pay)}</Text>
              </View>
              <View style={[styles.row, { marginBottom: 3 }]}>
                <Text style={{ width: '50%', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>LIQUIDO A PAGAR REMUNERACION:</Text>
                <Text style={{ width: '50%', textAlign: 'right', fontSize: 9 }}>{formatCurrency(slip.net_pay)}</Text>
              </View>
              <View style={[styles.row, { marginTop: 5, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }]}>
                <Text style={{ width: '50%', fontFamily: 'Helvetica-Bold', fontSize: 10 }}>SALDO LIQUIDO A PAGAR....$:</Text>
                <Text style={{ width: '50%', textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 10 }}>{formatCurrency(slip.net_pay)}</Text>
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

export default function PayrollPDF({ slip, company, vacations, loanPayments = [], advances = [] }: PayrollPDFProps) {
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
          loanPayments={loanPayments}
          advances={advances}
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
      <button 
        onClick={handleDownload}
        style={{
          position: 'absolute',
          top: '-30px',
          right: '16px',
          zIndex: 1000,
          padding: '8px 12px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '500',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1d4ed8'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#2563eb'
        }}
      >
        Descargar PDF
      </button>
      <PDFViewer width="100%" height="100%">
        <PayrollDocument 
          slip={slip} 
          company={company} 
          vacations={vacations} 
          loanPayments={loanPayments}
          advances={advances}
          generateFileName={generateFileName}
        />
      </PDFViewer>
    </div>
  )
}

