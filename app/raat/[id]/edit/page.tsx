'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { AccidentWithRelations } from '@/lib/services/raatService'
import { FaExclamationCircle, FaSave, FaTimes, FaArrowLeft } from 'react-icons/fa'

export default function EditAccidentPage() {
  const params = useParams()
  const router = useRouter()
  const accidentId = params.id as string
  const { companyId, company } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accident, setAccident] = useState<AccidentWithRelations | null>(null)
  
  const [formData, setFormData] = useState({
    event_date: '',
    event_time: '',
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
    if (accidentId) {
      loadAccident()
    }
  }, [accidentId])

  const loadAccident = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/raat/${accidentId}`)
      if (!response.ok) throw new Error('Error al cargar accidente')
      
      const data = await response.json()
      setAccident(data)

      if (data.status === 'closed' || data.status === 'consolidated') {
        alert('Este registro está cerrado o consolidado. Solo se pueden agregar anexos.')
        router.push(`/raat/${accidentId}`)
        return
      }

      // Convertir fecha y hora para los inputs
      const eventDate = new Date(data.event_date)
      const eventTime = data.event_time.substring(0, 5)

      setFormData({
        event_date: eventDate.toISOString().split('T')[0],
        event_time: eventTime,
        event_location: data.event_location || '',
        event_type: data.event_type,
        administrator: data.administrator || '',
        work_performed: data.work_performed || '',
        description: data.description || '',
        hazards_identified: data.hazards_identified || '',
        body_part_affected: data.body_part_affected || '',
        injury_type: data.injury_type || '',
        witnesses: data.witnesses || '',
        possible_sequelae: data.possible_sequelae || '',
        immediate_actions: data.immediate_actions || '',
        medical_transfer: data.medical_transfer || false,
        medical_transfer_location: data.medical_transfer_location || '',
        notification_date: data.notification_date ? new Date(data.notification_date).toISOString().slice(0, 16) : '',
      })
    } catch (error: any) {
      console.error('Error al cargar accidente:', error)
      alert('Error al cargar accidente: ' + error.message)
      router.push('/raat')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.event_date || !formData.event_time || !formData.event_location || !formData.description) {
      alert('Por favor complete todos los campos obligatorios')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/raat/${accidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          notification_date: formData.notification_date || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar accidente')
      }

      alert('Accidente actualizado correctamente')
      router.push(`/raat/${accidentId}`)
    } catch (error: any) {
      console.error('Error al actualizar accidente:', error)
      alert('Error al actualizar accidente: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px' }}>Cargando accidente...</p>
      </div>
    )
  }

  if (!accident || !company) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          Accidente no encontrado
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href={`/raat/${accidentId}`}>
            <button className="secondary" style={{ padding: '8px' }}>
              <FaArrowLeft />
            </button>
          </Link>
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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
              Editar Accidente #{accident.accident_number}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Trabajador: {accident.employee_name} - {accident.employee_rut}
            </p>
          </div>
        </div>
        <Link href={`/raat/${accidentId}`}>
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
          <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
              Trabajador: {accident.employee_name}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              RUT: {accident.employee_rut} | Cargo: {accident.employee_position}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
              Nota: Los datos del trabajador son un snapshot histórico y no se pueden modificar
            </p>
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
          <Link href={`/raat/${accidentId}`}>
            <button type="button" className="secondary">
              Cancelar
            </button>
          </Link>
          <button type="submit" disabled={saving}>
            <FaSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}








