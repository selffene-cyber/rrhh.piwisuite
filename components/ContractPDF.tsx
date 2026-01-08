'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer, Image } from '@react-pdf/renderer'
import { generateContractText, formatDateLegal } from '@/lib/utils/contractText'
import { formatRut } from '@/lib/utils/rutHelper'

// Función para renderizar texto con partes en negrita marcadas con asteriscos
function renderBoldText(text: string, baseStyle: any) {
  // Dividir el texto por asteriscos
  const parts = text.split(/(\*[^*]+\*)/g)
  
  return parts.map((part, index) => {
    // Si la parte está entre asteriscos, renderizarla en negrita
    if (part.startsWith('*') && part.endsWith('*')) {
      const boldText = part.slice(1, -1) // Remover los asteriscos
      return (
        <Text key={index} style={{ ...baseStyle, fontFamily: 'Helvetica-Bold' }}>
          {boldText}
        </Text>
      )
    }
    // Texto normal
    return (
      <Text key={index} style={baseStyle}>
        {part}
      </Text>
    )
  })
}

const styles = StyleSheet.create({
  page: {
    paddingLeft: 85, // 3cm = 85 puntos aproximadamente
    paddingRight: 85, // 3cm = 85 puntos aproximadamente
    paddingTop: 90, // Padding superior para evitar superposición con logo y paginador
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5, // Interlineado 1.5
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 85, // Ajustado para margen de 3cm
    width: 56,
    height: 56,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  pageNumber: {
    position: 'absolute',
    top: 20,
    right: 85, // Ajustado para margen de 3cm
    fontSize: 9,
    color: '#666',
  },
  contractNumber: {
    position: 'absolute',
    top: 35,
    right: 85, // Ajustado para margen de 3cm
    fontSize: 9,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  contractText: {
    fontSize: 10,
    lineHeight: 1.5, // Interlineado 1.5
    textAlign: 'justify',
    marginBottom: 15,
    hyphens: 'auto', // Sin cortar palabras
  },
  clauseTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  signatureSection: {
    marginTop: 40,
    paddingTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  signatureBox: {
    width: '48%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    textAlign: 'center',
    fontSize: 9,
  },
  closingText: {
    marginTop: 20,
    fontSize: 10,
    textAlign: 'justify',
    fontStyle: 'italic',
  },
})

interface ContractPDFProps {
  contract: any
  employee: any
  company: any
}

export default function ContractPDF({ contract, employee, company }: ContractPDFProps) {
  // Generar nombre del archivo: CONTRATO-{RUT}-{DD-MM-AAAA}
  const generateFileName = () => {
    const rut = employee?.rut ? formatRut(employee.rut) : 'SIN-RUT'
    const startDate = contract?.start_date ? new Date(contract.start_date) : new Date()
    const day = String(startDate.getDate()).padStart(2, '0')
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const year = startDate.getFullYear()
    return `CONTRATO-${rut}-${day}-${month}-${year}`
  }

  // Generar texto completo del contrato
  const contractText = generateContractText(contract, employee, company)

  // Dividir el texto en párrafos para mejor renderizado
  const paragraphs = contractText.split('\n\n').filter(p => p.trim().length > 0)

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <Document title={generateFileName()}>
          <Page size="LETTER" style={styles.page}>
            {/* Logo en esquina superior izquierda */}
            {company?.logo_url && (
              <View style={styles.logoContainer} fixed>
                <Image 
                  src={company.logo_url} 
                  style={styles.logo}
                />
              </View>
            )}

            {/* Paginador y número de contrato en esquina superior derecha */}
            <View style={styles.pageNumber} fixed>
              <Text
                render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
              />
            </View>
            {contract.contract_number && (
              <View style={styles.contractNumber} fixed>
                <Text>{contract.contract_number}</Text>
              </View>
            )}

            {/* Título */}
            <Text style={styles.title}>CONTRATO DE TRABAJO</Text>

            {/* Texto del contrato en prosa legal continua */}
            <View>
              {paragraphs.map((paragraph, index) => {
                // Detectar si es un título de cláusula (PRIMERO:, SEGUNDO:, etc.)
                const clauseMatch = paragraph.match(/^((?:PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|OCTAVO|NOVENO|DÉCIMO|DÉCIMO PRIMERO|DÉCIMO SEGUNDO|DÉCIMO TERCERO|DÉCIMO CUARTO|DÉCIMO QUINTO):)(.*)$/is)
                
                if (clauseMatch) {
                  const [, title, content] = clauseMatch
                  return (
                    <Text key={index} style={styles.contractText}>
                      <Text style={styles.clauseTitle}>{title.trim()}</Text>
                      {content.trim() && (
                        <>
                          <Text> </Text>
                          {renderBoldText(content.trim(), {})}
                        </>
                      )}
                    </Text>
                  )
                }
                
                // Detectar si el párrafo comienza con una letra seguida de punto (a., b., c., etc.)
                const letterMatch = paragraph.match(/^([a-z]\.\s+)(.*)$/i)
                if (letterMatch) {
                  const [, letter, content] = letterMatch
                  return (
                    <Text key={index} style={styles.contractText}>
                      <Text style={{ fontFamily: 'Helvetica-Bold' }}>{letter}</Text>
                      {renderBoldText(content.trim(), {})}
                    </Text>
                  )
                }
                
                // Párrafo normal
                return (
                  <Text key={index} style={styles.contractText}>
                    {renderBoldText(paragraph.trim(), {})}
                  </Text>
                )
              })}
            </View>

            {/* Sección de firmas */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureRow}>
                <View style={styles.signatureBox}>
                  <Text>{employee?.full_name || 'TRABAJADOR'}</Text>
                  <Text style={{ fontSize: 8, marginTop: 4 }}>RUT: {employee?.rut ? formatRut(employee.rut) : 'N/A'}</Text>
                  <Text style={{ fontSize: 8, marginTop: 4 }}>FIRMA</Text>
                </View>
                <View style={styles.signatureBox}>
                  <Text>{company?.name || 'EMPLEADOR'}</Text>
                  <Text style={{ fontSize: 8, marginTop: 4 }}>RUT: {company?.rut || 'N/A'}</Text>
                  <Text style={{ fontSize: 8, marginTop: 4 }}>FIRMA</Text>
                </View>
              </View>
              
              {/* Fecha */}
              <View style={{ marginTop: 20, textAlign: 'center' }}>
                <Text style={{ fontSize: 9 }}>
                  {company?.city || 'Ciudad'}, {formatDateLegal(contract.start_date)}
                </Text>
              </View>
            </View>
          </Page>
        </Document>
      </PDFViewer>
    </div>
  )
}
