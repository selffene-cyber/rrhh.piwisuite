'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import PayrollPDF from '@/components/PayrollPDF'

export default function PayrollPDFPage({ params }: { params: { id: string } }) {
  const [slip, setSlip] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [vacations, setVacations] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: slipData, error: slipError } = await supabase
        .from('payroll_slips')
        .select(`
          *,
          employees (*),
          payroll_periods (*),
          payroll_items (*)
        `)
        .eq('id', params.id)
        .single()

      if (slipError) throw slipError

      // Obtener la empresa del empleado de la liquidación
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', slipData.employee_id)
        .single()

      if (!employee) {
        throw new Error('Empleado no encontrado')
      }

      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', employee.company_id)
        .single()

      setSlip(slipData)

      // Obtener vacaciones del período si existe
      let periodVacations = null
      if (slipData.payroll_periods) {
        const periodStart = new Date(slipData.payroll_periods.year, slipData.payroll_periods.month - 1, 1)
        const periodEnd = new Date(slipData.payroll_periods.year, slipData.payroll_periods.month, 0)
        
        const { data: vacations } = await supabase
          .from('vacations')
          .select('*')
          .eq('employee_id', slipData.employee_id)
          .in('status', ['aprobada', 'tomada'])
          .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)
        
        periodVacations = vacations
      }

      // Obtener préstamos descontados en esta liquidación
      const { data: loanPayments } = await supabase
        .from('loan_payments')
        .select(`
          *,
          loans (*)
        `)
        .eq('payroll_slip_id', slipData.id)
        .order('installment_number', { ascending: true })

      // Obtener anticipos descontados en esta liquidación
      const { data: advances } = await supabase
        .from('advances')
        .select('*')
        .eq('payroll_slip_id', slipData.id)
        .order('advance_date', { ascending: true })

      setCompany(companyData)
      setSlip({ ...slipData, loanPayments: loanPayments || [], advances: advances || [] })
    } catch (error: any) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !slip) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return <PayrollPDF slip={slip} company={company} vacations={vacations} loanPayments={slip?.loanPayments || []} advances={slip?.advances || []} />
}

