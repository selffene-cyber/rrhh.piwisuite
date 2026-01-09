'use client'

import PayrollPDF from '@/components/PayrollPDF'

export default function PayrollPDFClient({ 
  slip, 
  company, 
  vacations, 
  loanPayments, 
  advances 
}: { 
  slip: any
  company: any
  vacations?: any[] | null
  loanPayments?: any[]
  advances?: any[]
}) {
  return (
    <PayrollPDF 
      slip={slip} 
      company={company} 
      vacations={vacations || []} 
      loanPayments={loanPayments || []} 
      advances={advances || []} 
    />
  )
}






