'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Company = Database['public']['Tables']['companies']['Row']

/**
 * Hook para obtener las empresas del usuario actual
 */
export function useUserCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setCompanies([])
        setLoading(false)
        return
      }

      // Verificar si es super admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      let companiesData: Company[] = []

      if (profile?.role === 'super_admin') {
        // Super admin ve todas las empresas
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('name', { ascending: true })

        if (error) throw error
        companiesData = (data || []) as Company[]
      } else {
        // Usuario regular ve solo sus empresas asignadas
        const { data, error } = await supabase
          .from('company_users')
          .select(`
            company:companies(*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (error) throw error
        companiesData = (data || []).map((item: any) => item.company).filter(Boolean) as Company[]
      }

      setCompanies(companiesData)
      setError(null)
    } catch (err) {
      console.error('Error al cargar empresas:', err)
      setError(err instanceof Error ? err : new Error('Error desconocido'))
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  return {
    companies,
    loading,
    error,
    refresh: loadCompanies,
  }
}

