'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaExclamationTriangle, FaFileAlt, FaUser, FaCalendarAlt, FaSort, FaSortUp, FaSortDown, FaEye, FaEdit, FaTrash, FaFilePdf } from 'react-icons/fa'

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
  const { company: currentCompany } = useCurrentCompany()
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
    if (currentCompany) {
      loadData()
    }
  }, [currentCompany, filterStatus, filterType])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)

      // Obtener todas las amonestaciones de la empresa
      const response = await fetch(
        `/api/disciplinary-actions?company_id=${currentCompany.id}`
      )
      const actions = await response.json()

      // Obtener todos los trabajadores activos
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      // Agrupar amonestaciones por trabajador
      const employeesMap = new Map<string, EmployeeDisciplinaryData>()

      // Inicializar todos los trabajadores
      employeesData?.forEach((emp) => {
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
          // Si el trabajador no está activo, crear entrada temporal
          employeesMap.set(empId, {
            id: empId,
            full_name: action.employee?.full_name || 'Trabajador Inactivo',
            rut: action.employee?.rut || 'N/A',
            totalActions: 0,
            writtenActions: 0,
            verbalActions: 0,
            pendingReview: 0,
            issuedActions: 0,
            recentActions: [],
          })
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
        <Link href="/employees">
          <button className="secondary">Ver Trabajadores</button>
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '1px solid #fbbf24',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <FaExclamationTriangle style={{ fontSize: '24px', color: '#f59e0b' }} />
            <h3 style={{ margin: 0, color: '#111827' }}>Total Amonestaciones</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
            {stats.totalActions}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {stats.totalWritten} escritas, {stats.totalVerbal} verbales
          </div>
        </div>

        <div className="card" style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          border: '1px solid #60a5fa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <FaFileAlt style={{ fontSize: '24px', color: '#3b82f6' }} />
            <h3 style={{ margin: 0, color: '#111827' }}>En Revisión</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
            {stats.pendingReview}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Requieren atención
          </div>
        </div>

        <div className="card" style={{
          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
          border: '1px solid #10b981',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <FaFilePdf style={{ fontSize: '24px', color: '#10b981' }} />
            <h3 style={{ margin: 0, color: '#111827' }}>Emitidas</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
            {stats.issuedActions}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Procesadas y notificadas
          </div>
        </div>

        <div className="card" style={{
          background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
          border: '1px solid #f472b6',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <FaUser style={{ fontSize: '24px', color: '#ec4899' }} />
            <h3 style={{ margin: 0, color: '#111827' }}>Trabajadores</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
            {stats.employeesWithActions}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Con amonestaciones registradas
          </div>
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

