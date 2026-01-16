'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaDownload,
  FaExclamationTriangle,
  FaShieldAlt,
  FaTimesCircle,
} from 'react-icons/fa'

const STATUS_LABELS: Record<string, string> = {
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por Vencer',
  VENCIDO: 'Vencido',
  EN_RENOVACION: 'En Renovación',
  EXENTO: 'Exento',
}

const STATUS_COLORS: Record<string, string> = {
  VIGENTE: '#10b981',
  POR_VENCER: '#f59e0b',
  VENCIDO: '#ef4444',
  EN_RENOVACION: '#3b82f6',
  EXENTO: '#6b7280',
}

const TIPO_LABELS: Record<string, string> = {
  CERTIFICADO: 'Certificado',
  LICENCIA: 'Licencia',
  CURSO: 'Curso',
  EXAMEN: 'Examen',
  OTRO: 'Otro',
}

const CRITICIDAD_COLORS: Record<string, string> = {
  ALTA: '#ef4444',
  MEDIA: '#f59e0b',
  BAJA: '#10b981',
}

function calcDiasRestantes(fechaVencimiento: string | null | undefined) {
  if (!fechaVencimiento) return 0
  const v = new Date(fechaVencimiento)
  const hoy = new Date()
  const diff = v.getTime() - hoy.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function EmployeeCompliancePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, rut, company_id')
        .eq('id', params.id)
        .single()

      if (empError || !empData) {
        setEmployee(null)
        setRecords([])
        return
      }

      setEmployee(empData)

      const response = await fetch(
        `/api/compliance/worker?company_id=${empData.company_id}&employee_id=${params.id}`
      )
      const data = response.ok ? await response.json() : []

      setRecords(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error al cargar cumplimiento del trabajador:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const base = {
      total: records.length,
      vigentes: 0,
      porVencer: 0,
      vencidos: 0,
      enRenovacion: 0,
      criticos: 0,
    }

    for (const r of records) {
      const status = r.status
      if (status === 'VIGENTE') base.vigentes++
      if (status === 'POR_VENCER') base.porVencer++
      if (status === 'VENCIDO') base.vencidos++
      if (status === 'EN_RENOVACION') base.enRenovacion++

      const crit = r.compliance_items?.criticidad
      if ((status === 'VENCIDO' || status === 'POR_VENCER') && crit === 'ALTA') base.criticos++
    }

    return base
  }, [records])

  if (loading && !employee) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Cargando...</div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <Link href="/compliance" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            <FaArrowLeft /> Volver
          </Link>
        </div>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>Trabajador no encontrado</div>
          <div style={{ color: '#6b7280' }}>No pudimos cargar la información de este trabajador.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <FaShieldAlt size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Cumplimientos del Trabajador</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              {employee.full_name} ({employee.rut})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            href={`/employees/${params.id}`}
            style={{
              padding: '10px 14px',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <FaArrowLeft size={14} />
            Volver al trabajador
          </Link>
          <Link
            href="/compliance"
            style={{
              padding: '10px 14px',
              background: 'white',
              color: '#3b82f6',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <FaArrowLeft size={14} />
            Volver a Cumplimientos
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${STATUS_COLORS.VIGENTE}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaCheckCircle color={STATUS_COLORS.VIGENTE} />
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Vigentes
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{stats.vigentes}</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${STATUS_COLORS.POR_VENCER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaClock color={STATUS_COLORS.POR_VENCER} />
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Por Vencer
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{stats.porVencer}</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${STATUS_COLORS.VENCIDO}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaTimesCircle color={STATUS_COLORS.VENCIDO} />
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Vencidos
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{stats.vencidos}</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${STATUS_COLORS.EN_RENOVACION}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaClock color={STATUS_COLORS.EN_RENOVACION} />
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                En Renovación
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{stats.enRenovacion}</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${CRITICIDAD_COLORS.ALTA}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaExclamationTriangle color={CRITICIDAD_COLORS.ALTA} />
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Críticos (Alta)
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{stats.criticos}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '16px', fontWeight: 800 }}>Detalle</div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>{stats.total} registro(s)</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Ítem</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Criticidad</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Emisión</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Vencimiento</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Días</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '18px', textAlign: 'center', color: '#6b7280' }}>
                    No hay cumplimientos registrados para este trabajador.
                  </td>
                </tr>
              ) : (
                records.map((r: any) => {
                  const item = r.compliance_items || {}
                  const dias = calcDiasRestantes(r.fecha_vencimiento)
                  const status = r.status
                  const statusColor = STATUS_COLORS[status] || '#6b7280'
                  const critColor = CRITICIDAD_COLORS[item.criticidad] || '#6b7280'

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#111827' }}>{item.nombre || '-'}</td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>{TIPO_LABELS[item.tipo] || item.tipo || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: critColor + '20',
                            color: critColor,
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {item.criticidad || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#374151' }}>{r.fecha_emision ? formatDate(r.fecha_emision) : '-'}</td>
                      <td style={{ padding: '12px', color: '#374151' }}>
                        {r.fecha_vencimiento ? formatDate(r.fecha_vencimiento) : '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: dias < 0 ? '#fee2e2' : dias <= 30 ? '#fef3c7' : '#d1fae5',
                            color: dias < 0 ? '#991b1b' : dias <= 30 ? '#92400e' : '#065f46',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {dias < 0 ? `Hace ${Math.abs(dias)}` : dias}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '8px',
                            background: statusColor + '20',
                            color: statusColor,
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {r.evidencia_url ? (
                          <a
                            href={r.evidencia_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Descargar evidencia"
                            style={{ color: '#10b981' }}
                          >
                            <FaDownload size={16} />
                          </a>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}







