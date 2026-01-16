import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VacationPDF from '@/components/VacationPDF'

export const revalidate = 0

export default async function VacationPDFPage({ 
  params 
}: { 
  params: { id: string, vacationId: string }
}) {
  const supabase = await createServerClient()
  
  console.log('[VACATION PDF PAGE] Params recibidos:', params)

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  // Verificar si es trabajador para validar acceso
  const { data: currentEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Cargar empleado
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, full_name, rut, position, hire_date, company_id')
    .eq('id', params.id)
    .single()

  if (employeeError || !employee) {
    notFound()
  }

  // Si es trabajador, verificar que la vacación sea suya
  if (currentEmployee && employee.id !== currentEmployee.id) {
    notFound()
  }

  // Cargar vacación (incluir signed_pdf_url)
  const { data: vacation, error: vacationError } = await supabase
    .from('vacations')
    .select('id, employee_id, start_date, end_date, days_count, status, signed_pdf_url, period_year, request_date, approval_date, notes')
    .eq('id', params.vacationId)
    .eq('employee_id', params.id)
    .single()

  console.log('[VACATION PDF PAGE] Consulta vacación - Error:', vacationError, 'Datos:', vacation ? 'encontrada' : 'no encontrada')

  if (vacationError || !vacation) {
    console.error('[VACATION PDF PAGE] Error al cargar vacación:', vacationError)
    notFound()
  }

  // DEBUG: Verificar si tiene signed_pdf_url
  console.log('[VACATION PDF PAGE] Vacación ID:', params.vacationId, 'Tiene signed_pdf_url:', !!vacation.signed_pdf_url, 'URL:', vacation.signed_pdf_url)

  // Si existe signed_pdf_url, mostrar directamente el PDF del bucket
  if (vacation.signed_pdf_url) {
    console.log('[VACATION PDF PAGE] Mostrando PDF guardado del bucket:', vacation.signed_pdf_url)
    return (
      <div style={{ 
        margin: 0, 
        padding: 0, 
        width: '100vw', 
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <iframe 
          src={vacation.signed_pdf_url} 
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none'
          }}
          title="Solicitud de Vacaciones"
        />
      </div>
    )
  }

  // Si NO existe signed_pdf_url, cargar datos completos y generar PDF dinámicamente
  console.log('[VACATION PDF PAGE] No tiene signed_pdf_url, generando PDF dinámicamente')

  // Cargar empresa
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, rut, address, city, employer_name')
    .eq('id', employee.company_id)
    .single()

  if (!company) {
    notFound()
  }

  return <VacationPDF vacation={vacation} employee={employee} company={company} />
}


