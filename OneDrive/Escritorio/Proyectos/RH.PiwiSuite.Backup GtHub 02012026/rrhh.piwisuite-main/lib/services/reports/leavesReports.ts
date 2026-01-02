import { SupabaseClient } from '@supabase/supabase-js'
import { Database, LeaveReportRow, LeaveSummary, ReportFilters } from '@/types'

export async function getLeavesReport(
  filters: ReportFilters,
  supabase: SupabaseClient<Database>
): Promise<{ rows: LeaveReportRow[]; summary: LeaveSummary }> {
  // Obtener empleados
  let employeesQuery = supabase
    .from('employees')
    .select(`
      id,
      rut,
      full_name,
      status,
      cost_centers (code, name)
    `)

  if (filters.companyId) {
    employeesQuery = employeesQuery.eq('company_id', filters.companyId)
  }

  if (filters.costCenterId) {
    employeesQuery = employeesQuery.eq('cost_center_id', filters.costCenterId)
  }

  if (filters.employeeStatus) {
    employeesQuery = employeesQuery.eq('status', filters.employeeStatus)
  }

  const { data: employees, error: employeesError } = await employeesQuery.order('full_name', { ascending: true })

  if (employeesError) {
    throw new Error(`Error al obtener empleados: ${employeesError.message}`)
  }

  const employeeIds = (employees || []).map((emp: any) => emp.id)

  if (employeeIds.length === 0) {
    return {
      rows: [],
      summary: {
        totalActiveMedicalLeaves: 0,
        totalMedicalLeaveDays: 0,
        byStatus: [],
        employeesWithActiveLeaves: 0,
      },
    }
  }

  // Obtener licencias médicas activas
  const today = new Date().toISOString().split('T')[0]
  let medicalLeavesQuery = supabase
    .from('medical_leaves')
    .select('employee_id, days_count, start_date, end_date')
    .in('employee_id', employeeIds)
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)

  if (filters.startDate && filters.endDate) {
    medicalLeavesQuery = medicalLeavesQuery
      .gte('start_date', filters.startDate)
      .lte('end_date', filters.endDate)
  }

  const { data: medicalLeaves, error: medicalLeavesError } = await medicalLeavesQuery

  if (medicalLeavesError) {
    throw new Error(`Error al obtener licencias médicas: ${medicalLeavesError.message}`)
  }

  // Obtener vacaciones acumuladas y tomadas
  const { data: vacations, error: vacationsError } = await supabase
    .from('vacations')
    .select('employee_id, days_taken')
    .in('employee_id', employeeIds)

  if (vacationsError) {
    console.error('Error al obtener vacaciones:', vacationsError)
  }

  // Construir mapa de licencias médicas por empleado
  const medicalLeavesMap = new Map<string, { days: number; start?: string; end?: string }>()
  ;(medicalLeaves || []).forEach((leave: any) => {
    const existing = medicalLeavesMap.get(leave.employee_id) || { days: 0 }
    medicalLeavesMap.set(leave.employee_id, {
      days: existing.days + (leave.days_count || 0),
      start: leave.start_date,
      end: leave.end_date,
    })
  })

  // Construir mapa de vacaciones por empleado
  const vacationsMap = new Map<string, { taken: number }>()
  ;(vacations || []).forEach((vacation: any) => {
    const existing = vacationsMap.get(vacation.employee_id) || { taken: 0 }
    vacationsMap.set(vacation.employee_id, {
      taken: existing.taken + (vacation.days_taken || 0),
    })
  })

  // Construir filas del reporte
  const rows: LeaveReportRow[] = (employees || []).map((emp: any) => {
    const medicalLeave = medicalLeavesMap.get(emp.id)
    const vacation = vacationsMap.get(emp.id)

    return {
      rut: emp.rut || '',
      full_name: emp.full_name || '',
      status: emp.status || 'inactive',
      medical_leave_active: !!medicalLeave,
      medical_leave_days: medicalLeave?.days || 0,
      medical_leave_start: medicalLeave?.start || undefined,
      medical_leave_end: medicalLeave?.end || undefined,
      vacation_days_accumulated: 0, // Esto requeriría cálculo adicional basado en antigüedad
      vacation_days_taken: vacation?.taken || 0,
    }
  })

  // Calcular resumen
  const employeesWithActiveLeaves = rows.filter((row) => row.medical_leave_active).length
  const totalMedicalLeaveDays = rows.reduce((sum, row) => sum + row.medical_leave_days, 0)

  const statusMap = new Map<string, number>()
  rows.forEach((row) => {
    statusMap.set(row.status, (statusMap.get(row.status) || 0) + 1)
  })

  const summary: LeaveSummary = {
    totalActiveMedicalLeaves: (medicalLeaves || []).length,
    totalMedicalLeaveDays,
    byStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
    employeesWithActiveLeaves,
  }

  return { rows, summary }
}

