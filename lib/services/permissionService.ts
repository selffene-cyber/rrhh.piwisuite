import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export interface PermissionType {
  id: string
  code: string
  label: string
  description?: string
  affects_payroll: boolean
  requires_approval: boolean
  created_at: string
}

export interface Permission {
  id: string
  company_id: string
  employee_id: string
  permission_type_code: string
  reason: string
  start_date: string
  end_date: string
  days: number
  hours?: number
  status: 'draft' | 'approved' | 'applied' | 'void'
  approved_by?: string
  approved_at?: string
  applied_to_payroll: boolean
  payroll_slip_id?: string
  discount_amount: number
  attachment_url?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PermissionWithDetails extends Permission {
  employee?: {
    id: string
    full_name: string
    rut: string
  }
  permission_type?: PermissionType
  approved_by_user?: {
    id: string
    email: string
  }
  created_by_user?: {
    id: string
    email: string
  }
}

// Obtener todos los tipos de permisos
export async function getPermissionTypes(
  supabase: SupabaseClient<Database>
): Promise<PermissionType[]> {
  const { data, error } = await supabase
    .from('permission_types')
    .select('*')
    .order('code', { ascending: true })

  if (error) throw error
  return data || []
}

// Obtener todas las permisos de una empresa
export async function getPermissions(
  companyId: string,
  supabase: SupabaseClient<Database>,
  filters?: {
    employee_id?: string
    status?: string
    permission_type_code?: string
    start_date?: string
    end_date?: string
  }
): Promise<PermissionWithDetails[]> {
  let query = supabase
    .from('permissions')
    .select(`
      *,
      employees (id, full_name, rut),
      permission_types (*)
    `)
    .eq('company_id', companyId)
    .order('start_date', { ascending: false })

  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.permission_type_code) {
    query = query.eq('permission_type_code', filters.permission_type_code)
  }

  if (filters?.start_date) {
    query = query.gte('start_date', filters.start_date)
  }

  if (filters?.end_date) {
    query = query.lte('end_date', filters.end_date)
  }

  const { data, error } = await query

  if (error) throw error

  // Obtener información de usuarios
  const permissionsWithUsers = await Promise.all(
    (data || []).map(async (permission) => {
      let approvedByUser = null
      let createdByUser = null

      if ((permission as any).approved_by) {
        const { data: approvedData } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('id', (permission as any).approved_by)
          .single()
        approvedByUser = approvedData
      }

      if ((permission as any).created_by) {
        const { data: createdData } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('id', (permission as any).created_by)
          .single()
        createdByUser = createdData
      }

      return {
        ...(permission as any),
        approved_by_user: approvedByUser,
        created_by_user: createdByUser,
      }
    })
  )

  return permissionsWithUsers as PermissionWithDetails[]
}

// Obtener permisos de un trabajador en un período específico
export async function getEmployeePermissionsForPeriod(
  employeeId: string,
  startDate: string,
  endDate: string,
  supabase: SupabaseClient<Database>
): Promise<PermissionWithDetails[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select(`
      *,
      permission_types (*)
    `)
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .eq('applied_to_payroll', false)
    .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`)
    .order('start_date', { ascending: true })

  if (error) throw error
  return (data || []) as PermissionWithDetails[]
}

// Obtener un permiso por ID
export async function getPermission(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<PermissionWithDetails | null> {
  const { data, error } = await supabase
    .from('permissions')
    .select(`
      *,
      employees (id, full_name, rut),
      permission_types (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) return null

  // Obtener información de usuarios
  let approvedByUser = null
  let createdByUser = null

  if ((data as any).approved_by) {
    const { data: approvedData } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', (data as any).approved_by)
      .single()
    approvedByUser = approvedData
  }

  if ((data as any).created_by) {
    const { data: createdData } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', (data as any).created_by)
      .single()
    createdByUser = createdData
  }

  return {
    ...(data as any),
    approved_by_user: approvedByUser,
    created_by_user: createdByUser,
  } as PermissionWithDetails
}

// Crear un nuevo permiso
export async function createPermission(
  permission: Omit<Permission, 'id' | 'created_at' | 'updated_at' | 'applied_to_payroll' | 'discount_amount'>,
  supabase: SupabaseClient<Database>
): Promise<Permission> {
  // Calcular días si no se proporciona
  const start = new Date((permission as any).start_date)
  const end = new Date((permission as any).end_date)
  const days = (permission as any).days || Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1)

  const { data, error } = await (supabase as any)
    .from('permissions')
    .insert({
      ...(permission as any),
      days,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Actualizar un permiso
export async function updatePermission(
  id: string,
  updates: Partial<Permission>,
  supabase: SupabaseClient<Database>
): Promise<Permission> {
  const { data, error } = await (supabase as any)
    .from('permissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Eliminar un permiso
export async function deletePermission(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { error } = await supabase
    .from('permissions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Aprobar un permiso
export async function approvePermission(
  id: string,
  approverUserId: string,
  supabase: SupabaseClient<Database>
): Promise<Permission> {
  return updatePermission(
    id,
    {
      status: 'approved',
      approved_by: approverUserId,
      approved_at: new Date().toISOString(),
    },
    supabase
  )
}

// Marcar permiso como aplicado a liquidación
export async function markPermissionAsApplied(
  id: string,
  payrollSlipId: string,
  discountAmount: number,
  supabase: SupabaseClient<Database>
): Promise<Permission> {
  return updatePermission(
    id,
    {
      status: 'applied',
      applied_to_payroll: true,
      payroll_slip_id: payrollSlipId,
      discount_amount: discountAmount,
    },
    supabase
  )
}

// Anular un permiso
export async function voidPermission(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<Permission> {
  return updatePermission(
    id,
    {
      status: 'void',
    },
    supabase
  )
}

// Calcular descuento por permiso sin goce
export function calculatePermissionDiscount(
  baseSalary: number,
  permissionDays: number
): number {
  // Fórmula: (sueldo_base / 30) * días_permiso
  return Math.round((baseSalary / 30) * permissionDays)
}

