'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaStethoscope, FaEye, FaPlus, FaTrash, FaTimes } from 'react-icons/fa'

const LEAVE_TYPES = [
  { value: 'enfermedad_comun', label: 'Enfermedad Común' },
  { value: 'accidente_trabajo', label: 'Accidente del Trabajo' },
  { value: 'enfermedad_profesional', label: 'Enfermedad Profesional' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'otro', label: 'Otro' },
]

const LEAVE_TYPES_MAP: Record<string, string> = Object.fromEntries(LEAVE_TYPES.map(t => [t.value, t.label]))

export default function MedicalLeavesManagementPage() {
  const { company: currentCompany, companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [leaves, setLeaves] = useState<any[]>([])
  const [employees, setEmployees] = useState<Record<string, any>>({})
  const [employeesList, setEmployeesList] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'upcoming'>('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    leave_type: 'enfermedad_comun',
    days_count: 0,
    folio_number: '',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    if (companyId) {
      loadData()
    }
  }, [companyId, filterStatus])

  const loadData = async () => {
    if (!companyId) return

    try {
      setLoading(true)

      // Obtener IDs de empleados de la empresa
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, rut, position')
        .eq('company_id', companyId)

      if (!employeesData) return

      const employeeIds = employeesData.map((emp: { id: string }) => emp.id)
      const employeesMap: Record<string, any> = {}
      employeesData.forEach((emp: { id: string; full_name: string; rut: string; position: string | null }) => {
        employeesMap[emp.id] = emp
      })
      setEmployees(employeesMap)
      setEmployeesList(employeesData)

      if (employeeIds.length === 0) {
        setLeaves([])
        setLoading(false)
        return
      }

      // Obtener todas las licencias médicas de los empleados de la empresa
      const { data: leavesData, error } = await supabase
        .from('medical_leaves')
        .select('*')
        .in('employee_id', employeeIds)
        .order('start_date', { ascending: false })

      if (error) throw error

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const expiredActiveLeaves = (leavesData || []).filter((leave: any) => {
        if (!leave.is_active) return false
        const endDate = new Date(leave.end_date)
        endDate.setHours(0, 0, 0, 0)
        return today > endDate
      })

        if (expiredActiveLeaves.length > 0) {
          const expiredIds = expiredActiveLeaves.map((l: any) => l.id)
          await supabase
            .from('medical_leaves')
            .update({ is_active: false })
            .in('id', expiredIds)

          leavesData.forEach((leave: any) => {
            if (expiredIds.includes(leave.id)) {
              leave.is_active = false
            }
          })

          const affectedEmployeeIds = [...new Set(expiredActiveLeaves.map((l: any) => l.employee_id))]
        for (const employeeId of affectedEmployeeIds) {
          const { data: remainingActive } = await supabase
            .from('medical_leaves')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('is_active', true)
            .limit(1)

          if (!remainingActive || remainingActive.length === 0) {
            await supabase
              .from('employees')
              .update({ status: 'active' })
              .eq('id', employeeId)
              .eq('status', 'licencia_medica')
          }
        }
      }

      // Filtrar según el estado seleccionado
      const todayFilter = new Date()
      todayFilter.setHours(0, 0, 0, 0)

      let filteredLeaves = leavesData || []

      if (filterStatus === 'active') {
        filteredLeaves = filteredLeaves.filter((leave: any) => {
          if (!leave.is_active) return false
          const startDate = new Date(leave.start_date)
          const endDate = new Date(leave.end_date)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(0, 0, 0, 0)
          return todayFilter >= startDate && todayFilter <= endDate
        })
      } else if (filterStatus === 'expired') {
        filteredLeaves = filteredLeaves.filter((leave: any) => {
          const endDate = new Date(leave.end_date)
          endDate.setHours(0, 0, 0, 0)
          return todayFilter > endDate
        })
      } else if (filterStatus === 'upcoming') {
        filteredLeaves = filteredLeaves.filter((leave: any) => {
          if (!leave.is_active) return false
          const startDate = new Date(leave.start_date)
          startDate.setHours(0, 0, 0, 0)
          return todayFilter < startDate
        })
      }

      setLeaves(filteredLeaves)
    } catch (error: any) {
      console.error('Error al cargar licencias:', error)
      alert('Error al cargar licencias médicas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getLeaveStatus = (leave: any): { label: string; color: string } => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(leave.start_date)
    const endDate = new Date(leave.end_date)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    if (!leave.is_active) {
      return { label: 'Inactiva', color: '#6b7280' }
    }

    if (today < startDate) {
      return { label: 'Próxima', color: '#3b82f6' }
    }

    if (today >= startDate && today <= endDate) {
      return { label: 'Vigente', color: '#10b981' }
    }

    return { label: 'Vencida', color: '#ef4444' }
  }

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) {
      setFormData(prev => ({ ...prev, days_count: 0 }))
      return
    }
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    setFormData(prev => ({ ...prev, days_count: diffDays > 0 ? diffDays : 0 }))
  }

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays()
    }
  }, [formData.start_date, formData.end_date])

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.employee_id) {
        alert('Debes seleccionar un trabajador')
        setSaving(false)
        return
      }
      if (!formData.start_date || !formData.end_date) {
        alert('Debes ingresar fecha de inicio y término')
        setSaving(false)
        return
      }
      if (formData.days_count <= 0) {
        alert('El número de días debe ser mayor a 0')
        setSaving(false)
        return
      }

      const { data: overlapping } = await supabase
        .from('medical_leaves')
        .select('id, start_date, end_date')
        .eq('employee_id', formData.employee_id)
        .eq('is_active', true)
        .or(`and(start_date.lte.${formData.end_date},end_date.gte.${formData.start_date})`)

      if (overlapping && overlapping.length > 0) {
        if (!confirm('Ya existe una licencia médica activa en ese período para este trabajador. ¿Deseas continuar de todas formas?')) {
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('medical_leaves')
        .insert({
          employee_id: formData.employee_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          leave_type: formData.leave_type,
          days_count: formData.days_count,
          folio_number: formData.folio_number || null,
          description: formData.description || null,
          is_active: formData.is_active,
        })

      if (error) throw error

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      if (formData.is_active && today >= startDate && today <= endDate) {
        await supabase
          .from('employees')
          .update({ status: 'licencia_medica' })
          .eq('id', formData.employee_id)
      }

      alert('Licencia médica registrada correctamente')
      setShowNewForm(false)
      setFormData({
        employee_id: '',
        start_date: '',
        end_date: '',
        leave_type: 'enfermedad_comun',
        days_count: 0,
        folio_number: '',
        description: '',
        is_active: true,
      })
      loadData()
    } catch (error: any) {
      alert('Error al registrar licencia: ' + error.message)
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

      // Si se desactiva, verificar si hay otras licencias activas para actualizar estado del trabajador
      if (!currentStatus) {
        const { data: leave } = await supabase
          .from('medical_leaves')
          .select('employee_id')
          .eq('id', leaveId)
          .single()

        if (leave) {
          const { data: activeLeaves } = await supabase
            .from('medical_leaves')
            .select('id')
            .eq('employee_id', leave.employee_id)
            .eq('is_active', true)
            .limit(1)

          if (!activeLeaves || activeLeaves.length === 0) {
            // No hay licencias activas, volver estado a activo
            await supabase
              .from('employees')
              .update({ status: 'active' })
              .eq('id', leave.employee_id)
          }
        }
      } else {
        // Si se activa, cambiar estado del trabajador a licencia médica si está vigente
        const { data: leave } = await supabase
          .from('medical_leaves')
          .select('start_date, end_date, employee_id')
          .eq('id', leaveId)
          .single()

        if (leave) {
          const today = new Date()
          const startDate = new Date(leave.start_date)
          const endDate = new Date(leave.end_date)
          
          if (today >= startDate && today <= endDate) {
            await supabase
              .from('employees')
              .update({ status: 'licencia_medica' })
              .eq('id', leave.employee_id)
          }
        }
      }

      loadData()
    } catch (error: any) {
      alert('Error al actualizar licencia: ' + error.message)
    }
  }

  const handleDelete = async (leaveId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta licencia médica?')) {
      return
    }

    try {
      const { data: leave } = await supabase
        .from('medical_leaves')
        .select('employee_id')
        .eq('id', leaveId)
        .single()

      const { error } = await supabase
        .from('medical_leaves')
        .delete()
        .eq('id', leaveId)

      if (error) throw error

      // Verificar si hay otras licencias activas para actualizar estado del trabajador
      if (leave) {
        const { data: activeLeaves } = await supabase
          .from('medical_leaves')
          .select('id')
          .eq('employee_id', leave.employee_id)
          .eq('is_active', true)
          .limit(1)

        if (!activeLeaves || activeLeaves.length === 0) {
          await supabase
            .from('employees')
            .update({ status: 'active' })
            .eq('id', leave.employee_id)
        }
      }

      loadData()
      alert('Licencia médica eliminada correctamente')
    } catch (error: any) {
      alert('Error al eliminar licencia: ' + error.message)
    }
  }

  if (!currentCompany) {
    return (
      <div>
        <h1>Gestión de Licencias Médicas</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver las licencias médicas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}>
            <FaStethoscope size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Gestión de Licencias Médicas</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Administración centralizada de licencias médicas de todos los trabajadores
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowNewForm(!showNewForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaPlus size={12} />
            Nueva Licencia
          </button>
          <Link href="/">
            <button className="secondary">Volver al Dashboard</button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Filtros</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'expired' | 'upcoming')}
            >
              <option value="all">Todas las licencias</option>
              <option value="active">Vigentes</option>
              <option value="upcoming">Próximas</option>
              <option value="expired">Vencidas</option>
            </select>
          </div>
        </div>
      </div>

      {showNewForm && (
        <div className="card" style={{ marginBottom: '24px', border: '2px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus size={16} style={{ color: '#2563eb' }} />
              Nueva Licencia Médica
            </h2>
            <button
              onClick={() => setShowNewForm(false)}
              className="secondary"
              style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FaTimes size={12} />
              Cancelar
            </button>
          </div>
          <form onSubmit={handleNewSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Trabajador *</label>
                <select
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                >
                  <option value="">Seleccionar trabajador...</option>
                  {employeesList.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.rut}
                    </option>
                  ))}
                </select>
              </div>
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
                />
              </div>
              <div className="form-group">
                <label>Número de Días</label>
                <input
                  type="number"
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
                  setShowNewForm(false)
                  setFormData({
                    employee_id: '',
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

      {/* Tabla de licencias */}
      {loading ? (
        <div className="card">
          <p>Cargando licencias médicas...</p>
        </div>
      ) : leaves.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay licencias médicas para mostrar con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Licencias Médicas ({leaves.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>RUT</th>
                  <th>Cargo</th>
                  <th>Tipo</th>
                  <th>Fecha Inicio</th>
                  <th>Fecha Término</th>
                  <th>Días</th>
                  <th>Folio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => {
                  const employee = employees[leave.employee_id]
                  const status = getLeaveStatus(leave)
                  
                  return (
                    <tr key={leave.id}>
                      <td>
                        {employee ? (
                          <Link href={`/employees/${leave.employee_id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                            {employee.full_name}
                          </Link>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>{employee?.rut || '-'}</td>
                      <td>{employee?.position || '-'}</td>
                      <td>{LEAVE_TYPES_MAP[leave.leave_type] || leave.leave_type}</td>
                      <td>{formatDate(leave.start_date)}</td>
                      <td>{formatDate(leave.end_date)}</td>
                      <td>{leave.days_count}</td>
                      <td>{leave.folio_number || '-'}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${status.color}20`,
                            color: status.color,
                            border: `1px solid ${status.color}`,
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <Link href={`/employees/${leave.employee_id}/medical-leaves`}>
                            <button
                              className="secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              title="Ver detalle"
                            >
                              <FaEye size={12} />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleToggleActive(leave.id, leave.is_active)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              background: leave.is_active ? '#6b7280' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            title={leave.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {leave.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleDelete(leave.id)}
                            className="danger"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Eliminar"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}





