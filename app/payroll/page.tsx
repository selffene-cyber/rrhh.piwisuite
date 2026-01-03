'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatMonthYear, MONTHS } from '@/lib/utils/date'
import { FaEye, FaTrash, FaBook } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function PayrollPage() {
  const { company: currentCompany } = useCurrentCompany()
  const [payrollSlips, setPayrollSlips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [filterYear, setFilterYear] = useState<number | ''>('')
  const [filterMonth, setFilterMonth] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'issued' | 'sent'>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('')

  useEffect(() => {
    if (currentCompany) {
      loadEmployees()
      loadPayrollSlips()
    } else {
      setPayrollSlips([])
      setEmployees([])
      setLoading(false)
    }
  }, [currentCompany])

  useEffect(() => {
    if (currentCompany) {
      loadPayrollSlips()
    }
  }, [currentCompany, filterYear, filterMonth, filterStatus, filterEmployee])

  const loadEmployees = async () => {
    if (!currentCompany) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error al cargar trabajadores:', error)
    }
  }

  const loadPayrollSlips = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)
      
      // Primero obtener los IDs de los empleados de la empresa actual
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', currentCompany.id)

      if (employeesError) throw employeesError

      if (!employees || employees.length === 0) {
        setPayrollSlips([])
        setLoading(false)
        return
      }

      const employeeIds = employees.map((emp: { id: string }) => emp.id)

      // Obtener las liquidaciones solo de los empleados de la empresa actual
      const { data, error } = await supabase
        .from('payroll_slips')
        .select(`
          id,
          employee_id,
          period_id,
          days_worked,
          net_pay,
          status,
          created_at,
          employees (full_name, rut, company_id),
          payroll_periods (year, month)
        `)
        .in('employee_id', employeeIds)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      // Filtrar en el cliente después de obtener los datos
      let filtered = data || []

      if (filterStatus !== 'all') {
        filtered = filtered.filter((slip: any) => slip.status === filterStatus)
      }

      if (filterYear) {
        filtered = filtered.filter((slip: any) => 
          slip.payroll_periods && slip.payroll_periods.year === filterYear
        )
      }

      if (filterMonth) {
        filtered = filtered.filter((slip: any) => 
          slip.payroll_periods && slip.payroll_periods.month === filterMonth
        )
      }

      if (filterEmployee) {
        filtered = filtered.filter((slip: any) => 
          slip.employee_id === filterEmployee
        )
      }

      setPayrollSlips(filtered)
    } catch (error: any) {
      console.error('Error al cargar liquidaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, status: string) => {
    const slip = payrollSlips.find((s: any) => s.id === id)
    const isIssued = status === 'issued' || status === 'sent'
    const message = isIssued 
      ? '¿Estás seguro de que deseas eliminar esta liquidación EMITIDA? Esta acción no se puede deshacer y la liquidación será eliminada permanentemente. Los anticipos vinculados volverán a estar disponibles.'
      : '¿Estás seguro de que deseas eliminar esta liquidación? Esta acción no se puede deshacer. Los anticipos vinculados volverán a estar disponibles.'
    
    if (!confirm(message)) {
      return
    }

    try {
      // Primero, restaurar los anticipos vinculados a esta liquidación
      const { data: linkedAdvances, error: advancesError } = await supabase
        .from('advances')
        .select('id, status')
        .eq('payroll_slip_id', id)

      if (advancesError) {
        console.error('Error al buscar anticipos vinculados:', advancesError)
        // Continuar con la eliminación aunque falle esto
      }

      // Restaurar anticipos: cambiar de "descontado" a "pagado" y limpiar el vínculo
      if (linkedAdvances && linkedAdvances.length > 0) {
        const advanceIds = linkedAdvances.map((adv: any) => adv.id)
        const { error: updateAdvancesError } = await supabase
          .from('advances')
          .update({
            status: 'pagado', // Restaurar a estado anterior (asumiendo que solo se descuentan anticipos pagados)
            payroll_slip_id: null,
            discounted_at: null,
            updated_at: new Date().toISOString()
          })
          .in('id', advanceIds)
          .eq('status', 'descontado') // Solo actualizar los que están descontados

        if (updateAdvancesError) {
          console.error('Error al restaurar anticipos:', updateAdvancesError)
          // Continuar con la eliminación aunque falle esto
        } else {
          console.log(`${linkedAdvances.length} anticipo(s) restaurado(s)`)
        }
      }

      // Eliminar la liquidación
      const { error } = await supabase
        .from('payroll_slips')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Liquidación eliminada correctamente' + (linkedAdvances && linkedAdvances.length > 0 ? `. ${linkedAdvances.length} anticipo(s) restaurado(s).` : ''))
      loadPayrollSlips()
    } catch (error: any) {
      alert('Error al eliminar liquidación: ' + error.message)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  if (!currentCompany) {
    return (
      <div>
        <h1>Liquidaciones de Sueldo</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver las liquidaciones.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Liquidaciones de Sueldo</h1>
          <Link href="/payroll-book">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaBook size={16} />
              Libro de Remuneraciones
            </button>
          </Link>
        </div>
        <div className="card">
          <p>Cargando liquidaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h1>Liquidaciones de Sueldo</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/payroll-book">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="secondary">
              <FaBook size={16} />
              Libro de Remuneraciones
            </button>
          </Link>
          <Link href="/payroll/new">
            <button>Nueva Liquidación</button>
          </Link>
        </div>
      </div>


      <div className="card">
        <h2>Filtros</h2>
        <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="form-group">
            <label>Trabajador</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
            >
              <option value="">Todos</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Año</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">Todos</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mes</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">Todos</option>
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'draft' | 'issued' | 'sent')}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="issued">Emitida</option>
              <option value="sent">Enviada</option>
            </select>
          </div>
        </div>
        <button onClick={loadPayrollSlips} className="secondary" style={{ marginTop: '8px' }}>
          Actualizar
        </button>
      </div>

      <div className="card">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>
            Lista de Liquidaciones
            {payrollSlips.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                ({payrollSlips.length} {payrollSlips.length === 1 ? 'liquidación' : 'liquidaciones'})
              </span>
            )}
          </h2>
        </div>
        {payrollSlips.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay liquidaciones que coincidan con los filtros seleccionados.
            {filterStatus === 'all' && !filterYear && !filterMonth && !filterEmployee && (
              <> <Link href="/payroll/new">Crear una nueva</Link></>
            )}
          </p>
        ) : (
          <>
            {/* Tabla Desktop */}
            <div className="table-mobile-hidden">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th>RUT</th>
                      <th>Período</th>
                      <th>Días Trabajados</th>
                      <th>Líquido a Pagar</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollSlips.map((slip: any) => (
                      <tr key={slip.id}>
                        <td>{slip.employees?.full_name || '-'}</td>
                        <td>{slip.employees?.rut || '-'}</td>
                        <td>
                          {slip.payroll_periods ? 
                            formatMonthYear(slip.payroll_periods.year, slip.payroll_periods.month) : 
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Link href={`/payroll/${slip.id}`}>
                              <button 
                                style={{ 
                                  padding: '6px 10px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  border: '1px solid #d1d5db',
                                  background: '#fff',
                                  borderRadius: '4px'
                                }}
                                title="Ver"
                              >
                                <FaEye style={{ fontSize: '14px', color: '#3b82f6' }} />
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDelete(slip.id, slip.status)}
                              style={{ 
                                padding: '6px 10px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                cursor: 'pointer',
                                border: '1px solid #d1d5db',
                                background: '#fff',
                                borderRadius: '4px'
                              }}
                              title="Eliminar liquidación"
                            >
                              <FaTrash style={{ fontSize: '14px', color: '#ef4444' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards Mobile */}
            <div className="table-mobile-card">
              {payrollSlips.map((slip: any) => (
                <div key={slip.id} className="mobile-card">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Trabajador</span>
                    <span className="mobile-card-value" style={{ fontWeight: '600' }}>
                      {slip.employees?.full_name || '-'}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">RUT</span>
                    <span className="mobile-card-value">{slip.employees?.rut || '-'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Período</span>
                    <span className="mobile-card-value">
                      {slip.payroll_periods ? 
                        formatMonthYear(slip.payroll_periods.year, slip.payroll_periods.month) : 
                        '-'
                      }
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Días Trabajados</span>
                    <span className="mobile-card-value">{slip.days_worked}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Líquido a Pagar</span>
                    <span className="mobile-card-value" style={{ fontWeight: '600', color: '#059669' }}>
                      ${slip.net_pay.toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Estado</span>
                    <span className="mobile-card-value">
                      <span className={`badge ${slip.status}`}>
                        {slip.status === 'draft' ? 'Borrador' : slip.status === 'issued' ? 'Emitida' : 'Enviada'}
                      </span>
                    </span>
                  </div>
                  <div className="mobile-card-actions">
                    <Link href={`/payroll/${slip.id}`} style={{ flex: 1 }}>
                      <button style={{ width: '100%', padding: '8px', fontSize: '14px' }}>
                        <FaEye style={{ marginRight: '6px' }} />
                        Ver
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(slip.id, slip.status)}
                      className="danger"
                      style={{ padding: '8px', fontSize: '14px' }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

