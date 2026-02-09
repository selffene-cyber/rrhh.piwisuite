'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { FaEdit, FaTrash, FaTimesCircle, FaCheckCircle } from 'react-icons/fa'

export default function LoanDetailPage({ params }: { params: { id: string, loanId: string } }) {
  const router = useRouter()
  const [loan, setLoan] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

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

  const canEdit = () => {
    if (!loan) return false
    // Solo se puede editar si no tiene pagos y está activo
    const hasPayments = payments.length > 0
    const hasPaidInstallments = loan.paid_installments > 0
    return !hasPayments && !hasPaidInstallments && loan.status === 'active'
  }

  const canDelete = () => {
    if (!loan) return false
    // Solo se puede eliminar si no tiene pagos y está cancelado o activo
    const hasPayments = payments.length > 0
    const hasPaidInstallments = loan.paid_installments > 0
    return !hasPayments && !hasPaidInstallments && (loan.status === 'cancelled' || loan.status === 'active')
  }

  const canCancel = () => {
    if (!loan) return false
    // Solo se puede cancelar si está activo y no está pagado
    return loan.status === 'active' && loan.status !== 'paid'
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({
      loan_date: loan.loan_date,
      amount: loan.amount,
      interest_rate: loan.interest_rate,
      installments: loan.installments,
      description: loan.description || ''
    })
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      // Recalcular total_amount, installment_amount, remaining_amount
      const interestAmount = (Number(editForm.amount) * Number(editForm.interest_rate || 0)) / 100
      const totalAmount = Number(editForm.amount) + interestAmount
      const installmentAmount = totalAmount / Number(editForm.installments)

      const response = await fetch(`/api/loans/${params.loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_date: editForm.loan_date,
          amount: editForm.amount,
          interest_rate: editForm.interest_rate || 0,
          installments: editForm.installments,
          total_amount: totalAmount,
          installment_amount: installmentAmount,
          remaining_amount: totalAmount,
          description: editForm.description
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar préstamo')
      }

      alert('Préstamo actualizado correctamente')
      setIsEditing(false)
      loadData()
    } catch (error: any) {
      alert('Error al actualizar préstamo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar este préstamo?')) {
      return
    }

    try {
      const response = await fetch(`/api/loans/${params.loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cancelar préstamo')
      }

      alert('Préstamo cancelado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al cancelar préstamo: ' + error.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este préstamo? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const response = await fetch(`/api/loans/${params.loanId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar préstamo')
      }

      alert('Préstamo eliminado correctamente')
      router.push(`/employees/${params.id}/loans`)
    } catch (error: any) {
      alert('Error al eliminar préstamo: ' + error.message)
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
        <h1>Detalle de Préstamo {loan.loan_number ? `(${loan.loan_number})` : ''}</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href={`/employees/${params.id}/loans/${params.loanId}/pdf`} target="_blank">
            <button>Ver PDF</button>
          </Link>
          {canEdit() && !isEditing && (
            <button onClick={handleEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaEdit size={14} /> Editar
            </button>
          )}
          {canCancel() && (
            <button onClick={handleCancel} className="warning" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaTimesCircle size={14} /> Cancelar
            </button>
          )}
          {canDelete() && (
            <button onClick={handleDelete} className="danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaTrash size={14} /> Eliminar
            </button>
          )}
          <Link href={`/employees/${params.id}/loans`}>
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Datos del Préstamo</h2>
        {isEditing ? (
          <div>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha del Préstamo *</label>
                <input
                  type="date"
                  value={editForm.loan_date}
                  onChange={(e) => setEditForm({ ...editForm, loan_date: e.target.value })}
                  required
                />
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
                <label>Monto Solicitado *</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tasa de Interés (%)</label>
                <input
                  type="number"
                  value={editForm.interest_rate}
                  onChange={(e) => setEditForm({ ...editForm, interest_rate: e.target.value })}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Número de Cuotas *</label>
                <input
                  type="number"
                  value={editForm.installments}
                  onChange={(e) => setEditForm({ ...editForm, installments: e.target.value })}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button className="secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
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
            {!canEdit() && payments.length === 0 && loan.paid_installments === 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#92400e' }}>
                <strong>Nota:</strong> Este préstamo no se puede editar porque tiene restricciones. Solo se puede cancelar o eliminar si no tiene pagos.
              </div>
            )}
          </>
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


