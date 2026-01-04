'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function NewPermissionPage() {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [permissionTypes, setPermissionTypes] = useState<any[]>([])
  const [formData, setFormData] = useState({
    employee_id: '',
    permission_type_code: '',
    reason: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    days: '',
    hours: '',
    notes: '',
  })
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)

  useEffect(() => {
    if (currentCompany) {
      loadData()
    }
  }, [currentCompany])

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

  useEffect(() => {
    // Cargar datos del empleado seleccionado
    if (formData.employee_id) {
      const emp = employees.find((e) => e.id === formData.employee_id)
      setSelectedEmployee(emp)
    } else {
      setSelectedEmployee(null)
    }
  }, [formData.employee_id, employees])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      // Cargar trabajadores activos
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      setEmployees(empData || [])

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

    if (!formData.employee_id) {
      alert('Debe seleccionar un trabajador')
      return
    }

    setLoading(true)

    try {
      const days = parseFloat(formData.days)
      if (!days || days <= 0) {
        alert('Debe ingresar una cantidad de días mayor a 0')
        setLoading(false)
        return
      }
      if (days <= 0) {
        alert('Los días deben ser mayor a 0')
        return
      }

      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: currentCompany.id,
          employee_id: formData.employee_id,
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
      router.push('/permissions')
    } catch (error: any) {
      alert('Error al crear permiso: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedType = permissionTypes.find(
    (t) => t.code === formData.permission_type_code
  )

  if (!currentCompany) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          Seleccione una empresa para crear un permiso.
        </p>
      </div>
    )
  }

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
        <h1>Nuevo Permiso</h1>
        <Link href="/permissions">
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Trabajador *</label>
            <select
              required
              value={formData.employee_id}
              onChange={(e) =>
                setFormData({ ...formData, employee_id: e.target.value })
              }
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

          {selectedType && selectedType.affects_payroll && selectedEmployee && (
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
                  ${Math.round((selectedEmployee.base_salary / 30) * (parseFloat(formData.days) || 0)).toLocaleString('es-CL')}
                </strong>
                {' '}de la liquidación del trabajador
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Permiso'}
            </button>
            <Link href="/permissions">
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

