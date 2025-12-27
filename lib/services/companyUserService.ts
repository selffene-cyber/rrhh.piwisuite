import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type CompanyUser = Database['public']['Tables']['company_users']['Row']
type CompanyUserInsert = Database['public']['Tables']['company_users']['Insert']
type CompanyUserUpdate = Database['public']['Tables']['company_users']['Update']

export interface CompanyUserWithDetails extends CompanyUser {
  user?: {
    email: string
    full_name: string | null
    role: string
  }
  company?: {
    name: string
  }
}

/**
 * Obtener usuarios de una empresa
 */
export async function getCompanyUsers(companyId: string, supabase: SupabaseClient<Database>): Promise<CompanyUserWithDetails[]> {
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar permisos
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = (profile as any)?.role === 'super_admin'
  
  if (!isSuperAdmin) {
    // Verificar si es owner o admin de la empresa
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .single()

    if (!companyUser) {
      throw new Error('No tienes permisos para ver usuarios de esta empresa')
    }
  }

  const { data: companyUsers, error } = await supabase
    .from('company_users')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Obtener datos de usuarios para cada company_user
  const data = await Promise.all(
    (companyUsers || []).map(async (cu) => {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('email, full_name, role')
        .eq('id', (cu as any).user_id)
        .single()

      return {
        ...(cu as any),
        user: userProfile || null
      }
    })
  )

  if (error) throw error

  return (data || []) as CompanyUserWithDetails[]
}

/**
 * Asignar usuario a empresa (invitar)
 */
export async function assignUserToCompany(
  companyId: string,
  userId: string,
  supabase: SupabaseClient<Database>,
  role: 'owner' | 'admin' | 'user' = 'user'
): Promise<CompanyUser> {
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar permisos
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = (profile as any)?.role === 'super_admin'
  
  if (!isSuperAdmin) {
    // Verificar si es owner de la empresa
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .eq('role', 'owner')
      .single()

    if (!companyUser) {
      throw new Error('Solo los propietarios pueden asignar usuarios a la empresa')
    }
  }

  // Verificar que el usuario no esté ya asignado
  const { data: existing } = await supabase
    .from('company_users')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single()

  if (existing) {
    throw new Error('El usuario ya está asignado a esta empresa')
  }

  const { data, error } = await (supabase as any)
    .from('company_users')
    .insert({
      user_id: userId,
      company_id: companyId,
      role,
      status: 'active',
      invited_by: user.id,
      joined_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remover usuario de empresa
 */
export async function removeUserFromCompany(companyId: string, userId: string, supabase: SupabaseClient<Database>): Promise<void> {
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar permisos
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = (profile as any)?.role === 'super_admin'
  
  if (!isSuperAdmin) {
    // Verificar si es owner de la empresa
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .eq('role', 'owner')
      .single()

    if (!companyUser) {
      throw new Error('Solo los propietarios pueden remover usuarios de la empresa')
    }
  }

  // No permitir que un owner se elimine a sí mismo (debe haber al menos un owner)
  if (userId === user.id && !isSuperAdmin) {
    const { data: userRelation } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single()

    if ((userRelation as any)?.role === 'owner') {
      // Contar otros owners
      const { count } = await supabase
        .from('company_users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'owner')
        .eq('status', 'active')
        .neq('user_id', userId)

      if ((count || 0) === 0) {
        throw new Error('No puedes removerte a ti mismo. Debe haber al menos un propietario de la empresa.')
      }
    }
  }

  const { error } = await supabase
    .from('company_users')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error) throw error
}

/**
 * Actualizar rol de usuario en empresa
 */
export async function updateUserCompanyRole(
  companyId: string,
  userId: string,
  newRole: 'owner' | 'admin' | 'user',
  supabase: SupabaseClient<Database>
): Promise<CompanyUser> {
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar permisos
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = (profile as any)?.role === 'super_admin'
  
  if (!isSuperAdmin) {
    // Verificar si es owner de la empresa
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .eq('role', 'owner')
      .single()

    if (!companyUser) {
      throw new Error('Solo los propietarios pueden cambiar roles de usuarios')
    }
  }

  // Si se está cambiando de owner a otro rol, verificar que quede al menos un owner
  if (newRole !== 'owner') {
    const { data: currentRelation } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single()

    if ((currentRelation as any)?.role === 'owner') {
      const { count } = await supabase
        .from('company_users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'owner')
        .eq('status', 'active')
        .neq('user_id', userId)

      if ((count || 0) === 0) {
        throw new Error('No se puede cambiar el rol. Debe haber al menos un propietario de la empresa.')
      }
    }
  }

  const { data, error } = await (supabase as any)
    .from('company_users')
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Buscar usuario por email (para asignar a empresa)
 */
export async function findUserByEmail(email: string, supabase: SupabaseClient<Database>): Promise<{ id: string; email: string; full_name: string | null } | null> {
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('email', email.toLowerCase())
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

