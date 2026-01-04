'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import OvertimePactPDF from '@/components/OvertimePactPDF'

export default function OvertimePactPDFPage() {
  const params = useParams()
  const pactId = params.id as string
  const [pact, setPact] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [pactId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar pacto con relaciones
      const { data: pactData, error: pactError } = await supabase
        .from('overtime_pacts')
        .select(`
          *,
          employees (*),
          companies (*)
        `)
        .eq('id', pactId)
        .single()

      if (pactError) throw pactError

      setPact(pactData)
      setEmployee(pactData.employees)
      setCompany(pactData.companies)
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Cargando PDF...</p>
      </div>
    )
  }

  if (!pact || !employee || !company) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No se encontraron los datos del pacto</p>
      </div>
    )
  }

  return <OvertimePactPDF pact={pact} employee={employee} company={company} />
}

