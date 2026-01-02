'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function GenerateCertificatesPage() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [formData, setFormData] = useState({
    employee_id: '',
    certificate_type: 'antiguedad' as 'antiguedad' | 'renta' | 'vigencia',
    issue_date: new Date().toISOString().split('T')[0],
    months_period: 3 as 3 | 6 | 12,
    valid_until: '',
    purpose: '',
  })

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    }
  }, [companyId])

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      alert('Error al cargar trabajadores: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    if (!formData.employee_id) {
      alert('Por favor selecciona un trabajador')
      return
    }
    if (!formData.issue_date) {
      alert('Por favor ingresa la fecha de emisión')
      return
    }

    // Redirigir según el tipo de certificado
    const basePath = `/employees/${formData.employee_id}/certificates/${formData.certificate_type}`
    const queryParams = new URLSearchParams({
      issue_date: formData.issue_date,
      purpose: formData.purpose || '',
    })

    if (formData.certificate_type === 'renta') {
      queryParams.append('months_period', formData.months_period.toString())
    } else if (formData.certificate_type === 'vigencia') {
      if (formData.valid_until) {
        queryParams.append('valid_until', formData.valid_until)
      }
    }

    // Remover folio_number de queryParams ya que se genera automáticamente
    queryParams.delete('folio_number')

    router.push(`${basePath}?${queryParams.toString()}`)
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Generar Certificados Laborales</h1>
        <Link href="/">
          <button className="secondary">Volver al Dashboard</button>
        </Link>
      </div>

      <div className="card">
        <h2>Datos del Certificado</h2>
        <div className="form-group">
          <label>Trabajador *</label>
          <select
            required
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
          >
            <option value="">Seleccione un trabajador</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} - {emp.rut}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tipo de Certificado *</label>
          <select
            required
            value={formData.certificate_type}
            onChange={(e) => setFormData({ ...formData, certificate_type: e.target.value as 'antiguedad' | 'renta' | 'vigencia' })}
          >
            <option value="antiguedad">Certificado de Antigüedad</option>
            <option value="renta">Certificado de Renta</option>
            <option value="vigencia">Certificado de Vigencia Laboral</option>
          </select>
        </div>

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
          {formData.certificate_type === 'renta' && (
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
          )}
          {formData.certificate_type === 'vigencia' && (
            <div className="form-group">
              <label>Válido Hasta (Opcional)</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          )}
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

      <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
        <button onClick={handleGenerate}>
          Generar Certificado
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

