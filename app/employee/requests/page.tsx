'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FaArrowLeft, FaDownload, FaChevronDown } from 'react-icons/fa'
import '../employee-portal-tailwind.css'

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
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRequests()
  }, [filter, typeFilter])

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setTypeDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
            const certs = (certData.certificates || []).map((c: any) => ({
              ...c,
              type: 'certificate' as const,
              title: `Certificado de ${c.certificate_type === 'antiguedad' ? 'Antigüedad' : c.certificate_type === 'renta' ? 'Renta' : 'Vigencia'}`,
              date: c.requested_at || c.created_at,
            }))
            allRequests.push(...certs)
          }
        } catch (err) {
          console.error('Error al cargar certificados:', err)
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
            const perms = (permData.permissions || []).map((p: any) => ({
              ...p,
              type: 'permission' as const,
              title: `${p.permission_types?.label || p.permission_type_code || 'Permiso'} - ${p.days || 0} días`,
              date: p.requested_at || p.created_at,
              status: p.status || 'draft',
            }))
            allRequests.push(...perms)
          }
        } catch (err) {
          console.error('Error al cargar permisos:', err)
        }
      }

      // Ordenar por fecha
      allRequests.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateB - dateA
      })

      // Aplicar filtro de estado
      let filtered = allRequests
      if (filter === 'pending') {
        filtered = allRequests.filter(r => {
          if (r.type === 'certificate') return r.status === 'requested' || r.status === 'draft'
          if (r.type === 'vacation') return r.status === 'solicitada' || r.status === 'draft'
          if (r.type === 'permission') return r.status === 'requested' || r.status === 'draft'
          return r.status === 'requested' || r.status === 'solicitada' || r.status === 'draft'
        })
      } else if (filter === 'approved') {
        filtered = allRequests.filter(r => {
          if (r.type === 'certificate') return r.status === 'approved' || r.status === 'issued'
          if (r.type === 'vacation') return r.status === 'aprobada' || r.status === 'tomada'
          if (r.type === 'permission') return r.status === 'approved' || r.status === 'applied'
          return r.status === 'approved' || r.status === 'aprobada' || r.status === 'issued' || r.status === 'tomada' || r.status === 'applied'
        })
      } else if (filter === 'rejected') {
        filtered = allRequests.filter(r => {
          return r.status === 'rejected' || r.status === 'rechazada'
        })
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
      <span
        className="px-3 py-1 rounded-full text-xs font-medium"
        style={{
          color: statusInfo.color,
          backgroundColor: statusInfo.bg,
        }}
      >
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

  const getTypeLabel = (type: 'all' | 'certificates' | 'permissions' | 'vacations') => {
    const labels = {
      all: 'Todos los tipos',
      certificates: 'Certificados',
      permissions: 'Permisos',
      vacations: 'Vacaciones',
    }
    return labels[type]
  }

  const getStatusLabel = (status: 'all' | 'pending' | 'approved' | 'rejected') => {
    const labels = {
      all: 'Todos los estados',
      pending: 'Pendientes',
      approved: 'Aprobadas',
      rejected: 'Rechazadas',
    }
    return labels[status]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDownload = (request: Request) => {
    const signedPdfUrl = request.signed_pdf_url
    
    if (signedPdfUrl) {
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
    return !!(request.signed_pdf_url && 
      (request.status === 'approved' || request.status === 'issued' || request.status === 'aprobada' || request.status === 'tomada' || request.status === 'applied'))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mb-3"></div>
          <p className="text-gray-600 text-sm font-medium">Cargando solicitudes...</p>
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Mis Solicitudes</h1>
        <p className="text-sm text-gray-600">
          Gestiona todas tus solicitudes de certificados, permisos y vacaciones
        </p>
      </div>

      {/* Filtros con Dropdowns Minimalistas */}
      <div className="flex flex-wrap gap-3">
        {/* Dropdown Tipo de Solicitud */}
        <div className="relative inline-block" ref={typeDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setTypeDropdownOpen(!typeDropdownOpen)
              setStatusDropdownOpen(false)
            }}
            className={`inline-flex items-center justify-between gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200 min-w-[180px] ${
              typeDropdownOpen ? 'ring-2 ring-gray-400 ring-offset-1 border-gray-400' : ''
            }`}
          >
            <span>{getTypeLabel(typeFilter)}</span>
            <FaChevronDown className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-200 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {typeDropdownOpen && (
            <div className="absolute left-0 z-20 mt-2 w-64 origin-top-left rounded-lg bg-white shadow-lg border border-gray-300 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="py-1">
                <div className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                  Tipo de Solicitud
                </div>
                {(['all', 'certificates', 'permissions', 'vacations'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTypeFilter(type)
                      setTypeDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-all duration-150 ${
                      typeFilter === type
                        ? 'bg-gray-100 text-gray-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown Estado */}
        <div className="relative inline-block" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setStatusDropdownOpen(!statusDropdownOpen)
              setTypeDropdownOpen(false)
            }}
            className={`inline-flex items-center justify-between gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200 min-w-[180px] ${
              statusDropdownOpen ? 'ring-2 ring-gray-400 ring-offset-1 border-gray-400' : ''
            }`}
          >
            <span>{getStatusLabel(filter)}</span>
            <FaChevronDown className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-200 ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {statusDropdownOpen && (
            <div className="absolute left-0 z-20 mt-2 w-64 origin-top-left rounded-lg bg-white shadow-lg border border-gray-300 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="py-1">
                <div className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                  Estado
                </div>
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setFilter(status)
                      setStatusDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-all duration-150 ${
                      filter === status
                        ? 'bg-gray-100 text-gray-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de solicitudes */}
      {requests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-600 text-sm">
            No hay solicitudes {filter !== 'all' ? `con estado "${getStatusLabel(filter)}"` : ''}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getTypeIcon(request.type)}</span>
                    <h3 className="text-base font-semibold text-gray-900 m-0">
                      {request.title}
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Fecha:</span> {formatDate(request.date)}
                    </div>
                    
                    {request.rejection_reason && (
                      <div className="text-sm text-red-600 mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <span className="font-semibold">Motivo de rechazo:</span> {request.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  {getStatusBadge(request.status)}
                  {hasSignedPdf(request) && (
                    <button
                      onClick={() => handleDownload(request)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      title="Descargar PDF firmado"
                    >
                      <FaDownload size={12} />
                      Descargar
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
