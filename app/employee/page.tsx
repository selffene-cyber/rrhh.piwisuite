'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaUmbrellaBeach, FaFileAlt, FaCalendarCheck, FaFolderOpen, FaChartLine, FaShieldAlt, FaHandHoldingUsd, FaHistory } from 'react-icons/fa'
import './employee-portal.css'

interface DashboardData {
  employee: {
    id: string
    full_name: string
    rut: string
  }
  vacationBalance: {
    accumulated: number
    used: number
    available: number
  }
  stats: {
    certificates: {
      total: number
      approved: number
      pending: number
      rejected: number
    }
    vacations: {
      total: number
      approved: number
      pending: number
      rejected: number
    }
    permissions: {
      total: number
      approved: number
      pending: number
      rejected: number
    }
  }
  upcoming: {
    vacations: any[]
    permissions: any[]
  }
}

export default function EmployeeDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/employee/dashboard')
      if (!response.ok) {
        throw new Error('Error al cargar el dashboard')
      }
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#ef4444' }}>Error: {error || 'No se pudo cargar el dashboard'}</p>
      </div>
    )
  }

  // Calcular porcentaje de vacaciones usadas
  const vacationPercentage = data.vacationBalance.accumulated > 0
    ? Math.round((data.vacationBalance.used / data.vacationBalance.accumulated) * 100)
    : 0

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }} className="fade-in-up">
      {/* Tags de resumen */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div className="summary-tag blue">
          <span style={{ color: 'white', marginRight: '4px' }}>●</span>
          Días disp. {Math.round(data.vacationBalance.available)}
        </div>
        <div className="summary-tag green">
          <span style={{ color: 'white', marginRight: '4px' }}>●</span>
          Aprobadas {data.stats.certificates.approved + data.stats.vacations.approved + data.stats.permissions.approved}
        </div>
        <div className="summary-tag yellow">
          <span style={{ color: 'white', marginRight: '4px' }}>●</span>
          Pendientes {data.stats.certificates.pending + data.stats.vacations.pending + data.stats.permissions.pending}
        </div>
      </div>

      {/* Card de Vacaciones */}
      <div className="vacation-hero-card glass-card" style={{
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>Mis Vacaciones</h2>
          <Link href="/employee/requests?type=vacations" style={{ fontSize: '20px', textDecoration: 'none', color: 'white', opacity: 0.9 }}>
            <FaChartLine />
          </Link>
        </div>

        {/* Indicador circular de progreso */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '0'
        }}>
          <div className="vacation-circle" style={{ position: 'relative', width: '100px', height: '100px' }}>
            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - vacationPercentage / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'white' }}>
                {Math.round(data.vacationBalance.available)}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)' }}>días disp.</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255, 255, 255, 0.95)', marginBottom: '8px', fontWeight: '500' }}>
              Usaste {Math.round(data.vacationBalance.used)} días • Quedan {Math.round(data.vacationBalance.available)} de {Math.round(data.vacationBalance.accumulated)}
            </p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" name="vacation-view" defaultChecked style={{ margin: 0 }} />
                <span>Disponible</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" name="vacation-view" style={{ margin: 0 }} />
                <span>Usado</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
          Acciones rápidas
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          <Link
            href="/employee/vacations/request"
            className="quick-action-card"
          >
            <FaUmbrellaBeach className="quick-action-icon" style={{ fontSize: '36px', color: '#4F46E5' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Vacaciones</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Nueva solicitud</div>
          </Link>
          <Link
            href="/employee/permissions/request"
            className="quick-action-card"
          >
            <FaCalendarCheck className="quick-action-icon" style={{ fontSize: '36px', color: '#7C3AED' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Permisos</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Nueva solicitud</div>
          </Link>
          <Link
            href="/employee/certificates/request"
            className="quick-action-card"
          >
            <FaFileAlt className="quick-action-icon" style={{ fontSize: '36px', color: '#06B6D4' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Certificados</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Nueva solicitud</div>
          </Link>
          <Link
            href="/employee/compliance"
            className="quick-action-card"
          >
            <FaShieldAlt className="quick-action-icon" style={{ fontSize: '36px', color: '#10b981' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Cumplimiento</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver mis cumplimientos</div>
          </Link>
          <Link
            href="/employee/documents"
            className="quick-action-card"
          >
            <FaFolderOpen className="quick-action-icon" style={{ fontSize: '36px', color: '#EC4899' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Documentos</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver todos</div>
          </Link>
          <Link
            href="/employee/loans"
            className="quick-action-card"
          >
            <FaHandHoldingUsd className="quick-action-icon" style={{ fontSize: '36px', color: '#F59E0B' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Préstamos</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver historial</div>
          </Link>
          <Link
            href="/employee/audit-history"
            className="quick-action-card"
          >
            <FaHistory className="quick-action-icon" style={{ fontSize: '36px', color: '#8B5CF6' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Historial</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver todas mis acciones</div>
          </Link>
        </div>
      </div>

      {/* Próximos eventos */}
      {(data.upcoming.vacations.length > 0 || data.upcoming.permissions.length > 0) && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            Próximos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.upcoming.vacations.slice(0, 3).map((vacation: any) => (
              <div
                key={vacation.id}
                className="event-card glass-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaUmbrellaBeach style={{ color: '#4F46E5' }} /> Vacaciones
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {new Date(vacation.start_date).toLocaleDateString('es-CL')} - {new Date(vacation.end_date).toLocaleDateString('es-CL')}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '500' }}>
                    {vacation.days_count} días
                  </div>
                </div>
              </div>
            ))}
            {data.upcoming.permissions.slice(0, 3).map((permission: any) => (
              <div
                key={permission.id}
                className="event-card glass-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaCalendarCheck style={{ color: '#7C3AED' }} /> {permission.permission_types?.name || 'Permiso'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {new Date(permission.start_date).toLocaleDateString('es-CL')} - {new Date(permission.end_date).toLocaleDateString('es-CL')}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '500' }}>
                    {permission.days} días
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

