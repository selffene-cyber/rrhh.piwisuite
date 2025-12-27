import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LoanPDF from '@/components/LoanPDF'

export default async function LoanPDFPage({ params }: { params: { id: string, loanId: string } }) {
  const supabase = await createServerClient()
  
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', params.loanId)
    .single()

  if (loanError || !loan) {
    notFound()
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', loan.employee_id)
    .single()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .limit(1)
    .single()

  return <LoanPDF loan={loan} employee={employee} company={company} />
}


