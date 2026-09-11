export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'early_departure'
  | 'permission_with_pay'
  | 'permission_without_pay'
  | 'medical_leave'
  | 'vacation'
  | 'holiday'
  | 'rest_day'
  | 'absent_justified'

export type AttendanceSource = 'app' | 'web' | 'manual' | 'import' | 'offline'

export type AbsenceType =
  | 'medical_leave'
  | 'permission_with_pay'
  | 'permission_without_pay'
  | 'vacation'
  | 'maternal_leave'
  | 'accident_leave'
  | 'other'

export type ScheduleType = 'ordinary' | 'partial' | 'excluded_art22' | 'shift'

export type CorrectionStatus = 'pending' | 'approved' | 'rejected'

export type MonthlySummaryStatus = 'draft' | 'verified' | 'locked'

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Atraso',
  early_departure: 'Salida Anticipada',
  permission_with_pay: 'Permiso con Goce',
  permission_without_pay: 'Permiso sin Goce',
  medical_leave: 'Licencia Médica',
  vacation: 'Vacaciones',
  holiday: 'Feriado',
  rest_day: 'Día de Descanso',
  absent_justified: 'Ausencia Justificada',
}

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, { bg: string; color: string }> = {
  present: { bg: '#10b98120', color: '#10b981' },
  absent: { bg: '#ef444420', color: '#ef4444' },
  late: { bg: '#f59e0b20', color: '#f59e0b' },
  early_departure: { bg: '#f59e0b20', color: '#f59e0b' },
  permission_with_pay: { bg: '#3b82f620', color: '#3b82f6' },
  permission_without_pay: { bg: '#6b728020', color: '#6b7280' },
  medical_leave: { bg: '#8b5cf620', color: '#8b5cf6' },
  vacation: { bg: '#06b6d420', color: '#06b6d4' },
  holiday: { bg: '#ec489920', color: '#ec4899' },
  rest_day: { bg: '#6b728020', color: '#6b7280' },
  absent_justified: { bg: '#f9731620', color: '#f97316' },
}

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  medical_leave: 'Licencia Médica',
  permission_with_pay: 'Permiso con Goce de Sueldo',
  permission_without_pay: 'Permiso sin Goce de Sueldo',
  vacation: 'Vacaciones',
  maternal_leave: 'Licencia de Maternidad',
  accident_leave: 'Licencia por Accidente',
  other: 'Otro',
}

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  ordinary: 'Jornada Ordinaria',
  partial: 'Jornada Parcial',
  excluded_art22: 'Exento Art. 22',
  shift: 'Sistema de Turnos',
}

export const CLOCK_IN_STATUSES: AttendanceStatus[] = [
  'present',
  'late',
  'early_departure',
]

export const ABSENCE_STATUSES: AttendanceStatus[] = [
  'absent',
  'permission_with_pay',
  'permission_without_pay',
  'medical_leave',
  'vacation',
  'holiday',
  'rest_day',
  'absent_justified',
]

export interface AttendanceRecord {
  id: string
  employee_id: string
  company_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  clock_in_source: AttendanceSource
  clock_out_source: AttendanceSource | null
  clock_in_latitude: number | null
  clock_in_longitude: number | null
  clock_out_latitude: number | null
  clock_out_longitude: number | null
  hours_worked: number | null
  overtime_minutes: number
  late_minutes: number
  early_departure_minutes: number
  status: AttendanceStatus
  absence_type: AbsenceType | null
  absence_reason: string | null
  notes: string | null
  correction_requested: boolean
  correction_reason: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkSchedule {
  id: string
  employee_id: string
  company_id: string
  name: string
  schedule_type: ScheduleType
  monday_start: string | null
  monday_end: string | null
  tuesday_start: string | null
  tuesday_end: string | null
  wednesday_start: string | null
  wednesday_end: string | null
  thursday_start: string | null
  thursday_end: string | null
  friday_start: string | null
  friday_end: string | null
  saturday_start: string | null
  saturday_end: string | null
  sunday_start: string | null
  sunday_end: string | null
  lunch_break_minutes: number
  tolerance_minutes: number
  weekly_hours: number
  effective_from: string
  effective_to: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AttendanceCorrection {
  id: string
  employee_id: string
  company_id: string
  record_date: string
  current_clock_in: string | null
  current_clock_out: string | null
  requested_clock_in: string | null
  requested_clock_out: string | null
  reason: string
  status: CorrectionStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceMonthlySummary {
  id: string
  employee_id: string
  company_id: string
  year: number
  month: number
  days_in_period: number
  days_worked: number
  days_absent: number
  days_medical_leave: number
  days_vacation: number
  days_permission_with_pay: number
  days_permission_without_pay: number
  days_holiday: number
  days_rest: number
  total_late_minutes: number
  total_overtime_minutes: number
  total_hours_worked: number | null
  status: MonthlySummaryStatus
  verified_by: string | null
  verified_at: string | null
  payroll_slip_id: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRecordWithEmployee extends AttendanceRecord {
  employees?: {
    id: string
    full_name: string
    rut: string
    position: string | null
  }
}

export function isClockInStatus(status: AttendanceStatus): boolean {
  return CLOCK_IN_STATUSES.includes(status)
}

export function isAbsenceStatus(status: AttendanceStatus): boolean {
  return ABSENCE_STATUSES.includes(status)
}

export function calculateHoursWorked(clockIn: string | null, clockOut: string | null, lunchMinutes: number = 60): number | null {
  if (!clockIn || !clockOut) return null
  const [inH, inM] = clockIn.split(':').map(Number)
  const [outH, outM] = clockOut.split(':').map(Number)
  const inMinutes = inH * 60 + inM
  const outMinutes = outH * 60 + outM
  if (outMinutes <= inMinutes) return null
  const totalMinutes = outMinutes - inMinutes - lunchMinutes
  return Math.max(0, Math.round(totalMinutes * 100 / 60) / 100)
}