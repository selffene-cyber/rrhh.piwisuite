'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { formatDateReadable } from '@/lib/utils/date'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyInfo: {
    width: '60%',
  },
  companyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 9,
    color: '#333',
    lineHeight: 1.4,
  },
  pageInfo: {
    width: '35%',
    alignItems: 'flex-end',
  },
  pageNumber: {
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 26,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 0,
    lineHeight: 1.6,
  },
  paragraph: {
    fontSize: 10,
    marginBottom: 10,
    textAlign: 'justify',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  clauseTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  clauseText: {
    fontSize: 10,
    marginBottom: 10,
    textAlign: 'justify',
    lineHeight: 1.6,
  },
  signatureSection: {
    marginTop: 40,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    width: '100%',
    marginTop: 40,
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
})

interface OvertimePactPDFProps {
  pact: any
  employee: any
  company: any
}

const OvertimePactDocument = ({ pact, employee, company }: OvertimePactPDFProps) => {
  const startDate = new Date(pact.start_date)
  const endDate = new Date(pact.end_date)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company?.name || company?.employer_name || 'LA EMPRESA'}</Text>
              <Text style={styles.companyDetails}>
                RUT: {company?.rut || ''}{'\n'}
                {company?.address || ''}
              </Text>
            </View>
            <View style={styles.pageInfo}>
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
                fixed
              />
              {pact.pact_number && (
                <Text style={{ fontSize: 9, color: '#666', textAlign: 'right', marginTop: 2, width: '100%' }} fixed>
                  {pact.pact_number}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Título */}
        <Text style={styles.title}>PACTO DE HORAS EXTRAORDINARIAS</Text>

        {/* Contenido */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Entre <Text style={styles.bold}>{company?.name || company?.employer_name || 'la empresa'}</Text>, 
            RUT {company?.rut || ''}, representada legalmente por{' '}
            <Text style={styles.bold}>{company?.employer_name || ''}</Text>, 
            en adelante "EL EMPLEADOR", y{' '}
            <Text style={styles.bold}>{employee?.full_name || ''}</Text>, 
            RUT <Text style={styles.bold}>{employee?.rut || ''}</Text>, 
            con cargo de {employee?.position || ''}, 
            en adelante "EL TRABAJADOR", se ha convenido lo siguiente:
          </Text>
        </View>

        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>PRIMERO:</Text> El presente pacto se celebra en virtud de lo dispuesto en el artículo 32 del Código del Trabajo, 
          el cual establece que las horas extraordinarias deben constar por escrito y tener una duración máxima 
          de tres meses, pudiendo renovarse sucesivamente si persiste la necesidad que las originó.
        </Text>

        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>SEGUNDO:</Text> El trabajador se compromete a realizar horas extraordinarias en exceso de su jornada ordinaria de trabajo, 
          hasta un máximo de <Text style={styles.bold}>{pact.max_daily_hours} {pact.max_daily_hours === 1 ? 'hora' : 'horas'}</Text> por día, 
          conforme a lo establecido en el artículo 30 del Código del Trabajo.
        </Text>

        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>TERCERO:</Text> El presente pacto tendrá vigencia desde el día <Text style={styles.bold}>{formatDateReadable(pact.start_date)}</Text>{' '}
          hasta el día <Text style={styles.bold}>{formatDateReadable(pact.end_date)}</Text>,{' '}
          es decir, por un período de <Text style={styles.bold}>{daysDiff} días</Text>.
        </Text>

        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>CUARTO:</Text> Las horas extraordinarias se pagarán con un recargo mínimo del 50% sobre el valor de la hora ordinaria, 
          conforme a lo establecido en el artículo 32 del Código del Trabajo.
        </Text>

        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>QUINTO:</Text> El motivo que justifica la necesidad temporal de realizar horas extraordinarias es el siguiente:{'\n'}
          <Text style={styles.bold}>{pact.reason}</Text>
        </Text>

        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>SEXTO:</Text> Las partes declaran conocer y aceptar las disposiciones legales aplicables a las horas extraordinarias, 
          especialmente las contenidas en los artículos 30, 31 y 32 del Código del Trabajo.
        </Text>

        {/* Firmas */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}>
                <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 4 }}>
                  {employee?.full_name || ''}
                </Text>
                <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 2 }}>
                  RUT: {employee?.rut || ''}
                </Text>
              </View>
              <Text style={styles.signatureLabel}>TRABAJADOR</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}>
                <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 4 }}>
                  {company?.employer_name || company?.name || ''}
                </Text>
                <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 2 }}>
                  RUT: {company?.rut || ''}
                </Text>
              </View>
              <Text style={styles.signatureLabel}>EMPLEADOR</Text>
            </View>
          </View>
        </View>

        {/* Footer con fecha de vigencia */}
        <Text style={styles.footer} fixed>
          Vigencia del pacto: desde {formatDateReadable(pact.start_date)} hasta {formatDateReadable(pact.end_date)}
        </Text>
      </Page>
    </Document>
  )
}

// Función para generar el nombre del archivo PDF
export function generateFileName(pact: any, employee: any) {
  const pactId = pact.pact_number || 'PTO-XX'
  const rut = employee?.rut?.replace(/\./g, '').replace(/-/g, '') || 'SINRUT'
  
  // Formatear fecha de inicio como DDMMAAAA
  const startDate = new Date(pact.start_date)
  const day = String(startDate.getDate()).padStart(2, '0')
  const month = String(startDate.getMonth() + 1).padStart(2, '0')
  const year = startDate.getFullYear()
  const dateFormatted = `${day}${month}${year}`
  
  return `${pactId}-HH-${rut}-${dateFormatted}.pdf`
}

export default function OvertimePactPDF({ pact, employee, company }: OvertimePactPDFProps) {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <OvertimePactDocument pact={pact} employee={employee} company={company} />
      </PDFViewer>
    </div>
  )
}

export { OvertimePactDocument }

