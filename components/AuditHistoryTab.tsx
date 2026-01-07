'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface AuditEvent {
  id: string
  action_type: string
  module: string
  entity_type: string
  entity_id: string | null
  status: 'success' | 'error'
  happened_at: string
  actor_name: string | null
  actor_email: string | null
  actor_role: string | null
  source: string
  before_data: any
  after_data: any
  diff_data: any
  metadata: any
}

interface AuditHistoryTabProps {
  employeeId: string
  isEmployeePortal?: boolean // Si es true, usa /api/employee/audit-events, sino /api/employees/[id]/audit-events
}

export default function AuditHistoryTab({ employeeId, isEmployeePortal = false }: AuditHistoryTabProps) {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [total, setTotal] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [filters, setFilters] = useState({
    module: '',
    action_type: '',
    status: '',
    from_date: '',
    to_date: '',
  })
  const [page, setPage] = useState(0)
  const limit = 100 // Aumentar límite para mostrar todos los eventos

  useEffect(() => {
    console.log('[AuditHistoryTab] useEffect ejecutado - employeeId:', employeeId, 'filters:', filters, 'page:', page)
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, filters, page])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const apiUrl = isEmployeePortal
        ? '/api/employee/audit-events'
        : `/api/employees/${employeeId}/audit-events`

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      })

      const response = await fetch(`${apiUrl}?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AuditHistoryTab] Error en respuesta:', response.status, errorText)
        throw new Error('Error al cargar eventos')
      }

      const data = await response.json()
      
      setEvents(data.events || [])
      setTotal(data.total || 0)
    } catch (error: any) {
      console.error('Error al cargar eventos:', error)
      alert('Error al cargar historial: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'contract.created': 'Contrato Creado',
      'contract.updated': 'Contrato Actualizado',
      'contract.issued': 'Contrato Emitido',
      'contract.signed': 'Contrato Firmado',
      'contract.activated': 'Contrato Activado',
      'contract.terminated': 'Contrato Terminado',
      'annex.created': 'Anexo Creado',
      'annex.updated': 'Anexo Actualizado',
      'annex.issued': 'Anexo Emitido',
      'annex.signed': 'Anexo Firmado',
      'annex.activated': 'Anexo Activado',
      'annex.expired': 'Anexo Expirado',
      'payroll.created': 'Liquidación Creada',
      'payroll.updated': 'Liquidación Actualizada',
      'payroll.issued': 'Liquidación Emitida',
      'payroll.sent': 'Liquidación Enviada',
      'payroll.pdf_generated': 'PDF de Liquidación Generado',
      'vacation.requested': 'Vacación Solicitada',
      'vacation.approved': 'Vacación Aprobada',
      'vacation.rejected': 'Vacación Rechazada',
      'vacation.taken': 'Vacación Tomada',
      'vacation.cancelled': 'Vacación Cancelada',
      'permission.requested': 'Permiso Solicitado',
      'permission.approved': 'Permiso Aprobado',
      'permission.rejected': 'Permiso Rechazado',
      'permission.taken': 'Permiso Tomado',
      'permission.cancelled': 'Permiso Cancelado',
      'certificate.requested': 'Certificado Solicitado',
      'certificate.approved': 'Certificado Aprobado',
      'certificate.issued': 'Certificado Emitido',
      'employee.created': 'Trabajador Creado',
      'employee.updated': 'Trabajador Actualizado',
      'employee.status_changed': 'Estado de Trabajador Cambiado',
      'loan.created': 'Préstamo Creado',
      'loan.issued': 'Préstamo Emitido',
      'loan.payment_applied': 'Pago de Préstamo Aplicado',
      'loan.completed': 'Préstamo Completado',
      'loan.cancelled': 'Préstamo Cancelado',
      'advance.created': 'Anticipo Creado',
      'advance.signed': 'Anticipo Firmado',
      'advance.paid': 'Anticipo Pagado',
      'advance.discounted': 'Anticipo Descontado',
      'advance.reversed': 'Anticipo Revertido',
      'overtime_pact.created': 'Pacto de Horas Extra Creado',
      'overtime_pact.renewed': 'Pacto de Horas Extra Renovado',
      'overtime_pact.expired': 'Pacto de Horas Extra Expirado',
      'settlement.created': 'Finiquito Creado',
      'settlement.approved': 'Finiquito Aprobado',
      'disciplinary_action.created': 'Acción Disciplinaria Creada',
      'disciplinary_action.issued': 'Acción Disciplinaria Emitida',
    }
    return labels[actionType] || actionType
  }

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      contracts: 'Contratos',
      annexes: 'Anexos',
      payroll: 'Liquidaciones',
      vacations: 'Vacaciones',
      permissions: 'Permisos',
      loans: 'Préstamos',
      advances: 'Anticipos',
      employees: 'Trabajadores',
      certificates: 'Certificados',
      overtime: 'Horas Extra',
      compliance: 'Cumplimiento',
      raat: 'RAAT',
      settlements: 'Finiquitos',
      disciplinary: 'Acciones Disciplinarias',
    }
    return labels[module] || module
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    return (
      <span
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          background: status === 'success' ? '#dcfce7' : '#fee2e2',
          color: status === 'success' ? '#166534' : '#991b1b',
        }}
      >
        {status === 'success' ? '✓ Éxito' : '✗ Error'}
      </span>
    )
  }

  const getSourceBadge = (source: string) => {
    const labels: Record<string, string> = {
      admin_dashboard: 'Admin',
      employee_portal: 'Portal',
      api: 'API',
      cron: 'Automático',
    }
    return labels[source] || source
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Histórico de Acciones</h2>

        {/* Filtros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Módulo</label>
            <select
              value={filters.module}
              onChange={(e) => {
                setFilters({ ...filters, module: e.target.value })
                setPage(0)
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="">Todos</option>
              <option value="contracts">Contratos</option>
              <option value="annexes">Anexos</option>
              <option value="payroll">Liquidaciones</option>
              <option value="vacations">Vacaciones</option>
              <option value="permissions">Permisos</option>
              <option value="loans">Préstamos</option>
              <option value="advances">Anticipos</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Estado</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value })
                setPage(0)
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="">Todos</option>
              <option value="success">Éxito</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Desde</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => {
                setFilters({ ...filters, from_date: e.target.value })
                setPage(0)
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Hasta</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => {
                setFilters({ ...filters, to_date: e.target.value })
                setPage(0)
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
        </div>

        {/* Contador */}
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Mostrando {events.length} de {total} eventos
        </p>
      </div>

      {/* Tabla de eventos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando eventos...</p>
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>No hay eventos registrados</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Fecha</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Acción</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Módulo</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Realizado por</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Origen</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                      <tr key={event.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {formatDate(event.happened_at)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {getActionLabel(event.action_type)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {getModuleLabel(event.module)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {event.actor_name || event.actor_email || 'Sistema'}
                          {event.actor_role && (
                            <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: '4px' }}>
                              ({event.actor_role})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {getStatusBadge(event.status)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {getSourceBadge(event.source)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                        onClick={() => setSelectedEvent(event)}
                        style={{
                          padding: '6px 12px',
                          background: '#6366f1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: '8px 16px',
                  background: page === 0 ? '#f3f4f6' : '#6366f1',
                  color: page === 0 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Página {page + 1} de {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * limit >= total}
                style={{
                  padding: '8px 16px',
                  background: (page + 1) * limit >= total ? '#f3f4f6' : '#6366f1',
                  color: (page + 1) * limit >= total ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (page + 1) * limit >= total ? 'not-allowed' : 'pointer',
                }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de detalle */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001, // Mayor que el slide (9999) y que otros modales
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Detalle del Evento</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <strong>Acción:</strong> {getActionLabel(selectedEvent.action_type)}
              </div>
              <div>
                <strong>Módulo:</strong> {getModuleLabel(selectedEvent.module)}
              </div>
              <div>
                <strong>Fecha:</strong> {formatDate(selectedEvent.happened_at)}
              </div>
              <div>
                <strong>Realizado por:</strong> {selectedEvent.actor_name || selectedEvent.actor_email || 'Sistema'}
                {selectedEvent.actor_role && ` (${selectedEvent.actor_role})`}
              </div>
              <div>
                <strong>Origen:</strong> {getSourceBadge(selectedEvent.source)}
              </div>
              <div>
                <strong>Estado:</strong> {getStatusBadge(selectedEvent.status)}
              </div>

              {selectedEvent.entity_id && (
                <div>
                  <strong>ID de Entidad:</strong> {selectedEvent.entity_id}
                </div>
              )}

              {selectedEvent.before_data && Object.keys(selectedEvent.before_data).length > 0 && (
                <div>
                  <strong>Antes:</strong>
                  <pre
                    style={{
                      background: '#f3f4f6',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}
                  >
                    {JSON.stringify(selectedEvent.before_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEvent.after_data && Object.keys(selectedEvent.after_data).length > 0 && (
                <div>
                  <strong>Después:</strong>
                  <pre
                    style={{
                      background: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}
                  >
                    {JSON.stringify(selectedEvent.after_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <strong>Metadata:</strong>
                  <pre
                    style={{
                      background: '#f9fafb',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}
                  >
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

