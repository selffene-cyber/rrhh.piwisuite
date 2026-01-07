import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { generateContractText, formatDateLegal } from '@/lib/utils/contractText'

// Función para renderizar texto con partes en negrita marcadas con asteriscos
function renderBoldText(text: string, baseStyle: any) {
  const parts = text.split(/(\*[^*]+\*)/g)
  
  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      const boldText = part.slice(1, -1)
      return (
        <Text key={index} style={{ ...baseStyle, fontFamily: 'Helvetica-Bold' }}>
          {boldText}
        </Text>
      )
    }
    return (
      <Text key={index} style={baseStyle}>
        {part}
      </Text>
    )
  })
}

const styles = StyleSheet.create({
  page: {
    paddingLeft: 85,
    paddingRight: 85,
    paddingTop: 90,
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 85,
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
    right: 85,
    fontSize: 9,
    color: '#666',
  },
  contractNumber: {
    position: 'absolute',
    top: 35,
    right: 85,
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
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 15,
    hyphens: 'auto',
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener contrato con relaciones
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        employees (*),
        companies (*)
      `)
      .eq('id', params.id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    // Verificar que el usuario es el empleado del contrato o tiene permisos
    const { data: employee } = await supabase
      .from('employees')
      .select('id, user_id')
      .eq('id', (contract as any).employee_id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Verificar que el usuario es el empleado o es admin/owner
    if (employee.user_id !== user.id) {
      // Verificar si es admin/owner
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', (contract as any).company_id)
        .eq('status', 'active')
        .single()

      if (!companyUser || !['owner', 'admin', 'super_admin'].includes((companyUser as any).role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    const contractData = contract as any
    const employeeData = contractData.employees
    const companyData = contractData.companies

    if (!employeeData || !companyData) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 500 })
    }

    // Generar texto del contrato
    const contractText = generateContractText(contractData, employeeData, companyData)
    const paragraphs = contractText.split('\n\n').filter((p: string) => p.trim().length > 0)

    // Generar nombre del archivo
    const rut = employeeData.rut || 'SIN-RUT'
    const startDate = contractData.start_date ? new Date(contractData.start_date) : new Date()
    const day = String(startDate.getDate()).padStart(2, '0')
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const year = startDate.getFullYear()
    const fileName = `CONTRATO-${rut}-${day}-${month}-${year}.pdf`

    // Crear documento PDF
    const ContractDocument = (
      <Document>
        <Page size="LETTER" style={styles.page}>
          {/* Logo */}
          {companyData.logo_url && (
            <View style={styles.logoContainer} fixed>
              <Image src={companyData.logo_url} style={styles.logo} />
            </View>
          )}

          {/* Paginador y número de contrato */}
          <View style={styles.pageNumber} fixed>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`} />
          </View>
          {contractData.contract_number && (
            <View style={styles.contractNumber} fixed>
              <Text>{contractData.contract_number}</Text>
            </View>
          )}

          {/* Título */}
          <Text style={styles.title}>CONTRATO DE TRABAJO</Text>

          {/* Texto del contrato en prosa legal continua */}
          <View>
            {paragraphs.map((paragraph: string, index: number) => {
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
                <Text>{employeeData.full_name || 'TRABAJADOR'}</Text>
                <Text style={{ fontSize: 8, marginTop: 4 }}>RUT: {employeeData.rut || 'N/A'}</Text>
                <Text style={{ fontSize: 8, marginTop: 4 }}>FIRMA</Text>
              </View>
              <View style={styles.signatureBox}>
                <Text>{companyData.name || 'EMPLEADOR'}</Text>
                <Text style={{ fontSize: 8, marginTop: 4 }}>RUT: {companyData.rut || 'N/A'}</Text>
                <Text style={{ fontSize: 8, marginTop: 4 }}>FIRMA</Text>
              </View>
            </View>
            
            {/* Fecha */}
            <View style={{ marginTop: 20, textAlign: 'center' }}>
              <Text style={{ fontSize: 9 }}>
                {companyData.city || 'Ciudad'}, {formatDateLegal(contractData.start_date || new Date().toISOString())}
              </Text>
            </View>
          </View>
        </Page>
      </Document>
    )

    // Generar PDF
    const pdfInstance = pdf(ContractDocument)
    let buffer: Buffer
    
    try {
      const blob = await pdfInstance.toBlob()
      if (blob && blob.size > 0) {
        const arrayBuffer = await blob.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      } else {
        const bufferResult = await pdfInstance.toBuffer()
        buffer = Buffer.from(bufferResult as any)
      }
    } catch (error) {
      const bufferResult = await pdfInstance.toBuffer()
      buffer = Buffer.from(bufferResult as any)
    }

    // Validar buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('El PDF generado está vacío')
    }

    // Validar header PDF
    if (buffer.length < 4 || String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]) !== '%PDF') {
      throw new Error('El PDF generado no tiene un encabezado válido')
    }

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Error al generar PDF del contrato:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar PDF' },
      { status: 500 }
    )
  }
}

