'use client'

import { FaUser, FaEye, FaUserPlus, FaCircle } from 'react-icons/fa'

interface EmployeeNodeCardProps {
  employee: {
    id: string
    name: string
    position: string
    costCenter?: string
    costCenterName?: string
    contractType?: string
    status?: string
    branch?: string
    role?: string
    departmentId?: string
    departmentName?: string
    departmentPath?: string
  }
  editMode?: boolean
  onView?: () => void
  onAssignSuperior?: () => void
  borderColor?: string
  compact?: boolean
}

export default function EmployeeNodeCard({
  employee,
  editMode = false,
  onView,
  onAssignSuperior,
  borderColor = '#3b82f6',
  compact = false,
}: EmployeeNodeCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return '#10b981'
      case 'licencia_medica':
        return '#f59e0b'
      case 'inactive':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'licencia_medica':
        return 'Licencia'
      case 'inactive':
        return 'Inactivo'
      default:
        return 'N/A'
    }
  }

  const getRoleBadgeColor = (role?: string) => {
    if (!role) return '#6b7280'
    const roleLower = role.toLowerCase()
    if (roleLower.includes('gerent') || roleLower.includes('director')) {
      return '#7c3aed' // Purple
    }
    if (roleLower.includes('jefe') || roleLower.includes('supervisor')) {
      return '#2563eb' // Blue
    }
    return '#059669' // Green
  }

  const getContractTypeLabel = (type?: string) => {
    switch (type) {
      case 'indefinido':
        return 'Indefinido'
      case 'plazo_fijo':
        return 'Plazo Fijo'
      case 'obra_faena':
        return 'Obra/Faena'
      case 'part_time':
        return 'Part Time'
      default:
        return type || 'N/A'
    }
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
        border: `3px solid ${borderColor}`,
        borderTop: `3px solid ${borderColor}`,
        borderRight: `3px solid ${borderColor}`,
        borderBottom: `3px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        padding: compact ? '12px' : '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '12px',
        position: 'relative',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Header: Avatar + Estado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Avatar */}
        <div
          style={{
            width: compact ? '40px' : '48px',
            height: compact ? '40px' : '48px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${borderColor} 0%, ${borderColor}dd 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: compact ? '14px' : '16px',
            flexShrink: 0,
          }}
        >
          {getInitials(employee.name)}
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
            title={employee.name}
          >
            {employee.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaCircle
              size={8}
              style={{
                color: getStatusColor(employee.status),
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
              {getStatusLabel(employee.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Cargo */}
      <div
        style={{
          fontSize: compact ? '12px' : '13px',
          color: '#4b5563',
          fontWeight: '500',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: compact ? '32px' : '36px',
        }}
        title={employee.position || 'Sin cargo'}
      >
        {employee.position || 'Sin cargo'}
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
        {employee.departmentName && (
          <span
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: '12px',
              background: '#e0f2fe',
              color: '#0369a1',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}
            title={employee.departmentPath || employee.departmentName}
          >
            {employee.departmentName}
          </span>
        )}
        {employee.costCenter && (
          <span
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: '12px',
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}
            title={employee.costCenterName}
          >
            {employee.costCenter}
          </span>
        )}
        {employee.contractType && (
          <span
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: '12px',
              background: '#eff6ff',
              color: '#1e40af',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}
          >
            {getContractTypeLabel(employee.contractType)}
          </span>
        )}
        {employee.status === 'licencia_medica' && (
          <span
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: '12px',
              background: '#fef3c7',
              color: '#92400e',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            Licencia
          </span>
        )}
      </div>

      {/* Acciones */}
      {editMode && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onView()
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6'
              }}
            >
              <FaEye size={10} />
              Ver
            </button>
          )}
          {onAssignSuperior && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAssignSuperior()
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6'
              }}
            >
              <FaUserPlus size={10} />
              Jefe
            </button>
          )}
        </div>
      )}
    </div>
  )
}

