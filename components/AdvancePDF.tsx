'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer'
import { formatDate, formatDateReadable } from '@/lib/utils/date'
import { formatCurrency, numberToWords } from '@/lib/services/payrollCalculator'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 15,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 24,
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
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  value: {
    width: '65%',
    fontSize: 9,
  },
  amountBox: {
    marginTop: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  amountText: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
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
    <Page size="A4" style={styles.page}>
      {/* Encabezado: empresa a la izquierda, paginador a la derecha - misma altura */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
        {/* Datos de la empresa - esquina superior izquierda */}
        <View style={{ flex: 1 }}>
          {company && (
            <>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>{company.name || ''}</Text>
              {company.employer_name && (
                <Text style={{ fontSize: 9 }}>{company.employer_name}</Text>
              )}
              {company.rut && (
                <Text style={{ fontSize: 9 }}>RUT: {company.rut}</Text>
              )}
              {company.address && (
                <Text style={{ fontSize: 9 }}>{company.address}</Text>
              )}
              {company.city && (
                <Text style={{ fontSize: 9 }}>{company.city}</Text>
              )}
            </>
          )}
        </View>

        {/* Contador de páginas y ID en esquina superior derecha */}
        <View style={{ width: 200, alignItems: 'flex-end' }}>
          <Text
            style={{ fontSize: 9, color: '#666', textAlign: 'right', width: '100%' }}
            render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
            fixed
          />
          <Text style={{ fontSize: 9, color: '#666', textAlign: 'right', marginTop: 2, width: '100%' }} fixed>
            {advance.advance_number || `ANT-${advance.id.substring(0, 2).toUpperCase()}`}
          </Text>
        </View>
      </View>

        {/* Título */}
        <Text style={styles.title}>Anticipo de Remuneración</Text>

        {/* Datos del Trabajador - en prosa legal */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={{ fontSize: 9, lineHeight: 1.4, marginBottom: 10 }}>
            Por medio del presente documento, <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company?.name || company?.employer_name || 'la empresa'}</Text>, 
            RUT {company?.rut || ''}, representada legalmente por{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company?.employer_name || ''}</Text>, 
            en adelante "EL EMPLEADOR", otorga un anticipo de remuneración a{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee?.full_name || ''}</Text>, 
            RUT <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee?.rut || ''}</Text>, 
            con fecha {formatDateReadable(advance.advance_date)}, 
            el cual será descontado íntegramente en la liquidación de sueldo correspondiente al período de{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{monthNames[periodMonth - 1]} {periodYear}</Text>.
          </Text>
          {advance.reason && (
            <Text style={{ fontSize: 9, lineHeight: 1.4, marginTop: 10 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Glosa:</Text> {advance.reason}
            </Text>
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
              <Text style={{ fontSize: 8, marginTop: 5, textAlign: 'center' }}>
                {employee?.full_name || ''}
              </Text>
              <Text style={{ fontSize: 8, marginTop: 2, textAlign: 'center' }}>
                RUT: {employee?.rut || ''}
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>Firma Empleador</Text>
            </View>
          </View>
        </View>
      </Page>
  )
}

export default function AdvancePDFViewer({ advance, company, employee }: AdvancePDFProps) {
  // Generar nombre del archivo: ANTICIPO-{RUT TRABAJADOR}-{FECHA MES-AÑO}-{ID}
  const generateFileName = () => {
    const rut = employee?.rut || 'SIN-RUT'
    const advanceDate = new Date(advance.advance_date)
    const month = advanceDate.getMonth() + 1
    const year = advanceDate.getFullYear()
    const monthAbbr = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][month - 1] || 'XXX'
    const advanceId = advance.advance_number || advance.id.substring(0, 8).toUpperCase()
    return `ANTICIPO-${rut}-${monthAbbr}-${year}-${advanceId}`
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <Document title={generateFileName()}>
          <AdvancePDF advance={advance} company={company} employee={employee} />
        </Document>
      </PDFViewer>
    </div>
  )
}

