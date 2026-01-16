'use client'

import { useState, useEffect, useRef } from 'react'
import { FaBell, FaTimes, FaFileContract, FaExclamationCircle, FaUmbrellaBeach, FaShieldAlt, FaClock } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import {
  getContractNotifications,
  getNotificationCounts,
  groupNotificationsByStatus,
  type ContractNotification
} from '@/lib/services/contractNotifications'
import {
  getVacationNotifications,
  type VacationNotification
} from '@/lib/services/vacationNotifications'
import {
  getComplianceNotifications,
  type ComplianceNotification
} from '@/lib/services/complianceNotifications'
import {
  getOvertimeNotifications,
  type OvertimeNotification
} from '@/lib/services/overtimeNotifications'

// Tipo unificado de notificaciones
type UnifiedNotification = 
  | ({ type: 'contract' } & ContractNotification)
  | ({ type: 'vacation' } & VacationNotification)
  | ({ type: 'compliance' } & ComplianceNotification)
  | ({ type: 'overtime' } & OvertimeNotification)

export default function NotificationsDropdown() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([])
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
      // Cargar notificaciones de contratos, vacaciones, compliance y horas extras en paralelo
      const [contractNotifs, vacationNotifs, complianceNotifs, overtimeNotifs] = await Promise.all([
        getContractNotifications(companyId, supabase),
        getVacationNotifications(companyId, supabase),
        getComplianceNotifications(companyId, supabase),
        getOvertimeNotifications(companyId, supabase)
      ])
      
      // Combinar y marcar el tipo
      const allNotifications: UnifiedNotification[] = [
        ...contractNotifs.map(n => ({ ...n, type: 'contract' as const })),
        ...vacationNotifs.map(n => ({ ...n, type: 'vacation' as const })),
        ...complianceNotifs.map(n => ({ ...n, type: 'compliance' as const })),
        ...overtimeNotifs.map(n => ({ ...n, type: 'overtime' as const }))
      ]
      
      // Ordenar por prioridad (1 = crítico primero)
      allNotifications.sort((a, b) => {
        const priorityA = a.type === 'contract' 
          ? (a.status === 'expired' || a.status === 'expires_today' ? 1 
            : a.status === 'expiring_critical' ? 2 
            : a.status === 'expiring_urgent' ? 3 
            : 4)
          : a.priority
        const priorityB = b.type === 'contract' 
          ? (b.status === 'expired' || b.status === 'expires_today' ? 1 
            : b.status === 'expiring_critical' ? 2 
            : b.status === 'expiring_urgent' ? 3 
            : 4)
          : b.priority
        return priorityA - priorityB
      })
      
      setNotifications(allNotifications)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Calcular contadores para los cuatro tipos de notificaciones
  const contractNotifs = notifications.filter(n => n.type === 'contract') as (ContractNotification & { type: 'contract' })[]
  const vacationNotifs = notifications.filter(n => n.type === 'vacation') as (VacationNotification & { type: 'vacation' })[]
  const complianceNotifs = notifications.filter(n => n.type === 'compliance') as (ComplianceNotification & { type: 'compliance' })[]
  const overtimeNotifs = notifications.filter(n => n.type === 'overtime') as (OvertimeNotification & { type: 'overtime' })[]
  
  const contractCounts = getNotificationCounts(contractNotifs)
  const vacationCritical = vacationNotifs.filter(n => n.priority === 1).length
  const vacationHigh = vacationNotifs.filter(n => n.priority === 2).length
  const vacationMedium = vacationNotifs.filter(n => n.priority === 3).length
  const complianceCritical = complianceNotifs.filter(n => n.priority === 1).length
  const complianceHigh = complianceNotifs.filter(n => n.priority === 2).length
  const complianceMedium = complianceNotifs.filter(n => n.priority === 3).length
  const overtimeCritical = overtimeNotifs.filter(n => n.priority === 1).length
  const overtimeHigh = overtimeNotifs.filter(n => n.priority === 2).length
  const overtimeMedium = overtimeNotifs.filter(n => n.priority === 3).length
  
  const counts = {
    total: contractCounts.total + vacationNotifs.length + complianceNotifs.length + overtimeNotifs.length,
    critical: contractCounts.critical + vacationCritical + complianceCritical + overtimeCritical,
    high: contractCounts.high + vacationHigh + complianceHigh + overtimeHigh,
    medium: contractCounts.medium + vacationMedium + complianceMedium + overtimeMedium,
    low: contractCounts.low
  }
  
  const grouped = groupNotificationsByStatus(contractNotifs)
  
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
          ? `${counts.total} notificación${counts.total > 1 ? 'es' : ''} (${contractNotifs.length} contratos, ${vacationNotifs.length} vacaciones, ${complianceNotifs.length} compliance, ${overtimeNotifs.length} horas extras)`
          : 'Notificaciones de contratos, vacaciones, compliance y horas extras'}
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
                  Todos los contratos están vigentes y las vacaciones están controladas
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
                
                {/* Notificaciones de Vacaciones */}
                {vacationNotifs.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#dbeafe',
                        borderBottom: '1px solid #bfdbfe',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#1e3a8a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaUmbrellaBeach />
                      VACACIONES ({vacationNotifs.length})
                    </div>
                    {vacationNotifs
                      .sort((a, b) => a.priority - b.priority)
                      .map((notif) => (
                        <VacationNotificationItem
                          key={notif.id}
                          notification={notif}
                          onClick={(employeeId) => {
                            setIsOpen(false)
                            router.push(`/employees/${employeeId}/vacations`)
                          }}
                        />
                      ))}
                  </div>
                )}
                
                {/* Notificaciones de Compliance */}
                {complianceNotifs.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#fef3c7',
                        borderBottom: '1px solid #fde68a',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#78350f',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaShieldAlt />
                      COMPLIANCE ({complianceNotifs.length})
                    </div>
                    {complianceNotifs
                      .sort((a, b) => a.priority - b.priority)
                      .map((notif) => (
                        <ComplianceNotificationItem
                          key={notif.id}
                          notification={notif}
                          onClick={(employeeId) => {
                            setIsOpen(false)
                            router.push(`/employees/${employeeId}/compliance`)
                          }}
                        />
                      ))}
                  </div>
                )}
                
                {/* Notificaciones de Horas Extras */}
                {overtimeNotifs.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#e0e7ff',
                        borderBottom: '1px solid #c7d2fe',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#3730a3',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaClock />
                      PACTOS HORAS EXTRAS ({overtimeNotifs.length})
                    </div>
                    {overtimeNotifs
                      .sort((a, b) => a.priority - b.priority)
                      .map((notif) => (
                        <OvertimeNotificationItem
                          key={notif.id}
                          notification={notif}
                          onClick={(pactIdOrRoute) => {
                            setIsOpen(false)
                            // Si empieza con /, es una ruta completa
                            if (pactIdOrRoute.startsWith('/')) {
                              router.push(pactIdOrRoute)
                            } else {
                              router.push(`/overtime/${pactIdOrRoute}`)
                            }
                          }}
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

// Componente individual de notificación de vacaciones
function VacationNotificationItem({
  notification,
  onClick
}: {
  notification: VacationNotification
  onClick: (employeeId: string) => void
}) {
  // Determinar colores según prioridad
  const getPriorityColors = () => {
    switch (notification.priority) {
      case 1: // Crítico
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          iconColor: '#dc2626',
          textColor: '#991b1b'
        }
      case 2: // Urgente
        return {
          bg: '#fffbeb',
          border: '#fef3c7',
          iconColor: '#f59e0b',
          textColor: '#92400e'
        }
      case 3: // Moderado
        return {
          bg: '#f0f9ff',
          border: '#dbeafe',
          iconColor: '#3b82f6',
          textColor: '#1e40af'
        }
      default:
        return {
          bg: '#f9fafb',
          border: '#e5e7eb',
          iconColor: '#6b7280',
          textColor: '#374151'
        }
    }
  }
  
  const colors = getPriorityColors()
  
  return (
    <div
      onClick={() => onClick(notification.employee.id)}
      style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        background: colors.bg
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
    >
      {/* Icono */}
      <div
        style={{
          fontSize: '24px',
          flexShrink: 0,
          color: colors.iconColor
        }}
      >
        <FaUmbrellaBeach />
      </div>
      
      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: '600', 
          fontSize: '14px', 
          color: colors.textColor,
          marginBottom: '4px' 
        }}>
          {notification.employee.full_name}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: '#6b7280',
          marginBottom: '4px',
          lineHeight: '1.4'
        }}>
          {notification.message}
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '6px'
        }}>
          <span>👤 {notification.employee.rut}</span>
          <span>•</span>
          <span>📊 {notification.totalAvailable.toFixed(2)} días disponibles</span>
        </div>
        <div style={{ 
          fontSize: '10px', 
          color: '#9ca3af',
          fontStyle: 'italic',
          marginTop: '4px'
        }}>
          {notification.legalReference}
        </div>
      </div>
    </div>
  )
}

// Componente individual de notificación de compliance
function ComplianceNotificationItem({
  notification,
  onClick
}: {
  notification: ComplianceNotification
  onClick: (employeeId: string) => void
}) {
  // Determinar colores según prioridad y tipo de alerta
  const getPriorityColors = () => {
    switch (notification.alertType) {
      case 'expired':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          iconColor: '#dc2626',
          textColor: '#991b1b'
        }
      case 'expires_today':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          iconColor: '#ef4444',
          textColor: '#991b1b'
        }
      case 'expiring_critical':
        return {
          bg: '#fffbeb',
          border: '#fef3c7',
          iconColor: '#f59e0b',
          textColor: '#92400e'
        }
      case 'expiring_urgent':
        return {
          bg: '#fffbeb',
          border: '#fef3c7',
          iconColor: '#f59e0b',
          textColor: '#92400e'
        }
      default:
        return {
          bg: '#fefce8',
          border: '#fef9c3',
          iconColor: '#ca8a04',
          textColor: '#713f12'
        }
    }
  }
  
  const colors = getPriorityColors()
  
  // Badge de criticidad
  const getCriticalityBadge = () => {
    const badges = {
      'ALTA': { bg: '#fee2e2', color: '#991b1b', text: 'ALTA' },
      'MEDIA': { bg: '#fef3c7', color: '#92400e', text: 'MEDIA' },
      'BAJA': { bg: '#dcfce7', color: '#166534', text: 'BAJA' }
    }
    const badge = badges[notification.item.criticidad]
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: '700',
        backgroundColor: badge.bg,
        color: badge.color
      }}>
        {badge.text}
      </span>
    )
  }
  
  return (
    <div
      onClick={() => onClick(notification.employee.id)}
      style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        background: colors.bg
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
    >
      {/* Icono del tipo de ítem */}
      <div
        style={{
          fontSize: '24px',
          flexShrink: 0,
          color: colors.iconColor
        }}
      >
        {notification.icon}
      </div>
      
      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: '600', 
          fontSize: '14px', 
          color: colors.textColor,
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification.item.nombre}
          {getCriticalityBadge()}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: '#374151',
          marginBottom: '4px'
        }}>
          {notification.employee.full_name}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          marginBottom: '4px',
          lineHeight: '1.4'
        }}>
          {notification.message}
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '6px'
        }}>
          <span>👤 {notification.employee.rut}</span>
          <span>•</span>
          <span>📅 Vence: {new Date(notification.fecha_vencimiento).toLocaleDateString('es-CL')}</span>
          <span>•</span>
          <span style={{ 
            fontWeight: '600',
            color: notification.dias_restantes < 0 ? '#dc2626' : notification.dias_restantes <= 7 ? '#f59e0b' : '#059669'
          }}>
            {notification.dias_restantes < 0 
              ? `Vencido hace ${Math.abs(notification.dias_restantes)} días` 
              : `${notification.dias_restantes} días restantes`}
          </span>
        </div>
      </div>
    </div>
  )
}

// Componente individual de notificación de pactos de horas extras
function OvertimeNotificationItem({
  notification,
  onClick
}: {
  notification: OvertimeNotification
  onClick: (pactIdOrRoute: string) => void
}) {
  // Determinar colores según prioridad y tipo de alerta
  const getPriorityColors = () => {
    switch (notification.alertType) {
      case 'no_pact':
        return {
          bg: '#fffbeb',
          border: '#fef3c7',
          iconColor: '#f59e0b',
          textColor: '#92400e',
          badge: { bg: '#f59e0b', color: '#fff', text: '⚠️ SIN PACTO' }
        }
      case 'expired':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          iconColor: '#dc2626',
          textColor: '#991b1b'
        }
      case 'expires_today':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          iconColor: '#ef4444',
          textColor: '#991b1b'
        }
      case 'expiring_critical':
        return {
          bg: '#fffbeb',
          border: '#fef3c7',
          iconColor: '#f59e0b',
          textColor: '#92400e'
        }
      case 'expiring_urgent':
        return {
          bg: '#fff7ed',
          border: '#fed7aa',
          iconColor: '#f97316',
          textColor: '#9a3412'
        }
      default:
        return {
          bg: '#f0f9ff',
          border: '#e0f2fe',
          iconColor: '#0284c7',
          textColor: '#075985'
        }
    }
  }
  
  const colors = getPriorityColors()
  
  return (
    <div
      onClick={() => {
        // Si no hay pacto, redirigir a /overtime para crear uno
        if (notification.alertType === 'no_pact') {
          onClick('/overtime')
        } else {
          onClick(notification.pact.id || '')
        }
      }}
      style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        background: colors.bg
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
    >
      {/* Icono */}
      <div
        style={{
          fontSize: '24px',
          flexShrink: 0,
          color: colors.iconColor
        }}
      >
        ⏰
      </div>
      
      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: '600', 
          fontSize: '14px', 
          color: colors.textColor,
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {notification.alertType === 'no_pact' ? 'Trabajador Sin Pacto' : 'Pacto Horas Extras'}
          {notification.alertType === 'no_pact' && 'badge' in colors && colors.badge && (
            <span style={{
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: colors.badge.bg,
              color: colors.badge.color
            }}>
              {colors.badge.text}
            </span>
          )}
          {notification.pact.pact_number && (
            <span style={{
              display: 'inline-block',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '700',
              backgroundColor: '#e0e7ff',
              color: '#3730a3'
            }}>
              {notification.pact.pact_number}
            </span>
          )}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: '#374151',
          marginBottom: '4px'
        }}>
          {notification.employee.full_name}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          marginBottom: '4px',
          lineHeight: '1.4'
        }}>
          {notification.message}
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '6px'
        }}>
          <span>👤 {notification.employee.rut}</span>
          {notification.alertType === 'no_pact' ? (
            <>
              <span>•</span>
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>
                📋 Debe crear pacto si requiere trabajar HH.EE.
              </span>
            </>
          ) : (
            <>
              <span>•</span>
              <span>📅 Vence: {new Date(notification.pact.end_date || '').toLocaleDateString('es-CL')}</span>
              <span>•</span>
              <span>⏱️ Máx: {notification.pact.max_daily_hours}h/día</span>
              <span>•</span>
              <span style={{ 
                fontWeight: '600',
                color: notification.dias_restantes && notification.dias_restantes < 0 ? '#dc2626' : notification.dias_restantes && notification.dias_restantes <= 7 ? '#f59e0b' : '#059669'
              }}>
                {notification.dias_restantes !== null && (notification.dias_restantes < 0 
                  ? `Vencido hace ${Math.abs(notification.dias_restantes)} días` 
                  : `${notification.dias_restantes} días restantes`)}
              </span>
            </>
          )}
        </div>
        <div style={{ 
          fontSize: '10px', 
          color: '#9ca3af',
          fontStyle: 'italic',
          marginTop: '4px'
        }}>
          {notification.legalReference}
        </div>
      </div>
    </div>
  )
}
