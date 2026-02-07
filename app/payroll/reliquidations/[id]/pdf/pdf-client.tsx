'use client'

import { PDFViewer } from '@react-pdf/renderer'
import { ReliquidationDocument } from '@/components/ReliquidationPDF'
import { PayrollReliquidationWithDetails } from '@/types'

export default function ReliquidationPDFClient({ 
  reliquidation, 
  company 
}: { 
  reliquidation: PayrollReliquidationWithDetails
  company: any
}) {
  const generateFileName = () => {
    const period = reliquidation.payroll_periods
    const rut = reliquidation.employees?.rut?.replace(/\./g, '').replace('-', '') || 'N/A'
    const monthAbbr = period ? ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][period.month - 1] : 'N/A'
    const year = period?.year || 'N/A'
    return `RELIQUIDACION-${rut}-${monthAbbr}-${year}`
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <ReliquidationDocument
          reliquidation={reliquidation}
          company={company}
          generateFileName={generateFileName}
        />
      </PDFViewer>
    </div>
  )
}
