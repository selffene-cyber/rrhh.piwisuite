'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaFilePdf, FaTrash } from 'react-icons/fa'

interface CertificatesHistoryProps {
  employeeId: string
}

export default function CertificatesHistory({ employeeId }: CertificatesHistoryProps) {
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCertificates()
  }, [employeeId])

  const loadCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, employee_id, certificate_type_id, issue_date, purpose, folio_number, created_at, certificate_types(name, code)')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setCertificates(data || [])
    } catch (error: any) {
      console.error('Error al cargar certificados:', error)
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

  const getCertificateTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      antiguedad: 'Antigüedad',
      renta: 'Renta',
      vigencia: 'Vigencia Laboral',
      contratos: 'Contratos',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      draft: { label: 'Borrador', color: '#6b7280' },
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
    const basePath = `/employees/${employeeId}/certificates/${cert.certificate_type}`
    const params = new URLSearchParams({
      issue_date: cert.issue_date,
    })
    if (cert.folio_number) params.append('folio_number', cert.folio_number)
    if (cert.purpose) params.append('purpose', cert.purpose)
    if (cert.months_period) params.append('months_period', cert.months_period.toString())
    if (cert.valid_until) params.append('valid_until', cert.valid_until)
    return `${basePath}/pdf?${params.toString()}`
  }

  if (loading) {
    return <div>Cargando certificados...</div>
  }

  if (certificates.length === 0) {
    return (
      <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
        No hay certificados registrados
      </p>
    )
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Folio</th>
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
                <span style={{ fontWeight: 'bold' }}>
                  {cert.folio_number || '-'}
                </span>
              </td>
              <td>{getCertificateTypeLabel(cert.certificate_type)}</td>
              <td>{formatDate(cert.issue_date, 'dd/MM/yyyy')}</td>
              <td>{getStatusBadge(cert.status)}</td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href={getCertificateUrl(cert)} target="_blank">
                    <button
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      className="secondary"
                      title="Ver PDF"
                    >
                      <FaFilePdf size={14} />
                    </button>
                  </Link>
                  {cert.status === 'issued' && (
                    <button
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      className="danger"
                      onClick={() => handleVoid(cert.id)}
                      title="Anular"
                    >
                      <FaTrash size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <Link href={`/employees/${employeeId}/certificates`}>
          <button className="secondary">Ver Todos los Certificados</button>
        </Link>
      </div>
    </div>
  )
}

