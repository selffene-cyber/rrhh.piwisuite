'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Company = Database['public']['Tables']['companies']['Row'] & {
  owner_id?: string | null
  status?: string | null
  subscription_tier?: string | null
  max_users?: number | null
  max_employees?: number | null
}

interface CompanyContextType {
  currentCompany: Company | null
  companies: Company[]
  loading: boolean
  setCurrentCompany: (company: Company | null) => void
  refreshCompanies: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

const COMPANY_STORAGE_KEY = 'current_company_id'

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar empresas del usuario
  const loadCompanies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCompanies([])
        setCurrentCompanyState(null)
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

      // Si hay empresas, establecer la empresa actual
      if (companiesData.length > 0) {
        // Intentar restaurar desde localStorage
        const savedCompanyId = localStorage.getItem(COMPANY_STORAGE_KEY)
        const savedCompany = savedCompanyId 
          ? companiesData.find(c => c.id === savedCompanyId)
          : null

        // Si no hay guardada, usar la primera disponible
        // O si es super admin, usar la empresa por defecto del perfil
        if (savedCompany) {
          setCurrentCompanyState(savedCompany)
        } else {
          // Obtener empresa por defecto del perfil
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('default_company_id')
            .eq('id', user.id)
            .single()

          const defaultCompany = profileData?.default_company_id
            ? companiesData.find(c => c.id === profileData.default_company_id)
            : null

          const companyToSet = defaultCompany || companiesData[0]
          setCurrentCompanyState(companyToSet)
          localStorage.setItem(COMPANY_STORAGE_KEY, companyToSet.id)
        }
      } else {
        setCurrentCompanyState(null)
        localStorage.removeItem(COMPANY_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Error al cargar empresas:', error)
      setCompanies([])
      setCurrentCompanyState(null)
    } finally {
      setLoading(false)
    }
  }

  // Función para cambiar empresa actual
  const setCurrentCompany = (company: Company | null) => {
    setCurrentCompanyState(company)
    if (company) {
      localStorage.setItem(COMPANY_STORAGE_KEY, company.id)
    } else {
      localStorage.removeItem(COMPANY_STORAGE_KEY)
    }
  }

  // Cargar al montar
  useEffect(() => {
    loadCompanies()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadCompanies()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const value: CompanyContextType = {
    currentCompany,
    companies,
    loading,
    setCurrentCompany,
    refreshCompanies: loadCompanies,
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany debe usarse dentro de CompanyProvider')
  }
  return context
}

