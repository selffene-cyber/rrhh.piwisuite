'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'

const LEAVE_TYPES = [
  { value: 'enfermedad_comun', label: 'Enfermedad Común' },
  { value: 'accidente_trabajo', label: 'Accidente del Trabajo' },
  { value: 'enfermedad_profesional', label: 'Enfermedad Profesional' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'otro', label: 'Otro' },
]

export default function MedicalLeavesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [leaves, setLeaves] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    leave_type: 'enfermedad_comun',
    days_count: 0,
    folio_number: '',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Cargar empleado
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, company_id, status')
        .eq('id', params.id)
        .single()
      
      if (empData) setEmployee(empData)

      // Cargar licencias
      const { data: leavesData, error } = await supabase
        .from('medical_leaves')
        .select('id, employee_id, start_date, end_date, leave_type, days_count, folio_number, is_active, description, created_at, updated_at')
        .eq('employee_id', params.id)
        .order('start_date', { ascending: false })

      if (error) throw error
      setLeaves(leavesData || [])

      // Verificar y actualizar estado del trabajador según licencias activas
      await checkAndUpdateEmployeeStatus(leavesData || [], empData)
    } catch (error: any) {
      alert('Error al cargar licencias: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Función para verificar y actualizar el estado del trabajador según licencias activas
  const checkAndUpdateEmployeeStatus = async (leaves: any[], currentEmployeeData: any) => {
    try {
      if (!currentEmployeeData) {
        console.log('No hay datos del empleado')
        return
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0) // Normalizar a inicio del día

      console.log('Verificando estado del trabajador:', {
        employeeId: params.id,
        currentStatus: currentEmployeeData.status,
        today: today.toISOString().split('T')[0],
        totalLeaves: leaves.length
      })

      // Buscar licencias activas que estén vigentes hoy
      const activeVigentLeaves = leaves.filter((leave: any) => {
        if (!leave.is_active) {
          console.log('Licencia no activa:', leave.id)
          return false
        }
        
        const startDate = new Date(leave.start_date)
        const endDate = new Date(leave.end_date)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(0, 0, 0, 0)
        
        const isVigent = today >= startDate && today <= endDate
        console.log('Licencia:', {
          id: leave.id,
          start_date: leave.start_date,
          end_date: leave.end_date,
          is_active: leave.is_active,
          isVigent
        })
        
        return isVigent
      })

      console.log('Licencias vigentes encontradas:', activeVigentLeaves.length)

      // Si hay licencias activas vigentes, el estado debe ser 'licencia_medica'
      if (activeVigentLeaves.length > 0) {
        if (currentEmployeeData.status !== 'licencia_medica') {
          console.log('Actualizando estado a licencia_medica...')
          const { data: updatedData, error: updateError } = await supabase
            .from('employees')
            .update({ status: 'licencia_medica' })
            .eq('id', params.id)
            .select('id, full_name, rut, company_id, status')
            .single()

          if (updateError) {
            console.error('Error al actualizar estado a licencia_medica:', updateError)
            alert(`Error al actualizar estado: ${updateError.message}`)
          } else {
            console.log('Estado actualizado correctamente:', updatedData)
            setEmployee(updatedData)
            alert('Estado del trabajador actualizado a "Licencia Médica"')
          }
        } else {
          console.log('El estado ya es licencia_medica, no se requiere actualización')
        }
      } else {
        // Si no hay licencias activas vigentes y el estado es 'licencia_medica', volver a 'active'
        if (currentEmployeeData.status === 'licencia_medica') {
          // Verificar si hay licencias activas en el futuro (no vigentes hoy pero activas)
          const futureActiveLeaves = leaves.filter((leave: any) => {
            if (!leave.is_active) return false
            const startDate = new Date(leave.start_date)
            startDate.setHours(0, 0, 0, 0)
            return today < startDate
          })

          // Solo cambiar a 'active' si no hay licencias futuras activas
          if (futureActiveLeaves.length === 0) {
            console.log('No hay licencias vigentes ni futuras, cambiando a active...')
            const { data: updatedData, error: updateError } = await supabase
              .from('employees')
              .update({ status: 'active' })
              .eq('id', params.id)
              .select('id, full_name, rut, company_id, status')
              .single()

            if (updateError) {
              console.error('Error al actualizar estado a active:', updateError)
            } else {
              console.log('Estado actualizado a active:', updatedData)
              setEmployee(updatedData)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error al verificar estado del trabajador:', error)
      alert(`Error al verificar estado: ${error.message}`)
    }
  }

  // Función manual para forzar actualización del estado
  const handleForceUpdateStatus = async () => {
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, company_id, status')
        .eq('id', params.id)
        .single()

      const { data: leavesData } = await supabase
        .from('medical_leaves')
        .select('*')
        .eq('employee_id', params.id)
        .order('start_date', { ascending: false })

      await checkAndUpdateEmployeeStatus(leavesData || [], empData)
    } catch (error: any) {
      alert('Error al forzar actualización: ' + error.message)
    }
  }

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) {
      setFormData({ ...formData, days_count: 0 })
      return
    }

    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 para incluir ambos días
    
    setFormData({ ...formData, days_count: diffDays > 0 ? diffDays : 0 })
  }

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays()
    }
  }, [formData.start_date, formData.end_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.start_date || !formData.end_date) {
        alert('Debes ingresar fecha de inicio y término')
        return
      }

      if (formData.days_count <= 0) {
        alert('El número de días debe ser mayor a 0')
        return
      }

      // Verificar si hay solapamiento con otras licencias activas
      const { data: overlapping } = await supabase
        .from('medical_leaves')
        .select('id, start_date, end_date')
        .eq('employee_id', params.id)
        .eq('is_active', true)
        .or(`and(start_date.lte.${formData.end_date},end_date.gte.${formData.start_date})`)

      if (overlapping && overlapping.length > 0) {
        if (!confirm('Ya existe una licencia médica activa en ese período. ¿Deseas continuar de todas formas?')) {
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('medical_leaves')
        .insert({
          employee_id: params.id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          leave_type: formData.leave_type,
          days_count: formData.days_count,
          folio_number: formData.folio_number || null,
          description: formData.description || null,
          is_active: formData.is_active,
        })

      if (error) throw error

      alert('Licencia médica registrada correctamente')
      setShowForm(false)
      setFormData({
        start_date: '',
        end_date: '',
        leave_type: 'enfermedad_comun',
        days_count: 0,
        folio_number: '',
        description: '',
        is_active: true,
      })
      // Recargar datos y verificar estado del trabajador
      await loadData()
    } catch (error: any) {
      alert('Error al registrar licencia: ' + error.message)
      setSaving(false)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (leaveId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('medical_leaves')
        .update({ is_active: !currentStatus })
        .eq('id', leaveId)

      if (error) throw error

      // Recargar datos y verificar estado del trabajador
      await loadData()
    } catch (error: any) {
      alert('Error al actualizar licencia: ' + error.message)
    }
  }

  const handleDelete = async (leaveId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta licencia médica?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('medical_leaves')
        .delete()
        .eq('id', leaveId)

      if (error) throw error

      // Verificar si hay otras licencias activas
      const { data: activeLeaves } = await supabase
        .from('medical_leaves')
        .select('*')
        .eq('employee_id', params.id)
        .eq('is_active', true)
        .limit(1)

      if (!activeLeaves || activeLeaves.length === 0) {
        // No hay licencias activas, volver estado a activo
        await supabase
          .from('employees')
          .update({ status: 'active' })
          .eq('id', params.id)
      }

      loadData()
      alert('Licencia médica eliminada correctamente')
    } catch (error: any) {
      alert('Error al eliminar licencia: ' + error.message)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  // Obtener licencia activa actual
  const activeLeave = leaves.find((l: any) => {
    if (!l.is_active) return false
    const today = new Date()
    const start = new Date(l.start_date)
    const end = new Date(l.end_date)
    return today >= start && today <= end
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Licencias Médicas - {employee?.full_name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleForceUpdateStatus}
            className="secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            title="Forzar actualización del estado del trabajador según licencias activas"
          >
            Actualizar Estado
          </button>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nueva Licencia'}
          </button>
          <Link href={`/employees/${params.id}`}>
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      {activeLeave && (
        <div className="card" style={{ 
          marginBottom: '24px', 
          background: '#fef3c7', 
          border: '2px solid #f59e0b' 
        }}>
          <h2 style={{ color: '#92400e', marginBottom: '12px' }}>⚠️ Licencia Médica Activa</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Período</label>
              <p>{formatDate(activeLeave.start_date)} - {formatDate(activeLeave.end_date)}</p>
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <p>{LEAVE_TYPES.find(t => t.value === activeLeave.leave_type)?.label || activeLeave.leave_type}</p>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Días</label>
              <p>{activeLeave.days_count} días</p>
            </div>
            {activeLeave.folio_number && (
              <div className="form-group">
                <label>Folio</label>
                <p>{activeLeave.folio_number}</p>
              </div>
            )}
          </div>
          <p style={{ marginTop: '12px', color: '#92400e', fontWeight: 'bold' }}>
            Las liquidaciones de este período se calcularán excluyendo los días de licencia.
          </p>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Nueva Licencia Médica</h2>
          <form onSubmit={handleSubmit}>
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
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Licencia *</label>
                <select
                  required
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Número de Días *</label>
                <input
                  type="number"
                  required
                  min="1"
                  readOnly
                  value={formData.days_count}
                  style={{ background: '#f9fafb' }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Calculado automáticamente según las fechas
                </small>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Número de Folio (Opcional)</label>
                <input
                  type="text"
                  value={formData.folio_number}
                  onChange={(e) => setFormData({ ...formData, folio_number: e.target.value })}
                  placeholder="Ej: 123456"
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                >
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Descripción (Opcional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Observaciones adicionales sobre la licencia"
              />
            </div>
            <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
              <button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Licencia'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowForm(false)
                  setFormData({
                    start_date: '',
                    end_date: '',
                    leave_type: 'enfermedad_comun',
                    days_count: 0,
                    folio_number: '',
                    description: '',
                    is_active: true,
                  })
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Historial de Licencias Médicas</h2>
        {leaves.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Fecha Inicio</th>
                <th>Fecha Término</th>
                <th>Tipo</th>
                <th>Días</th>
                <th>Folio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave: any) => {
                const today = new Date()
                const start = new Date(leave.start_date)
                const end = new Date(leave.end_date)
                const isCurrent = today >= start && today <= end && leave.is_active
                
                return (
                  <tr key={leave.id} style={isCurrent ? { background: '#fef3c7' } : {}}>
                    <td>{formatDate(leave.start_date)}</td>
                    <td>{formatDate(leave.end_date)}</td>
                    <td>{LEAVE_TYPES.find(t => t.value === leave.leave_type)?.label || leave.leave_type}</td>
                    <td>{leave.days_count}</td>
                    <td>{leave.folio_number || '-'}</td>
                    <td>
                      <span className={`badge ${leave.is_active ? 'active' : 'inactive'}`}>
                        {leave.is_active ? (isCurrent ? 'Vigente' : 'Activa') : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleToggleActive(leave.id, leave.is_active)}
                        >
                          {leave.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          className="danger"
                          onClick={() => handleDelete(leave.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p>No hay licencias médicas registradas para este trabajador.</p>
        )}
      </div>
    </div>
  )
}


