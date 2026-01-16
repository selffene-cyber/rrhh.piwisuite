'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft, FaUmbrellaBeach } from 'react-icons/fa'
import '../../employee-portal.css'

export default function RequestVacationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [vacationBalance, setVacationBalance] = useState<any>(null)
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [daysCount, setDaysCount] = useState(0)

  useEffect(() => {
    loadVacationBalance()
  }, [])

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays()
    } else {
      setDaysCount(0)
    }
  }, [formData.start_date, formData.end_date])

  const loadVacationBalance = async () => {
    try {
      const response = await fetch('/api/employee/dashboard')
      if (response.ok) {
        const data = await response.json()
        setVacationBalance(data.vacationBalance)
      }
    } catch (err) {
      console.error('Error al cargar saldo de vacaciones:', err)
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

    setDaysCount(count)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.start_date || !formData.end_date) {
        setError('Debe seleccionar fechas de inicio y fin')
        setLoading(false)
        return
      }

      if (daysCount <= 0) {
        setError('Debe seleccionar al menos un día hábil')
        setLoading(false)
        return
      }

      if (vacationBalance && daysCount > vacationBalance.available) {
        setError(`No tiene suficientes días disponibles. Disponibles: ${Math.round(vacationBalance.available)}, Solicitados: ${daysCount}`)
        setLoading(false)
        return
      }

      const response = await fetch('/api/employee/vacations/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: formData.start_date,
          end_date: formData.end_date,
          notes: formData.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al crear la solicitud')
        setLoading(false)
        return
      }

      alert(result.message || 'Solicitud de vacaciones creada exitosamente. Será revisada por un administrador.')
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
          <FaUmbrellaBeach style={{ color: '#4F46E5' }} /> Solicitar Vacaciones
        </h1>
      </div>

      {vacationBalance && (
        <div className="glass-card" style={{
          padding: '20px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(124, 58, 237, 0.1))'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
            Días disponibles
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#4F46E5' }}>
            {Math.round(vacationBalance.available)} días
          </div>
        </div>
      )}

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
              Días hábiles seleccionados: <strong>{daysCount}</strong>
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
              Notas (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Información adicional sobre la solicitud..."
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
      </div>
    </div>
  )
}

