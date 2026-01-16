'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaCalendarAlt, FaEdit, FaTrash, FaCheckCircle, FaCheck, FaClock, FaTimesCircle, FaFilePdf, FaEye, FaShieldAlt, FaSignature } from 'react-icons/fa'
import { useCompanyPermissions } from '@/lib/hooks/useCompanyPermissions'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  requested: 'Solicitado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  applied: 'Aplicado',
  void: 'Anulado',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  requested: '#f59e0b',
  approved: '#3b82f6',
  rejected: '#ef4444',
  applied: '#10b981',
  void: '#ef4444',
}

export default function EmployeePermissionsPage({
  params,
}: {
  params: { id: string }
}) {
  const { isSuperAdmin, companyRole } = useCompanyPermissions()
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [permissions, setPermissions] = useState<any[]>([])
  
  // Verificar si el usuario puede firmar digitalmente
  const canSign = isSuperAdmin || companyRole === 'owner' || companyRole === 'admin'

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar trabajador
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut, company_id')
        .eq('id', params.id)
        .single()

      setEmployee(empData)

      // Cargar permisos
      const { data: companyData } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', params.id)
        .single()

      if (companyData) {
        const response = await fetch(
          `/api/permissions?company_id=${companyData.company_id}&employee_id=${params.id}`
        )
        const perms = await response.json()
        setPermissions(perms)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveManual = async (permissionId: string) => {
    if (!confirm('¿Está seguro de aprobar este permiso para firmar manualmente?')) return

    try {
      const response = await fetch(`/api/permissions/${permissionId}/approve-manual`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al aprobar permiso')
      }

      alert('Permiso aprobado correctamente (para firmar manualmente)')
      loadData()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleApprove = async (permissionId: string) => {
    if (!confirm('¿Está seguro de aprobar este permiso con firma digital?')) return

    try {
      const response = await fetch(`/api/permissions/${permissionId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al aprobar permiso')
      }

      alert('Permiso aprobado y firmado digitalmente correctamente')
      loadData()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleSign = async (permissionId: string) => {
    if (!confirm('¿Está seguro de firmar digitalmente este permiso?')) return

    try {
      const response = await fetch(`/api/permissions/${permissionId}/sign`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al firmar permiso')
      }

      alert('Permiso firmado digitalmente exitosamente')
      loadData()
    } catch (error: any) {
      alert('Error al firmar permiso: ' + error.message)
    }
  }

  const getSignedPdfUrl = (perm: any) => {
    // Si tiene signed_pdf_url, es el PDF firmado digitalmente
    if (perm.signed_pdf_url) {
      return perm.signed_pdf_url
    }
    return null
  }

  const handleDelete = async (permissionId: string) => {
    if (!confirm('¿Está seguro de eliminar este permiso?')) return

    try {
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar permiso')
      }

      alert('Permiso eliminado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al eliminar permiso: ' + error.message)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1>Permisos - {employee?.full_name || 'Cargando...'}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/employees/${params.id}/permissions/new`}>
            <button>Nuevo Permiso</button>
          </Link>
          <Link href={`/employees/${params.id}`}>
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        {permissions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay permisos registrados para este trabajador
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Motivo</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Fechas</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Días</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Descuento</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm) => (
                <tr key={perm.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>
                      {perm.permission_types?.label || perm.permission_type_code}
                    </div>
                    {perm.permission_types?.affects_payroll && (
                      <div style={{ fontSize: '12px', color: '#ef4444' }}>
                        Sin goce de sueldo
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>{perm.reason}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div>{formatDate(perm.start_date)}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      hasta {formatDate(perm.end_date)}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {perm.days} {perm.hours ? `(${perm.hours}h)` : ''}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {perm.discount_amount > 0 ? (
                      <span style={{ color: '#ef4444' }}>
                        ${perm.discount_amount.toLocaleString('es-CL')}
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: STATUS_COLORS[perm.status] || '#6b7280',
                        color: 'white',
                        fontSize: '12px',
                      }}
                    >
                      {STATUS_LABELS[perm.status] || perm.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {/* Botones para permisos en estado requested o draft */}
                      {(perm.status === 'requested' || perm.status === 'draft') && (
                        <>
                          {/* Botón para ver PDF sin firma (para firmar manualmente) */}
                          <Link href={`/permissions/${perm.id}/pdf`} target="_blank">
                            <button
                              style={{
                                padding: '4px 8px',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Ver PDF (para firmar manualmente)"
                            >
                              <FaFilePdf size={12} />
                            </button>
                          </Link>
                          {/* Botón para aprobar sin firma digital (para firmar manualmente) */}
                          <button
                            onClick={() => handleApproveManual(perm.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Aprobar (para firmar manualmente)"
                          >
                            <FaCheck size={12} />
                          </button>
                          {/* Botón para aprobar con firma digital (solo si tiene permisos) */}
                          {canSign && (
                            <button
                              onClick={() => handleApprove(perm.id)}
                              style={{
                                padding: '4px 8px',
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Aprobar con Firma Digital"
                            >
                              <FaSignature size={12} />
                            </button>
                          )}
                          {/* Botón para eliminar */}
                          <button
                            onClick={() => handleDelete(perm.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            title="Eliminar"
                          >
                            <FaTrash size={12} />
                          </button>
                        </>
                      )}
                      
                      {/* Botones para permisos en estado approved */}
                      {perm.status === 'approved' && (
                        <>
                          {/* Botón para ver PDF firmado digitalmente (si existe) */}
                          {getSignedPdfUrl(perm) && (
                            <a
                              href={getSignedPdfUrl(perm)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none' }}
                            >
                              <button
                                style={{ 
                                  padding: '4px 8px', 
                                  fontSize: '12px',
                                  background: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Ver PDF Firmado Digitalmente (con firma, QR y código de verificación)"
                              >
                                <FaShieldAlt size={12} />
                                <FaFilePdf size={12} />
                              </button>
                            </a>
                          )}
                          {/* Botón para ver PDF sin firma (componente cliente) */}
                          <Link href={`/permissions/${perm.id}/pdf`} target="_blank">
                            <button
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title={getSignedPdfUrl(perm) ? "Ver PDF sin Firma (para firmar manualmente)" : "Ver PDF"}
                            >
                              <FaFilePdf size={12} />
                            </button>
                          </Link>
                          {/* Botón para firmar digitalmente (solo si no tiene firma y el usuario tiene permisos) */}
                          {canSign && !getSignedPdfUrl(perm) && (
                            <button
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px',
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleSign(perm.id)}
                              title="Firmar Digitalmente"
                            >
                              <FaSignature size={12} />
                            </button>
                          )}
                          {/* Botón para eliminar/anular */}
                          <button
                            onClick={() => handleDelete(perm.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            title="Eliminar/Anular"
                          >
                            <FaTrash size={12} />
                          </button>
                        </>
                      )}
                      
                      {/* Botones para otros estados (applied, void, rejected) */}
                      {(perm.status === 'applied' || perm.status === 'void' || perm.status === 'rejected') && (
                        <>
                          {/* Botón para ver PDF firmado digitalmente (si existe) */}
                          {getSignedPdfUrl(perm) && (
                            <a
                              href={getSignedPdfUrl(perm)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none' }}
                            >
                              <button
                                style={{ 
                                  padding: '4px 8px', 
                                  fontSize: '12px',
                                  background: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Ver PDF Firmado Digitalmente"
                              >
                                <FaShieldAlt size={12} />
                                <FaFilePdf size={12} />
                              </button>
                            </a>
                          )}
                          {/* Botón para ver PDF sin firma */}
                          <Link href={`/permissions/${perm.id}/pdf`} target="_blank">
                            <button
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title="Ver PDF"
                            >
                              <FaFilePdf size={12} />
                            </button>
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

