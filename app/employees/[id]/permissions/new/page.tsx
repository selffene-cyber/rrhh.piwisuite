'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function NewPermissionPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [loading, setLoading] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [permissionTypes, setPermissionTypes] = useState<any[]>([])
  const [formData, setFormData] = useState({
    permission_type_code: '',
    reason: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    days: '',
    hours: '',
    notes: '',
  })

  useEffect(() => {
    if (currentCompany && params.id) {
      loadData()
    }
  }, [currentCompany, params.id])

  // Función para calcular días hábiles entre dos fechas (excluyendo sábados y domingos)
  const calculateBusinessDays = (start: Date, end: Date): number => {
    let count = 0
    const current = new Date(start)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      // Excluir sábados (6) y domingos (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return count
  }

  // Función para calcular fecha de término sumando días hábiles a una fecha de inicio
  const addBusinessDays = (startDate: Date, businessDays: number): Date => {
    const result = new Date(startDate)
    let daysAdded = 0
    
    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1)
      const dayOfWeek = result.getDay()
      // Solo contar días hábiles (lunes a viernes)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++
      }
    }
    
    return result
  }

  useEffect(() => {
    // Calcular fecha de término automáticamente cuando cambian fecha de inicio o días
    // Solo calcular si hay días ingresados y fecha de inicio
    if (formData.start_date && formData.days && formData.days.trim() !== '' && parseFloat(formData.days) > 0) {
      const start = new Date(formData.start_date)
      const businessDays = parseFloat(formData.days)
      const endDate = addBusinessDays(start, businessDays)
      const endDateStr = endDate.toISOString().split('T')[0]
      
      // Solo actualizar si es diferente para evitar loops
      if (formData.end_date !== endDateStr) {
        setFormData(prev => ({ ...prev, end_date: endDateStr }))
      }
    } else if (formData.days === '' || parseFloat(formData.days) <= 0) {
      // Si no hay días o son 0, limpiar fecha de término
      if (formData.end_date !== '') {
        setFormData(prev => ({ ...prev, end_date: '' }))
      }
    }
  }, [formData.start_date, formData.days])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      // Cargar trabajador
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('id', params.id)
        .single()

      setEmployee(empData)

      // Cargar tipos de permisos
      const response = await fetch('/api/permission-types')
      const types = await response.json()
      setPermissionTypes(types)
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCompany) return

    setLoading(true)

    try {
      const days = parseFloat(formData.days)
      if (!days || days <= 0) {
        alert('Debe ingresar una cantidad de días mayor a 0')
        setLoading(false)
        return
      }

      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: currentCompany.id,
          employee_id: params.id,
          permission_type_code: formData.permission_type_code,
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days: days,
          hours: formData.hours ? parseInt(formData.hours) : null,
          notes: formData.notes || null,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear permiso')
      }

      alert('Permiso creado correctamente')
      router.push(`/employees/${params.id}/permissions`)
    } catch (error: any) {
      alert('Error al crear permiso: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedType = permissionTypes.find(
    (t) => t.code === formData.permission_type_code
  )

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1>Nuevo Permiso - {employee?.full_name || 'Cargando...'}</h1>
        <Link href={`/employees/${params.id}/permissions`}>
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de Permiso *</label>
            <select
              required
              value={formData.permission_type_code}
              onChange={(e) =>
                setFormData({ ...formData, permission_type_code: e.target.value })
              }
            >
              <option value="">Seleccione un tipo</option>
              {permissionTypes.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.label}
                  {type.affects_payroll ? ' (Sin goce de sueldo)' : ' (Con goce de sueldo)'}
                </option>
              ))}
            </select>
            {selectedType && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {selectedType.description}
                {selectedType.affects_payroll && (
                  <span style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                    ⚠️ Este permiso descuenta remuneración proporcional
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Motivo del Permiso *</label>
            <input
              type="text"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Ej: Asuntos personales, Trámites, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Inicio *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Fecha de Término *</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                readOnly
                style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                title="Se calcula automáticamente según los días hábiles"
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Calculada automáticamente (días hábiles, excluye sábados y domingos)
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Días Hábiles *</label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                placeholder="0"
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Ingrese la cantidad de días hábiles (excluye sábados y domingos)
              </p>
            </div>
            <div className="form-group">
              <label>Horas (opcional)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Información adicional sobre el permiso..."
            />
          </div>

          {selectedType && selectedType.affects_payroll && employee && (
            <div
              style={{
                padding: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontWeight: '500', color: '#991b1b', marginBottom: '4px' }}>
                Impacto en Liquidación
              </div>
              <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
                Este permiso descontará:{' '}
                <strong>
                  ${Math.round((employee.base_salary / 30) * (parseFloat(formData.days) || 0)).toLocaleString('es-CL')}
                </strong>
                {' '}de la liquidación del trabajador
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Permiso'}
            </button>
            <Link href={`/employees/${params.id}/permissions`}>
              <button type="button" className="secondary">
                Cancelar
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

