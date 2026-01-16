import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export interface Accident {
  id: string
  company_id: string
  accident_number: number
  event_date: string
  event_time: string
  event_location: string
  event_type: 'accidente_trabajo' | 'accidente_trayecto' | 'enfermedad_profesional'
  employee_id: string
  employee_rut: string
  employee_name: string
  employee_position: string
  employee_seniority_days?: number
  cost_center_id?: string
  cost_center_code?: string
  contract_type?: string
  administrator?: string
  work_performed?: string
  description: string
  hazards_identified?: string
  body_part_affected?: string
  injury_type?: string
  witnesses?: string
  possible_sequelae?: string
  immediate_actions?: string
  medical_transfer: boolean
  medical_transfer_location?: string
  notification_date?: string
  registered_by?: string
  status: 'open' | 'closed' | 'with_sequelae' | 'consolidated'
  diat_status: 'pending' | 'sent' | 'overdue'
  diat_sent_at?: string
  diat_number?: string
  medical_leave_id?: string
  created_at: string
  updated_at: string
  closed_at?: string
  closed_by?: string
}

export interface AccidentWithRelations extends Accident {
  employees?: {
    id: string
    full_name: string
    rut: string
    position: string
  } | null
  cost_center?: {
    id: string
    code: string
    name: string
  }
  registered_by_user?: {
    id: string
    full_name: string
  }
  attachments?: AccidentAttachment[]
}

export interface AccidentAttachment {
  id: string
  accident_id: string
  file_name: string
  file_path: string
  file_type?: string
  file_size?: number
  description?: string
  uploaded_by?: string
  created_at: string
}

export interface AccidentFilters {
  start_date?: string
  end_date?: string
  event_type?: 'accidente_trabajo' | 'accidente_trayecto' | 'enfermedad_profesional'
  status?: 'open' | 'closed' | 'with_sequelae' | 'consolidated' | 'all'
  diat_status?: 'pending' | 'sent' | 'overdue' | 'all'
  employee_id?: string
  employee_rut?: string
  cost_center_id?: string
}

export interface AccidentStats {
  total: number
  by_type: {
    accidente_trabajo: number
    accidente_trayecto: number
    enfermedad_profesional: number
  }
  by_status: {
    open: number
    closed: number
    with_sequelae: number
    consolidated: number
  }
  by_diat_status: {
    pending: number
    sent: number
    overdue: number
  }
  frequency_rate?: number // Tasa de frecuencia
  severity_rate?: number // Tasa de gravedad
  recurrence_count?: number // Accidentes recurrentes por trabajador
}

// Obtener accidentes con filtros
export async function getAccidents(
  companyId: string,
  supabase: SupabaseClient<Database>,
  filters?: AccidentFilters
): Promise<AccidentWithRelations[]> {
  let query = supabase
    .from('accidents')
    .select(`
      *,
      employees (
        id,
        full_name,
        rut,
        position
      )
    `)
    .eq('company_id', companyId)
    .order('event_date', { ascending: false })
    .order('accident_number', { ascending: false })

  if (filters?.start_date) {
    query = query.gte('event_date', filters.start_date)
  }

  if (filters?.end_date) {
    query = query.lte('event_date', filters.end_date)
  }

  if (filters?.event_type) {
    query = query.eq('event_type', filters.event_type)
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.diat_status && filters.diat_status !== 'all') {
    query = query.eq('diat_status', filters.diat_status)
  }

  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id)
  }

  if (filters?.employee_rut) {
    query = query.eq('employee_rut', filters.employee_rut)
  }

  if (filters?.cost_center_id) {
    query = query.eq('cost_center_id', filters.cost_center_id)
  }

  const { data, error } = await query

  if (error) throw error

  // Cargar anexos para cada accidente
  const accidentsWithAttachments = await Promise.all(
    (data || []).map(async (accident: any) => {
      const { data: attachments } = await supabase
        .from('accident_attachments')
        .select('*')
        .eq('accident_id', accident.id)
        .order('created_at', { ascending: false })

      return {
        ...accident,
        attachments: attachments || [],
      }
    })
  )

  return accidentsWithAttachments || []
}

// Obtener un accidente por ID
export async function getAccident(
  accidentId: string,
  supabase: SupabaseClient<Database>
): Promise<AccidentWithRelations | null> {
  const { data, error } = await supabase
    .from('accidents')
    .select(`
      *,
      employees (
        id,
        full_name,
        rut,
        position
      )
    `)
    .eq('id', accidentId)
    .single()

  if (error) throw error
  if (!data) return null

  // Cargar anexos
  const { data: attachments } = await supabase
    .from('accident_attachments')
    .select('*')
    .eq('accident_id', accidentId)
    .order('created_at', { ascending: false })

  return {
    ...(data as any),
    attachments: attachments || [],
  }
}

// Obtener accidentes de un trabajador
export async function getEmployeeAccidents(
  employeeRut: string,
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<AccidentWithRelations[]> {
  return getAccidents(companyId, supabase, { employee_rut: employeeRut })
}

// Crear un nuevo accidente
export async function createAccident(
  accidentData: Omit<Accident, 'id' | 'accident_number' | 'created_at' | 'updated_at' | 'employee_rut' | 'employee_name' | 'employee_position' | 'employee_seniority_days' | 'cost_center_code' | 'contract_type'>,
  supabase: SupabaseClient<Database>
): Promise<Accident> {
  // Obtener datos del trabajador al momento del evento (snapshot)
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', accidentData.employee_id)
    .single()

  if (!employee) {
    throw new Error('Trabajador no encontrado')
  }

  // Calcular antigüedad en días
  const employeeData = employee as any
  const hireDate = new Date(employeeData.hire_date)
  const eventDate = new Date(accidentData.event_date)
  const seniorityDays = Math.floor((eventDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24))

  // Obtener datos del centro de costo si existe
  let costCenterCode: string | undefined
  if (employeeData.cost_center_id) {
    const { data: costCenter } = await supabase
      .from('cost_centers')
      .select('code, name')
      .eq('id', employeeData.cost_center_id)
      .single()
    costCenterCode = (costCenter as any)?.code
  }

  // Preparar datos con snapshot histórico
  const accidentToCreate = {
    ...accidentData,
    employee_rut: employeeData.rut,
    employee_name: employeeData.full_name,
    employee_position: employeeData.position,
    employee_seniority_days: seniorityDays,
    cost_center_id: employeeData.cost_center_id || null,
    cost_center_code: costCenterCode || null,
    contract_type: employeeData.contract_type || null,
  }

  const { data, error } = await (supabase as any)
    .from('accidents')
    .insert(accidentToCreate)
    .select()
    .single()

  if (error) throw error
  return data
}

// Actualizar un accidente
export async function updateAccident(
  accidentId: string,
  updates: Partial<Accident>,
  supabase: SupabaseClient<Database>
): Promise<Accident> {
  // Verificar que el accidente no esté cerrado o consolidado
  const { data: existing } = await supabase
    .from('accidents')
    .select('status')
    .eq('id', accidentId)
    .single()

  if (!existing) {
    throw new Error('Accidente no encontrado')
  }

  const existingData = existing as any
  if (existingData.status === 'closed' || existingData.status === 'consolidated') {
    throw new Error('No se puede editar un registro cerrado o consolidado. Solo se pueden agregar anexos.')
  }

  const { data, error } = await (supabase as any)
    .from('accidents')
    .update(updates)
    .eq('id', accidentId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Cerrar un accidente
export async function closeAccident(
  accidentId: string,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<Accident> {
  const { data, error } = await (supabase as any)
    .from('accidents')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: userId,
    })
    .eq('id', accidentId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Marcar DIAT como enviada
export async function markDIATAsSent(
  accidentId: string,
  diatNumber: string,
  supabase: SupabaseClient<Database>
): Promise<Accident> {
  const { data, error } = await (supabase as any)
    .from('accidents')
    .update({
      diat_status: 'sent',
      diat_sent_at: new Date().toISOString(),
      diat_number: diatNumber,
    })
    .eq('id', accidentId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Obtener estadísticas de accidentes
export async function getAccidentStats(
  companyId: string,
  supabase: SupabaseClient<Database>,
  filters?: {
    start_date?: string
    end_date?: string
  }
): Promise<AccidentStats> {
  let query = supabase
    .from('accidents')
    .select('event_type, status, diat_status')
    .eq('company_id', companyId)

  if (filters?.start_date) {
    query = query.gte('event_date', filters.start_date)
  }

  if (filters?.end_date) {
    query = query.lte('event_date', filters.end_date)
  }

  const { data, error } = await query

  if (error) throw error

  const accidents = data || []

  // Contar por tipo
  const by_type = {
    accidente_trabajo: accidents.filter((a: any) => a.event_type === 'accidente_trabajo').length,
    accidente_trayecto: accidents.filter((a: any) => a.event_type === 'accidente_trayecto').length,
    enfermedad_profesional: accidents.filter((a: any) => a.event_type === 'enfermedad_profesional').length,
  }

  // Contar por estado
  const by_status = {
    open: accidents.filter((a: any) => a.status === 'open').length,
    closed: accidents.filter((a: any) => a.status === 'closed').length,
    with_sequelae: accidents.filter((a: any) => a.status === 'with_sequelae').length,
    consolidated: accidents.filter((a: any) => a.status === 'consolidated').length,
  }

  // Contar por estado DIAT
  const by_diat_status = {
    pending: accidents.filter((a: any) => a.diat_status === 'pending').length,
    sent: accidents.filter((a: any) => a.diat_status === 'sent').length,
    overdue: accidents.filter((a: any) => a.diat_status === 'overdue').length,
  }

  // Obtener número de trabajadores activos para calcular tasas
  const { count: employeeCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active')

  // Calcular tasa de frecuencia (accidentes por 100 trabajadores)
  const frequency_rate = employeeCount && employeeCount > 0
    ? (accidents.length / employeeCount) * 100
    : 0

  // Contar accidentes recurrentes (trabajadores con más de 1 accidente)
  const { data: recurrenceData } = await supabase
    .from('accidents')
    .select('employee_rut')
    .eq('company_id', companyId)

  const rutCounts = new Map<string, number>()
  recurrenceData?.forEach((accident: any) => {
    const count = rutCounts.get(accident.employee_rut) || 0
    rutCounts.set(accident.employee_rut, count + 1)
  })

  const recurrence_count = Array.from(rutCounts.values()).filter(count => count > 1).length

  return {
    total: accidents.length,
    by_type,
    by_status,
    by_diat_status,
    frequency_rate: Math.round(frequency_rate * 100) / 100,
    recurrence_count,
  }
}

// Agregar anexo a un accidente
export async function addAccidentAttachment(
  accidentId: string,
  attachment: {
    file_name: string
    file_path: string
    file_type?: string
    file_size?: number
    description?: string
    uploaded_by?: string
  },
  supabase: SupabaseClient<Database>
): Promise<AccidentAttachment> {
  const { data, error } = await (supabase as any)
    .from('accident_attachments')
    .insert({
      accident_id: accidentId,
      ...attachment,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Eliminar anexo
export async function deleteAccidentAttachment(
  attachmentId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { error } = await supabase
    .from('accident_attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) throw error
}

// Verificar y actualizar estado de DIAT (pendiente, enviada, fuera de plazo)
export async function updateDIATStatus(
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  // Obtener accidentes con DIAT pendiente
  const { data: accidents } = await supabase
    .from('accidents')
    .select('id, event_date, diat_status')
    .eq('company_id', companyId)
    .eq('diat_status', 'pending')

  if (!accidents) return

  const now = new Date()
  const oneDayInMs = 24 * 60 * 60 * 1000

  for (const accident of accidents) {
    const accidentData = accident as any
    const eventDate = new Date(accidentData.event_date)
    const daysSinceEvent = Math.floor((now.getTime() - eventDate.getTime()) / oneDayInMs)

    // Si han pasado más de 24 horas, marcar como fuera de plazo
    if (daysSinceEvent > 1 && accidentData.diat_status === 'pending') {
      await (supabase as any)
        .from('accidents')
        .update({ diat_status: 'overdue' })
        .eq('id', accidentData.id)
    }
  }
}

