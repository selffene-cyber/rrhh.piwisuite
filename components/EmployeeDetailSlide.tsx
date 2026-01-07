'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaTimes, FaUser, FaBriefcase, FaDollarSign, FaShieldAlt, FaEnvelope, FaMapMarkerAlt, FaPhone, FaCalendarAlt, FaIdCard, FaBuilding, FaFileContract, FaChartLine, FaCreditCard, FaWallet } from 'react-icons/fa'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import OrganigramaCard from './OrganigramaCard'

const AuditHistoryTab = dynamic(() => import('@/components/AuditHistoryTab'), {
  ssr: false,
})

// Estilos para animaciones
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`

const CertificatesHistory = dynamic(() => import('@/app/employees/[id]/certificates-history'), {
  ssr: false,
})

const AccidentsHistory = dynamic(() => import('@/app/employees/[id]/accidents-history'), {
  ssr: false,
})

interface EmployeeDetailSlideProps {
  employeeId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function EmployeeDetailSlide({ employeeId, isOpen, onClose }: EmployeeDetailSlideProps) {
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [payrollSlips, setPayrollSlips] = useState<any[]>([])

  const loadEmployeeData = useCallback(async () => {
    if (!employeeId) return

    try {
      setLoading(true)

      // Cargar datos del empleado
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          cost_centers (
            id,
            code,
            name
          ),
          departments (
            id,
            name,
            code
          )
        `)
        .eq('id', employeeId)
        .single()

      if (employeeError) throw employeeError
      setEmployee(employeeData)

      // Cargar liquidaciones
      const { data: slips, error: slipsError } = await supabase
        .from('payroll_slips')
        .select(`
          *,
          payroll_periods (*)
        `)
        .eq('employee_id', employeeId)
        .not('employee_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12)

      if (!slipsError && slips) {
        setPayrollSlips(slips.filter((slip: any) => slip.employee_id === employeeId))
      }
    } catch (error) {
      console.error('Error al cargar datos del empleado:', error)
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    if (isOpen && employeeId) {
      loadEmployeeData()
    } else {
      setEmployee(null)
      setPayrollSlips([])
    }
  }, [isOpen, employeeId, loadEmployeeData])

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevenir scroll del body cuando el slide está abierto
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Determinar qué gestiones están permitidas
  const canManageVacations = employee?.status === 'active'
  const canManageMedicalLeaves = employee?.status === 'active'
  const canManageCertificates = employee?.status === 'active' || employee?.status === 'licencia_medica'
  const canManageLoans = employee?.status === 'active'
  const canManageContracts = employee?.status === 'active'
  const canManageDisciplinaryActions = employee?.status === 'active'
  const canManagePermissions = employee?.status === 'active'
  const canManagePayroll = employee?.status === 'active' || employee?.status === 'licencia_medica'

  if (!isOpen) return null

  return (
    <>
      {/* Estilos de animación */}
      <style>{styles}</style>
      
      {/* Overlay con fondo difuminado */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s ease-out',
        }}
      />

      {/* Panel lateral */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '90%',
          maxWidth: '600px',
          backgroundColor: '#fff',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(0)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto',
          animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header del slide */}
        <div
          style={{
            padding: '20px 24px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
              {loading ? 'Cargando...' : employee?.full_name || 'Empleado'}
            </h1>
            {employee?.rut && (
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                RUT: {employee.rut}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: '#6b7280',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Contenido del slide */}
        <div style={{ padding: '24px', flex: 1, background: '#f3f4f6' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Cargando información...</p>
            </div>
          ) : employee ? (
            <>
              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <Link href={`/employees/${employee.id}/edit`} style={{ flex: 1 }}>
                  <button
                    style={{
                      background: '#fbbf24',
                      color: '#000',
                      fontWeight: '500',
                      padding: '10px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      width: '100%',
                      fontSize: '14px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f59e0b'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fbbf24'
                    }}
                  >
                    Editar Trabajador
                  </button>
                </Link>
              </div>

              {/* Datos Personales */}
              <div className="card" style={{ 
                marginBottom: '20px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Datos Personales
                  </h2>
                </div>
                <div style={{ padding: '20px' }}>
                  <div className="form-row">
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Nombre Completo
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.full_name}
                    </p>
                  </div>
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Fecha de Nacimiento
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.birth_date ? formatDate(employee.birth_date) : '-'}
                    </p>
                  </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ 
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '4px',
                        display: 'block'
                      }}>
                        Teléfono
                      </label>
                      <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                        {employee.phone || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ 
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '4px',
                        display: 'block'
                      }}>
                        Dirección
                      </label>
                      <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                        {employee.address || '-'}
                      </p>
                    </div>
                    <div className="form-group">
                      <label style={{ 
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '4px',
                        display: 'block'
                      }}>
                        Correo Electrónico
                      </label>
                      <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                        {employee.email || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos Laborales */}
              <div className="card" style={{ 
                marginBottom: '20px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Datos Laborales
                  </h2>
                </div>
                <div style={{ padding: '20px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Fecha de Ingreso
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.hire_date ? formatDate(employee.hire_date) : '-'}
                    </p>
                  </div>
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Cargo
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.position || '-'}
                    </p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Departamento
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.departments?.name || '-'}
                    </p>
                  </div>
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Centro de Costo
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.cost_centers
                        ? `${employee.cost_centers.code} - ${employee.cost_centers.name}`
                        : '-'}
                    </p>
                  </div>
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Tipo de Contrato
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.contract_type === 'plazo_fijo' ? 'Plazo Fijo' : 
                       employee.contract_type === 'indefinido' ? 'Indefinido' : 
                       employee.contract_type || '-'}
                      {employee.contract_type === 'plazo_fijo' && employee.contract_end_date && (
                        <span style={{ display: 'block', marginTop: '4px', color: '#6b7280', fontSize: '12px' }}>
                          Vence: {formatDate(employee.contract_end_date)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Estado
                    </label>
                    <p style={{ margin: 0 }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            employee.status === 'active'
                              ? '#10b98120'
                              : employee.status === 'inactive'
                              ? '#6b728020'
                              : employee.status === 'licencia_medica'
                              ? '#f59e0b20'
                              : employee.status === 'renuncia'
                              ? '#3b82f620'
                              : employee.status === 'despido'
                              ? '#ef444420'
                              : '#6b728020',
                          color:
                            employee.status === 'active'
                              ? '#10b981'
                              : employee.status === 'inactive'
                              ? '#6b7280'
                              : employee.status === 'licencia_medica'
                              ? '#f59e0b'
                              : employee.status === 'renuncia'
                              ? '#3b82f6'
                              : employee.status === 'despido'
                              ? '#ef4444'
                              : '#6b7280',
                          border: `1px solid ${
                            employee.status === 'active'
                              ? '#10b981'
                              : employee.status === 'inactive'
                              ? '#6b7280'
                              : employee.status === 'licencia_medica'
                              ? '#f59e0b'
                              : employee.status === 'renuncia'
                              ? '#3b82f6'
                              : employee.status === 'despido'
                              ? '#ef4444'
                              : '#6b7280'
                          }`,
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'inline-block',
                        }}
                      >
                        {employee.status === 'active'
                          ? 'Activo'
                          : employee.status === 'inactive'
                          ? 'Inactivo'
                          : employee.status === 'licencia_medica'
                          ? 'Licencia Médica'
                          : employee.status === 'renuncia'
                          ? 'Renuncia'
                          : employee.status === 'despido'
                          ? 'Despido'
                          : employee.status}
                      </span>
                    </p>
                  </div>
                </div>
                </div>
              </div>

              {/* Datos Bancarios */}
              {(employee.bank_name || employee.account_number) && (
                <div className="card" style={{ 
                  marginBottom: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                }}>
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e5e7eb',
                  }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                      Datos Bancarios
                    </h2>
                  </div>
                  <div style={{ padding: '20px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Banco
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.bank_name || '-'}
                    </p>
                  </div>
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Tipo de Cuenta
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.account_type === 'corriente' ? 'Cuenta Corriente' :
                       employee.account_type === 'ahorro' ? 'Cuenta de Ahorro' :
                       employee.account_type === 'vista' ? 'Cuenta Vista' :
                       employee.account_type || '-'}
                    </p>
                  </div>
                </div>
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Número de Cuenta
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.account_number || '-'}
                    </p>
                  </div>
                  </div>
                </div>
              )}

              {/* Datos de Remuneración */}
              <div className="card" style={{ 
                marginBottom: '20px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Remuneración
                  </h2>
                </div>
                <div style={{ padding: '20px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Sueldo Base
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                      ${employee.base_salary?.toLocaleString('es-CL') || '-'}
                    </p>
                  </div>
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Movilización
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      ${employee.transportation?.toLocaleString('es-CL') || '-'}
                    </p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Colación
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      ${employee.meal_allowance?.toLocaleString('es-CL') || '-'}
                    </p>
                  </div>
                  {(employee.requests_advance && employee.advance_amount) && (
                    <div className="form-group">
                      <label style={{ 
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '4px',
                        display: 'block'
                      }}>
                        Anticipo
                      </label>
                      <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                        ${employee.advance_amount?.toLocaleString('es-CL') || '-'}
                      </p>
                    </div>
                  )}
                </div>
                </div>
              </div>

              {/* Previsión */}
              <div className="card" style={{ 
                marginBottom: '20px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Previsión
                  </h2>
                </div>
                <div style={{ padding: '20px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      AFP
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.afp || '-'}
                    </p>
                  </div>
                  <div className="form-group">
                    <label style={{ 
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Sistema de Salud
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                      {employee.health_system || '-'}
                    </p>
                  </div>
                </div>
                {employee.health_plan && (
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ 
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '4px',
                        display: 'block'
                      }}>
                        Plan de Salud
                      </label>
                      <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                        {employee.health_plan}
                      </p>
                    </div>
                    {employee.health_plan_percentage && (
                      <div className="form-group">
                        <label style={{ 
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#6b7280',
                          marginBottom: '4px',
                          display: 'block'
                        }}>
                          % Plan
                        </label>
                        <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                          {employee.health_plan_percentage}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>

              {/* Historial de Seguridad y Salud */}
              <AccidentsHistory employeeRut={employee.rut} />

              {/* Organigrama */}
              <OrganigramaCard
                employeeId={employee.id}
                employeeName={employee.full_name}
                onUpdate={loadEmployeeData}
              />

              {/* Accesos Rápidos */}
              <div className="card" style={{ 
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Gestiones
                  </h2>
                </div>
                <div style={{ padding: '20px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '10px' 
                }}>
                  {canManageContracts && (
                    <Link href={`/employees/${employee.id}`}>
                      <button style={{ 
                        width: '100%', 
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: 'none',
                        background: '#3b82f6',
                        color: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2563eb'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#3b82f6'
                      }}>
                        Ver Contratos
                      </button>
                    </Link>
                  )}
                  {canManageVacations && (
                    <Link href={`/employees/${employee.id}/vacations`}>
                      <button style={{ 
                        width: '100%', 
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: 'none',
                        background: '#10b981',
                        color: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#059669'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#10b981'
                      }}>
                        Ver Vacaciones
                      </button>
                    </Link>
                  )}
                  {canManageLoans && (
                    <Link href={`/employees/${employee.id}/loans`}>
                      <button style={{ 
                        width: '100%', 
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: 'none',
                        background: '#f59e0b',
                        color: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d97706'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f59e0b'
                      }}>
                        Ver Préstamos
                      </button>
                    </Link>
                  )}
                  {canManageCertificates && (
                    <Link href={`/employees/${employee.id}/certificates`}>
                      <button style={{ 
                        width: '100%', 
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: 'none',
                        background: '#8b5cf6',
                        color: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#7c3aed'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#8b5cf6'
                      }}>
                        Ver Certificados
                      </button>
                    </Link>
                  )}
                  {canManagePayroll && (
                    <Link href={`/payroll/new?employee_id=${employee.id}`}>
                      <button style={{ 
                        width: '100%', 
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: 'none',
                        background: '#ec4899',
                        color: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#db2777'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ec4899'
                      }}>
                        Generar Liquidación
                      </button>
                    </Link>
                  )}
                </div>
                </div>
              </div>

              {/* Histórico de Acciones */}
              <div className="card" style={{ 
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                marginTop: '20px',
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Histórico de Acciones
                  </h2>
                  <p style={{ 
                    margin: '8px 0 0 0', 
                    fontSize: '13px', 
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    Registro completo de todas las acciones realizadas relacionadas con este trabajador.
                  </p>
                </div>
                <div style={{ padding: '20px' }}>
                  {employeeId && (
                    <AuditHistoryTab employeeId={employeeId} isEmployeePortal={false} />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p>No se pudo cargar la información del empleado</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

