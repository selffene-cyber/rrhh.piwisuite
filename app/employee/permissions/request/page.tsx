'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft, FaCalendarCheck } from 'react-icons/fa'
import '../../employee-portal.css'

interface PermissionType {
  code: string
  label: string
  description?: string
  affects_payroll: boolean
}

export default function RequestPermissionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [permissionTypes, setPermissionTypes] = useState<PermissionType[]>([])
  const [formData, setFormData] = useState({
    permission_type_code: '',
    reason: '',
    start_date: '',
    end_date: '',
    hours: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [daysCount, setDaysCount] = useState(0)

  useEffect(() => {
    loadPermissionTypes()
  }, [])

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays()
    } else {
      setDaysCount(0)
    }
  }, [formData.start_date, formData.end_date])

  const loadPermissionTypes = async () => {
    try {
      const response = await fetch('/api/employee/permission-types')
      if (response.ok) {
        const result = await response.json()
        setPermissionTypes(result.permissionTypes || [])
      }
    } catch (err) {
      console.error('Error al cargar tipos de permisos:', err)
    } finally {
      setLoadingTypes(false)
    }
  }

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) {
      setDaysCount(0)
      return
    }

    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)

    if (end < start) {
      setDaysCount(0)
      return
    }

    // Calcular días hábiles (excluyendo sábados y domingos)
    let count = 0
    const current = new Date(start)
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }

    setDaysCount(count || 1) // Mínimo 1 día
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.permission_type_code) {
        setError('Debe seleccionar un tipo de permiso')
        setLoading(false)
        return
      }

      if (!formData.reason.trim()) {
        setError('El motivo del permiso es requerido')
        setLoading(false)
        return
      }

      if (!formData.start_date || !formData.end_date) {
        setError('Debe seleccionar fechas de inicio y fin')
        setLoading(false)
        return
      }

      const response = await fetch('/api/employee/permissions/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permission_type_code: formData.permission_type_code,
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days: daysCount,
          hours: formData.hours ? parseInt(formData.hours) : 0,
          notes: formData.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al crear la solicitud')
        setLoading(false)
        return
      }

      alert('Solicitud de permiso creada exitosamente. Será revisada por un administrador.')
      router.push('/employee/requests')
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud')
      setLoading(false)
    }
  }

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0]

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
          <FaCalendarCheck style={{ color: '#4F46E5' }} /> Solicitar Permiso
        </h1>
      </div>

      <div className="form-container">
        {error && (
          <div className="error-message" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {loadingTypes ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Cargando tipos de permisos...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Tipo de Permiso *
              </label>
              <select
                required
                value={formData.permission_type_code}
                onChange={(e) => setFormData({ ...formData, permission_type_code: e.target.value })}
                className="form-input"
              >
                <option value="">Seleccione un tipo</option>
                {permissionTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label} {type.affects_payroll ? '(sin goce)' : '(con goce)'}
                  </option>
                ))}
              </select>
              {formData.permission_type_code && (
                <small style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                  {permissionTypes.find(t => t.code === formData.permission_type_code)?.description}
                </small>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Motivo del Permiso *
              </label>
              <input
                type="text"
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ej: Trámite personal, consulta médica, etc."
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                min={today}
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Fecha de Fin *
              </label>
              <input
                type="date"
                required
                min={formData.start_date || today}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="form-input"
              />
            </div>

            {daysCount > 0 && (
              <div className="info-card" style={{ marginBottom: '20px' }}>
                Días hábiles calculados: <strong>{daysCount}</strong>
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
                Horas (opcional)
              </label>
              <input
                type="number"
                min="0"
                max="8"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="Si el permiso es por horas"
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Notas (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Información adicional sobre el permiso..."
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
                disabled={loading || daysCount <= 0}
                className="form-button-primary"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

