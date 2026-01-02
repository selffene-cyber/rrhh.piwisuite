import { SupabaseClient } from '@supabase/supabase-js'
import { Database, OrganizationalReportRow, ReportFilters } from '@/types'

export async function getOrganizationalReport(
  filters: ReportFilters,
  supabase: SupabaseClient<Database>
): Promise<OrganizationalReportRow[]> {
  let query = supabase
    .from('employees')
    .select(`
      id,
      position,
      cost_centers (code, name)
    `)

  if (filters.companyId) {
    query = query.eq('company_id', filters.companyId)
  }

  if (filters.costCenterId) {
    query = query.eq('cost_center_id', filters.costCenterId)
  }

  if (filters.employeeStatus) {
    query = query.eq('status', filters.employeeStatus)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener reporte organizacional: ${error.message}`)
  }

  // Agrupar por cargo y centro de costo
  const groupedMap = new Map<string, number>()
  ;(data || []).forEach((emp: any) => {
    const position = emp.position || 'Sin Cargo'
    const costCenter = emp.cost_centers?.code
      ? `${emp.cost_centers.code} - ${emp.cost_centers.name}`
      : 'Sin Centro de Costo'
    const key = `${position}|${costCenter}`
    groupedMap.set(key, (groupedMap.get(key) || 0) + 1)
  })

  const rows: OrganizationalReportRow[] = Array.from(groupedMap.entries()).map(([key, count]) => {
    const [position, costCenter] = key.split('|')
    const [code, ...nameParts] = costCenter.split(' - ')
    return {
      position: position || undefined,
      cost_center_code: code !== 'Sin Centro de Costo' ? code : undefined,
      cost_center_name: nameParts.length > 0 ? nameParts.join(' - ') : undefined,
      employee_count: count,
    }
  })

  return rows.sort((a, b) => {
    // Ordenar por centro de costo primero, luego por cargo
    const ccA = a.cost_center_name || ''
    const ccB = b.cost_center_name || ''
    if (ccA !== ccB) {
      return ccA.localeCompare(ccB)
    }
    return (a.position || '').localeCompare(b.position || '')
  })
}

