'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import {
  SCHEDULE_TYPE_LABELS,
  type ScheduleType,
  type WorkSchedule,
} from '@/lib/utils/attendanceTypes'
import { FaPlus, FaEdit, FaClock } from 'react-icons/fa'
import { ACTIVE_STATUSES } from '@/lib/utils/employeeStatus'

const DAY_FIELDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

interface ScheduleFormData {
  employee_id: string
  name: string
  schedule_type: ScheduleType
  weekly_hours: number
  lunch_break_minutes: number
  tolerance_minutes: number
  effective_from: string
  effective_to: string
  is_default: boolean
  [key: string]: any
}

const DEFAULT_FORM: ScheduleFormData = {
  employee_id: '',
  name: 'Horario Personalizado',
  schedule_type: 'ordinary',
  weekly_hours: 45,
  lunch_break_minutes: 60,
  tolerance_minutes: 10,
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: '',
  is_default: true,
  monday_start: '09:00', monday_end: '18:00',
  tuesday_start: '09:00', tuesday_end: '18:00',
  wednesday_start: '09:00', wednesday_end: '18:00',
  thursday_start: '09:00', thursday_end: '18:00',
  friday_start: '09:00', friday_end: '18:00',
  saturday_start: '', saturday_end: '',
  sunday_start: '', sunday_end: '',
}

export default function SchedulesPage() {
  const { companyId } = useCurrentCompany()
  const [schedules, setSchedules] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ScheduleFormData>({ ...DEFAULT_FORM })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [schedRes, empRes] = await Promise.all([
        supabase
          .from('work_schedules')
          .select('*, employees (id, full_name, rut, position)')
          .eq('company_id', companyId)
          .order('effective_from', { ascending: false }),
        supabase
          .from('employees')
          .select('id, full_name, rut, position, status')
          .eq('company_id', companyId)
          .in('status', ACTIVE_STATUSES)
          .order('full_name'),
      ])
      setSchedules(schedRes.data || [])
      setEmployees(empRes.data || [])
    } catch (err) {
      console.error('Error loading schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    if (!companyId || !form.employee_id) return
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        employee_id: form.employee_id,
        company_id: companyId,
        name: form.name,
        schedule_type: form.schedule_type,
        weekly_hours: form.weekly_hours,
        lunch_break_minutes: form.lunch_break_minutes,
        tolerance_minutes: form.tolerance_minutes,
        effective_from: form.effective_from,
        effective_to: form.effective_to || null,
        is_default: form.is_default,
      }

      for (const day of DAY_FIELDS) {
        payload[`${day}_start`] = form[`${day}_start`] || null
        payload[`${day}_end`] = form[`${day}_end`] || null
      }

      if (editingId) {
        const { error } = await supabase
          .from('work_schedules')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('work_schedules')
          .insert(payload)
        if (error) throw error
      }

      setShowForm(false)
      setEditingId(null)
      setForm({ ...DEFAULT_FORM })
      await loadData()
    } catch (err: any) {
      alert('Error al guardar horario: ' + (err.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (schedule: any) => {
    setEditingId(schedule.id)
    const dayEntries: Record<string, string> = {}
    for (const d of DAY_FIELDS) {
      dayEntries[`${d}_start`] = schedule[`${d}_start`] || ''
      dayEntries[`${d}_end`] = schedule[`${d}_end`] || ''
    }
    setForm({
      ...DEFAULT_FORM,
      employee_id: schedule.employee_id,
      name: schedule.name,
      schedule_type: schedule.schedule_type,
      weekly_hours: schedule.weekly_hours,
      lunch_break_minutes: schedule.lunch_break_minutes,
      tolerance_minutes: schedule.tolerance_minutes,
      effective_from: schedule.effective_from,
      effective_to: schedule.effective_to || '',
      is_default: schedule.is_default,
      ...dayEntries,
    })
    setShowForm(true)
  }

  const groupedSchedules = schedules.reduce((acc: Record<string, any[]>, s: any) => {
    const key = s.employee_id
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Horarios de Trabajo</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Configura los horarios de jornada de cada trabajador
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...DEFAULT_FORM }) }}>
          <FaPlus /> Nuevo Horario
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '24px' }}>Cargando horarios...</p>
        ) : schedules.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
            No hay horarios configurados. Crea el primer horario.
          </p>
        ) : (
          Object.entries(groupedSchedules).map(([empId, scheds]) => {
            const emp = scheds[0]?.employees
            return (
              <div key={empId} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {emp?.full_name || 'N/A'}
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>{emp?.rut}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scheds.map((sched) => (
                    <div key={sched.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb',
                      flexWrap: 'wrap', gap: '8px',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{sched.name}</strong>
                          {sched.is_default && (
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: '#dbeafe', color: '#1d4ed8' }}>
                              Predeterminado
                            </span>
                          )}
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: '#f3f4f6', color: '#374151' }}>
                            {SCHEDULE_TYPE_LABELS[sched.schedule_type as ScheduleType] || sched.schedule_type}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          {sched.weekly_hours}h semanales · {sched.lunch_break_minutes}min colación · {sched.tolerance_minutes}min tolerancia
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                          Desde: {sched.effective_from}{sched.effective_to ? ` · Hasta: ${sched.effective_to}` : ' · Vigente'}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {DAY_FIELDS.map(day => {
                            const start = sched[`${day}_start`]
                            const end = sched[`${day}_end`]
                            if (!start || !end) return null
                            return (
                              <span key={day} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: start ? '#ecfdf5' : '#f9fafb', color: start ? '#065f46' : '#9ca3af' }}>
                                {DAY_LABELS[day].slice(0, 3)} {start}-{end}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => startEdit(sched)}
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        <FaEdit /> Editar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Schedule Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>{editingId ? 'Editar Horario' : 'Nuevo Horario'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="form-group">
              <label>Trabajador *</label>
              <select
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                disabled={!!editingId}
                required
              >
                <option value="">Seleccionar trabajador</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.rut})</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nombre del Horario</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Horario Oficina"
                />
              </div>
              <div className="form-group">
                <label>Tipo de Jornada</label>
                <select value={form.schedule_type} onChange={(e) => setForm({ ...form, schedule_type: e.target.value as ScheduleType })}>
                  {Object.entries(SCHEDULE_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Horas Semanales</label>
                <input type="number" value={form.weekly_hours} onChange={(e) => setForm({ ...form, weekly_hours: Number(e.target.value) })} min={1} max={60} />
              </div>
              <div className="form-group">
                <label>Colación (min)</label>
                <input type="number" value={form.lunch_break_minutes} onChange={(e) => setForm({ ...form, lunch_break_minutes: Number(e.target.value) })} min={0} />
              </div>
              <div className="form-group">
                <label>Tolerancia (min)</label>
                <input type="number" value={form.tolerance_minutes} onChange={(e) => setForm({ ...form, tolerance_minutes: Number(e.target.value) })} min={0} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Vigencia Desde</label>
                <input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Vigencia Hasta</label>
                <input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              <span style={{ fontSize: '14px' }}>Establecer como horario predeterminado</span>
            </label>

            <h4 style={{ marginBottom: '12px' }}>Días y Horarios</h4>
            {DAY_FIELDS.map(day => (
              <div key={day} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{DAY_LABELS[day]}</span>
                <input
                  type="time"
                  value={form[`${day}_start`] || ''}
                  onChange={(e) => setForm({ ...form, [`${day}_start`]: e.target.value })}
                  placeholder="Inicio"
                />
                <input
                  type="time"
                  value={form[`${day}_end`] || ''}
                  onChange={(e) => setForm({ ...form, [`${day}_end`]: e.target.value })}
                  placeholder="Fin"
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="secondary" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.employee_id}>
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Horario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}