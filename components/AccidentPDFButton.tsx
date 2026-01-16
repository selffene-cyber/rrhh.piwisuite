'use client'

import { pdf } from '@react-pdf/renderer'
import { FaFilePdf } from 'react-icons/fa'
import { AccidentWithRelations } from '@/lib/services/raatService'
import AccidentDocument from './AccidentPDFDocument'

interface AccidentPDFButtonProps {
  accident: AccidentWithRelations
  company: any
}

export default function AccidentPDFButton({ accident, company }: AccidentPDFButtonProps) {
  const generateFileName = () => {
    const rut = accident.employee_rut || 'SIN-RUT'
    const date = new Date(accident.event_date)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `RAAT-${rut}-${day}-${month}-${year}-${accident.accident_number}`
  }

  const handleDownload = async () => {
    try {
      const fileName = generateFileName()
      const blob = await pdf(
        <AccidentDocument accident={accident} company={company} />
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
    <button
      className="secondary"
      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      onClick={handleDownload}
    >
      <FaFilePdf /> Descargar PDF
    </button>
  )
}








