'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import ContractPDF from '@/components/ContractPDF'

export default function ContractPDFPage() {
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [contract, setContract] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          *,
          employees (*),
          companies (*)
        `)
        .eq('id', params.id)
        .single()

      if (contractError) throw contractError

      setContract(contractData)
      setEmployee(contractData.employees)
      setCompany(contractData.companies)
    } catch (error: any) {
      console.error('Error al cargar contrato:', error)
      alert('Error al cargar contrato: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <p>Cargando contrato...</p>
      </div>
    )
  }

  if (!contract || !employee || !company) {
    return (
      <div>
        <p>Error al cargar los datos del contrato</p>
      </div>
    )
  }

  return <ContractPDF contract={contract} employee={employee} company={company} />
}



