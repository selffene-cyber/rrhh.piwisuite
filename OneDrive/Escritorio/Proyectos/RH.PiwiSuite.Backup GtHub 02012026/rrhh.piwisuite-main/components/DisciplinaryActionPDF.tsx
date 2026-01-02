'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils/date'
import { formatDateLegal } from '@/lib/utils/contractText'

const styles = StyleSheet.create({
  page: {
    paddingLeft: 85,
    paddingRight: 85,
    paddingTop: 90,
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 3,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
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
  factsBox: {
    marginTop: 10,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#000',
    fontSize: 9,
    lineHeight: 1.5,
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
  warningBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    fontSize: 8,
    lineHeight: 1.5,
    textAlign: 'justify',
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyInfo}>{company?.name || 'EMPRESA'}</Text>
          <Text style={styles.companyInfo}>RUT: {company?.rut || 'N/A'}</Text>
          {company?.address && (
            <Text style={styles.companyInfo}>{company.address}</Text>
          )}
          {company?.city && <Text style={styles.companyInfo}>{company.city}</Text>}
        </View>

        {/* Título */}
        <Text style={styles.title}>
          CARTA DE AMONESTACIÓN {action.type === 'written' ? 'ESCRITA' : 'VERBAL'}
        </Text>

        {/* Datos del Trabajador */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Trabajador:</Text>
            <Text style={styles.value}>{employee?.full_name || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>RUT:</Text>
            <Text style={styles.value}>{employee?.rut || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha del Incidente:</Text>
            <Text style={styles.value}>{incidentDate}</Text>
          </View>
          {action.location && (
            <View style={styles.row}>
              <Text style={styles.label}>Lugar:</Text>
              <Text style={styles.value}>{action.location}</Text>
            </View>
          )}
          {action.site_client && (
            <View style={styles.row}>
              <Text style={styles.label}>Faena/Cliente:</Text>
              <Text style={styles.value}>{action.site_client}</Text>
            </View>
          )}
        </View>

        {/* Hechos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HECHOS</Text>
          <View style={styles.factsBox}>
            <Text>{action.facts || 'No se especificaron hechos.'}</Text>
          </View>
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

        {/* Advertencia de Escalamiento */}
        <View style={styles.warningBox}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 5 }}>
            ADVERTENCIA
          </Text>
          <Text>
            Se advierte al trabajador que la reiteración de conductas similares o el
            incumplimiento de las obligaciones establecidas en el Reglamento Interno de
            Orden, Higiene y Seguridad, podrá dar lugar a la aplicación de sanciones más
            graves, conforme a lo establecido en el artículo 160 del Código del Trabajo.
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

        {/* Footer con firmas */}
        <View style={styles.footer}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>Firma Empleador</Text>
              <Text style={{ fontSize: 8, marginTop: 5 }}>
                {company?.employer_name || company?.name || 'REPRESENTANTE LEGAL'}
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>Constancia de Recepción</Text>
              <Text style={{ fontSize: 8, marginTop: 5 }}>
                Firma Trabajador
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 20 }}>
            {company?.city || 'Ciudad'}, {formatDateLegal(new Date().toISOString().split('T')[0])}
          </Text>
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

