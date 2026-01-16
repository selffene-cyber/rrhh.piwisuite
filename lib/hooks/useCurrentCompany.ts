'use client'

import { useCompany } from '@/lib/contexts/CompanyContext'

/**
 * Hook para obtener la empresa actual
 * Retorna la empresa seleccionada y funciones útiles
 */
export function useCurrentCompany() {
  const { currentCompany, setCurrentCompany, companies, loading } = useCompany()

  return {
    company: currentCompany,
    companyId: currentCompany?.id || null,
    companies,
    loading,
    setCurrentCompany,
    hasMultipleCompanies: companies.length > 1,
    hasCompany: !!currentCompany,
  }
}

