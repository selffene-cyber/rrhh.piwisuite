'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaDownload } from 'react-icons/fa'
import '../employee-portal.css'

interface Document {
  id: string
  type: 'certificate' | 'vacation' | 'permission' | 'payroll' | 'disciplinary' | 'contract' | 'annex' | 'overtime' | 'advance'
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'certificate' | 'permission' | 'vacation' | 'payroll' | 'disciplinary' | 'advance'>('all')
  
  // Filtros para liquidaciones
  const [payrollYear, setPayrollYear] = useState<string>('')
  const [payrollMonth, setPayrollMonth] = useState<string>('')
  
  // Filtros para documentos laborales
  const [laborTypeFilter, setLaborTypeFilter] = useState<'all' | 'contract' | 'annex' | 'overtime'>('all')
  
  // Estado para modales
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null)
  const [selectedOvertime, setSelectedOvertime] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

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
          const certResponse = await fetch(`/api/employee/certificates?status=approved&_t=${Date.now()}`, {
            cache: 'no-store'
          })
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
          const vacResponse = await fetch(`/api/employee/vacations?status=aprobada&_t=${Date.now()}`, {
            cache: 'no-store'
          })
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
          const permResponse = await fetch(`/api/employee/permissions?status=approved&_t=${Date.now()}`, {
            cache: 'no-store'
          })
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
          // Agregar timestamp para evitar cache
          params.append('_t', Date.now().toString())
          if (params.toString()) url += '?' + params.toString()
          
          const payrollResponse = await fetch(url, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
          console.log('[FRONTEND] Respuesta de API de liquidaciones:', payrollResponse.status, payrollResponse.ok)
          if (payrollResponse.ok) {
            const payrollData = await payrollResponse.json()
            console.log('[FRONTEND] Datos de liquidaciones recibidos:', payrollData)
            if (payrollData.debug) {
              console.log('[FRONTEND] DEBUG Liquidaciones:', payrollData.debug)
            }
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

      // Cargar anticipos
      if (typeFilter === 'all' || typeFilter === 'advance') {
        try {
          const advanceResponse = await fetch(`/api/employee/advances?_t=${Date.now()}`, {
            cache: 'no-store'
          })
          if (advanceResponse.ok) {
            const advanceData = await advanceResponse.json()
            const advances = (advanceData.advances || []).map((a: any) => ({
              ...a,
              type: 'advance' as const,
              title: `Anticipo - $${a.amount?.toLocaleString('es-CL') || 0}`,
              date: a.advance_date || a.created_at,
              downloadUrl: a.pdf_url || `/advances/${a.id}/pdf`,
            }))
            allDocs.push(...advances)
          }
        } catch (err) {
          console.error('Error al cargar anticipos:', err)
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
          const contractResponse = await fetch(`/api/employee/contracts?_t=${Date.now()}`, {
            cache: 'no-store'
          })
          if (contractResponse.ok) {
            const contractData = await contractResponse.json()
            const contracts = (contractData.contracts || []).map((c: any) => ({
              ...c,
              type: 'contract' as const,
              title: `Contrato de Trabajo - ${c.contract_number || 'Sin número'}`,
              date: c.start_date || c.signed_at || c.created_at,
              downloadUrl: c.pdf_url || `/api/contracts/${c.id}/download`,
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
          const annexResponse = await fetch(`/api/employee/contract-annexes?_t=${Date.now()}`, {
            cache: 'no-store'
          })
          if (annexResponse.ok) {
            const annexData = await annexResponse.json()
            console.log('[FRONTEND] Datos de anexos recibidos:', annexData)
            if (annexData.debug) {
              console.log('[FRONTEND] DEBUG Anexos:', annexData.debug)
            }
            const annexes = (annexData.annexes || []).map((a: any) => {
              // IMPORTANTE: Mostrar created_at (fecha de creación) en lugar de start_date (fecha de inicio)
              // El start_date es la fecha de inicio del anexo, no la fecha en que se creó
              // Para mostrar cuándo se creó el anexo, usar created_at
              const displayDate = a.created_at || a.signed_at || a.start_date
              console.log(`[FRONTEND] Anexo ${a.annex_number}:`)
              console.log(`  - start_date (fecha inicio): ${a.start_date}`)
              console.log(`  - created_at (fecha creación): ${a.created_at}`)
              console.log(`  - signed_at: ${a.signed_at}`)
              console.log(`  - Usando fecha para mostrar: ${displayDate}`)
              return {
                ...a,
                type: 'annex' as const,
                title: `Anexo de Contrato - ${a.annex_number || 'Sin número'}`,
                date: displayDate, // Usar created_at para mostrar fecha de creación
                downloadUrl: `/contracts/annex/${a.id}/pdf`,
              }
            })
            console.log('Anexos mapeados:', annexes.length)
            if (annexes.length > 0) {
              annexes.forEach((a: any, idx: number) => {
                console.log(`[FRONTEND] Anexo mapeado ${idx + 1}: ${a.annex_number}, fecha mostrada: ${a.date}`)
              })
            }
            allDocs.push(...annexes)
          }
        } catch (err) {
          console.error('Error al cargar anexos:', err)
        }
      }

      // Cargar pactos de horas extra
      if (laborTypeFilter === 'all' || laborTypeFilter === 'overtime') {
        try {
          console.log('Cargando pactos de horas extra...')
          const overtimeResponse = await fetch(`/api/employee/overtime-pacts?_t=${Date.now()}`, {
            cache: 'no-store'
          })
          console.log('[FRONTEND] Respuesta de API de pactos:', overtimeResponse.status, overtimeResponse.ok)
          if (overtimeResponse.ok) {
            const overtimeData = await overtimeResponse.json()
            console.log('[FRONTEND] Datos de pactos recibidos:', overtimeData)
            if (overtimeData.debug) {
              console.log('[FRONTEND] DEBUG Pactos:', overtimeData.debug)
            }
            if (overtimeData.error) {
              console.error('[FRONTEND] Error en respuesta de pactos:', overtimeData.error, overtimeData.details)
            }
            const pacts = (overtimeData.pacts || []).map((p: any) => ({
              ...p,
              type: 'overtime' as const,
              title: `Pacto de Horas Extra - ${p.max_daily_hours} horas/día`,
              date: p.start_date || p.created_at,
              downloadUrl: p.pdf_url || `/overtime/${p.id}/pdf`,
            }))
            console.log('Pactos mapeados:', pacts.length)
            allDocs.push(...pacts)
          } else {
            const errorData = await overtimeResponse.json().catch(() => ({}))
            console.error('Error en respuesta de API de pactos:', errorData)
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
      advance: '💵',
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

  const handleDownload = async (doc: Document) => {
    if (!doc.downloadUrl) return
    
    try {
      if (doc.type === 'payroll') {
        await downloadPayrollPDF(doc)
      } else if (doc.type === 'overtime') {
        await downloadOvertimePDF(doc)
      } else if (doc.type === 'annex') {
        await downloadAnnexPDF(doc)
      } else {
        // Para otros tipos, abrir en nueva ventana
        window.open(doc.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Error al descargar:', error)
      alert('Error al descargar el documento: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  const downloadPayrollPDF = async (doc: Document) => {
    // Abrir la página del PDF en una nueva pestaña
    // Esa página tiene todos los datos correctos y el botón de descarga nativo
    window.open(`/payroll/${doc.id}/pdf`, '_blank')
  }

  const downloadOvertimePDF = async (doc: Document) => {
    // Abrir la página del PDF en una nueva pestaña
    // Esa página tiene todos los datos correctos y el botón de descarga nativo
    window.open(`/overtime/${doc.id}/pdf`, '_blank')
  }

  const downloadAnnexPDF = async (doc: Document) => {
    // Abrir la página del PDF en una nueva pestaña
    // Esa página tiene todos los datos correctos y el botón de descarga nativo
    window.open(`/contracts/annex/${doc.id}/pdf`, '_blank')
  }

  const handleViewDetail = async (doc: Document) => {
    setLoadingDetail(true)
    try {
      if (doc.type === 'payroll') {
        // Cargar detalles de la liquidación
        const response = await fetch(`/api/employee/payroll-slips?_t=${Date.now()}`, {
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          const slip = data.slips?.find((s: any) => s.id === doc.id)
          if (slip) {
            setSelectedPayroll(slip)
          }
        }
      } else if (doc.type === 'overtime') {
        // Cargar detalles del pacto
        const response = await fetch(`/api/employee/overtime-pacts?_t=${Date.now()}`, {
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          const pact = data.pacts?.find((p: any) => p.id === doc.id)
          if (pact) {
            setSelectedOvertime(pact)
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error)
    } finally {
      setLoadingDetail(false)
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
            {(['all', 'certificate', 'permission', 'vacation', 'payroll', 'disciplinary', 'advance'] as const).map((t) => (
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
                {t === 'all' ? 'Todos' : t === 'certificate' ? 'Certificados' : t === 'permission' ? 'Permisos' : t === 'vacation' ? 'Vacaciones' : t === 'payroll' ? 'Liquidaciones' : t === 'disciplinary' ? 'Amonestaciones' : 'Anticipos'}
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
                  {doc.type === 'advance' && doc.advance_date && (
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      Fecha: {formatDate(doc.advance_date)}
                    </div>
                  )}
                  {doc.type === 'overtime' && doc.start_date && doc.end_date && (
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      Vigente desde {formatDate(doc.start_date)} hasta {formatDate(doc.end_date)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(doc.type === 'payroll' || doc.type === 'overtime') && (
                    <button
                      onClick={() => handleViewDetail(doc)}
                      disabled={loadingDetail}
                      style={{
                        padding: '8px 16px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: loadingDetail ? 'wait' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: loadingDetail ? 0.6 : 1
                      }}
                    >
                      {loadingDetail ? 'Cargando...' : 'Ver Detalle'}
                    </button>
                  )}
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
            </div>
          ))}
        </div>
      )}

      {/* Modal para detalle de liquidación */}
      {selectedPayroll && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedPayroll(null)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '800px',
            maxHeight: '90vh',
            width: '100%',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Detalle de Liquidación
              </h2>
              <button
                onClick={() => setSelectedPayroll(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {selectedPayroll.period && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Período</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                    {new Date(2000, selectedPayroll.period.month - 1, 1).toLocaleDateString('es-CL', { month: 'long' })} {selectedPayroll.period.year}
                  </p>
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Estado</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', textTransform: 'capitalize' }}>
                  {selectedPayroll.status === 'issued' ? 'Emitida' : selectedPayroll.status === 'sent' ? 'Enviada' : selectedPayroll.status}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Días Trabajados</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{selectedPayroll.days_worked}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Sueldo Base</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                    ${selectedPayroll.base_salary?.toLocaleString('es-CL') || 0}
                  </p>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Total Haberes</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#10b981' }}>
                  ${selectedPayroll.total_earnings?.toLocaleString('es-CL') || 0}
                </p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Total Descuentos</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>
                  ${selectedPayroll.total_deductions?.toLocaleString('es-CL') || 0}
                </p>
              </div>
              <div style={{ 
                padding: '16px',
                background: '#f3f4f6',
                borderRadius: '8px',
                marginTop: '24px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Líquido a Pagar</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#6366f1' }}>
                  ${selectedPayroll.net_pay?.toLocaleString('es-CL') || 0}
                </p>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    const doc: Document = {
                      ...selectedPayroll,
                      type: 'payroll',
                      downloadUrl: `/payroll/${selectedPayroll.id}/pdf`,
                      period: selectedPayroll.payroll_periods
                    }
                    handleDownload(doc)
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FaDownload size={16} />
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para detalle de pacto de horas extra */}
      {selectedOvertime && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedOvertime(null)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
            maxHeight: '90vh',
            width: '100%',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Detalle del Pacto de Horas Extra
              </h2>
              <button
                onClick={() => setSelectedOvertime(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Estado</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', textTransform: 'capitalize' }}>
                  {selectedOvertime.status === 'active' ? 'Activo' : selectedOvertime.status === 'draft' ? 'Borrador' : selectedOvertime.status}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Horas Máximas Diarias</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{selectedOvertime.max_daily_hours} horas</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Horas Máximas Semanales</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{selectedOvertime.max_weekly_hours || '-'} horas</p>
                </div>
              </div>
              {selectedOvertime.start_date && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Fecha de Inicio</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                    {formatDate(selectedOvertime.start_date)}
                  </p>
                </div>
              )}
              {selectedOvertime.end_date && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Fecha de Término</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                    {formatDate(selectedOvertime.end_date)}
                  </p>
                </div>
              )}
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    const doc: Document = {
                      ...selectedOvertime,
                      type: 'overtime',
                      downloadUrl: `/overtime/${selectedOvertime.id}/pdf`,
                      start_date: selectedOvertime.start_date
                    }
                    handleDownload(doc)
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FaDownload size={16} />
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
