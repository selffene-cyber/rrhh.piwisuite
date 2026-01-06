'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AccidentWithRelations } from '@/lib/services/raatService'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaExclamationCircle, FaEdit, FaFilePdf, FaCheckCircle, FaTimesCircle, FaClock, FaArrowLeft } from 'react-icons/fa'
import dynamic from 'next/dynamic'

const AccidentPDFButton = dynamic(() => import('@/components/AccidentPDFButton'), { ssr: false })

const EVENT_TYPE_LABELS: Record<string, string> = {
  accidente_trabajo: 'Accidente del Trabajo',
  accidente_trayecto: 'Accidente de Trayecto',
  enfermedad_profesional: 'Enfermedad Profesional',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  closed: 'Cerrado',
  with_sequelae: 'Con Secuelas',
  consolidated: 'Consolidado',
}

const DIAT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#d97706', label: 'Pendiente' },
  sent: { bg: '#d1fae5', text: '#059669', label: 'Enviada' },
  overdue: { bg: '#fee2e2', text: '#dc2626', label: 'Fuera de Plazo' },
}

export default function AccidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useCurrentCompany()
  const accidentId = params.id as string
  const [loading, setLoading] = useState(true)
  const [accident, setAccident] = useState<AccidentWithRelations | null>(null)

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
    } catch (error: any) {
      console.error('Error al cargar accidente:', error)
      alert('Error al cargar accidente: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseAccident = async () => {
    if (!confirm('¿Está seguro de cerrar este registro de accidente? Una vez cerrado, solo se podrán agregar anexos.')) {
      return
    }

    try {
      const response = await fetch(`/api/raat/${accidentId}/close`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cerrar accidente')
      }

      alert('Accidente cerrado correctamente')
      loadAccident()
    } catch (error: any) {
      console.error('Error al cerrar accidente:', error)
      alert('Error al cerrar accidente: ' + error.message)
    }
  }

  const handleMarkDIATAsSent = async () => {
    const diatNumber = prompt('Ingrese el número de DIAT:')
    if (!diatNumber) return

    try {
      const response = await fetch(`/api/raat/${accidentId}/diat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diat_number: diatNumber }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al marcar DIAT como enviada')
      }

      alert('DIAT marcada como enviada correctamente')
      loadAccident()
    } catch (error: any) {
      console.error('Error al marcar DIAT:', error)
      alert('Error al marcar DIAT: ' + error.message)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px' }}>Cargando accidente...</p>
      </div>
    )
  }

  if (!accident) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          Accidente no encontrado
        </p>
      </div>
    )
  }

  const diatStatus = DIAT_STATUS_COLORS[accident.diat_status] || DIAT_STATUS_COLORS.pending

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/raat">
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
              Accidente #{accident.accident_number}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              {EVENT_TYPE_LABELS[accident.event_type] || accident.event_type}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {accident.status === 'open' && (
            <Link href={`/raat/${accidentId}/edit`}>
              <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaEdit /> Editar
              </button>
            </Link>
          )}
          {accident && company && <AccidentPDFButton accident={accident} company={company} />}
          {accident.status === 'open' && (
            <button
              onClick={handleCloseAccident}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaCheckCircle /> Cerrar Registro
            </button>
          )}
        </div>
      </div>

      {/* Estado DIAT */}
      <div className="card" style={{ marginBottom: '24px', background: diatStatus.bg, border: `2px solid ${diatStatus.text}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: diatStatus.text }}>Estado DIAT</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: diatStatus.text }}>
              {accident.diat_status === 'sent' && accident.diat_number && `Número: ${accident.diat_number}`}
              {accident.diat_status === 'sent' && accident.diat_sent_at && ` - Enviada el ${formatDateTime(accident.diat_sent_at)}`}
              {accident.diat_status === 'pending' && 'Debe enviarse dentro de 24 horas'}
              {accident.diat_status === 'overdue' && '⚠️ Fuera de plazo - Se debe enviar inmediatamente'}
            </p>
          </div>
          {accident.diat_status !== 'sent' && (
            <button onClick={handleMarkDIATAsSent} style={{ background: diatStatus.text, color: 'white' }}>
              Marcar DIAT como Enviada
            </button>
          )}
        </div>
      </div>

      {/* Información del Siniestro */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>1. Identificación del Siniestro</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Número de Accidente</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '600' }}>#{accident.accident_number}</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Fecha del Evento</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{formatDate(accident.event_date)}</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Hora del Evento</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{accident.event_time.substring(0, 5)}</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Tipo de Evento</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{EVENT_TYPE_LABELS[accident.event_type] || accident.event_type}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Lugar del Evento</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{accident.event_location}</p>
          </div>
        </div>
      </div>

      {/* Datos del Trabajador */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>2. Datos del Trabajador (Snapshot Histórico)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Nombre</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '500' }}>{accident.employee_name}</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>RUT</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{accident.employee_rut}</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Cargo</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{accident.employee_position}</p>
          </div>
          {accident.employee_seniority_days && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Antigüedad</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{accident.employee_seniority_days} días</p>
            </div>
          )}
          {accident.cost_center_code && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Centro de Costo</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{accident.cost_center_code}</p>
            </div>
          )}
          {accident.contract_type && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Tipo de Contrato</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{accident.contract_type}</p>
            </div>
          )}
          {accident.administrator && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Organismo Administrador</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>{accident.administrator}</p>
            </div>
          )}
        </div>
      </div>

      {/* Descripción Técnica */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>3. Descripción Técnica del Evento</h2>
        {accident.work_performed && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Labor Realizada</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{accident.work_performed}</p>
          </div>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Descripción Detallada</label>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{accident.description}</p>
        </div>
        {accident.hazards_identified && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Peligros Identificados</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{accident.hazards_identified}</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {accident.body_part_affected && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Parte del Cuerpo Afectada</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{accident.body_part_affected}</p>
            </div>
          )}
          {accident.injury_type && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Tipo de Lesión</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{accident.injury_type}</p>
            </div>
          )}
        </div>
        {accident.witnesses && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Testigos</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{accident.witnesses}</p>
          </div>
        )}
        {accident.possible_sequelae && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Posibles Secuelas</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{accident.possible_sequelae}</p>
          </div>
        )}
      </div>

      {/* Acciones Inmediatas */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>4. Acciones Inmediatas</h2>
        {accident.immediate_actions && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Medidas Correctivas Inmediatas</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{accident.immediate_actions}</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Traslado Médico</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {accident.medical_transfer ? 'Sí' : 'No'}
              {accident.medical_transfer && accident.medical_transfer_location && ` - ${accident.medical_transfer_location}`}
            </p>
          </div>
          {accident.notification_date && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Notificación a Mutualidad</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{formatDateTime(accident.notification_date)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Información del Sistema */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Información del Sistema</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Estado</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: accident.status === 'open' ? '#dbeafe' : accident.status === 'closed' ? '#d1fae5' : '#f3f4f6',
                  color: accident.status === 'open' ? '#3b82f6' : accident.status === 'closed' ? '#059669' : '#6b7280',
                }}
              >
                {STATUS_LABELS[accident.status] || accident.status}
              </span>
            </p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Fecha de Registro</label>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{formatDateTime(accident.created_at)}</p>
          </div>
          {accident.closed_at && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Fecha de Cierre</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{formatDateTime(accident.closed_at)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

