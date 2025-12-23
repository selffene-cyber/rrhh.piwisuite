'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { calculateAccumulatedVacations, calculateBusinessDays, calculateAvailableVacations } from '@/lib/services/vacationCalculator'

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
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (empData) {
        setEmployee(empData)
        
        // Calcular vacaciones acumuladas
        const accumulated = calculateAccumulatedVacations(empData.hire_date)
        setVacationStats(prev => ({ ...prev, accumulated }))
      }

      // Cargar vacaciones
      const { data: vacationsData, error } = await supabase
        .from('vacations')
        .select('*')
        .eq('employee_id', params.id)
        .order('start_date', { ascending: false })

      if (error) throw error
      setVacations(vacationsData || [])

      // Calcular días usados
      const usedDays = vacationsData
        ?.filter((v: any) => v.status === 'aprobada' || v.status === 'tomada')
        .reduce((sum: number, v: any) => sum + v.days_count, 0) || 0

      const available = calculateAvailableVacations(vacationStats.accumulated, usedDays)
      setVacationStats(prev => ({
        accumulated: prev.accumulated,
        used: usedDays,
        available,
      }))
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

      // Validar que tenga días disponibles
      if (formData.status === 'aprobada' || formData.status === 'tomada') {
        if (formData.days_count > vacationStats.available) {
          alert(`No tiene suficientes días disponibles. Disponible: ${vacationStats.available.toFixed(2)} días`)
          setSaving(false)
          return
        }
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

      // Validar días disponibles si se aprueba o toma
      if ((newStatus === 'aprobada' || newStatus === 'tomada') && vacation.status !== 'aprobada' && vacation.status !== 'tomada') {
        const currentUsed = vacations
          .filter((v: any) => (v.status === 'aprobada' || v.status === 'tomada') && v.id !== vacationId)
          .reduce((sum: number, v: any) => sum + v.days_count, 0)
        
        const available = calculateAvailableVacations(vacationStats.accumulated, currentUsed)
        
        if (vacation.days_count > available) {
          alert(`No tiene suficientes días disponibles. Disponible: ${available.toFixed(2)} días`)
          return
        }
      }

      const updateData: any = {
        status: newStatus,
      }

      if (newStatus === 'aprobada' || newStatus === 'tomada') {
        updateData.approval_date = new Date().toISOString().split('T')[0]
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
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
              {vacationStats.available.toFixed(2)} días
            </p>
          </div>
        </div>
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

