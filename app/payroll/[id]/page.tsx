import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PayrollDetailClient from './client-page'

export const revalidate = 0 // Deshabilitar cache para esta página

export default async function PayrollDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  
  // Forzar recarga sin cache
  const { data: slip, error } = await supabase
    .from('payroll_slips')
    .select(`
      *,
      employees (*),
      payroll_periods (*),
      payroll_items (*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !slip) {
    notFound()
  }

  // Obtener la empresa del empleado de la liquidación
  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', slip.employee_id)
    .single()

  if (!employee) {
    notFound()
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', employee.company_id)
    .single()

  // Obtener vacaciones del período si existe
  let periodVacations = null
  if (slip.payroll_periods) {
    const periodStart = new Date(slip.payroll_periods.year, slip.payroll_periods.month - 1, 1)
    const periodEnd = new Date(slip.payroll_periods.year, slip.payroll_periods.month, 0)
    
    const { data: vacations } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', slip.employee_id)
      .in('status', ['aprobada', 'tomada'])
      .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)
    
    periodVacations = vacations
  }

  // Obtener anticipos descontados en esta liquidación
  const { data: advances } = await supabase
    .from('advances')
    .select('*')
    .eq('payroll_slip_id', slip.id)
    .order('advance_date', { ascending: true })

  // Obtener préstamos descontados en esta liquidación
  const { data: loanPayments } = await supabase
    .from('loan_payments')
    .select(`
      *,
      loans (*)
    `)
    .eq('payroll_slip_id', slip.id)
    .order('installment_number', { ascending: true })

  return <PayrollDetailClient initialSlip={slip} company={company} vacations={periodVacations} advances={advances || []} loanPayments={loanPayments || []} />
}
