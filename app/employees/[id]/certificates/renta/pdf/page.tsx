import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CertificateRentaPDF from '@/components/CertificateRentaPDF'

export default async function CertificateRentaPDFPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string }
  searchParams: { 
    issue_date?: string
    months_period?: string
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

  // Obtener liquidaciones del período solicitado
  const monthsPeriod = parseInt(searchParams.months_period || '3') as 3 | 6 | 12
  const issueDate = searchParams.issue_date || new Date().toISOString().split('T')[0]
  const issueDateObj = new Date(issueDate + 'T00:00:00')
  
  // Calcular fecha de inicio del período (meses hacia atrás)
  const startDate = new Date(issueDateObj)
  startDate.setMonth(startDate.getMonth() - monthsPeriod)
  startDate.setDate(1) // Primer día del mes
  startDate.setHours(0, 0, 0, 0)
  
  // Construir lista de períodos posibles (meses hacia atrás desde la fecha de emisión)
  const periodsToCheck: Array<{ year: number; month: number }> = []
  let currentDate = new Date(startDate)
  
  while (currentDate <= issueDateObj) {
    periodsToCheck.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1
    })
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  // Obtener TODAS las liquidaciones del trabajador (sin filtrar por status primero)
  const { data: allEmployeeSlips } = await supabase
    .from('payroll_slips')
    .select(`
      *,
      payroll_periods (*)
    `)
    .eq('employee_id', params.id)

  let finalPayrollSlips: any[] = []

  if (allEmployeeSlips && allEmployeeSlips.length > 0) {
    // Filtrar solo las emitidas (preferir issued, pero si no hay, usar todas)
    const issuedSlips = allEmployeeSlips.filter(slip => slip.status === 'issued')
    const slipsToUse = issuedSlips.length > 0 ? issuedSlips : allEmployeeSlips
    
    // Ordenar por período (año y mes) de forma ascendente (más antiguo primero)
    slipsToUse.sort((a, b) => {
      // Si ambas tienen período, ordenar por año y mes
      if (a.payroll_periods && b.payroll_periods) {
        const periodA = a.payroll_periods
        const periodB = b.payroll_periods
        if (periodA.year !== periodB.year) {
          return periodA.year - periodB.year
        }
        return periodA.month - periodB.month
      }
      // Si solo una tiene período, la que tiene período va primero
      if (a.payroll_periods && !b.payroll_periods) return -1
      if (!a.payroll_periods && b.payroll_periods) return 1
      // Si ninguna tiene período, ordenar por fecha de creación o emisión
      const dateA = new Date(a.issued_at || a.created_at || 0)
      const dateB = new Date(b.issued_at || b.created_at || 0)
      return dateA.getTime() - dateB.getTime()
    })

    // Obtener las últimas N liquidaciones ordenadas por período
    // Si hay menos liquidaciones que el período solicitado, mostrar TODAS
    if (slipsToUse.length <= monthsPeriod) {
      // Si hay menos o igual liquidaciones que el período, mostrar todas
      finalPayrollSlips = [...slipsToUse]
    } else {
      // Si hay más liquidaciones, tomar las últimas N
      finalPayrollSlips = slipsToUse.slice(-monthsPeriod)
    }
  }

  // Formatear datos para el PDF (ya están ordenadas cronológicamente)
  const payrollData = finalPayrollSlips.map(slip => {
    const period = slip.payroll_periods
    const periodStr = period 
      ? `${period.year}-${String(period.month).padStart(2, '0')}-01`
      : slip.created_at?.split('T')[0] || ''
    
    return {
      period: periodStr,
      baseSalary: Number(slip.base_salary || 0),
      taxableEarnings: Number(slip.total_taxable_earnings || 0),
      legalDeductions: Number(slip.total_legal_deductions || 0),
      netPay: Number(slip.net_pay || 0),
    }
  })

  // Obtener certificado existente (NO crear uno nuevo si ya existe)
  let folioNumber = searchParams.folio_number || ''
  
  if (!folioNumber) {
    // Buscar certificado existente por folio_number si viene en los parámetros
    if (searchParams.folio_number) {
      const { data: certByFolio } = await supabase
        .from('certificates')
        .select('folio_number')
        .eq('folio_number', searchParams.folio_number)
        .eq('employee_id', params.id)
        .maybeSingle()
      
      if (certByFolio?.folio_number) {
        folioNumber = certByFolio.folio_number
      }
    }
    
    // Si aún no hay folio, buscar certificado existente más reciente del mismo tipo, trabajador y fecha
    if (!folioNumber) {
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('folio_number')
        .eq('employee_id', params.id)
        .eq('certificate_type', 'renta')
        .eq('issue_date', issueDate)
        .eq('months_period', monthsPeriod)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingCert?.folio_number) {
        folioNumber = existingCert.folio_number
      }
    }
    // Si no existe, no crear uno nuevo aquí - solo se crea desde el formulario de generación
  }

  // Asegurar que payrollData siempre sea un array
  const safePayrollData = Array.isArray(payrollData) ? payrollData : []

  return (
    <CertificateRentaPDF 
      employee={employee} 
      company={company} 
      issueDate={issueDate}
      monthsPeriod={monthsPeriod}
      payrollData={safePayrollData}
      purpose={searchParams.purpose || ''}
      folioNumber={folioNumber}
    />
  )
}

