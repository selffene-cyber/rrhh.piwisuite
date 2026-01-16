import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils/date'
import { formatDateLegal } from '@/lib/utils/contractText'

/**
 * Servicio para generar PDFs de permisos en el servidor
 */

const styles = StyleSheet.create({
  page: {
    paddingLeft: 85, // 3cm
    paddingRight: 85, // 3cm
    paddingTop: 90,
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  companyHeader: {
    position: 'absolute',
    top: 20,
    left: 85,
    fontSize: 9,
    color: '#000',
    textAlign: 'left',
    lineHeight: 1.3,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  permissionText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 15,
  },
  clauseText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 15,
  },
  clauseTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  signatureSection: {
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
    marginTop: 50,
    paddingTop: 5,
    fontSize: 8,
  },
  dateSection: {
    marginTop: 30,
    textAlign: 'right',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
})

interface PermissionData {
  permission: {
    permission_type: string
    start_date: string
    end_date?: string
    days?: number
    hours?: number
    reason: string
    status: string
    permission_number?: string
    notes?: string
    isWithPay?: boolean
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
 * Genera el PDF de un permiso
 */
export async function generatePermissionPdf(
  data: PermissionData
): Promise<Uint8Array> {
  const { permission, employee, company } = data
  const isWithPay = permission.isWithPay !== undefined ? permission.isWithPay : true

  const PermissionDocument = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.companyHeader}>
          <Text>{company.name || 'EMPRESA'}</Text>
          {company.rut && <Text>RUT: {company.rut}</Text>}
          {company.address && <Text>{company.address}</Text>}
          {company.city && <Text>{company.city}</Text>}
        </View>

        <Text style={styles.title}>SOLICITUD DE PERMISO</Text>

        <View>
          <Text style={styles.permissionText}>
            En {formatDateLegal(new Date().toISOString().split('T')[0])}, se otorga permiso laboral al trabajador{' '}
            <Text style={styles.bold}>{employee.full_name}</Text>, RUT{' '}
            <Text style={styles.bold}>{employee.rut}</Text>, quien se desempeña en el cargo de{' '}
            <Text style={styles.bold}>{employee.position}</Text>, de conformidad con lo siguiente:
          </Text>

          <Text style={styles.clauseText}>
            <Text style={styles.clauseTitle}>PRIMERO:</Text> El presente permiso se otorga por un período de{' '}
            <Text style={styles.bold}>{permission.days || 1}</Text> días hábiles, desde el{' '}
            <Text style={styles.bold}>{formatDateLegal(permission.start_date)}</Text>
            {permission.end_date && (
              <View>
                <Text> hasta el <Text style={styles.bold}>{formatDateLegal(permission.end_date)}</Text></Text>
              </View>
            )}
            , ambos inclusive.
          </Text>

          <Text style={styles.clauseText}>
            <Text style={styles.clauseTitle}>SEGUNDO:</Text> El motivo del permiso es:{' '}
            <Text style={styles.bold}>{permission.reason}</Text>.
          </Text>

          <Text style={styles.clauseText}>
            <Text style={styles.clauseTitle}>TERCERO:</Text> El presente permiso es de carácter{' '}
            <Text style={styles.bold}>
              {isWithPay ? 'con goce de sueldo' : 'sin goce de sueldo'}
            </Text>
            {isWithPay ? (
              ', por lo que el trabajador recibirá su remuneración íntegra durante el período de permiso, sin que este afecte su liquidación de sueldo ni sus beneficios laborales.'
            ) : (
              ', por lo que se descontará de la remuneración del trabajador el monto proporcional correspondiente a los días de permiso, conforme a la fórmula establecida en el Código del Trabajo: (sueldo base / 30) × días de permiso. Este descuento se aplicará en la liquidación de sueldo del período correspondiente.'
            )}
          </Text>

          {permission.notes && (
            <Text style={styles.clauseText}>
              <Text style={styles.clauseTitle}>CUARTO:</Text> {permission.notes}
            </Text>
          )}
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.dateSection}>
            <Text style={{ fontSize: 11 }}>
              {company.city || 'Santiago'}, {formatDateLegal(new Date().toISOString().split('T')[0])}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )

  try {
    console.log('Generando PDF para permiso')
    console.log('Empleado:', employee.full_name)
    console.log('Documento creado:', PermissionDocument ? 'Sí' : 'No')
    
    if (!PermissionDocument) {
      throw new Error('PermissionDocument es null o undefined')
    }
    
    // Verificar que el documento sea válido
    if (typeof PermissionDocument !== 'object' || !PermissionDocument.type) {
      console.error('PermissionDocument no es un elemento React válido:', PermissionDocument)
      throw new Error('El documento PDF no es válido')
    }
    
    console.log('Tipo de PermissionDocument:', typeof PermissionDocument)
    console.log('PermissionDocument.type:', (PermissionDocument as any)?.type?.displayName || (PermissionDocument as any)?.type?.name || 'unknown')
    
    let pdfDoc
    try {
      pdfDoc = pdf(PermissionDocument)
      console.log('PDF doc creado, tipo:', typeof pdfDoc)
    } catch (pdfError: any) {
      console.error('Error al crear pdf():', pdfError)
      console.error('Stack del error:', pdfError.stack)
      throw new Error(`Error al crear el objeto PDF: ${pdfError.message || pdfError}`)
    }
    
    if (!pdfDoc) {
      throw new Error('No se pudo crear el objeto pdf')
    }
    
    let pdfBuffer: Uint8Array | Buffer
    
    try {
      // Intentar usar toBlob() primero (más confiable en algunos entornos)
      console.log('Llamando a toBlob()...')
      const blob = await pdfDoc.toBlob()
      console.log('Blob generado, tamaño:', blob?.size || 0)
      
      if (blob && blob.size > 0) {
        const arrayBuffer = await blob.arrayBuffer()
        pdfBuffer = new Uint8Array(arrayBuffer)
        console.log('Buffer generado desde blob, tamaño:', pdfBuffer.length)
      } else {
        // Si el blob está vacío, intentar toBuffer directamente
        console.log('Blob vacío, intentando toBuffer() directamente...')
        const bufferResult = await pdfDoc.toBuffer()
        pdfBuffer = Buffer.from(bufferResult as any)
        console.log('Buffer generado desde toBuffer(), tamaño:', pdfBuffer?.length || 0)
      }
    } catch (blobError: any) {
      console.warn('Error al usar toBlob(), intentando toBuffer():', blobError.message)
      // Intentar usar toBuffer como fallback
      try {
        console.log('Intentando toBuffer() como fallback...')
        const bufferResult = await pdfDoc.toBuffer()
        pdfBuffer = Buffer.from(bufferResult as any)
        console.log('Buffer generado desde toBuffer() (fallback), tamaño:', pdfBuffer?.length || 0)
      } catch (fallbackError: any) {
        console.error('Error en fallback toBuffer():', fallbackError)
        throw new Error(`Error al generar el buffer del PDF: ${fallbackError.message || fallbackError}`)
      }
    }
    
    // Validar que el buffer no esté vacío
    if (!pdfBuffer || (pdfBuffer instanceof Uint8Array && pdfBuffer.length === 0) || (pdfBuffer instanceof Buffer && pdfBuffer.length === 0)) {
      console.error('El PDF generado está vacío')
      throw new Error('El PDF generado está vacío. Verifique que el documento se esté renderizando correctamente.')
    }
    
    // Convertir a Uint8Array si no lo es ya
    const bufferView = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer)
    
    // Validar que tenga el encabezado PDF (debe empezar con %PDF)
    if (bufferView.length < 4) {
      throw new Error(`El PDF generado es demasiado corto: ${bufferView.length} bytes`)
    }
    
    const header = String.fromCharCode(bufferView[0], bufferView[1], bufferView[2], bufferView[3])
    if (header !== '%PDF') {
      console.error('PDF inválido. Primeros bytes:', Array.from(bufferView.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '))
      throw new Error(`El PDF generado no tiene un encabezado válido. Header encontrado: "${header}" (${bufferView[0]}, ${bufferView[1]}, ${bufferView[2]}, ${bufferView[3]})`)
    }
    
    console.log('PDF generado exitosamente, tamaño final:', bufferView.length)
    console.log('Header PDF válido:', header)
    
    return bufferView
  } catch (error: any) {
    console.error('Error completo al generar PDF de permiso:', error)
    console.error('Stack completo:', error.stack)
    throw new Error(`Error al generar PDF: ${error.message || error}`)
  }
}

