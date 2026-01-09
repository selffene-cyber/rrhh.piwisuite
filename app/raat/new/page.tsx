'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaExclamationCircle, FaSave, FaTimes } from 'react-icons/fa'

export default function NewAccidentPage() {
  const router = useRouter()
  const { companyId, company } = useCurrentCompany()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    employee_id: '',
    event_date: new Date().toISOString().split('T')[0],
    event_time: new Date().toTimeString().substring(0, 5),
    event_location: '',
    event_type: 'accidente_trabajo' as 'accidente_trabajo' | 'accidente_trayecto' | 'enfermedad_profesional',
    administrator: '',
    work_performed: '',
    description: '',
    hazards_identified: '',
    body_part_affected: '',
    injury_type: '',
    witnesses: '',
    possible_sequelae: '',
    immediate_actions: '',
    medical_transfer: false,
    medical_transfer_location: '',
    notification_date: '',
  })

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    }
  }, [companyId])

  const loadEmployees = async () => {
    if (!companyId) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, cost_center_id')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error al cargar trabajadores:', error)
      alert('Error al cargar trabajadores: ' + error.message)
    }
  }

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    setSelectedEmployee(employee || null)
    setFormData({ ...formData, employee_id: employeeId })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyId) {
      alert('No se ha seleccionado una empresa')
      return
    }

    if (!formData.employee_id || !formData.event_date || !formData.event_time || !formData.event_location || !formData.description) {
      alert('Por favor complete todos los campos obligatorios')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/raat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          ...formData,
          notification_date: formData.notification_date || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear accidente')
      }

      const accident = await response.json()
      alert('Accidente registrado correctamente')
      router.push(`/raat/${accident.id}`)
    } catch (error: any) {
      console.error('Error al crear accidente:', error)
      alert('Error al crear accidente: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!company) {
    return (
      <div>
        <h1>Nuevo Accidente</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para registrar un accidente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626'
          }}>
            <FaExclamationCircle size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Nuevo Accidente</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Registro de Accidente del Trabajo o Enfermedad Profesional
            </p>
          </div>
        </div>
        <Link href="/raat">
          <button className="secondary">
            <FaTimes /> Cancelar
          </button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>1. Identificación del Siniestro</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Fecha del Evento *</label>
              <input
                type="date"
                required
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Hora del Evento *</label>
              <input
                type="time"
                required
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tipo de Evento *</label>
              <select
                required
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
              >
                <option value="accidente_trabajo">Accidente del Trabajo</option>
                <option value="accidente_trayecto">Accidente de Trayecto</option>
                <option value="enfermedad_profesional">Enfermedad Profesional</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Lugar del Evento *</label>
            <input
              type="text"
              required
              placeholder="Ej: Faena Copiapó, Sucursal Santiago, Trayecto a casa"
              value={formData.event_location}
              onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>2. Datos del Trabajador</h2>
          
          <div className="form-group">
            <label>Trabajador *</label>
            <select
              required
              value={formData.employee_id}
              onChange={(e) => handleEmployeeChange(e.target.value)}
            >
              <option value="">Seleccione un trabajador</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut} {emp.position ? `(${emp.position})` : ''}
                </option>
              ))}
            </select>
            {selectedEmployee && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                  Trabajador seleccionado: {selectedEmployee.full_name}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  RUT: {selectedEmployee.rut} | Cargo: {selectedEmployee.position || 'N/A'}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                  Nota: Se guardará un snapshot de los datos del trabajador al momento del evento
                </p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Organismo Administrador</label>
            <select
              value={formData.administrator}
              onChange={(e) => setFormData({ ...formData, administrator: e.target.value })}
            >
              <option value="">Seleccione...</option>
              <option value="ACHS">ACHS</option>
              <option value="IST">IST</option>
              <option value="Mutual">Mutual</option>
              <option value="ISL">ISL</option>
            </select>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>3. Descripción Técnica del Evento</h2>
          
          <div className="form-group">
            <label>Labor Realizada al Momento del Accidente</label>
            <textarea
              rows={3}
              placeholder="Describa la labor o tarea que estaba realizando el trabajador"
              value={formData.work_performed}
              onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Descripción Detallada del Hecho *</label>
            <textarea
              rows={5}
              required
              placeholder="Describa detalladamente cómo ocurrió el accidente"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Peligros Identificados (Condiciones y Actos Subestándar)</label>
            <textarea
              rows={3}
              placeholder="Describa las condiciones inseguras o actos subestándar que contribuyeron al accidente"
              value={formData.hazards_identified}
              onChange={(e) => setFormData({ ...formData, hazards_identified: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Parte del Cuerpo Afectada</label>
              <input
                type="text"
                placeholder="Ej: Mano derecha, Espalda, Cabeza"
                value={formData.body_part_affected}
                onChange={(e) => setFormData({ ...formData, body_part_affected: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tipo de Lesión</label>
              <input
                type="text"
                placeholder="Ej: Corte, Contusión, Fractura"
                value={formData.injury_type}
                onChange={(e) => setFormData({ ...formData, injury_type: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Testigos (Nombre y Cargo)</label>
            <textarea
              rows={2}
              placeholder="Ej: Juan Pérez - Supervisor, María González - Operario"
              value={formData.witnesses}
              onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Posibles Secuelas</label>
            <textarea
              rows={2}
              placeholder="Describa posibles secuelas o consecuencias del accidente"
              value={formData.possible_sequelae}
              onChange={(e) => setFormData({ ...formData, possible_sequelae: e.target.value })}
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>4. Acciones Inmediatas</h2>
          
          <div className="form-group">
            <label>Medidas Correctivas Inmediatas</label>
            <textarea
              rows={3}
              placeholder="Describa las medidas correctivas que se tomaron inmediatamente"
              value={formData.immediate_actions}
              onChange={(e) => setFormData({ ...formData, immediate_actions: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.medical_transfer}
                  onChange={(e) => setFormData({ ...formData, medical_transfer: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Traslado Médico
              </label>
            </div>
            {formData.medical_transfer && (
              <div className="form-group" style={{ flex: 2 }}>
                <label>Lugar de Traslado</label>
                <input
                  type="text"
                  placeholder="Ej: Hospital Regional, Clínica, Posta"
                  value={formData.medical_transfer_location}
                  onChange={(e) => setFormData({ ...formData, medical_transfer_location: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Fecha y Hora de Notificación a Mutualidad</label>
            <input
              type="datetime-local"
              value={formData.notification_date}
              onChange={(e) => setFormData({ ...formData, notification_date: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Link href="/raat">
            <button type="button" className="secondary">
              Cancelar
            </button>
          </Link>
          <button type="submit" disabled={saving}>
            <FaSave /> {saving ? 'Guardando...' : 'Guardar Accidente'}
          </button>
        </div>
      </form>
    </div>
  )
}








