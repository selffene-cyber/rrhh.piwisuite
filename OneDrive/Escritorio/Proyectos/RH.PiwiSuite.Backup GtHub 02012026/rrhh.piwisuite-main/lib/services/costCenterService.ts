import { SupabaseClient } from '@supabase/supabase-js'
import { Database, CostCenter, UserCostCenter } from '@/types'

/**
 * Obtener todos los centros de costo de una empresa
 * - Admin: ve todos los CC activos e inactivos
 * - User: solo ve los CC que tiene asignados
 */
export async function getCostCenters(
  companyId: string,
  supabase: SupabaseClient<Database>,
  includeInactive: boolean = false
): Promise<CostCenter[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar rol del usuario en la empresa
  const { data: companyUser } = await supabase
    .from('company_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .single()

  const isAdmin = companyUser?.role === 'owner' || companyUser?.role === 'admin'

  if (isAdmin) {
    // Admin ve todos los CC de la empresa
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('company_id', companyId)
      .in('status', includeInactive ? ['active', 'inactive'] : ['active'])
      .order('code', { ascending: true })

    if (error) throw error
    return data || []
  } else {
    // User solo ve sus CC asignados
    const { data, error } = await supabase
      .from('user_cost_centers')
      .select(`
        cost_centers (*)
      `)
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .in('cost_centers.status', includeInactive ? ['active', 'inactive'] : ['active'])

    if (error) throw error
    return (data || []).map((item: any) => item.cost_centers).filter(Boolean)
  }
}

/**
 * Obtener un centro de costo por ID
 */
export async function getCostCenterById(
  costCenterId: string,
  supabase: SupabaseClient<Database>
): Promise<CostCenter | null> {
  const { data, error } = await supabase
    .from('cost_centers')
    .select('*')
    .eq('id', costCenterId)
    .single()

  if (error) throw error
  return data
}

/**
 * Crear un nuevo centro de costo
 * Solo admins pueden crear
 */
export async function createCostCenter(
  companyId: string,
  costCenterData: {
    code: string
    name: string
    description?: string
    status?: 'active' | 'inactive'
  },
  supabase: SupabaseClient<Database>
): Promise<CostCenter> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar permisos
  const { data: companyUser } = await supabase
    .from('company_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .single()

  if (!companyUser) {
    throw new Error('No tienes permisos para crear centros de costo')
  }

  const { data, error } = await supabase
    .from('cost_centers')
    .insert({
      company_id: companyId,
      code: costCenterData.code,
      name: costCenterData.name,
      description: costCenterData.description || null,
      status: costCenterData.status || 'active',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Actualizar un centro de costo
 * Solo admins pueden actualizar
 */
export async function updateCostCenter(
  costCenterId: string,
  updates: {
    code?: string
    name?: string
    description?: string
    status?: 'active' | 'inactive'
  },
  supabase: SupabaseClient<Database>
): Promise<CostCenter> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Obtener el CC para verificar la empresa
  const costCenter = await getCostCenterById(costCenterId, supabase)
  if (!costCenter) throw new Error('Centro de costo no encontrado')

  // Verificar permisos
  const { data: companyUser } = await supabase
    .from('company_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', costCenter.company_id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .single()

  if (!companyUser) {
    throw new Error('No tienes permisos para actualizar este centro de costo')
  }

  const { data, error } = await supabase
    .from('cost_centers')
    .update(updates)
    .eq('id', costCenterId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Eliminar un centro de costo
 * Solo admins pueden eliminar
 */
export async function deleteCostCenter(
  costCenterId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Obtener el CC para verificar la empresa
  const costCenter = await getCostCenterById(costCenterId, supabase)
  if (!costCenter) throw new Error('Centro de costo no encontrado')

  // Verificar permisos
  const { data: companyUser } = await supabase
    .from('company_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', costCenter.company_id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .single()

  if (!companyUser) {
    throw new Error('No tienes permisos para eliminar este centro de costo')
  }

  // Verificar que no haya trabajadores asignados
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('cost_center_id', costCenterId)
    .limit(1)

  if (employees && employees.length > 0) {
    throw new Error('No se puede eliminar el centro de costo porque tiene trabajadores asignados')
  }

  const { error } = await supabase
    .from('cost_centers')
    .delete()
    .eq('id', costCenterId)

  if (error) throw error
}

/**
 * Obtener centros de costo asignados a un usuario
 */
export async function getUserCostCenters(
  userId: string,
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<CostCenter[]> {
  const { data, error } = await supabase
    .from('user_cost_centers')
    .select(`
      cost_centers (*)
    `)
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error) throw error
  return (data || []).map((item: any) => item.cost_centers).filter(Boolean)
}

/**
 * Asignar centros de costo a un usuario
 * Solo admins pueden asignar
 */
export async function assignCostCentersToUser(
  userId: string,
  companyId: string,
  costCenterIds: string[],
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar permisos
  const { data: companyUser } = await supabase
    .from('company_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .single()

  if (!companyUser) {
    throw new Error('No tienes permisos para asignar centros de costo')
  }

  // Eliminar asignaciones existentes
  const { error: deleteError } = await supabase
    .from('user_cost_centers')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (deleteError) throw deleteError

  // Crear nuevas asignaciones
  if (costCenterIds.length > 0) {
    const assignments = costCenterIds.map(ccId => ({
      user_id: userId,
      company_id: companyId,
      cost_center_id: ccId,
    }))

    const { error: insertError } = await supabase
      .from('user_cost_centers')
      .insert(assignments)

    if (insertError) throw insertError
  }
}

/**
 * Verificar si un usuario es admin de una empresa
 */
export async function isCompanyAdmin(
  userId: string,
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('company_users')
    .select('role')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .single()

  if (error || !data) return false
  return true
}

