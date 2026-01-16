import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PayrollPDFClient from './pdf-client'

export const revalidate = 0

export default async function PayrollPDFPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  
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
  
  // SOLO obtener el pdf_url de la liquidación (consulta mínima)
  const { data: slip, error } = await supabase
    .from('payroll_slips')
    .select('id, pdf_url, employee_id')
    .eq('id', params.id)
    .single()

  if (error || !slip) {
    notFound()
  }

  // Si es trabajador, verificar que la liquidación sea suya
  if (currentEmployee && slip.employee_id !== currentEmployee.id) {
    notFound()
  }

  // DEBUG: Verificar si tiene pdf_url
  console.log('[PDF PAGE] Liquidación ID:', params.id, 'Tiene pdf_url:', !!slip.pdf_url, 'URL:', slip.pdf_url)

  // Si existe pdf_url, mostrar directamente el PDF del bucket (como los certificados)
  if (slip.pdf_url) {
    console.log('[PDF PAGE] Mostrando PDF guardado del bucket:', slip.pdf_url)
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
          src={slip.pdf_url} 
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none'
          }}
          title="Liquidación de Sueldo"
        />
      </div>
    )
  }

  // Si NO existe pdf_url, cargar TODOS los datos y usar PayrollPDF component
  // EXACTAMENTE igual que /payroll/[id]/page.tsx
  console.log('[PDF PAGE] No tiene pdf_url, generando PDF dinámicamente')
  const { data: fullSlip, error: fullError } = await supabase
    .from('payroll_slips')
    .select(`
      *,
      employees (*),
      payroll_periods (*),
      payroll_items (*)
    `)
    .eq('id', params.id)
    .single()

  if (fullError || !fullSlip) {
    notFound()
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', fullSlip.employee_id)
    .single()

  if (!employee) {
    notFound()
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', employee.company_id)
    .single()

  if (!company) {
    notFound()
  }

  // Obtener vacaciones
  let periodVacations = null
  if (fullSlip.payroll_periods) {
    const periodStart = new Date(fullSlip.payroll_periods.year, fullSlip.payroll_periods.month - 1, 1)
    const periodEnd = new Date(fullSlip.payroll_periods.year, fullSlip.payroll_periods.month, 0)
    
    const { data: vacations } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', fullSlip.employee_id)
      .in('status', ['aprobada', 'tomada'])
      .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)
    
    periodVacations = vacations
  }

  // Obtener anticipos
  const { data: advances } = await supabase
    .from('advances')
    .select('*')
    .eq('payroll_slip_id', fullSlip.id)
    .order('advance_date', { ascending: true })

  // Obtener préstamos
  const { data: loanPayments } = await supabase
    .from('loan_payments')
    .select(`
      *,
      loans (*)
    `)
    .eq('payroll_slip_id', fullSlip.id)
    .order('installment_number', { ascending: true })

  // DEBUG: Verificar datos cargados
  console.log('[PDF PAGE] Datos cargados:', {
    payroll_items_count: fullSlip.payroll_items?.length || 0,
    vacations_count: periodVacations?.length || 0,
    loanPayments_count: loanPayments?.length || 0,
    advances_count: advances?.length || 0
  })

  // Usar PayrollPDFClient (wrapper client-side)
  return (
    <PayrollPDFClient 
      slip={fullSlip}
      company={company}
      vacations={periodVacations || []}
      loanPayments={loanPayments || []}
      advances={advances || []}
    />
  )
}

