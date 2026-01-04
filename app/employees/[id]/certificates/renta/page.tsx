'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function CertificateRentaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [formData, setFormData] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    months_period: 3 as 3 | 6 | 12,
    purpose: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (companyId) {
      loadData()
    }
  }, [companyId])

  const loadData = async () => {
    try {
      // Cargar empleado
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, rut, company_id')
        .eq('id', params.id)
        .eq('company_id', companyId)
        .single()

      if (empError) throw empError
      setEmployee(empData)

      // Cargar empresa
      const { data: compData } = await supabase
        .from('companies')
        .select('id, name, rut, address, employer_name')
        .eq('id', companyId)
        .single()

      setCompany(compData)
    } catch (error: any) {
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!formData.issue_date) {
      alert('Por favor ingresa la fecha de emisión')
      return
    }

    try {
      // Validar que el empleado pueda recibir un certificado (requiere contrato activo, pero permite durante licencia médica)
      const { createValidationServices } = await import('@/lib/services/validationHelpers')
      const { employee } = createValidationServices(supabase)
      const validation = await employee.canGenerateCertificate(params.id)
      
      if (!validation.allowed) {
        alert(validation.message)
        return
      }

      // Crear certificado en la BD para generar folio automático
      const { data: certificate, error } = await supabase
        .from('certificates')
        .insert({
          company_id: companyId,
          employee_id: params.id,
          certificate_type: 'renta',
          issue_date: formData.issue_date,
          months_period: formData.months_period,
          purpose: formData.purpose || null,
          status: 'issued',
        })
        .select('folio_number')
        .single()

      if (error) throw error

      // Redirigir a la página PDF con los parámetros
      const queryParams = new URLSearchParams({
        issue_date: formData.issue_date,
        months_period: formData.months_period.toString(),
        purpose: formData.purpose || '',
      })
      router.push(`/employees/${params.id}/certificates/renta/pdf?${queryParams.toString()}`)
    } catch (error: any) {
      alert('Error al generar certificado: ' + error.message)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!employee) {
    return <div>Trabajador no encontrado</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Certificado de Renta - {employee.full_name}</h1>
        <Link href={`/employees/${params.id}/certificates`}>
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <h2>Datos del Certificado</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha de Emisión *</label>
            <input
              type="date"
              required
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Período a Certificar *</label>
            <select
              required
              value={formData.months_period}
              onChange={(e) => setFormData({ ...formData, months_period: parseInt(e.target.value) as 3 | 6 | 12 })}
            >
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Propósito del Certificado (Opcional)</label>
          <textarea
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="Ej: Para trámite bancario, Para otro empleador, etc."
            rows={3}
          />
        </div>
      </div>

      <div className="card">
        <h2>Información del Trabajador</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Trabajador</label>
            <p>{employee.full_name}</p>
          </div>
          <div className="form-group">
            <label>RUT</label>
            <p>{employee.rut}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Cargo</label>
            <p>{employee.position}</p>
          </div>
          <div className="form-group">
            <label>Empresa</label>
            <p>{company?.name || '-'}</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
        <button onClick={handleGenerate} disabled={saving}>
          Generar PDF
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => router.back()}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

