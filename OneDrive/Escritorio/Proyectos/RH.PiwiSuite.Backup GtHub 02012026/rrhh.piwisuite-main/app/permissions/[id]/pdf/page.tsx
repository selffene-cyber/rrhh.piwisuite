'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { PermissionPDFViewer, PermissionPDF } from '@/components/PermissionPDF'
import { pdf } from '@react-pdf/renderer'

export default function PermissionPDFPage() {
  const params = useParams()
  const permissionId = params.id as string
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [permissionId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Obtener permiso con relaciones
      const { data: permData, error: permError } = await supabase
        .from('permissions')
        .select(`
          *,
          permission_types (*),
          employees (*)
        `)
        .eq('id', permissionId)
        .single()

      if (permError) throw permError
      setPermission(permData)

      // Obtener empleado completo
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, company_id')
        .eq('id', permData.employee_id)
        .single()

      setEmployee(empData)

      // Obtener empresa
      if (empData?.company_id) {
        const { data: compData } = await supabase
          .from('companies')
          .select('id, name, rut, address, employer_name')
          .eq('id', empData.company_id)
          .single()

        setCompany(compData)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!permission || !company || !employee) return

    try {
      const doc = <PermissionPDF permission={permission} company={company} employee={employee} />
      const asPdf = pdf(doc as any)
      const blob = await asPdf.toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Formato: {PRM}-{ID}-{RUT}-{FECHA}
      const permissionId = permission.permission_number || `PRM-${permission.id.substring(0, 8).toUpperCase()}`
      const rut = employee.rut?.replace(/\./g, '').replace(/-/g, '') || 'SIN-RUT'
      const date = new Date(permission.start_date || new Date())
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      const dateStr = `${day}-${month}-${year}`
      
      link.download = `${permissionId}-${rut}-${dateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
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

  if (!permission || !company || !employee) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p>Permiso no encontrado</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <button
        onClick={handleDownload}
        style={{
          position: 'absolute',
          top: '-30px',
          right: '16px',
          zIndex: 1000,
          padding: '6px 12px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '0 0 4px 4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'Helvetica-Bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        Descargar PDF
      </button>
      <PermissionPDFViewer permission={permission} company={company} employee={employee} />
    </div>
  )
}

