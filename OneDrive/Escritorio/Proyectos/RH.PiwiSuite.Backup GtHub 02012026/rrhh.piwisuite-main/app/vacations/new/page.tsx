'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { calculateBusinessDays } from '@/lib/services/vacationCalculator'
import { assignVacationDays, getVacationSummary, hasCompletedOneYear } from '@/lib/services/vacationPeriods'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaUmbrellaBeach, FaArrowLeft } from 'react-icons/fa'

const VACATION_STATUSES = [
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'tomada', label: 'Tomada' },
  { value: 'cancelada', label: 'Cancelada' },
]

export default function NewVacationRequestPage() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [vacationStats, setVacationStats] = useState({
    accumulated: 0,
    used: 0,
    available: 0,
  })
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    days_count: 0,
    status: 'solicitada',
    notes: '',
  })

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    } else {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (formData.employee_id && employees.length > 0) {
      const emp = employees.find(e => e.id === formData.employee_id)
      if (emp) {
        setSelectedEmployee(emp)
        loadVacationStats(emp.id, emp.hire_date)
      }
    } else {
      setSelectedEmployee(null)
      setVacationStats({ accumulated: 0, used: 0, available: 0 })
    }
  }, [formData.employee_id, employees])

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays()
    }
  }, [formData.start_date, formData.end_date])

  const loadEmployees = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, hire_date')
        .in('status', ['active', 'licencia_medica'])
        .eq('company_id', companyId)
        .order('full_name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      alert('Error al cargar trabajadores: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadVacationStats = async (employeeId: string, hireDate: string) => {
    try {
      const summary = await getVacationSummary(employeeId, hireDate)
      setVacationStats({
        accumulated: summary.totalAccumulated,
        used: summary.totalUsed,
        available: summary.totalAvailable,
      })
    } catch (error: any) {
      console.error('Error al cargar estadísticas de vacaciones:', error)
    }
  }

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) {
      setFormData({ ...formData, days_count: 0 })
      return
    }

    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const businessDays = calculateBusinessDays(start, end)
    
    setFormData({ ...formData, days_count: businessDays })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.employee_id) {
        alert('Debes seleccionar un trabajador')
        setSaving(false)
        return
      }

      if (!formData.start_date || !formData.end_date) {
        alert('Debes ingresar fecha de inicio y término')
        setSaving(false)
        return
      }

      if (formData.days_count <= 0) {
        alert('El número de días debe ser mayor a 0')
        setSaving(false)
        return
      }

      // Determinar el año del período (usar el año de la fecha de inicio)
      const startDate = new Date(formData.start_date)
      const periodYear = startDate.getFullYear()

      // Verificar si ha cumplido 1 año de servicio
      const hasCompletedYear = selectedEmployee ? hasCompletedOneYear(selectedEmployee.hire_date) : false
      
      // Si se aprueba o toma, asignar días al período
      let assignedPeriod = null
      if (formData.status === 'aprobada' || formData.status === 'tomada') {
        // Obtener resumen actualizado para validar
        const summary = await getVacationSummary(formData.employee_id, selectedEmployee?.hire_date)
        
        // Alerta informativa si no ha cumplido 1 año pero se otorgan vacaciones
        if (!hasCompletedYear && formData.days_count > 0) {
          const confirmMessage = `⚠️ INFORMACIÓN IMPORTANTE:\n\n` +
            `El trabajador aún no ha cumplido 1 año de servicio (ingreso: ${formatDate(selectedEmployee?.hire_date)}).\n\n` +
            `Según el Código del Trabajo, el derecho completo a vacaciones se consolida al cumplir 1 año.\n\n` +
            `Sin embargo, puede otorgar vacaciones por mutuo acuerdo antes de cumplir el año.\n\n` +
            `¿Desea continuar con la aprobación de estas vacaciones?`
          
          if (!confirm(confirmMessage)) {
            setSaving(false)
            return
          }
        }
        
        // Validar que tenga días disponibles (permitir negativos para períodos futuros o mutuo acuerdo)
        if (formData.days_count > summary.totalAvailable && periodYear <= new Date().getFullYear() && hasCompletedYear) {
          alert(`No tiene suficientes días disponibles. Disponible: ${summary.totalAvailable.toFixed(2)} días`)
          setSaving(false)
          return
        }
        
        // Asignar días al período (siempre al más antiguo primero)
        assignedPeriod = await assignVacationDays(formData.employee_id, formData.days_count, periodYear)
      }

      const { error } = await supabase
        .from('vacations')
        .insert({
          employee_id: formData.employee_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: formData.days_count,
          status: formData.status,
          notes: formData.notes || null,
          request_date: new Date().toISOString().split('T')[0],
          approval_date: (formData.status === 'aprobada' || formData.status === 'tomada') 
            ? new Date().toISOString().split('T')[0] 
            : null,
          period_year: assignedPeriod ? assignedPeriod.period_year : periodYear,
        })

      if (error) throw error

      alert('Solicitud de vacaciones registrada correctamente')
      router.push(`/employees/${formData.employee_id}/vacations`)
    } catch (error: any) {
      alert('Error al guardar solicitud: ' + error.message)
      console.error('Error al guardar solicitud:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaUmbrellaBeach size={28} color="#f59e0b" />
          Nueva Solicitud de Vacaciones
        </h1>
        <Link href="/vacations">
          <button className="secondary">
            <FaArrowLeft style={{ marginRight: '8px' }} />
            Volver
          </button>
        </Link>
      </div>

      <div className="card">
        <h2>Seleccionar Trabajador</h2>
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

        {selectedEmployee && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
              <strong>Trabajador seleccionado:</strong> {selectedEmployee.full_name} ({selectedEmployee.rut})
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Fecha de ingreso: {formatDate(selectedEmployee.hire_date)}
            </p>
          </div>
        )}
      </div>

      {selectedEmployee && (
        <>
          <div className="card" style={{ marginTop: '24px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Resumen de Vacaciones Disponibles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderRadius: '8px',
                border: '2px solid #3b82f6'
              }}>
                <p style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px', fontWeight: '500' }}>
                  TOTAL ACUMULADO
                </p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
                  {vacationStats.accumulated.toFixed(2)} días
                </p>
              </div>
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: '8px',
                border: '2px solid #ef4444'
              }}>
                <p style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px', fontWeight: '500' }}>
                  TOTAL USADO
                </p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#7f1d1d', margin: 0 }}>
                  {vacationStats.used} días
                </p>
              </div>
              <div style={{
                padding: '16px',
                background: vacationStats.available >= 0 
                  ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                  : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: '8px',
                border: vacationStats.available >= 0 ? '2px solid #10b981' : '2px solid #ef4444'
              }}>
                <p style={{ 
                  fontSize: '12px', 
                  color: vacationStats.available >= 0 ? '#065f46' : '#991b1b', 
                  marginBottom: '4px', 
                  fontWeight: '500' 
                }}>
                  TOTAL DISPONIBLE
                </p>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: vacationStats.available >= 0 ? '#064e3b' : '#7f1d1d', 
                  margin: 0 
                }}>
                  {vacationStats.available.toFixed(2)} días
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Datos de la Solicitud</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de Término *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Días Hábiles *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    readOnly
                    value={formData.days_count}
                    style={{ background: '#f9fafb' }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    Calculado automáticamente (excluyendo domingos)
                  </small>
                </div>
                <div className="form-group">
                  <label>Estado *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {VACATION_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Observaciones</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Notas adicionales sobre la solicitud"
                />
              </div>
              {formData.days_count > 0 && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '4px' }}>
                  <strong>Información:</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                    Días disponibles: {vacationStats.available.toFixed(2)} días
                    {formData.days_count > vacationStats.available && (
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                        {' '}⚠️ No tiene suficientes días disponibles
                      </span>
                    )}
                  </p>
                </div>
              )}
              <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                <button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Solicitud'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => router.push('/vacations')}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

