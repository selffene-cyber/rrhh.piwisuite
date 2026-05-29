import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
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
    justifyContent: 'center',
    marginTop: 50,
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    textAlign: 'center',
  },
})

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
  
  // Calcular total de otros descuentos dinámicamente (excluyendo préstamos y anticipos que se calculan por separado)
  const otherDeductionsFromItems = otherDeductions
    .filter((item: any) => item.category !== 'prestamo' && item.category !== 'anticipo' && item.category !== 'otros_prestamos')
    .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  
  // Préstamos con cuotas (desde loan_payments)
  // IMPORTANTE: Usar installment_amount del préstamo original (monto esperado autorizado)
  // en lugar de lp.amount que puede estar limitado por el 15%
  const loansTotal = (loanPayments || []).reduce((sum: number, lp: any) => {
    const loan = lp.loans
    const expectedAmount = loan?.installment_amount || lp.amount || 0
    return sum + Number(expectedAmount)
  }, 0)
  
  // Préstamos manuales (desde payroll_items con category 'otros_prestamos')
  const otherLoansItems = otherDeductions.filter((item: any) => {
    const category = String(item.category || '').trim().toLowerCase()
    return category === 'otros_prestamos'
  })
  const otherLoansTotal = otherLoansItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  
  // Préstamos con cuotas desde payroll_items (por compatibilidad)
  // Solo se usan si NO hay loan_payments (para evitar doble conteo)
  const loansFromItems = (loanPayments || []).length === 0
    ? otherDeductions
        .filter((item: any) => item.category === 'prestamo')
        .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
    : 0
  
  const advancesTotal = (advances || []).reduce((sum: number, adv: any) => sum + Number(adv.amount || 0), 0)
  
  // Total de préstamos (con cuotas + manuales)
  const totalLoans = loansTotal + loansFromItems + otherLoansTotal
  
  const calculatedTotalOtherDeductions = otherDeductionsFromItems + totalLoans + advancesTotal
  
  // Calcular líquido a pagar dinámicamente (Total Haberes - Total Descuentos)
  const calculatedNetPay = Math.max(0, Number(slip.total_earnings || 0) - Number(slip.total_legal_deductions || 0) - calculatedTotalOtherDeductions)

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
                    <Text style={styles.labelTwoCol}>PERÍODO:</Text>
                    <Text style={styles.valueTwoCol}>
                      {slip.payroll_periods 
                        ? `${MONTHS[slip.payroll_periods.month - 1]} ${slip.payroll_periods.year}`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>FECHA EMISIÓN:</Text>
                    <Text style={styles.valueTwoCol}>
                      {slip.issued_at ? formatDate(slip.issued_at) : formatDate(new Date().toISOString())}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.labelTwoCol}>ESTADO:</Text>
                    <Text style={styles.valueTwoCol}>
                      {slip.status === 'draft' ? 'BORRADOR' : 
                       slip.status === 'issued' ? 'EMITIDA' : 
                       slip.status === 'sent' ? 'ENVIADA' : 
                       slip.status || ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tabla de haberes y descuentos en tres columnas */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row' }}>
                {/* Columna 1: HABERES */}
                <View style={{ width: '32%', marginRight: 4 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8, fontSize: 10, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 3 }}>
                    HABERES
                  </Text>
                  
                  <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 8, fontSize: 8 }}>HABERES IMPONIBLES</Text>
                  {taxableItems.length > 0 ? (
                    taxableItems.map((item: any) => {
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
                    })
                  ) : (
                    <>
                      <View style={[styles.row, { marginBottom: 2 }]}>
                        <Text style={{ width: '55%', fontSize: 7 }}>SUELDO BASE:</Text>
                        <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.base_salary || 0)}</Text>
                      </View>
                      <View style={[styles.row, { marginBottom: 2 }]}>
                        <Text style={{ width: '55%', fontSize: 7 }}>GRATIFICACION:</Text>
                        <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(slip.total_taxable_earnings * 0.25 || 0)}</Text>
                      </View>
                    </>
                  )}
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
                <View style={{ width: '32%', marginRight: 4 }}>
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
                  {/* Mostrar préstamos manuales (Otros Préstamos) */}
                  {otherLoansItems && otherLoansItems.length > 0 && (
                    <View style={{ marginBottom: 4 }}>
                      <View style={[styles.row, { marginBottom: 2 }]}>
                        <Text style={{ width: '55%', fontSize: 7 }}>OTROS PRESTAMOS:</Text>
                        <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(otherLoansTotal)}</Text>
                      </View>
                      {otherLoansItems.map((item: any, idx: number) => (
                        <View key={item.id || idx} style={[styles.row, { marginBottom: 1, marginLeft: 8 }]}>
                          <Text style={{ width: '55%', fontSize: 6 }}>
                            {item.description || 'Otros Préstamos'}
                          </Text>
                          <Text style={{ width: '45%', textAlign: 'right', fontSize: 6 }}>{formatCurrency(item.amount || 0)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Mostrar préstamos con cuotas una sola vez si existen */}
                  {(loanPayments && loanPayments.length > 0) || loansFromItems > 0 ? (
                    <View style={{ marginBottom: 4 }}>
                      <View style={[styles.row, { marginBottom: 2 }]}>
                        <Text style={{ width: '55%', fontSize: 7 }}>PRESTAMO:</Text>
                        <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                          {formatCurrency(loansTotal + loansFromItems)}
                        </Text>
                      </View>
                      {loanPayments && loanPayments.map((lp: any, idx: number) => {
                        const loan = lp.loans
                        // Usar installment_amount del préstamo (monto esperado autorizado) en lugar de amount limitado
                        const expectedAmount = loan?.installment_amount || lp.amount || 0
                        return (
                          <View key={lp.id || idx} style={[styles.row, { marginBottom: 1, marginLeft: 8 }]}>
                            <Text style={{ width: '55%', fontSize: 6 }}>
                              {loan?.loan_number || 'PT-XX'} - Cuota {lp.installment_number}/{loan?.installments || 0}
                            </Text>
                            <Text style={{ width: '45%', textAlign: 'right', fontSize: 6 }}>{formatCurrency(expectedAmount)}</Text>
                          </View>
                        )
                      })}
                    </View>
                  ) : null}
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
                          <Text style={{ width: '45%', textAlign: 'right', fontSize: 6 }}>{formatCurrency(adv.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Mostrar otros descuentos que no sean préstamos ni anticipos */}
                  {otherDeductions
                    .filter((item: any) => item.category !== 'prestamo' && item.category !== 'anticipo' && item.category !== 'otros_prestamos')
                    .map((item: any) => (
                      <View key={item.id} style={[styles.row, { marginBottom: 2 }]}>
                        <Text style={{ width: '55%', fontSize: 7 }}>{item.description.toUpperCase()}:</Text>
                        <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>{formatCurrency(item.amount)}</Text>
                      </View>
                    ))}
                  {otherDeductions.length === 0 && otherLoansTotal === 0 && (!loanPayments || loanPayments.length === 0) && loansFromItems === 0 && (!advances || advances.length === 0) && (
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
                    <Text style={{ width: '45%', textAlign: 'right', fontSize: 7 }}>
                      {formatCurrency(calculatedNetPay)}
                    </Text>
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
                        (legalDeductions.find((d: any) => d.category === 'salud')?.amount || 0) - 
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
            </View>

            {/* Resumen - Líquido a Pagar */}
            <View style={{ marginTop: 15, padding: 10, borderWidth: 2, borderColor: '#000' }}>
              <View style={[styles.row, { marginBottom: 3 }]}>
                <Text style={{ width: '50%', fontFamily: 'Helvetica-Bold', fontSize: 9 }}>LIQUIDO A PAGAR REMUNERACION:</Text>
                <Text style={{ width: '50%', textAlign: 'right', fontSize: 9 }}>
                  {formatCurrency(calculatedNetPay)}
                </Text>
              </View>
              <View style={[styles.row, { marginTop: 5, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }]}>
                <Text style={{ width: '50%', fontFamily: 'Helvetica-Bold', fontSize: 10 }}>SALDO LIQUIDO A PAGAR....$:</Text>
                <Text style={{ width: '50%', textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 10 }}>
                  {formatCurrency(calculatedNetPay)}
                </Text>
              </View>
            </View>

            {/* Texto legal */}
            <View style={styles.footer}>
              <Text style={{ marginBottom: 8, fontSize: 9 }}>
                SON: {numberToWords(Math.round(calculatedNetPay))} ********** Pesos.
              </Text>
              <Text style={{ marginBottom: 8, fontSize: 7, lineHeight: 1.3, textAlign: 'justify' }}>
                Esta liquidación de sueldo ha sido generada de conformidad con la legislación laboral vigente. 
                El trabajador tiene derecho a recibir una copia de esta liquidación y a solicitar aclaraciones 
                sobre cualquier concepto que no comprenda.
              </Text>
              <Text style={{ marginBottom: 8, fontSize: 7, lineHeight: 1.3, textAlign: 'justify' }}>
                Los descuentos legales (AFP, Salud, Seguro de Cesantía e Impuesto Único) se calculan según 
                las tasas vigentes al momento de la liquidación. Los descuentos voluntarios (préstamos, anticipos) 
                se descontarán conforme la autorización del trabajador y empleador, considerando lo establecido en el Código del Trabajo.
              </Text>
              {vacations && vacations.length > 0 && (
                <View style={{ marginTop: 10, marginBottom: 10 }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 5 }}>VACACIONES:</Text>
                  {vacations.map((vacation: any, idx: number) => (
                    <Text key={vacation.id || idx} style={{ fontSize: 7, marginBottom: 3 }}>
                      • {formatDate(vacation.start_date)} - {formatDate(vacation.end_date)} ({vacation.days_count || 0} días)
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Firma */}
            <View style={styles.signatureRow}>
              <View style={styles.signatureBox}>
                <Text>FIRMA DEL TRABAJADOR</Text>
              </View>
            </View>
          </Page>
        </Document>
  )
}
