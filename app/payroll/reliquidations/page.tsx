'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatMonthYear, MONTHS } from '@/lib/utils/date'
import { FaEye, FaPlus, FaRedo } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { PayrollReliquidationWithDetails } from '@/types'

export default function ReliquidationsPage() {
  const { company: currentCompany } = useCurrentCompany()
  const [reliquidations, setReliquidations] = useState<PayrollReliquidationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [filterYear, setFilterYear] = useState<number | ''>('')
  const [filterMonth, setFilterMonth] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'approved' | 'issued' | 'paid'>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('')

  useEffect(() => {
    if (currentCompany) {
      loadEmployees()
      loadReliquidations()
    } else {
      setReliquidations([])
      setEmployees([])
      setLoading(false)
    }
  }, [currentCompany])

  useEffect(() => {
    if (currentCompany) {
      loadReliquidations()
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

  const loadReliquidations = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)
      
      // Obtener IDs de empleados de la empresa actual
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', currentCompany.id)

      if (employeesError) throw employeesError

      if (!employees || employees.length === 0) {
        setReliquidations([])
        setLoading(false)
        return
      }

      const employeeIds = employees.map((emp: { id: string }) => emp.id)

      // Obtener las reliquidaciones
      const { data, error } = await supabase
        .from('payroll_reliquidations')
        .select(`
          *,
          employees (full_name, rut, company_id),
          payroll_periods (year, month),
          reference_payroll_slip:payroll_slips!payroll_reliquidations_reference_payroll_slip_id_fkey (
            id,
            status,
            created_at
          )
        `)
        .in('employee_id', employeeIds)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      // Filtrar en el cliente
      let filtered = data || []

      if (filterStatus !== 'all') {
        filtered = filtered.filter((rel: any) => rel.status === filterStatus)
      }

      if (filterYear) {
        filtered = filtered.filter((rel: any) => 
          rel.payroll_periods && rel.payroll_periods.year === filterYear
        )
      }

      if (filterMonth) {
        filtered = filtered.filter((rel: any) => 
          rel.payroll_periods && rel.payroll_periods.month === filterMonth
        )
      }

      if (filterEmployee) {
        filtered = filtered.filter((rel: any) => 
          rel.employee_id === filterEmployee
        )
      }

      setReliquidations(filtered as PayrollReliquidationWithDetails[])
    } catch (error: any) {
      console.error('Error al cargar reliquidaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      approved: 'Aprobada',
      issued: 'Emitida',
      paid: 'Pagada'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      approved: '#f59e0b',
      issued: '#3b82f6',
      paid: '#059669'
    }
    return colors[status] || '#6b7280'
  }

  const getTypeLabel = (type: string) => {
    return type === 'rectificatoria' ? 'Rectificatoria' : 'Complementaria'
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  if (!currentCompany) {
    return (
      <div>
        <h1>Reliquidaciones de Remuneraciones</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver las reliquidaciones.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Reliquidaciones de Remuneraciones</h1>
        </div>
        <div className="card">
          <p>Cargando reliquidaciones...</p>
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
        <h1>Reliquidaciones de Remuneraciones</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/payroll">
            <button style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: '#3b82f6',
              color: 'white',
              border: '1px solid #3b82f6'
            }}>
              <FaPlus size={16} />
              Crear Reliquidación
            </button>
          </Link>
          <Link href="/payroll">
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaRedo size={16} />
              Ver Liquidaciones
            </button>
          </Link>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Filtros</h2>
        </div>
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
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'draft' | 'approved' | 'issued' | 'paid')}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="approved">Aprobada</option>
              <option value="issued">Emitida</option>
              <option value="paid">Pagada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>
            Lista de Reliquidaciones
            {reliquidations.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                ({reliquidations.length} {reliquidations.length === 1 ? 'reliquidación' : 'reliquidaciones'})
              </span>
            )}
          </h2>
        </div>
        {reliquidations.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay reliquidaciones que coincidan con los filtros seleccionados.
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
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Diferencia Líquido</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reliquidations.map((rel) => (
                      <tr key={rel.id}>
                        <td>{rel.employees?.full_name || '-'}</td>
                        <td>{rel.employees?.rut || '-'}</td>
                        <td>
                          {rel.payroll_periods ? 
                            formatMonthYear(rel.payroll_periods.year, rel.payroll_periods.month) : 
                            '-'
                          }
                        </td>
                        <td>{getTypeLabel(rel.type)}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rel.reason_text || '-'}
                        </td>
                        <td style={{ 
                          color: rel.diff_net_pay >= 0 ? '#059669' : '#dc2626',
                          fontWeight: '600'
                        }}>
                          {rel.diff_net_pay >= 0 ? '+' : ''}${rel.diff_net_pay.toLocaleString('es-CL')}
                        </td>
                        <td>
                          <span 
                            className="badge" 
                            style={{
                              background: getStatusColor(rel.status),
                              color: 'white'
                            }}
                          >
                            {getStatusLabel(rel.status)}
                          </span>
                        </td>
                        <td>
                          <Link href={`/payroll/reliquidations/${rel.id}`}>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards Mobile */}
            <div className="table-mobile-card">
              {reliquidations.map((rel) => (
                <div key={rel.id} className="mobile-card">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Trabajador</span>
                    <span className="mobile-card-value" style={{ fontWeight: '600' }}>
                      {rel.employees?.full_name || '-'}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">RUT</span>
                    <span className="mobile-card-value">{rel.employees?.rut || '-'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Período</span>
                    <span className="mobile-card-value">
                      {rel.payroll_periods ? 
                        formatMonthYear(rel.payroll_periods.year, rel.payroll_periods.month) : 
                        '-'
                      }
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Tipo</span>
                    <span className="mobile-card-value">{getTypeLabel(rel.type)}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Diferencia Líquido</span>
                    <span className="mobile-card-value" style={{ 
                      fontWeight: '600', 
                      color: rel.diff_net_pay >= 0 ? '#059669' : '#dc2626'
                    }}>
                      {rel.diff_net_pay >= 0 ? '+' : ''}${rel.diff_net_pay.toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Estado</span>
                    <span className="mobile-card-value">
                      <span 
                        className="badge" 
                        style={{
                          background: getStatusColor(rel.status),
                          color: 'white'
                        }}
                      >
                        {getStatusLabel(rel.status)}
                      </span>
                    </span>
                  </div>
                  <div className="mobile-card-actions">
                    <Link href={`/payroll/reliquidations/${rel.id}`} style={{ flex: 1 }}>
                      <button style={{ width: '100%', padding: '8px', fontSize: '14px' }}>
                        <FaEye style={{ marginRight: '6px' }} />
                        Ver
                      </button>
                    </Link>
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
