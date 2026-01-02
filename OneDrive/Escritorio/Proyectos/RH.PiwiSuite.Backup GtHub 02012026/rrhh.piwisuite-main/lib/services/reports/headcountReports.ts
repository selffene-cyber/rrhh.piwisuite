import { SupabaseClient } from '@supabase/supabase-js'
import { Database, HeadcountReportRow, HeadcountSummary, ReportFilters } from '@/types'

export async function getHeadcountReport(
  filters: ReportFilters,
  supabase: SupabaseClient<Database>
): Promise<{ rows: HeadcountReportRow[]; summary: HeadcountSummary }> {
  let query = supabase
    .from('employees')
    .select(`
      id,
      rut,
      full_name,
      position,
      afp,
      health_system,
      health_plan,
      contract_type,
      status,
      hire_date,
      contract_end_date,
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

  if (filters.contractType) {
    query = query.eq('contract_type', filters.contractType)
  }

  if (filters.afp) {
    query = query.eq('afp', filters.afp)
  }

  if (filters.healthSystem) {
    query = query.eq('health_system', filters.healthSystem)
  }

  const { data, error } = await query.order('full_name', { ascending: true })

  if (error) {
    throw new Error(`Error al obtener reporte de dotación: ${error.message}`)
  }

  const rows: HeadcountReportRow[] = (data || []).map((emp: any) => ({
    rut: emp.rut || '',
    full_name: emp.full_name || '',
    cost_center_code: emp.cost_centers?.code || null,
    cost_center_name: emp.cost_centers?.name || null,
    position: emp.position || null,
    afp: emp.afp || null,
    health_system: emp.health_system || null,
    health_plan: emp.health_plan || null,
    contract_type: emp.contract_type || null,
    status: emp.status || 'inactive',
    hire_date: emp.hire_date || null,
    contract_end_date: emp.contract_end_date || null,
  }))

  // Calcular resumen
  const summary: HeadcountSummary = {
    totalEmployees: rows.length,
    byCostCenter: [],
    byAFP: [],
    byHealthSystem: [],
    byContractType: [],
  }

  // Agrupar por centro de costo
  const costCenterMap = new Map<string, number>()
  rows.forEach((row) => {
    const key = row.cost_center_code ? `${row.cost_center_code} - ${row.cost_center_name}` : 'Sin Centro de Costo'
    costCenterMap.set(key, (costCenterMap.get(key) || 0) + 1)
  })
  summary.byCostCenter = Array.from(costCenterMap.entries()).map(([costCenter, count]) => ({
    costCenter,
    count,
  }))

  // Agrupar por AFP
  const afpMap = new Map<string, number>()
  rows.forEach((row) => {
    if (row.afp) {
      afpMap.set(row.afp, (afpMap.get(row.afp) || 0) + 1)
    }
  })
  summary.byAFP = Array.from(afpMap.entries()).map(([afp, count]) => ({ afp, count }))

  // Agrupar por sistema de salud
  const healthMap = new Map<string, number>()
  rows.forEach((row) => {
    if (row.health_system) {
      healthMap.set(row.health_system, (healthMap.get(row.health_system) || 0) + 1)
    }
  })
  summary.byHealthSystem = Array.from(healthMap.entries()).map(([system, count]) => ({ system, count }))

  // Agrupar por tipo de contrato
  const contractMap = new Map<string, number>()
  rows.forEach((row) => {
    if (row.contract_type) {
      contractMap.set(row.contract_type, (contractMap.get(row.contract_type) || 0) + 1)
    }
  })
  summary.byContractType = Array.from(contractMap.entries()).map(([type, count]) => ({ type, count }))

  return { rows, summary }
}

