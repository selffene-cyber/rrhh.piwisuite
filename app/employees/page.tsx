'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Employee, CostCenter } from '@/types'
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { getCostCenters, isCompanyAdmin } from '@/lib/services/costCenterService'
import { AVAILABLE_AFPS, AVAILABLE_HEALTH_SYSTEMS } from '@/lib/services/previredAPI'
import { getEmployeeStatusLabel } from '@/lib/utils/employeeStatus'
import EmployeeDetailSlide from '@/components/EmployeeDetailSlide'
import { getMultipleEmployeesContractStatus, type EmployeeContractStatus } from '@/lib/services/employeeContractStatus'

const ITEMS_PER_PAGE = 50

export default function EmployeesPage() {
  const { company, companyId } = useCurrentCompany()
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedAFP, setSelectedAFP] = useState<string | null>(null)
  const [selectedHealthSystem, setSelectedHealthSystem] = useState<string | null>(null)
  const [selectedRegime, setSelectedRegime] = useState<string | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [positions, setPositions] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [isSlideOpen, setIsSlideOpen] = useState(false)
  const [contractStatuses, setContractStatuses] = useState<Map<string, EmployeeContractStatus>>(new Map())

  const totalPages = useMemo(() => Math.ceil(totalCount / ITEMS_PER_PAGE), [totalCount])

  const loadEmployees = useCallback(async () => {
    if (!companyId) return
    
    try {
      setLoading(true)
      
      // Obtener página actual
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase
        .from('employees')
        .select('id, full_name, rut, position, afp, health_system, base_salary, status, company_id, cost_center_id, cost_centers(code, name), previsional_regime, other_regime_type', { count: 'exact' })
        .eq('company_id', companyId)

      // Filtrar por CC si está seleccionado
      if (selectedCostCenterId) {
        query = query.eq('cost_center_id', selectedCostCenterId)
      }

      // Filtrar por estado si está seleccionado
      if (selectedStatus) {
        query = query.eq('status', selectedStatus)
      }

      // Filtrar por régimen si está seleccionado
      if (selectedRegime) {
        if (selectedRegime === 'AFP') {
          query = query.eq('previsional_regime', 'AFP')
        } else if (selectedRegime === 'DIPRECA') {
          query = query.eq('other_regime_type', 'DIPRECA')
        } else if (selectedRegime === 'CAPREDENA') {
          query = query.eq('other_regime_type', 'CAPREDENA')
        } else if (selectedRegime === 'SIN_PREVISION') {
          query = query.eq('other_regime_type', 'SIN_PREVISION')
        } else if (selectedRegime === 'OTRO') {
          query = query.eq('other_regime_type', 'OTRO')
        }
      }
      
      // Filtrar por AFP si está seleccionado (solo para régimen AFP)
      if (selectedAFP) {
        query = query.eq('afp', selectedAFP).eq('previsional_regime', 'AFP')
      }

      // Filtrar por sistema de salud si está seleccionado
      if (selectedHealthSystem) {
        if (selectedHealthSystem === 'MANUAL') {
          query = query.eq('previsional_regime', 'OTRO_REGIMEN')
        } else {
          query = query.eq('health_system', selectedHealthSystem).eq('previsional_regime', 'AFP')
        }
      }

      // Filtrar por cargo si está seleccionado
      if (selectedPosition) {
        query = query.eq('position', selectedPosition)
      }

      const { data, error: fetchError, count } = await query
        .order('full_name')
        .range(from, to)

      if (fetchError) {
        console.error('Error al cargar trabajadores:', fetchError)
        setError(fetchError.message)
        return
      }

      setEmployees(data || [])
      setError(null)
      
      // Cargar estados de contratos para los empleados
      if (data && data.length > 0) {
        const employeeIds = data.map((emp: any) => emp.id)
        const statuses = await getMultipleEmployeesContractStatus(employeeIds, supabase)
        setContractStatuses(statuses)
      }
    } catch (err: any) {
      console.error('Error inesperado:', err)
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [companyId, currentPage, selectedCostCenterId, selectedStatus, selectedRegime, selectedAFP, selectedHealthSystem, selectedPosition])

  const loadPositions = useCallback(async () => {
    if (!companyId) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('position')
        .eq('company_id', companyId)
        .not('position', 'is', null)

      if (error) throw error

      // Obtener cargos únicos y ordenarlos
      const uniquePositions = Array.from(new Set((data || []).map((emp: any) => emp.position).filter(Boolean)))
        .sort() as string[]
      setPositions(uniquePositions)
    } catch (error) {
      console.error('Error al cargar cargos:', error)
    }
  }, [companyId])

  const checkAdminStatus = async () => {
    if (!companyId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const admin = await isCompanyAdmin(user.id, companyId, supabase)
      setIsAdmin(admin)
    } catch (error) {
      console.error('Error verificando permisos:', error)
    }
  }

  const loadCostCenters = async () => {
    if (!companyId) return

    try {
      const data = await getCostCenters(companyId, supabase, false)
      setCostCenters(data)
    } catch (error) {
      console.error('Error al cargar centros de costo:', error)
    }
  }

  useEffect(() => {
    if (companyId) {
      loadCostCenters()
      loadPositions()
      checkAdminStatus()
    }
  }, [companyId, loadPositions])

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    } else {
      setEmployees([])
      setLoading(false)
    }
  }, [companyId, currentPage, selectedCostCenterId, selectedStatus, selectedRegime, selectedAFP, selectedHealthSystem, selectedPosition, loadEmployees])

  const handleDelete = async (employee: any) => {
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
  
  // Función helper para renderizar badge de contrato
  const getContractBadge = (employeeId: string) => {
    const contractStatus = contractStatuses.get(employeeId)
    
    if (!contractStatus || !contractStatus.hasActiveContract) {
      return (
        <span
          className="badge"
          style={{
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fbbf24',
            fontSize: '11px',
            fontWeight: '600'
          }}
        >
          ⚠️ Sin contrato
        </span>
      )
    }
    
    const { expiration } = contractStatus
    
    // Si no hay expiration o está activo (>30 días), no mostrar badge
    if (!expiration || expiration.status === 'active') {
      return null
    }
    
    return (
      <span
        className="badge"
        style={{
          background: expiration.color + '20',
          color: expiration.color,
          border: `1px solid ${expiration.color}`,
          fontSize: '11px',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {expiration.icon} {expiration.message}
      </span>
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

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Filtros</h3>
        <div className="form-row">
          {costCenters.length > 0 && (
            <div className="form-group">
              <label>Centro de Costo</label>
              <select
                value={selectedCostCenterId || ''}
                onChange={(e) => {
                  setSelectedCostCenterId(e.target.value || null)
                  setCurrentPage(1)
                }}
              >
                <option value="">Todos</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Estado</label>
            <select
              value={selectedStatus || ''}
              onChange={(e) => {
                setSelectedStatus(e.target.value || null)
                setCurrentPage(1)
              }}
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="licencia_medica">Licencia Médica</option>
              <option value="renuncia">Renuncia</option>
              <option value="despido">Despido</option>
            </select>
          </div>
          <div className="form-group">
            <label>Régimen Previsional</label>
            <select
              value={selectedRegime || ''}
              onChange={(e) => {
                setSelectedRegime(e.target.value || null)
                setCurrentPage(1)
              }}
            >
              <option value="">Todos</option>
              <optgroup label="Sistema AFP">
                <option value="AFP">AFP (Previred)</option>
              </optgroup>
              <optgroup label="Regímenes Especiales">
                <option value="DIPRECA">DIPRECA</option>
                <option value="CAPREDENA">CAPREDENA</option>
                <option value="SIN_PREVISION">Sin Previsión</option>
                <option value="OTRO">Otro Régimen</option>
              </optgroup>
            </select>
          </div>
          <div className="form-group">
            <label>AFP Específica</label>
            <select
              value={selectedAFP || ''}
              onChange={(e) => {
                setSelectedAFP(e.target.value || null)
                setCurrentPage(1)
              }}
            >
              <option value="">Todas</option>
              {AVAILABLE_AFPS.map((afp) => (
                <option key={afp.value} value={afp.value}>
                  {afp.label}
                </option>
              ))}
            </select>
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Solo filtra trabajadores con régimen AFP
            </small>
          </div>
          <div className="form-group">
            <label>Sistema de Salud</label>
            <select
              value={selectedHealthSystem || ''}
              onChange={(e) => {
                setSelectedHealthSystem(e.target.value || null)
                setCurrentPage(1)
              }}
            >
              <option value="">Todos</option>
              {AVAILABLE_HEALTH_SYSTEMS.map((system) => (
                <option key={system.value} value={system.value}>
                  {system.label}
                </option>
              ))}
              <option value="MANUAL">Manual (Régimen Especial)</option>
            </select>
          </div>
          {positions.length > 0 && (
            <div className="form-group">
              <label>Cargo</label>
              <select
                value={selectedPosition || ''}
                onChange={(e) => {
                  setSelectedPosition(e.target.value || null)
                  setCurrentPage(1)
                }}
              >
                <option value="">Todos</option>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {(selectedCostCenterId || selectedStatus || selectedRegime || selectedAFP || selectedHealthSystem || selectedPosition) && (
          <div style={{ marginTop: '12px' }}>
            <button
              className="secondary"
              onClick={() => {
                setSelectedCostCenterId(null)
                setSelectedStatus(null)
                setSelectedRegime(null)
                setSelectedAFP(null)
                setSelectedHealthSystem(null)
                setSelectedPosition(null)
                setCurrentPage(1)
              }}
            >
              Limpiar Filtros
            </button>
          </div>
        )}
      </div>

      <div className="card">
        {employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p>
              No hay trabajadores registrados
              {(selectedCostCenterId || selectedStatus || selectedRegime || selectedAFP || selectedHealthSystem || selectedPosition) 
                ? ' con los filtros seleccionados' 
                : ''}.
            </p>
            {(selectedCostCenterId || selectedStatus || selectedRegime || selectedAFP || selectedHealthSystem || selectedPosition) ? (
              <button
                className="secondary"
                style={{ marginTop: '16px' }}
                onClick={() => {
                  setSelectedCostCenterId(null)
                  setSelectedStatus(null)
                  setSelectedRegime(null)
                  setSelectedAFP(null)
                  setSelectedHealthSystem(null)
                  setSelectedPosition(null)
                  setCurrentPage(1)
                }}
              >
                Limpiar Filtros
              </button>
            ) : (
              <Link href="/employees/new">
                <button style={{ marginTop: '16px' }}>Crear Primer Trabajador</button>
              </Link>
            )}
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
                    <th>Centro de Costo</th>
                    <th>Régimen Previsional</th>
                    <th>Detalle Salud</th>
                    <th>Sueldo Base</th>
                    <th>Estado</th>
                    <th>Contrato</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee: any) => (
                    <tr key={employee.id}>
                      <td>{employee.full_name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{employee.rut}</td>
                      <td>{employee.position}</td>
                      <td>
                        {employee.cost_centers ? (
                          <span style={{ fontSize: '12px' }}>
                            {employee.cost_centers.code} - {employee.cost_centers.name}
                          </span>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                      <td>
                        {employee.previsional_regime === 'AFP' ? (
                          <span style={{ fontSize: '13px' }}>
                            AFP: {employee.afp || '-'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '500' }}>
                            {employee.other_regime_type === 'DIPRECA' ? 'DIPRECA' :
                             employee.other_regime_type === 'CAPREDENA' ? 'CAPREDENA' :
                             employee.other_regime_type === 'SIN_PREVISION' ? 'Sin Previsión' :
                             'Otro Régimen'}
                          </span>
                        )}
                      </td>
                      <td>
                        {employee.previsional_regime === 'AFP' ? (
                          employee.health_system || '-'
                        ) : (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>Manual</span>
                        )}
                      </td>
                      <td>${employee.base_salary.toLocaleString('es-CL')}</td>
                      <td>
                        <span 
                          className="badge"
                          style={{
                            backgroundColor: employee.status === 'active' ? '#10b98120' : 
                                             employee.status === 'inactive' ? '#6b728020' :
                                             employee.status === 'licencia_medica' ? '#f59e0b20' :
                                             employee.status === 'renuncia' ? '#3b82f620' :
                                             employee.status === 'despido' ? '#ef444420' : '#6b728020',
                            color: employee.status === 'active' ? '#10b981' : 
                                   employee.status === 'inactive' ? '#6b7280' :
                                   employee.status === 'licencia_medica' ? '#f59e0b' :
                                   employee.status === 'renuncia' ? '#3b82f6' :
                                   employee.status === 'despido' ? '#ef4444' : '#6b7280',
                            border: `1px solid ${employee.status === 'active' ? '#10b981' : 
                                               employee.status === 'inactive' ? '#6b7280' :
                                               employee.status === 'licencia_medica' ? '#f59e0b' :
                                               employee.status === 'renuncia' ? '#3b82f6' :
                                               employee.status === 'despido' ? '#ef4444' : '#6b7280'}`,
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-block',
                          }}
                        >
                          {employee.status === 'active' ? 'Activo' : 
                           employee.status === 'inactive' ? 'Inactivo' :
                           employee.status === 'licencia_medica' ? 'Licencia Médica' :
                           employee.status === 'renuncia' ? 'Renuncia' :
                           employee.status === 'despido' ? 'Despido' : employee.status}
                        </span>
                      </td>
                      <td>
                        {getContractBadge(employee.id)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            onClick={() => {
                              setSelectedEmployeeId(employee.id)
                              setIsSlideOpen(true)
                            }}
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
              {employees.map((employee: any) => (
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
                    <span className="mobile-card-label">Centro de Costo</span>
                    <span className="mobile-card-value">
                      {employee.cost_centers ? `${employee.cost_centers.code} - ${employee.cost_centers.name}` : '-'}
                    </span>
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
                      <span 
                        className="badge"
                        style={{
                          backgroundColor: employee.status === 'active' ? '#10b98120' : 
                                           employee.status === 'inactive' ? '#6b728020' :
                                           employee.status === 'licencia_medica' ? '#f59e0b20' :
                                           employee.status === 'renuncia' ? '#3b82f620' :
                                           employee.status === 'despido' ? '#ef444420' : '#6b728020',
                          color: employee.status === 'active' ? '#10b981' : 
                                 employee.status === 'inactive' ? '#6b7280' :
                                 employee.status === 'licencia_medica' ? '#f59e0b' :
                                 employee.status === 'renuncia' ? '#3b82f6' :
                                 employee.status === 'despido' ? '#ef4444' : '#6b7280',
                          border: `1px solid ${employee.status === 'active' ? '#10b981' : 
                                             employee.status === 'inactive' ? '#6b7280' :
                                             employee.status === 'licencia_medica' ? '#f59e0b' :
                                             employee.status === 'renuncia' ? '#3b82f6' :
                                             employee.status === 'despido' ? '#ef4444' : '#6b7280'}`,
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'inline-block',
                        }}
                      >
                        {employee.status === 'active' ? 'Activo' : 
                         employee.status === 'inactive' ? 'Inactivo' :
                         employee.status === 'licencia_medica' ? 'Licencia Médica' :
                         employee.status === 'renuncia' ? 'Renuncia' :
                         employee.status === 'despido' ? 'Despido' : employee.status}
                      </span>
                    </span>
                  </div>
                  <div className="mobile-card-actions">
                    <button
                      onClick={() => {
                        setSelectedEmployeeId(employee.id)
                        setIsSlideOpen(true)
                      }}
                      style={{ flex: 1, width: '100%', padding: '8px', fontSize: '14px' }}
                    >
                      <FaEye style={{ marginRight: '6px' }} />
                      Ver
                    </button>
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

      {/* Slide de detalle del empleado */}
      <EmployeeDetailSlide
        employeeId={selectedEmployeeId}
        isOpen={isSlideOpen}
        onClose={() => {
          setIsSlideOpen(false)
          setSelectedEmployeeId(null)
        }}
      />
    </div>
  )
}

