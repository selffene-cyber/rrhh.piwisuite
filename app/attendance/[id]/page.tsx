'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import Link from 'next/link'
import { FaArrowLeft, FaCalendarAlt, FaClock, FaEdit } from 'react-icons/fa'
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  type AttendanceRecord,
  type AttendanceStatus,
} from '@/lib/utils/attendanceTypes'

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function EmployeeAttendanceDetailPage() {
  const params = useParams()
  const employeeId = params?.id as string
  const { companyId } = useCurrentCompany()
  const [employee, setEmployee] = useState<any>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [editingRecord, setEditingRecord] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ clock_in: '', clock_out: '', status: '' as AttendanceStatus, notes: '' })

  const loadEmployee = useCallback(async () => {
    if (!employeeId) return
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, rut, position, status')
      .eq('id', employeeId)
      .single()
    setEmployee(data)
  }, [employeeId])

  const loadRecords = useCallback(async () => {
    if (!employeeId || !companyId) return
    setLoading(true)
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) throw error
      setRecords(data || [])
    } catch (err) {
      console.error('Error loading records:', err)
    } finally {
      setLoading(false)
    }
  }, [employeeId, companyId, selectedMonth, selectedYear])

  useEffect(() => {
    loadEmployee()
  }, [loadEmployee])

  useEffect(() => {
    if (companyId) loadRecords()
  }, [loadRecords])

  const handleSaveEdit = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .update({
          clock_in: editForm.clock_in || null,
          clock_out: editForm.clock_out || null,
          status: editForm.status,
          notes: editForm.notes || null,
        })
        .eq('id', recordId)

      if (error) throw error
      setEditingRecord(null)
      await loadRecords()
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || 'Error desconocido'))
    }
  }

  const startEditing = (record: AttendanceRecord) => {
    setEditingRecord(record.id)
    setEditForm({
      clock_in: record.clock_in || '',
      clock_out: record.clock_out || '',
      status: record.status,
      notes: record.notes || '',
    })
  }

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay()

  const recordsByDate = records.reduce((acc: Record<string, AttendanceRecord>, r) => {
    acc[r.date] = r
    return acc
  }, {})

  const summary = {
    worked: records.filter(r => ['present', 'late', 'early_departure'].includes(r.status)).length,
    absent: records.filter(r => r.status === 'absent').length,
    medicalLeave: records.filter(r => r.status === 'medical_leave').length,
    vacation: records.filter(r => r.status === 'vacation').length,
    permission: records.filter(r => ['permission_with_pay', 'permission_without_pay'].includes(r.status)).length,
    totalHours: records.reduce((sum, r) => sum + (r.hours_worked || 0), 0),
    lateMinutes: records.reduce((sum, r) => sum + (r.late_minutes || 0), 0),
    overtimeMinutes: records.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0),
  }

  if (!employee && !loading) {
    return <div style={{ padding: '20px' }}><p>Trabajador no encontrado</p></div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/attendance" style={{ color: '#6b7280' }}>
            <FaArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px' }}>{employee?.full_name || 'Cargando...'}</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              {employee?.rut} · {employee?.position}
            </p>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button className="secondary" onClick={() => {
            if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(selectedYear - 1) }
            else setSelectedMonth(selectedMonth - 1)
          }}><FaCalendarAlt /> Anterior</button>
          <h3 style={{ margin: 0 }}>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h3>
          <button className="secondary" onClick={() => {
            if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(selectedYear + 1) }
            else setSelectedMonth(selectedMonth + 1)
          }}>Siguiente <FaCalendarAlt /></button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{summary.worked}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Trabajados</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#8b5cf6' }}>{summary.medicalLeave}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Lic. Médica</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#06b6d4' }}>{summary.vacation}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Vacaciones</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>{summary.permission}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Permisos</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>{summary.absent}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Ausentes</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>{summary.totalHours.toFixed(1)}h</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Horas Total</div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Calendario</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {DAY_NAMES.map(day => (
            <div key={day} style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', fontWeight: '600', padding: '4px' }}>{day}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {Array.from({ length: firstDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} style={{ padding: '4px' }} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const record = recordsByDate[dateStr]
            const isToday = dateStr === new Date().toISOString().split('T')[0]
            const statusColor = record ? ATTENDANCE_STATUS_COLORS[record.status]?.color : undefined
            return (
              <div
                key={day}
                style={{
                  textAlign: 'center', padding: '4px 2px', borderRadius: '4px',
                  background: isToday ? '#3b82f620' : record ? (ATTENDANCE_STATUS_COLORS[record.status]?.bg || '#f9fafb') : '#f9fafb',
                  border: isToday ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  cursor: 'pointer', fontSize: '12px',
                }}
                title={record ? `${dateStr}: ${ATTENDANCE_STATUS_LABELS[record.status]}${record.clock_in ? ` ${record.clock_in}-${record.clock_out}` : ''}` : dateStr}
              >
                <div style={{ fontWeight: isToday ? '700' : '400' }}>{day}</div>
                {record && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor || '#6b7280', margin: '2px auto 0' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Table */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ marginTop: 0 }}>Detalle de Registros</h3>
        {loading ? (
          <p>Cargando...</p>
        ) : records.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No hay registros para este mes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ingreso</th>
                  <th>Salida</th>
                  <th>Horas</th>
                  <th>Atraso</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    {editingRecord === record.id ? (
                      <>
                        <td>{record.date}</td>
                        <td><input type="time" value={editForm.clock_in} onChange={(e) => setEditForm({ ...editForm, clock_in: e.target.value })} style={{ padding: '4px', width: '100%' }} /></td>
                        <td><input type="time" value={editForm.clock_out} onChange={(e) => setEditForm({ ...editForm, clock_out: e.target.value })} style={{ padding: '4px', width: '100%' }} /></td>
                        <td>{record.hours_worked !== null ? `${record.hours_worked}h` : '—'}</td>
                        <td>{record.late_minutes > 0 ? `${record.late_minutes}m` : '—'}</td>
                        <td>
                          <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AttendanceStatus })} style={{ padding: '4px', width: '100%' }}>
                            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleSaveEdit(record.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>✓</button>
                            <button onClick={() => setEditingRecord(null)} style={{ padding: '4px 8px', fontSize: '12px' }} className="secondary">✗</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{record.date}</td>
                        <td>{record.clock_in || '—'}</td>
                        <td>{record.clock_out || '—'}</td>
                        <td>{record.hours_worked !== null ? `${record.hours_worked}h` : '—'}</td>
                        <td>{record.late_minutes > 0 ? `${record.late_minutes}m` : '—'}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
                            background: ATTENDANCE_STATUS_COLORS[record.status]?.bg || '#6b728020',
                            color: ATTENDANCE_STATUS_COLORS[record.status]?.color || '#6b7280',
                          }}>
                            {ATTENDANCE_STATUS_LABELS[record.status] || record.status}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => startEditing(record)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }} title="Editar">
                            <FaEdit size={14} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}