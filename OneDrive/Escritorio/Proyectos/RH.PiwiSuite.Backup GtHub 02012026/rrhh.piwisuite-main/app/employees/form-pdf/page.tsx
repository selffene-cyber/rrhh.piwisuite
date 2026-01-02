'use client'

import { EmployeeFormPDF } from '@/components/EmployeeFormPDF'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function EmployeeFormPDFPage() {
  const { companyId } = useCurrentCompany()
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (companyId) {
      loadCompany()
    } else {
      setLoading(false)
    }
  }, [companyId])

  const loadCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name, rut, address')
        .eq('id', companyId)
        .single()

      if (error) throw error
      setCompany(data)
    } catch (error: any) {
      console.error('Error al cargar empresa:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!companyId || !company) {
    return (
      <div>
        <h1>Formulario de Registro de Trabajador</h1>
        <div className="card">
          <p>Por favor, selecciona una empresa para generar el formulario.</p>
          <Link href="/employees">
            <button>Volver</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000,
        display: 'flex',
        gap: '8px'
      }}>
        <PDFDownloadLink
          document={<EmployeeFormPDF company={company} />}
          fileName={`Formulario-Registro-Trabajador-${new Date().toISOString().split('T')[0]}.pdf`}
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-block'
          }}
        >
          Descargar PDF
        </PDFDownloadLink>
        <Link href="/employees">
          <button style={{ 
            padding: '8px 16px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            Volver
          </button>
        </Link>
      </div>
      <PDFViewer width="100%" height="100%">
        <EmployeeFormPDF company={company} />
      </PDFViewer>
    </div>
  )
}

