'use client'

import Link from 'next/link'
import { FaUsers, FaDollarSign, FaStethoscope, FaSitemap, FaFileInvoiceDollar, FaHandHoldingUsd, FaChartBar } from 'react-icons/fa'

const reportCards = [
  {
    title: 'Dotación y Distribución',
    description: 'Reporte de trabajadores por centro de costo, AFP, sistema de salud y tipo de contrato',
    href: '/reports/headcount',
    icon: FaUsers,
    color: '#3b82f6',
  },
  {
    title: 'Trabajadores con Información de Sueldo',
    description: 'Lista de trabajadores con remuneraciones fijas y análisis por centro de costo y cargo',
    href: '/reports/salary',
    icon: FaDollarSign,
    color: '#10b981',
  },
  {
    title: 'Estados Laborales y Licencias Médicas',
    description: 'Trabajadores con licencias médicas activas e historial de días de licencias',
    href: '/reports/leaves',
    icon: FaStethoscope,
    color: '#f59e0b',
  },
  {
    title: 'Cargos y Estructura Organizacional',
    description: 'Número de trabajadores por cargo y centro de costo',
    href: '/reports/organizational',
    icon: FaSitemap,
    color: '#8b5cf6',
  },
  {
    title: 'Remuneraciones Mensuales',
    description: 'Vista gerencial de liquidaciones con masas salariales por centro de costo',
    href: '/reports/payroll',
    icon: FaFileInvoiceDollar,
    color: '#ef4444',
  },
  {
    title: 'Préstamos y Anticipos',
    description: 'Monto prestado, saldo pendiente y anticipos por trabajador y centro de costo',
    href: '/reports/loans-advances',
    icon: FaHandHoldingUsd,
    color: '#ec4899',
  },
]

export default function ReportsDashboardPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <FaChartBar size={32} color="#2563eb" />
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>
            Módulo de Reportes
          </h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          Genera reportes ejecutivos en PDF y análisis detallados en Excel/CSV
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '24px' 
      }}>
        {reportCards.map((report) => {
          const IconComponent = report.icon
          return (
            <Link key={report.href} href={report.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ 
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)'
                e.currentTarget.style.borderColor = report.color
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: `${report.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <IconComponent size={24} color={report.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ 
                      fontSize: '20px', 
                      fontWeight: '600', 
                      color: '#111827',
                      margin: '0 0 8px 0'
                    }}>
                      {report.title}
                    </h2>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#6b7280',
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      {report.description}
                    </p>
                  </div>
                </div>
                <div style={{ 
                  marginTop: 'auto',
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ 
                    fontSize: '12px', 
                    color: report.color,
                    fontWeight: '500'
                  }}>
                    Ver Reporte →
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: '32px', background: '#f9fafb' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          Información sobre los Reportes
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '14px', lineHeight: 1.8 }}>
          <li>Los reportes respetan los filtros de Centro de Costo según los permisos del usuario</li>
          <li>Los reportes en PDF están diseñados para presentación ejecutiva</li>
          <li>Los reportes en Excel/CSV contienen datos detallados para análisis</li>
          <li>Todos los reportes pueden filtrarse por empresa, período, centro de costo y otros criterios</li>
        </ul>
      </div>
    </div>
  )
}

