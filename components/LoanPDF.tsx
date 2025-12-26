'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils/date'
import { formatCurrency, numberToWords } from '@/lib/services/payrollCalculator'
import { MONTHS } from '@/lib/utils/date'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 5,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '40%',
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    width: '60%',
  },
  table: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontFamily: 'Helvetica-Bold',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 9,
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

interface LoanPDFProps {
  loan: any
  employee: any
  company: any
}

export default function LoanPDF({ loan, employee, company }: LoanPDFProps) {
  // Generar nombre del archivo: PREST.INT-{RUT}-{MES}-{AÑO}
  const generateFileName = () => {
    const rut = employee?.rut || 'SIN-RUT'
    // Usar la fecha del préstamo o la fecha actual
    const loanDate = loan?.loan_date ? new Date(loan.loan_date) : new Date()
    const month = loanDate.getMonth() + 1
    const year = loanDate.getFullYear()
    const monthAbbr = MONTHS[month - 1]?.substring(0, 3) || 'XXX'
    return `PREST.INT-${rut}-${monthAbbr}-${year}`
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <Document title={generateFileName()}>
          <Page size="A4" style={styles.page}>
            {/* Paginador - esquina superior derecha */}
            <View
              style={{
                position: 'absolute',
                top: 20,
                right: 40,
                fontSize: 9,
                color: '#666',
                alignItems: 'flex-end',
              }}
              fixed
            >
              <Text
                style={{
                  fontSize: 9,
                  color: '#666',
                }}
                render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
              />
              {loan.loan_number && (
                <Text
                  style={{
                    fontSize: 9,
                    color: '#666',
                    marginTop: 2,
                  }}
                >
                  {loan.loan_number}
                </Text>
              )}
            </View>

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
              <Text style={styles.title}>CONTRATO DE PRÉSTAMO INTERNO</Text>
            </View>

            {/* Datos del trabajador */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {/* Columna izquierda */}
                <View style={{ width: '48%' }}>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>NOMBRE:</Text>
                    <Text style={[styles.value, { fontSize: 8 }]}>{employee?.full_name || ''}</Text>
                  </View>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>RUT:</Text>
                    <Text style={[styles.value, { fontSize: 8 }]}>{employee?.rut || ''}</Text>
                  </View>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>FECHA DE INGRESO:</Text>
                    <Text style={[styles.value, { fontSize: 8 }]}>
                      {employee?.hire_date ? formatDate(employee.hire_date, 'dd/MM/yyyy') : ''}
                    </Text>
                  </View>
                </View>
                {/* Columna derecha */}
                <View style={{ width: '48%' }}>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8, width: '25%' }]}>CARGO:</Text>
                    <Text style={[styles.value, { fontSize: 8, width: '75%' }]}>{employee?.position || ''}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Datos del préstamo */}
            <View style={styles.section}>
              <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8, fontSize: 11 }}>
                TÉRMINOS DEL PRÉSTAMO
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {/* Columna izquierda */}
                <View style={{ width: '48%' }}>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>FECHA DEL PRÉSTAMO:</Text>
                    <Text style={[styles.value, { fontSize: 8 }]}>{formatDate(loan.loan_date, 'dd/MM/yyyy')}</Text>
                  </View>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>MONTO SOLICITADO:</Text>
                    <Text style={[styles.value, { fontSize: 8 }]}>{formatCurrency(loan.amount)}</Text>
                  </View>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>TASA DE INTERÉS:</Text>
                    <Text style={[styles.value, { fontSize: 8 }]}>{loan.interest_rate}%</Text>
                  </View>
                </View>
                {/* Columna derecha */}
                <View style={{ width: '48%' }}>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>MONTO TOTAL A PAGAR:</Text>
                    <Text style={[styles.value, { fontFamily: 'Helvetica-Bold', fontSize: 8 }]}>
                      {formatCurrency(loan.total_amount)}
                    </Text>
                  </View>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>VALOR POR CUOTA:</Text>
                    <Text style={[styles.value, { fontFamily: 'Helvetica-Bold', fontSize: 8 }]}>
                      {formatCurrency(loan.installment_amount)}
                    </Text>
                  </View>
                  <View style={[styles.row, { marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 8 }]}>NÚMERO DE CUOTAS:</Text>
                    <Text style={[styles.value, { fontSize: 8 }]}>{loan.installments}</Text>
                  </View>
                </View>
              </View>
              {loan.description && (
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Text style={[styles.label, { fontSize: 8 }]}>DESCRIPCIÓN:</Text>
                  <Text style={[styles.value, { fontSize: 8 }]}>{loan.description}</Text>
                </View>
              )}
            </View>

            {/* Tabla de cuotas */}
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Cuota</Text>
                <Text style={styles.tableCell}>Período</Text>
                <Text style={styles.tableCell}>Monto</Text>
                <Text style={styles.tableCell}>Estado</Text>
              </View>
              {Array.from({ length: loan.installments }, (_, i) => i + 1).map((installment) => {
                const isPaid = installment <= loan.paid_installments
                // Calcular el período de cada cuota (mes siguiente al préstamo)
                const loanDate = loan.loan_date ? new Date(loan.loan_date) : new Date()
                const installmentDate = new Date(loanDate.getFullYear(), loanDate.getMonth() + installment, 1)
                const installmentMonth = installmentDate.getMonth() + 1
                const installmentYear = installmentDate.getFullYear()
                const monthName = MONTHS[installmentMonth - 1]?.substring(0, 3).toUpperCase() || 'XXX'
                const periodText = `${monthName}/${installmentYear}`
                
                return (
                  <View key={installment} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{installment}</Text>
                    <Text style={styles.tableCell}>{periodText}</Text>
                    <Text style={styles.tableCell}>{formatCurrency(loan.installment_amount)}</Text>
                    <Text style={styles.tableCell}>
                      {isPaid ? 'Pagada' : 'Pendiente'}
                    </Text>
                  </View>
                )
              })}
            </View>

            {/* Texto legal */}
            <View style={styles.footer}>
              <Text style={{ marginBottom: 10, fontSize: 9, lineHeight: 1.4 }}>
                El trabajador <Text style={{ textTransform: 'uppercase' }}>{employee?.full_name || ''}</Text>, 
                RUT {employee?.rut || ''}, reconoce haber recibido de{' '}
                <Text style={{ textTransform: 'uppercase' }}>{company?.employer_name || ''}</Text>{' '}
                la suma de {formatCurrency(loan.amount)} ({numberToWords(Math.round(loan.amount))} pesos), 
                la cual se compromete a pagar en {loan.installments} cuotas mensuales de{' '}
                {formatCurrency(loan.installment_amount)} cada una, 
                {loan.interest_rate > 0 
                  ? ` con un interés del ${loan.interest_rate}%, resultando un monto total a pagar de ${formatCurrency(loan.total_amount)}.`
                  : ' sin interés.'}
              </Text>
              <Text style={{ marginBottom: 10, fontSize: 9, lineHeight: 1.4 }}>
                El pago de las cuotas se realizará mediante descuento automático en las liquidaciones de sueldo 
                correspondientes, hasta completar el monto total adeudado.
              </Text>
              <Text style={{ marginBottom: 10, fontSize: 9, lineHeight: 1.4 }}>
                El trabajador acepta los términos y condiciones de este préstamo y se compromete a cumplir 
                con el plan de pago establecido.
              </Text>
              <Text style={{ marginBottom: 10, fontSize: 9, lineHeight: 1.4 }}>
                El trabajador declara haber recibido el préstamo señalado y autoriza expresa e irrevocablemente al empleador para descontar el saldo pendiente del mismo, tanto mediante descuentos mensuales por planilla como, en caso de término de la relación laboral por cualquier causa, mediante descuento directo del finiquito, conforme a lo dispuesto en el artículo 58 del Código del Trabajo.
              </Text>
            </View>

            {/* Firmas */}
            <View style={styles.signatureRow}>
              <View style={styles.signatureBox}>
                <Text style={{ fontSize: 9 }}>Vo Bo REMUNERACIONES</Text>
              </View>
              <View style={styles.signatureBox}>
                <Text style={{ fontSize: 9 }}>FIRMA DEL TRABAJADOR</Text>
              </View>
            </View>

            {/* Pie de página - nombre del archivo centrado */}
            <Text
              style={{
                position: 'absolute',
                bottom: 30,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: 9,
                color: '#666',
              }}
              fixed
            >
              {generateFileName()}
            </Text>
          </Page>
        </Document>
      </PDFViewer>
    </div>
  )
}

