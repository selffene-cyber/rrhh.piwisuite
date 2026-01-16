'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaExclamationTriangle, FaFileAlt, FaUser, FaCalendarAlt, FaSort, FaSortUp, FaSortDown, FaEye, FaEdit, FaTrash, FaFilePdf, FaPlus } from 'react-icons/fa'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  under_review: 'En Revisión',
  approved: 'Aprobada',
  issued: 'Emitida',
  acknowledged: 'Acusada Recibo',
  void: 'Anulada',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  under_review: '#f59e0b',
  approved: '#3b82f6',
  issued: '#10b981',
  acknowledged: '#059669',
  void: '#ef4444',
}

interface EmployeeDisciplinaryData {
  id: string
  full_name: string
  rut: string
  totalActions: number
  writtenActions: number
  verbalActions: number
  pendingReview: number
  issuedActions: number
  recentActions: any[]
}

export default function DisciplinaryActionsDashboardPage() {
  const { company: currentCompany, companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeeDisciplinaryData[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false)
  const [stats, setStats] = useState({
    totalActions: 0,
    totalWritten: 0,
    totalVerbal: 0,
    pendingReview: 0,
    issuedActions: 0,
    employeesWithActions: 0,
  })
  const [sortColumn, setSortColumn] = useState<string>('totalActions')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    if (currentCompany && companyId) {
      loadData()
    } else {
      setEmployees([])
      setLoading(false)
    }
  }, [currentCompany, companyId, filterStatus, filterType])

  const loadData = async () => {
    if (!currentCompany || !companyId) return

    try {
      setLoading(true)

      // Obtener todas las amonestaciones de la empresa
      const response = await fetch(
        `/api/disciplinary-actions?company_id=${currentCompany.id}`
      )
      const actions = await response.json()

      // Obtener IDs únicos de empleados que tienen amonestaciones
      const employeeIdsWithActions = [...new Set(actions.map((a: any) => a.employee_id))]
      
      // Cargar datos de todos los empleados que tienen amonestaciones (sin filtrar por estado)
      let employeesData: any[] = []
      if (employeeIdsWithActions.length > 0) {
        const { data } = await supabase
          .from('employees')
          .select('id, full_name, rut')
          .in('id', employeeIdsWithActions)
          .eq('company_id', companyId)
        employeesData = data || []
      }
      
      // También cargar trabajadores activos y con licencia médica para mostrar en la lista completa
      const { data: activeEmployeesData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .in('status', ['active', 'licencia_medica'])
        .eq('company_id', companyId)
        .order('full_name', { ascending: true })
      
      // Combinar ambos conjuntos, dando prioridad a los datos de empleados con acciones
      const allEmployeesData = [...employeesData, ...(activeEmployeesData || [])]
      const uniqueEmployeesData = Array.from(
        new Map(allEmployeesData.map((emp: any) => [emp.id, emp])).values()
      )

      // Agrupar amonestaciones por trabajador
      const employeesMap = new Map<string, EmployeeDisciplinaryData>()

      // Inicializar todos los trabajadores
      uniqueEmployeesData.forEach((emp: any) => {
        employeesMap.set(emp.id, {
          id: emp.id,
          full_name: emp.full_name,
          rut: emp.rut,
          totalActions: 0,
          writtenActions: 0,
          verbalActions: 0,
          pendingReview: 0,
          issuedActions: 0,
          recentActions: [],
        })
      })

      // Procesar amonestaciones
      actions.forEach((action: any) => {
        const empId = action.employee_id
        if (!employeesMap.has(empId)) {
          // Si el trabajador no está en el mapa inicial, obtener sus datos desde la acción
          // La API devuelve los datos del empleado en action.employee o action.employees
          const employeeData = action.employee || action.employees
          if (employeeData && employeeData.full_name && employeeData.rut) {
            employeesMap.set(empId, {
              id: empId,
              full_name: employeeData.full_name,
              rut: employeeData.rut,
              totalActions: 0,
              writtenActions: 0,
              verbalActions: 0,
              pendingReview: 0,
              issuedActions: 0,
              recentActions: [],
            })
          } else {
            // Si aún no tenemos los datos, buscar en uniqueEmployeesData
            const foundEmployee = uniqueEmployeesData.find((e: any) => e.id === empId)
            if (foundEmployee) {
              employeesMap.set(empId, {
                id: empId,
                full_name: foundEmployee.full_name,
                rut: foundEmployee.rut,
                totalActions: 0,
                writtenActions: 0,
                verbalActions: 0,
                pendingReview: 0,
                issuedActions: 0,
                recentActions: [],
              })
            } else {
              console.warn(`No se encontraron datos del empleado ${empId} en la acción ni en la base de datos`)
            }
          }
        }

        const emp = employeesMap.get(empId)!
        emp.totalActions++
        
        if (action.type === 'written') {
          emp.writtenActions++
        } else {
          emp.verbalActions++
        }

        if (action.status === 'under_review' || action.status === 'draft') {
          emp.pendingReview++
        }

        if (action.status === 'issued' || action.status === 'acknowledged') {
          emp.issuedActions++
        }

        // Agregar a acciones recientes (últimas 3)
        emp.recentActions.push(action)
        emp.recentActions.sort((a, b) => 
          new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime()
        )
        emp.recentActions = emp.recentActions.slice(0, 3)
      })

      // Convertir a array y filtrar
      let employeesArray = Array.from(employeesMap.values())

      // Aplicar filtros
      if (filterStatus !== 'all') {
        if (filterStatus === 'with_actions') {
          employeesArray = employeesArray.filter(emp => emp.totalActions > 0)
        } else if (filterStatus === 'pending') {
          employeesArray = employeesArray.filter(emp => emp.pendingReview > 0)
        }
      }

      if (filterType !== 'all') {
        if (filterType === 'written') {
          employeesArray = employeesArray.filter(emp => emp.writtenActions > 0)
        } else if (filterType === 'verbal') {
          employeesArray = employeesArray.filter(emp => emp.verbalActions > 0)
        }
      }

      setEmployees(employeesArray)

      // Calcular estadísticas generales
      const totalActions = actions.length
      const totalWritten = actions.filter((a: any) => a.type === 'written').length
      const totalVerbal = actions.filter((a: any) => a.type === 'verbal').length
      const pendingReview = actions.filter((a: any) => 
        a.status === 'under_review' || a.status === 'draft'
      ).length
      const issuedActions = actions.filter((a: any) => 
        a.status === 'issued' || a.status === 'acknowledged'
      ).length
      const employeesWithActions = employeesArray.filter(emp => emp.totalActions > 0).length

      setStats({
        totalActions,
        totalWritten,
        totalVerbal,
        pendingReview,
        issuedActions,
        employeesWithActions,
      })
    } catch (error: any) {
      console.error('Error al cargar amonestaciones:', error)
      alert('Error al cargar amonestaciones: ' + error.message)
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
      case 'totalActions':
        aValue = a.totalActions
        bValue = b.totalActions
        break
      case 'writtenActions':
        aValue = a.writtenActions
        bValue = b.writtenActions
        break
      case 'verbalActions':
        aValue = a.verbalActions
        bValue = b.verbalActions
        break
      case 'pendingReview':
        aValue = a.pendingReview
        bValue = b.pendingReview
        break
      default:
        aValue = 0
        bValue = 0
    }

    if (sortDirection === 'asc') {
      return aValue - bValue
    }
    return bValue - aValue
  })

  if (!currentCompany) {
    return (
      <div>
        <h1>Cartas de Amonestación</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver las amonestaciones.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <h1>Cartas de Amonestación</h1>
        <div className="card">
          <p>Cargando amonestaciones...</p>
        </div>
      </div>
    )
  }

  const selectedEmployeeData = selectedEmployee
    ? employees.find(emp => emp.id === selectedEmployee)
    : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Cartas de Amonestación</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/disciplinary-actions/new">
            <button style={{ 
              backgroundColor: '#ef4444', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <FaPlus /> Nueva Amonestación
            </button>
          </Link>
          <Link href="/employees">
            <button className="secondary">Ver Trabajadores</button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {/* Card 1: Total Amonestaciones */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px',
          border: '2px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaExclamationTriangle size={24} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#92400e', fontWeight: '600' }}>
              Total Amonestaciones
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#92400e', margin: '8px 0' }}>
            {stats.totalActions}
          </p>
          <p style={{ fontSize: '11px', color: '#92400e', margin: 0, opacity: 0.8 }}>
            {stats.totalWritten} escritas, {stats.totalVerbal} verbales
          </p>
        </div>

        {/* Card 2: En Revisión */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          borderRadius: '12px',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaFileAlt size={24} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
              En Revisión
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: '8px 0' }}>
            {stats.pendingReview}
          </p>
          <p style={{ fontSize: '11px', color: '#1e40af', margin: 0, opacity: 0.8 }}>
            Requieren atención
          </p>
        </div>

        {/* Card 3: Emitidas */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
          borderRadius: '12px',
          border: '2px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaFilePdf size={24} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#065f46', fontWeight: '600' }}>
              Emitidas
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#065f46', margin: '8px 0' }}>
            {stats.issuedActions}
          </p>
          <p style={{ fontSize: '11px', color: '#065f46', margin: 0, opacity: 0.8 }}>
            Procesadas y notificadas
          </p>
        </div>

        {/* Card 4: Trabajadores */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
          borderRadius: '12px',
          border: '2px solid #ec4899'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaUser size={24} color="#ec4899" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#be185d', fontWeight: '600' }}>
              Trabajadores
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#be185d', margin: '8px 0' }}>
            {stats.employeesWithActions}
          </p>
          <p style={{ fontSize: '11px', color: '#be185d', margin: 0, opacity: 0.8 }}>
            Con amonestaciones registradas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Filtros</h2>
        <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="form-group">
            <label>Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="with_actions">Con Amonestaciones</option>
              <option value="pending">Con Pendientes</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="written">Solo Escritas</option>
              <option value="verbal">Solo Verbales</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Trabajadores */}
      <div className="card">
        <h2>Resumen por Trabajador</h2>
        {sortedEmployees.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay trabajadores que coincidan con los filtros seleccionados.
          </p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        onClick={() => handleSort('full_name')}
                      >
                        Trabajador
                        {sortColumn === 'full_name' && (
                          sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                        )}
                        {sortColumn !== 'full_name' && <FaSort style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        onClick={() => handleSort('totalActions')}
                      >
                        Total
                        {sortColumn === 'totalActions' && (
                          sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                        )}
                        {sortColumn !== 'totalActions' && <FaSort style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th>Escritas</th>
                    <th>Verbales</th>
                    <th>En Revisión</th>
                    <th>Emitidas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div>
                          <strong>{employee.full_name}</strong>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{employee.rut}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {employee.totalActions}
                      </td>
                      <td style={{ textAlign: 'center' }}>{employee.writtenActions}</td>
                      <td style={{ textAlign: 'center' }}>{employee.verbalActions}</td>
                      <td style={{ textAlign: 'center' }}>
                        {employee.pendingReview > 0 ? (
                          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                            {employee.pendingReview}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>{employee.issuedActions}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Link href={`/employees/${employee.id}/disciplinary-actions`}>
                            <button
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <FaEye /> Ver
                            </button>
                          </Link>
                          {employee.recentActions && employee.recentActions.length > 0 && (
                            <Link 
                              href={`/employees/${employee.id}/disciplinary-actions/${employee.recentActions[0].id}/pdf`}
                              target="_blank"
                            >
                              <button
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                                title="Generar PDF de la amonestación más reciente"
                              >
                                <FaFilePdf /> PDF
                              </button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Detalle del Trabajador Seleccionado */}
      {showEmployeeDetail && selectedEmployeeData && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Amonestaciones de {selectedEmployeeData.full_name}</h2>
            <button onClick={() => setShowEmployeeDetail(false)} className="secondary">
              Cerrar
            </button>
          </div>
          {selectedEmployeeData.recentActions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              No hay amonestaciones registradas para este trabajador.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Lugar</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmployeeData.recentActions.map((action: any) => (
                    <tr key={action.id}>
                      <td>{formatDate(action.incident_date)}</td>
                      <td>{action.type === 'written' ? 'Escrita' : 'Verbal'}</td>
                      <td>{action.location || '-'}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: STATUS_COLORS[action.status] || '#6b7280',
                            color: 'white',
                          }}
                        >
                          {STATUS_LABELS[action.status] || action.status}
                        </span>
                      </td>
                      <td>
                        <Link href={`/employees/${selectedEmployeeData.id}/disciplinary-actions/${action.id}`}>
                          <button
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                            }}
                          >
                            Ver
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

