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
  table: {
    width: '100%',
    marginTop: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#000',
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
  dateSection: {
    marginTop: 30,
    textAlign: 'right',
  },
  signatureSection: {
    marginTop: 60,
    alignItems: 'center',
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    marginTop: 50,
  },
  signatureText: {
    fontSize: 10,
    textAlign: 'center',
  },
})

interface CertificateVigenciaPDFProps {
  employee: any
  company: any
  contract: any
  issueDate: string
  validUntil?: string
  purpose?: string
  folioNumber?: string
}

export default function CertificateVigenciaPDF({ 
  employee, 
  company, 
  contract,
  issueDate, 
  validUntil,
  purpose,
  folioNumber 
}: CertificateVigenciaPDFProps) {
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

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
            <Text style={styles.title}>CERTIFICADO DE VIGENCIA LABORAL</Text>

            {/* Cuerpo del certificado */}
            <View style={styles.body}>
              <Text style={styles.paragraph}>
                Por medio del presente documento, <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company?.name || 'la empresa'}</Text>, 
                RUT <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company?.rut || ''}</Text>, 
                certifica que el señor(a) <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.full_name || ''}</Text>, 
                RUT <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.rut || ''}</Text>, 
                se encuentra trabajando en esta empresa desde el día{' '}
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  {formatDateLegal(employee.hire_date || '')}
                </Text>, 
                desempeñando el cargo de <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.position || ''}</Text>, 
                bajo un contrato de tipo <Text style={{ fontFamily: 'Helvetica-Bold' }}>{getContractTypeText()}</Text>.
              </Text>

              <Text style={styles.paragraph}>
                Se certifica que a la fecha de emisión de este documento ({formatDateLegal(issueDate)}), 
                el trabajador mantiene una relación laboral vigente con esta empresa, encontrándose en situación de{' '}
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>activo</Text> y cumpliendo con todas sus obligaciones contractuales.
              </Text>

              {/* Información del contrato en prosa legal */}
              {contract && (
                <>
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
                </>
              )}

              {validUntil && (
                <Text style={styles.paragraph}>
                  Este certificado tiene validez hasta el día{' '}
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                    {formatDateLegal(validUntil)}
                  </Text>.
                </Text>
              )}

              {purpose && (
                <Text style={styles.paragraph}>
                  Este certificado se emite para: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{purpose}</Text>
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

            {/* Firmas */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureText}>FIRMA EMPLEADOR</Text>
              </View>
            </View>
          </Page>
        </Document>
      </PDFViewer>
    </div>
  )
}

