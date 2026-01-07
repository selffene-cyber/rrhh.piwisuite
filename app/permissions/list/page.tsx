'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaArrowLeft, FaEye, FaFilePdf, FaFilter, FaTrash } from 'react-icons/fa'
import { useCompanyPermissions } from '@/lib/hooks/useCompanyPermissions'

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

export default function PermissionsListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company: currentCompany } = useCurrentCompany()
  const { isSuperAdmin, companyRole } = useCompanyPermissions()
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<any[]>([])
  
  // Filtros desde query params
  const initialStatus = searchParams.get('status') || 'all'
  const initialFilter = searchParams.get('filter') || 'all'
  
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus)
  const [filterType, setFilterType] = useState<string>(initialFilter)
  
  // Verificar si el usuario puede eliminar permisos
  const canDelete = isSuperAdmin || companyRole === 'owner' || companyRole === 'admin'

  useEffect(() => {
    if (currentCompany) {
      loadPermissions()
    }
  }, [currentCompany, filterStatus, filterType])

  useEffect(() => {
    // Actualizar URL cuando cambian los filtros
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterType !== 'all') params.set('filter', filterType)
    const queryString = params.toString()
    router.replace(`/permissions/list${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }, [filterStatus, filterType, router])

  const loadPermissions = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)
      
      // Construir query params para la API
      const params = new URLSearchParams()
      params.set('company_id', currentCompany.id)
      
      if (filterStatus !== 'all') {
        params.set('status', filterStatus)
      }
      
      if (filterType === 'with_pay') {
        // Filtrar permisos con goce (todos excepto VOLUNTARY_NO_GOCE)
        // Esto se hará en el frontend después de obtener los datos
      } else if (filterType === 'without_pay') {
        params.set('permission_type_code', 'VOLUNTARY_NO_GOCE')
      }

      const response = await fetch(`/api/permissions?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar permisos')
      
      let data = await response.json()
      
      // Aplicar filtro de "with_pay" en el frontend si es necesario
      if (filterType === 'with_pay') {
        data = data.filter((p: any) => p.permission_type_code !== 'VOLUNTARY_NO_GOCE')
      }

      // Obtener información de empleados y tipos de permiso
      const employeeIds = [...new Set(data.map((p: any) => p.employee_id))]
      const permissionTypeIds = [...new Set(data.map((p: any) => p.permission_type_id).filter(Boolean))]

      let employeesMap = new Map()
      if (employeeIds.length > 0) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, full_name, rut')
          .in('id', employeeIds)
        
        employeesData?.forEach((emp: any) => {
          employeesMap.set(emp.id, emp)
        })
      }

      let permissionTypesMap = new Map()
      if (permissionTypeIds.length > 0) {
        const { data: typesData } = await supabase
          .from('permission_types')
          .select('id, name, code')
          .in('id', permissionTypeIds)
        
        typesData?.forEach((type: any) => {
          permissionTypesMap.set(type.id, type)
        })
      }

      // Enriquecer datos con información de empleados y tipos
      const enrichedData = data.map((perm: any) => ({
        ...perm,
        employees: employeesMap.get(perm.employee_id) || null,
        permission_types: permissionTypesMap.get(perm.permission_type_id) || null,
      }))

      // Ordenar por fecha más reciente
      enrichedData.sort(
        (a: any, b: any) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime()
      )

      setPermissions(enrichedData)
    } catch (error) {
      console.error('Error al cargar permisos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilterLabel = () => {
    if (filterStatus !== 'all') {
      return `Estado: ${STATUS_LABELS[filterStatus] || filterStatus}`
    }
    if (filterType === 'with_pay') {
      return 'Con Goce de Sueldo'
    }
    if (filterType === 'without_pay') {
      return 'Sin Goce de Sueldo'
    }
    return 'Todos los Permisos'
  }

  const handleDelete = async (permissionId: string) => {
    if (!confirm('¿Está seguro de eliminar este permiso? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar permiso')
      }

      alert('Permiso eliminado correctamente')
      loadPermissions() // Recargar la lista
    } catch (error: any) {
      alert('Error al eliminar permiso: ' + error.message)
    }
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
        <div>
          <Link href="/permissions" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#3b82f6', textDecoration: 'none' }}>
            <FaArrowLeft /> Volver al Dashboard
          </Link>
          <h1 style={{ margin: 0 }}>Listado de Permisos</h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>{getFilterLabel()}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FaFilter style={{ color: '#6b7280' }} />
          <h3 style={{ margin: 0, fontSize: '16px' }}>Filtros</h3>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Estado:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '150px' }}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="requested">Solicitado</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="applied">Aplicado</option>
              <option value="void">Anulado</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Tipo:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '150px' }}
            >
              <option value="all">Todos</option>
              <option value="with_pay">Con Goce</option>
              <option value="without_pay">Sin Goce</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de permisos */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Permisos ({permissions.length})</h2>
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
              {permissions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No hay permisos que coincidan con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                permissions.map((perm) => (
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
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FaEye size={12} />
                            Ver
                          </button>
                        </Link>
                        {(perm.status === 'approved' || perm.status === 'applied') && (
                          <Link href={`/permissions/${perm.id}/pdf`} target="_blank">
                            <button
                              style={{
                                padding: '4px 8px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <FaFilePdf size={12} />
                              PDF
                            </button>
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(perm.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Eliminar permiso"
                          >
                            <FaTrash size={12} />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

