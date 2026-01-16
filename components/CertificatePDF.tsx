'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { formatDateLegal } from '@/lib/utils/contractText'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 15,
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
})

interface CertificatePDFProps {
  employee: any
  company: any
  issueDate: string
  purpose?: string
  folioNumber?: string
}

export default function CertificatePDF({ employee, company, issueDate, purpose, folioNumber }: CertificatePDFProps) {

  // Calcular antigüedad
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

  const getContractTypeText = () => {
    // Si no hay contract_type o es null/undefined, asumir indefinido
    if (!employee.contract_type || employee.contract_type === 'indefinido') {
      return 'Indefinido'
    } else if (employee.contract_type === 'plazo_fijo') {
      return 'Plazo Fijo'
    } else if (employee.contract_type === 'otro') {
      return employee.contract_other || 'Otro'
    }
    return 'Indefinido' // Por defecto
  }

  const formatAntiguedad = () => {
    const parts = []
    if (years > 0) parts.push(`${years} año${years > 1 ? 's' : ''}`)
    if (months > 0) parts.push(`${months} mes${months > 1 ? 'es' : ''}`)
    if (days > 0 && years === 0) parts.push(`${days} día${days > 1 ? 's' : ''}`)
    return parts.length > 0 ? parts.join(', ') : 'Menos de un mes'
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Botón para volver al dashboard de certificados */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Link 
          href="/certificates"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: '#2563eb',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          <FaArrowLeft size={16} />
          <span>Volver a Certificados</span>
        </Link>
      </div>
      <PDFViewer width="100%" height="100%">
        <Document>
          <Page size="LETTER" style={styles.page}>
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

              {/* Contador de páginas y folio en esquina superior derecha */}
              <View style={{ width: 200, alignItems: 'flex-end' }}>
                <Text
                  style={{ fontSize: 9, color: '#666', textAlign: 'right', width: '100%' }}
                  render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
                  fixed
                />
                {folioNumber && (
                  <Text style={{ fontSize: 9, color: '#666', textAlign: 'right', marginTop: 2, width: '100%' }} fixed>
                    {folioNumber}
                  </Text>
                )}
              </View>
            </View>

            {/* Título */}
            <Text style={styles.title}>CERTIFICADO DE ANTIGÜEDAD LABORAL</Text>

            {/* Cuerpo del certificado */}
            <View style={styles.body}>
              <Text style={styles.paragraph}>
                Por medio del presente documento, <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company?.name || 'la empresa'}</Text> certifica que{' '}
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.full_name || ''}</Text>, 
                RUT <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.rut || ''}</Text>, 
                se encuentra trabajando en esta empresa desde el día{' '}
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  {formatDateLegal(employee.hire_date || '')}
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
                el trabajador cuenta con una antigüedad de <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatAntiguedad()}</Text>{' '}
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

            {/* Fecha de emisión */}
            <View style={styles.dateSection}>
              <Text style={{ fontSize: 10 }}>
                {company?.city || 'Santiago'}, {formatDateLegal(issueDate)}
              </Text>
            </View>

            {/* Firma */}
            <View style={{ marginTop: 80, alignItems: 'center' }}>
              <View style={{ width: '50%', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }}>
                <Text style={{ fontSize: 10, textAlign: 'center' }}>FIRMA EMPLEADOR</Text>
              </View>
            </View>
          </Page>
        </Document>
      </PDFViewer>
    </div>
  )
}
