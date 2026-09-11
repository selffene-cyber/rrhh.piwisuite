import { supabase } from '@/lib/supabase/client'
import { type AttendanceStatus, CLOCK_IN_STATUSES, ABSENCE_STATUSES } from '@/lib/utils/attendanceTypes'

export interface AttendanceSummary {
  days_in_period: number
  days_worked: number
  days_present: number
  days_late: number
  days_early_departure: number
  days_absent: number
  days_medical_leave: number
  days_vacation: number
  days_permission_with_pay: number
  days_permission_without_pay: number
  days_holiday: number
  days_rest: number
  days_absent_justified: number
  total_late_minutes: number
  total_overtime_minutes: number
  total_hours_worked: number
  records: AttendanceDayRecord[]
}

export interface AttendanceDayRecord {
  date: string
  status: AttendanceStatus
  clock_in: string | null
  clock_out: string | null
  hours_worked: number | null
  late_minutes: number
  overtime_minutes: number
  notes: string | null
}

export async function calculateAttendanceSummary(
  employeeId: string,
  companyId: string,
  year: number,
  month: number
): Promise<AttendanceSummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('date, status, clock_in, clock_out, hours_worked, late_minutes, overtime_minutes, notes')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching attendance records for summary:', error)
  }

  const daysInMonth = new Date(year, month, 0).getDate()

  const summary: AttendanceSummary = {
    days_in_period: daysInMonth,
    days_worked: 0,
    days_present: 0,
    days_late: 0,
    days_early_departure: 0,
    days_absent: 0,
    days_medical_leave: 0,
    days_vacation: 0,
    days_permission_with_pay: 0,
    days_permission_without_pay: 0,
    days_holiday: 0,
    days_rest: 0,
    days_absent_justified: 0,
    total_late_minutes: 0,
    total_overtime_minutes: 0,
    total_hours_worked: 0,
    records: [],
  }

  const attendanceRecords = records || []

  for (const record of attendanceRecords) {
    summary.records.push({
      date: record.date,
      status: record.status,
      clock_in: record.clock_in,
      clock_out: record.clock_out,
      hours_worked: record.hours_worked,
      late_minutes: record.late_minutes || 0,
      overtime_minutes: record.overtime_minutes || 0,
      notes: record.notes,
    })

    summary.total_late_minutes += record.late_minutes || 0
    summary.total_overtime_minutes += record.overtime_minutes || 0
    if (record.hours_worked) {
      summary.total_hours_worked += record.hours_worked
    }

    switch (record.status) {
      case 'present':
        summary.days_present++
        summary.days_worked++
        break
      case 'late':
        summary.days_late++
        summary.days_worked++
        break
      case 'early_departure':
        summary.days_early_departure++
        summary.days_worked++
        break
      case 'absent':
        summary.days_absent++
        break
      case 'medical_leave':
        summary.days_medical_leave++
        break
      case 'vacation':
        summary.days_vacation++
        break
      case 'permission_with_pay':
        summary.days_permission_with_pay++
        summary.days_worked++
        break
      case 'permission_without_pay':
        summary.days_permission_without_pay++
        break
      case 'holiday':
        summary.days_holiday++
        summary.days_worked++
        break
      case 'rest_day':
        summary.days_rest++
        break
      case 'absent_justified':
        summary.days_absent_justified++
        break
    }
  }

  return summary
}

export async function saveAttendanceSummary(
  employeeId: string,
  companyId: string,
  year: number,
  month: number,
  summary: AttendanceSummary,
  verifiedBy?: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('attendance_monthly_summary')
    .upsert({
      employee_id: employeeId,
      company_id: companyId,
      year,
      month,
      days_in_period: summary.days_in_period,
      days_worked: summary.days_worked,
      days_absent: summary.days_absent,
      days_medical_leave: summary.days_medical_leave,
      days_vacation: summary.days_vacation,
      days_permission_with_pay: summary.days_permission_with_pay,
      days_permission_without_pay: summary.days_permission_without_pay,
      days_holiday: summary.days_holiday,
      days_rest: summary.days_rest,
      total_late_minutes: summary.total_late_minutes,
      total_overtime_minutes: summary.total_overtime_minutes,
      total_hours_worked: Math.round(summary.total_hours_worked * 100) / 100,
      status: verifiedBy ? 'verified' : 'draft',
      verified_by: verifiedBy || null,
      verified_at: verifiedBy ? new Date().toISOString() : null,
    }, { onConflict: 'employee_id,year,month' })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving attendance summary:', error)
    return null
  }

  return data?.id || null
}

export function computeEffectiveDaysFromSummary(
  baseDaysWorked: number,
  summary: AttendanceSummary | null
): number {
  if (!summary) return baseDaysWorked

  const deductions =
    summary.days_medical_leave +
    summary.days_permission_without_pay +
    summary.days_vacation +
    summary.days_absent

  return Math.max(0, baseDaysWorked - deductions)
}