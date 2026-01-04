'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'

export default function LoansPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Cargar empleado
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, company_id')
        .eq('id', params.id)
        .single()
      
      if (empData) setEmployee(empData)

      // Cargar préstamos
      const { data: loansData, error } = await supabase
        .from('loans')
        .select('id, employee_id, amount, total_amount, remaining_amount, installment_amount, installments, paid_installments, interest_rate, loan_date, status, issued_at, created_at')
        .eq('employee_id', params.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLoans(loansData || [])
    } catch (error: any) {
      alert('Error al cargar préstamos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleIssue = async (loanId: string) => {
    if (!confirm('¿Estás seguro de que deseas emitir este préstamo?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'active',
          issued_at: new Date().toISOString(),
        })
        .eq('id', loanId)

      if (error) throw error
      loadData()
      alert('Préstamo emitido correctamente')
    } catch (error: any) {
      alert('Error al emitir préstamo: ' + error.message)
    }
  }

  const handleCancel = async (loanId: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar este préstamo?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'cancelled',
        })
        .eq('id', loanId)

      if (error) throw error
      loadData()
      alert('Préstamo cancelado correctamente')
    } catch (error: any) {
      alert('Error al cancelar préstamo: ' + error.message)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Préstamos Internos - {employee?.full_name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/employees/${params.id}/loans/new`}>
            <button>Nuevo Préstamo</button>
          </Link>
          <Link href={`/employees/${params.id}`}>
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Historial de Préstamos</h2>
        {loans.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Interés</th>
                <th>Total</th>
                <th>Cuotas</th>
                <th>Cuota Mensual</th>
                <th>Pagadas</th>
                <th>Pendiente</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan: any) => (
                <tr key={loan.id}>
                  <td>{formatDate(loan.loan_date)}</td>
                  <td>${(loan.amount || 0).toLocaleString('es-CL')}</td>
                  <td>{loan.interest_rate || 0}%</td>
                  <td>${(loan.total_amount || 0).toLocaleString('es-CL')}</td>
                  <td>{loan.installments || 0}</td>
                  <td>${(loan.installment_amount || 0).toLocaleString('es-CL')}</td>
                  <td>{(loan.paid_installments || 0)} / {loan.installments || 0}</td>
                  <td>${(loan.remaining_amount || 0).toLocaleString('es-CL')}</td>
                  <td>
                    <span className={`badge ${loan.status}`}>
                      {loan.status === 'active' ? 'Activo' : loan.status === 'paid' ? 'Pagado' : 'Cancelado'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Link href={`/employees/${params.id}/loans/${loan.id}`}>
                        <button style={{ padding: '4px 8px', fontSize: '12px' }}>Ver</button>
                      </Link>
                      <Link href={`/employees/${params.id}/loans/${loan.id}/pdf`} target="_blank">
                        <button style={{ padding: '4px 8px', fontSize: '12px' }} className="secondary">PDF</button>
                      </Link>
                      {loan.status === 'active' && !loan.issued_at && (
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleIssue(loan.id)}
                        >
                          Emitir
                        </button>
                      )}
                      {loan.status === 'active' && (
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          className="danger"
                          onClick={() => handleCancel(loan.id)}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay préstamos registrados para este trabajador.</p>
        )}
      </div>
    </div>
  )
}


