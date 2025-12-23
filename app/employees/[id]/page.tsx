import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/date'
import { notFound } from 'next/navigation'

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  
  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
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
            <p>{employee.cost_center || '-'}</p>
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
                ? ` (${employee.health_plan_percentage}% adicional)` 
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
              <span className={`badge ${employee.status}`}>
                {employee.status === 'active' ? 'Activo' : 'Inactivo'}
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
          <Link href={`/employees/${params.id}/vacations`}>
            <button>Gestionar Vacaciones</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Licencias Médicas</h2>
          <Link href={`/employees/${params.id}/medical-leaves`}>
            <button>Gestionar Licencias</button>
          </Link>
        </div>
        {/* Mostrar licencia activa si existe */}
        {(() => {
          // Esto se cargará desde el componente cliente
          return null
        })()}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Certificado de Antigüedad</h2>
          <Link href={`/employees/${params.id}/certificate`}>
            <button>Emitir Certificado</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Préstamos Internos</h2>
          <Link href={`/employees/${params.id}/loans/new`}>
            <button>Nuevo Préstamo</button>
          </Link>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/employees/${params.id}/loans`}>
            <button className="secondary">Ver Historial de Préstamos</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Historial de Liquidaciones</h2>
          <Link href={`/payroll/new?employee_id=${params.id}`}>
            <button>Nueva Liquidación</button>
          </Link>
        </div>
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
    </div>
  )
}

