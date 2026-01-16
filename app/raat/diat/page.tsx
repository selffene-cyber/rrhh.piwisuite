'use client'

import { useState, useEffect } from 'react'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { AccidentWithRelations } from '@/lib/services/raatService'
import { FaExclamationCircle, FaCheckCircle, FaTimesCircle, FaClock, FaFileAlt } from 'react-icons/fa'
import Link from 'next/link'

const DIAT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  pending: { bg: '#fef3c7', text: '#d97706', label: 'Pendiente', icon: FaClock },
  sent: { bg: '#d1fae5', text: '#059669', label: 'Enviada', icon: FaCheckCircle },
  overdue: { bg: '#fee2e2', text: '#dc2626', label: 'Fuera de Plazo', icon: FaTimesCircle },
}

export default function DIATManagementPage() {
  const { companyId, company } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [accidents, setAccidents] = useState<AccidentWithRelations[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'overdue'>('all')

  useEffect(() => {
    if (companyId) {
      loadAccidents()
    }
  }, [companyId, filter])

  const loadAccidents = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        company_id: companyId,
      })

      if (filter !== 'all') {
        params.append('diat_status', filter)
      }

      const response = await fetch(`/api/raat?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar accidentes')
      
      const data = await response.json()
      setAccidents(data)
    } catch (error: any) {
      console.error('Error al cargar accidentes:', error)
      alert('Error al cargar accidentes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsSent = async (accidentId: string, currentDiatNumber?: string) => {
    const diatNumber = prompt('Ingrese el número de DIAT:', currentDiatNumber || '')
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
      loadAccidents()
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

  const getDaysSinceEvent = (eventDate: string) => {
    const event = new Date(eventDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - event.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const isOverdue = (eventDate: string, diatStatus: string) => {
    if (diatStatus === 'sent') return false
    const daysSince = getDaysSinceEvent(eventDate)
    return daysSince > 1 // Más de 24 horas
  }

  // Actualizar estado de DIATs pendientes que pasaron de plazo
  useEffect(() => {
    if (companyId && accidents.length > 0) {
      const overdueAccidents = accidents.filter(acc => 
        acc.diat_status === 'pending' && isOverdue(acc.event_date, acc.diat_status)
      )
      
      if (overdueAccidents.length > 0) {
        // Actualizar automáticamente el estado
        overdueAccidents.forEach(async (acc) => {
          try {
            await fetch(`/api/raat/${acc.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ diat_status: 'overdue' }),
            })
          } catch (error) {
            console.error('Error al actualizar estado DIAT:', error)
          }
        })
        // Recargar después de un momento
        setTimeout(() => loadAccidents(), 1000)
      }
    }
  }, [accidents, companyId])

  if (!company) {
    return (
      <div>
        <h1>Gestión de DIAT</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para gestionar las DIAT.
          </p>
        </div>
      </div>
    )
  }

  const pendingCount = accidents.filter(a => a.diat_status === 'pending').length
  const sentCount = accidents.filter(a => a.diat_status === 'sent').length
  const overdueCount = accidents.filter(a => a.diat_status === 'overdue').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}>
            <FaFileAlt size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Gestión de DIAT</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Declaración Individual de Accidente del Trabajo
            </p>
          </div>
        </div>
        <Link href="/raat">
          <button className="secondary">Volver a RAAT</button>
        </Link>
      </div>

      {/* Resumen de DIATs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center', background: '#fef3c7', border: '2px solid #d97706' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#d97706', marginBottom: '8px' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '600' }}>DIAT Pendientes</div>
          <div style={{ fontSize: '11px', color: '#78350f', marginTop: '4px' }}>
            Deben enviarse dentro de 24 horas
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', background: '#fee2e2', border: '2px solid #dc2626' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>
            {overdueCount}
          </div>
          <div style={{ fontSize: '14px', color: '#991b1b', fontWeight: '600' }}>DIAT Fuera de Plazo</div>
          <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '4px' }}>
            ⚠️ Requieren atención inmediata
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', background: '#d1fae5', border: '2px solid #059669' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669', marginBottom: '8px' }}>
            {sentCount}
          </div>
          <div style={{ fontSize: '14px', color: '#047857', fontWeight: '600' }}>DIAT Enviadas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: filter === 'all' ? '#3b82f6' : '#e5e7eb',
              color: filter === 'all' ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: filter === 'all' ? '600' : '400',
            }}
          >
            Todas ({accidents.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: filter === 'pending' ? '#f59e0b' : '#e5e7eb',
              color: filter === 'pending' ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: filter === 'pending' ? '600' : '400',
            }}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: filter === 'overdue' ? '#dc2626' : '#e5e7eb',
              color: filter === 'overdue' ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: filter === 'overdue' ? '600' : '400',
            }}
          >
            Fuera de Plazo ({overdueCount})
          </button>
          <button
            onClick={() => setFilter('sent')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: filter === 'sent' ? '#10b981' : '#e5e7eb',
              color: filter === 'sent' ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: filter === 'sent' ? '600' : '400',
            }}
          >
            Enviadas ({sentCount})
          </button>
        </div>
      </div>

      {/* Lista de Accidentes */}
      {loading ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px' }}>Cargando DIATs...</p>
        </div>
      ) : accidents.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay accidentes con el filtro seleccionado.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>N°</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Fecha Evento</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Trabajador</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Estado DIAT</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Días desde Evento</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>N° DIAT</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accidents.map((accident) => {
                  const status = DIAT_STATUS_COLORS[accident.diat_status] || DIAT_STATUS_COLORS.pending
                  const StatusIcon = status.icon
                  const daysSince = getDaysSinceEvent(accident.event_date)
                  const isOverdueAccident = isOverdue(accident.event_date, accident.diat_status)

                  return (
                    <tr 
                      key={accident.id} 
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        background: isOverdueAccident && accident.diat_status !== 'sent' ? '#fef2f2' : 'white'
                      }}
                    >
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                        #{accident.accident_number}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {formatDate(accident.event_date)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <div style={{ fontWeight: '500' }}>{accident.employee_name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{accident.employee_rut}</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {accident.event_type === 'accidente_trabajo' ? 'Accidente Trabajo' :
                         accident.event_type === 'accidente_trayecto' ? 'Accidente Trayecto' :
                         'Enfermedad Profesional'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
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
                          <StatusIcon size={10} />
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <span style={{ color: isOverdueAccident && accident.diat_status !== 'sent' ? '#dc2626' : '#6b7280', fontWeight: isOverdueAccident && accident.diat_status !== 'sent' ? '600' : '400' }}>
                          {daysSince} día{daysSince !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {accident.diat_number || '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Link href={`/raat/${accident.id}`}>
                            <button
                              className="secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              title="Ver detalles"
                            >
                              Ver
                            </button>
                          </Link>
                          {accident.diat_status !== 'sent' && (
                            <button
                              onClick={() => handleMarkAsSent(accident.id, accident.diat_number)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                              title="Marcar DIAT como enviada"
                            >
                              Marcar Enviada
                            </button>
                          )}
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








