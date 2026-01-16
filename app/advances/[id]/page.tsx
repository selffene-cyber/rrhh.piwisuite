'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaFilePdf, FaEdit, FaCheck, FaTimes } from 'react-icons/fa'

export default function AdvanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [advance, setAdvance] = useState<any>(null)

  useEffect(() => {
    loadAdvance()
  }, [params.id])

  const loadAdvance = async () => {
    try {
      const { data, error } = await supabase
        .from('advances')
        .select(`
          *,
          employees (*),
          payroll_slips (id, payroll_periods (year, month))
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setAdvance(data)
    } catch (error: any) {
      console.error('Error al cargar anticipo:', error)
      alert('Error al cargar anticipo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'emitido') {
        updateData.issued_at = new Date().toISOString()
      } else if (newStatus === 'firmado') {
        updateData.signed_at = new Date().toISOString()
      } else if (newStatus === 'pagado') {
        updateData.paid_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('advances')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      loadAdvance()
    } catch (error: any) {
      alert('Error al actualizar estado: ' + error.message)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  if (!advance) {
    return <div>Anticipo no encontrado</div>
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      borrador: { label: 'Borrador', color: '#6b7280' },
      emitido: { label: 'Emitido', color: '#3b82f6' },
      firmado: { label: 'Firmado', color: '#8b5cf6' },
      pagado: { label: 'Pagado', color: '#10b981' },
      descontado: { label: 'Descontado', color: '#059669' },
    }
    const badge = badges[status] || { label: status, color: '#6b7280' }
    return (
      <span style={{
        padding: '6px 16px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '600',
        background: badge.color + '20',
        color: badge.color,
        border: `1px solid ${badge.color}40`
      }}>
        {badge.label}
      </span>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Detalle del Anticipo</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/advances/${advance.id}/pdf`} target="_blank">
            <button>
              <FaFilePdf size={16} /> Ver PDF
            </button>
          </Link>
          {(advance.status === 'borrador' || advance.status === 'emitido') && (
            <Link href={`/advances/${advance.id}/edit`}>
              <button className="secondary">
                <FaEdit size={16} /> Editar
              </button>
            </Link>
          )}
          <Link href="/advances">
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Datos del Anticipo</h2>
        <div className="form-row">
          <div className="form-group">
            <label>ID</label>
            <p><code style={{ fontSize: '13px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
              {advance.advance_number || advance.id.substring(0, 8).toUpperCase()}
            </code></p>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <p>{getStatusBadge(advance.status)}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Trabajador</label>
            <p>
              <strong>{advance.employees?.full_name}</strong>
              <br />
              <small style={{ color: '#6b7280' }}>RUT: {advance.employees?.rut}</small>
            </p>
          </div>
          <div className="form-group">
            <label>Monto</label>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
              ${Number(advance.amount).toLocaleString('es-CL')}
            </p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha del Anticipo</label>
            <p>{formatDate(advance.advance_date)}</p>
          </div>
          <div className="form-group">
            <label>Período de Descuento</label>
            <p>{advance.period}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Medio de Pago</label>
            <p>{advance.payment_method === 'transferencia' ? 'Transferencia' : 'Efectivo'}</p>
          </div>
          <div className="form-group">
            <label>Motivo / Glosa</label>
            <p>{advance.reason || '-'}</p>
          </div>
        </div>
        {advance.payroll_slip_id && (
          <div className="form-row">
            <div className="form-group">
              <label>Liquidación donde se Descontó</label>
              <p>
                <Link href={`/payroll/${advance.payroll_slip_id}`} style={{ color: '#2563eb' }}>
                  Ver Liquidación
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Acciones según estado */}
      {advance.status === 'borrador' && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3>Acciones</h3>
          <button onClick={() => handleStatusChange('emitido')} style={{ background: '#3b82f6', color: 'white' }}>
            <FaCheck size={16} /> Emitir Anticipo
          </button>
        </div>
      )}

      {advance.status === 'emitido' && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3>Acciones</h3>
          <button onClick={() => handleStatusChange('firmado')} style={{ background: '#8b5cf6', color: 'white' }}>
            <FaCheck size={16} /> Marcar como Firmado
          </button>
        </div>
      )}

      {advance.status === 'firmado' && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3>Acciones</h3>
          <button onClick={() => handleStatusChange('pagado')} style={{ background: '#10b981', color: 'white' }}>
            <FaCheck size={16} /> Marcar como Pagado
          </button>
        </div>
      )}
    </div>
  )
}

