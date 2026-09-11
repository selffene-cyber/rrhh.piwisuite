'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import Link from 'next/link'
import {
  FaCalendarAlt, FaUser, FaClock, FaCheckCircle, FaExclamationTriangle,
  FaPlus, FaEdit, FaChevronLeft, FaChevronRight, FaHistory, FaClipboardCheck, FaCog
} from 'react-icons/fa'
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  type AttendanceRecord,
  type AttendanceStatus,
} from '@/lib/utils/attendanceTypes'

type EmployeeRecord = AttendanceRecord & {
  employees?: { id: string; full_name: string; rut: string; position: string | null }
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function AttendanceDashboardPage() {
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<EmployeeRecord[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    date: '',
    clock_in: '',
    clock_out: '',
    status: 'present' as AttendanceStatus,
    absence_type: '',
    absence_reason: '',
    notes: '',
  })

  const loadEmployees = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, rut, position, status')
      .eq('company_id', companyId)
      .in('status', ['active', 'licencia_medica'])
      .order('full_name')
    setEmployees(data || [])
  }, [companyId])

  const loadRecords = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      let query = supabase
        .from('attendance_records')
        .select(`*, employees (id, full_name, rut, position)`)
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (viewMode === 'daily') {
        query = query.eq('date', selectedDate)
      } else {
        const [year, month] = selectedDate.split('-')
        const startDate = `${year}-${month}-01`
        const endDate = `${year}-${month}-31`
        query = query.gte('date', startDate).lte('date', endDate)
      }

      if (selectedEmployee) {
        query = query.eq('employee_id', selectedEmployee)
      }

      const { data, error } = await query
      if (error) throw error
      setRecords((data as EmployeeRecord[]) || [])
    } catch (err: any) {
      console.error('Error loading records:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, selectedDate, viewMode, selectedEmployee])

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    }
  }, [companyId, loadEmployees])

  useEffect(() => {
    if (companyId) {
      loadRecords()
    }
  }, [loadRecords])

  const navigateDate = (direction: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + direction)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <FaCheckCircle color="#10b981" />
      case 'late': return <FaClock color="#f59e0b" />
      case 'absent': return <FaExclamationTriangle color="#ef4444" />
      default: return <FaClock color="#6b7280" />
    }
  }

  const handleManualEntry = async () => {
    if (!companyId || !manualForm.employee_id || !manualForm.date || !manualForm.status) return
    try {
      const { error } = await supabase
        .from('attendance_records')
        .upsert({
          employee_id: manualForm.employee_id,
          company_id: companyId,
          date: manualForm.date,
          clock_in: manualForm.clock_in || null,
          clock_out: manualForm.clock_out || null,
          clock_in_source: 'manual',
          clock_out_source: manualForm.clock_out ? 'manual' : null,
          hours_worked: manualForm.clock_in && manualForm.clock_out
            ? (() => {
                const [inH, inM] = manualForm.clock_in.split(':').map(Number)
                const [outH, outM] = manualForm.clock_out.split(':').map(Number)
                const diff = (outH * 60 + outM) - (inH * 60 + inM) - 60
                return Math.max(0, Math.round(diff * 100 / 60) / 100)
              })() : null,
          status: manualForm.status,
          absence_type: manualForm.absence_type || null,
          absence_reason: manualForm.absence_reason || null,
          notes: manualForm.notes || null,
          overtime_minutes: 0,
          late_minutes: 0,
          early_departure_minutes: 0,
        }, { onConflict: 'employee_id,date' })

      if (error) throw error
      setShowManualEntry(false)
      setManualForm({ employee_id: '', date: selectedDate, clock_in: '', clock_out: '', status: 'present', absence_type: '', absence_reason: '', notes: '' })
      await loadRecords()
    } catch (err: any) {
      alert('Error al guardar registro: ' + (err.message || 'Error desconocido'))
    }
  }

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length
  const absentCount = records.filter(r => r.status === 'absent').length
  const lateCount = records.filter(r => r.status === 'late').length
  const leaveCount = records.filter(r => ['medical_leave', 'vacation', 'permission_with_pay', 'permission_without_pay'].includes(r.status)).length
  const notMarked = employees.length - records.length

  const selectedDateObj = new Date(selectedDate + 'T12:00:00')
  const dateLabel = viewMode === 'daily'
    ? `${selectedDateObj.getDate()} de ${MONTH_NAMES[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`
    : `${MONTH_NAMES[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1>Asistencia</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/attendance/corrections" className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 14px', fontSize: '14px' }}>
            <FaClipboardCheck /> Correcciones
          </Link>
          <Link href="/attendance/schedules" className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 14px', fontSize: '14px' }}>
            <FaCog /> Horarios
          </Link>
          <button onClick={() => setShowManualEntry(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaPlus /> Registro Manual
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="secondary" onClick={() => navigateDate(-1)} style={{ padding: '8px' }}>
              <FaChevronLeft />
            </button>
            <div style={{ textAlign: 'center' }}>
              <FaCalendarAlt style={{ marginRight: '6px', color: '#3b82f6' }} />
              <span style={{ fontWeight: '600' }}>{dateLabel}</span>
            </div>
            <button className="secondary" onClick={() => navigateDate(1)} style={{ padding: '8px' }}>
              <FaChevronRight />
            </button>
            <button className="secondary" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} style={{ fontSize: '13px' }}>
              Hoy
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'daily' | 'monthly')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
            >
              <option value="daily">Diario</option>
              <option value="monthly">Mensual</option>
            </select>
            <select
              value={selectedEmployee || ''}
              onChange={(e) => setSelectedEmployee(e.target.value || null)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', minWidth: '200px' }}
            >
              <option value="">Todos los trabajadores</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.rut})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {viewMode === 'daily' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{presentCount}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Presentes</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{lateCount}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Atrasos</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>{absentCount}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Ausentes</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6' }}>{leaveCount}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Licencias/Permisos</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#6b7280' }}>{notMarked}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Sin marcar</div>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '24px' }}>Cargando registros...</p>
        ) : records.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
            No hay registros de asistencia para {viewMode === 'daily' ? 'esta fecha' : 'este mes'}.
          </p>
        ) : (
          <div className="table-mobile-hidden">
            <table>
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Fecha</th>
                  <th>Ingreso</th>
                  <th>Salida</th>
                  <th>Horas</th>
                  <th>Atraso</th>
                  <th>Estado</th>
                  <th>Fuente</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const statusStyle = ATTENDANCE_STATUS_COLORS[record.status] || { bg: '#6b728020', color: '#6b7280' }
                  const statusLabel = ATTENDANCE_STATUS_LABELS[record.status] || record.status
                  return (
                    <tr key={record.id}>
                      <td>
                        <Link href={`/attendance/${record.employee_id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                          {record.employees?.full_name || 'N/A'}
                        </Link>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{record.employees?.rut}</div>
                      </td>
                      <td>{record.date}</td>
                      <td>{record.clock_in || '—'}</td>
                      <td>{record.clock_out || '—'}</td>
                      <td>{record.hours_worked !== null ? `${record.hours_worked}h` : '—'}</td>
                      <td>{record.late_minutes > 0 ? `${record.late_minutes} min` : '—'}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
                          background: statusStyle.bg, color: statusStyle.color,
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#6b7280' }}>
                        {record.clock_in_source === 'app' ? 'App' : record.clock_in_source === 'manual' ? 'Manual' : record.clock_in_source}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Cards */}
        <div className="table-mobile-card">
          {records.slice(0, 20).map((record) => {
            const statusStyle = ATTENDANCE_STATUS_COLORS[record.status] || { bg: '#6b728020', color: '#6b7280' }
            const statusLabel = ATTENDANCE_STATUS_LABELS[record.status] || record.status
            return (
              <div key={record.id} className="mobile-card" style={{ padding: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong>{record.employees?.full_name || 'N/A'}</strong>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{record.employees?.rut}</div>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
                    background: statusStyle.bg, color: statusStyle.color,
                  }}>
                    {statusLabel}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#6b7280' }}>Ingreso:</span><br />
                    <strong>{record.clock_in || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Salida:</span><br />
                    <strong>{record.clock_out || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Horas:</span><br />
                    <strong>{record.hours_worked !== null ? `${record.hours_worked}h` : '—'}</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Registro Manual de Asistencia</h2>
              <button onClick={() => setShowManualEntry(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="form-group">
              <label>Trabajador *</label>
              <select
                value={manualForm.employee_id}
                onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                required
              >
                <option value="">Seleccionar trabajador</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.rut})</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fecha *</label>
                <input
                  type="date"
                  value={manualForm.date || selectedDate}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Estado *</label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as AttendanceStatus })}
                  required
                >
                  {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Hora Ingreso</label>
                <input
                  type="time"
                  value={manualForm.clock_in}
                  onChange={(e) => setManualForm({ ...manualForm, clock_in: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Hora Salida</label>
                <input
                  type="time"
                  value={manualForm.clock_out}
                  onChange={(e) => setManualForm({ ...manualForm, clock_out: e.target.value })}
                />
              </div>
            </div>

            {['permission_with_pay', 'permission_without_pay', 'medical_leave', 'vacation', 'absent_justified'].includes(manualForm.status) && (
              <div className="form-group">
                <label>Motivo de Ausencia</label>
                <select
                  value={manualForm.absence_type}
                  onChange={(e) => setManualForm({ ...manualForm, absence_type: e.target.value })}
                >
                  <option value="">Sin especificar</option>
                  <option value="medical_leave">Licencia Médica</option>
                  <option value="permission_with_pay">Permiso con Goce</option>
                  <option value="permission_without_pay">Permiso sin Goce</option>
                  <option value="vacation">Vacaciones</option>
                  <option value="maternal_leave">Licencia de Maternidad</option>
                  <option value="accident_leave">Licencia por Accidente</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Notas</label>
              <textarea
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                rows={2}
                placeholder="Observaciones..."
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="secondary" onClick={() => setShowManualEntry(false)}>Cancelar</button>
              <button onClick={handleManualEntry}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}