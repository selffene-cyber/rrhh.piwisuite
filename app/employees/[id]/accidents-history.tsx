'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { AccidentWithRelations } from '@/lib/services/raatService'
import { FaExclamationCircle, FaEye, FaFilePdf, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa'

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

const EVENT_TYPE_ICONS: Record<string, any> = {
  accidente_trabajo: FaExclamationCircle,
  accidente_trayecto: FaExclamationCircle,
  enfermedad_profesional: FaExclamationCircle,
}

export default function AccidentsHistory({ employeeRut }: { employeeRut: string }) {
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [accidents, setAccidents] = useState<AccidentWithRelations[]>([])

  useEffect(() => {
    if (companyId && employeeRut) {
      loadAccidents()
    }
  }, [companyId, employeeRut])

  const loadAccidents = async () => {
    if (!companyId || !employeeRut) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        company_id: companyId,
        employee_rut: employeeRut,
      })

      const response = await fetch(`/api/raat?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar accidentes')
      
      const data = await response.json()
      setAccidents(data)
    } catch (error: any) {
      console.error('Error al cargar accidentes:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getDIATStatusBadge = (diatStatus: string) => {
    const status = DIAT_STATUS_COLORS[diatStatus] || DIAT_STATUS_COLORS.pending
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          backgroundColor: status.bg,
          color: status.text,
        }}
      >
        {diatStatus === 'sent' && <FaCheckCircle size={10} />}
        {diatStatus === 'overdue' && <FaTimesCircle size={10} />}
        {diatStatus === 'pending' && <FaClock size={10} />}
        {status.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>Cargando historial de accidentes...</p>
      </div>
    )
  }

  if (accidents.length === 0) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Historial de Seguridad y Salud</h2>
        <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          No se registran accidentes del trabajo o enfermedades profesionales para este trabajador.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Historial de Seguridad y Salud</h2>
        <Link href="/raat">
          <button className="secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
            Ver Todos los Accidentes
          </button>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {accidents.map((accident) => {
          const EventIcon = EVENT_TYPE_ICONS[accident.event_type] || FaExclamationCircle
          const statusColor = accident.status === 'open' ? '#3b82f6' : accident.status === 'closed' ? '#059669' : '#6b7280'
          
          return (
            <div
              key={accident.id}
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    flexShrink: 0,
                  }}>
                    <EventIcon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        Accidente #{accident.accident_number}
                      </h3>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: '600',
                          backgroundColor: statusColor + '20',
                          color: statusColor,
                        }}
                      >
                        {STATUS_LABELS[accident.status] || accident.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                      {EVENT_TYPE_LABELS[accident.event_type] || accident.event_type} • {formatDate(accident.event_date)} • {accident.event_time.substring(0, 5)}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                      Lugar: {accident.event_location}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {getDIATStatusBadge(accident.diat_status)}
                  <Link href={`/raat/${accident.id}`}>
                    <button
                      className="secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Ver detalles"
                    >
                      <FaEye size={12} />
                    </button>
                  </Link>
                  <button
                    className="secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    title="Descargar PDF"
                    onClick={() => alert('Funcionalidad de PDF en desarrollo')}
                  >
                    <FaFilePdf size={12} />
                  </button>
                </div>
              </div>

              {accident.description && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                    {accident.description.length > 150 
                      ? `${accident.description.substring(0, 150)}...` 
                      : accident.description}
                  </p>
                </div>
              )}

              {accident.body_part_affected || accident.injury_type ? (
                <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {accident.body_part_affected && (
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      Parte afectada: <strong>{accident.body_part_affected}</strong>
                    </span>
                  )}
                  {accident.injury_type && (
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      Tipo de lesión: <strong>{accident.injury_type}</strong>
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}








