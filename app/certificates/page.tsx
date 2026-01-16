'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaEye, FaFilePdf, FaTrash, FaCheck, FaTimes, FaShieldAlt, FaSignature } from 'react-icons/fa'

export default function CertificatesPage() {
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [certificates, setCertificates] = useState<any[]>([])
  const [filterType, setFilterType] = useState<'all' | 'antiguedad' | 'renta' | 'vigencia'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'requested' | 'approved' | 'rejected' | 'issued' | 'void'>('all')
  const [canSign, setCanSign] = useState(false)

  useEffect(() => {
    if (companyId) {
      checkPermissions()
      loadCertificates()
    }
  }, [companyId, filterType, filterStatus])

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCanSign(false)
        return
      }

      // Verificar si es super admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'super_admin') {
        setCanSign(true)
        return
      }

      // Verificar si es admin u owner de la empresa
      if (companyId) {
        const { data: companyUser } = await supabase
          .from('company_users')
          .select('role')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('status', 'active')
          .single()

        if (companyUser && ['owner', 'admin'].includes(companyUser.role)) {
          setCanSign(true)
          return
        }
      }

      setCanSign(false)
    } catch (error) {
      console.error('Error verificando permisos:', error)
      setCanSign(false)
    }
  }

  const loadCertificates = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('certificates')
        .select(`
          *,
          employees (id, full_name, rut),
          companies (id, name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (filterType !== 'all') {
        query = query.eq('certificate_type', filterType)
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setCertificates(data || [])
    } catch (error: any) {
      alert('Error al cargar certificados: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVoid = async (certId: string) => {
    if (!confirm('¿Está seguro de anular este certificado?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('certificates')
        .update({ status: 'void' })
        .eq('id', certId)

      if (error) throw error
      loadCertificates()
      alert('Certificado anulado correctamente')
    } catch (error: any) {
      alert('Error al anular certificado: ' + error.message)
    }
  }

  const handleApprove = async (certId: string) => {
    try {
      const response = await fetch(`/api/certificates/${certId}/approve`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al aprobar certificado')
      }

      alert('Certificado aprobado exitosamente')
      loadCertificates()
    } catch (error: any) {
      alert('Error al aprobar certificado: ' + error.message)
    }
  }

  const handleReject = async (certId: string) => {
    const reason = prompt('Ingrese el motivo del rechazo:')
    if (!reason || !reason.trim()) {
      return
    }

    try {
      const response = await fetch(`/api/certificates/${certId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejection_reason: reason }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al rechazar certificado')
      }

      alert('Certificado rechazado')
      loadCertificates()
    } catch (error: any) {
      alert('Error al rechazar certificado: ' + error.message)
    }
  }

  const handleSign = async (certId: string) => {
    if (!confirm('¿Está seguro de firmar digitalmente este certificado?')) {
      return
    }

    try {
      const response = await fetch(`/api/certificates/${certId}/sign`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al firmar certificado')
      }

      alert('Certificado firmado digitalmente exitosamente')
      loadCertificates()
    } catch (error: any) {
      alert('Error al firmar certificado: ' + error.message)
    }
  }

  const getCertificateTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      antiguedad: 'Certificado de Antigüedad',
      renta: 'Certificado de Renta',
      vigencia: 'Certificado de Vigencia Laboral',
      contratos: 'Contratos y Anexos',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      draft: { label: 'Borrador', color: '#6b7280' },
      requested: { label: 'Solicitado', color: '#f59e0b' },
      approved: { label: 'Aprobado', color: '#22c55e' },
      rejected: { label: 'Rechazado', color: '#ef4444' },
      issued: { label: 'Emitido', color: '#059669' },
      void: { label: 'Anulado', color: '#dc2626' },
    }
    const badge = badges[status] || { label: status, color: '#6b7280' }
    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: `${badge.color}20`,
          color: badge.color,
        }}
      >
        {badge.label}
      </span>
    )
  }

  const getCertificateUrl = (cert: any) => {
    const basePath = `/employees/${cert.employee_id}/certificates/${cert.certificate_type}`
    const params = new URLSearchParams({
      issue_date: cert.issue_date,
    })
    if (cert.folio_number) params.append('folio_number', cert.folio_number)
    if (cert.purpose) params.append('purpose', cert.purpose)
    if (cert.months_period) params.append('months_period', cert.months_period.toString())
    if (cert.valid_until) params.append('valid_until', cert.valid_until)
    return `${basePath}/pdf?${params.toString()}`
  }

  const getSignedPdfUrl = (cert: any) => {
    // Si tiene signed_pdf_url, es el PDF firmado digitalmente
    if (cert.signed_pdf_url) {
      return cert.signed_pdf_url
    }
    return null
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Gestión de Certificados Laborales</h1>
        <Link href="/certificates/generate">
          <button>Generar Nuevo Certificado</button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="card">
        <h2>Filtros</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo de Certificado</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">Todos</option>
              <option value="antiguedad">Antigüedad</option>
              <option value="renta">Renta</option>
              <option value="vigencia">Vigencia Laboral</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="requested">Solicitado</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="issued">Emitido</option>
              <option value="void">Anulado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de certificados */}
      <div className="card">
        <h2>Certificados ({certificates.length})</h2>
        {certificates.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            No hay certificados registrados
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Trabajador</th>
                <th>Tipo</th>
                <th>Fecha Emisión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id}>
                  <td>
                    <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                      {cert.folio_number || '-'}
                    </code>
                  </td>
                  <td>
                    {cert.employees?.full_name || '-'}
                    <br />
                    <small style={{ color: '#6b7280' }}>
                      {cert.employees?.rut || '-'}
                    </small>
                  </td>
                  <td>{getCertificateTypeLabel(cert.certificate_type)}</td>
                  <td>{formatDate(cert.issue_date, 'dd/MM/yyyy')}</td>
                  <td>{getStatusBadge(cert.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {cert.status === 'requested' && (
                        <>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => handleApprove(cert.id)}
                            title="Aprobar"
                          >
                            <FaCheck size={14} />
                          </button>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => handleReject(cert.id)}
                            title="Rechazar"
                          >
                            <FaTimes size={14} />
                          </button>
                        </>
                      )}
                      {(cert.status === 'approved' || cert.status === 'issued') && (
                        <>
                          {/* Botón para ver PDF firmado digitalmente (si existe) */}
                          {getSignedPdfUrl(cert) && (
                            <a
                              href={getSignedPdfUrl(cert)!}
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
                          <Link href={getCertificateUrl(cert)} target="_blank">
                            <button
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              className="secondary"
                              title={getSignedPdfUrl(cert) ? "Ver PDF sin Firma (para firmar manualmente)" : "Ver PDF"}
                            >
                              <FaFilePdf size={14} />
                            </button>
                          </Link>
                        </>
                      )}
                      {(cert.status === 'issued' || cert.status === 'approved') && (
                        <>
                          {/* Botón para firmar digitalmente (solo si no tiene firma y el usuario tiene permisos) */}
                          {canSign && !getSignedPdfUrl(cert) && (
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
                              onClick={() => handleSign(cert.id)}
                              title="Firmar Digitalmente"
                            >
                              <FaSignature size={14} />
                            </button>
                          )}
                          {/* Botón para anular (disponible incluso si tiene firma digital) */}
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            className="danger"
                            onClick={() => handleVoid(cert.id)}
                            title="Anular"
                          >
                            <FaTrash size={14} />
                          </button>
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

