import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatDate, formatDateReadable } from '@/lib/utils/date'

/**
 * Servicio para generar PDFs de vacaciones en el servidor
 */

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
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
})

interface VacationData {
  vacation: {
    start_date: string
    end_date: string
    days_count: number
    days_business?: number
    status: string
    reason?: string
  }
  employee: {
    full_name: string
    rut: string
    position: string
  }
  company: {
    name: string
    rut?: string
    address?: string
    city?: string
    employer_name?: string
  }
}

/**
 * Genera el PDF de una solicitud de vacaciones
 */
export async function generateVacationPdf(
  data: VacationData
): Promise<Uint8Array> {
  const { vacation, employee, company } = data

  const getStatusText = () => {
    switch (vacation.status) {
      case 'solicitada':
        return 'SOLICITUD DE VACACIONES'
      case 'aprobada':
        return 'APROBACIÓN DE VACACIONES'
      case 'tomada':
        return 'CONSTANCIA DE VACACIONES TOMADAS'
      default:
        return 'SOLICITUD DE VACACIONES'
    }
  }

  const VacationDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{company.name || 'EMPRESA'}</Text>
          <Text style={styles.companyInfo}>
            {company.rut ? `RUT: ${company.rut}` : ''}
            {company.address ? ` | ${company.address}` : ''}
            {company.city ? ` | ${company.city}` : ''}
          </Text>
        </View>

        <Text style={styles.title}>{getStatusText()}</Text>

        <View style={styles.body}>
          <Text style={styles.paragraph}>
            Por medio del presente documento, {company.name || 'la empresa'}, RUT {company.rut || ''}, 
            representada legalmente por {company.employer_name || 'el empleador'}, 
            {vacation.status === 'aprobada' ? ' informa que ha aprobado la solicitud de vacaciones de' : ' informa que ha recibido la solicitud de vacaciones de'} el trabajador(a):
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre:</Text>
            <Text style={styles.infoValue}>{employee.full_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>RUT:</Text>
            <Text style={styles.infoValue}>{employee.rut}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cargo:</Text>
            <Text style={styles.infoValue}>{employee.position}</Text>
          </View>

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

          {vacation.status === 'aprobada' && (
            <Text style={styles.paragraph}>
              Se informa que la solicitud de vacaciones ha sido aprobada. El trabajador deberá 
              tomar sus vacaciones en el período indicado. Durante este período, el trabajador 
              recibirá su remuneración normal según lo establecido en el Código del Trabajo.
            </Text>
          )}
        </View>

        <View style={styles.dateSection}>
          <Text style={{ fontSize: 11 }}>
            {company.city || 'Santiago'}, {formatDateReadable(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  )

  const pdfDoc = pdf(VacationDocument)
  
  let pdfBuffer: Uint8Array | Buffer
  
  try {
    // Intentar usar toBlob() primero (más confiable en algunos entornos)
    const blob = await pdfDoc.toBlob()
    
    if (blob && blob.size > 0) {
      const arrayBuffer = await blob.arrayBuffer()
      pdfBuffer = new Uint8Array(arrayBuffer)
    } else {
      // Si el blob está vacío, intentar toBuffer directamente
      const bufferResult = await pdfDoc.toBuffer()
      // Si bufferResult ya es un Buffer o Uint8Array, usarlo directamente
      if (bufferResult instanceof Buffer || bufferResult instanceof Uint8Array) {
        pdfBuffer = bufferResult
      } else {
        // Si es otro tipo, intentar convertirlo
        pdfBuffer = Buffer.from(bufferResult as any)
      }
    }
  } catch (blobError: any) {
    console.warn('Error al usar toBlob(), intentando toBuffer():', blobError.message)
    // Intentar usar toBuffer como fallback
    try {
      const bufferResult = await pdfDoc.toBuffer()
      // Si bufferResult ya es un Buffer o Uint8Array, usarlo directamente
      if (bufferResult instanceof Buffer || bufferResult instanceof Uint8Array) {
        pdfBuffer = bufferResult
      } else {
        pdfBuffer = Buffer.from(bufferResult as any)
      }
    } catch (fallbackError: any) {
      console.error('Error en fallback toBuffer():', fallbackError)
      throw new Error(`Error al generar el buffer del PDF: ${fallbackError.message || fallbackError}`)
    }
  }
  
  // Validar que el buffer no esté vacío
  if (!pdfBuffer || (pdfBuffer instanceof Uint8Array && pdfBuffer.length === 0) || (pdfBuffer instanceof Buffer && pdfBuffer.length === 0)) {
    throw new Error('El PDF generado está vacío. Verifique que el documento se esté renderizando correctamente.')
  }
  
  // Convertir a Uint8Array si no lo es ya
  const bufferView = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer)
  
  return bufferView
}

