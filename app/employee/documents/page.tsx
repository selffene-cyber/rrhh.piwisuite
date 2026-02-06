'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaDownload } from 'react-icons/fa'
import '../employee-portal-tailwind.css'

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
  
  const [typeFilter, setTypeFilter] = useState<'all' | 'certificate' | 'permission' | 'vacation' | 'payroll' | 'disciplinary' | 'advance'>('all')
  const [payrollYear, setPayrollYear] = useState<string>('')
  const [payrollMonth, setPayrollMonth] = useState<string>('')
  const [laborTypeFilter, setLaborTypeFilter] = useState<'all' | 'contract' | 'annex' | 'overtime'>('all')
  
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

      if (typeFilter === 'all' || typeFilter === 'payroll') {
        try {
          let url = '/api/employee/payroll-slips'
          const params = new URLSearchParams()
          if (payrollYear) params.append('year', payrollYear)
          if (payrollMonth) params.append('month', payrollMonth)
          params.append('_t', Date.now().toString())
          if (params.toString()) url += '?' + params.toString()
          
          const payrollResponse = await fetch(url, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
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

      if (laborTypeFilter === 'all' || laborTypeFilter === 'annex') {
        try {
          const annexResponse = await fetch(`/api/employee/contract-annexes?_t=${Date.now()}`, {
            cache: 'no-store'
          })
          if (annexResponse.ok) {
            const annexData = await annexResponse.json()
            const annexes = (annexData.annexes || []).map((a: any) => ({
              ...a,
              type: 'annex' as const,
              title: `Anexo de Contrato - ${a.annex_number || 'Sin número'}`,
              date: a.created_at || a.signed_at || a.start_date,
              downloadUrl: `/contracts/annex/${a.id}/pdf`,
            }))
            allDocs.push(...annexes)
          }
        } catch (err) {
          console.error('Error al cargar anexos:', err)
        }
      }

      if (laborTypeFilter === 'all' || laborTypeFilter === 'overtime') {
        try {
          const overtimeResponse = await fetch(`/api/employee/overtime-pacts?_t=${Date.now()}`, {
            cache: 'no-store'
          })
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
        window.open(`/payroll/${doc.id}/pdf`, '_blank')
      } else if (doc.type === 'overtime') {
        window.open(`/overtime/${doc.id}/pdf`, '_blank')
      } else if (doc.type === 'annex') {
        window.open(`/contracts/annex/${doc.id}/pdf`, '_blank')
      } else {
        window.open(doc.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Error al descargar:', error)
      alert('Error al descargar el documento')
    }
  }

  const handleViewDetail = async (doc: Document) => {
    setLoadingDetail(true)
    try {
      if (doc.type === 'payroll') {
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mb-3"></div>
          <p className="text-gray-600 text-sm font-medium">Cargando documentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <div>
        <Link
          href="/employee"
          className="inline-flex items-center justify-center w-10 h-10 mb-4 bg-white rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          title="Volver"
        >
          <FaArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Mis Documentos</h1>
        <p className="text-sm text-gray-600">
          Documentos aprobados y disponibles para descargar
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'general'
              ? 'text-gray-900 border-gray-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          Documentos Generales
        </button>
        <button
          onClick={() => setActiveTab('labor')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'labor'
              ? 'text-gray-900 border-gray-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          Documentos Laborales
        </button>
      </div>

      {/* Filtros para documentos generales */}
      {activeTab === 'general' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {(['all', 'certificate', 'permission', 'vacation', 'payroll', 'disciplinary', 'advance'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  typeFilter === t
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? 'Todos' : t === 'certificate' ? 'Certificados' : t === 'permission' ? 'Permisos' : t === 'vacation' ? 'Vacaciones' : t === 'payroll' ? 'Liquidaciones' : t === 'disciplinary' ? 'Amonestaciones' : 'Anticipos'}
              </button>
            ))}
          </div>

          {(typeFilter === 'payroll' || typeFilter === 'all') && (
            <div className="flex flex-wrap gap-3 items-center p-4 bg-gray-50 rounded-xl mb-4">
              <label className="text-sm font-medium text-gray-700">
                Filtrar Liquidaciones:
              </label>
              <select
                value={payrollYear}
                onChange={(e) => setPayrollYear(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">Todos los años</option>
                {years.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
              <select
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                  className="px-3 py-2 text-sm rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtros para documentos laborales */}
      {activeTab === 'labor' && (
        <div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'contract', 'annex', 'overtime'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLaborTypeFilter(t)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  laborTypeFilter === t
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? 'Todos' : t === 'contract' ? 'Contratos' : t === 'annex' ? 'Anexos' : 'Pactos Horas Extra'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      {currentDocuments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-gray-600 text-sm">
            No hay documentos disponibles
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {currentDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getTypeIcon(doc.type)}</span>
                    <h3 className="text-base font-semibold text-gray-900 m-0">
                      {doc.title}
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Fecha:</span> {formatDate(doc.date)}
                    </div>
                    
                    {doc.type === 'certificate' && doc.folio_number && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Folio:</span> {doc.folio_number}
                      </div>
                    )}
                    
                    {doc.type === 'payroll' && doc.period && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Período:</span> {new Date(2000, doc.period.month - 1, 1).toLocaleDateString('es-CL', { month: 'long' })} {doc.period.year}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  {(doc.type === 'payroll' || doc.type === 'overtime') && (
                    <button
                      onClick={() => handleViewDetail(doc)}
                      disabled={loadingDetail}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        loadingDetail
                          ? 'bg-gray-100 text-gray-400 cursor-wait opacity-60'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {loadingDetail ? 'Cargando...' : 'Ver Detalle'}
                    </button>
                  )}
                  {doc.downloadUrl && (
                    <button
                      onClick={() => handleDownload(doc)}
                      className="inline-flex items-center justify-center w-10 h-10 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Descargar"
                    >
                      <FaDownload size={16} />
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5"
          onClick={() => setSelectedPayroll(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl max-h-[90vh] w-full overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 m-0">
                Detalle de Liquidación
              </h2>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {selectedPayroll.period && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Período</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(2000, selectedPayroll.period.month - 1, 1).toLocaleDateString('es-CL', { month: 'long' })} {selectedPayroll.period.year}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  <p className="text-base font-medium text-gray-900 capitalize">
                    {selectedPayroll.status === 'issued' ? 'Emitida' : selectedPayroll.status === 'sent' ? 'Enviada' : selectedPayroll.status}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Días Trabajados</p>
                    <p className="text-base font-medium text-gray-900">{selectedPayroll.days_worked}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Sueldo Base</p>
                    <p className="text-base font-medium text-gray-900">
                      ${selectedPayroll.base_salary?.toLocaleString('es-CL') || 0}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Haberes</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    ${selectedPayroll.total_earnings?.toLocaleString('es-CL') || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Descuentos</p>
                  <p className="text-lg font-semibold text-red-600">
                    ${selectedPayroll.total_deductions?.toLocaleString('es-CL') || 0}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg mt-6">
                  <p className="text-sm text-gray-600 mb-2">Líquido a Pagar</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${selectedPayroll.net_pay?.toLocaleString('es-CL') || 0}
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
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
                    className="inline-flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Descargar PDF"
                  >
                    <FaDownload size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para detalle de pacto de horas extra */}
      {selectedOvertime && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5"
          onClick={() => setSelectedOvertime(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-lg max-h-[90vh] w-full overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 m-0">
                Detalle del Pacto de Horas Extra
              </h2>
              <button
                onClick={() => setSelectedOvertime(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  <p className="text-base font-medium text-gray-900 capitalize">
                    {selectedOvertime.status === 'active' ? 'Activo' : selectedOvertime.status === 'draft' ? 'Borrador' : selectedOvertime.status}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Horas Máximas Diarias</p>
                    <p className="text-base font-medium text-gray-900">{selectedOvertime.max_daily_hours} horas</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Horas Máximas Semanales</p>
                    <p className="text-base font-medium text-gray-900">{selectedOvertime.max_weekly_hours || '-'} horas</p>
                  </div>
                </div>
                {selectedOvertime.start_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Fecha de Inicio</p>
                    <p className="text-base font-medium text-gray-900">
                      {formatDate(selectedOvertime.start_date)}
                    </p>
                  </div>
                )}
                {selectedOvertime.end_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Fecha de Término</p>
                    <p className="text-base font-medium text-gray-900">
                      {formatDate(selectedOvertime.end_date)}
                    </p>
                  </div>
                )}
                <div className="flex gap-3 mt-6">
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
                    className="inline-flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Descargar PDF"
                  >
                    <FaDownload size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
