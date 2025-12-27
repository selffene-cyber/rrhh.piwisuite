'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AnnexPDF from '@/components/AnnexPDF'

export default function AnnexPDFPage() {
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [annex, setAnnex] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      const { data: annexData, error: annexError } = await supabase
        .from('contract_annexes')
        .select(`
          *,
          contracts (*),
          employees (*),
          companies (*)
        `)
        .eq('id', params.id)
        .single()

      if (annexError) throw annexError

      setAnnex(annexData)
      setContract(annexData.contracts)
      setEmployee(annexData.employees)
      setCompany(annexData.companies)
    } catch (error: any) {
      console.error('Error al cargar anexo:', error)
      alert('Error al cargar anexo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <p>Cargando anexo...</p>
      </div>
    )
  }

  if (!annex || !employee || !company) {
    return (
      <div>
        <p>Error al cargar los datos del anexo</p>
      </div>
    )
  }

  return <AnnexPDF annex={annex} contract={contract} employee={employee} company={company} />
}



