'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer, Image, Font } from '@react-pdf/renderer'
import { generateContractText, formatDateLegal } from '@/lib/utils/contractText'
import { formatRut } from '@/lib/utils/rutHelper'

Font.register({
  family: 'Arial',
  fonts: [
    { src: '/fonts/Arial-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Arial-Bold.ttf', fontWeight: 'bold' },
  ],
})

function renderBoldText(text: string, baseStyle: any) {
  const parts = text.split(/(\*[^*]+\*)/g)
  
  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      const boldText = part.slice(1, -1)
      return (
        <Text key={index} style={{ ...baseStyle, fontFamily: 'Arial', fontWeight: 'bold' }}>
          {boldText}
        </Text>
      )
    }
    return (
      <Text key={index} style={{ ...baseStyle, fontFamily: 'Arial', fontWeight: 'normal' }}>
        {part}
      </Text>
    )
  })
}

const MARGIN_LR = 50

const styles = StyleSheet.create({
  page: {
    paddingLeft: MARGIN_LR,
    paddingRight: MARGIN_LR,
    paddingTop: 90,
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    lineHeight: 1.5,
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: MARGIN_LR,
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
    right: MARGIN_LR,
    fontSize: 9,
    color: '#666',
    fontFamily: 'Arial',
  },
  contractNumber: {
    position: 'absolute',
    top: 35,
    right: MARGIN_LR,
    fontSize: 9,
    color: '#666',
    fontFamily: 'Arial',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  contractText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 15,
    fontFamily: 'Arial',
    fontWeight: 'normal',
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
    fontFamily: 'Arial',
  },
})

interface ContractPDFProps {
  contract: any
  employee: any
  company: any
}

export default function ContractPDF({ contract, employee, company }: ContractPDFProps) {
  const generateFileName = () => {
    const rut = employee?.rut ? formatRut(employee.rut) : 'SIN-RUT'
    const startDate = contract?.start_date ? new Date(contract.start_date) : new Date()
    const day = String(startDate.getDate()).padStart(2, '0')
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const year = startDate.getFullYear()
    return `CONTRATO-${rut}-${day}-${month}-${year}`
  }

  const contractTextRaw = generateContractText(contract, employee, company)
  const paragraphs = contractTextRaw.split('\n\n').filter(p => p.trim().length > 0)

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <Document title={generateFileName()}>
          <Page size="LETTER" style={styles.page} wrap>
            {company?.logo_url && (
              <View style={styles.logoContainer} fixed>
                <Image 
                  src={company.logo_url} 
                  style={styles.logo}
                />
              </View>
            )}

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

            <Text style={styles.title}>CONTRATO DE TRABAJO</Text>

            <View>
              {paragraphs.map((paragraph, index) => {
                const trimmed = paragraph.trim()
                const startsWithBoldOrdinal = /^\*[A-ZÁÉÍÓÚÑ ]+:/i.test(trimmed)

                if (startsWithBoldOrdinal) {
                  const colonEndBold = trimmed.indexOf(':*')
                  if (colonEndBold !== -1) {
                    const afterTitle = trimmed.substring(colonEndBold + 2).trim()
                    const secondBoldStart = afterTitle.indexOf('*')
                    const secondBoldEnd = afterTitle.indexOf('*', secondBoldStart + 1)

                    if (secondBoldStart === 0 && secondBoldEnd !== -1) {
                      return (
                        <Text key={index} style={styles.contractText}>
                          {renderBoldText(trimmed.substring(0, colonEndBold + 2), {})}
                          <Text> </Text>
                          {renderBoldText(afterTitle, {})}
                        </Text>
                      )
                    }

                    return (
                      <Text key={index} style={styles.contractText}>
                        {renderBoldText(trimmed.substring(0, colonEndBold + 2), {})}
                        {afterTitle && (
                          <>
                            <Text> </Text>
                            {renderBoldText(afterTitle, {})}
                          </>
                        )}
                      </Text>
                    )
                  }
                }
                
                const letterMatch = paragraph.match(/^([a-z]\.\s+)(.*)$/i)
                if (letterMatch) {
                  const [, letter, content] = letterMatch
                  return (
                    <Text key={index} style={styles.contractText}>
                      <Text style={{ fontFamily: 'Arial', fontWeight: 'bold' }}>{letter}</Text>
                      {renderBoldText(content.trim(), {})}
                    </Text>
                  )
                }
                
                return (
                  <Text key={index} style={styles.contractText}>
                    {renderBoldText(trimmed, {})}
                  </Text>
                )
              })}
            </View>

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
              
              <View style={{ marginTop: 20, textAlign: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Arial' }}>
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