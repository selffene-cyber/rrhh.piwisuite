'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatMonthYear, formatDate } from '@/lib/utils/date'
import { FaArrowLeft, FaRedo, FaFilePdf, FaCheck, FaTimes } from 'react-icons/fa'
import { PayrollReliquidationWithDetails, RELIQUIDATION_REASON_CATEGORIES } from '@/types'

export default function ReliquidationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [reliquidation, setReliquidation] = useState<PayrollReliquidationWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadReliquidation()
  }, [params.id])

  const loadReliquidation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payroll/reliquidations/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar reliquidación')
      }

      const data = await response.json()
      setReliquidation(data)
    } catch (error: any) {
      console.error('Error al cargar reliquidación:', error)
      alert('Error al cargar reliquidación: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: 'approved' | 'issued' | 'paid') => {
    if (!reliquidation) return

    const statusLabels: Record<string, string> = {
      approved: 'aprobar',
      issued: 'emitir',
      paid: 'marcar como pagada'
    }

    if (!confirm(`¿Estás seguro de que deseas ${statusLabels[newStatus]} esta reliquidación?`)) {
      return
    }

    try {
      setUpdating(true)
      const response = await fetch(`/api/payroll/reliquidations/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar estado')
      }

      const updated = await response.json()
      setReliquidation(updated)
      alert(`Reliquidación ${statusLabels[newStatus]} correctamente`)
    } catch (error: any) {
      console.error('Error al actualizar estado:', error)
      alert('Error al actualizar estado: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      approved: 'Aprobada',
      issued: 'Emitida',
      paid: 'Pagada'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      approved: '#f59e0b',
      issued: '#3b82f6',
      paid: '#059669'
    }
    return colors[status] || '#6b7280'
  }

  const getTypeLabel = (type: string) => {
    return type === 'rectificatoria' ? 'Rectificatoria' : 'Complementaria'
  }

  if (loading) {
    return (
      <div>
        <div className="card">
          <p>Cargando reliquidación...</p>
        </div>
      </div>
    )
  }

  if (!reliquidation) {
    return (
      <div>
        <div className="card">
          <p>Reliquidación no encontrada</p>
        </div>
      </div>
    )
  }

  const delta = reliquidation.payroll_reliquidation_deltas
  const items = reliquidation.payroll_reliquidation_items || []

  // Función helper para formatear números de forma segura
  const formatNumber = (value: number | null | undefined, defaultValue: number = 0): string => {
    return (value ?? defaultValue).toLocaleString('es-CL')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/payroll/reliquidations">
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaArrowLeft size={14} />
              Volver
            </button>
          </Link>
          <h1>Reliquidación de Remuneraciones</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {reliquidation.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('approved')}
              disabled={updating}
              style={{
                background: '#f59e0b',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaCheck size={14} />
              Aprobar
            </button>
          )}
          {reliquidation.status === 'approved' && (
            <button
              onClick={() => handleStatusChange('issued')}
              disabled={updating}
              style={{
                background: '#3b82f6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaRedo size={14} />
              Emitir
            </button>
          )}
          {reliquidation.status === 'issued' && (
            <button
              onClick={() => handleStatusChange('paid')}
              disabled={updating}
              style={{
                background: '#059669',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaCheck size={14} />
              Marcar como Pagada
            </button>
          )}
          <Link href={`/payroll/reliquidations/${reliquidation.id}/pdf`} target="_blank">
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaFilePdf size={14} />
              Ver PDF
            </button>
          </Link>
        </div>
      </div>

      {/* Información general */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Información General</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Trabajador</label>
            <p>{reliquidation.employees?.full_name} - {reliquidation.employees?.rut}</p>
          </div>
          <div className="form-group">
            <label>Período</label>
            <p>
              {reliquidation.payroll_periods ? 
                formatMonthYear(reliquidation.payroll_periods.year, reliquidation.payroll_periods.month) : 
                '-'
              }
            </p>
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <p>{getTypeLabel(reliquidation.type)}</p>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <p>
              <span 
                className="badge" 
                style={{
                  background: getStatusColor(reliquidation.status),
                  color: 'white'
                }}
              >
                {getStatusLabel(reliquidation.status)}
              </span>
            </p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Liquidación Original</label>
            <p>
              {reliquidation.payroll_slips ? (
                <Link href={`/payroll/${reliquidation.payroll_slips.id}`} style={{ color: '#3b82f6' }}>
                  Ver Liquidación Original
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div className="form-group">
            <label>Motivo</label>
            <p>{RELIQUIDATION_REASON_CATEGORIES[reliquidation.reason_category as keyof typeof RELIQUIDATION_REASON_CATEGORIES]}</p>
          </div>
        </div>
        {reliquidation.reason_text && (
          <div className="form-group">
            <label>Descripción del Motivo</label>
            <p style={{ whiteSpace: 'pre-wrap' }}>{reliquidation.reason_text}</p>
          </div>
        )}
      </div>

      {/* Comparación Antes/Después */}
      {delta && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Comparación: Antes / Después</h2>
          
          <div style={{ marginBottom: '24px' }}>
            <h3>Resumen de Diferencias</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Diferencia Haberes</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>
                  +${formatNumber(delta.diff_total_earnings)}
                </div>
              </div>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Diferencia Descuentos</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
                  ${formatNumber(delta.diff_total_deductions)}
                </div>
              </div>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Diferencia Líquido</div>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  color: (delta.diff_net_pay ?? 0) >= 0 ? '#059669' : '#dc2626'
                }}>
                  {(delta.diff_net_pay ?? 0) >= 0 ? '+' : ''}${formatNumber(delta.diff_net_pay)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla comparativa detallada */}
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Monto Original</th>
                  <th>Monto Corregido</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.description}</td>
                    <td>${formatNumber(item.original_amount)}</td>
                    <td>${formatNumber(item.corrected_amount)}</td>
                    <td style={{ 
                      color: (item.difference ?? 0) >= 0 ? '#059669' : '#dc2626',
                      fontWeight: '600'
                    }}>
                      {(item.difference ?? 0) >= 0 ? '+' : ''}${formatNumber(item.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabla completa de valores */}
          <h3 style={{ marginBottom: '16px' }}>Valores Completos</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Original</th>
                  <th>Corregido</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Días Trabajados</td>
                  <td>{delta.original_days_worked ?? '-'}</td>
                  <td>{delta.corrected_days_worked ?? '-'}</td>
                  <td>{delta.diff_days_worked ?? 0}</td>
                </tr>
                <tr>
                  <td>Sueldo Base</td>
                  <td>${formatNumber(delta.original_base_salary)}</td>
                  <td>${formatNumber(delta.corrected_base_salary)}</td>
                  <td style={{ color: (delta.diff_base_salary ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {(delta.diff_base_salary ?? 0) >= 0 ? '+' : ''}${formatNumber(delta.diff_base_salary)}
                  </td>
                </tr>
                <tr>
                  <td>Total Haberes</td>
                  <td>${formatNumber(delta.original_total_earnings)}</td>
                  <td>${formatNumber(delta.corrected_total_earnings)}</td>
                  <td style={{ color: (delta.diff_total_earnings ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {(delta.diff_total_earnings ?? 0) >= 0 ? '+' : ''}${formatNumber(delta.diff_total_earnings)}
                  </td>
                </tr>
                <tr>
                  <td>Total Descuentos</td>
                  <td>${formatNumber(delta.original_total_deductions)}</td>
                  <td>${formatNumber(delta.corrected_total_deductions)}</td>
                  <td style={{ color: (delta.diff_total_deductions ?? 0) >= 0 ? '#dc2626' : '#059669' }}>
                    {(delta.diff_total_deductions ?? 0) >= 0 ? '+' : ''}${formatNumber(delta.diff_total_deductions)}
                  </td>
                </tr>
                <tr style={{ fontWeight: '700', background: '#f9fafb' }}>
                  <td>Líquido a Pagar</td>
                  <td>${formatNumber(delta.original_net_pay)}</td>
                  <td>${formatNumber(delta.corrected_net_pay)}</td>
                  <td style={{ 
                    color: (delta.diff_net_pay ?? 0) >= 0 ? '#059669' : '#dc2626',
                    fontSize: '16px'
                  }}>
                    {(delta.diff_net_pay ?? 0) >= 0 ? '+' : ''}${formatNumber(delta.diff_net_pay)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auditoría */}
      <div className="card">
        <h2>Auditoría</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Creada por</label>
            <p>{reliquidation.created_at ? formatDate(reliquidation.created_at) : '-'}</p>
          </div>
          {reliquidation.issued_at && (
            <div className="form-group">
              <label>Emitida</label>
              <p>{formatDate(reliquidation.issued_at)}</p>
            </div>
          )}
          {reliquidation.paid_at && (
            <div className="form-group">
              <label>Pagada</label>
              <p>{formatDate(reliquidation.paid_at)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
