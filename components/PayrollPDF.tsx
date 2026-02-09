'use client'

import React, { useRef } from 'react'
import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer'
import { formatDate, formatMonthYear, MONTHS } from '@/lib/utils/date'
import { formatCurrency, numberToWords } from '@/lib/services/payrollCalculator'
import { formatRut } from '@/lib/utils/rutHelper'

// Función para dividir texto largo sin cortar palabras
const splitLongText = (text: string, maxLength: number = 20): string[] => {
  if (text.length <= maxLength) {
    return [text]
  }
  
  // Buscar patrones comunes antes de palabras largas (ej: "BONO DE RESPONSABILIDAD")
  const commonPrepositions = [' DE ', ' POR ', ' Y ', ' O ', ' EN ', ' CON ', ' SIN ', ' DEL ', ' DE LA ', ' DE LOS ']
  let bestSplitIndex = -1
  
  // Buscar la mejor posición de división considerando preposiciones
  for (const prep of commonPrepositions) {
    const index = text.lastIndexOf(prep, maxLength)
    if (index > 0 && index < maxLength) {
      // Dividir después de la preposición (incluyendo el espacio final)
      const candidateIndex = index + prep.length
      if (candidateIndex <= maxLength + 5) { // Permitir un poco de flexibilidad
        bestSplitIndex = candidateIndex
        break
      }
    }
  }
  
  // Si no encontramos una preposición, buscar el último espacio antes del límite
  if (bestSplitIndex === -1) {
    for (let i = maxLength; i >= Math.max(0, maxLength - 15); i--) {
      if (text[i] === ' ' || text[i] === '/' || text[i] === '-' || text[i] === ':') {
        bestSplitIndex = i + 1 // Dividir después del espacio
        break
      }
    }
  }
  
  // Si aún no encontramos, usar el último espacio en todo el texto antes del límite
  if (bestSplitIndex === -1) {
    const lastSpace = text.lastIndexOf(' ', maxLength)
    if (lastSpace > 0) {
      bestSplitIndex = lastSpace + 1
    } else {
      // Último recurso: dividir en el límite (cortará la palabra)
      bestSplitIndex = maxLength
    }
  }
  
  const firstPart = text.substring(0, bestSplitIndex).trim()
  const secondPart = text.substring(bestSplitIndex).trim()
  
  return [firstPart, secondPart]
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  rowTwoCol: {
    flexDirection: 'row',
    marginBottom: 3,
    justifyContent: 'space-between',
  },
  label: {
    width: '35%',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  value: {
    width: '65%',
    fontSize: 8,
  },
  labelTwoCol: {
    width: '48%',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  valueTwoCol: {
    width: '48%',
    fontSize: 8,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontFamily: 'Helvetica-Bold',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
  tableCellRight: {
    flex: 1,
    paddingHorizontal: 5,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#000',
    fontFamily: 'Helvetica-Bold',
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#000',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#000',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 50,
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    textAlign: 'center',
  },
})

interface PayrollPDFProps {
  slip: any
  company: any
  vacations?: any[] | null
  loanPayments?: any[]
  advances?: any[]
}

import { PayrollDocument } from './PayrollDocument'

export default function PayrollPDF({ slip, company, vacations, loanPayments = [], advances = [] }: PayrollPDFProps) {
  // Generar nombre del archivo: LIQUIDACIÓN-{RUT}-{MES}-{AÑO}
  const generateFileName = () => {
    const rut = slip.employees?.rut || 'SIN-RUT'
    const month = slip.payroll_periods?.month || new Date().getMonth() + 1
    const year = slip.payroll_periods?.year || new Date().getFullYear()
    const monthAbbr = MONTHS[month - 1]?.substring(0, 3) || 'XXX'
    return `LIQUIDACIÓN-${rut}-${monthAbbr}-${year}`
  }

  const handleDownload = async () => {
    try {
      const fileName = generateFileName()
      const blob = await pdf(
        <PayrollDocument 
          slip={slip} 
          company={company} 
          vacations={vacations} 
          loanPayments={loanPayments}
          advances={advances}
          generateFileName={generateFileName}
        />
      ).toBlob()
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      alert('Error al descargar el PDF')
    }
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <button 
        onClick={handleDownload}
        style={{
          position: 'absolute',
          top: '-30px',
          right: '16px',
          zIndex: 1000,
          padding: '8px 12px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '500',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1d4ed8'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#2563eb'
        }}
      >
        Descargar PDF
      </button>
      <PDFViewer width="100%" height="100%">
        <PayrollDocument 
          slip={slip} 
          company={company} 
          vacations={vacations} 
          loanPayments={loanPayments}
          advances={advances}
          generateFileName={generateFileName}
        />
      </PDFViewer>
    </div>
  )
}

