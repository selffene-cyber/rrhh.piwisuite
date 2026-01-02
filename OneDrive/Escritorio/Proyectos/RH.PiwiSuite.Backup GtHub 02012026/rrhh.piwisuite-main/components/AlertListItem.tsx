'use client'

import { useRouter } from 'next/navigation'
import { FaExclamationTriangle, FaExclamationCircle, FaInfoCircle, FaCheck, FaTimes } from 'react-icons/fa'

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

interface AlertListItemProps {
  alert: Alert
  onResolve: () => void
  onDismiss: () => void
}

export default function AlertListItem({ alert, onResolve, onDismiss }: AlertListItemProps) {
  const router = useRouter()

  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'critical':
        return '#ef4444'
      case 'high':
        return '#f59e0b'
      case 'info':
        return '#3b82f6'
      default:
        return '#6b7280'
    }
  }

  const getSeverityIcon = () => {
    switch (alert.severity) {
      case 'critical':
        return <FaExclamationTriangle size={16} />
      case 'high':
        return <FaExclamationCircle size={16} />
      case 'info':
        return <FaInfoCircle size={16} />
      default:
        return null
    }
  }

  const handleNavigate = () => {
    if (alert.entity_type === 'employee' && alert.entity_id) {
      router.push(`/employees/${alert.entity_id}`)
    } else if (alert.entity_type === 'payroll_period') {
      router.push('/settings/indicators')
    } else {
      router.push('/settings')
    }
  }

  return (
    <div
      style={{
        padding: '16px',
        border: `1px solid ${getSeverityColor()}40`,
        borderLeft: `4px solid ${getSeverityColor()}`,
        background: 'white',
        marginBottom: '12px',
        borderRadius: '0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{ color: getSeverityColor(), marginTop: '2px' }}>
          {getSeverityIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
            {alert.title}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
            {alert.message}
          </p>
          {alert.due_date && (
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Vence: {new Date(alert.due_date).toLocaleDateString('es-CL')}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {alert.entity_id && (
          <button
            onClick={handleNavigate}
            style={{
              padding: '6px 12px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              borderRadius: '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1d4ed8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2563eb'
            }}
          >
            Ir
          </button>
        )}
        <button
          onClick={onResolve}
          style={{
            padding: '6px 12px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#059669'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#10b981'
          }}
        >
          <FaCheck size={12} />
          Resolver
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '6px 12px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4b5563'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#6b7280'
          }}
        >
          <FaTimes size={12} />
          Ocultar
        </button>
      </div>
    </div>
  )
}
