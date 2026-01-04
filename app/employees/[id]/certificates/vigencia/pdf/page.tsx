import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CertificateVigenciaPDF from '@/components/CertificateVigenciaPDF'

export default async function CertificateVigenciaPDFPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string }
  searchParams: { 
    issue_date?: string
    valid_until?: string
    purpose?: string
    folio_number?: string
  }
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
    .eq('id', employee.company_id)
    .single()

  // Obtener contrato activo
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('employee_id', params.id)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const issueDate = searchParams.issue_date || new Date().toISOString().split('T')[0]

  // Obtener certificado existente (NO crear uno nuevo si ya existe)
  let folioNumber = searchParams.folio_number || ''
  if (!folioNumber) {
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('folio_number')
      .eq('employee_id', params.id)
      .eq('certificate_type', 'vigencia')
      .eq('issue_date', issueDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingCert?.folio_number) {
      folioNumber = existingCert.folio_number
    }
    // Si no existe, no crear uno nuevo aquí - solo se crea desde el formulario de generación
  }

  return (
    <CertificateVigenciaPDF 
      employee={employee} 
      company={company} 
      contract={contract}
      issueDate={issueDate}
      validUntil={searchParams.valid_until || ''}
      purpose={searchParams.purpose || ''}
      folioNumber={folioNumber}
    />
  )
}

