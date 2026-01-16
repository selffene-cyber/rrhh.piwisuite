import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export interface RIOHSRule {
  id: string
  company_id: string
  code: string
  title: string
  description?: string
  sanctions_allowed: string[]
  procedure_steps?: any
  created_at: string
  updated_at: string
}

export interface DisciplinaryAction {
  id: string
  company_id: string
  employee_id: string
  type: 'verbal' | 'written'
  status: 'draft' | 'under_review' | 'approved' | 'issued' | 'acknowledged' | 'void'
  incident_date: string
  location?: string
  site_client?: string
  riohs_rule_id?: string
  facts: string
  evidence?: any[]
  witnesses?: any[]
  issuer_user_id?: string
  approver_user_id?: string
  issued_at?: string
  acknowledged_at?: string
  ack_method?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface DisciplinaryActionWithDetails extends DisciplinaryAction {
  employee?: {
    id: string
    full_name: string
    rut: string
  }
  riohs_rule?: RIOHSRule
  issuer?: {
    id: string
    email: string
  }
  approver?: {
    id: string
    email: string
  }
}

// Obtener todas las amonestaciones de una empresa
export async function getDisciplinaryActions(
  companyId: string,
  supabase: SupabaseClient<Database>,
  filters?: {
    employee_id?: string
    status?: string
    type?: string
  }
): Promise<DisciplinaryActionWithDetails[]> {
  let query = supabase
    .from('disciplinary_actions')
    .select(`
      *,
      employees (id, full_name, rut),
      riohs_rules (*)
    `)
    .eq('company_id', companyId)
    .order('incident_date', { ascending: false })

  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  const { data, error } = await query

  if (error) throw error

  // Obtener información de usuarios (issuer y approver)
  const actionsWithUsers = await Promise.all(
    (data || []).map(async (action) => {
      let issuer = null
      let approver = null

      if ((action as any).issuer_user_id) {
        const { data: issuerData } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('id', (action as any).issuer_user_id)
          .single()
        issuer = issuerData
      }

      if ((action as any).approver_user_id) {
        const { data: approverData } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('id', (action as any).approver_user_id)
          .single()
        approver = approverData
      }

      return {
        ...(action as any),
        issuer,
        approver,
      }
    })
  )

  return actionsWithUsers as DisciplinaryActionWithDetails[]
}

// Obtener una amonestación por ID
export async function getDisciplinaryAction(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<DisciplinaryActionWithDetails | null> {
  const { data, error } = await supabase
    .from('disciplinary_actions')
    .select(`
      *,
      employees (id, full_name, rut),
      riohs_rules (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) return null

  // Obtener información de usuarios
  let issuer = null
  let approver = null

  if ((data as any).issuer_user_id) {
    const { data: issuerData } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', (data as any).issuer_user_id)
      .single()
    issuer = issuerData
  }

  if ((data as any).approver_user_id) {
    const { data: approverData } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', (data as any).approver_user_id)
      .single()
    approver = approverData
  }

  return {
    ...(data as any),
    issuer,
    approver,
  } as DisciplinaryActionWithDetails
}

// Crear una nueva amonestación
export async function createDisciplinaryAction(
  action: Omit<DisciplinaryAction, 'id' | 'created_at' | 'updated_at'>,
  supabase: SupabaseClient<Database>
): Promise<DisciplinaryAction> {
  const { data, error } = await (supabase as any)
    .from('disciplinary_actions')
    .insert(action)
    .select()
    .single()

  if (error) throw error
  return data
}

// Actualizar una amonestación
export async function updateDisciplinaryAction(
  id: string,
  updates: Partial<DisciplinaryAction>,
  supabase: SupabaseClient<Database>
): Promise<DisciplinaryAction> {
  const { data, error } = await (supabase as any)
    .from('disciplinary_actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Eliminar una amonestación
export async function deleteDisciplinaryAction(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { error } = await supabase
    .from('disciplinary_actions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Aprobar una amonestación
export async function approveDisciplinaryAction(
  id: string,
  approverUserId: string,
  supabase: SupabaseClient<Database>
): Promise<DisciplinaryAction> {
  return updateDisciplinaryAction(
    id,
    {
      status: 'approved',
      approver_user_id: approverUserId,
    },
    supabase
  )
}

// Emitir una amonestación
export async function issueDisciplinaryAction(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<DisciplinaryAction> {
  return updateDisciplinaryAction(
    id,
    {
      status: 'issued',
      issued_at: new Date().toISOString(),
    },
    supabase
  )
}

// Registrar acuse de recibo
export async function acknowledgeDisciplinaryAction(
  id: string,
  ackMethod: string,
  supabase: SupabaseClient<Database>
): Promise<DisciplinaryAction> {
  return updateDisciplinaryAction(
    id,
    {
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      ack_method: ackMethod,
    },
    supabase
  )
}

// Anular una amonestación
export async function voidDisciplinaryAction(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<DisciplinaryAction> {
  return updateDisciplinaryAction(
    id,
    {
      status: 'void',
    },
    supabase
  )
}

// ============================================
// RIOHS Rules
// ============================================

// Obtener todas las reglas RIOHS de una empresa
export async function getRIOHSRules(
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<RIOHSRule[]> {
  const { data, error } = await supabase
    .from('riohs_rules')
    .select('*')
    .eq('company_id', companyId)
    .order('code', { ascending: true })

  if (error) throw error
  return data || []
}

// Obtener una regla RIOHS por ID
export async function getRIOHSRule(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<RIOHSRule | null> {
  const { data, error } = await supabase
    .from('riohs_rules')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Crear una regla RIOHS
export async function createRIOHSRule(
  rule: Omit<RIOHSRule, 'id' | 'created_at' | 'updated_at'>,
  supabase: SupabaseClient<Database>
): Promise<RIOHSRule> {
  const { data, error } = await (supabase as any)
    .from('riohs_rules')
    .insert(rule)
    .select()
    .single()

  if (error) throw error
  return data
}

// Actualizar una regla RIOHS
export async function updateRIOHSRule(
  id: string,
  updates: Partial<RIOHSRule>,
  supabase: SupabaseClient<Database>
): Promise<RIOHSRule> {
  const { data, error } = await (supabase as any)
    .from('riohs_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Eliminar una regla RIOHS
export async function deleteRIOHSRule(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { error } = await supabase
    .from('riohs_rules')
    .delete()
    .eq('id', id)

  if (error) throw error
}

