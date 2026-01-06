'use client'

import { FaBuilding, FaCircle } from 'react-icons/fa'

interface DepartmentNodeCardProps {
  department: {
    id: string
    name: string
    code?: string
    status: 'active' | 'inactive'
    employee_count: number
  }
  compact?: boolean
  onClick?: () => void
}

export default function DepartmentNodeCard({
  department,
  compact = false,
  onClick,
}: DepartmentNodeCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const cardWidth = compact ? 200 : 240
  const cardHeight = compact ? 140 : 180

  return (
    <div
      style={{
        width: cardWidth,
        minHeight: cardHeight,
        background: '#ffffff',
        borderRadius: '16px',
        border: `3px solid ${department.status === 'active' ? '#3b82f6' : '#6b7280'}`,
        padding: compact ? '12px' : '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '12px',
        position: 'relative',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)'
        }
      }}
    >
      {/* Header: Icon + Estado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Icon */}
        <div
          style={{
            width: compact ? '40px' : '48px',
            height: compact ? '40px' : '48px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${department.status === 'active' ? '#3b82f6' : '#6b7280'} 0%, ${department.status === 'active' ? '#3b82f6dd' : '#6b7280dd'} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: compact ? '14px' : '16px',
            flexShrink: 0,
          }}
        >
          <FaBuilding size={compact ? 18 : 20} />
        </div>

        {/* Nombre y Estado */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: compact ? '14px' : '16px',
              fontWeight: '600',
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '2px',
            }}
            title={department.name}
          >
            {department.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaCircle
              size={8}
              style={{
                color: department.status === 'active' ? '#10b981' : '#6b7280',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '11px',
                color: '#6b7280',
                whiteSpace: 'nowrap',
              }}
            >
              {department.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Código */}
      {department.code && (
        <div
          style={{
            fontSize: compact ? '11px' : '12px',
            color: '#6b7280',
            fontWeight: '500',
          }}
        >
          Código: {department.code}
        </div>
      )}

      {/* Empleados */}
      <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
        <div
          style={{
            fontSize: compact ? '11px' : '12px',
            color: '#4b5563',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>👥</span>
          <span>
            {department.employee_count} {department.employee_count === 1 ? 'empleado' : 'empleados'}
          </span>
        </div>
      </div>
    </div>
  )
}

