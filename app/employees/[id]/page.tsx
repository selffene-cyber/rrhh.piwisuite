import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/date'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import ContractsHistory from './contracts-history'

const CertificatesHistory = dynamic(() => import('./certificates-history'), {
  ssr: false,
})

const AccidentsHistory = dynamic(() => import('./accidents-history'), {
  ssr: false,
})

const AuditHistoryTab = dynamic(() => import('@/components/AuditHistoryTab'), {
  ssr: false,
})

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  
  const { data: employee, error } = await supabase
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
    .eq('id', params.id)
    .single()

  if (error || !employee) {
    notFound()
  }

  // Obtener liquidaciones del trabajador
  // Asegurarse de que solo traiga liquidaciones válidas con employee_id correcto
  const { data: payrollSlips, error: payrollError } = await supabase
    .from('payroll_slips')
    .select(`
      *,
      payroll_periods (*)
    `)
    .eq('employee_id', params.id)
    .not('employee_id', 'is', null) // Asegurar que employee_id no sea null
    .order('created_at', { ascending: false })
    .limit(12)

  // Si hay error, loguearlo pero no fallar la página
  if (payrollError) {
    console.error('Error al cargar liquidaciones:', payrollError)
  }

  // Filtrar en el servidor también por si acaso
  const validPayrollSlips = payrollSlips?.filter((slip: any) => 
    slip.employee_id === params.id && slip.employee_id !== null
  ) || []

  // Determinar qué gestiones están permitidas según el estado del trabajador
  const canManageVacations = employee.status === 'active'
  const canManageMedicalLeaves = employee.status === 'active'
  const canManageCertificates = employee.status === 'active' || employee.status === 'licencia_medica'
  const canManageLoans = employee.status === 'active'
  const canManageContracts = employee.status === 'active'
  const canManageDisciplinaryActions = employee.status === 'active'
  const canManagePermissions = employee.status === 'active'
  const canManagePayroll = employee.status === 'active' || employee.status === 'licencia_medica'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>{employee.full_name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/employees/${params.id}/edit`}>
            <button style={{ 
              background: '#fbbf24', 
              color: '#000',
              fontWeight: '600'
            }}>Editar</button>
          </Link>
          <Link href="/employees">
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Datos Personales</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Nombre Completo</label>
            <p>{employee.full_name}</p>
          </div>
          <div className="form-group">
            <label>RUT</label>
            <p>{employee.rut}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha de Nacimiento</label>
            <p>{employee.birth_date ? formatDate(employee.birth_date) : '-'}</p>
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <p>{employee.phone || '-'}</p>
          </div>
        </div>
        <div className="form-group">
          <label>Dirección</label>
          <p>{employee.address || '-'}</p>
        </div>
        <div className="form-group">
          <label>Correo Electrónico</label>
          <p>{employee.email || '-'}</p>
        </div>
      </div>

      <div className="card">
        <h2>Datos Bancarios</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Banco</label>
            <p>{employee.bank_name || '-'}</p>
          </div>
          <div className="form-group">
            <label>Tipo de Cuenta</label>
            <p>
              {employee.account_type === 'corriente' ? 'Cuenta Corriente' :
               employee.account_type === 'ahorro' ? 'Cuenta de Ahorro' :
               employee.account_type === 'vista' ? 'Cuenta Vista' :
               employee.account_type || '-'}
            </p>
          </div>
        </div>
        <div className="form-group">
          <label>Número de Cuenta</label>
          <p>{employee.account_number || '-'}</p>
        </div>
      </div>

      <div className="card">
        <h2>Datos Laborales</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha de Ingreso</label>
            <p>{formatDate(employee.hire_date)}</p>
          </div>
          <div className="form-group">
            <label>Cargo</label>
            <p>{employee.position}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Centro de Costo</label>
            <p>
              {employee.cost_centers 
                ? `${employee.cost_centers.code} - ${employee.cost_centers.name}` 
                : employee.cost_center || '-'}
            </p>
          </div>
          <div className="form-group">
            <label>Sueldo Base</label>
            <p>${employee.base_salary.toLocaleString('es-CL')}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Movilización</label>
            <p>${(employee.transportation || 0).toLocaleString('es-CL')}</p>
          </div>
          <div className="form-group">
            <label>Colación</label>
            <p>${(employee.meal_allowance || 0).toLocaleString('es-CL')}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>AFP</label>
            <p>{employee.afp}</p>
          </div>
          <div className="form-group">
            <label>Sistema de Salud</label>
            <p>
              {employee.health_system} 
              {employee.health_plan ? ` - ${employee.health_plan}` : ''}
              {employee.health_system === 'ISAPRE' && employee.health_plan_percentage 
                ? ` (${employee.health_plan_percentage} UF)` 
                : ''}
            </p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo de Contrato</label>
            <p>
              {employee.contract_type === 'plazo_fijo' ? 'Plazo Fijo' : 
               employee.contract_type === 'indefinido' ? 'Indefinido' : 
               employee.contract_other || 'Otro'}
              {employee.contract_type === 'plazo_fijo' && employee.contract_end_date && (
                <span style={{ display: 'block', marginTop: '4px', color: '#6b7280', fontSize: '14px' }}>
                  Vence: {formatDate(employee.contract_end_date)}
                </span>
              )}
            </p>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <p>
              <span 
                className="badge"
                style={{
                  backgroundColor: employee.status === 'active' ? '#10b98120' : 
                                   employee.status === 'inactive' ? '#6b728020' :
                                   employee.status === 'licencia_medica' ? '#f59e0b20' :
                                   employee.status === 'renuncia' ? '#3b82f620' :
                                   employee.status === 'despido' ? '#ef444420' : '#6b728020',
                  color: employee.status === 'active' ? '#10b981' : 
                         employee.status === 'inactive' ? '#6b7280' :
                         employee.status === 'licencia_medica' ? '#f59e0b' :
                         employee.status === 'renuncia' ? '#3b82f6' :
                         employee.status === 'despido' ? '#ef4444' : '#6b7280',
                  border: `1px solid ${employee.status === 'active' ? '#10b981' : 
                                         employee.status === 'inactive' ? '#6b7280' :
                                         employee.status === 'licencia_medica' ? '#f59e0b' :
                                         employee.status === 'renuncia' ? '#3b82f6' :
                                         employee.status === 'despido' ? '#ef4444' : '#6b7280'}`,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'inline-block',
                }}
              >
                {employee.status === 'active' ? 'Activo' : 
                 employee.status === 'inactive' ? 'Inactivo' :
                 employee.status === 'licencia_medica' ? 'Licencia Médica' :
                 employee.status === 'renuncia' ? 'Renuncia' :
                 employee.status === 'despido' ? 'Despido' : employee.status}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de contrato próximo a vencer */}
      {employee.contract_type === 'plazo_fijo' && employee.contract_end_date && employee.status === 'active' && (() => {
        const endDate = new Date(employee.contract_end_date)
        const today = new Date()
        const diffTime = endDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays >= 0 && diffDays <= 15) {
          let alertType = 'info'
          let message = ''
          
          if (diffDays === 0) {
            alertType = 'danger'
            message = '⚠️ El contrato vence HOY'
          } else if (diffDays <= 3) {
            alertType = 'danger'
            message = `⚠️ El contrato vence en ${diffDays} día${diffDays > 1 ? 's' : ''}`
          } else if (diffDays <= 5) {
            alertType = 'warning'
            message = `⚠️ El contrato vence en ${diffDays} días`
          } else if (diffDays <= 10) {
            alertType = 'warning'
            message = `⚠️ El contrato vence en ${diffDays} días`
          } else {
            alertType = 'info'
            message = `ℹ️ El contrato vence en ${diffDays} días`
          }
          
          return (
            <div className="card" style={{ 
              marginTop: '24px', 
              background: alertType === 'danger' ? '#fee2e2' : alertType === 'warning' ? '#fef3c7' : '#dbeafe',
              border: `2px solid ${alertType === 'danger' ? '#dc2626' : alertType === 'warning' ? '#f59e0b' : '#2563eb'}`
            }}>
              <p style={{ 
                margin: 0, 
                fontWeight: 'bold',
                color: alertType === 'danger' ? '#991b1b' : alertType === 'warning' ? '#92400e' : '#1e40af'
              }}>
                {message}
              </p>
            </div>
          )
        }
        return null
      })()}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Vacaciones</h2>
          {canManageVacations ? (
            <Link href={`/employees/${params.id}/vacations`}>
              <button>Gestionar Vacaciones</button>
            </Link>
          ) : (
            <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Gestionar Vacaciones
            </button>
          )}
        </div>
        {!canManageVacations && (
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            No disponible para trabajadores con estado "{employee.status === 'renuncia' ? 'Renuncia' : employee.status === 'despido' ? 'Despido' : 'Inactivo'}"
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Licencias Médicas</h2>
          {canManageMedicalLeaves ? (
            <Link href={`/employees/${params.id}/medical-leaves`}>
              <button>Gestionar Licencias</button>
            </Link>
          ) : (
            <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Gestionar Licencias
            </button>
          )}
        </div>
        {!canManageMedicalLeaves && (
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            No disponible para trabajadores con estado "{employee.status === 'renuncia' ? 'Renuncia' : employee.status === 'despido' ? 'Despido' : 'Inactivo'}"
          </p>
        )}
        {/* Mostrar licencia activa si existe */}
        {(() => {
          // Esto se cargará desde el componente cliente
          return null
        })()}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Certificados Laborales</h2>
          {canManageCertificates ? (
            <Link href={`/employees/${params.id}/certificates`}>
              <button>Solicitar Certificado</button>
            </Link>
          ) : (
            <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Solicitar Certificado
            </button>
          )}
        </div>
        {canManageCertificates ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
            <Link href={`/employees/${params.id}/certificates/antiguedad`}>
              <button className="secondary" style={{ width: '100%' }}>Certificado de Antigüedad</button>
            </Link>
            <Link href={`/employees/${params.id}/certificates/renta`}>
              <button className="secondary" style={{ width: '100%' }}>Certificado de Renta</button>
            </Link>
            <Link href={`/employees/${params.id}/certificates/vigencia`}>
              <button className="secondary" style={{ width: '100%' }}>Certificado de Vigencia</button>
            </Link>
            <Link href={`/employees/${params.id}/contracts`}>
              <button className="secondary" style={{ width: '100%' }}>Contratos y Anexos</button>
            </Link>
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            No disponible para trabajadores con estado "{employee.status === 'renuncia' ? 'Renuncia' : employee.status === 'despido' ? 'Despido' : 'Inactivo'}"
          </p>
        )}
        <div style={{ marginTop: '24px' }}>
          <CertificatesHistory employeeId={params.id} />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Préstamos Internos</h2>
          {canManageLoans ? (
            <Link href={`/employees/${params.id}/loans/new`}>
              <button>Nuevo Préstamo</button>
            </Link>
          ) : (
            <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Nuevo Préstamo
            </button>
          )}
        </div>
        {canManageLoans ? (
          <div style={{ marginBottom: '24px' }}>
            <Link href={`/employees/${params.id}/loans`}>
              <button className="secondary">Ver Historial de Préstamos</button>
            </Link>
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            No disponible para trabajadores con estado "{employee.status === 'renuncia' ? 'Renuncia' : employee.status === 'despido' ? 'Despido' : 'Inactivo'}"
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Contratos y Anexos</h2>
          {canManageContracts ? (
            <Link href={`/contracts/new?employee_id=${params.id}`}>
              <button>Nuevo Contrato</button>
            </Link>
          ) : (
            <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Nuevo Contrato
            </button>
          )}
        </div>
        {!canManageContracts && (
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px', marginBottom: '16px' }}>
            No disponible para trabajadores con estado "{employee.status === 'renuncia' ? 'Renuncia' : employee.status === 'despido' ? 'Despido' : 'Inactivo'}"
          </p>
        )}
        <ContractsHistory employeeId={params.id} />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Cartas de Amonestación</h2>
          {canManageDisciplinaryActions ? (
            <Link href={`/employees/${params.id}/disciplinary-actions/new`}>
              <button>Nueva Amonestación</button>
            </Link>
          ) : (
            <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Nueva Amonestación
            </button>
          )}
        </div>
        {canManageDisciplinaryActions ? (
          <Link href={`/employees/${params.id}/disciplinary-actions`}>
            <button className="secondary" style={{ marginTop: '8px' }}>Ver Todas las Amonestaciones</button>
          </Link>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            No disponible para trabajadores con estado "{employee.status === 'renuncia' ? 'Renuncia' : employee.status === 'despido' ? 'Despido' : 'Inactivo'}"
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Permisos</h2>
          {canManagePermissions ? (
            <Link href={`/employees/${params.id}/permissions/new`}>
              <button>Nuevo Permiso</button>
            </Link>
          ) : (
            <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Nuevo Permiso
            </button>
          )}
        </div>
        {canManagePermissions ? (
          <Link href={`/employees/${params.id}/permissions`}>
            <button className="secondary" style={{ marginTop: '8px' }}>Ver Todos los Permisos</button>
          </Link>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            No disponible para trabajadores con estado "{employee.status === 'renuncia' ? 'Renuncia' : employee.status === 'despido' ? 'Despido' : 'Inactivo'}"
          </p>
        )}
      </div>

      <AccidentsHistory employeeRut={employee.rut} />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Historial de Liquidaciones</h2>
          {canManagePayroll ? (
            <Link href={`/payroll/new?employee_id=${params.id}`}>
              <button>Nueva Liquidación</button>
            </Link>
          ) : (
            <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Nueva Liquidación
            </button>
          )}
        </div>
        {!canManagePayroll && employee.status !== 'licencia_medica' && (
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
            No disponible para trabajadores con estado "{employee.status === 'renuncia' ? 'Renuncia' : employee.status === 'despido' ? 'Despido' : 'Inactivo'}"
          </p>
        )}
        {validPayrollSlips && validPayrollSlips.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Días Trabajados</th>
                <th>Líquido a Pagar</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {validPayrollSlips.map((slip: any) => (
                <tr key={slip.id}>
                  <td>
                    {slip.payroll_periods ? 
                      `${slip.payroll_periods.month}/${slip.payroll_periods.year}` : 
                      '-'
                    }
                  </td>
                  <td>{slip.days_worked}</td>
                  <td>${slip.net_pay.toLocaleString('es-CL')}</td>
                  <td>
                    <span className={`badge ${slip.status}`}>
                      {slip.status === 'draft' ? 'Borrador' : slip.status === 'issued' ? 'Emitida' : 'Enviada'}
                    </span>
                  </td>
                  <td>
                    <Link href={`/payroll/${slip.id}`}>
                      <button style={{ padding: '4px 8px', fontSize: '12px' }}>Ver</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay liquidaciones registradas para este trabajador.</p>
        )}
      </div>

      {/* Historial de Auditoría */}
      <div className="card">
        <h2>Histórico de Acciones</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
          Registro completo de todas las acciones realizadas relacionadas con este trabajador.
        </p>
        <AuditHistoryTab employeeId={params.id} isEmployeePortal={false} />
      </div>
    </div>
  )
}

