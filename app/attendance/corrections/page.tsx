'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  type AttendanceCorrection,
  type CorrectionStatus,
} from '@/lib/utils/attendanceTypes'
import { FaCheck, FaTimes, FaFilter } from 'react-icons/fa'

const CORRECTION_STATUS_LABELS: Record<CorrectionStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

const CORRECTION_STATUS_COLORS: Record<CorrectionStatus, { bg: string; color: string }> = {
  pending: { bg: '#f59e0b20', color: '#f59e0b' },
  approved: { bg: '#10b98120', color: '#10b981' },
  rejected: { bg: '#ef444420', color: '#ef4444' },
}

export default function CorrectionsPage() {
  const { companyId } = useCurrentCompany()
  const [corrections, setCorrections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CorrectionStatus | 'all'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)

  const loadCorrections = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      let query = supabase
        .from('attendance_corrections')
        .select(`*, employees (id, full_name, rut, position)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (error) throw error
      setCorrections(data || [])
    } catch (err) {
      console.error('Error loading corrections:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, filter])

  useEffect(() => {
    loadCorrections()
  }, [loadCorrections])

  const handleReview = async (correctionId: string, action: 'approve' | 'reject') => {
    setProcessing(correctionId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      const { data: correction, error: corrError } = await supabase
        .from('attendance_corrections')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', correctionId)
        .select()
        .single()

      if (corrError) throw corrError

      if (action === 'approve') {
        const { data: record } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('employee_id', correction.employee_id)
          .eq('date', correction.record_date)
          .single()

        if (record) {
          const updateData: Record<string, any> = { correction_requested: false }
          if (correction.requested_clock_in) updateData.clock_in = correction.requested_clock_in
          if (correction.requested_clock_out) updateData.clock_out = correction.requested_clock_out

          if (correction.requested_clock_in && correction.requested_clock_out) {
            const [inH, inM] = correction.requested_clock_in.split(':').map(Number)
            const [outH, outM] = correction.requested_clock_out.split(':').map(Number)
            const diff = (outH * 60 + outM) - (inH * 60 + inM) - 60
            updateData.hours_worked = Math.max(0, Math.round(diff * 100 / 60) / 100)
          }

          await supabase
            .from('attendance_records')
            .update(updateData)
            .eq('id', record.id)
        }
      }

      await loadCorrections()
    } catch (err: any) {
      alert('Error al procesar corrección: ' + (err.message || 'Error desconocido'))
    } finally {
      setProcessing(null)
    }
  }

  const pendingCount = corrections.filter(c => c.status === 'pending').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Correcciones de Asistencia</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Revisa y aprueba solicitudes de corrección de horario
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <FaFilter style={{ color: '#6b7280' }} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CorrectionStatus | 'all')}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
          </select>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="card" style={{ marginBottom: '16px', background: '#fef3c7', border: '1px solid #f59e0b' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
            Tienes <strong>{pendingCount}</strong> corrección(es) pendiente(s) de revisión.
          </p>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '24px' }}>Cargando correcciones...</p>
        ) : corrections.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
            No hay correcciones {filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : filter === 'rejected' ? 'rechazadas' : ''}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {corrections.map((correction) => {
              const statusStyle = CORRECTION_STATUS_COLORS[correction.status as CorrectionStatus] || CORRECTION_STATUS_COLORS.pending
              const statusLabel = CORRECTION_STATUS_LABELS[correction.status as CorrectionStatus] || correction.status
              const isPending = correction.status === 'pending'

              return (
                <div key={correction.id} style={{
                  padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb',
                  background: isPending ? '#fffbeb' : '#f9fafb',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '15px' }}>{correction.employees?.full_name || 'N/A'}</strong>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{correction.employees?.rut}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
                          background: statusStyle.bg, color: statusStyle.color,
                        }}>
                          {statusLabel}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '13px' }}>
                        Fecha: <strong>{correction.record_date}</strong> · Solicitado: {correction.created_at ? new Date(correction.created_at).toLocaleDateString('es-CL') : 'N/A'}
                      </p>
                    </div>
                    {isPending && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleReview(correction.id, 'approve')}
                          disabled={processing === correction.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px',
                            background: '#10b981', color: 'white', border: 'none', borderRadius: '6px',
                            cursor: processing === correction.id ? 'not-allowed' : 'pointer', fontSize: '13px',
                          }}
                        >
                          <FaCheck size={12} /> Aprobar
                        </button>
                        <button
                          onClick={() => handleReview(correction.id, 'reject')}
                          disabled={processing === correction.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px',
                            background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px',
                            cursor: processing === correction.id ? 'not-allowed' : 'pointer', fontSize: '13px',
                          }}
                        >
                          <FaTimes size={12} /> Rechazar
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '6px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#6b7280' }}>Horario Actual</p>
                      <p style={{ margin: 0, fontWeight: '600' }}>
                        {correction.current_clock_in || '--:--'} → {correction.current_clock_out || '--:--'}
                      </p>
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '6px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#065f46' }}>Horario Solicitado</p>
                      <p style={{ margin: 0, fontWeight: '600', color: '#065f46' }}>
                        {correction.requested_clock_in || '--:--'} → {correction.requested_clock_out || '--:--'}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      <span style={{ color: '#6b7280' }}>Motivo:</span> {correction.reason || 'Sin motivo especificado'}
                    </p>
                    {correction.review_notes && (
                      <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        <span style={{ color: '#6b7280' }}>Notas de revisión:</span> {correction.review_notes}
                      </p>
                    )}
                    {correction.reviewed_at && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                        Revisado: {new Date(correction.reviewed_at).toLocaleString('es-CL')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}