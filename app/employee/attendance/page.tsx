'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaClock, FaSignOutAlt, FaHistory, FaExclamationTriangle } from 'react-icons/fa'
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  type AttendanceRecord,
  type AttendanceStatus,
} from '@/lib/utils/attendanceTypes'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function EmployeeAttendancePage() {
  const { companyId } = useCurrentCompany()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState('')
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [weeklyRecords, setWeeklyRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<{ start: string; end: string; weeklyHours: number } | null>(null)

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const loadEmployee = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: emp } = await supabase
      .from('employees')
      .select('id, full_name, status')
      .eq('user_id', user.id)
      .single()

    if (emp) {
      setEmployeeId(emp.id)
      setEmployeeName(emp.full_name)
    }
  }, [])

  const loadSchedule = useCallback(async () => {
    if (!employeeId) return
    const { data } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .lte('effective_from', todayStr)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      const dayIndex = today.getDay()
      const dayFields = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
      const dayStart = data[`${dayFields[dayIndex]}_start`]
      const dayEnd = data[`${dayFields[dayIndex]}_end`]
      if (dayStart && dayEnd) {
        setSchedule({ start: dayStart, end: dayEnd, weeklyHours: data.weekly_hours })
      }
    }
  }, [employeeId, todayStr])

  const loadTodayRecord = useCallback(async () => {
    if (!employeeId || !companyId) return
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', todayStr)
      .single()

    setTodayRecord(data)
  }, [employeeId, companyId, todayStr])

  const loadWeeklyRecords = useCallback(async () => {
    if (!employeeId || !companyId) return
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startOfWeek.toISOString().split('T')[0])
      .lte('date', endOfWeek.toISOString().split('T')[0])
      .order('date', { ascending: true })

    setWeeklyRecords(data || [])
  }, [employeeId, companyId, today])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadEmployee()
      setLoading(false)
    }
    init()
  }, [loadEmployee])

  useEffect(() => {
    if (employeeId && companyId) {
      Promise.all([loadSchedule(), loadTodayRecord(), loadWeeklyRecords()])
    }
  }, [employeeId, companyId, loadSchedule, loadTodayRecord, loadWeeklyRecords])

  const handleClockIn = async () => {
    if (!employeeId || !companyId) return
    setClocking(true)
    setError(null)

    const now = new Date()
    const timeStr = now.toTimeString().slice(0, 5)

    try {
      let lateMinutes = 0
      if (schedule?.start) {
        const [schedH, schedM] = schedule.start.split(':').map(Number)
        const [nowH, nowM] = timeStr.split(':').map(Number)
        const schedTotal = schedH * 60 + schedM + 10
        const nowTotal = nowH * 60 + nowM
        if (nowTotal > schedTotal) {
          lateMinutes = nowTotal - (schedH * 60 + schedM)
        }
      }

      const { data, error: fetchError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', todayStr)
        .single()

      if (data) {
        const { error: updateError } = await supabase
          .from('attendance_records')
          .update({
            clock_in: timeStr,
            clock_in_source: 'app',
            late_minutes: lateMinutes,
            status: lateMinutes > 0 ? 'late' : 'present',
          })
          .eq('id', data.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: employeeId,
            company_id: companyId,
            date: todayStr,
            clock_in: timeStr,
            clock_in_source: 'app',
            late_minutes: lateMinutes,
            status: lateMinutes > 0 ? 'late' : 'present',
            hours_worked: null,
            overtime_minutes: 0,
            early_departure_minutes: 0,
          })

        if (insertError) throw insertError
      }

      await loadTodayRecord()
    } catch (err: any) {
      setError(err.message || 'Error al registrar ingreso')
    } finally {
      setClocking(false)
    }
  }

  const handleClockOut = async () => {
    if (!employeeId || !companyId || !todayRecord) return
    setClocking(true)
    setError(null)

    const now = new Date()
    const timeStr = now.toTimeString().slice(0, 5)

    try {
      let hoursWorked: number | null = null
      let earlyDepartureMinutes = 0
      let overtimeMinutes = 0

      if (todayRecord.clock_in) {
        const [inH, inM] = todayRecord.clock_in.split(':').map(Number)
        const [outH, outM] = timeStr.split(':').map(Number)
        const inTotal = inH * 60 + inM
        const outTotal = outH * 60 + outM
        const diff = outTotal - inTotal - 60
        hoursWorked = Math.max(0, Math.round(diff * 100 / 60) / 100)

        if (schedule?.end) {
          const [schedH, schedM] = schedule.end.split(':').map(Number)
          const schedTotal = schedH * 60 + schedM
          if (outTotal < schedTotal) {
            earlyDepartureMinutes = schedTotal - outTotal
          } else if (outTotal > schedTotal) {
            overtimeMinutes = outTotal - schedTotal
          }
        }
      }

      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          clock_out: timeStr,
          clock_out_source: 'app',
          hours_worked: hoursWorked,
          early_departure_minutes: earlyDepartureMinutes,
          overtime_minutes: overtimeMinutes,
          status: earlyDepartureMinutes > 0 ? 'early_departure' : todayRecord.status,
        })
        .eq('id', todayRecord.id)

      if (updateError) throw updateError

      await loadTodayRecord()
      await loadWeeklyRecords()
    } catch (err: any) {
      setError(err.message || 'Error al registrar salida')
    } finally {
      setClocking(false)
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return '--:--'
    return time.slice(0, 5)
  }

  const formatHours = (hours: number | null) => {
    if (hours === null || hours === undefined) return '0:00'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <FaExclamationTriangle size={48} color="#f59e0b" />
        <h2>No se encontró tu perfil de trabajador</h2>
        <p style={{ color: '#6b7280' }}>Contacta al administrador para vincular tu cuenta.</p>
      </div>
    )
  }

  const hasClockedIn = !!todayRecord?.clock_in
  const hasClockedOut = !!todayRecord?.clock_out
  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5)

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>{DAY_NAMES[today.getDay()]} {today.getDate()} de {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}</p>
        <p style={{ fontSize: '32px', fontWeight: '700', margin: '4px 0' }}>{currentTime}</p>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>{employeeName}</p>
      </div>

      {schedule && (
        <div style={{ background: '#f0f9ff', borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#0369a1', margin: 0 }}>
            Jornada hoy: {schedule.start} - {schedule.end} · {schedule.weeklyHours}h semanales
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Clock In/Out Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {!hasClockedIn ? (
          <button
            onClick={handleClockIn}
            disabled={clocking}
            style={{
              flex: 1, padding: '20px', borderRadius: '12px', border: 'none',
              background: clocking ? '#9ca3af' : '#10b981', color: 'white',
              fontSize: '16px', fontWeight: '600', cursor: clocking ? 'not-allowed' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            }}
          >
            <FaClock size={24} />
            {clocking ? 'Registrando...' : 'Marcar Ingreso'}
          </button>
        ) : !hasClockedOut ? (
          <button
            onClick={handleClockOut}
            disabled={clocking}
            style={{
              flex: 1, padding: '20px', borderRadius: '12px', border: 'none',
              background: clocking ? '#9ca3af' : '#ef4444', color: 'white',
              fontSize: '16px', fontWeight: '600', cursor: clocking ? 'not-allowed' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            }}
          >
            <FaSignOutAlt size={24} />
            {clocking ? 'Registrando...' : 'Marcar Salida'}
          </button>
        ) : null}
      </div>

      {/* Today's Status */}
      {todayRecord && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Hoy</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ textAlign: 'center', padding: '8px', background: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Ingreso</p>
              <p style={{ fontSize: '20px', fontWeight: '600', margin: '4px 0', color: hasClockedIn ? '#10b981' : '#6b7280' }}>
                {formatTime(todayRecord.clock_in)}
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Salida</p>
              <p style={{ fontSize: '20px', fontWeight: '600', margin: '4px 0', color: hasClockedOut ? '#ef4444' : '#6b7280' }}>
                {formatTime(todayRecord.clock_out)}
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Horas</p>
              <p style={{ fontSize: '14px', fontWeight: '600', margin: '2px 0' }}>{formatHours(todayRecord.hours_worked)}</p>
            </div>
            {todayRecord.late_minutes > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#f59e0b', margin: 0 }}>Atraso</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b', margin: '2px 0' }}>{todayRecord.late_minutes} min</p>
              </div>
            )}
            {todayRecord.overtime_minutes > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#10b981', margin: 0 }}>Extras</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#10b981', margin: '2px 0' }}>{todayRecord.overtime_minutes} min</p>
              </div>
            )}
          </div>
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
              background: ATTENDANCE_STATUS_COLORS[todayRecord.status]?.bg || '#6b728020',
              color: ATTENDANCE_STATUS_COLORS[todayRecord.status]?.color || '#6b7280',
            }}>
              {ATTENDANCE_STATUS_LABELS[todayRecord.status] || todayRecord.status}
            </span>
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      {weeklyRecords.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
            <FaHistory style={{ marginRight: '8px', color: '#6b7280' }} />
            Esta Semana
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weeklyRecords.map((record) => {
              const recordDate = new Date(record.date + 'T12:00:00')
              const dayName = DAY_NAMES[recordDate.getDay()].slice(0, 3)
              const statusColor = ATTENDANCE_STATUS_COLORS[record.status]?.color || '#6b7280'
              return (
                <div key={record.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>{dayName} {recordDate.getDate()}</span>
                    <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '8px' }}>
                      {formatTime(record.clock_in)} → {formatTime(record.clock_out)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px' }}>{formatHours(record.hours_worked)}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: ATTENDANCE_STATUS_COLORS[record.status]?.bg, color: statusColor }}>
                      {ATTENDANCE_STATUS_LABELS[record.status]?.split(' ')[0]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}