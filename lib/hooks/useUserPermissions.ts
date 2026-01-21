'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UserRole, UserPermissions, DEFAULT_PERMISSIONS } from '@/types'

/**
 * Hook para obtener y gestionar permisos del usuario actual
 * 
 * Retorna:
 * - permissions: Objeto con todos los permisos del usuario
 * - role: Rol del usuario (super_admin, admin, executive, user)
 * - loading: Estado de carga
 * - canCreate: Helper para verificar si puede crear un módulo
 * - canApprove: Helper para verificar si puede aprobar un módulo
 * - canManage: Helper para verificar si puede gestionar un módulo
 */
export function useUserPermissions(companyId?: string) {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setPermissions(null)
        setRole(null)
        setLoading(false)
        return
      }

      // Obtener rol del usuario desde user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error al cargar perfil:', profileError)
        setError(profileError.message)
        setPermissions(null)
        setRole(null)
        setLoading(false)
        return
      }

      const userRole = profile?.role as UserRole

      // Si es super_admin, tiene todos los permisos (no necesita consultar DB)
      if (userRole === 'super_admin') {
        setRole('super_admin')
        setPermissions(DEFAULT_PERMISSIONS.super_admin as UserPermissions)
        setLoading(false)
        return
      }

      // Si no hay companyId, solo retornar el rol sin permisos específicos
      if (!companyId) {
        setRole(userRole)
        setPermissions(DEFAULT_PERMISSIONS[userRole] as UserPermissions)
        setLoading(false)
        return
      }

      // Cargar permisos personalizados de la BD para esta empresa
      const { data: customPermissions, error: permError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single()

      if (permError && permError.code !== 'PGRST116') {
        // PGRST116 = no encontrado (es normal si no tiene permisos personalizados)
        console.error('Error al cargar permisos:', permError)
      }

      // Si tiene permisos personalizados, usarlos; sino usar permisos por defecto del rol
      if (customPermissions) {
        setPermissions(customPermissions as unknown as UserPermissions)
      } else {
        setPermissions(DEFAULT_PERMISSIONS[userRole] as UserPermissions)
      }

      setRole(userRole)
    } catch (err: any) {
      console.error('Error inesperado al cargar permisos:', err)
      setError(err.message || 'Error desconocido')
      setPermissions(null)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Helper: ¿Puede CREAR en este módulo?
  const canCreate = useCallback((module: string): boolean => {
    if (!permissions) return false
    const key = `can_create_${module}` as keyof UserPermissions
    return permissions[key] === true
  }, [permissions])

  // Helper: ¿Puede APROBAR en este módulo?
  const canApprove = useCallback((module: string): boolean => {
    if (!permissions) return false
    const key = `can_approve_${module}` as keyof UserPermissions
    return permissions[key] === true
  }, [permissions])

  // Helper: ¿Puede GESTIONAR este módulo?
  const canManage = useCallback((module: string): boolean => {
    if (!permissions) return false
    const key = `can_manage_${module}` as keyof UserPermissions
    return permissions[key] === true
  }, [permissions])

  // Helper: ¿Es admin o superior?
  const isAdmin = role === 'admin' || role === 'super_admin'

  // Helper: ¿Es super admin?
  const isSuperAdmin = role === 'super_admin'

  // Helper: ¿Es ejecutivo?
  const isExecutive = role === 'executive'

  // Helper: ¿Es solo usuario (trabajador)?
  const isUser = role === 'user'

  return {
    permissions,
    role,
    loading,
    error,
    refresh: loadPermissions,
    
    // Helpers de verificación
    canCreate,
    canApprove,
    canManage,
    
    // Helpers de rol
    isAdmin,
    isSuperAdmin,
    isExecutive,
    isUser,
  }
}
