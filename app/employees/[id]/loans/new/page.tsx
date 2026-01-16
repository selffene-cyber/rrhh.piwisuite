'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import DateInput from '@/components/DateInput'
import { createValidationServices } from '@/lib/services/validationHelpers'

export default function NewLoanPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [formData, setFormData] = useState({
    amount: '',
    interest_rate: '0',
    installments: '',
    description: '',
    loan_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    loadEmployee()
  }, [])

  const loadEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary, company_id')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setEmployee(data)
    } catch (error: any) {
      alert('Error al cargar trabajador: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateLoan = () => {
    const amount = parseFormattedNumber(formData.amount) || 0
    const interestRate = parseFloat(formData.interest_rate) || 0
    const installments = parseInt(formData.installments) || 1

    if (amount <= 0 || installments <= 0) {
      return {
        totalAmount: 0,
        installmentAmount: 0,
      }
    }

    // Calcular monto total con interés
    const totalAmount = amount * (1 + interestRate / 100)
    const installmentAmount = totalAmount / installments

    return {
      totalAmount,
      installmentAmount,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const amount = parseFormattedNumber(formData.amount)
      const interestRate = parseFloat(formData.interest_rate)
      const installments = parseInt(formData.installments)

      if (amount <= 0) {
        alert('El monto debe ser mayor a 0')
        return
      }

      if (installments <= 0) {
        alert('El número de cuotas debe ser mayor a 0')
        return
      }

      const { totalAmount, installmentAmount } = calculateLoan()

      // Obtener los IDs de los empleados de la empresa para filtrar préstamos
      if (!employee?.company_id) {
        alert('Error: No se pudo determinar la empresa del trabajador')
        return
      }

      const { data: employeesData } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', employee.company_id)

      const employeeIds = employeesData?.map((emp: { id: string }) => emp.id) || []

      // Generar ID correlativo PT-## por empresa
      let loanNumber = 'PT-01'
      if (employeeIds.length > 0) {
        const { data: lastLoan } = await supabase
          .from('loans')
          .select('loan_number')
          .in('employee_id', employeeIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (lastLoan?.loan_number) {
          const lastNumber = parseInt(lastLoan.loan_number.replace('PT-', ''))
          const newNumber = lastNumber + 1
          loanNumber = `PT-${String(newNumber).padStart(2, '0')}`
        }
      }

      // Validar que el empleado pueda recibir un préstamo (requiere contrato activo y tipo indefinido)
      const { employee: employeeValidation } = createValidationServices(supabase)
      const validation = await employeeValidation.canCreateLoan(params.id)
      
      if (!validation.allowed) {
        alert(validation.message)
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('loans')
        .insert({
          employee_id: params.id,
          amount,
          interest_rate: interestRate,
          total_amount: totalAmount,
          installments,
          installment_amount: installmentAmount,
          remaining_amount: totalAmount,
          loan_date: formData.loan_date,
          description: formData.description || null,
          status: 'active',
          loan_number: loanNumber,
        })

      if (error) throw error

      alert('Préstamo creado correctamente')
      router.push(`/employees/${params.id}/loans`)
    } catch (error: any) {
      alert('Error al crear préstamo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const { totalAmount, installmentAmount } = calculateLoan()

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nuevo Préstamo - {employee?.full_name}</h1>
        <Link href={`/employees/${params.id}/loans`}>
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Monto del Préstamo *</label>
            <input
              type="text"
              required
              value={formData.amount ? formatNumberForInput(parseFormattedNumber(formData.amount) || 0) : ''}
              onChange={(e) => {
                const numericValue = parseFormattedNumber(e.target.value)
                if (!isNaN(numericValue)) {
                  setFormData({ ...formData, amount: numericValue.toString() })
                }
              }}
              placeholder="Ej: 500.000"
            />
          </div>

          <div className="form-group">
            <label>Tasa de Interés (%) *</label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              value={formData.interest_rate}
              onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
              placeholder="Ej: 0 (sin interés) o 2.5"
            />
            <small style={{ color: '#6b7280', fontSize: '12px' }}>
              Puede ser 0% si no hay interés
            </small>
          </div>

          <div className="form-group">
            <label>Número de Cuotas *</label>
            <input
              type="number"
              required
              min="1"
              value={formData.installments}
              onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
              placeholder="Ej: 6"
            />
          </div>

          <div className="form-group">
            <label>Fecha del Préstamo *</label>
            <DateInput
              value={formData.loan_date}
              onChange={(value) => setFormData({ ...formData, loan_date: value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Descripción (Opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Préstamo para emergencia médica"
              rows={3}
            />
          </div>

          {/* Resumen del cálculo */}
          {formData.amount && formData.installments && (
            <div className="card" style={{ marginTop: '24px', background: '#f9fafb' }}>
              <h3>Resumen del Préstamo</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Monto Solicitado</label>
                  <p>${(parseFormattedNumber(formData.amount) || 0).toLocaleString('es-CL')}</p>
                </div>
                <div className="form-group">
                  <label>Interés ({formData.interest_rate}%)</label>
                  <p>${(totalAmount - (parseFormattedNumber(formData.amount) || 0)).toLocaleString('es-CL')}</p>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total a Pagar</label>
                  <p style={{ fontWeight: 'bold', fontSize: '18px' }}>
                    ${totalAmount.toLocaleString('es-CL')}
                  </p>
                </div>
                <div className="form-group">
                  <label>Valor por Cuota</label>
                  <p style={{ fontWeight: 'bold', fontSize: '18px' }}>
                    ${installmentAmount.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Préstamo'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => router.back()}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

