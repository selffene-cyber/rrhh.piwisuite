'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { AccidentWithRelations } from '@/lib/services/raatService'
import { FaExclamationCircle, FaPlus, FaEdit, FaEye, FaFilePdf, FaCheckCircle, FaTimesCircle, FaClock, FaFilter, FaChartBar, FaFileAlt } from 'react-icons/fa'
import Link from 'next/link'

const EVENT_TYPE_LABELS: Record<string, string> = {
  accidente_trabajo: 'Accidente del Trabajo',
  accidente_trayecto: 'Accidente de Trayecto',
  enfermedad_profesional: 'Enfermedad Profesional',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  closed: 'Cerrado',
  with_sequelae: 'Con Secuelas',
  consolidated: 'Consolidado',
}

const DIAT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#d97706', label: 'Pendiente' },
  sent: { bg: '#d1fae5', text: '#059669', label: 'Enviada' },
  overdue: { bg: '#fee2e2', text: '#dc2626', label: 'Fuera de Plazo' },
}

export default function RAATPage() {
  const { companyId, company } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [accidents, setAccidents] = useState<AccidentWithRelations[]>([])
  const [stats, setStats] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filtros
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    event_type: 'all',
    status: 'all',
    diat_status: 'all',
    employee_rut: '',
  })

  useEffect(() => {
    if (companyId) {
      loadAccidents()
      loadStats()
    }
  }, [companyId, filters])

  const loadAccidents = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        company_id: companyId,
      })

      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.event_type !== 'all') params.append('event_type', filters.event_type)
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.diat_status !== 'all') params.append('diat_status', filters.diat_status)
      if (filters.employee_rut) params.append('employee_rut', filters.employee_rut)

      const response = await fetch(`/api/raat?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar accidentes')
      
      const data = await response.json()
      setAccidents(data)
    } catch (error: any) {
      console.error('Error al cargar accidentes:', error)
      alert('Error al cargar accidentes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!companyId) return

    try {
      const params = new URLSearchParams({
        company_id: companyId,
      })

      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)

      const response = await fetch(`/api/raat/stats?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar estadísticas')
      
      const data = await response.json()
      setStats(data)
    } catch (error: any) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      event_type: 'all',
      status: 'all',
      diat_status: 'all',
      employee_rut: '',
    })
  }

  const getDIATStatusBadge = (diatStatus: string) => {
    const status = DIAT_STATUS_COLORS[diatStatus] || DIAT_STATUS_COLORS.pending
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          backgroundColor: status.bg,
          color: status.text,
        }}
      >
        {diatStatus === 'sent' && <FaCheckCircle size={10} />}
        {diatStatus === 'overdue' && <FaTimesCircle size={10} />}
        {diatStatus === 'pending' && <FaClock size={10} />}
        {status.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) // HH:MM
  }

  if (!company) {
    return (
      <div>
        <h1>RAAT - Registro de Accidentes</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para gestionar el registro de accidentes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626'
          }}>
            <FaExclamationCircle size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>RAAT</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Registro de Accidentes del Trabajo y Enfermedades Profesionales
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaFilter /> {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </button>
          <Link href="/raat/dashboard">
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaChartBar /> Dashboard
            </button>
          </Link>
          <Link href="/raat/diat">
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaFileAlt /> Gestión DIAT
            </button>
          </Link>
          <Link href="/raat/new">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus /> Nuevo Accidente
            </button>
          </Link>
        </div>
      </div>

      {/* Dashboard de Estadísticas */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Accidentes</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>
              {stats.by_diat_status.overdue}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>DIAT Fuera de Plazo</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#d97706', marginBottom: '8px' }}>
              {stats.by_diat_status.pending}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>DIAT Pendientes</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669', marginBottom: '8px' }}>
              {stats.frequency_rate || 0}%
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Tasa de Frecuencia</div>
          </div>
          {stats.recurrence_count !== undefined && (
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#7c3aed', marginBottom: '8px' }}>
                {stats.recurrence_count}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Trabajadores Recurrentes</div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Filtros</h3>
            <button onClick={clearFilters} className="secondary" style={{ fontSize: '12px' }}>
              Limpiar Filtros
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Fecha Desde</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Fecha Hasta</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Tipo de Evento</label>
              <select
                value={filters.event_type}
                onChange={(e) => handleFilterChange('event_type', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="all">Todos</option>
                <option value="accidente_trabajo">Accidente del Trabajo</option>
                <option value="accidente_trayecto">Accidente de Trayecto</option>
                <option value="enfermedad_profesional">Enfermedad Profesional</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Estado</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="all">Todos</option>
                <option value="open">Abierto</option>
                <option value="closed">Cerrado</option>
                <option value="with_sequelae">Con Secuelas</option>
                <option value="consolidated">Consolidado</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Estado DIAT</label>
              <select
                value={filters.diat_status}
                onChange={(e) => handleFilterChange('diat_status', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="sent">Enviada</option>
                <option value="overdue">Fuera de Plazo</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>RUT Trabajador</label>
              <input
                type="text"
                placeholder="12.345.678-9"
                value={filters.employee_rut}
                onChange={(e) => handleFilterChange('employee_rut', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lista de Accidentes */}
      {loading ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px' }}>Cargando accidentes...</p>
        </div>
      ) : accidents.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No se encontraron accidentes con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>N°</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Fecha/Hora</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Trabajador</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>DIAT</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accidents.map((accident) => (
                  <tr key={accident.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600' }}>
                      #{accident.accident_number}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <div>{formatDate(accident.event_date)}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatTime(accident.event_time)}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>{accident.employee_name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{accident.employee_rut}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {EVENT_TYPE_LABELS[accident.event_type] || accident.event_type}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: accident.status === 'open' ? '#dbeafe' : accident.status === 'closed' ? '#d1fae5' : '#f3f4f6',
                          color: accident.status === 'open' ? '#3b82f6' : accident.status === 'closed' ? '#059669' : '#6b7280',
                        }}
                      >
                        {STATUS_LABELS[accident.status] || accident.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {getDIATStatusBadge(accident.diat_status)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Link href={`/raat/${accident.id}`}>
                          <button
                            className="secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Ver"
                          >
                            <FaEye size={12} />
                          </button>
                        </Link>
                        {accident.status === 'open' && (
                          <Link href={`/raat/${accident.id}/edit`}>
                            <button
                              className="secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              title="Editar"
                            >
                              <FaEdit size={12} />
                            </button>
                          </Link>
                        )}
                        <Link href={`/raat/${accident.id}`}>
                          <button
                            className="secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Ver y descargar PDF"
                          >
                            <FaFilePdf size={12} />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

