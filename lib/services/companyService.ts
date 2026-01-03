import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Company = Database['public']['Tables']['companies']['Row']
type CompanyInsert = Database['public']['Tables']['companies']['Insert']
type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export interface CompanyWithStats extends Company {
  user_count?: number
  employee_count?: number
  owner_email?: string
}

/**
 * Obtener todas las empresas (solo para super admin)
 */
export async function getAllCompanies(supabase: SupabaseClient<Database>): Promise<CompanyWithStats[]> {
  
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Obtener estadísticas y owner email para cada empresa
  const companiesWithStats = await Promise.all(
    (companies || []).map(async (company: Company) => {
      const [userCount, employeeCount, ownerProfile] = await Promise.all([
        supabase
          .from('company_users')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'active'),
        supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id),
        company.owner_id
          ? supabase
              .from('user_profiles')
              .select('email')
              .eq('id', company.owner_id)
              .single()
          : Promise.resolve({ data: null, error: null })
      ])

      return {
        ...company,
        user_count: userCount.count || 0,
        employee_count: employeeCount.count || 0,
        owner_email: (ownerProfile.data as any)?.email || null
      }
    })
  )

  return companiesWithStats
}

/**
 * Obtener una empresa por ID
 */
export async function getCompanyById(companyId: string, supabase: SupabaseClient<Database>): Promise<Company | null> {
  
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

/**
 * Obtener empresas del usuario actual
 */
export async function getUserCompanies(supabase: SupabaseClient<Database>): Promise<Company[]> {
  
  // Verificar si es super admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Si es super admin, retornar todas las empresas
  if ((profile as any)?.role === 'super_admin') {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Si no, retornar solo empresas asignadas
  const { data, error } = await supabase
    .from('company_users')
    .select('company:companies(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data || []).map((item: any) => item.company).filter(Boolean)
}

/**
 * Crear una nueva empresa
 */
export async function createCompany(companyData: CompanyInsert, supabase: SupabaseClient<Database>, ownerId?: string): Promise<Company> {
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar que sea super admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'super_admin') {
    throw new Error('Solo los super administradores pueden crear empresas')
  }

  // Crear empresa
  const insertData: CompanyInsert = {
    ...companyData,
    owner_id: ownerId || user.id,
    status: 'active'
  }
  const { data: company, error: companyError } = await (supabase as any)
    .from('companies')
    .insert(insertData)
    .select()
    .single()

  if (companyError) throw companyError

  // Si se especificó un owner diferente, crear la relación
  const finalOwnerId = ownerId || user.id
  if (finalOwnerId !== user.id) {
    const { error: relationError } = await (supabase as any)
      .from('company_users')
      .insert({
        user_id: finalOwnerId,
        company_id: company.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (relationError) {
      // Si falla la relación, intentar eliminar la empresa creada
      await supabase.from('companies').delete().eq('id', company.id)
      throw relationError
    }
  } else {
    // Si el owner es el usuario actual, también crear la relación
    const { error: relationError } = await (supabase as any)
      .from('company_users')
      .insert({
        user_id: user.id,
        company_id: company.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (relationError) {
      await supabase.from('companies').delete().eq('id', company.id)
      throw relationError
    }
  }

  return company
}

/**
 * Actualizar una empresa
 */
export async function updateCompany(companyId: string, updates: CompanyUpdate, supabase: SupabaseClient<Database>): Promise<Company> {
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar permisos (super admin o owner de la empresa)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = (profile as any)?.role === 'super_admin'
  
  if (!isSuperAdmin) {
    // Verificar si es owner
    const { data: company } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', companyId)
      .single()

    if ((company as any)?.owner_id !== user.id) {
      // Verificar en company_users
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .eq('role', 'owner')
        .single()

      if (!companyUser) {
        throw new Error('No tienes permisos para actualizar esta empresa')
      }
    }
  }

  const { data, error } = await (supabase as any)
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Eliminar una empresa (solo super admin)
 */
export async function deleteCompany(companyId: string, supabase: SupabaseClient<Database>): Promise<void> {
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Verificar que sea super admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'super_admin') {
    throw new Error('Solo los super administradores pueden eliminar empresas')
  }

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId)

  if (error) throw error
}

