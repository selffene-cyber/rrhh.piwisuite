import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VacationPDF from '@/components/VacationPDF'

export default async function VacationPDFPage({ 
  params 
}: { 
  params: { id: string, vacationId: string } 
}) {
  const supabase = await createServerClient()

  // Cargar empleado
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single()

  if (employeeError || !employee) {
    notFound()
  }

  // Cargar vacación
  const { data: vacation, error: vacationError } = await supabase
    .from('vacations')
    .select('*')
    .eq('id', params.vacationId)
    .eq('employee_id', params.id)
    .single()

  if (vacationError || !vacation) {
    notFound()
  }

  // Cargar empresa
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .limit(1)
    .single()

  return <VacationPDF vacation={vacation} employee={employee} company={company} />
}


