'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FaArrowLeft, FaDownload } from 'react-icons/fa'
import '../employee-portal.css'

interface Request {
  id: string
  type: 'certificate' | 'vacation' | 'permission'
  status: string
  created_at: string
  [key: string]: any
}

export default function RequestsPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<Request[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'certificates' | 'permissions' | 'vacations'>('all')

  useEffect(() => {
    loadRequests()
  }, [filter, typeFilter])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const allRequests: Request[] = []

      // Cargar certificados
      if (typeFilter === 'all' || typeFilter === 'certificates') {
        try {
          const certResponse = await fetch('/api/employee/certificates')
          if (certResponse.ok) {
            const certData = await certResponse.json()
            console.log('[Requests Page] Certificados recibidos:', certData)
            const certs = (certData.certificates || []).map((c: any) => ({
              ...c,
              type: 'certificate' as const,
              title: `Certificado de ${c.certificate_type === 'antiguedad' ? 'Antigüedad' : c.certificate_type === 'renta' ? 'Renta' : 'Vigencia'}`,
              date: c.requested_at || c.created_at,
            }))
            console.log('[Requests Page] Certificados mapeados:', certs)
            allRequests.push(...certs)
          } else {
            const errorText = await certResponse.text()
            console.error('[Requests Page] Error al cargar certificados:', errorText)
          }
        } catch (err) {
          console.error('[Requests Page] Error al cargar certificados:', err)
        }
      }

      // Cargar vacaciones
      if (typeFilter === 'all' || typeFilter === 'vacations') {
        try {
          const vacResponse = await fetch('/api/employee/vacations')
          if (vacResponse.ok) {
            const vacData = await vacResponse.json()
            const vacs = (vacData.vacations || []).map((v: any) => ({
              ...v,
              type: 'vacation' as const,
              title: `Vacaciones - ${v.days_count} días`,
              date: v.requested_at || v.created_at,
            }))
            allRequests.push(...vacs)
          } else {
            console.error('Error al cargar vacaciones:', await vacResponse.text())
          }
        } catch (err) {
          console.error('Error al cargar vacaciones:', err)
        }
      }

      // Cargar permisos
      if (typeFilter === 'all' || typeFilter === 'permissions') {
        try {
          const permResponse = await fetch('/api/employee/permissions')
          if (permResponse.ok) {
            const permData = await permResponse.json()
            console.log('Permisos recibidos:', permData)
            const perms = (permData.permissions || []).map((p: any) => ({
              ...p,
              type: 'permission' as const,
              title: `${p.permission_types?.label || p.permission_type_code || 'Permiso'} - ${p.days || 0} días`,
              date: p.requested_at || p.created_at,
              // Asegurar que el status esté mapeado correctamente
              status: p.status || 'draft',
            }))
            console.log('Permisos mapeados:', perms)
            allRequests.push(...perms)
          } else {
            const errorText = await permResponse.text()
            console.error('Error al cargar permisos:', errorText)
          }
        } catch (err) {
          console.error('Error al cargar permisos:', err)
        }
      }

      // Ordenar por fecha (más recientes primero)
      allRequests.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateB - dateA
      })

      // Aplicar filtro de estado
      // Nota: Diferentes tipos de documentos usan diferentes valores de status
      // - Certificados: 'requested', 'approved', 'issued', 'void'
      // - Vacaciones: 'solicitada', 'aprobada', 'rechazada', 'tomada', 'cancelada'
      // - Permisos: 'requested', 'approved', 'rejected', 'applied', 'draft', 'void'
      let filtered = allRequests
      if (filter === 'pending') {
        filtered = allRequests.filter(r => {
          // Certificados pendientes
          if (r.type === 'certificate') {
            return r.status === 'requested' || r.status === 'draft'
          }
          // Vacaciones pendientes
          if (r.type === 'vacation') {
            return r.status === 'solicitada' || r.status === 'draft'
          }
          // Permisos pendientes
          if (r.type === 'permission') {
            return r.status === 'requested' || r.status === 'draft'
          }
          // Por defecto, cualquier status que no sea aprobado/rechazado
          return r.status === 'requested' || r.status === 'solicitada' || r.status === 'draft'
        })
      } else if (filter === 'approved') {
        filtered = allRequests.filter(r => {
          // Certificados aprobados
          if (r.type === 'certificate') {
            return r.status === 'approved' || r.status === 'issued'
          }
          // Vacaciones aprobadas
          if (r.type === 'vacation') {
            return r.status === 'aprobada' || r.status === 'tomada'
          }
          // Permisos aprobados
          if (r.type === 'permission') {
            return r.status === 'approved' || r.status === 'applied'
          }
          // Por defecto
          return r.status === 'approved' || r.status === 'aprobada' || r.status === 'issued' || r.status === 'tomada' || r.status === 'applied'
        })
      } else if (filter === 'rejected') {
        filtered = allRequests.filter(r => {
          // Todos los tipos usan 'rejected' o 'rechazada'
          return r.status === 'rejected' || r.status === 'rechazada'
        })
      }

      console.log('Total de solicitudes cargadas:', allRequests.length)
      console.log('Solicitudes filtradas:', filtered.length)
      console.log('Filtro de tipo:', typeFilter)
      console.log('Filtro de estado:', filter)
      
      // Log detallado para diagnosticar el problema con certificados
      if (typeFilter === 'certificates' || typeFilter === 'all') {
        const certs = allRequests.filter(r => r.type === 'certificate')
        console.log(`[Requests Page] Certificados en allRequests: ${certs.length}`)
        certs.forEach((cert, idx) => {
          console.log(`[Requests Page] Certificado ${idx + 1}: id=${cert.id}, status="${cert.status}", type="${cert.type}"`)
        })
        
        if (filter === 'pending') {
          const pendingCerts = certs.filter(c => c.status === 'requested' || c.status === 'draft')
          console.log(`[Requests Page] Certificados pendientes (requested/draft): ${pendingCerts.length}`)
          pendingCerts.forEach((cert, idx) => {
            console.log(`[Requests Page] Certificado pendiente ${idx + 1}: id=${cert.id}, status="${cert.status}"`)
          })
        }
      }

      setRequests(filtered)
    } catch (err) {
      console.error('Error al cargar solicitudes:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      draft: { label: 'Borrador', color: '#6b7280', bg: '#f3f4f6' },
      requested: { label: 'Solicitado', color: '#f59e0b', bg: '#fef3c7' },
      solicitada: { label: 'Solicitado', color: '#f59e0b', bg: '#fef3c7' },
      approved: { label: 'Aprobado', color: '#22c55e', bg: '#dcfce7' },
      aprobada: { label: 'Aprobado', color: '#22c55e', bg: '#dcfce7' },
      issued: { label: 'Emitido', color: '#22c55e', bg: '#dcfce7' },
      tomada: { label: 'Tomada', color: '#22c55e', bg: '#dcfce7' },
      applied: { label: 'Aplicado', color: '#22c55e', bg: '#dcfce7' },
      rejected: { label: 'Rechazado', color: '#ef4444', bg: '#fee2e2' },
      rechazada: { label: 'Rechazado', color: '#ef4444', bg: '#fee2e2' },
      void: { label: 'Anulado', color: '#dc2626', bg: '#fee2e2' },
    }

    const statusInfo = statusMap[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' }
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        color: statusInfo.color,
        background: statusInfo.bg
      }}>
        {statusInfo.label}
      </span>
    )
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      certificate: '📄',
      vacation: '🏖️',
      permission: '📝',
    }
    return icons[type] || '📋'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDownload = (request: Request) => {
    // Verificar si tiene PDF firmado
    const signedPdfUrl = request.signed_pdf_url
    
    if (signedPdfUrl) {
      // Crear un enlace temporal para descargar
      const link = document.createElement('a')
      link.href = signedPdfUrl
      link.download = `${request.title || 'documento'}.pdf`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const hasSignedPdf = (request: Request): boolean => {
    // Verificar si el request tiene PDF firmado
    return !!(request.signed_pdf_url && 
      (request.status === 'approved' || request.status === 'issued' || request.status === 'aprobada' || request.status === 'tomada' || request.status === 'applied'))
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Cargando solicitudes...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/employee"
          className="back-button-icon"
          style={{ marginBottom: '16px' }}
        >
          <FaArrowLeft />
        </Link>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#111827' }}>Mis Solicitudes</h1>
      </div>

      {/* Filtros por tipo */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {(['all', 'certificates', 'permissions', 'vacations'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: typeFilter === t ? '#6366f1' : 'white',
              color: typeFilter === t ? 'white' : '#6b7280',
              boxShadow: typeFilter === t ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {t === 'all' ? 'Todos' : t === 'certificates' ? 'Certificados' : t === 'permissions' ? 'Permisos' : 'Vacaciones'}
          </button>
        ))}
      </div>

      {/* Filtros por estado */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: filter === f ? '#6366f1' : 'white',
              color: filter === f ? 'white' : '#6b7280',
              boxShadow: filter === f ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : 'Rechazadas'}
          </button>
        ))}
      </div>

      {/* Lista de solicitudes */}
      {requests.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: '#6b7280', margin: 0 }}>
            No hay solicitudes {filter !== 'all' ? `con estado "${filter === 'pending' ? 'Pendientes' : filter === 'approved' ? 'Aprobadas' : 'Rechazadas'}"` : ''}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((request) => (
            <div
              key={request.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(request.type)}</span>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      {request.title}
                    </h3>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    {formatDate(request.date)}
                  </div>
                  {request.rejection_reason && (
                    <div style={{
                      fontSize: '12px',
                      color: '#ef4444',
                      marginTop: '8px',
                      padding: '8px',
                      background: '#fee2e2',
                      borderRadius: '6px'
                    }}>
                      <strong>Motivo de rechazo:</strong> {request.rejection_reason}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {getStatusBadge(request.status)}
                  {/* Botón de descarga solo si tiene PDF firmado */}
                  {hasSignedPdf(request) && (
                    <button
                      onClick={() => handleDownload(request)}
                      style={{
                        padding: '4px 6px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                      title="Descargar PDF firmado"
                    >
                      <FaDownload size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

