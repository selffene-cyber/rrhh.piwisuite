'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

const VACATION_STATUSES = [
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'tomada', label: 'Tomada' },
  { value: 'cancelada', label: 'Cancelada' },
]

export default function NewVacationPage() {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    days_count: 0,
    status: 'solicitada',
    notes: '',
  })

  useEffect(() => {
    if (currentCompany) {
      loadEmployees()
    }
  }, [currentCompany])

  const loadEmployees = async () => {
    if (!currentCompany) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error al cargar empleados:', error)
    }
  }

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      setFormData({ ...formData, days_count: diffDays })
    }
  }

  useEffect(() => {
    calculateDays()
  }, [formData.start_date, formData.end_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCompany) return

    setSaving(true)

    try {
      // Usar API para crear vacación (incluye validación de contrato activo)
      const response = await fetch('/api/vacations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: formData.employee_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: formData.days_count,
          status: formData.status,
          notes: formData.notes || null,
          request_date: new Date().toISOString().split('T')[0],
          approval_date: (formData.status === 'aprobada' || formData.status === 'tomada') 
            ? new Date().toISOString().split('T')[0] 
            : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al registrar vacación')
      }

      alert('Vacación registrada correctamente')
      router.push('/vacations')
    } catch (error: any) {
      alert('Error al registrar vacación: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!currentCompany) {
    return (
      <div>
        <h1>Nueva Vacación</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para crear una vacación.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nueva Vacación</h1>
        <Link href="/vacations">
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Datos de la Vacación</h2>

          <div className="form-group">
            <label>Empleado *</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              required
            >
              <option value="">Seleccionar empleado</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha Inicio *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha Término *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Días *</label>
              <input
                type="number"
                value={formData.days_count}
                onChange={(e) => setFormData({ ...formData, days_count: parseInt(e.target.value) || 0 })}
                required
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Estado *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                {VACATION_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear Vacación'}
          </button>
          <Link href="/vacations">
            <button type="button" className="secondary">
              Cancelar
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}

