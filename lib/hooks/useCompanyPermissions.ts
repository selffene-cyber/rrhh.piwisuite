'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from './useCurrentCompany'

type CompanyRole = 'owner' | 'admin' | 'user'
type SystemRole = 'super_admin' | 'admin' | 'user'

interface Permissions {
  isSuperAdmin: boolean
  companyRole: CompanyRole | null
  canManageCompany: boolean
  canManageUsers: boolean
  canManageEmployees: boolean
  canManagePayroll: boolean
  canViewReports: boolean
}

/**
 * Hook para verificar permisos del usuario en la empresa actual
 */
export function useCompanyPermissions() {
  const { companyId } = useCurrentCompany()
  const [permissions, setPermissions] = useState<Permissions>({
    isSuperAdmin: false,
    companyRole: null,
    canManageCompany: false,
    canManageUsers: false,
    canManageEmployees: false,
    canManagePayroll: false,
    canViewReports: true, // Todos pueden ver reportes básicos
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPermissions()
  }, [companyId])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setPermissions({
          isSuperAdmin: false,
          companyRole: null,
          canManageCompany: false,
          canManageUsers: false,
          canManageEmployees: false,
          canManagePayroll: false,
          canViewReports: false,
        })
        setLoading(false)
        return
      }

      // Verificar rol del sistema
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const isSuperAdmin = profile?.role === 'super_admin'

      let companyRole: CompanyRole | null = null

      if (companyId) {
        // Obtener rol en la empresa actual
        const { data: companyUser } = await supabase
          .from('company_users')
          .select('role')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('status', 'active')
          .single()

        companyRole = companyUser?.role as CompanyRole | null
      }

      // Calcular permisos
      const canManageCompany = isSuperAdmin || companyRole === 'owner'
      const canManageUsers = isSuperAdmin || companyRole === 'owner'
      const canManageEmployees = isSuperAdmin || ['owner', 'admin'].includes(companyRole || '')
      const canManagePayroll = isSuperAdmin || ['owner', 'admin'].includes(companyRole || '')
      const canViewReports = true // Todos pueden ver reportes

      setPermissions({
        isSuperAdmin,
        companyRole,
        canManageCompany,
        canManageUsers,
        canManageEmployees,
        canManagePayroll,
        canViewReports,
      })
    } catch (error) {
      console.error('Error al cargar permisos:', error)
      setPermissions({
        isSuperAdmin: false,
        companyRole: null,
        canManageCompany: false,
        canManageUsers: false,
        canManageEmployees: false,
        canManagePayroll: false,
        canViewReports: false,
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    ...permissions,
    loading,
    refresh: loadPermissions,
  }
}

