import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DisciplinaryActionPDF from '@/components/DisciplinaryActionPDF'

export default async function DisciplinaryActionPDFPage({ 
  params 
}: { 
  params: { id: string, actionId: string } 
}) {
  const supabase = await createServerClient()
  
  // Cargar amonestación
  const { data: action, error: actionError } = await supabase
    .from('disciplinary_actions')
    .select('*')
    .eq('id', params.actionId)
    .single()

  if (actionError || !action) {
    notFound()
  }

  // Cargar empleado
  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, rut, position, hire_date, company_id')
    .eq('id', action.employee_id)
    .single()

  if (!employee || !employee.company_id) {
    notFound()
  }

  // Cargar empresa
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, rut, address, employer_name, city')
    .eq('id', employee.company_id)
    .single()

  if (!company) {
    notFound()
  }

  // Cargar regla RIOHS si existe
  let riohsRule = null
  if (action.riohs_rule_id) {
    const { data: ruleData } = await supabase
      .from('riohs_rules')
      .select('*')
      .eq('id', action.riohs_rule_id)
      .single()
    
    if (ruleData) {
      riohsRule = ruleData
    }
  }

  return (
    <DisciplinaryActionPDF 
      action={action} 
      employee={employee} 
      company={company}
      riohsRule={riohsRule}
    />
  )
}

