import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CertificatePDF from '@/components/CertificatePDF'

export default async function CertificatePDFPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string }
  searchParams: { issue_date?: string, purpose?: string }
}) {
  const supabase = await createServerClient()
  
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single()

  if (empError || !employee) {
    notFound()
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .limit(1)
    .single()

  return (
    <CertificatePDF 
      employee={employee} 
      company={company} 
      issueDate={searchParams.issue_date || new Date().toISOString().split('T')[0]}
      purpose={searchParams.purpose || ''}
    />
  )
}


