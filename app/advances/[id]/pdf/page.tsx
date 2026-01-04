import { createServerClient } from '@/lib/supabase/server'
import AdvancePDFViewer from '@/components/AdvancePDF'
import { notFound } from 'next/navigation'

export default async function AdvancePDFPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const { data: advance, error: advanceError } = await supabase
    .from('advances')
    .select(`
      *,
      employees (*)
    `)
    .eq('id', params.id)
    .single()

  if (advanceError || !advance || !advance.employees) {
    notFound()
  }

  const employee = advance.employees

  if (!employee.company_id) {
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

  return (
    <AdvancePDFViewer
      advance={advance}
      company={company}
      employee={employee}
    />
  )
}

