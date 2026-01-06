import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatDateLegal } from '@/lib/utils/contractText'

/**
 * Servicio para generar PDFs de certificados en el servidor
 * Solo para certificados (antigüedad, renta, vigencia)
 */

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
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 39,
    textTransform: 'uppercase',
  },
  body: {
    marginBottom: 20,
    lineHeight: 1.6,
  },
  paragraph: {
    marginBottom: 15,
    textAlign: 'justify',
  },
  dateSection: {
    marginTop: 30,
    textAlign: 'right',
  },
  table: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 5,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 5,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellLabel: {
    flex: 1.5,
    fontSize: 10,
    paddingHorizontal: 5,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellValue: {
    flex: 2,
    fontSize: 10,
    paddingHorizontal: 5,
  },
})

interface CertificateData {
  employee: {
    full_name: string
    rut: string
    position: string
    hire_date: string
    contract_type?: string
    contract_other?: string
  }
  company: {
    name: string
    employer_name?: string
    rut?: string
    address?: string
    city?: string
  }
  issueDate: string
  purpose?: string
  folioNumber?: string
  certificateType: 'antiguedad' | 'renta' | 'vigencia'
  // Datos adicionales para certificado de renta
  monthsPeriod?: 3 | 6 | 12
  payrollData?: Array<{
    period: string
    baseSalary: number
    taxableEarnings: number
    legalDeductions: number
    netPay: number
  }>
  // Datos adicionales para certificado de vigencia
  contract?: {
    contract_type?: string
    contract_other?: string
    work_schedule?: string
    work_schedule_other?: string
    start_date?: string
    end_date?: string
    base_salary?: number
  }
  validUntil?: string
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

const formatMonthYear = (dateStr: string): string => {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return `${monthNames[date.getMonth()]} de ${date.getFullYear()}`
  } catch {
    return dateStr
  }
}

/**
 * Genera el PDF de un certificado (antigüedad, renta o vigencia)
 */
export async function generateCertificatePdf(
  data: CertificateData
): Promise<Uint8Array> {
  const { employee, company, issueDate, purpose, folioNumber, certificateType } = data

  let CertificateDocument: React.ReactElement | null = null

  if (certificateType === 'antiguedad') {
    // Calcular antigüedad (usando el mismo formato que el componente cliente)
    const hireDate = employee.hire_date ? new Date(employee.hire_date + 'T00:00:00') : null
    const issueDateObj = new Date(issueDate + 'T00:00:00')
    
    let years = 0
    let months = 0
    let days = 0
    
    if (hireDate && !isNaN(hireDate.getTime()) && !isNaN(issueDateObj.getTime())) {
      let tempDate = new Date(hireDate)
      years = issueDateObj.getFullYear() - tempDate.getFullYear()
      months = issueDateObj.getMonth() - tempDate.getMonth()
      days = issueDateObj.getDate() - tempDate.getDate()
      
      if (days < 0) {
        months--
        const lastMonth = new Date(issueDateObj.getFullYear(), issueDateObj.getMonth(), 0)
        days += lastMonth.getDate()
      }
      
      if (months < 0) {
        years--
        months += 12
      }
    }

    const formatAntiguedad = () => {
      const parts = []
      if (years > 0) parts.push(`${years} año${years > 1 ? 's' : ''}`)
      if (months > 0) parts.push(`${months} mes${months > 1 ? 'es' : ''}`)
      if (days > 0 && years === 0) parts.push(`${days} día${days > 1 ? 's' : ''}`)
      return parts.length > 0 ? parts.join(', ') : 'Menos de un mes'
    }

    const antiguedadText = formatAntiguedad()

    const getContractTypeText = () => {
      if (!employee.contract_type || employee.contract_type === 'indefinido') {
        return 'Indefinido'
      } else if (employee.contract_type === 'plazo_fijo') {
        return 'Plazo Fijo'
      } else if (employee.contract_type === 'otro') {
        return employee.contract_other || 'Otro'
      }
      return 'Indefinido'
    }

    CertificateDocument = (
      <Document>
        <Page size="LETTER" style={styles.page}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
            <View style={{ flex: 1 }}>
              {company && (
                <View>
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
                </View>
              )}
            </View>
            <View style={{ width: 200, alignItems: 'flex-end' }}>
              {folioNumber && (
                <Text style={{ fontSize: 9, color: '#666', textAlign: 'right', marginTop: 2, width: '100%' }} fixed>
                  {folioNumber}
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.title}>CERTIFICADO DE ANTIGÜEDAD LABORAL</Text>

          <View style={styles.body}>
            <Text style={styles.paragraph}>
              Por medio del presente documento, <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company?.name || 'la empresa'}</Text> certifica que{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.full_name || ''}</Text>, 
              RUT <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.rut || ''}</Text>, 
              se encuentra trabajando en esta empresa desde el día{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                {employee.hire_date ? formatDateLegal(employee.hire_date) : 'N/A'}
              </Text>.
            </Text>
            
            <Text style={styles.paragraph}>
              El trabajador{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>desempeña el cargo</Text> de{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.position || ''}</Text>, 
              bajo un contrato de tipo <Text style={{ fontFamily: 'Helvetica-Bold' }}>{getContractTypeText()}</Text>.
            </Text>

            <Text style={styles.paragraph}>
              A la fecha de emisión de este certificado ({formatDateLegal(issueDate)}), 
              el trabajador cuenta con una antigüedad de <Text style={{ fontFamily: 'Helvetica-Bold' }}>{antiguedadText}</Text>{' '}
              en la empresa.
            </Text>

            {purpose && (
              <Text style={styles.paragraph}>
                Este certificado se emite para: {purpose}
              </Text>
            )}

            <Text style={styles.paragraph}>
              Se extiende el presente certificado a solicitud del interesado, para los fines que estime conveniente.
            </Text>
          </View>

          <View style={styles.dateSection}>
            <Text style={{ fontSize: 10 }}>
              {company?.city || 'Santiago'}, {formatDateLegal(issueDate)}
            </Text>
          </View>

          {/* Espacio reservado para firma digital (se agregará automáticamente al aprobar) */}
          <View style={{ marginTop: 100, minHeight: 200 }} />
        </Page>
      </Document>
    )
  } else if (certificateType === 'renta') {
    const { monthsPeriod = 12, payrollData = [] } = data
    const safePayrollData = Array.isArray(payrollData) ? payrollData : []
    
    // Calcular totales
    const totalBaseSalary = safePayrollData.reduce((sum, item) => sum + (item.baseSalary || 0), 0)
    const totalTaxableEarnings = safePayrollData.reduce((sum, item) => sum + (item.taxableEarnings || 0), 0)
    const totalLegalDeductions = safePayrollData.reduce((sum, item) => sum + (item.legalDeductions || 0), 0)
    const totalNetPay = safePayrollData.reduce((sum, item) => sum + (item.netPay || 0), 0)

    const periodText = monthsPeriod === 3 ? 'tres' : monthsPeriod === 6 ? 'seis' : 'doce'

    CertificateDocument = (
      <Document>
        <Page size="LETTER" style={styles.page}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
            <View style={{ flex: 1 }}>
              {company && (
                <View>
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
                </View>
              )}
            </View>
            <View style={{ width: 200, alignItems: 'flex-end' }}>
              {folioNumber && (
                <Text style={{ fontSize: 9, color: '#666', textAlign: 'right', width: '100%' }} fixed>
                  {folioNumber}
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.title}>CERTIFICADO DE RENTA</Text>

          <View style={styles.body}>
            <Text style={styles.paragraph}>
              Por medio del presente documento, <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company.name || 'la empresa'}</Text> certifica que{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.full_name}</Text>, RUT{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.rut}</Text>, se desempeña en el cargo de{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.position}</Text> desde el{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatDateLegal(employee.hire_date)}</Text>.
            </Text>

            <Text style={styles.paragraph}>
              Se certifica que durante los últimos {periodText} meses, el trabajador ha percibido las siguientes rentas:
            </Text>

            {safePayrollData.length > 0 && (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Período</Text>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Sueldo Base</Text>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Renta Imponible</Text>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Descuentos Legales</Text>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Líquido a Pagar</Text>
                </View>
                {safePayrollData.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{formatMonthYear(item.period)}</Text>
                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatCurrency(item.baseSalary || 0)}</Text>
                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatCurrency(item.taxableEarnings || 0)}</Text>
                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatCurrency(item.legalDeductions || 0)}</Text>
                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatCurrency(item.netPay || 0)}</Text>
                  </View>
                ))}
                <View style={[styles.tableRow, { fontFamily: 'Helvetica-Bold', borderTopWidth: 2, borderTopColor: '#000' }]}>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>TOTAL</Text>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>{formatCurrency(totalBaseSalary)}</Text>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>{formatCurrency(totalTaxableEarnings)}</Text>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>{formatCurrency(totalLegalDeductions)}</Text>
                  <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>{formatCurrency(totalNetPay)}</Text>
                </View>
              </View>
            )}

            {purpose && (
              <Text style={styles.paragraph}>
                Este certificado se emite para: {purpose}
              </Text>
            )}

            <Text style={styles.paragraph}>
              Se extiende el presente certificado a solicitud del interesado, para los fines que estime conveniente.
            </Text>
          </View>

          <View style={styles.dateSection}>
            <Text style={{ fontSize: 11 }}>
              {company.city || 'Santiago'}, {formatDateLegal(issueDate)}
            </Text>
          </View>

          {/* Espacio reservado para firma digital (se agregará automáticamente al aprobar) */}
          <View style={{ marginTop: 100, minHeight: 200 }} />
        </Page>
      </Document>
    )
  } else if (certificateType === 'vigencia') {
    const { contract, validUntil } = data

    const getContractTypeText = () => {
      if (!contract) return 'Indefinido'
      if (contract.contract_type === 'plazo_fijo') {
        return 'Plazo Fijo'
      } else if (contract.contract_type === 'indefinido') {
        return 'Indefinido'
      } else if (contract.contract_type === 'otro') {
        return contract.contract_other || 'Otro'
      }
      return 'Indefinido'
    }

    CertificateDocument = (
      <Document>
        <Page size="LETTER" style={styles.page}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
            <View style={{ flex: 1 }}>
              {company && (
                <View>
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
                </View>
              )}
            </View>
            <View style={{ width: 200, alignItems: 'flex-end' }}>
              {folioNumber && (
                <Text style={{ fontSize: 9, color: '#666', textAlign: 'right', width: '100%' }} fixed>
                  {folioNumber}
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.title}>CERTIFICADO DE VIGENCIA DE CONTRATO</Text>

          <View style={styles.body}>
            <Text style={styles.paragraph}>
              Por medio del presente documento, <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company.name || 'la empresa'}</Text> certifica que{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.full_name}</Text>, RUT{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.rut}</Text>, se desempeña en el cargo de{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.position}</Text> desde el{' '}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatDateLegal(employee.hire_date)}</Text>.
            </Text>

            {contract && (
              <View>
                <Text style={styles.paragraph}>
                  El trabajador se encuentra vinculado a esta empresa mediante un contrato de trabajo de tipo{' '}
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>{getContractTypeText()}</Text>
                  {contract.start_date && (
                    <> que tuvo inicio el día <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatDateLegal(contract.start_date)}</Text></>
                  )}
                  {contract.end_date ? (
                    <> y que tiene término el día <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatDateLegal(contract.end_date)}</Text>.</>
                  ) : (
                    <>.</>
                  )}
                </Text>

                <Text style={styles.paragraph}>
                  El contrato se encuentra vigente a la fecha de emisión de este certificado ({formatDateLegal(issueDate)}).
                </Text>
              </View>
            )}

            {validUntil && (
              <Text style={styles.paragraph}>
                Este certificado es válido hasta el {formatDateLegal(validUntil)}.
              </Text>
            )}

            {purpose && (
              <Text style={styles.paragraph}>
                Este certificado se emite para: {purpose}
              </Text>
            )}

            <Text style={styles.paragraph}>
              Se extiende el presente certificado a solicitud del interesado, para los fines que estime conveniente.
            </Text>
          </View>

          <View style={styles.dateSection}>
            <Text style={{ fontSize: 11 }}>
              {company.city || 'Santiago'}, {formatDateLegal(issueDate)}
            </Text>
          </View>

          {/* Espacio reservado para firma digital (se agregará automáticamente al aprobar) */}
          <View style={{ marginTop: 100, minHeight: 200 }} />
        </Page>
      </Document>
    )
  } else {
    throw new Error(`Tipo de certificado no soportado: ${certificateType}`)
  }

  if (!CertificateDocument) {
    throw new Error('No se pudo crear el documento PDF')
  }

  try {
    console.log('Generando PDF para certificado tipo:', certificateType)
    console.log('Empleado:', employee.full_name)
    console.log('Documento creado:', CertificateDocument ? 'Sí' : 'No')
    
    if (!CertificateDocument) {
      throw new Error('CertificateDocument es null o undefined')
    }
    
    // Verificar que el documento sea válido
    if (typeof CertificateDocument !== 'object' || !CertificateDocument.type) {
      console.error('CertificateDocument no es un elemento React válido:', CertificateDocument)
      throw new Error('El documento PDF no es válido')
    }
    
    // Verificar que el documento sea válido antes de crear el PDF
    if (!CertificateDocument) {
      throw new Error('CertificateDocument es null o undefined')
    }
    
    console.log('Tipo de CertificateDocument:', typeof CertificateDocument)
    console.log('CertificateDocument.type:', (CertificateDocument as any)?.type?.displayName || (CertificateDocument as any)?.type?.name || 'unknown')
    
    let pdfDoc
    try {
      pdfDoc = pdf(CertificateDocument)
      console.log('PDF doc creado, tipo:', typeof pdfDoc)
    } catch (pdfError: any) {
      console.error('Error al crear pdf():', pdfError)
      console.error('Stack del error:', pdfError.stack)
      throw new Error(`Error al crear el objeto PDF: ${pdfError.message || pdfError}`)
    }
    
    if (!pdfDoc) {
      throw new Error('No se pudo crear el objeto pdf')
    }
    
    let pdfBuffer
    try {
      // Usar toBuffer() pero con un timeout y verificación adicional
      console.log('Llamando a toBuffer()...')
      
      // Intentar renderizar el documento primero
      const blob = await pdfDoc.toBlob()
      console.log('Blob generado, tamaño:', blob?.size || 0)
      
      if (blob && blob.size > 0) {
        // Convertir blob a buffer
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
    } catch (bufferError: any) {
      console.error('Error al generar buffer:', bufferError)
      console.error('Stack del error:', bufferError.stack)
      console.error('Tipo de error:', bufferError.name)
      console.error('Mensaje completo:', bufferError.toString())
      
      // Intentar usar toBuffer como fallback
      try {
        console.log('Intentando toBuffer() como fallback...')
        const bufferResult = await pdfDoc.toBuffer()
        pdfBuffer = Buffer.from(bufferResult as any)
        console.log('Buffer generado desde fallback, tamaño:', pdfBuffer?.length || 0)
      } catch (fallbackError: any) {
        console.error('Error en fallback toBuffer():', fallbackError)
        throw new Error(`Error al generar el buffer del PDF: ${bufferError.message || bufferError}`)
      }
    }
    
    // Validar que el buffer no esté vacío
    if (!pdfBuffer || pdfBuffer.length === 0) {
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
    
    console.log('PDF generado exitosamente, tamaño:', bufferView.length, 'bytes')
    return bufferView
  } catch (error: any) {
    console.error('Error al generar PDF del certificado:', error)
    console.error('Stack:', error.stack)
    console.error('Tipo de certificado:', certificateType)
    console.error('Datos del empleado:', { full_name: employee.full_name, rut: employee.rut })
    throw new Error(`Error al generar PDF: ${error.message}`)
  }
}

