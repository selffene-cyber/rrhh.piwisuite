import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { CostCenter, UserCostCenter } from '@/types'

/**
 * Obtiene todos los centros de costo de una empresa
 */
export async function getCostCenters(
  companyId: string,
  supabase: SupabaseClient<Database>,
  includeInactive: boolean = false
): Promise<CostCenter[]> {
  let query = supabase
    .from('cost_centers')
    .select('*')
    .eq('company_id', companyId)
    .order('code', { ascending: true })

  if (!includeInactive) {
    query = query.eq('status', 'active')
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []) as CostCenter[]
}

/**
 * Crea un nuevo centro de costo
 */
export async function createCostCenter(
  companyId: string,
  data: {
    code: string
    name: string
    description?: string
    status?: 'active' | 'inactive'
  },
  supabase: SupabaseClient<Database>
): Promise<CostCenter> {
  const { data: newCC, error } = await (supabase
    .from('cost_centers') as any)
    .insert({
      company_id: companyId,
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description || null,
      status: data.status || 'active',
    })
    .select()
    .single()

  if (error) throw error
  return newCC as CostCenter
}

/**
 * Actualiza un centro de costo
 */
export async function updateCostCenter(
  id: string,
  data: Partial<{
    code: string
    name: string
    description: string
    status: 'active' | 'inactive'
  }>,
  supabase: SupabaseClient<Database>
): Promise<CostCenter> {
  const updateData: any = {}
  if (data.code !== undefined) updateData.code = data.code.toUpperCase()
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.status !== undefined) updateData.status = data.status

  const { data: updated, error } = await (supabase
    .from('cost_centers') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as CostCenter
}

/**
 * Elimina un centro de costo
 */
export async function deleteCostCenter(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { error } = await supabase
    .from('cost_centers')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Obtiene los centros de costo asignados a un usuario en una empresa
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

  return (data || [])
    .map((item: any) => item.cost_centers)
    .filter((cc: any) => cc !== null) as CostCenter[]
}

/**
 * Asigna centros de costo a un usuario
 */
export async function assignCostCentersToUser(
  userId: string,
  companyId: string,
  costCenterIds: string[],
  supabase: SupabaseClient<Database>
): Promise<void> {
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

    const { error: insertError } = await (supabase
      .from('user_cost_centers') as any)
      .insert(assignments)

    if (insertError) throw insertError
  }
}

/**
 * Verifica si un usuario es administrador de una empresa
 */
export async function isCompanyAdmin(
  userId: string,
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('company_users')
    .select('role, status')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) {
    console.error('Error verificando isCompanyAdmin:', error)
    return false
  }

  const userData = data as { role: string; status: string }
  const isAdmin = (userData.role === 'admin' || userData.role === 'owner') && userData.status === 'active'
  console.log('isCompanyAdmin check:', { userId, companyId, role: userData.role, status: userData.status, isAdmin })
  return isAdmin
}

