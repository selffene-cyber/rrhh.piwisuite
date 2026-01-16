'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FaLightbulb } from 'react-icons/fa'
import AlertDrawer from './AlertDrawer'

interface AlertCount {
  critical: number
  high: number
  info: number
  total: number
}

export default function AlertFab() {
  const [isOpen, setIsOpen] = useState(false)
  const [alertCount, setAlertCount] = useState<AlertCount>({ critical: 0, high: 0, info: 0, total: 0 })
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    loadCompanyId()
  }, [])

  useEffect(() => {
    if (companyId) {
      loadAlertCount()
      
      // Ejecutar Alert Engine automáticamente al cargar (solo una vez)
      runAlertEngineOnce()
      
      // Suscribirse a cambios en alertas
      const channel = supabase
        .channel(`alerts_changes_${companyId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'alerts',
            filter: `company_id=eq.${companyId}`
          },
          () => {
            loadAlertCount()
          }
        )
        .subscribe()

      // Ejecutar Alert Engine periódicamente (cada 30 minutos)
      const interval = setInterval(() => {
        runAlertEngineOnce()
      }, 30 * 60 * 1000) // 30 minutos

      return () => {
        supabase.removeChannel(channel)
        clearInterval(interval)
      }
    }
  }, [companyId])

  const runAlertEngineOnce = async () => {
    if (!companyId) return
    
    try {
      // Ejecutar silenciosamente (sin mostrar alertas)
      await fetch('/api/alerts/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_id: companyId }),
      })
      
      // Recargar contador después de ejecutar
      setTimeout(() => {
        loadAlertCount()
      }, 1000)
    } catch (error) {
      // Silenciar errores en ejecución automática
      console.log('Alert Engine ejecutado automáticamente')
    }
  }

  const loadCompanyId = async () => {
    try {
      // Obtener la primera empresa directamente (como en settings)
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single()

      if (companyError) {
        // Si no hay empresa, intentar obtener company_id del primer empleado activo
        const { data: employee } = await supabase
          .from('employees')
          .select('company_id')
          .eq('status', 'active')
          .not('company_id', 'is', null)
          .limit(1)
          .maybeSingle()

        if (employee?.company_id) {
          setCompanyId(employee.company_id)
        } else {
          console.warn('No se pudo obtener company_id. Asegúrate de tener una empresa configurada.')
        }
      } else if (company?.id) {
        setCompanyId(company.id)
      }
    } catch (error) {
      console.error('Error al cargar company_id:', error)
    }
  }

  const loadAlertCount = async () => {
    if (!companyId) return

    const { data: alerts } = await supabase
      .from('alerts')
      .select('severity')
      .eq('company_id', companyId)
      .eq('status', 'open')

    if (alerts) {
      const counts = {
        critical: alerts.filter((a: any) => a.severity === 'critical').length,
        high: alerts.filter((a: any) => a.severity === 'high').length,
        info: alerts.filter((a: any) => a.severity === 'info').length,
        total: alerts.length
      }
      setAlertCount(counts)
    }
  }

  const hasAlerts = alertCount.total > 0

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          background: '#1f2937',
          border: '1px solid #374151',
          color: '#fbbf24',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: hasAlerts 
            ? '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(251, 191, 36, 0.2)' 
            : '0 2px 8px rgba(0, 0, 0, 0.2)',
          animation: hasAlerts ? 'bounce 2s infinite' : 'none',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#374151'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#1f2937'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <FaLightbulb size={24} />
        {hasAlerts && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #1f2937'
            }}
          >
            {alertCount.total > 99 ? '99+' : alertCount.total}
          </span>
        )}
      </button>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>

      {isOpen && (
        <AlertDrawer
          companyId={companyId}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onAlertChange={loadAlertCount}
        />
      )}
    </>
  )
}
