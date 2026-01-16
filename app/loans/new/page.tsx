'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import DateInput from '@/components/DateInput'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { calculateLegalDiscountLimit, getLegalLimitAlert, getLegalLimitInfo, type LegalLimitCalculation } from '@/lib/services/loanLegalCalculator'
import { createValidationServices } from '@/lib/services/validationHelpers'

export default function NewLoanPage() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [formData, setFormData] = useState({
    amount: '',
    interest_rate: '0',
    installments: '',
    description: '',
    loan_date: new Date().toISOString().split('T')[0],
    authorization_signed: false,
  })
  const [legalCalculation, setLegalCalculation] = useState<LegalLimitCalculation | null>(null)

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    } else {
      setEmployees([])
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (selectedEmployeeId && employees.length > 0) {
      const employee = employees.find(e => e.id === selectedEmployeeId)
      setSelectedEmployee(employee || null)
    } else {
      setSelectedEmployee(null)
    }
  }, [selectedEmployeeId, employees])

  const loadEmployees = async () => {
    try {
      if (!companyId) {
        setEmployees([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary')
        .eq('status', 'active')
        .eq('company_id', companyId)
        .order('full_name')

      if (error) throw error

      setEmployees(data || [])
    } catch (error: any) {
      alert('Error al cargar trabajadores: ' + error.message)
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

  // Calcular límite legal cuando cambian los datos
  useEffect(() => {
    if (selectedEmployee && formData.amount && formData.installments) {
      const { installmentAmount } = calculateLoan()
      const monthlySalary = selectedEmployee.base_salary || 0
      
      // Por defecto asumimos 30 días trabajados (sin licencia)
      // En la liquidación real se calculará con los días reales
      const calculation = calculateLegalDiscountLimit(
        monthlySalary,
        30, // Días trabajados (se ajustará en liquidación)
        0,  // Días de licencia (se ajustará en liquidación)
        installmentAmount
      )
      
      setLegalCalculation(calculation)
    } else {
      setLegalCalculation(null)
    }
  }, [selectedEmployee, formData.amount, formData.installments, formData.interest_rate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!selectedEmployeeId) {
        alert('Por favor selecciona un trabajador')
        return
      }

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

      // Validar autorización si excede el límite legal
      if (legalCalculation?.exceedsLimit && !formData.authorization_signed) {
        const confirm = window.confirm(
          '⚠️ ALERTA LEGAL: La cuota excede el límite del 15% de la remuneración mensual.\n\n' +
          'Según el Código del Trabajo art. 58, se requiere autorización expresa del trabajador.\n\n' +
          '¿El trabajador ha autorizado este préstamo que excede el límite legal?'
        )
        if (!confirm) {
          setSaving(false)
          return
        }
        setFormData({ ...formData, authorization_signed: true })
      }

      // Obtener los IDs de los empleados de la empresa para filtrar préstamos
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)

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

      const exceedsLimit = legalCalculation?.exceedsLimit || false
      const authorizationDate = exceedsLimit && formData.authorization_signed ? formData.loan_date : null

      // Validar que el empleado pueda recibir un préstamo (requiere contrato activo y tipo indefinido)
      const { employee } = createValidationServices(supabase)
      const validation = await employee.canCreateLoan(selectedEmployeeId)
      
      if (!validation.allowed) {
        alert(validation.message)
        setSaving(false)
        return
      }

      // Insertar préstamo
      const { data: newLoan, error } = await supabase
        .from('loans')
        .insert({
          employee_id: selectedEmployeeId,
          company_id: companyId,
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
          exceeds_legal_limit: exceedsLimit,
          authorization_signed: exceedsLimit ? formData.authorization_signed : false,
          authorization_date: authorizationDate,
        })
        .select()
        .single()

      if (error) throw error

      // Crear cuotas individuales
      if (newLoan) {
        const loanDate = new Date(formData.loan_date)
        const installmentsArray = []
        
        for (let i = 1; i <= installments; i++) {
          const dueDate = new Date(loanDate.getFullYear(), loanDate.getMonth() + i, 1)
          installmentsArray.push({
            loan_id: newLoan.id,
            installment_number: i,
            due_month: dueDate.getMonth() + 1,
            due_year: dueDate.getFullYear(),
            amount_expected: installmentAmount,
            amount_applied: 0,
            amount_deferred: 0,
            status: 'pending',
          })
        }

        const { error: installmentsError } = await supabase
          .from('loan_installments')
          .insert(installmentsArray)

        if (installmentsError) {
          console.error('Error al crear cuotas:', installmentsError)
          // No lanzar error, el préstamo ya se creó
        }
      }

      alert('Préstamo creado correctamente')
      router.push('/loans')
    } catch (error: any) {
      alert('Error al crear préstamo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const { totalAmount, installmentAmount } = calculateLoan()

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  if (!companyId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Selecciona una empresa para crear préstamos.</p>
        <Link href="/">
          <button className="secondary" style={{ marginTop: '16px' }}>Volver al Dashboard</button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nuevo Préstamo</h1>
        <Link href="/loans">
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Selección de Trabajador */}
          <div className="form-group">
            <label>Seleccionar Trabajador *</label>
            <select
              required
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}
            >
              <option value="">-- Seleccione un trabajador --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} - {employee.rut} {employee.position ? `(${employee.position})` : ''}
                </option>
              ))}
            </select>
            {selectedEmployee && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  <strong>Trabajador seleccionado:</strong> {selectedEmployee.full_name}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  RUT: {selectedEmployee.rut} | Cargo: {selectedEmployee.position || 'N/A'}
                </p>
              </div>
            )}
          </div>

          {selectedEmployeeId && (
            <>
              {/* Campos en una línea */}
              <div className="form-row">
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
                    placeholder="Ej: 0 o 2.5"
                  />
                  <small style={{ color: '#6b7280', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    0% si no hay interés
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
              </div>

              {/* Descripción abajo */}
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

                  {/* Información y alertas legales */}
                  {legalCalculation && selectedEmployee && (
                    <div style={{ marginTop: '24px', padding: '16px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                        Análisis Legal (Código del Trabajo art. 58)
                      </h4>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                        {getLegalLimitInfo(legalCalculation)}
                      </p>
                      
                      {legalCalculation.exceedsLimit && (
                        <div style={{ 
                          padding: '12px', 
                          background: '#fef3c7', 
                          borderRadius: '6px', 
                          border: '1px solid #f59e0b',
                          marginBottom: '12px'
                        }}>
                          <p style={{ margin: 0, color: '#92400e', fontSize: '13px', fontWeight: '500' }}>
                            ⚠️ {getLegalLimitAlert(legalCalculation)}
                          </p>
                        </div>
                      )}

                      {legalCalculation.exceedsLimit && (
                        <div style={{ marginTop: '12px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={formData.authorization_signed}
                              onChange={(e) => setFormData({ ...formData, authorization_signed: e.target.checked })}
                            />
                            <span style={{ fontSize: '12px', color: '#374151' }}>
                              El trabajador ha autorizado este préstamo que excede el límite legal del 15%
                            </span>
                          </label>
                          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', marginLeft: '24px' }}>
                            Nota: La autorización no elimina la reprogramación automática si la remuneración devengada del mes es insuficiente.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
                <button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear Préstamo'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => router.push('/loans')}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

          {!selectedEmployeeId && (
            <div style={{ marginTop: '24px', padding: '16px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b' }}>
              <p style={{ margin: 0, color: '#92400e' }}>
                Por favor selecciona un trabajador para continuar con la creación del préstamo.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

