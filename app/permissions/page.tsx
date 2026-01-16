'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaCalendarAlt, FaUser, FaSort, FaSortUp, FaSortDown, FaEye, FaEdit, FaTrash, FaCheckCircle, FaClock, FaTimesCircle, FaFilePdf } from 'react-icons/fa'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  requested: 'Solicitado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  applied: 'Aplicado',
  void: 'Anulado',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  requested: '#f59e0b',
  approved: '#3b82f6',
  rejected: '#ef4444',
  applied: '#10b981',
  void: '#ef4444',
}

interface EmployeePermissionData {
  id: string
  full_name: string
  rut: string
  totalPermissions: number
  withPay: number
  withoutPay: number
  pendingApproval: number
  appliedPermissions: number
  recentPermissions: any[]
}

export default function PermissionsDashboardPage() {
  const { company: currentCompany } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeePermissionData[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false)
  const [stats, setStats] = useState({
    totalPermissions: 0,
    totalWithPay: 0,
    totalWithoutPay: 0,
    pendingApproval: 0,
    appliedPermissions: 0,
    employeesWithPermissions: 0,
  })
  const [sortColumn, setSortColumn] = useState<string>('totalPermissions')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [recentPermissions, setRecentPermissions] = useState<any[]>([])

  useEffect(() => {
    if (currentCompany) {
      loadData()
    }
  }, [currentCompany, filterStatus, filterType])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)

      // Obtener todos los permisos de la empresa
      const response = await fetch(
        `/api/permissions?company_id=${currentCompany.id}`
      )
      const permissions = await response.json()

      // Obtener todos los trabajadores activos
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      // Agrupar permisos por trabajador
      const employeesMap = new Map<string, EmployeePermissionData>()

      // Inicializar todos los trabajadores
      employeesData?.forEach((emp: any) => {
        employeesMap.set(emp.id, {
          id: emp.id,
          full_name: emp.full_name,
          rut: emp.rut,
          totalPermissions: 0,
          withPay: 0,
          withoutPay: 0,
          pendingApproval: 0,
          appliedPermissions: 0,
          recentPermissions: [],
        })
      })

      // Procesar permisos
      permissions.forEach((perm: any) => {
        const empId = perm.employee_id
        if (!employeesMap.has(empId)) return

        const emp = employeesMap.get(empId)!
        emp.totalPermissions++

        // Filtrar por tipo
        const permType = perm.permission_type_code
        if (permType === 'VOLUNTARY_NO_GOCE') {
          emp.withoutPay++
        } else {
          emp.withPay++
        }

        // Filtrar por estado
        if (perm.status === 'draft') {
          emp.pendingApproval++
        } else if (perm.status === 'applied') {
          emp.appliedPermissions++
        }

        // Guardar permisos recientes
        emp.recentPermissions.push(perm)
      })

      // Ordenar permisos recientes por fecha
      employeesMap.forEach((emp) => {
        emp.recentPermissions.sort(
          (a, b) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )
      })

      // Calcular estadísticas generales
      const totalPermissions = permissions.length
      const totalWithPay = permissions.filter(
        (p: any) => p.permission_type_code !== 'VOLUNTARY_NO_GOCE'
      ).length
      const totalWithoutPay = permissions.filter(
        (p: any) => p.permission_type_code === 'VOLUNTARY_NO_GOCE'
      ).length
      const pendingApproval = permissions.filter(
        (p: any) => p.status === 'draft'
      ).length
      const appliedPermissions = permissions.filter(
        (p: any) => p.status === 'applied'
      ).length
      const employeesWithPermissions = Array.from(employeesMap.values()).filter(
        (e) => e.totalPermissions > 0
      ).length

      setStats({
        totalPermissions,
        totalWithPay,
        totalWithoutPay,
        pendingApproval,
        appliedPermissions,
        employeesWithPermissions,
      })

      // Obtener últimos 10 permisos ordenados por fecha con información completa
      const sortedPermissions = [...permissions].sort(
        (a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime()
      )
      
      // Obtener información de empleados y tipos de permiso para los últimos 10
      const recentPerms = sortedPermissions.slice(0, 10)
      const recentEmployeeIds = [...new Set(recentPerms.map((p: any) => p.employee_id))]
      const recentPermissionTypeIds = [...new Set(recentPerms.map((p: any) => p.permission_type_id).filter(Boolean))]

      let recentEmployeesMap = new Map()
      if (recentEmployeeIds.length > 0) {
        const { data: recentEmployeesData } = await supabase
          .from('employees')
          .select('id, full_name, rut')
          .in('id', recentEmployeeIds)
        
        recentEmployeesData?.forEach((emp: any) => {
          recentEmployeesMap.set(emp.id, emp)
        })
      }

      let recentPermissionTypesMap = new Map()
      if (recentPermissionTypeIds.length > 0) {
        const { data: recentTypesData } = await supabase
          .from('permission_types')
          .select('id, name, code')
          .in('id', recentPermissionTypeIds)
        
        recentTypesData?.forEach((type: any) => {
          recentPermissionTypesMap.set(type.id, type)
        })
      }

      // Enriquecer datos
      const enrichedRecentPerms = recentPerms.map((perm: any) => ({
        ...perm,
        employees: recentEmployeesMap.get(perm.employee_id) || null,
        permission_types: recentPermissionTypesMap.get(perm.permission_type_id) || null,
      }))

      setRecentPermissions(enrichedRecentPerms)

      // Filtrar y ordenar
      let filteredEmployees = Array.from(employeesMap.values())

      // Aplicar filtros
      if (filterStatus !== 'all') {
        filteredEmployees = filteredEmployees.filter((emp) => {
          if (filterStatus === 'requested') {
            return emp.recentPermissions.some((p: any) => p.status === 'requested')
          } else if (filterStatus === 'approved') {
            return emp.recentPermissions.some((p: any) => p.status === 'approved')
          } else if (filterStatus === 'rejected') {
            return emp.recentPermissions.some((p: any) => p.status === 'rejected')
          } else if (filterStatus === 'applied') {
            return emp.appliedPermissions > 0
          }
          return true
        })
      }

      if (filterType !== 'all') {
        filteredEmployees = filteredEmployees.filter((emp) => {
          if (filterType === 'with_pay') {
            return emp.withPay > 0
          } else if (filterType === 'without_pay') {
            return emp.withoutPay > 0
          }
          return true
        })
      }

      // Ordenar
      filteredEmployees.sort((a, b) => {
        const aVal = a[sortColumn as keyof EmployeePermissionData] as number
        const bVal = b[sortColumn as keyof EmployeePermissionData] as number
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      })

      setEmployees(filteredEmployees)
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <FaSort className="inline ml-1 text-gray-400" />
    return sortDirection === 'asc' ? (
      <FaSortUp className="inline ml-1" />
    ) : (
      <FaSortDown className="inline ml-1" />
    )
  }

  if (!currentCompany) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          Seleccione una empresa para ver los permisos.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px' }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard de Permisos</h1>
        <Link href="/permissions/new">
          <button>Nuevo Permiso</button>
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Link href="/permissions/list" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
              {stats.totalPermissions}
            </div>
            <div style={{ color: '#6b7280', marginTop: '8px' }}>Total Permisos</div>
          </div>
        </Link>
        <Link href="/permissions/list?filter=with_pay" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              {stats.totalWithPay}
            </div>
            <div style={{ color: '#6b7280', marginTop: '8px' }}>Con Goce de Sueldo</div>
          </div>
        </Link>
        <Link href="/permissions/list?filter=without_pay" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.totalWithoutPay}
            </div>
            <div style={{ color: '#6b7280', marginTop: '8px' }}>Sin Goce de Sueldo</div>
          </div>
        </Link>
        <Link href="/permissions/list?status=draft" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
              {stats.pendingApproval}
            </div>
            <div style={{ color: '#6b7280', marginTop: '8px' }}>Pendientes de Aprobación</div>
          </div>
        </Link>
        <Link href="/permissions/list?status=applied" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>
              {stats.appliedPermissions}
            </div>
            <div style={{ color: '#6b7280', marginTop: '8px' }}>Aplicados a Liquidación</div>
          </div>
        </Link>
        <Link href="/permissions/list" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
              {stats.employeesWithPermissions}
            </div>
            <div style={{ color: '#6b7280', marginTop: '8px' }}>Trabajadores con Permisos</div>
          </div>
        </Link>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Estado:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="all">Todos</option>
              <option value="requested">Solicitado</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="applied">Aplicado</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Tipo:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="all">Todos</option>
              <option value="with_pay">Con Goce</option>
              <option value="without_pay">Sin Goce</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de últimos 10 permisos */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Últimos Permisos</h2>
          <Link href="/permissions/list">
            <button style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Ver Todos
            </button>
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Trabajador</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Período</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Días</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recentPermissions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No hay permisos registrados
                  </td>
                </tr>
              ) : (
                recentPermissions.map((perm: any) => (
                  <tr key={perm.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{perm.employees?.full_name || '-'}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{perm.employees?.rut || '-'}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {perm.permission_types?.name || perm.permission_type_code || '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {formatDate(perm.start_date)} - {formatDate(perm.end_date)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{perm.days || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: STATUS_COLORS[perm.status] || '#6b7280',
                          color: 'white',
                          fontSize: '12px',
                        }}
                      >
                        {STATUS_LABELS[perm.status] || perm.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <Link href={`/employees/${perm.employee_id}/permissions`}>
                        <button
                          style={{
                            padding: '4px 8px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          <FaEye style={{ marginRight: '4px' }} />
                          Ver
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de resumen por trabajador */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Resumen por Trabajador</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th
                  style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => handleSort('full_name')}
                >
                  Trabajador <SortIcon column="full_name" />
                </th>
                <th
                  style={{ padding: '12px', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => handleSort('totalPermissions')}
                >
                  Total <SortIcon column="totalPermissions" />
                </th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Con Goce</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Sin Goce</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Pendientes</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Aplicados</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No hay permisos registrados
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{emp.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.rut}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{emp.totalPermissions}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{emp.withPay}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{emp.withoutPay}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {emp.pendingApproval > 0 ? (
                        <span style={{ color: '#f59e0b' }}>{emp.pendingApproval}</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {emp.appliedPermissions > 0 ? (
                        <span style={{ color: '#10b981' }}>{emp.appliedPermissions}</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp.id)
                          setShowEmployeeDetail(true)
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <FaEye style={{ marginRight: '4px' }} />
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalle del trabajador */}
      {showEmployeeDetail && selectedEmployee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowEmployeeDetail(false)
            setSelectedEmployee(null)
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>
                Permisos de{' '}
                {employees.find((e) => e.id === selectedEmployee)?.full_name}
              </h2>
              <button
                onClick={() => {
                  setShowEmployeeDetail(false)
                  setSelectedEmployee(null)
                }}
              >
                Cerrar
              </button>
            </div>
            <div>
              <Link href={`/employees/${selectedEmployee}/permissions`}>
                <button style={{ marginBottom: '16px' }}>Ver Todos los Permisos</button>
              </Link>
              {employees
                .find((e) => e.id === selectedEmployee)
                ?.recentPermissions.slice(0, 10)
                .map((perm: any) => (
                  <div
                    key={perm.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {perm.permission_types?.label || perm.permission_type_code}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          {formatDate(perm.start_date)} - {formatDate(perm.end_date)} ({perm.days} días)
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Motivo: {perm.reason}
                        </div>
                        {perm.discount_amount > 0 && (
                          <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                            Descuento: ${perm.discount_amount.toLocaleString('es-CL')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: STATUS_COLORS[perm.status] || '#6b7280',
                            color: 'white',
                            fontSize: '12px',
                          }}
                        >
                          {STATUS_LABELS[perm.status] || perm.status}
                        </span>
                        {perm.status === 'requested' && (
                          <>
                            <button
                              style={{
                                padding: '4px 8px',
                                background: '#22c55e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/permissions/${perm.id}/approve`, {
                                    method: 'POST',
                                  })
                                  const result = await response.json()
                                  if (!response.ok) throw new Error(result.error || 'Error al aprobar')
                                  alert('Permiso aprobado exitosamente')
                                  loadData()
                                } catch (error: any) {
                                  alert(error.message)
                                }
                              }}
                            >
                              Aprobar
                            </button>
                            <button
                              style={{
                                padding: '4px 8px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                              onClick={async () => {
                                const reason = prompt('Ingrese el motivo del rechazo:')
                                if (!reason || !reason.trim()) return
                                try {
                                  const response = await fetch(`/api/permissions/${perm.id}/reject`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ rejection_reason: reason }),
                                  })
                                  const result = await response.json()
                                  if (!response.ok) throw new Error(result.error || 'Error al rechazar')
                                  alert('Permiso rechazado')
                                  loadData()
                                } catch (error: any) {
                                  alert('Error: ' + error.message)
                                }
                              }}
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {(perm.status === 'approved' || perm.status === 'applied') && (
                          <Link href={`/permissions/${perm.id}/pdf`} target="_blank">
                            <button
                              style={{
                                padding: '4px 8px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Ver PDF"
                            >
                              <FaFilePdf /> Ver PDF
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

