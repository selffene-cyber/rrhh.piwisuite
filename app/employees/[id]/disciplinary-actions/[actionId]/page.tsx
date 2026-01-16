'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaFilePdf, FaCheck, FaArrowRight, FaTimes, FaSync } from 'react-icons/fa'

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

export default function DisciplinaryActionDetailPage({ 
  params 
}: { 
  params: { id: string, actionId: string } 
}) {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [action, setAction] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [riohsRule, setRiohsRule] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [changingStatus, setChangingStatus] = useState(false)

  useEffect(() => {
    if (currentCompany) {
      loadData()
    }
  }, [currentCompany, params.actionId])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)

      // Cargar amonestación
      const { data: actionData, error: actionError } = await supabase
        .from('disciplinary_actions')
        .select('*')
        .eq('id', params.actionId)
        .eq('company_id', currentCompany.id)
        .single()

      if (actionError) throw actionError
      if (!actionData) {
        alert('Amonestación no encontrada')
        router.push(`/employees/${params.id}/disciplinary-actions`)
        return
      }

      setAction(actionData)

      // Cargar empleado
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, company_id')
        .eq('id', actionData.employee_id)
        .single()
      
      if (empData) setEmployee(empData)

      // Cargar regla RIOHS si existe
      if (actionData.riohs_rule_id) {
        const { data: ruleData } = await supabase
          .from('riohs_rules')
          .select('*')
          .eq('id', actionData.riohs_rule_id)
          .single()
        
        if (ruleData) setRiohsRule(ruleData)
      }
    } catch (error: any) {
      console.error('Error al cargar amonestación:', error)
      alert('Error al cargar amonestación: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!action) return

    // Validaciones según el estado actual
    if (action.status === 'issued' && newStatus === 'draft') {
      if (!confirm('¿Estás seguro de que deseas volver esta amonestación a Borrador? Esto puede afectar el historial.')) {
        return
      }
    }

    if (newStatus === 'void') {
      if (!confirm('¿Estás seguro de que deseas anular esta amonestación?')) {
        return
      }
    }

    setChangingStatus(true)

    try {
      // Usar endpoints específicos para algunos estados
      if (newStatus === 'approved' && action.status !== 'approved') {
        const response = await fetch(`/api/disciplinary-actions/${params.actionId}/approve`, {
          method: 'POST',
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error al aprobar' }))
          throw new Error(errorData.error || 'Error al aprobar')
        }
      } else if (newStatus === 'issued' && action.status !== 'issued') {
        const response = await fetch(`/api/disciplinary-actions/${params.actionId}/issue`, {
          method: 'POST',
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error al emitir' }))
          throw new Error(errorData.error || 'Error al emitir')
        }
      } else {
        // Para otros estados, usar PUT directo
        const response = await fetch(`/api/disciplinary-actions/${params.actionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error al cambiar estado' }))
          throw new Error(errorData.error || 'Error al cambiar estado')
        }
      }

      alert('Estado actualizado correctamente')
      loadData() // Recargar datos
    } catch (error: any) {
      alert(error.message)
    } finally {
      setChangingStatus(false)
    }
  }

  const getAvailableStatusTransitions = (currentStatus: string): string[] => {
    // Definir transiciones permitidas según el estado actual
    const transitions: Record<string, string[]> = {
      draft: ['under_review', 'approved', 'void'],
      under_review: ['draft', 'approved', 'void'],
      approved: ['issued', 'void'],
      issued: ['acknowledged', 'void'],
      acknowledged: [], // No se puede cambiar desde acusada recibo
      void: [], // No se puede cambiar desde anulada
    }
    return transitions[currentStatus] || []
  }

  if (loading) {
    return (
      <div>
        <h1>Detalle de Amonestación</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!action) {
    return (
      <div>
        <h1>Detalle de Amonestación</h1>
        <div className="card">
          <p>Amonestación no encontrada</p>
          <Link href={`/employees/${params.id}/disciplinary-actions`}>
            <button>Volver</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Detalle de Amonestación</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/employees/${params.id}/disciplinary-actions/${params.actionId}/pdf`} target="_blank">
            <button>
              <FaFilePdf style={{ marginRight: '8px' }} />
              Ver PDF
            </button>
          </Link>
          <Link href={`/employees/${params.id}/disciplinary-actions`}>
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Datos de la Amonestación</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Trabajador</label>
            <p>{employee?.full_name || 'N/A'}</p>
          </div>
          <div className="form-group">
            <label>RUT</label>
            <p>{employee?.rut || 'N/A'}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo</label>
            <p>
              <span className="badge" style={{ 
                backgroundColor: action.type === 'written' ? '#3b82f6' : '#f59e0b',
                color: 'white'
              }}>
                {action.type === 'written' ? 'Escrita' : 'Verbal'}
              </span>
            </p>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span className="badge" style={{ 
                backgroundColor: STATUS_COLORS[action.status] || '#6b7280',
                color: 'white'
              }}>
                {STATUS_LABELS[action.status] || action.status}
              </span>
              {getAvailableStatusTransitions(action.status).length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                        onClick={() => handleStatusChange(status)}
                        disabled={changingStatus}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          background: color,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: changingStatus ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: changingStatus ? 0.6 : 1,
                        }}
                      >
                        <IconComponent size={14} />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {changingStatus && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Cambiando...</span>
              )}
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha del Incidente</label>
            <p>{formatDate(action.incident_date)}</p>
          </div>
          {action.location && (
            <div className="form-group">
              <label>Lugar</label>
              <p>{action.location}</p>
            </div>
          )}
        </div>
        {action.site_client && (
          <div className="form-group">
            <label>Faena/Cliente</label>
            <p>{action.site_client}</p>
          </div>
        )}
        <div className="form-group">
          <label>Hechos</label>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{action.facts || 'No especificado'}</p>
        </div>
        {riohsRule && (
          <div className="form-group">
            <label>Norma Interna Infringida</label>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f9f9f9', 
              border: '1px solid #ddd', 
              borderRadius: '4px' 
            }}>
              <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {riohsRule.code} - {riohsRule.title}
              </p>
              {riohsRule.description && (
                <p style={{ fontSize: '14px', color: '#666' }}>{riohsRule.description}</p>
              )}
            </div>
          </div>
        )}
        {action.witnesses && action.witnesses.length > 0 && (
          <div className="form-group">
            <label>Testigos</label>
            <div style={{ marginTop: '8px' }}>
              {action.witnesses.map((witness: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{witness.name || 'N/A'}</p>
                  {witness.position && <p style={{ fontSize: '14px', color: '#666' }}>Cargo: {witness.position}</p>}
                  {witness.contact && <p style={{ fontSize: '14px', color: '#666' }}>Contacto: {witness.contact}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {action.evidence && action.evidence.length > 0 && (
          <div className="form-group">
            <label>Evidencia</label>
            <div style={{ marginTop: '8px' }}>
              {action.evidence.map((item: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <a href={item.url || item} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                    {item.name || item.url || item} →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="form-row">
          {action.issued_at && (
            <div className="form-group">
              <label>Fecha de Emisión</label>
              <p>{formatDate(action.issued_at)}</p>
            </div>
          )}
          {action.acknowledged_at && (
            <div className="form-group">
              <label>Fecha de Acuse de Recibo</label>
              <p>{formatDate(action.acknowledged_at)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}





