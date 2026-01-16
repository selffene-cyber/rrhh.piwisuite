'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft, FaFileAlt } from 'react-icons/fa'
import '../../employee-portal.css'

export default function RequestCertificatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    certificate_type: '',
    purpose: '',
    months_period: '12',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.certificate_type) {
        setError('Debe seleccionar un tipo de certificado')
        setLoading(false)
        return
      }

      const response = await fetch('/api/employee/certificates/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificate_type: formData.certificate_type,
          purpose: formData.purpose,
          months_period: formData.certificate_type === 'renta' ? parseInt(formData.months_period) : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al crear la solicitud')
        setLoading(false)
        return
      }

      alert('Solicitud de certificado creada exitosamente. Será revisada por un administrador.')
      router.push('/employee/requests')
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }} className="fade-in-up">
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/employee"
          className="back-button-icon"
          style={{ marginBottom: '16px' }}
        >
          <FaArrowLeft />
        </Link>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaFileAlt style={{ color: '#4F46E5' }} /> Solicitar Certificado
        </h1>
      </div>

      <div className="form-container">
        {error && (
          <div className="error-message" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827'
            }}>
              Tipo de Certificado *
            </label>
            <select
              required
              value={formData.certificate_type}
              onChange={(e) => setFormData({ ...formData, certificate_type: e.target.value })}
              className="form-input"
            >
              <option value="">Seleccione un tipo</option>
              <option value="antiguedad">Certificado de Antigüedad</option>
              <option value="renta">Certificado de Renta</option>
              <option value="vigencia">Certificado de Vigencia de Contrato</option>
            </select>
          </div>

          {formData.certificate_type === 'renta' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Período (meses) *
              </label>
              <select
                required
                value={formData.months_period}
                onChange={(e) => setFormData({ ...formData, months_period: e.target.value })}
                className="form-input"
              >
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827'
            }}>
              Propósito (opcional)
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Ej: Solicitud de crédito, trámite bancario, etc."
              rows={4}
              className="form-input"
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => router.back()}
              className="form-button-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="form-button-primary"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

