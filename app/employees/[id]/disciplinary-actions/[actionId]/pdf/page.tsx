'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DisciplinaryActionPDF from '@/components/DisciplinaryActionPDF'
import { PDFViewer } from '@react-pdf/renderer'
import { pdf } from '@react-pdf/renderer'

export default function DisciplinaryActionPDFPage() {
  const params = useParams()
  const actionId = params.actionId as string
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [riohsRule, setRiohsRule] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [actionId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Obtener amonestación
      const { data: actionData, error: actionError } = await supabase
        .from('disciplinary_actions')
        .select('*')
        .eq('id', actionId)
        .single()

      if (actionError) throw actionError
      setAction(actionData)

      // Obtener empleado
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, company_id')
        .eq('id', actionData.employee_id)
        .single()

      setEmployee(empData)

      // Obtener empresa
      if (empData?.company_id) {
        const { data: compData } = await supabase
          .from('companies')
          .select('id, name, rut, address, city, employer_name')
          .eq('id', empData.company_id)
          .single()

        setCompany(compData)
      }

      // Obtener regla RIOHS si existe
      if (actionData.riohs_rule_id) {
        const { data: ruleData } = await supabase
          .from('riohs_rules')
          .select('*')
          .eq('id', actionData.riohs_rule_id)
          .single()

        setRiohsRule(ruleData)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!action || !company || !employee) return

    try {
      // Para descargar el PDF, el usuario puede usar la función de impresión del navegador
      // o podemos implementar una descarga directa más adelante
      window.print()
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      alert('Error al descargar el PDF')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!action || !company || !employee) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p>Amonestación no encontrada</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <button
        onClick={handleDownload}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          padding: '6px 12px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'Helvetica-Bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        Descargar PDF
      </button>
      <DisciplinaryActionPDF
        action={action}
        company={company}
        employee={employee}
        riohsRule={riohsRule}
      />
    </div>
  )
}

