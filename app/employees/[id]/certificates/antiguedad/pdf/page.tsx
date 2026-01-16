import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CertificatePDF from '@/components/CertificatePDF'

export default async function CertificatePDFPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string }
  searchParams: { issue_date?: string, purpose?: string, folio_number?: string }
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

  const issueDate = searchParams.issue_date || new Date().toISOString().split('T')[0]

  // Obtener certificado existente (NO crear uno nuevo si ya existe)
  let folioNumber = searchParams.folio_number || ''
  
  if (!folioNumber) {
    // Buscar certificado existente más reciente del mismo tipo, trabajador y fecha
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('folio_number')
      .eq('employee_id', params.id)
      .eq('certificate_type', 'antiguedad')
      .eq('issue_date', issueDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingCert?.folio_number) {
      folioNumber = existingCert.folio_number
    }
  }
  // Si no existe, no crear uno nuevo aquí - solo se crea desde el formulario de generación

  return (
    <CertificatePDF 
      employee={employee} 
      company={company} 
      issueDate={issueDate}
      purpose={searchParams.purpose || ''}
      folioNumber={folioNumber}
    />
  )
}


