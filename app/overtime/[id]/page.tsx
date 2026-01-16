'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaEdit, FaTrash, FaFilePdf, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'

export default function OvertimePactDetailPage() {
  const router = useRouter()
  const params = useParams()
  const pactId = params.id as string
  const [pact, setPact] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    loadPact()
  }, [pactId])

  const loadPact = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('overtime_pacts')
        .select(`
          *,
          employees (full_name, rut, position, hire_date),
          companies (name, rut, address, employer_name)
        `)
        .eq('id', pactId)
        .single()

      if (error) throw error
      setPact(data)
    } catch (error: any) {
      console.error('Error al cargar pacto:', error)
      alert('Error al cargar pacto: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!confirm('¿Desea activar este pacto? Una vez activado, comenzará a regir desde la fecha de inicio.')) {
      return
    }

    setActivating(true)
    try {
      const { error } = await supabase
        .from('overtime_pacts')
        .update({ status: 'active' })
        .eq('id', pactId)

      if (error) throw error
      alert('Pacto activado correctamente')
      loadPact()
    } catch (error: any) {
      alert('Error al activar pacto: ' + error.message)
    } finally {
      setActivating(false)
    }
  }

  const handleDelete = async () => {
    if (pact?.status !== 'draft' && pact?.status !== 'void') {
      alert('Solo se pueden eliminar pactos en estado "Borrador" o "Anulado"')
      return
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este pacto?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('overtime_pacts')
        .delete()
        .eq('id', pactId)

      if (error) throw error
      alert('Pacto eliminado correctamente')
      router.push('/overtime')
    } catch (error: any) {
      alert('Error al eliminar pacto: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Detalle del Pacto</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!pact) {
    return (
      <div>
        <h1>Detalle del Pacto</h1>
        <div className="card">
          <p>Pacto no encontrado</p>
        </div>
      </div>
    )
  }

  const startDate = new Date(pact.start_date)
  const endDate = new Date(pact.end_date)
  const today = new Date()
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const isExpiring = endDate >= today && endDate <= new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)
  const isExpired = endDate < today

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h1>Detalle del Pacto de Horas Extra</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/overtime/${pactId}/pdf`}>
            <button className="secondary">
              <FaFilePdf style={{ marginRight: '8px' }} />
              Ver PDF
            </button>
          </Link>
          {pact.status === 'draft' && (
            <button onClick={handleActivate} disabled={activating}>
              <FaCheckCircle style={{ marginRight: '8px' }} />
              {activating ? 'Activando...' : 'Activar Pacto'}
            </button>
          )}
          {(pact.status === 'draft' || pact.status === 'void') && (
            <button onClick={handleDelete} className="danger">
              <FaTrash style={{ marginRight: '8px' }} />
              Eliminar
            </button>
          )}
          <button onClick={() => router.back()} className="secondary">
            Volver
          </button>
        </div>
      </div>

      {/* Alerta si está por vencer o vencido */}
      {pact.status === 'active' && (
        <div className="card" style={{ 
          marginBottom: '24px',
          background: isExpired ? '#fee2e2' : isExpiring ? '#fef3c7' : '#dbeafe',
          border: `1px solid ${isExpired ? '#fca5a5' : isExpiring ? '#fcd34d' : '#93c5fd'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaExclamationTriangle style={{ color: isExpired ? '#dc2626' : '#f59e0b', fontSize: '24px' }} />
            <div>
              <strong style={{ color: isExpired ? '#991b1b' : '#92400e' }}>
                {isExpired ? '⚠️ Pacto Vencido' : '⚠️ Pacto Por Vencer'}
              </strong>
              <p style={{ margin: '4px 0 0 0', color: isExpired ? '#991b1b' : '#92400e' }}>
                {isExpired 
                  ? `Este pacto venció el ${formatDate(pact.end_date, 'dd/MM/yyyy')}. Debe renovarse o crear uno nuevo para continuar registrando horas extra.`
                  : `Este pacto vence el ${formatDate(pact.end_date, 'dd/MM/yyyy')}. Considere renovarlo antes de que expire.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Información del Pacto</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Estado</label>
            <div>
              <span className={`badge ${pact.status}`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                {pact.status === 'draft' ? 'Borrador' : 
                 pact.status === 'active' ? 'Activo' : 
                 pact.status === 'expired' ? 'Vencido' : 
                 pact.status === 'renewed' ? 'Renovado' : 'Anulado'}
              </span>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Trabajador</label>
            <p style={{ fontWeight: '600', margin: 0 }}>{pact.employees?.full_name || '-'}</p>
            <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>RUT: {pact.employees?.rut || '-'}</p>
            <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Cargo: {pact.employees?.position || '-'}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha de Inicio</label>
            <p>{formatDate(pact.start_date, 'dd/MM/yyyy')}</p>
          </div>
          <div className="form-group">
            <label>Fecha de Término</label>
            <p>{formatDate(pact.end_date, 'dd/MM/yyyy')}</p>
          </div>
          <div className="form-group">
            <label>Duración</label>
            <p>{daysDiff} días</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Máximo Horas Extra por Día</label>
            <p>{pact.max_daily_hours} {pact.max_daily_hours === 1 ? 'hora' : 'horas'}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ width: '100%' }}>
            <label>Motivo del Pacto</label>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{pact.reason}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha de Creación</label>
            <p>{formatDate(pact.created_at, 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

