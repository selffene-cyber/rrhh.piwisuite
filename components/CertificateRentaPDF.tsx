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
    fontSize: 8,
    paddingHorizontal: 5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  tableCellCenter: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 5,
    textAlign: 'right',
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
    marginTop: 2,
  },
})

interface CertificateRentaPDFProps {
  employee: any
  company: any
  issueDate: string
  monthsPeriod: 3 | 6 | 12
  payrollData: Array<{
    period: string
    baseSalary: number
    taxableEarnings: number
    legalDeductions: number
    netPay: number
  }>
  purpose?: string
  folioNumber?: string
}

export default function CertificateRentaPDF({ 
  employee, 
  company, 
  issueDate, 
  monthsPeriod, 
  payrollData,
  purpose,
  folioNumber 
}: CertificateRentaPDFProps) {
  
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

  // Asegurar que payrollData sea un array
  const safePayrollData = Array.isArray(payrollData) ? payrollData : []
  
  // Calcular totales
  const totalBaseSalary = safePayrollData.reduce((sum, item) => sum + (item.baseSalary || 0), 0)
  const totalTaxableEarnings = safePayrollData.reduce((sum, item) => sum + (item.taxableEarnings || 0), 0)
  const totalLegalDeductions = safePayrollData.reduce((sum, item) => sum + (item.legalDeductions || 0), 0)
  const totalNetPay = safePayrollData.reduce((sum, item) => sum + (item.netPay || 0), 0)

  const periodText = monthsPeriod === 3 ? 'tres' : monthsPeriod === 6 ? 'seis' : 'doce'

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
            <Text style={styles.title}>CERTIFICADO DE RENTA</Text>

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
                desempeñando el cargo de <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee.position || ''}</Text>.
              </Text>

              <Text style={styles.paragraph}>
                {safePayrollData.length > 0 ? (
                  <>Se certifica que durante los últimos <Text style={{ fontFamily: 'Helvetica-Bold' }}>{periodText} ({monthsPeriod}) meses</Text>, 
                  el trabajador ha percibido las <Text style={{ fontFamily: 'Helvetica-Bold' }}>remuneraciones</Text> que se detallan a continuación:</>
                ) : (
                  <>Se certifica que durante los últimos <Text style={{ fontFamily: 'Helvetica-Bold' }}>{periodText} ({monthsPeriod}) meses</Text>, 
                  el trabajador no registra liquidaciones emitidas en el período indicado.</>
                )}
              </Text>

              {/* Tabla de remuneraciones */}
              {safePayrollData.length > 0 ? (
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCellBold, { flex: 2, textAlign: 'left' }]}>Período</Text>
                    <Text style={styles.tableCellBold}>Sueldo Base</Text>
                    <Text style={styles.tableCellBold}>Haberes Imp.</Text>
                    <Text style={styles.tableCellBold}>Descuentos</Text>
                    <Text style={styles.tableCellBold}>Líquido</Text>
                  </View>
                  {safePayrollData.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2, textAlign: 'left' }]}>{formatMonthYear(item.period)}</Text>
                      <Text style={styles.tableCellCenter}>{formatCurrency(item.baseSalary)}</Text>
                      <Text style={styles.tableCellCenter}>{formatCurrency(item.taxableEarnings)}</Text>
                      <Text style={styles.tableCellCenter}>{formatCurrency(item.legalDeductions)}</Text>
                      <Text style={styles.tableCellCenter}>{formatCurrency(item.netPay)}</Text>
                    </View>
                  ))}
                  <View style={[styles.tableRow, { borderTopWidth: 2, borderTopColor: '#000', marginTop: 5 }]}>
                    <Text style={[styles.tableCellBold, { flex: 2, textAlign: 'left' }]}>TOTAL</Text>
                    <Text style={styles.tableCellBold}>{formatCurrency(totalBaseSalary)}</Text>
                    <Text style={styles.tableCellBold}>{formatCurrency(totalTaxableEarnings)}</Text>
                    <Text style={styles.tableCellBold}>{formatCurrency(totalLegalDeductions)}</Text>
                    <Text style={styles.tableCellBold}>{formatCurrency(totalNetPay)}</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.paragraph, { marginTop: 20, fontStyle: 'italic', color: '#666' }]}>
                  No se registran liquidaciones emitidas para el período solicitado.
                </Text>
              )}

              <Text style={styles.paragraph}>
                Se deja constancia que las remuneraciones indicadas corresponden a los períodos especificados y 
                se encuentran sujetas a las cotizaciones previsionales y de salud de acuerdo a la legislación vigente.
              </Text>

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

