'use client'

import AnnexPDF from '@/components/AnnexPDF'

export default function AnnexPDFClient({
  annex,
  contract,
  employee,
  company
}: {
  annex: any
  contract: any
  employee: any
  company: any
}) {
  return (
    <AnnexPDF
      annex={annex}
      contract={contract}
      employee={employee}
      company={company}
    />
  )
}

