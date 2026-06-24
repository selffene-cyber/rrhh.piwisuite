'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getVacationPeriods, syncVacationPeriods, getVacationSummary } from '@/lib/services/vacationPeriods'
import { FaUmbrellaBeach, FaUser, FaCalendarAlt, FaSort, FaSortUp, FaSortDown, FaClock, FaCheck, FaTimes } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import HolidaysModal from '@/components/HolidaysModal'

interface EmployeeVacationData {
  id: string
  full_name: string
  rut: string
  hire_date: string
  periods: any[]
  totalAccumulated: number
  totalUsed: number
  totalAvailable: number
}

export default function VacationsDashboardPage() {
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeeVacationData[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false)
  const [showHolidaysModal, setShowHolidaysModal] = useState(false)
  const [stats, setStats] = useState({
    workersWithMultiplePeriods: 0,
    totalAccumulated: 0,
    workersWithNegativeBalance: 0,
  })
  const [sortColumn, setSortColumn] = useState<string>('totalAccumulated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [pendingVacations, setPendingVacations] = useState<any[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    if (companyId) {
      loadEmployeesVacations()
      loadPendingVacations()
    } else {
      setEmployees([])
      setLoading(false)
    }
  }, [companyId])

  const loadPendingVacations = async () => {
    if (!companyId) return
    try {
      const { data: emps } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)

      if (!emps || emps.length === 0) {
        setPendingVacations([])
        return
      }

      const empIds = emps.map((e: { id: string }) => e.id)
      const { data, error } = await supabase
        .from('vacations')
        .select('id, employee_id, start_date, end_date, days_count, status, created_at, employees(full_name, rut)')
        .in('employee_id', empIds)
        .eq('status', 'solicitada')
        .order('created_at', { ascending: false })

      if (!error) {
        setPendingVacations(data || [])
      }
    } catch (err) {
      console.error('Error al cargar solicitudes pendientes:', err)
    }
  }

  const handleApproveVacation = async (vacationId: string, employeeId: string) => {
    if (!confirm('¿Aprobar esta solicitud de vacaciones? Se generará un documento firmado.')) return
    setApprovingId(vacationId)
    try {
      const res = await fetch(`/api/vacations/${vacationId}/approve`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al aprobar')
      alert('Vacación aprobada correctamente')
      loadPendingVacations()
    } catch (err: any) {
      alert('Error al aprobar vacación: ' + err.message)
    } finally {
      setApprovingId(null)
    }
  }

  const handleRejectVacation = async (vacationId: string) => {
    const reason = prompt('Motivo del rechazo (obligatorio):')
    if (!reason) return
    try {
      const res = await fetch(`/api/vacations/${vacationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al rechazar')
      alert('Vacación rechazada')
      loadPendingVacations()
    } catch (err: any) {
      alert('Error al rechazar vacación: ' + err.message)
    }
  }

  const loadEmployeesVacations = async () => {
    if (!companyId) return
    
    try {
      setLoading(true)
      
      // Obtener todos los trabajadores activos de la empresa
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, rut, hire_date')
        .in('status', ['active', 'licencia_medica'])
        .eq('company_id', companyId)
        .order('full_name', { ascending: true })

      if (empError) throw empError

      if (!employeesData || employeesData.length === 0) {
        setEmployees([])
        setLoading(false)
        return
      }

      // Para cada trabajador, sincronizar períodos y obtener resumen
      const employeesWithVacations = await Promise.all(
        employeesData.map(async (emp: any) => {
          try {
            // Sincronizar períodos (esto crea/actualiza los períodos según la fecha de ingreso)
            await syncVacationPeriods(emp.id, emp.hire_date)
            
            // Obtener resumen de vacaciones (usando cálculo por años de servicio)
            const summary = await getVacationSummary(emp.id, emp.hire_date)
            
            return {
              id: emp.id,
              full_name: emp.full_name,
              rut: emp.rut,
              hire_date: emp.hire_date,
              periods: summary.periods,
              totalAccumulated: summary.totalAccumulated,
              totalUsed: summary.totalUsed,
              totalAvailable: summary.totalAvailable,
            }
          } catch (error) {
            console.error(`Error al cargar vacaciones de ${emp.full_name}:`, error)
            return {
              id: emp.id,
              full_name: emp.full_name,
              rut: emp.rut,
              hire_date: emp.hire_date,
              periods: [],
              totalAccumulated: 0,
              totalUsed: 0,
              totalAvailable: 0,
            }
          }
        })
      )

      setEmployees(employeesWithVacations)

      // Calcular estadísticas
      const workersWithMultiplePeriods = employeesWithVacations.filter(
        emp => emp.periods.length > 1
      ).length

      const totalAccumulated = employeesWithVacations.reduce(
        (sum, emp) => sum + emp.totalAccumulated,
        0
      )

      const workersWithNegativeBalance = employeesWithVacations.filter(
        emp => emp.totalAvailable < 0
      ).length

      setStats({
        workersWithMultiplePeriods,
        totalAccumulated,
        workersWithNegativeBalance,
      })
    } catch (error: any) {
      console.error('Error al cargar vacaciones:', error)
      alert('Error al cargar vacaciones: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeClick = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    setShowEmployeeDetail(true)
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const sortedEmployees = [...employees].sort((a, b) => {
    let aValue: number
    let bValue: number

    switch (sortColumn) {
      case 'totalAccumulated':
        aValue = a.totalAccumulated
        bValue = b.totalAccumulated
        break
      case 'totalUsed':
        aValue = a.totalUsed
        bValue = b.totalUsed
        break
      case 'totalAvailable':
        aValue = a.totalAvailable
        bValue = b.totalAvailable
        break
      case 'periods':
        aValue = a.periods.length
        bValue = b.periods.length
        break
      default:
        return 0
    }

    if (sortDirection === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee)

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Cargando vacaciones...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaUmbrellaBeach size={28} color="#f59e0b" />
          Dashboard de Vacaciones
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowHolidaysModal(true)}
            style={{
              backgroundColor: '#0ea5e9',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📅 Feriados Legales
          </button>
          <Link href="/vacations/new">
            <button>Nueva Solicitud</button>
          </Link>
          <Link href="/">
            <button className="secondary">Volver al Dashboard</button>
          </Link>
        </div>
      </div>

      {/* Modal de Feriados */}
      <HolidaysModal 
        isOpen={showHolidaysModal} 
        onClose={() => setShowHolidaysModal(false)} 
      />

      {showEmployeeDetail && selectedEmployeeData ? (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowEmployeeDetail(false)} className="secondary">
              ← Volver a la lista
            </button>
            <h2>{selectedEmployeeData.full_name}</h2>
          </div>
          
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Resumen de Vacaciones</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderRadius: '12px',
                border: '2px solid #3b82f6'
              }}>
                <p style={{ fontSize: '12px', color: '#1e40af', marginBottom: '8px', fontWeight: '500' }}>
                  TOTAL ACUMULADO
                </p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
                  {selectedEmployeeData.totalAccumulated.toFixed(2)} días
                </p>
              </div>
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: '12px',
                border: '2px solid #ef4444'
              }}>
                <p style={{ fontSize: '12px', color: '#991b1b', marginBottom: '8px', fontWeight: '500' }}>
                  TOTAL USADO
                </p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#7f1d1d', margin: 0 }}>
                  {selectedEmployeeData.totalUsed} días
                </p>
              </div>
              <div style={{
                padding: '20px',
                background: selectedEmployeeData.totalAvailable >= 0 
                  ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                  : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: '12px',
                border: selectedEmployeeData.totalAvailable >= 0 ? '2px solid #10b981' : '2px solid #ef4444'
              }}>
                <p style={{ 
                  fontSize: '12px', 
                  color: selectedEmployeeData.totalAvailable >= 0 ? '#065f46' : '#991b1b', 
                  marginBottom: '8px', 
                  fontWeight: '500' 
                }}>
                  TOTAL DISPONIBLE
                </p>
                <p style={{ 
                  fontSize: '28px', 
                  fontWeight: 'bold', 
                  color: selectedEmployeeData.totalAvailable >= 0 ? '#064e3b' : '#7f1d1d', 
                  margin: 0 
                }}>
                  {selectedEmployeeData.totalAvailable.toFixed(2)} días
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h3>Períodos de Vacaciones</h3>
            {selectedEmployeeData.periods.length > 0 ? (
              <table style={{ width: '100%', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Año</th>
                    <th style={{ textAlign: 'right', padding: '12px' }}>Acumulado</th>
                    <th style={{ textAlign: 'right', padding: '12px' }}>Usado</th>
                    <th style={{ textAlign: 'right', padding: '12px' }}>Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmployeeData.periods.map((period: any) => (
                    <tr key={period.id}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{period.period_year}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#0369a1' }}>
                        {period.accumulated_days.toFixed(2)} días
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>
                        {period.used_days} días
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontWeight: 'bold',
                        color: period.available_days >= 0 ? '#059669' : '#dc2626' 
                      }}>
                        {period.available_days.toFixed(2)} días
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ marginTop: '16px', color: '#6b7280' }}>No hay períodos de vacaciones registrados.</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href={`/employees/${selectedEmployeeData.id}/vacations`}>
              <button>
                <FaCalendarAlt style={{ marginRight: '8px' }} />
                Gestionar Vacaciones
              </button>
            </Link>
            <Link href={`/employees/${selectedEmployeeData.id}`}>
              <button className="secondary">
                <FaUser style={{ marginRight: '8px' }} />
                Ver Perfil del Trabajador
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          {/* Cards de estadísticas */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px', 
            marginBottom: '24px' 
          }}>
            <div className="card" style={{ padding: 0 }}>
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)',
                borderRadius: '12px',
                border: '2px solid #8b5cf6'
              }}>
                <p style={{ fontSize: '12px', color: '#6b21a8', marginBottom: '8px', fontWeight: '500' }}>
                  TRABAJADORES CON MÚLTIPLES PERÍODOS
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#581c87', margin: 0, marginBottom: '8px' }}>
                  {stats.workersWithMultiplePeriods}
                </p>
                <p style={{ fontSize: '12px', color: '#6b21a8', margin: 0 }}>
                  {employees.length > 0 
                    ? `${((stats.workersWithMultiplePeriods / employees.length) * 100).toFixed(0)}% del total`
                    : '0%'}
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '12px',
                border: '2px solid #f59e0b'
              }}>
                <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px', fontWeight: '500' }}>
                  TOTAL DÍAS ACUMULADOS
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#78350f', margin: 0, marginBottom: '8px' }}>
                  {stats.totalAccumulated.toFixed(0)}
                </p>
                <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
                  Entre todos los trabajadores
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                borderRadius: '12px',
                border: '2px solid #ec4899'
              }}>
                <p style={{ fontSize: '12px', color: '#9f1239', marginBottom: '8px', fontWeight: '500' }}>
                  CON SALDO NEGATIVO
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#831843', margin: 0, marginBottom: '8px' }}>
                  {stats.workersWithNegativeBalance}
                </p>
                <p style={{ fontSize: '12px', color: '#9f1239', margin: 0 }}>
                  Días de períodos futuros
                </p>
              </div>
            </div>
          </div>

          {pendingVacations.length > 0 && (
            <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #f59e0b' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaClock color="#f59e0b" />
                Solicitudes Pendientes ({pendingVacations.length})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Trabajador</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Inicio</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Término</th>
                      <th style={{ textAlign: 'center', padding: '10px' }}>Días</th>
                      <th style={{ textAlign: 'center', padding: '10px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVacations.map((v: any) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '10px', fontWeight: 500 }}>
                          {v.employees?.full_name || 'N/A'}
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{v.employees?.rut || ''}</div>
                        </td>
                        <td style={{ padding: '10px' }}>{v.start_date}</td>
                        <td style={{ padding: '10px' }}>{v.end_date}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{v.days_count}</td>
                        <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleApproveVacation(v.id, v.employee_id)}
                            disabled={approvingId === v.id}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              backgroundColor: approvingId === v.id ? '#9ca3af' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: approvingId === v.id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FaCheck size={10} />
                            {approvingId === v.id ? 'Aprobando...' : 'Aprobar'}
                          </button>
                          <button
                            onClick={() => handleRejectVacation(v.id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FaTimes size={10} />
                            Rechazar
                          </button>
                          <Link href={`/employees/${v.employee_id}/vacations`}>
                            <button
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Ver Detalle
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Trabajadores y sus Vacaciones</h2>
            {employees.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
                No hay trabajadores activos.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Trabajador</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>RUT</th>
                      <th 
                        style={{ 
                          textAlign: 'right', 
                          padding: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleSort('totalAccumulated')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          Total Acumulado
                          {sortColumn === 'totalAccumulated' ? (
                            sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                          ) : (
                            <FaSort style={{ opacity: 0.3 }} />
                          )}
                        </div>
                      </th>
                      <th 
                        style={{ 
                          textAlign: 'right', 
                          padding: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleSort('totalUsed')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          Total Usado
                          {sortColumn === 'totalUsed' ? (
                            sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                          ) : (
                            <FaSort style={{ opacity: 0.3 }} />
                          )}
                        </div>
                      </th>
                      <th 
                        style={{ 
                          textAlign: 'right', 
                          padding: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleSort('totalAvailable')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          Total Disponible
                          {sortColumn === 'totalAvailable' ? (
                            sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                          ) : (
                            <FaSort style={{ opacity: 0.3 }} />
                          )}
                        </div>
                      </th>
                      <th 
                        style={{ 
                          textAlign: 'center', 
                          padding: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleSort('periods')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          Períodos
                          {sortColumn === 'periods' ? (
                            sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                          ) : (
                            <FaSort style={{ opacity: 0.3 }} />
                          )}
                        </div>
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEmployees.map((emp) => (
                      <tr 
                        key={emp.id}
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f9fafb'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white'
                        }}
                        onClick={() => handleEmployeeClick(emp.id)}
                      >
                        <td style={{ padding: '12px', fontWeight: '500' }}>{emp.full_name}</td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>{emp.rut}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#0369a1' }}>
                          {emp.totalAccumulated.toFixed(2)} días
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>
                          {emp.totalUsed} días
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'right', 
                          fontWeight: 'bold',
                          color: emp.totalAvailable >= 0 ? '#059669' : '#dc2626' 
                        }}>
                          {emp.totalAvailable.toFixed(2)} días
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                          {emp.periods.length} período{emp.periods.length !== 1 ? 's' : ''}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEmployeeClick(emp.id)
                            }}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

