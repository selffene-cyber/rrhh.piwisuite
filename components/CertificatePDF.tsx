'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 10,
    marginBottom: 3,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 30,
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
}

export default function CertificatePDF({ employee, company, issueDate, purpose }: CertificatePDFProps) {
  // Función para formatear fecha en formato legible
  const formatDateReadable = (dateStr: string): string => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr + 'T00:00:00')
      if (isNaN(date.getTime())) return dateStr
      
      const day = date.getDate().toString().padStart(2, '0')
      const month = date.getMonth() + 1
      const year = date.getFullYear()
      
      const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ]
      
      return `${day} de ${monthNames[month - 1]} de ${year}`
    } catch {
      return dateStr
    }
  }

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
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <Document>
          <Page size="A4" style={styles.page}>
            {/* Encabezado con datos de la empresa */}
            <View style={styles.header}>
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

            {/* Título */}
            <Text style={styles.title}>CERTIFICADO DE ANTIGÜEDAD LABORAL</Text>

            {/* Cuerpo del certificado */}
            <View style={styles.body}>
              <Text style={styles.paragraph}>
                Por medio del presente documento, {company?.name || 'la empresa'} certifica que{' '}
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.full_name || ''}</Text>, 
                RUT <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.rut || ''}</Text>, 
                se encuentra trabajando en esta empresa desde el día{' '}
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  {formatDateReadable(employee.hire_date)}
                </Text>, 
                desempeñando el cargo de <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.position || ''}</Text>, 
                bajo un contrato de tipo <Text style={{ fontFamily: 'Helvetica-Bold' }}>{getContractTypeText()}</Text>.
              </Text>

              <Text style={styles.paragraph}>
                A la fecha de emisión de este certificado ({formatDateReadable(issueDate)}), 
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
                {company?.city || 'Santiago'}, {formatDateReadable(issueDate)}
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
