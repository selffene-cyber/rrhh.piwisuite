'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer'
import { AccidentWithRelations } from '@/lib/services/raatService'

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
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  section: {
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
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
  textArea: {
    marginTop: 4,
    padding: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 2,
    fontSize: 9,
    lineHeight: 1.4,
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 6,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontFamily: 'Helvetica-Bold',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 6,
    fontSize: 8,
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#000',
    fontSize: 8,
    color: '#666',
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
    fontSize: 9,
  },
  badge: {
    padding: 4,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
})

const EVENT_TYPE_LABELS: Record<string, string> = {
  accidente_trabajo: 'Accidente del Trabajo',
  accidente_trayecto: 'Accidente de Trayecto',
  enfermedad_profesional: 'Enfermedad Profesional',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  closed: 'Cerrado',
  with_sequelae: 'Con Secuelas',
  consolidated: 'Consolidado',
}

interface AccidentPDFProps {
  accident: AccidentWithRelations
  company: any
}

const AccidentDocument = ({ accident, company }: AccidentPDFProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Registro de Accidente del Trabajo</Text>
          <Text style={styles.subtitle}>RAAT - Ley 16.744</Text>
          <Text style={styles.subtitle}>Número de Registro: #{accident.accident_number}</Text>
        </View>

        {/* Información de la Empresa */}
        {company && (
          <View style={styles.section}>
            <Text style={{ fontSize: 9, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Empresa: </Text>
              {company.name}
            </Text>
            {company.rut && (
              <Text style={{ fontSize: 9 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>RUT: </Text>
                {company.rut}
              </Text>
            )}
          </View>
        )}

        {/* 1. Identificación del Siniestro */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Identificación del Siniestro</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha del Evento:</Text>
            <Text style={styles.value}>{formatDate(accident.event_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hora del Evento:</Text>
            <Text style={styles.value}>{accident.event_time.substring(0, 5)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo de Evento:</Text>
            <Text style={styles.value}>{EVENT_TYPE_LABELS[accident.event_type] || accident.event_type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lugar del Evento:</Text>
            <Text style={styles.value}>{accident.event_location}</Text>
          </View>
        </View>

        {/* 2. Datos del Trabajador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Datos del Trabajador (Snapshot Histórico)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{accident.employee_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>RUT:</Text>
            <Text style={styles.value}>{accident.employee_rut}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cargo:</Text>
            <Text style={styles.value}>{accident.employee_position}</Text>
          </View>
          {accident.employee_seniority_days && (
            <View style={styles.row}>
              <Text style={styles.label}>Antigüedad:</Text>
              <Text style={styles.value}>{accident.employee_seniority_days} días</Text>
            </View>
          )}
          {accident.cost_center_code && (
            <View style={styles.row}>
              <Text style={styles.label}>Centro de Costo:</Text>
              <Text style={styles.value}>{accident.cost_center_code}</Text>
            </View>
          )}
          {accident.contract_type && (
            <View style={styles.row}>
              <Text style={styles.label}>Tipo de Contrato:</Text>
              <Text style={styles.value}>{accident.contract_type}</Text>
            </View>
          )}
          {accident.administrator && (
            <View style={styles.row}>
              <Text style={styles.label}>Organismo Administrador:</Text>
              <Text style={styles.value}>{accident.administrator}</Text>
            </View>
          )}
        </View>

        {/* 3. Descripción Técnica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Descripción Técnica del Evento</Text>
          {accident.work_performed && (
            <>
              <Text style={[styles.label, { marginBottom: 4 }]}>Labor Realizada:</Text>
              <Text style={styles.textArea}>{accident.work_performed}</Text>
            </>
          )}
          <Text style={[styles.label, { marginTop: 8, marginBottom: 4 }]}>Descripción Detallada:</Text>
          <Text style={styles.textArea}>{accident.description}</Text>
          {accident.hazards_identified && (
            <>
              <Text style={[styles.label, { marginTop: 8, marginBottom: 4 }]}>Peligros Identificados:</Text>
              <Text style={styles.textArea}>{accident.hazards_identified}</Text>
            </>
          )}
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {accident.body_part_affected && (
              <View style={{ width: '50%', marginRight: 10 }}>
                <Text style={styles.label}>Parte del Cuerpo Afectada:</Text>
                <Text style={styles.value}>{accident.body_part_affected}</Text>
              </View>
            )}
            {accident.injury_type && (
              <View style={{ width: '50%' }}>
                <Text style={styles.label}>Tipo de Lesión:</Text>
                <Text style={styles.value}>{accident.injury_type}</Text>
              </View>
            )}
          </View>
          {accident.witnesses && (
            <>
              <Text style={[styles.label, { marginTop: 8, marginBottom: 4 }]}>Testigos:</Text>
              <Text style={styles.textArea}>{accident.witnesses}</Text>
            </>
          )}
          {accident.possible_sequelae && (
            <>
              <Text style={[styles.label, { marginTop: 8, marginBottom: 4 }]}>Posibles Secuelas:</Text>
              <Text style={styles.textArea}>{accident.possible_sequelae}</Text>
            </>
          )}
        </View>

        {/* 4. Acciones Inmediatas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Acciones Inmediatas</Text>
          {accident.immediate_actions && (
            <>
              <Text style={[styles.label, { marginBottom: 4 }]}>Medidas Correctivas:</Text>
              <Text style={styles.textArea}>{accident.immediate_actions}</Text>
            </>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Traslado Médico:</Text>
            <Text style={styles.value}>
              {accident.medical_transfer ? 'Sí' : 'No'}
              {accident.medical_transfer && accident.medical_transfer_location && ` - ${accident.medical_transfer_location}`}
            </Text>
          </View>
          {accident.notification_date && (
            <View style={styles.row}>
              <Text style={styles.label}>Notificación a Mutualidad:</Text>
              <Text style={styles.value}>{formatDateTime(accident.notification_date)}</Text>
            </View>
          )}
        </View>

        {/* Información del Sistema */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Sistema</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Estado:</Text>
            <Text style={styles.value}>{STATUS_LABELS[accident.status] || accident.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estado DIAT:</Text>
            <Text style={styles.value}>
              {accident.diat_status === 'sent' ? 'Enviada' : 
               accident.diat_status === 'overdue' ? 'Fuera de Plazo' : 
               'Pendiente'}
              {accident.diat_number && ` (N° ${accident.diat_number})`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de Registro:</Text>
            <Text style={styles.value}>{formatDateTime(accident.created_at)}</Text>
          </View>
          {accident.closed_at && (
            <View style={styles.row}>
              <Text style={styles.label}>Fecha de Cierre:</Text>
              <Text style={styles.value}>{formatDateTime(accident.closed_at)}</Text>
            </View>
          )}
        </View>

        {/* Pie de Página */}
        <View style={styles.footer}>
          <Text style={{ textAlign: 'center', marginBottom: 10 }}>
            Este documento es válido ante fiscalizaciones de la Dirección del Trabajo y organismos administradores.
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 7, color: '#999' }}>
            Generado el {formatDateTime(new Date().toISOString())}
          </Text>
        </View>

        {/* Firmas */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text>Trabajador Afectado</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Responsable del Registro</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default function AccidentPDF({ accident, company }: AccidentPDFProps) {
  const generateFileName = () => {
    const rut = accident.employee_rut || 'SIN-RUT'
    const date = new Date(accident.event_date)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `RAAT-${rut}-${day}-${month}-${year}-${accident.accident_number}`
  }

  const handleDownload = async () => {
    try {
      const fileName = generateFileName()
      const blob = await pdf(
        <AccidentDocument accident={accident} company={company} />
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
    <div>
      <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Text>Descargar PDF</Text>
      </button>
    </div>
  )
}








