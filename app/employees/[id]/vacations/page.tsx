'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { calculateAccumulatedVacations, calculateBusinessDays, calculateAvailableVacations } from '@/lib/services/vacationCalculator'
import { assignVacationDays, syncVacationPeriods, getVacationSummary, hasCompletedOneYear, getVacationPeriods } from '@/lib/services/vacationPeriods'
import { createValidationServices } from '@/lib/services/validationHelpers'

const VACATION_STATUSES = [
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'tomada', label: 'Tomada' },
  { value: 'cancelada', label: 'Cancelada' },
]

export default function VacationsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [vacations, setVacations] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [vacationStats, setVacationStats] = useState({
    accumulated: 0,
    used: 0,
    available: 0,
  })
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    days_count: 0,
    status: 'solicitada',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Cargar empleado
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, hire_date, company_id')
        .eq('id', params.id)
        .single()
      
      if (empData) {
        setEmployee(empData)
        
        // Sincronizar períodos de vacaciones
        await syncVacationPeriods(empData.id, empData.hire_date)
        
        // Obtener resumen de vacaciones (usando cálculo por años de servicio)
        const summary = await getVacationSummary(empData.id, empData.hire_date)
        
        setVacationStats({
          accumulated: summary.totalAccumulated,
          used: summary.totalUsed,
          available: summary.totalAvailable,
        })
      }

      // Cargar vacaciones
      const { data: vacationsData, error } = await supabase
        .from('vacations')
        .select('id, employee_id, start_date, end_date, days_count, status, created_at, updated_at')
        .eq('employee_id', params.id)
        .order('start_date', { ascending: false })

      if (error) throw error
      setVacations(vacationsData || [])
    } catch (error: any) {
      alert('Error al cargar vacaciones: ' + error.message)
    } finally {
      setLoading(false)
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

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays()
    }
  }, [formData.start_date, formData.end_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.start_date || !formData.end_date) {
        alert('Debes ingresar fecha de inicio y término')
        return
      }

      if (formData.days_count <= 0) {
        alert('El número de días debe ser mayor a 0')
        return
      }

      // Determinar el año del período (usar el año de la fecha de inicio)
      const startDate = new Date(formData.start_date)
      const periodYear = startDate.getFullYear()

      // Verificar si ha cumplido 1 año de servicio
      const hasCompletedYear = employee ? hasCompletedOneYear(employee.hire_date) : false
      
      // Si se aprueba o toma, asignar días al período
      let assignedPeriod = null
      if (formData.status === 'aprobada' || formData.status === 'tomada') {
        // Obtener resumen actualizado para validar
        const summary = await getVacationSummary(params.id, employee?.hire_date)
        
        // Alerta informativa si no ha cumplido 1 año pero se otorgan vacaciones
        if (!hasCompletedYear && formData.days_count > 0) {
          const confirmMessage = `⚠️ INFORMACIÓN IMPORTANTE:\n\n` +
            `El trabajador aún no ha cumplido 1 año de servicio (ingreso: ${formatDate(employee?.hire_date)}).\n\n` +
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
        assignedPeriod = await assignVacationDays(params.id, formData.days_count, periodYear)
      }

      // Validar que el empleado pueda recibir una vacación (requiere contrato activo)
      const { employee: employeeValidation } = createValidationServices(supabase)
      const validation = await employeeValidation.canCreateVacation(params.id)
      
      if (!validation.allowed) {
        alert(validation.message)
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('vacations')
        .insert({
          employee_id: params.id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: formData.days_count,
          status: formData.status,
          notes: formData.notes || null,
          request_date: new Date().toISOString().split('T')[0],
          approval_date: (formData.status === 'aprobada' || formData.status === 'tomada') 
            ? new Date().toISOString().split('T')[0] 
            : null,
          period_year: assignedPeriod ? assignedPeriod.period_year : periodYear, // Asignar período
        })

      if (error) throw error

      alert('Vacación registrada correctamente')
      setShowForm(false)
      setFormData({
        start_date: '',
        end_date: '',
        days_count: 0,
        status: 'solicitada',
        notes: '',
      })
      loadData()
    } catch (error: any) {
      alert('Error al registrar vacación: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (vacationId: string, newStatus: string) => {
    try {
      const vacation = vacations.find((v: any) => v.id === vacationId)
      if (!vacation) return

      const wasApprovedOrTaken = vacation.status === 'aprobada' || vacation.status === 'tomada'
      const willBeApprovedOrTaken = newStatus === 'aprobada' || newStatus === 'tomada'

      // Si estaba aprobada/tomada y ahora no, revertir días
      if (wasApprovedOrTaken && !willBeApprovedOrTaken) {
        const periodYear = vacation.period_year || new Date(vacation.start_date).getFullYear()
        await assignVacationDays(params.id, -vacation.days_count, periodYear)
      }

      // Si no estaba aprobada/tomada y ahora sí, asignar días
      if (!wasApprovedOrTaken && willBeApprovedOrTaken) {
        const summary = await getVacationSummary(params.id, employee?.hire_date)
        const periodYear = vacation.period_year || new Date(vacation.start_date).getFullYear()
        
        // Verificar si ha cumplido 1 año de servicio
        const hasCompletedYear = employee ? hasCompletedOneYear(employee.hire_date) : false
        
        // Alerta informativa si no ha cumplido 1 año pero se otorgan vacaciones
        if (!hasCompletedYear && vacation.days_count > 0) {
          const confirmMessage = `⚠️ INFORMACIÓN IMPORTANTE:\n\n` +
            `El trabajador aún no ha cumplido 1 año de servicio (ingreso: ${formatDate(employee?.hire_date)}).\n\n` +
            `Según el Código del Trabajo, el derecho completo a vacaciones se consolida al cumplir 1 año.\n\n` +
            `Sin embargo, puede otorgar vacaciones por mutuo acuerdo antes de cumplir el año.\n\n` +
            `¿Desea continuar con la aprobación de estas vacaciones?`
          
          if (!confirm(confirmMessage)) {
            return
          }
        }
        
        // Validar días disponibles (permitir negativos para períodos futuros o mutuo acuerdo)
        if (vacation.days_count > summary.totalAvailable && periodYear <= new Date().getFullYear() && hasCompletedYear) {
          alert(`No tiene suficientes días disponibles. Disponible: ${summary.totalAvailable.toFixed(2)} días`)
          return
        }
        
        await assignVacationDays(params.id, vacation.days_count, periodYear)
      }

      const updateData: any = {
        status: newStatus,
      }

      if (newStatus === 'aprobada' || newStatus === 'tomada') {
        updateData.approval_date = new Date().toISOString().split('T')[0]
        // Asegurar que tenga period_year
        if (!vacation.period_year) {
          updateData.period_year = new Date(vacation.start_date).getFullYear()
        }
      }

      const { error } = await supabase
        .from('vacations')
        .update(updateData)
        .eq('id', vacationId)

      if (error) throw error

      loadData()
    } catch (error: any) {
      alert('Error al actualizar estado: ' + error.message)
    }
  }

  const handleDelete = async (vacationId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta vacación?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('vacations')
        .delete()
        .eq('id', vacationId)

      if (error) throw error

      loadData()
      alert('Vacación eliminada correctamente')
    } catch (error: any) {
      alert('Error al eliminar vacación: ' + error.message)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Vacaciones - {employee?.full_name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nueva Solicitud'}
          </button>
          <Link href={`/employees/${params.id}`}>
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      {/* Resumen de vacaciones */}
      <div className="card" style={{ marginBottom: '24px', background: '#f0f9ff', border: '1px solid #0ea5e9' }}>
        <h2 style={{ marginBottom: '16px' }}>Resumen de Vacaciones</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Días Acumulados</label>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>
              {vacationStats.accumulated.toFixed(2)} días
            </p>
            <small style={{ color: '#6b7280', fontSize: '12px' }}>
              Calculado desde {formatDate(employee?.hire_date)} (1.25 días por mes)
            </small>
          </div>
          <div className="form-group">
            <label>Días Usados</label>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
              {vacationStats.used} días
            </p>
          </div>
          <div className="form-group">
            <label>Días Disponibles</label>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: vacationStats.available >= 0 ? '#059669' : '#dc2626' }}>
              {vacationStats.available.toFixed(2)} días
            </p>
            {vacationStats.available < 0 && (
              <small style={{ color: '#dc2626', fontSize: '12px' }}>
                (Días de períodos futuros)
              </small>
            )}
          </div>
        </div>
      </div>

      {/* Períodos de vacaciones */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Períodos de Vacaciones</h2>
        <VacationPeriodsDisplay employeeId={params.id} />
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Nueva Solicitud de Vacaciones</h2>
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
                onClick={() => {
                  setShowForm(false)
                  setFormData({
                    start_date: '',
                    end_date: '',
                    days_count: 0,
                    status: 'solicitada',
                    notes: '',
                  })
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Historial de Vacaciones</h2>
        {vacations.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Fecha Inicio</th>
                <th>Fecha Término</th>
                <th>Días</th>
                <th>Estado</th>
                <th>Período</th>
                <th>Fecha Solicitud</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vacations.map((vacation: any) => (
                <tr key={vacation.id}>
                  <td>{formatDate(vacation.start_date)}</td>
                  <td>{formatDate(vacation.end_date)}</td>
                  <td>{vacation.days_count}</td>
                  <td>
                    <span className={`badge ${vacation.status}`}>
                      {VACATION_STATUSES.find(s => s.value === vacation.status)?.label || vacation.status}
                    </span>
                  </td>
                  <td>
                    {vacation.period_year ? (
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>
                        Período {vacation.period_year}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                    )}
                  </td>
                  <td>{formatDate(vacation.request_date)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <Link 
                        href={`/employees/${params.id}/vacations/${vacation.id}/pdf`}
                        target="_blank"
                      >
                        <button style={{ padding: '4px 8px', fontSize: '12px' }}>
                          Ver PDF
                        </button>
                      </Link>
                      {vacation.status === 'solicitada' && (
                        <>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => handleStatusChange(vacation.id, 'aprobada')}
                          >
                            Aprobar
                          </button>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            className="danger"
                            onClick={() => handleStatusChange(vacation.id, 'rechazada')}
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      {vacation.status === 'aprobada' && (
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleStatusChange(vacation.id, 'tomada')}
                        >
                          Marcar como Tomada
                        </button>
                      )}
                      <button
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        className="danger"
                        onClick={() => handleDelete(vacation.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay vacaciones registradas para este trabajador.</p>
        )}
      </div>
    </div>
  )
}

// Componente para mostrar períodos de vacaciones
function VacationPeriodsDisplay({ employeeId }: { employeeId: string }) {
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPeriods()
  }, [employeeId])

  const loadPeriods = async () => {
    try {
      const periodsData = await getVacationPeriods(employeeId)
      setPeriods(periodsData)
    } catch (error: any) {
      console.error('Error al cargar períodos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <p style={{ color: '#6b7280' }}>Cargando períodos...</p>
  }

  if (periods.length === 0) {
    return <p style={{ color: '#6b7280' }}>No hay períodos de vacaciones registrados.</p>
  }

  return (
    <table style={{ width: '100%' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '12px' }}>Año</th>
          <th style={{ textAlign: 'right', padding: '12px' }}>Acumulado</th>
          <th style={{ textAlign: 'right', padding: '12px' }}>Usado</th>
          <th style={{ textAlign: 'right', padding: '12px' }}>Disponible</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((period: any) => (
          <tr key={period.id}>
            <td style={{ padding: '12px', fontWeight: '500' }}>{period.period_year}</td>
            <td style={{ padding: '12px', textAlign: 'right', color: '#0369a1' }}>
              {period.accumulated_days.toFixed(2)} días
            </td>
            <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>
              {period.used_days} días
            </td>
            <td style={{ 
              padding: '12px', 
              textAlign: 'right', 
              fontWeight: 'bold',
              color: period.available_days >= 0 ? '#059669' : '#dc2626' 
            }}>
              {period.available_days.toFixed(2)} días
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

