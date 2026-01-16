'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getCurrentMonthYear } from '@/lib/utils/date'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import { FaMoneyBillWave } from 'react-icons/fa'
import DateInput from '@/components/DateInput'
import MonthInput from '@/components/MonthInput'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function NewAdvancePage() {
  const { companyId } = useCurrentCompany()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    period: `${getCurrentMonthYear().year}-${String(getCurrentMonthYear().month).padStart(2, '0')}`,
    advance_date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: '',
    payment_method: 'transferencia' as 'transferencia' | 'efectivo',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar empleados activos de la empresa
      if (!companyId) {
        setEmployees([])
        return
      }
      
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary, company_id')
        .eq('status', 'active')
        .eq('company_id', companyId)
        .order('full_name')

      if (employeesError) throw employeesError
      setEmployees(employeesData || [])

      // Cargar empresa (usar la del primer empleado o buscar)
      if (employeesData && employeesData.length > 0) {
        const companyId = employeesData[0].company_id
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, rut, address, employer_name')
          .eq('id', companyId)
          .single()

        if (companyData) {
          setCompany(companyData)
        }
      }
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employee_id || !formData.amount) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setSaving(true)

    try {
      const employee = employees.find(e => e.id === formData.employee_id)
      if (!employee) throw new Error('Empleado no encontrado')

      // Obtener company_id del empleado o de la empresa configurada
      let companyId = employee.company_id
      if (!companyId) {
        // Si el empleado no tiene company_id, obtener la primera empresa
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .single()
        
        if (companyData) {
          companyId = companyData.id
        } else {
          throw new Error('No se encontró una empresa configurada. Por favor, configura una empresa primero.')
        }
      }

      const amount = Math.ceil(parseFormattedNumber(formData.amount))

      // Validación: no permitir anticipo mayor al 50% del sueldo base (configurable)
      const maxAdvance = employee.base_salary * 0.5
      if (amount > maxAdvance) {
        if (!confirm(`⚠️ El monto del anticipo ($${amount.toLocaleString('es-CL')}) es mayor al 50% del sueldo base ($${maxAdvance.toLocaleString('es-CL')}). ¿Deseas continuar?`)) {
          setSaving(false)
          return
        }
      }

      // Usar API para crear anticipo (incluye validación de contrato activo)
      const response = await fetch('/api/advances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: formData.employee_id,
          company_id: companyId,
          period: formData.period,
          advance_date: formData.advance_date,
          amount: amount,
          reason: formData.reason || null,
          payment_method: formData.payment_method,
          status: 'borrador',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear anticipo')
      }

      const data = await response.json()
      router.push(`/advances/${data.id}`)
    } catch (error: any) {
      alert('Error al crear anticipo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaMoneyBillWave size={28} color="#f59e0b" />
          Nuevo Anticipo
        </h1>
        <Link href="/advances">
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Datos del Anticipo</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Trabajador *</label>
              <select
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              >
                <option value="">Seleccionar trabajador</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.rut}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Período de Descuento *</label>
              <MonthInput
                value={formData.period}
                onChange={(value) => setFormData({ ...formData, period: value })}
                required
              />
              <small style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                Período en el que se descontará este anticipo en la liquidación
              </small>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha del Anticipo *</label>
              <DateInput
                value={formData.advance_date}
                onChange={(value) => setFormData({ ...formData, advance_date: value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Monto *</label>
              <input
                type="text"
                required
                value={formatNumberForInput(parseFormattedNumber(formData.amount))}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
              />
              {formData.employee_id && (() => {
                const employee = employees.find(e => e.id === formData.employee_id)
                if (employee) {
                  const maxAdvance = employee.base_salary * 0.5
                  return (
                    <small style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                      Máximo recomendado: ${maxAdvance.toLocaleString('es-CL')} (50% del sueldo base)
                    </small>
                  )
                }
                return null
              })()}
            </div>
            <div className="form-group">
              <label>Medio de Pago *</label>
              <select
                required
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as 'transferencia' | 'efectivo' })}
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Motivo / Glosa</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ej: Anticipo de remuneración / Quincena"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Anticipo'}
          </button>
          <Link href="/advances">
            <button type="button" className="secondary">
              Cancelar
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}

