import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReliquidationPDFClient from './pdf-client'

export const revalidate = 0

export default async function ReliquidationPDFPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  
  const { data: reliquidation, error } = await supabase
    .from('payroll_reliquidations')
    .select(`
      *,
      employees (*),
      payroll_periods (*),
      payroll_slips!payroll_reliquidations_reference_payroll_slip_id_fkey (
        *,
        employees (*),
        payroll_periods (*),
        payroll_items (*)
      ),
      payroll_reliquidation_items (*),
      payroll_reliquidation_deltas (*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !reliquidation) {
    notFound()
  }

  // Si no hay delta en la relación, intentar obtenerlo directamente
  if (!reliquidation.payroll_reliquidation_deltas || 
      (Array.isArray(reliquidation.payroll_reliquidation_deltas) && reliquidation.payroll_reliquidation_deltas.length === 0)) {
    const { data: deltaData } = await supabase
      .from('payroll_reliquidation_deltas')
      .select('*')
      .eq('reliquidation_id', params.id)
      .maybeSingle()
    
    if (deltaData) {
      reliquidation.payroll_reliquidation_deltas = deltaData
    }
  }

  // Si no hay items en la relación, intentar obtenerlos directamente
  if (!reliquidation.payroll_reliquidation_items || 
      (Array.isArray(reliquidation.payroll_reliquidation_items) && reliquidation.payroll_reliquidation_items.length === 0)) {
    const { data: itemsData } = await supabase
      .from('payroll_reliquidation_items')
      .select('*')
      .eq('reliquidation_id', params.id)
    
    if (itemsData) {
      reliquidation.payroll_reliquidation_items = itemsData
    }
  }

  // Obtener empresa
  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', reliquidation.employee_id)
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

  return (
    <ReliquidationPDFClient
      reliquidation={reliquidation as any}
      company={company}
    />
  )
}
