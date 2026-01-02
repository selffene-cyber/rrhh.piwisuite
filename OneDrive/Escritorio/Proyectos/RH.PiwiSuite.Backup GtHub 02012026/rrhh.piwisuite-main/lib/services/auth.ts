import { supabase } from '@/lib/supabase/client'
import { createServerClient } from '@/lib/supabase/server-component'

export interface UserProfile {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'user'
  full_name?: string
}

/**
 * Obtiene el perfil del usuario actual desde el cliente
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error al obtener perfil:', error)
      return null
    }

    return profile as UserProfile
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return null
  }
}

/**
 * Obtiene el perfil del usuario actual desde el servidor
 */
export async function getCurrentUserProfileServer(): Promise<UserProfile | null> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error al obtener perfil:', error)
      return null
    }

    return profile as UserProfile
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return null
  }
}

/**
 * Verifica si el usuario actual es super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'super_admin'
}

/**
 * Verifica si el usuario actual es super admin (servidor)
 */
export async function isSuperAdminServer(): Promise<boolean> {
  const profile = await getCurrentUserProfileServer()
  return profile?.role === 'super_admin'
}


