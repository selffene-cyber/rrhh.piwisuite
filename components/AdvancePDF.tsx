'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils/date'
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '35%',
    fontWeight: 'bold',
    fontSize: 9,
  },
  value: {
    width: '65%',
    fontSize: 9,
  },
  amountBox: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#000',
    textAlign: 'center',
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  amountWords: {
    fontSize: 10,
    marginTop: 5,
    fontStyle: 'italic',
  },
  clause: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    fontSize: 8,
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#000',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginTop: 40,
    paddingTop: 5,
    fontSize: 8,
  },
  companyInfo: {
    fontSize: 8,
    marginBottom: 3,
  },
})

interface AdvancePDFProps {
  advance: any
  company: any
  employee: any
}

export function AdvancePDF({ advance, company, employee }: AdvancePDFProps) {
  const amount = Number(advance.amount)
  const periodYear = parseInt(advance.period.split('-')[0])
  const periodMonth = parseInt(advance.period.split('-')[1])
  const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyInfo}>{company?.name || 'EMPRESA'}</Text>
          <Text style={styles.companyInfo}>RUT: {company?.rut || '-'}</Text>
          {company?.address && <Text style={styles.companyInfo}>{company.address}</Text>}
          {company?.city && <Text style={styles.companyInfo}>{company.city}</Text>}
        </View>

        {/* Título */}
        <Text style={styles.title}>Anticipo de Remuneración</Text>

        {/* Datos del Trabajador */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Trabajador:</Text>
            <Text style={styles.value}>{employee?.full_name || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>RUT:</Text>
            <Text style={styles.value}>{employee?.rut || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha del Anticipo:</Text>
            <Text style={styles.value}>{formatDate(advance.advance_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Período de Descuento:</Text>
            <Text style={styles.value}>{monthNames[periodMonth - 1]} {periodYear}</Text>
          </View>
          {advance.reason && (
            <View style={styles.row}>
              <Text style={styles.label}>Glosa:</Text>
              <Text style={styles.value}>{advance.reason}</Text>
            </View>
          )}
        </View>

        {/* Monto */}
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>${formatCurrency(amount)}</Text>
          <Text style={styles.amountWords}>
            SON: {numberToWords(Math.ceil(amount))} PESOS
          </Text>
        </View>

        {/* Cláusula */}
        <View style={styles.clause}>
          <Text>
            Este anticipo de remuneración se descontará íntegramente en la liquidación de sueldo del período {monthNames[periodMonth - 1]} {periodYear}.
            El monto indicado será deducido del líquido a pagar correspondiente a dicho período.
          </Text>
        </View>

        {/* Footer con firmas */}
        <View style={styles.footer}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>Firma Trabajador</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>Firma Empleador</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default function AdvancePDFViewer({ advance, company, employee }: AdvancePDFProps) {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <AdvancePDF advance={advance} company={company} employee={employee} />
      </PDFViewer>
    </div>
  )
}

