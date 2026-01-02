'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { getNotifications, Notification } from '@/lib/services/notificationService'
import { FaBell, FaFileContract, FaFileAlt, FaCalendarTimes, FaUmbrellaBeach, FaExclamationTriangle, FaTimes } from 'react-icons/fa'
import './NotificationsDropdown.css'

export default function NotificationsDropdown() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (companyId && isOpen) {
      loadNotifications()
    }
  }, [companyId, isOpen])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const loadNotifications = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const notifs = await getNotifications(companyId, supabase)
      setNotifications(notifs)
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'contract_draft':
        return <FaFileContract />
      case 'settlement_pending':
        return <FaFileAlt />
      case 'contract_expiring':
        return <FaCalendarTimes />
      case 'medical_leave_expiring':
        return <FaExclamationTriangle />
      case 'vacation_pending':
        return <FaUmbrellaBeach />
      default:
        return <FaBell />
    }
  }

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return '#ef4444'
      case 'medium':
        return '#f59e0b'
      case 'low':
        return '#3b82f6'
      default:
        return '#6b7280'
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    setIsOpen(false)
    router.push(notification.link)
  }

  const unreadCount = notifications.length

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <button
        className="notifications-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones"
      >
        <FaBell size={18} />
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notificaciones</h3>
            <button
              className="notifications-close"
              onClick={() => setIsOpen(false)}
              title="Cerrar"
            >
              <FaTimes size={14} />
            </button>
          </div>

          <div className="notifications-content">
            {loading ? (
              <div className="notifications-loading">
                <p>Cargando notificaciones...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">
                <FaBell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="notification-item"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div
                      className="notification-icon"
                      style={{ color: getPriorityColor(notification.priority) }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {new Date(notification.createdAt).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div
                      className="notification-priority-indicator"
                      style={{ backgroundColor: getPriorityColor(notification.priority) }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

