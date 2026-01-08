'use client'

import { useState, useEffect, useRef } from 'react'
import { FaBell, FaTimes, FaFileContract, FaExclamationCircle } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import {
  getContractNotifications,
  getNotificationCounts,
  groupNotificationsByStatus,
  type ContractNotification
} from '@/lib/services/contractNotifications'

export default function NotificationsDropdown() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<ContractNotification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])
  
  // Cargar notificaciones cuando se abre el dropdown o cambia la empresa
  useEffect(() => {
    if (isOpen && companyId) {
      loadNotifications()
    }
  }, [isOpen, companyId])
  
  // Cargar notificaciones en background cada 5 minutos
  useEffect(() => {
    if (companyId) {
      loadNotifications()
      const interval = setInterval(loadNotifications, 5 * 60 * 1000) // 5 minutos
      return () => clearInterval(interval)
    }
  }, [companyId])
  
  const loadNotifications = async () => {
    if (!companyId) return
    
    setLoading(true)
    try {
      const notifs = await getContractNotifications(companyId, supabase)
      setNotifications(notifs)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const counts = getNotificationCounts(notifications)
  const grouped = groupNotificationsByStatus(notifications)
  
  const handleNotificationClick = (contractId: string) => {
    setIsOpen(false)
    router.push(`/contracts/${contractId}`)
  }
  
  const handleViewAll = () => {
    setIsOpen(false)
    router.push('/contracts')
  }
  
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notification-bell-button"
        style={{
          position: 'relative',
          background: counts.total > 0 
            ? counts.critical > 0 
              ? 'linear-gradient(135deg, #dc2626, #991b1b)'  // Rojo fuerte si hay críticas
              : 'linear-gradient(135deg, #f59e0b, #d97706)' // Naranja si hay otras
            : 'linear-gradient(135deg, #6366f1, #4f46e5)',  // Azul/índigo por defecto
          border: 'none',
          cursor: 'pointer',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff !important',
          fontSize: '20px',
          transition: 'all 0.3s ease',
          borderRadius: '10px',
          boxShadow: counts.total > 0
            ? counts.critical > 0
              ? '0 4px 15px rgba(220, 38, 38, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)'
              : '0 4px 15px rgba(245, 158, 11, 0.4)'
            : '0 2px 8px rgba(99, 102, 241, 0.3)',
          animation: counts.critical > 0 ? 'bell-shake 2s infinite' : 'none',
          minWidth: '44px',
          minHeight: '44px',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)'
          e.currentTarget.style.boxShadow = counts.total > 0
            ? counts.critical > 0
              ? '0 6px 20px rgba(220, 38, 38, 0.6), 0 0 30px rgba(239, 68, 68, 0.5)'
              : '0 6px 20px rgba(245, 158, 11, 0.5)'
            : '0 4px 12px rgba(99, 102, 241, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)'
          e.currentTarget.style.boxShadow = counts.total > 0
            ? counts.critical > 0
              ? '0 4px 15px rgba(220, 38, 38, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)'
              : '0 4px 15px rgba(245, 158, 11, 0.4)'
            : '0 2px 8px rgba(99, 102, 241, 0.3)'
        }}
        title={counts.total > 0 
          ? `${counts.total} notificación${counts.total > 1 ? 'es' : ''} de contratos`
          : 'Notificaciones de contratos'}
      >
        <FaBell style={{ 
          color: '#ffffff',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
        }} />
        
        {/* Badge de contador */}
        {counts.total > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: counts.critical > 0 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                : counts.high > 0 
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                  : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#ffffff',
              borderRadius: '50%',
              minWidth: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              padding: '4px',
              border: '3px solid #0f172a',
              boxShadow: counts.critical > 0
                ? '0 0 15px rgba(239, 68, 68, 0.9), 0 0 25px rgba(239, 68, 68, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4)'
                : counts.high > 0
                  ? '0 0 12px rgba(245, 158, 11, 0.7), 0 2px 8px rgba(0, 0, 0, 0.4)'
                  : '0 0 10px rgba(251, 191, 36, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)',
              animation: counts.critical > 0 ? 'pulse-glow 1.5s infinite' : 'none',
              zIndex: 10
            }}
          >
            {counts.total > 99 ? '99+' : counts.total}
          </span>
        )}
      </button>
      
      {/* Dropdown de notificaciones */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '400px',
            maxHeight: '600px',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f9fafb'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                Notificaciones de Contratos
              </h3>
              {counts.total > 0 && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {counts.critical > 0 && (
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>
                      {counts.critical} crítica{counts.critical > 1 ? 's' : ''}
                    </span>
                  )}
                  {counts.critical > 0 && (counts.high > 0 || counts.medium > 0) && ', '}
                  {counts.high > 0 && (
                    <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                      {counts.high} urgente{counts.high > 1 ? 's' : ''}
                    </span>
                  )}
                  {counts.high > 0 && counts.medium > 0 && ', '}
                  {counts.medium > 0 && (
                    <span style={{ color: '#fbbf24' }}>
                      {counts.medium} próxima{counts.medium > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#6b7280',
                fontSize: '18px'
              }}
            >
              <FaTimes />
            </button>
          </div>
          
          {/* Lista de notificaciones */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '500px'
            }}
          >
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                Cargando notificaciones...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <FaBell style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }} />
                <p style={{ color: '#6b7280', margin: 0 }}>
                  No hay notificaciones
                </p>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
                  Todos los contratos están vigentes
                </p>
              </div>
            ) : (
              <>
                {/* Vencidos/Vence hoy */}
                {grouped.expired.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#fee2e2',
                        borderBottom: '1px solid #fecaca',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#991b1b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaExclamationCircle />
                      VENCIDOS / VENCEN HOY ({grouped.expired.length})
                    </div>
                    {grouped.expired.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </div>
                )}
                
                {/* Críticos (1-7 días) */}
                {grouped.expiringCritical.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#fef3c7',
                        borderBottom: '1px solid #fde68a',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaExclamationCircle />
                      CRÍTICOS (1-7 DÍAS) ({grouped.expiringCritical.length})
                    </div>
                    {grouped.expiringCritical.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </div>
                )}
                
                {/* Urgentes (8-15 días) */}
                {grouped.expiringUrgent.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#fef9c3',
                        borderBottom: '1px solid #fef08a',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#713f12',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaExclamationCircle />
                      URGENTES (8-15 DÍAS) ({grouped.expiringUrgent.length})
                    </div>
                    {grouped.expiringUrgent.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </div>
                )}
                
                {/* Próximos (16-30 días) */}
                {grouped.expiringSoon.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#fef9c3',
                        borderBottom: '1px solid #fef08a',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#854d0e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaBell />
                      PRÓXIMOS (16-30 DÍAS) ({grouped.expiringSoon.length})
                    </div>
                    {grouped.expiringSoon.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #e5e7eb',
                background: '#f9fafb',
                textAlign: 'center'
              }}
            >
              <button
                onClick={handleViewAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Ver todos los contratos →
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Estilos para las animaciones */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
        
        @keyframes bell-shake {
          0%, 50%, 100% {
            transform: rotate(0deg);
          }
          10%, 30% {
            transform: rotate(-10deg);
          }
          20%, 40% {
            transform: rotate(10deg);
          }
        }
      `}</style>
    </div>
  )
}

// Componente individual de notificación
function NotificationItem({
  notification,
  onClick
}: {
  notification: ContractNotification
  onClick: (contractId: string) => void
}) {
  return (
    <div
      onClick={() => onClick(notification.contract_id)}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f3f4f6',
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {/* Icono */}
      <div
        style={{
          fontSize: '24px',
          flexShrink: 0
        }}
      >
        {notification.icon}
      </div>
      
      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <FaFileContract style={{ fontSize: '12px', color: '#6b7280' }} />
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
            {notification.contract_number}
          </span>
        </div>
        <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
          {notification.employee_name}
        </p>
        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280' }}>
          {notification.employee_rut}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: '600',
            color: notification.color
          }}
        >
          {notification.message}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af' }}>
          Fecha término: {new Date(notification.end_date).toLocaleDateString('es-CL')}
        </p>
      </div>
    </div>
  )
}
