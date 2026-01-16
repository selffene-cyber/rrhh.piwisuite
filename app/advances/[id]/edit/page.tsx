'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import DateInput from '@/components/DateInput'
import MonthInput from '@/components/MonthInput'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import { FaSave, FaTimes } from 'react-icons/fa'

export default function EditAdvancePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [advance, setAdvance] = useState<any>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    period: '',
    advance_date: '',
    amount: '',
    reason: '',
    payment_method: 'transferencia' as 'transferencia' | 'efectivo'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar anticipo
      const { data: advanceData, error: advanceError } = await supabase
        .from('advances')
        .select(`
          *,
          employees (*)
        `)
        .eq('id', params.id)
        .single()

      if (advanceError) throw advanceError
      if (!advanceData) {
        alert('Anticipo no encontrado')
        router.push('/advances')
        return
      }

      // Verificar que el anticipo esté en estado editable
      if (advanceData.status !== 'borrador' && advanceData.status !== 'emitido') {
        alert('Solo se pueden editar anticipos en estado "Borrador" o "Emitido"')
        router.push(`/advances/${params.id}`)
        return
      }

      setAdvance(advanceData)

      // Cargar empleados
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary')
        .eq('status', 'active')
        .order('full_name')

      if (employeesError) throw employeesError
      setEmployees(employeesData || [])

      // Establecer datos del formulario
      const advanceDate = advanceData.advance_date ? new Date(advanceData.advance_date).toISOString().split('T')[0] : ''
      setFormData({
        employee_id: advanceData.employee_id,
        period: advanceData.period || '',
        advance_date: advanceDate,
        amount: formatNumberForInput(Number(advanceData.amount || 0)),
        reason: advanceData.reason || '',
        payment_method: advanceData.payment_method || 'transferencia'
      })
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.employee_id) {
      newErrors.employee_id = 'Debe seleccionar un trabajador'
    }

    if (!formData.period) {
      newErrors.period = 'Debe seleccionar un período'
    }

    if (!formData.advance_date) {
      newErrors.advance_date = 'Debe ingresar una fecha'
    }

    const amount = parseFormattedNumber(formData.amount)
    if (!amount || amount <= 0) {
      newErrors.amount = 'Debe ingresar un monto válido'
    } else {
      // Validar que no exceda el 50% del sueldo base
      const selectedEmployee = employees.find(emp => emp.id === formData.employee_id)
      if (selectedEmployee && selectedEmployee.base_salary) {
        const maxAmount = selectedEmployee.base_salary * 0.5
        if (amount > maxAmount) {
          newErrors.amount = `El anticipo no puede exceder el 50% del sueldo base (máximo: $${formatNumberForInput(maxAmount)})`
        }
      }
    }

    if (!formData.payment_method) {
      newErrors.payment_method = 'Debe seleccionar un medio de pago'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)

      const amount = parseFormattedNumber(formData.amount)

      const { error } = await supabase
        .from('advances')
        .update({
          employee_id: formData.employee_id,
          period: formData.period,
          advance_date: formData.advance_date,
          amount: amount,
          reason: formData.reason || null,
          payment_method: formData.payment_method,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error

      alert('Anticipo actualizado correctamente')
      router.push(`/advances/${params.id}`)
    } catch (error: any) {
      console.error('Error al actualizar anticipo:', error)
      alert('Error al actualizar anticipo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Permitir solo números y puntos
    if (value === '' || /^[\d.]+$/.test(value)) {
      setFormData({ ...formData, amount: value })
      // Limpiar error al cambiar
      if (errors.amount) {
        setErrors({ ...errors, amount: '' })
      }
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!advance) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Anticipo no encontrado</p>
        <Link href="/advances">
          <button>Volver</button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Editar Anticipo</h1>
        <Link href={`/advances/${params.id}`}>
          <button className="secondary">
            <FaTimes size={16} /> Cancelar
          </button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Datos del Anticipo</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="employee_id">
                Trabajador <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => {
                  setFormData({ ...formData, employee_id: e.target.value })
                  if (errors.employee_id) {
                    setErrors({ ...errors, employee_id: '' })
                  }
                }}
                required
                style={{ borderColor: errors.employee_id ? 'red' : undefined }}
              >
                <option value="">Seleccionar trabajador</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.rut}
                  </option>
                ))}
              </select>
              {errors.employee_id && (
                <span style={{ color: 'red', fontSize: '12px' }}>{errors.employee_id}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="period">
                Período (YYYY-MM) <span style={{ color: 'red' }}>*</span>
              </label>
              <MonthInput
                value={formData.period}
                onChange={(value) => {
                  setFormData({ ...formData, period: value })
                  if (errors.period) {
                    setErrors({ ...errors, period: '' })
                  }
                }}
                required
              />
              {errors.period && (
                <span style={{ color: 'red', fontSize: '12px' }}>{errors.period}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="advance_date">
                Fecha del Anticipo <span style={{ color: 'red' }}>*</span>
              </label>
              <DateInput
                value={formData.advance_date}
                onChange={(value) => {
                  setFormData({ ...formData, advance_date: value })
                  if (errors.advance_date) {
                    setErrors({ ...errors, advance_date: '' })
                  }
                }}
                required
              />
              {errors.advance_date && (
                <span style={{ color: 'red', fontSize: '12px' }}>{errors.advance_date}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="amount">
                Monto <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="amount"
                value={formData.amount}
                onChange={handleAmountChange}
                placeholder="Ej: 100.000"
                required
                style={{ borderColor: errors.amount ? 'red' : undefined }}
              />
              {errors.amount && (
                <span style={{ color: 'red', fontSize: '12px' }}>{errors.amount}</span>
              )}
              {formData.employee_id && (() => {
                const selectedEmployee = employees.find(emp => emp.id === formData.employee_id)
                if (selectedEmployee && selectedEmployee.base_salary) {
                  const maxAmount = selectedEmployee.base_salary * 0.5
                  return (
                    <small style={{ color: '#6b7280', fontSize: '12px' }}>
                      Máximo permitido: ${formatNumberForInput(maxAmount)} (50% del sueldo base)
                    </small>
                  )
                }
                return null
              })()}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="payment_method">
                Medio de Pago <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                id="payment_method"
                value={formData.payment_method}
                onChange={(e) => {
                  setFormData({ ...formData, payment_method: e.target.value as 'transferencia' | 'efectivo' })
                  if (errors.payment_method) {
                    setErrors({ ...errors, payment_method: '' })
                  }
                }}
                required
                style={{ borderColor: errors.payment_method ? 'red' : undefined }}
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
              {errors.payment_method && (
                <span style={{ color: 'red', fontSize: '12px' }}>{errors.payment_method}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reason">Motivo / Glosa (Opcional)</label>
              <textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                placeholder="Ej: Anticipo de remuneración / Quincena"
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" disabled={saving} style={{ background: '#10b981', color: 'white' }}>
            <FaSave size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link href={`/advances/${params.id}`}>
            <button type="button" className="secondary" disabled={saving}>
              <FaTimes size={16} /> Cancelar
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}

