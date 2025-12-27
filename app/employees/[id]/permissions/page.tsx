'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaCalendarAlt, FaEdit, FaTrash, FaCheckCircle, FaClock, FaTimesCircle, FaFilePdf, FaEye } from 'react-icons/fa'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobado',
  applied: 'Aplicado',
  void: 'Anulado',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  approved: '#3b82f6',
  applied: '#10b981',
  void: '#ef4444',
}

export default function EmployeePermissionsPage({
  params,
}: {
  params: { id: string }
}) {
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [permissions, setPermissions] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar trabajador
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', params.id)
        .single()

      setEmployee(empData)

      // Cargar permisos
      const { data: companyData } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', params.id)
        .single()

      if (companyData) {
        const response = await fetch(
          `/api/permissions?company_id=${companyData.company_id}&employee_id=${params.id}`
        )
        const perms = await response.json()
        setPermissions(perms)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (permissionId: string) => {
    if (!confirm('¿Está seguro de aprobar este permiso?')) return

    try {
      const response = await fetch(`/api/permissions/${permissionId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al aprobar permiso')
      }

      alert('Permiso aprobado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al aprobar permiso: ' + error.message)
    }
  }

  const handleDelete = async (permissionId: string) => {
    if (!confirm('¿Está seguro de eliminar este permiso?')) return

    try {
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar permiso')
      }

      alert('Permiso eliminado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al eliminar permiso: ' + error.message)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1>Permisos - {employee?.full_name || 'Cargando...'}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/employees/${params.id}/permissions/new`}>
            <button>Nuevo Permiso</button>
          </Link>
          <Link href={`/employees/${params.id}`}>
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        {permissions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay permisos registrados para este trabajador
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Motivo</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Fechas</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Días</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Descuento</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm) => (
                <tr key={perm.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>
                      {perm.permission_types?.label || perm.permission_type_code}
                    </div>
                    {perm.permission_types?.affects_payroll && (
                      <div style={{ fontSize: '12px', color: '#ef4444' }}>
                        Sin goce de sueldo
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>{perm.reason}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div>{formatDate(perm.start_date)}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      hasta {formatDate(perm.end_date)}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {perm.days} {perm.hours ? `(${perm.hours}h)` : ''}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {perm.discount_amount > 0 ? (
                      <span style={{ color: '#ef4444' }}>
                        ${perm.discount_amount.toLocaleString('es-CL')}
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>-</span>
                    )}
                  </td>
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
                          }}
                          title="Ver PDF"
                        >
                          <FaEye />
                        </button>
                      </Link>
                      {perm.status === 'draft' && (
                        <button
                          onClick={() => handleApprove(perm.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                          title="Aprobar"
                        >
                          <FaCheckCircle />
                        </button>
                      )}
                      {perm.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(perm.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

