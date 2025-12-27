'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Employee } from '@/types'
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

const ITEMS_PER_PAGE = 50

export default function EmployeesPage() {
  const { company, companyId } = useCurrentCompany()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const totalPages = useMemo(() => Math.ceil(totalCount / ITEMS_PER_PAGE), [totalCount])

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    } else {
      setEmployees([])
      setLoading(false)
    }
  }, [companyId, currentPage, loadEmployees])

  const loadEmployees = useCallback(async () => {
    if (!companyId) return
    
    try {
      setLoading(true)
      
      // Obtener total de registros
      const { count, error: countError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      if (countError) {
        console.error('Error al contar trabajadores:', countError)
      } else {
        setTotalCount(count || 0)
      }

      // Obtener página actual
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, afp, health_system, base_salary, status, company_id')
        .eq('company_id', companyId)
        .order('full_name')
        .range(from, to)

      if (fetchError) {
        console.error('Error al cargar trabajadores:', fetchError)
        setError(fetchError.message)
        return
      }

      setEmployees(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error inesperado:', err)
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [companyId, currentPage])

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${employee.full_name}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id)

      if (deleteError) {
        console.error('Error al eliminar trabajador:', deleteError)
        alert('Error al eliminar trabajador: ' + deleteError.message)
        return
      }

      // Recargar la lista
      loadEmployees()
    } catch (err: any) {
      console.error('Error inesperado:', err)
      alert('Error al eliminar trabajador: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Trabajadores</h1>
        <div className="card">
          <p>Cargando trabajadores...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1>Trabajadores</h1>
        <div className="card" style={{ background: '#fee2e2', borderColor: '#dc2626' }}>
          <h2 style={{ color: '#991b1b' }}>Error al cargar trabajadores</h2>
          <p style={{ color: '#991b1b' }}>{error}</p>
          <button onClick={loadEmployees} style={{ marginTop: '16px' }}>Reintentar</button>
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
        <h1>Trabajadores</h1>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <button onClick={loadEmployees} className="secondary" style={{ padding: '8px 16px' }}>
            Actualizar
          </button>
          <Link href="/contracts">
            <button 
              style={{ 
                background: '#fbbf24', 
                color: '#000',
                fontWeight: '600',
                padding: '8px 16px'
              }}
            >
              Generar Contrato/Anexo
            </button>
          </Link>
          <Link href="/employees/new">
            <button>Nuevo Trabajador</button>
          </Link>
          <Link href="/employees/form-pdf">
            <button style={{ 
              background: '#10b981',
              color: 'white'
            }}>
              Formulario de Registro (PDF)
            </button>
          </Link>
        </div>
      </div>

      <div className="card">
        {employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p>No hay trabajadores registrados.</p>
            <Link href="/employees/new">
              <button style={{ marginTop: '16px' }}>Crear Primer Trabajador</button>
            </Link>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '16px', color: '#6b7280' }}>
              Mostrando {employees.length} de {totalCount} trabajador{totalCount !== 1 ? 'es' : ''}
            </p>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                >
                  Anterior
                </button>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                >
                  Siguiente
                </button>
              </div>
            )}
            
            {/* Tabla Desktop */}
            <div className="table-mobile-hidden">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>RUT</th>
                    <th>Cargo</th>
                    <th>AFP</th>
                    <th>Sistema de Salud</th>
                    <th>Sueldo Base</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee: Employee) => (
                    <tr key={employee.id}>
                      <td>{employee.full_name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{employee.rut}</td>
                      <td>{employee.position}</td>
                      <td>{employee.afp}</td>
                      <td>{employee.health_system}</td>
                      <td>${employee.base_salary.toLocaleString('es-CL')}</td>
                      <td>
                        <span className={`badge ${employee.status}`}>
                          {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Link href={`/employees/${employee.id}`}>
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
                          <Link href={`/employees/${employee.id}/edit`}>
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
                              title="Editar"
                            >
                              <FaPencilAlt style={{ fontSize: '14px', color: '#f59e0b' }} />
                            </button>
                          </Link>
                          <button 
                            onClick={() => handleDelete(employee)}
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
                            title="Eliminar"
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

            {/* Cards Mobile */}
            <div className="table-mobile-card">
              {employees.map((employee: Employee) => (
                <div key={employee.id} className="mobile-card">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Nombre</span>
                    <span className="mobile-card-value" style={{ fontWeight: '600' }}>
                      {employee.full_name}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">RUT</span>
                    <span className="mobile-card-value">{employee.rut}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Cargo</span>
                    <span className="mobile-card-value">{employee.position || '-'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">AFP</span>
                    <span className="mobile-card-value">{employee.afp || '-'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Sistema de Salud</span>
                    <span className="mobile-card-value">{employee.health_system || '-'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Sueldo Base</span>
                    <span className="mobile-card-value">${employee.base_salary.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Estado</span>
                    <span className="mobile-card-value">
                      <span className={`badge ${employee.status}`}>
                        {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </span>
                  </div>
                  <div className="mobile-card-actions">
                    <Link href={`/employees/${employee.id}`} style={{ flex: 1 }}>
                      <button style={{ width: '100%', padding: '8px', fontSize: '14px' }}>
                        <FaEye style={{ marginRight: '6px' }} />
                        Ver
                      </button>
                    </Link>
                    <Link href={`/employees/${employee.id}/edit`} style={{ flex: 1 }}>
                      <button 
                        className="secondary" 
                        style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                      >
                        <FaPencilAlt style={{ marginRight: '6px' }} />
                        Editar
                      </button>
                    </Link>
                    <button 
                      onClick={() => handleDelete(employee)}
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

