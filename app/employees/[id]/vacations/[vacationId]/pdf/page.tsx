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
    .select('id, full_name, rut, position, hire_date, company_id')
    .eq('id', params.id)
    .single()

  if (employeeError || !employee) {
    notFound()
  }

  // Cargar vacación
  const { data: vacation, error: vacationError } = await supabase
    .from('vacations')
    .select('id, employee_id, start_date, end_date, days_count, status, reason')
    .eq('id', params.vacationId)
    .eq('employee_id', params.id)
    .single()

  if (vacationError || !vacation) {
    notFound()
  }

  // Cargar empresa
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, rut, address, employer_name')
    .eq('id', employee.company_id)
    .single()

  return <VacationPDF vacation={vacation} employee={employee} company={company} />
}


