'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { formatDate, formatDateReadable } from '@/lib/utils/date'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    textTransform: 'uppercase',
  },
  body: {
    marginTop: 20,
  },
  paragraph: {
    marginBottom: 15,
    lineHeight: 1.6,
    textAlign: 'justify',
  },
  label: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    width: '40%',
    fontFamily: 'Helvetica-Bold',
  },
  infoValue: {
    width: '60%',
  },
  dateSection: {
    marginTop: 40,
    textAlign: 'right',
  },
  signatureSection: {
    marginTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 15,
    textAlign: 'center',
  },
  statusText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
})

interface VacationPDFProps {
  vacation: any
  employee: any
  company: any
}

export default function VacationPDF({ vacation, employee, company }: VacationPDFProps) {
  // Generar nombre del archivo: SOL.VACACIONES-{RUT}-{MM-AAAA}
  const generateFileName = () => {
    const rut = employee?.rut || 'SIN-RUT'
    // Usar la fecha de inicio de las vacaciones o la fecha actual
    const vacationDate = vacation?.start_date ? new Date(vacation.start_date) : new Date()
    const month = (vacationDate.getMonth() + 1).toString().padStart(2, '0')
    const year = vacationDate.getFullYear()
    return `SOL.VACACIONES-${rut}-${month}-${year}`
  }

  const getStatusText = () => {
    switch (vacation.status) {
      case 'solicitada':
        return 'SOLICITUD DE VACACIONES'
      case 'aprobada':
        return 'APROBACIÓN DE VACACIONES'
      case 'tomada':
        return 'CONSTANCIA DE VACACIONES TOMADAS'
      case 'rechazada':
        return 'RECHAZO DE SOLICITUD DE VACACIONES'
      case 'cancelada':
        return 'CANCELACIÓN DE SOLICITUD DE VACACIONES'
      default:
        return 'SOLICITUD DE VACACIONES'
    }
  }

  const getStatusColor = () => {
    switch (vacation.status) {
      case 'solicitada':
        return '#3b82f6' // blue
      case 'aprobada':
        return '#10b981' // green
      case 'tomada':
        return '#059669' // green-700
      case 'rechazada':
        return '#ef4444' // red
      case 'cancelada':
        return '#6b7280' // gray
      default:
        return '#3b82f6'
    }
  }

  const getStatusLabel = () => {
    switch (vacation.status) {
      case 'solicitada':
        return 'SOLICITADA'
      case 'aprobada':
        return 'APROBADA'
      case 'tomada':
        return 'TOMADA'
      case 'rechazada':
        return 'RECHAZADA'
      case 'cancelada':
        return 'CANCELADA'
      default:
        return vacation.status.toUpperCase()
    }
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <Document title={generateFileName()}>
          <Page size="A4" style={styles.page}>
            {/* Encabezado: empresa a la izquierda, paginador a la derecha - misma altura */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
              {/* Datos de la empresa - esquina superior izquierda */}
              <View style={{ flex: 1 }}>
                {company && (
                  <>
                    <Text style={styles.companyName}>{company.name || ''}</Text>
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

              {/* Contador de páginas en esquina superior derecha */}
              <View style={{ width: 200, alignItems: 'flex-end' }}>
                <Text
                  style={{ fontSize: 9, color: '#666', textAlign: 'right', width: '100%' }}
                  render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
                  fixed
                />
              </View>
            </View>

            {/* Título según estado */}
            <Text style={styles.title}>{getStatusText()}</Text>

            {/* Badge de estado */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                Estado: {getStatusLabel()}
              </Text>
            </View>

            {/* Cuerpo del documento */}
            <View style={styles.body}>
              <Text style={styles.paragraph}>
                Por medio del presente documento, {company?.name || 'la empresa'}, RUT {company?.rut || ''}, 
                representada legalmente por {company?.employer_name || 'el empleador'}, 
                {vacation.status === 'solicitada' ? ' informa que ha recibido la solicitud de vacaciones de' : 
                 vacation.status === 'aprobada' ? ' informa que ha aprobado la solicitud de vacaciones de' :
                 vacation.status === 'tomada' ? ' certifica que' :
                 vacation.status === 'rechazada' ? ' informa que ha rechazado la solicitud de vacaciones de' :
                 ' informa que ha cancelado la solicitud de vacaciones de'} el trabajador(a):
              </Text>

              {/* Información del trabajador */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre:</Text>
                <Text style={styles.infoValue}>{employee?.full_name || ''}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>RUT:</Text>
                <Text style={styles.infoValue}>{employee?.rut || ''}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cargo:</Text>
                <Text style={styles.infoValue}>{employee?.position || ''}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fecha de Ingreso:</Text>
                <Text style={styles.infoValue}>
                  {employee?.hire_date ? formatDateReadable(employee.hire_date) : ''}
                </Text>
              </View>

              {/* Información de la vacación */}
              <View style={{ marginTop: 20, marginBottom: 15 }}>
                <Text style={styles.label}>Detalles de la Solicitud de Vacaciones:</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fecha de Inicio:</Text>
                <Text style={styles.infoValue}>{formatDateReadable(vacation.start_date)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fecha de Término:</Text>
                <Text style={styles.infoValue}>{formatDateReadable(vacation.end_date)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Días Hábiles:</Text>
                <Text style={styles.infoValue}>{vacation.days_count} días</Text>
              </View>
              {vacation.period_year && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Período de Vacaciones:</Text>
                  <Text style={styles.infoValue}>Año {vacation.period_year}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fecha de Solicitud:</Text>
                <Text style={styles.infoValue}>
                  {vacation.request_date ? formatDateReadable(vacation.request_date) : ''}
                </Text>
              </View>
              {vacation.approval_date && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha de {vacation.status === 'aprobada' ? 'Aprobación' : 'Resolución'}:</Text>
                  <Text style={styles.infoValue}>{formatDateReadable(vacation.approval_date)}</Text>
                </View>
              )}

              {/* Texto según estado */}
              {vacation.status === 'solicitada' && (
                <Text style={styles.paragraph}>
                  La presente solicitud se encuentra en proceso de revisión. Se notificará al trabajador 
                  una vez que se tome una decisión respecto a la misma.
                </Text>
              )}

              {vacation.status === 'aprobada' && (
                <Text style={styles.paragraph}>
                  Se informa que la solicitud de vacaciones ha sido aprobada. El trabajador deberá 
                  tomar sus vacaciones en el período indicado. Durante este período, el trabajador 
                  recibirá su remuneración normal según lo establecido en el Código del Trabajo.
                </Text>
              )}

              {vacation.status === 'tomada' && (
                <Text style={styles.paragraph}>
                  Se certifica que el trabajador ha tomado sus vacaciones en el período indicado. 
                  Durante este período, el trabajador recibió su remuneración normal según lo 
                  establecido en el Código del Trabajo.
                </Text>
              )}

              {vacation.status === 'rechazada' && (
                <Text style={styles.paragraph}>
                  Se informa que la solicitud de vacaciones ha sido rechazada. El trabajador 
                  podrá presentar una nueva solicitud en el futuro, siempre que cuente con 
                  días de vacaciones disponibles.
                </Text>
              )}

              {vacation.status === 'cancelada' && (
                <Text style={styles.paragraph}>
                  Se informa que la solicitud de vacaciones ha sido cancelada. Los días de 
                  vacaciones correspondientes quedan disponibles para futuras solicitudes.
                </Text>
              )}

              {vacation.notes && (
                <View style={{ marginTop: 15 }}>
                  <Text style={styles.label}>Observaciones:</Text>
                  <Text style={styles.paragraph}>{vacation.notes}</Text>
                </View>
              )}
            </View>

            {/* Fecha y lugar */}
            <View style={styles.dateSection}>
              <Text style={{ fontSize: 10 }}>
                {company?.city || 'Santiago'}, {formatDateReadable(new Date().toISOString())}
              </Text>
            </View>

            {/* Firmas */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <Text style={{ fontSize: 10 }}>FIRMA EMPLEADOR</Text>
              </View>
              <View style={styles.signatureBox}>
                <Text style={{ fontSize: 10 }}>FIRMA TRABAJADOR</Text>
              </View>
            </View>
          </Page>
        </Document>
      </PDFViewer>
    </div>
  )
}


