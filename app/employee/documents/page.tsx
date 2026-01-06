'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaDownload } from 'react-icons/fa'
import '../employee-portal.css'

interface Document {
  id: string
  type: 'certificate' | 'vacation' | 'permission' | 'payroll' | 'disciplinary' | 'contract' | 'annex' | 'overtime'
  title: string
  status: string
  created_at: string
  date: string
  downloadUrl?: string | null
  [key: string]: any
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'labor'>('general')
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [laborDocuments, setLaborDocuments] = useState<Document[]>([])
  
  // Filtros para documentos generales
  const [typeFilter, setTypeFilter] = useState<'all' | 'certificate' | 'permission' | 'vacation' | 'payroll' | 'disciplinary'>('all')
  
  // Filtros para liquidaciones
  const [payrollYear, setPayrollYear] = useState<string>('')
  const [payrollMonth, setPayrollMonth] = useState<string>('')
  
  // Filtros para documentos laborales
  const [laborTypeFilter, setLaborTypeFilter] = useState<'all' | 'contract' | 'annex' | 'overtime'>('all')

  useEffect(() => {
    if (activeTab === 'general') {
      loadGeneralDocuments()
    } else {
      loadLaborDocuments()
    }
  }, [activeTab, typeFilter, payrollYear, payrollMonth, laborTypeFilter])

  const loadGeneralDocuments = async () => {
    setLoading(true)
    try {
      const allDocs: Document[] = []

      // Cargar certificados aprobados/emitidos
      if (typeFilter === 'all' || typeFilter === 'certificate') {
        try {
          const certResponse = await fetch('/api/employee/certificates?status=approved')
          if (certResponse.ok) {
            const certData = await certResponse.json()
            const certs = (certData.certificates || [])
              .filter((c: any) => c.status === 'approved' || c.status === 'issued')
              .map((c: any) => ({
                ...c,
                type: 'certificate' as const,
                title: `Certificado de ${c.certificate_type === 'antiguedad' ? 'Antigüedad' : c.certificate_type === 'renta' ? 'Renta' : 'Vigencia'}`,
                date: c.issue_date || c.created_at,
                downloadUrl: c.signed_pdf_url || `/employees/${c.employee_id}/certificates/${c.certificate_type}/pdf?issue_date=${c.issue_date}${c.folio_number ? `&folio_number=${c.folio_number}` : ''}`,
              }))
            allDocs.push(...certs)
          }
        } catch (err) {
          console.error('Error al cargar certificados:', err)
        }
      }

      // Cargar vacaciones aprobadas
      if (typeFilter === 'all' || typeFilter === 'vacation') {
        try {
          const vacResponse = await fetch('/api/employee/vacations?status=aprobada')
          if (vacResponse.ok) {
            const vacData = await vacResponse.json()
            const vacs = (vacData.vacations || [])
              .filter((v: any) => v.status === 'aprobada' || v.status === 'tomada')
              .map((v: any) => ({
                ...v,
                type: 'vacation' as const,
                title: `Vacaciones - ${v.days_count} días`,
                date: v.start_date || v.created_at,
                downloadUrl: v.signed_pdf_url || null,
              }))
            allDocs.push(...vacs)
          }
        } catch (err) {
          console.error('Error al cargar vacaciones:', err)
        }
      }

      // Cargar permisos aprobados
      if (typeFilter === 'all' || typeFilter === 'permission') {
        try {
          const permResponse = await fetch('/api/employee/permissions?status=approved')
          if (permResponse.ok) {
            const permData = await permResponse.json()
            const perms = (permData.permissions || [])
              .filter((p: any) => p.status === 'approved' || p.status === 'applied')
              .map((p: any) => ({
                ...p,
                type: 'permission' as const,
                title: `${p.permission_types?.label || 'Permiso'} - ${p.days} días`,
                date: p.start_date || p.created_at,
                downloadUrl: p.signed_pdf_url || `/permissions/${p.id}/pdf`,
              }))
            allDocs.push(...perms)
          }
        } catch (err) {
          console.error('Error al cargar permisos:', err)
        }
      }

      // Cargar liquidaciones de sueldo
      if (typeFilter === 'all' || typeFilter === 'payroll') {
        try {
          let url = '/api/employee/payroll-slips'
          const params = new URLSearchParams()
          if (payrollYear) params.append('year', payrollYear)
          if (payrollMonth) params.append('month', payrollMonth)
          if (params.toString()) url += '?' + params.toString()
          
          const payrollResponse = await fetch(url)
          if (payrollResponse.ok) {
            const payrollData = await payrollResponse.json()
            const slips = (payrollData.slips || []).map((s: any) => {
              const period = s.payroll_periods
              const monthName = period?.month ? new Date(2000, period.month - 1, 1).toLocaleDateString('es-CL', { month: 'long' }) : ''
              return {
                ...s,
                type: 'payroll' as const,
                title: `Liquidación de Sueldo - ${monthName} ${period?.year || ''}`,
                date: s.created_at,
                downloadUrl: `/payroll/${s.id}/pdf`,
                period: period,
              }
            })
            allDocs.push(...slips)
          }
        } catch (err) {
          console.error('Error al cargar liquidaciones:', err)
        }
      }

      // Cargar cartas de amonestación
      if (typeFilter === 'all' || typeFilter === 'disciplinary') {
        try {
          const discResponse = await fetch('/api/employee/disciplinary-actions')
          if (discResponse.ok) {
            const discData = await discResponse.json()
            const actions = (discData.actions || []).map((a: any) => ({
              ...a,
              type: 'disciplinary' as const,
              title: `Carta de Amonestación - ${a.type === 'verbal' ? 'Verbal' : 'Escrita'}`,
              date: a.incident_date || a.created_at,
              downloadUrl: a.pdf_url || null,
            }))
            allDocs.push(...actions)
          }
        } catch (err) {
          console.error('Error al cargar amonestaciones:', err)
        }
      }

      // Ordenar por fecha (más recientes primero)
      allDocs.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateB - dateA
      })

      setDocuments(allDocs)
    } catch (err) {
      console.error('Error al cargar documentos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLaborDocuments = async () => {
    setLoading(true)
    try {
      const allDocs: Document[] = []

      // Cargar contratos firmados
      if (laborTypeFilter === 'all' || laborTypeFilter === 'contract') {
        try {
          const contractResponse = await fetch('/api/employee/contracts')
          if (contractResponse.ok) {
            const contractData = await contractResponse.json()
            const contracts = (contractData.contracts || []).map((c: any) => ({
              ...c,
              type: 'contract' as const,
              title: `Contrato de Trabajo - ${c.contract_number || 'Sin número'}`,
              date: c.start_date || c.signed_at || c.created_at,
              downloadUrl: c.pdf_url || `/contracts/${c.id}/pdf`,
            }))
            allDocs.push(...contracts)
          }
        } catch (err) {
          console.error('Error al cargar contratos:', err)
        }
      }

      // Cargar anexos de contratos
      if (laborTypeFilter === 'all' || laborTypeFilter === 'annex') {
        try {
          const annexResponse = await fetch('/api/employee/contract-annexes')
          if (annexResponse.ok) {
            const annexData = await annexResponse.json()
            const annexes = (annexData.annexes || []).map((a: any) => ({
              ...a,
              type: 'annex' as const,
              title: `Anexo de Contrato - ${a.annex_number || 'Sin número'}`,
              date: a.start_date || a.signed_at || a.created_at,
              downloadUrl: a.pdf_url || `/contracts/annex/${a.id}/pdf`,
            }))
            allDocs.push(...annexes)
          }
        } catch (err) {
          console.error('Error al cargar anexos:', err)
        }
      }

      // Cargar pactos de horas extra
      if (laborTypeFilter === 'all' || laborTypeFilter === 'overtime') {
        try {
          const overtimeResponse = await fetch('/api/employee/overtime-pacts')
          if (overtimeResponse.ok) {
            const overtimeData = await overtimeResponse.json()
            const pacts = (overtimeData.pacts || []).map((p: any) => ({
              ...p,
              type: 'overtime' as const,
              title: `Pacto de Horas Extra - ${p.max_daily_hours} horas/día`,
              date: p.start_date || p.created_at,
              downloadUrl: p.pdf_url || `/overtime/${p.id}/pdf`,
            }))
            allDocs.push(...pacts)
          }
        } catch (err) {
          console.error('Error al cargar pactos:', err)
        }
      }

      // Ordenar por fecha (más recientes primero)
      allDocs.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateB - dateA
      })

      setLaborDocuments(allDocs)
    } catch (err) {
      console.error('Error al cargar documentos laborales:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      certificate: '📄',
      vacation: '🏖️',
      permission: '📝',
      payroll: '💰',
      disciplinary: '⚠️',
      contract: '📋',
      annex: '📎',
      overtime: '⏰',
    }
    return icons[type] || '📋'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDownload = (doc: Document) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank')
    }
  }

  // Generar años para el filtro de liquidaciones (últimos 5 años)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ]

  const currentDocuments = activeTab === 'general' ? documents : laborDocuments
  const currentTypeFilter = activeTab === 'general' ? typeFilter : laborTypeFilter

  if (loading && currentDocuments.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Cargando documentos...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/employee"
          className="back-button-icon"
          style={{ marginBottom: '16px' }}
        >
          <FaArrowLeft />
        </Link>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#111827' }}>Mis Documentos</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
          Documentos aprobados y disponibles para descargar
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('general')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            color: activeTab === 'general' ? '#6366f1' : '#6b7280',
            borderBottom: activeTab === 'general' ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Documentos Generales
        </button>
        <button
          onClick={() => setActiveTab('labor')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            color: activeTab === 'labor' ? '#6366f1' : '#6b7280',
            borderBottom: activeTab === 'labor' ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Documentos Laborales
        </button>
      </div>

      {/* Filtros para documentos generales */}
      {activeTab === 'general' && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap'
          }}>
            {(['all', 'certificate', 'permission', 'vacation', 'payroll', 'disciplinary'] as const).map((t) => (
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
                {t === 'all' ? 'Todos' : t === 'certificate' ? 'Certificados' : t === 'permission' ? 'Permisos' : t === 'vacation' ? 'Vacaciones' : t === 'payroll' ? 'Liquidaciones' : 'Amonestaciones'}
              </button>
            ))}
          </div>

          {/* Filtros específicos para liquidaciones */}
          {typeFilter === 'payroll' || typeFilter === 'all' ? (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Filtrar Liquidaciones:
              </label>
              <select
                value={payrollYear}
                onChange={(e) => setPayrollYear(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">Todos los años</option>
                {years.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
              <select
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">Todos los meses</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              {(payrollYear || payrollMonth) && (
                <button
                  onClick={() => {
                    setPayrollYear('')
                    setPayrollMonth('')
                  }}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Filtros para documentos laborales */}
      {activeTab === 'labor' && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            {(['all', 'contract', 'annex', 'overtime'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLaborTypeFilter(t)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: laborTypeFilter === t ? '#6366f1' : 'white',
                  color: laborTypeFilter === t ? 'white' : '#6b7280',
                  boxShadow: laborTypeFilter === t ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {t === 'all' ? 'Todos' : t === 'contract' ? 'Contratos' : t === 'annex' ? 'Anexos' : 'Pactos Horas Extra'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      {currentDocuments.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <p style={{ color: '#6b7280', margin: 0 }}>
            No hay documentos disponibles
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentDocuments.map((doc) => (
            <div
              key={doc.id}
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
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(doc.type)}</span>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      {doc.title}
                    </h3>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    {formatDate(doc.date)}
                  </div>
                  {doc.type === 'certificate' && doc.folio_number && (
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      Folio: {doc.folio_number}
                    </div>
                  )}
                  {doc.type === 'payroll' && doc.period && (
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      Período: {new Date(2000, doc.period.month - 1, 1).toLocaleDateString('es-CL', { month: 'long' })} {doc.period.year}
                    </div>
                  )}
                </div>
                {doc.downloadUrl && (
                  <button
                    onClick={() => handleDownload(doc)}
                    style={{
                      padding: '8px 16px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FaDownload size={14} />
                    Descargar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
