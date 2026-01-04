'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function NewSettlementPage() {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [employees, setEmployees] = useState<any[]>([])
  const [causes, setCauses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    termination_date: new Date().toISOString().split('T')[0],
    cause_code: '',
    notice_given: false,
    notice_days: 0,
    notes: ''
  })

  useEffect(() => {
    if (currentCompany) {
      loadEmployees()
      loadCauses()
    }
  }, [currentCompany])

  const loadEmployees = async () => {
    if (!currentCompany) return

    const { data } = await supabase
      .from('employees')
      .select('id, full_name, rut, hire_date, base_salary')
      .eq('company_id', currentCompany.id)
      .order('full_name')

    if (data) {
      setEmployees(data)
    }
  }

  const loadCauses = async () => {
    try {
      const response = await fetch('/api/settlements/causes')
      const data = await response.json()
      if (response.ok) {
        setCauses(data.causes || [])
      }
    } catch (error) {
      console.error('Error al cargar causales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeChange = async (employeeId: string) => {
    if (!employeeId) {
      setEmployeeData(null)
      return
    }

    try {
      const response = await fetch(`/api/settlements/employee/${employeeId}/data?termination_date=${formData.termination_date}`)
      const data = await response.json()
      if (response.ok) {
        setEmployeeData(data.data)
      }
    } catch (error: any) {
      alert('Error al cargar datos del trabajador: ' + error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employee_id || !formData.cause_code) {
      alert('Complete todos los campos requeridos')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/settlements/${data.settlement.id}`)
      } else {
        alert('Error al crear finiquito: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!currentCompany) {
    return (
      <div className="card">
        <p>Seleccione una empresa para crear un finiquito.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card">
        <p>Cargando...</p>
      </div>
    )
  }

  const selectedCause = causes.find(c => c.code === formData.cause_code)

  return (
    <div style={{ maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '24px' }}>Nuevo Finiquito</h1>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Datos del Finiquito</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Trabajador *
              </label>
              <select
                value={formData.employee_id}
                onChange={(e) => {
                  setFormData({ ...formData, employee_id: e.target.value })
                  handleEmployeeChange(e.target.value)
                }}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleccione un trabajador</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.rut}
                  </option>
                ))}
              </select>
            </div>

            {employeeData && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                background: '#f3f4f6', 
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                <strong>Datos del trabajador:</strong>
                <div style={{ marginTop: '8px' }}>
                  <div>Último sueldo: ${employeeData.last_salary_monthly?.toLocaleString('es-CL')}</div>
                  <div>Vacaciones pendientes: {employeeData.vacation_days_pending?.toFixed(2)} días</div>
                  <div>Préstamos pendientes: ${employeeData.loan_balance?.toLocaleString('es-CL')}</div>
                  <div>Anticipos pendientes: ${employeeData.advance_balance?.toLocaleString('es-CL')}</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Fecha de Término *
              </label>
              <input
                type="date"
                value={formData.termination_date}
                onChange={(e) => {
                  setFormData({ ...formData, termination_date: e.target.value })
                  if (formData.employee_id) {
                    handleEmployeeChange(formData.employee_id)
                  }
                }}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Causal de Término *
              </label>
              <select
                value={formData.cause_code}
                onChange={(e) => setFormData({ ...formData, cause_code: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleccione una causal</option>
                {causes.map(cause => (
                  <option key={cause.code} value={cause.code}>
                    {cause.article} - {cause.label}
                  </option>
                ))}
              </select>
              {selectedCause && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  {selectedCause.description}
                  {selectedCause.has_ias && <div>✓ Incluye Indemnización por Años de Servicio</div>}
                  {selectedCause.has_iap && <div>✓ Incluye Indemnización por Aviso Previo</div>}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                fontSize: '14px', 
                fontWeight: '500',
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <div style={{
                  position: 'relative',
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: formData.notice_given ? '#3b82f6' : '#d1d5db',
                  transition: 'background-color 0.2s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: formData.notice_given ? '26px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                </div>
                <span>Se dio aviso previo</span>
                <input
                  type="checkbox"
                  checked={formData.notice_given}
                  onChange={(e) => setFormData({ ...formData, notice_given: e.target.checked })}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
              </label>
            </div>

            {formData.notice_given && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Días de aviso previo
                </label>
                <input
                  type="number"
                  value={formData.notice_days}
                  onChange={(e) => setFormData({ ...formData, notice_days: parseInt(e.target.value) || 0 })}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Notas (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: '10px 20px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Guardando...' : 'Crear Finiquito'}
            </button>
          </div>
        </form>
      </div>
  )
}

