'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaEye, FaEdit, FaTrash, FaFilePdf, FaCheck, FaArrowRight, FaTimes, FaSync } from 'react-icons/fa'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  under_review: 'En Revisión',
  approved: 'Aprobada',
  issued: 'Emitida',
  acknowledged: 'Acusada Recibo',
  void: 'Anulada',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  under_review: '#f59e0b',
  approved: '#3b82f6',
  issued: '#10b981',
  acknowledged: '#059669',
  void: '#ef4444',
}

export default function EmployeeDisciplinaryActionsPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [actions, setActions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [changingStatus, setChangingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (currentCompany && params.id) {
      loadData()
    }
  }, [currentCompany, params.id])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)

      // Cargar trabajador
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('id', params.id)
        .single()

      setEmployee(empData)

      // Cargar amonestaciones
      const response = await fetch(
        `/api/disciplinary-actions?company_id=${currentCompany.id}&employee_id=${params.id}`
      )
      const data = await response.json()
      setActions(data)
    } catch (error: any) {
      console.error('Error al cargar amonestaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, status: string) => {
    if (status !== 'draft' && status !== 'void') {
      alert('Solo se pueden eliminar amonestaciones en estado Borrador o Anulada')
      return
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta amonestación?')) {
      return
    }

    try {
      const response = await fetch(`/api/disciplinary-actions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Error al eliminar')

      alert('Amonestación eliminada correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al eliminar amonestación: ' + error.message)
    }
  }

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    if (newStatus === 'void') {
      if (!confirm('¿Estás seguro de que deseas anular esta amonestación?')) {
        return
      }
    }

    setChangingStatus(actionId)

    try {
      // Usar endpoints específicos para algunos estados
      if (newStatus === 'approved') {
        const response = await fetch(`/api/disciplinary-actions/${actionId}/approve`, {
          method: 'POST',
        })
        if (!response.ok) throw new Error('Error al aprobar')
      } else if (newStatus === 'issued') {
        const response = await fetch(`/api/disciplinary-actions/${actionId}/issue`, {
          method: 'POST',
        })
        if (!response.ok) throw new Error('Error al emitir')
      } else {
        // Para otros estados, usar PUT directo
        const response = await fetch(`/api/disciplinary-actions/${actionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        })
        if (!response.ok) throw new Error('Error al cambiar estado')
      }

      alert('Estado actualizado correctamente')
      loadData() // Recargar datos
    } catch (error: any) {
      alert('Error al cambiar estado: ' + error.message)
    } finally {
      setChangingStatus(null)
    }
  }

  const getAvailableStatusTransitions = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      draft: ['under_review', 'approved', 'void'],
      under_review: ['draft', 'approved', 'void'],
      approved: ['issued', 'void'],
      issued: ['acknowledged', 'void'],
      acknowledged: [],
      void: [],
    }
    return transitions[currentStatus] || []
  }

  if (!currentCompany) {
    return (
      <div>
        <h1>Cartas de Amonestación</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver las amonestaciones.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <h1>Cartas de Amonestación</h1>
        <div className="card">
          <p>Cargando amonestaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Cartas de Amonestación</h1>
          {employee && (
            <p style={{ color: '#6b7280', marginTop: '4px' }}>
              {employee.full_name} - {employee.rut}
            </p>
          )}
        </div>
        <Link href={`/employees/${params.id}/disciplinary-actions/new`}>
          <button>Nueva Amonestación</button>
        </Link>
      </div>

      <div className="card">
        <h2>Lista de Amonestaciones</h2>
        {actions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay amonestaciones registradas para este trabajador.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha Incidente</th>
                  <th>Tipo</th>
                  <th>Lugar</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.id}>
                    <td>{formatDate(action.incident_date)}</td>
                    <td>
                      {action.type === 'written' ? 'Escrita' : 'Verbal'}
                    </td>
                    <td>{action.location || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: STATUS_COLORS[action.status] || '#6b7280',
                            color: 'white',
                          }}
                        >
                          {STATUS_LABELS[action.status] || action.status}
                        </span>
                        {getAvailableStatusTransitions(action.status).length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {getAvailableStatusTransitions(action.status).map((status) => {
                              let icon = FaArrowRight
                              let color = '#3b82f6'
                              let label = STATUS_LABELS[status]
                              
                              if (status === 'approved') {
                                icon = FaCheck
                                color = '#3b82f6'
                                label = 'Aprobar'
                              } else if (status === 'issued') {
                                icon = FaCheck
                                color = '#10b981'
                                label = 'Emitir'
                              } else if (status === 'acknowledged') {
                                icon = FaCheck
                                color = '#059669'
                                label = 'Acusar Recibo'
                              } else if (status === 'void') {
                                icon = FaTimes
                                color = '#ef4444'
                                label = 'Anular'
                              } else if (status === 'under_review') {
                                icon = FaSync
                                color = '#f59e0b'
                                label = 'En Revisión'
                              } else if (status === 'draft') {
                                icon = FaSync
                                color = '#6b7280'
                                label = 'Borrador'
                              }
                              
                              const IconComponent = icon
                              
                              return (
                                <button
                                  key={status}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStatusChange(action.id, status)
                                  }}
                                  disabled={changingStatus === action.id}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    background: color,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: changingStatus === action.id ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    opacity: changingStatus === action.id ? 0.6 : 1,
                                  }}
                                  title={STATUS_LABELS[status]}
                                >
                                  <IconComponent size={12} />
                                  <span>{label}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Link href={`/employees/${params.id}/disciplinary-actions/${action.id}`}>
                          <button
                            style={{
                              padding: '6px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              border: '1px solid #d1d5db',
                              background: '#fff',
                              borderRadius: '4px',
                            }}
                            title="Ver"
                          >
                            <FaEye style={{ fontSize: '14px', color: '#3b82f6' }} />
                          </button>
                        </Link>
                        {(action.status === 'draft' || action.status === 'under_review') && (
                          <Link href={`/employees/${params.id}/disciplinary-actions/${action.id}/edit`}>
                            <button
                              style={{
                                padding: '6px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                border: '1px solid #d1d5db',
                                background: '#fff',
                                borderRadius: '4px',
                              }}
                              title="Editar"
                            >
                              <FaEdit style={{ fontSize: '14px', color: '#f59e0b' }} />
                            </button>
                          </Link>
                        )}
                        <Link href={`/employees/${params.id}/disciplinary-actions/${action.id}/pdf`} target="_blank">
                          <button
                            style={{
                              padding: '6px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              border: '1px solid #d1d5db',
                              background: '#fff',
                              borderRadius: '4px',
                            }}
                            title="Ver PDF"
                          >
                            <FaFilePdf style={{ fontSize: '14px', color: '#ef4444' }} />
                          </button>
                        </Link>
                        {(action.status === 'draft' || action.status === 'void') && (
                          <button
                            onClick={() => handleDelete(action.id, action.status)}
                            style={{
                              padding: '6px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              border: '1px solid #d1d5db',
                              background: '#fff',
                              borderRadius: '4px',
                            }}
                            title="Eliminar"
                          >
                            <FaTrash style={{ fontSize: '14px', color: '#ef4444' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

