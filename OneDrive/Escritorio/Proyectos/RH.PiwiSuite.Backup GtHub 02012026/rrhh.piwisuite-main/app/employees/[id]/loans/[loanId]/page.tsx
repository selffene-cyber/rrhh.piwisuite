'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'

export default function LoanDetailPage({ params }: { params: { id: string, loanId: string } }) {
  const router = useRouter()
  const [loan, setLoan] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Cargar préstamo
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('id, employee_id, amount, total_amount, remaining_amount, installment_amount, installments, paid_installments, interest_rate, loan_date, status, description, created_at')
        .eq('id', params.loanId)
        .single()

      if (loanError) throw loanError
      setLoan(loanData)

      // Cargar empleado
      if (loanData) {
        const { data: empData } = await supabase
          .from('employees')
          .select('id, full_name, rut, company_id')
          .eq('id', loanData.employee_id)
          .single()
        
        if (empData) setEmployee(empData)

        // Cargar pagos
        const { data: paymentsData } = await supabase
          .from('loan_payments')
          .select('*, payroll_slips(*, payroll_periods(*))')
          .eq('loan_id', params.loanId)
          .order('installment_number', { ascending: true })

        setPayments(paymentsData || [])
      }
    } catch (error: any) {
      alert('Error al cargar préstamo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!loan) {
    return <div>Préstamo no encontrado</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Detalle de Préstamo</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/employees/${params.id}/loans/${params.loanId}/pdf`} target="_blank">
            <button>Ver PDF</button>
          </Link>
          <Link href={`/employees/${params.id}/loans`}>
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Datos del Préstamo</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Trabajador</label>
            <p>{employee?.full_name}</p>
          </div>
          <div className="form-group">
            <label>RUT</label>
            <p>{employee?.rut}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha del Préstamo</label>
            <p>{formatDate(loan.loan_date)}</p>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <p>
              <span className={`badge ${loan.status}`}>
                {loan.status === 'active' ? 'Activo' : loan.status === 'paid' ? 'Pagado' : 'Cancelado'}
              </span>
            </p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Monto Solicitado</label>
            <p>${(loan.amount || 0).toLocaleString('es-CL')}</p>
          </div>
          <div className="form-group">
            <label>Tasa de Interés</label>
            <p>{loan.interest_rate || 0}%</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Total a Pagar</label>
            <p style={{ fontWeight: 'bold', fontSize: '18px' }}>${(loan.total_amount || 0).toLocaleString('es-CL')}</p>
          </div>
          <div className="form-group">
            <label>Número de Cuotas</label>
            <p>{loan.installments || 0}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Valor por Cuota</label>
            <p style={{ fontWeight: 'bold' }}>${(loan.installment_amount || 0).toLocaleString('es-CL')}</p>
          </div>
          <div className="form-group">
            <label>Cuotas Pagadas</label>
            <p>{(loan.paid_installments || 0)} / {loan.installments || 0}</p>
          </div>
        </div>
        <div className="form-group">
          <label>Monto Pendiente</label>
          <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#dc2626' }}>
            ${(loan.remaining_amount || 0).toLocaleString('es-CL')}
          </p>
        </div>
        {loan.description && (
          <div className="form-group">
            <label>Descripción</label>
            <p>{loan.description}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Historial de Pagos</h2>
        {payments.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Cuota</th>
                <th>Monto</th>
                <th>Fecha de Pago</th>
                <th>Liquidación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment: any) => (
                <tr key={payment.id}>
                  <td>{payment.installment_number} / {loan.installments}</td>
                  <td>${payment.amount.toLocaleString('es-CL')}</td>
                  <td>{formatDate(payment.payment_date)}</td>
                  <td>
                    {payment.payroll_slips?.payroll_periods 
                      ? `${payment.payroll_slips.payroll_periods.month}/${payment.payroll_slips.payroll_periods.year}`
                      : '-'}
                  </td>
                  <td>
                    {payment.payroll_slip_id && (
                      <Link href={`/payroll/${payment.payroll_slip_id}`}>
                        <button style={{ padding: '4px 8px', fontSize: '12px' }}>Ver Liquidación</button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay pagos registrados aún.</p>
        )}
      </div>
    </div>
  )
}


