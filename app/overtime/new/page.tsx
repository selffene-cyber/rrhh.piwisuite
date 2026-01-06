'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'

export default function NewOvertimePactPage() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    max_daily_hours: 2,
    reason: ''
  })
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    }
  }, [companyId])

  const loadEmployees = async () => {
    if (!companyId) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, position')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      alert('Error al cargar trabajadores: ' + error.message)
    }
  }

  const validate = () => {
    const newErrors: any = {}

    if (!formData.employee_id) {
      newErrors.employee_id = 'Debe seleccionar un trabajador'
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Debe ingresar fecha de inicio'
    }

    if (!formData.end_date) {
      newErrors.end_date = 'Debe ingresar fecha de término'
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)

      if (end < start) {
        newErrors.end_date = 'La fecha de término debe ser mayor a la fecha de inicio'
      }

      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 90) {
        newErrors.end_date = 'La duración máxima del pacto es de 90 días (3 meses) según art. 32 Código del Trabajo'
      }
    }

    if (!formData.reason || formData.reason.trim().length < 10) {
      newErrors.reason = 'Debe ingresar un motivo con al menos 10 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    if (!companyId) {
      alert('Debe seleccionar una empresa')
      return
    }

    setSaving(true)

    try {
      // Usar API para crear pacto (incluye validación de contrato activo)
      const response = await fetch('/api/overtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          employee_id: formData.employee_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          max_daily_hours: formData.max_daily_hours,
          reason: formData.reason.trim(),
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear pacto')
      }

      const data = await response.json()
      alert('Pacto creado correctamente')
      router.push(`/overtime/${data.id}`)
    } catch (error: any) {
      console.error('Error al crear pacto:', error)
      alert('Error al crear pacto: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStartDateChange = (date: string) => {
    setFormData({ ...formData, start_date: date })
    
    // Si hay fecha de término y es menor a la nueva fecha de inicio, ajustarla
    if (formData.end_date && date > formData.end_date) {
      const start = new Date(date)
      const maxEnd = new Date(start)
      maxEnd.setDate(maxEnd.getDate() + 90)
      setFormData({ ...formData, start_date: date, end_date: maxEnd.toISOString().split('T')[0] })
    }
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h1>Nuevo Pacto de Horas Extra</h1>
        <button onClick={() => router.back()} className="secondary">
          Volver
        </button>
      </div>

      <div className="card">
        <h2>Información del Pacto</h2>
        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
          Según el art. 32 del Código del Trabajo, los pactos de horas extraordinarias deben constar por escrito,
          tener una duración máxima de 3 meses y pueden renovarse sucesivamente si persiste la necesidad.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Trabajador *</label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                required
              >
                <option value="">Seleccionar trabajador</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.rut}
                  </option>
                ))}
              </select>
              {errors.employee_id && (
                <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.employee_id}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Inicio *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
              />
              {errors.start_date && (
                <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.start_date}</span>
              )}
            </div>
            <div className="form-group">
              <label>Fecha de Término *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                max={formData.start_date ? (() => {
                  const start = new Date(formData.start_date)
                  const max = new Date(start)
                  max.setDate(max.getDate() + 90)
                  return max.toISOString().split('T')[0]
                })() : undefined}
                required
              />
              {errors.end_date && (
                <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.end_date}</span>
              )}
              {formData.start_date && formData.end_date && (
                <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                  Duración: {Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24))} días
                  (Máximo: 90 días según ley)
                </small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Máximo Horas Extra por Día *</label>
              <select
                value={formData.max_daily_hours}
                onChange={(e) => setFormData({ ...formData, max_daily_hours: parseInt(e.target.value) })}
                required
              >
                <option value="1">1 hora</option>
                <option value="2">2 horas (máximo legal)</option>
              </select>
              <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Según art. 30 Código del Trabajo, máximo 2 horas extra por día
              </small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ width: '100%' }}>
              <label>Motivo del Pacto *</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
                placeholder="Describa las necesidades temporales de la empresa que justifican las horas extraordinarias..."
                required
              />
              {errors.reason && (
                <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.reason}</span>
              )}
              <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Mínimo 10 caracteres. Debe describir las necesidades temporales que justifican el pacto.
              </small>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Pacto'}
            </button>
            <button type="button" onClick={() => router.back()} className="secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

