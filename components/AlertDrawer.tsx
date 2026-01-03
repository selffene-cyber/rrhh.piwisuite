'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FaTimes, FaExclamationTriangle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa'
import AlertListItem from './AlertListItem'

interface Alert {
  id: string
  severity: 'critical' | 'high' | 'info'
  type: string
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  due_date: string | null
  metadata: any
  created_at: string
}

interface AlertDrawerProps {
  companyId: string | null
  isOpen: boolean
  onClose: () => void
  onAlertChange: () => void
}

export default function AlertDrawer({ companyId, isOpen, onClose, onAlertChange }: AlertDrawerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'critical' | 'high' | 'info'>('critical')
  const [runningEngine, setRunningEngine] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadAlerts()
    }
  }, [isOpen, companyId])

  const loadAlerts = async () => {
    setLoading(true)
    
    if (!companyId) {
      console.warn('No hay company_id disponible')
      setAlerts([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'open')
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar alertas:', error)
      setAlerts([])
    } else {
      setAlerts(data || [])
    }
    setLoading(false)
  }

  const handleResolve = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'resolved' })
      .eq('id', alertId)

    if (!error) {
      loadAlerts()
      onAlertChange()
    }
  }

  const handleDismiss = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'dismissed' })
      .eq('id', alertId)

    if (!error) {
      loadAlerts()
      onAlertChange()
    }
  }

  const handleRunEngine = async () => {
    if (!companyId) {
      alert('No se pudo identificar la empresa')
      return
    }

    setRunningEngine(true)
    try {
      const response = await fetch('/api/alerts/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_id: companyId }),
      })

      const result = await response.json()

      if (response.ok) {
        // No mostrar alerta emergente, solo actualizar la lista silenciosamente
        loadAlerts()
        onAlertChange()
      } else {
        // Solo mostrar error si es crítico
        console.error('Error ejecutando Alert Engine:', result.error)
      }
    } catch (error: any) {
      console.error('Error ejecutando Alert Engine:', error)
      alert(`Error: ${error.message || 'Error al ejecutar Alert Engine'}`)
    } finally {
      setRunningEngine(false)
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (activeTab === 'critical') return a.severity === 'critical'
    if (activeTab === 'high') return a.severity === 'high'
    return a.severity === 'info'
  })

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const highCount = alerts.filter(a => a.severity === 'high').length
  const infoCount = alerts.filter(a => a.severity === 'info').length

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1001
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '90vw',
          background: 'white',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1002,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f9fafb'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Sugerencias y Alertas
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb'
          }}
        >
          <button
            onClick={() => setActiveTab('critical')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'critical' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'critical' ? '2px solid #ef4444' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'critical' ? '600' : '400',
              color: activeTab === 'critical' ? '#111827' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <FaExclamationTriangle color="#ef4444" />
            Críticas
            {criticalCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}
              >
                {criticalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('high')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'high' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'high' ? '2px solid #f59e0b' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'high' ? '600' : '400',
              color: activeTab === 'high' ? '#111827' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <FaExclamationCircle color="#f59e0b" />
            Importantes
            {highCount > 0 && (
              <span
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}
              >
                {highCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'info' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'info' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'info' ? '600' : '400',
              color: activeTab === 'info' ? '#111827' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <FaInfoCircle color="#3b82f6" />
            Info
            {infoCount > 0 && (
              <span
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}
              >
                {infoCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px'
          }}
        >
          {!companyId ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ marginBottom: '12px' }}>No se pudo identificar la empresa.</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
                Asegúrate de tener empleados activos o una empresa configurada.
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                Ve a Configuración para crear una empresa.
              </p>
            </div>
          ) : loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              Cargando...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {alerts.length === 0 ? (
                <>
                  <p style={{ marginBottom: '12px' }}>No hay alertas disponibles</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
                    Ejecuta el Alert Engine para generar alertas automáticamente basadas en:
                  </p>
                  <ul style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'left', display: 'inline-block', marginBottom: '16px', paddingLeft: '20px' }}>
                    <li>Contratos próximos a vencer</li>
                    <li>Saldo alto de vacaciones</li>
                    <li>Parámetros legales faltantes</li>
                    <li>Licencias médicas activas</li>
                  </ul>
                </>
              ) : (
                <p>No hay alertas {activeTab === 'critical' ? 'críticas' : activeTab === 'high' ? 'importantes' : 'informativas'}</p>
              )}
              <button
                onClick={handleRunEngine}
                disabled={runningEngine || !companyId}
                style={{
                  padding: '10px 20px',
                  background: runningEngine ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  cursor: runningEngine || !companyId ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '0',
                  opacity: runningEngine || !companyId ? 0.6 : 1,
                  marginTop: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!runningEngine && companyId) {
                    e.currentTarget.style.background = '#1d4ed8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!runningEngine && companyId) {
                    e.currentTarget.style.background = '#2563eb'
                  }
                }}
              >
                {runningEngine ? 'Ejecutando...' : 'Ejecutar Alert Engine'}
              </button>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertListItem
                key={alert.id}
                alert={alert}
                onResolve={() => handleResolve(alert.id)}
                onDismiss={() => handleDismiss(alert.id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
