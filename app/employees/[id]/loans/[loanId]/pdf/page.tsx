import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LoanPDF from '@/components/LoanPDF'

export default async function LoanPDFPage({ params }: { params: { id: string, loanId: string } }) {
  const supabase = await createServerClient()
  
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, employee_id, amount, total_amount, remaining_amount, installment_amount, installments, interest_rate, loan_date, status, description, authorization_signed, exceeds_legal_limit, loan_number, paid_installments')
    .eq('id', params.loanId)
    .single()

  if (loanError || !loan) {
    notFound()
  }

  // Calcular total_amount si no existe o es NaN
  if (!loan.total_amount || isNaN(loan.total_amount)) {
    const interestRate = loan.interest_rate || 0
    loan.total_amount = loan.amount * (1 + interestRate / 100)
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, rut, position, hire_date, company_id')
    .eq('id', loan.employee_id)
    .single()

  if (!employee || !employee.company_id) {
    notFound()
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, rut, address, employer_name')
    .eq('id', employee.company_id)
    .single()

  if (!company) {
    notFound()
  }

  return <LoanPDF loan={loan} employee={employee} company={company} />
}


