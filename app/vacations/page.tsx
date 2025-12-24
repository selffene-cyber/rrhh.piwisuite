'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getVacationPeriods, syncVacationPeriods, getVacationSummary } from '@/lib/services/vacationPeriods'
import { FaUmbrellaBeach, FaUser, FaCalendarAlt, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'

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
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeeVacationData[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false)
  const [stats, setStats] = useState({
    workersWithMultiplePeriods: 0,
    totalAccumulated: 0,
    workersWithNegativeBalance: 0,
  })
  const [sortColumn, setSortColumn] = useState<string>('totalAccumulated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadEmployeesVacations()
  }, [])

  const loadEmployeesVacations = async () => {
    try {
      setLoading(true)
      
      // Obtener todos los trabajadores activos
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, rut, hire_date')
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      if (empError) throw empError

      if (!employeesData || employeesData.length === 0) {
        setEmployees([])
        setLoading(false)
        return
      }

      // Para cada trabajador, sincronizar períodos y obtener resumen
      const employeesWithVacations = await Promise.all(
        employeesData.map(async (emp) => {
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
        <Link href="/">
          <button className="secondary">Volver al Dashboard</button>
        </Link>
      </div>

      {showEmployeeDetail && selectedEmployeeData ? (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowEmployeeDetail(false)} className="secondary">
              ← Volver a la lista
            </button>
            <h2>{selectedEmployeeData.full_name}</h2>
          </div>
          
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3>Resumen de Vacaciones</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Total Acumulado</label>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>
                  {selectedEmployeeData.totalAccumulated.toFixed(2)} días
                </p>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Total Usado</label>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                  {selectedEmployeeData.totalUsed} días
                </p>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Total Disponible</label>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: selectedEmployeeData.totalAvailable >= 0 ? '#059669' : '#dc2626' }}>
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
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                Trabajadores con Múltiples Períodos
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {stats.workersWithMultiplePeriods}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                {employees.length > 0 
                  ? `${((stats.workersWithMultiplePeriods / employees.length) * 100).toFixed(0)}% del total`
                  : '0%'}
              </div>
            </div>

            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: 'none'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                Total Días Acumulados
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {stats.totalAccumulated.toFixed(0)}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                Entre todos los trabajadores
              </div>
            </div>

            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              border: 'none'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                Con Saldo Negativo
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {stats.workersWithNegativeBalance}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                Días de períodos futuros
              </div>
            </div>
          </div>

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

