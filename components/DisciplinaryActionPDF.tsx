'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils/date'
import { formatDateLegal } from '@/lib/utils/contractText'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    position: 'relative',
  },
  companyHeader: {
    position: 'absolute',
    top: 20,
    left: 40,
    width: '50%',
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  pageInfo: {
    position: 'absolute',
    top: 20,
    right: 40,
    width: 200,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 30,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    textTransform: 'uppercase',
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
  factsText: {
    marginTop: 10,
    marginBottom: 15,
    fontSize: 10,
    lineHeight: 1.6,
    textAlign: 'justify',
  },
  ruleBox: {
    marginTop: 10,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#000',
    fontSize: 9,
    lineHeight: 1.5,
  },
  dateSection: {
    marginTop: 30,
    textAlign: 'right',
    marginBottom: 20,
  },
  signatureSection: {
    marginTop: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  signatureBox: {
    width: '45%',
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    marginTop: 0,
  },
  signatureText: {
    fontSize: 9,
    marginTop: 5,
  },
  warningBox: {
    marginTop: 15,
    fontSize: 9,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  paragraph: {
    marginBottom: 15,
    textAlign: 'justify',
    fontSize: 10,
    lineHeight: 1.6,
  },
})

interface DisciplinaryActionPDFProps {
  action: any
  company: any
  employee: any
  riohsRule?: any
}

const DisciplinaryActionDocument = ({
  action,
  company,
  employee,
  riohsRule,
}: DisciplinaryActionPDFProps) => {
  const incidentDate = action.incident_date
    ? formatDateLegal(new Date(action.incident_date).toISOString().split('T')[0])
    : 'N/A'

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado: empresa a la izquierda - posición absoluta para todas las páginas */}
        <View style={styles.companyHeader} fixed>
          {company && (
            <>
              <Text style={styles.companyName}>{company.name || 'EMPRESA'}</Text>
              {company.employer_name && (
                <Text style={styles.companyInfo}>{company.employer_name}</Text>
              )}
              {company.rut && (
                <Text style={styles.companyInfo}>RUT: {company.rut}</Text>
              )}
              {company.address && (
                <Text style={styles.companyInfo}>{company.address}</Text>
              )}
              {company.city && (
                <Text style={styles.companyInfo}>{company.city}</Text>
              )}
            </>
          )}
        </View>

        {/* Contador de páginas e ID en esquina superior derecha - posición absoluta para todas las páginas */}
        <View style={styles.pageInfo} fixed>
          <Text
            style={{ fontSize: 9, color: '#666', textAlign: 'right', width: '100%' }}
            render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
          />
          <Text style={{ fontSize: 9, color: '#666', textAlign: 'right', marginTop: 2, width: '100%' }}>
            ID: {action.id?.substring(0, 8).toUpperCase() || 'N/A'}
          </Text>
        </View>

        {/* Espaciador para el header */}
        <View style={{ height: 80, marginBottom: 15 }} />

        {/* Título */}
        <Text style={styles.title}>
          CARTA DE AMONESTACIÓN {action.type === 'written' ? 'ESCRITA' : 'VERBAL'}
        </Text>

        {/* Datos del Trabajador en prosa legal */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Por medio del presente documento, se deja constancia que el señor(a){' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee?.full_name || 'N/A'}</Text>, 
            con RUT <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee?.rut || 'N/A'}</Text>, 
            trabajador de esta empresa, tuvo lugar un incidente el día{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{incidentDate}</Text>
            {action.location && (
              <>, en el lugar{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{action.location}</Text></>
            )}
            {action.site_client && (
              <>, correspondiente a la faena/cliente{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{action.site_client}</Text></>
            )}
            .
          </Text>
        </View>

        {/* Hechos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HECHOS</Text>
          <Text style={styles.factsText}>
            {action.facts || 'No se especificaron hechos.'}
          </Text>
        </View>

        {/* Norma Interna Infringida */}
        {riohsRule && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NORMA INTERNA INFRINGIDA</Text>
            <View style={styles.ruleBox}>
              <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 5 }}>
                {riohsRule.code} - {riohsRule.title}
              </Text>
              {riohsRule.description && (
                <Text style={{ marginTop: 5 }}>{riohsRule.description}</Text>
              )}
            </View>
          </View>
        )}

        {/* Sanción Aplicada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SANCIÓN APLICADA</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.5, textAlign: 'justify' }}>
            Se aplica{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>
              {action.type === 'written' ? 'amonestación escrita' : 'amonestación verbal'}
            </Text>{' '}
            de conformidad con el Reglamento Interno de Orden, Higiene y Seguridad de la
            empresa, por el incumplimiento de las obligaciones establecidas en el mismo.
          </Text>
        </View>

        {/* Instrucción Correctiva */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INSTRUCCIÓN CORRECTIVA</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.5, textAlign: 'justify' }}>
            Se instruye al trabajador para que en el futuro cumpla estrictamente con las
            normas establecidas en el Reglamento Interno de Orden, Higiene y Seguridad,
            evitando la reiteración de conductas similares que puedan dar lugar a nuevas
            sanciones disciplinarias.
          </Text>
        </View>

        {/* Testigos */}
        {action.witnesses && action.witnesses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TESTIGOS</Text>
            {action.witnesses.map((witness: any, index: number) => (
              <View key={index} style={{ marginBottom: 5 }}>
                <Text style={{ fontSize: 9 }}>
                  {witness.name || 'N/A'}
                  {witness.position && ` - ${witness.position}`}
                  {witness.contact && ` - ${witness.contact}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Advertencia de Escalamiento */}
        <View style={styles.section}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>
            ADVERTENCIA
          </Text>
          <Text style={styles.warningBox}>
            Se advierte al trabajador que la reiteración de conductas similares o el
            incumplimiento de las obligaciones establecidas en el Reglamento Interno de
            Orden, Higiene y Seguridad, podrá dar lugar a la aplicación de sanciones más
            graves, conforme a lo establecido en el artículo 160 del Código del Trabajo.
          </Text>
        </View>

        {/* Fecha de emisión */}
        <View style={styles.dateSection}>
          <Text style={{ fontSize: 10 }}>
            {company?.city || 'Ciudad'}, {formatDateLegal(new Date().toISOString().split('T')[0])}
          </Text>
        </View>

        {/* Firmas */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text style={{ fontSize: 9, textAlign: 'center' }}>FIRMA EMPLEADOR</Text>
            </View>
            <Text style={styles.signatureText}>
              {company?.employer_name || company?.name || 'REPRESENTANTE LEGAL'}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text style={{ fontSize: 9, textAlign: 'center' }}>CONSTANCIA DE RECEPCIÓN</Text>
            </View>
            <Text style={styles.signatureText}>
              FIRMA TRABAJADOR
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default function DisciplinaryActionPDF({
  action,
  company,
  employee,
  riohsRule,
}: DisciplinaryActionPDFProps) {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <DisciplinaryActionDocument
          action={action}
          company={company}
          employee={employee}
          riohsRule={riohsRule}
        />
      </PDFViewer>
    </div>
  )
}

