'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AnnexPDF from '@/components/AnnexPDF'

export default function AnnexPDFPage() {
  const params = useParams()
  const annexId = params.id as string
  const [loading, setLoading] = useState(true)
  const [annex, setAnnex] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [annexId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar anexo con relaciones
      const { data: annexData, error: annexError } = await supabase
        .from('contract_annexes')
        .select(`
          *,
          contracts (*),
          employees (*),
          companies (*)
        `)
        .eq('id', annexId)
        .single()

      if (annexError) throw annexError

      // Si tiene pdf_url, usarlo directamente
      if (annexData.pdf_url) {
        setPdfUrl(annexData.pdf_url)
      }

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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Cargando PDF...</p>
      </div>
    )
  }

  if (!annex || !employee || !company) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No se encontraron los datos del anexo</p>
      </div>
    )
  }

  // Si tiene pdf_url guardado, mostrarlo directamente en un iframe (como los certificados)
  if (pdfUrl) {
    return (
      <div style={{ 
        margin: 0, 
        padding: 0, 
        width: '100vw', 
        height: '100vh',
        overflow: 'hidden'
      }}>
        <iframe
          src={pdfUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          title="Anexo de Contrato PDF"
        />
      </div>
    )
  }

  // Si no tiene pdf_url, generar dinámicamente
  return <AnnexPDF annex={annex} contract={contract} employee={employee} company={company} />
}



