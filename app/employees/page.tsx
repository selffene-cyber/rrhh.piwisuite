'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Employee, CostCenter } from '@/types'
import { FaEye, FaPencilAlt, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { getCostCenters, isCompanyAdmin } from '@/lib/services/costCenterService'
import { AVAILABLE_AFPS, AVAILABLE_HEALTH_SYSTEMS } from '@/lib/services/previredAPI'
import { getEmployeeStatusLabel } from '@/lib/utils/employeeStatus'
import EmployeeDetailSlide from '@/components/EmployeeDetailSlide'
import { getMultipleEmployeesContractStatus, type EmployeeContractStatus } from '@/lib/services/employeeContractStatus'

const ITEMS_PER_PAGE = 50

const STATUS_BADGE_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  active: { bg: '#10b98120', color: '#10b981', border: '#10b981', label: 'Activo' },
  inactive: { bg: '#6b728020', color: '#6b7280', border: '#6b7280', label: 'Inactivo' },
  licencia_medica: { bg: '#f59e0b20', color: '#f59e0b', border: '#f59e0b', label: 'Licencia Médica' },
  renuncia: { bg: '#3b82f620', color: '#3b82f6', border: '#3b82f6', label: 'Renuncia' },
  despido: { bg: '#ef444420', color: '#ef4444', border: '#ef4444', label: 'Despido' },
}

const INACTIVE_STATUSES = ['inactive', 'renuncia', 'despido']

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE_STYLE[status] || { bg: '#6b728020', color: '#6b7280', border: '#6b7280', label: status }
  return (
    <span
      className="badge"
      style={{
        backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
        padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'inline-block',
      }}
    >
      {s.label}
    </span>
  )
}

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
  const [showInactive, setShowInactive] = useState(false)

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees])
  const inactiveEmployees = useMemo(() => employees.filter(e => INACTIVE_STATUSES.includes(e.status)), [employees])

  const totalPages = useMemo(() => Math.ceil(totalCount / ITEMS_PER_PAGE), [totalCount])

  const loadEmployees = useCallback(async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase
        .from('employees')
        .select('id, full_name, rut, position, afp, health_system, base_salary, status, company_id, cost_center_id, cost_centers(code, name), previsional_regime, other_regime_type', { count: 'exact' })
        .eq('company_id', companyId)

      if (selectedCostCenterId) query = query.eq('cost_center_id', selectedCostCenterId)
      if (selectedStatus) query = query.eq('status', selectedStatus)
      if (selectedRegime) {
        if (selectedRegime === 'AFP') {
          query = query.eq('previsional_regime', 'AFP')
        } else {
          query = query.eq('other_regime_type', selectedRegime)
        }
      }
      if (selectedAFP) query = query.eq('afp', selectedAFP).eq('previsional_regime', 'AFP')
      if (selectedHealthSystem) {
        if (selectedHealthSystem === 'MANUAL') {
          query = query.eq('previsional_regime', 'OTRO_REGIMEN')
        } else {
          query = query.eq('health_system', selectedHealthSystem).eq('previsional_regime', 'AFP')
        }
      }
      if (selectedPosition) query = query.eq('position', selectedPosition)

      const { data, error: fetchError, count } = await query.order('full_name').range(from, to)

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setEmployees(data || [])
      setTotalCount(count || 0)
      setError(null)

      if (data && data.length > 0) {
        const employeeIds = data.map((emp: any) => emp.id)
        const statuses = await getMultipleEmployeesContractStatus(employeeIds, supabase)
        setContractStatuses(statuses)
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [companyId, currentPage, selectedCostCenterId, selectedStatus, selectedRegime, selectedAFP, selectedHealthSystem, selectedPosition])

  const loadAllEmployees = useCallback(async () => {
    if (!companyId) return
    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, afp, health_system, base_salary, status, company_id, cost_center_id, cost_centers(code, name), previsional_regime, other_regime_type')
        .eq('company_id', companyId)
        .order('full_name')

      if (fetchError) throw fetchError
      setEmployees(data || [])
      setTotalCount(data?.length || 0)

      if (data && data.length > 0) {
        const statuses = await getMultipleEmployeesContractStatus(data.map((e: any) => e.id), supabase)
        setContractStatuses(statuses)
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    }
  }, [companyId])

  const loadPositions = useCallback(async () => {
    if (!companyId) return
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('position')
        .eq('company_id', companyId)
        .not('position', 'is', null)
      if (error) throw error
      setPositions(Array.from(new Set((data || []).map((emp: any) => emp.position).filter(Boolean))).sort() as string[])
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
      loadAllEmployees()
    } else {
      setEmployees([])
      setLoading(false)
    }
  }, [companyId, loadAllEmployees])

  const handleDelete = async (employee: any) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${employee.full_name}? El trabajador será marcado como inactivo pero su historial se preservará.`)) return
    try {
      const { error: deleteError } = await supabase
        .from('employees')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', employee.id)
      if (deleteError) {
        alert('Error al eliminar trabajador: ' + deleteError.message)
        return
      }
      loadAllEmployees()
    } catch (err: any) {
      alert('Error al eliminar trabajador: ' + err.message)
    }
  }

  const getContractBadge = (employeeId: string) => {
    const contractStatus = contractStatuses.get(employeeId)
    if (!contractStatus || !contractStatus.hasActiveContract) {
      return <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24', fontSize: '11px', fontWeight: '600' }}>⚠️ Sin contrato</span>
    }
    const { expiration } = contractStatus
    if (!expiration || expiration.status === 'active') return null
    return (
      <span className="badge" style={{ background: expiration.color + '20', color: expiration.color, border: `1px solid ${expiration.color}`, fontSize: '11px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {expiration.icon} {expiration.message}
      </span>
    )
  }

  const clearFilters = () => {
    setSelectedCostCenterId(null)
    setSelectedStatus(null)
    setSelectedRegime(null)
    setSelectedAFP(null)
    setSelectedHealthSystem(null)
    setSelectedPosition(null)
  }

  const hasActiveFilters = selectedCostCenterId || selectedStatus || selectedRegime || selectedAFP || selectedHealthSystem || selectedPosition

  if (loading) {
    return <div><h1>Trabajadores</h1><div className="card"><p>Cargando trabajadores...</p></div></div>
  }

  if (error) {
    return (
      <div>
        <h1>Trabajadores</h1>
        <div className="card" style={{ background: '#fee2e2', borderColor: '#dc2626' }}>
          <h2 style={{ color: '#991b1b' }}>Error al cargar trabajadores</h2>
          <p style={{ color: '#991b1b' }}>{error}</p>
          <button onClick={loadAllEmployees} style={{ marginTop: '16px' }}>Reintentar</button>
        </div>
      </div>
    )
  }

  const renderEmployeeRow = (employee: any, isInactive: boolean) => (
    <tr key={employee.id} style={isInactive ? { opacity: 0.7 } : undefined}>
      <td>{employee.full_name}</td>
      <td style={{ whiteSpace: 'nowrap' }}>{employee.rut}</td>
      <td>{employee.position}</td>
      <td>
        {employee.cost_centers ? (
          <span style={{ fontSize: '12px' }}>{employee.cost_centers.code} - {employee.cost_centers.name}</span>
        ) : (
          <span style={{ color: '#6b7280', fontSize: '12px' }}>-</span>
        )}
      </td>
      <td>
        {employee.previsional_regime === 'AFP' ? (
          <span style={{ fontSize: '13px' }}>AFP: {employee.afp || '-'}</span>
        ) : (
          <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '500' }}>
            {employee.other_regime_type === 'DIPRECA' ? 'DIPRECA' :
             employee.other_regime_type === 'CAPREDENA' ? 'CAPREDENA' :
             employee.other_regime_type === 'SIN_PREVISION' ? 'Sin Previsión' : 'Otro Régimen'}
          </span>
        )}
      </td>
      <td>
        {employee.previsional_regime === 'AFP' ? (employee.health_system || '-') : <span style={{ fontSize: '12px', color: '#6b7280' }}>Manual</span>}
      </td>
      <td>${employee.base_salary.toLocaleString('es-CL')}</td>
      <td><StatusBadge status={employee.status} /></td>
      <td>{getContractBadge(employee.id)}</td>
      <td>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => { setSelectedEmployeeId(employee.id); setIsSlideOpen(true) }} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #d1d5db', background: '#fff', borderRadius: '4px' }} title="Ver"><FaEye style={{ fontSize: '14px', color: '#3b82f6' }} /></button>
          <Link href={`/employees/${employee.id}/edit`}>
            <button style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #d1d5db', background: '#fff', borderRadius: '4px' }} title="Editar"><FaPencilAlt style={{ fontSize: '14px', color: '#f59e0b' }} /></button>
          </Link>
          {employee.status === 'active' && (
            <button onClick={() => handleDelete(employee)} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #d1d5db', background: '#fff', borderRadius: '4px' }} title="Eliminar"><FaTrash style={{ fontSize: '14px', color: '#ef4444' }} /></button>
          )}
        </div>
      </td>
    </tr>
  )

  const renderMobileCard = (employee: any) => (
    <div key={employee.id} className="mobile-card" style={INACTIVE_STATUSES.includes(employee.status) ? { opacity: 0.7 } : undefined}>
      <div className="mobile-card-row">
        <span className="mobile-card-label">Nombre</span>
        <span className="mobile-card-value" style={{ fontWeight: '600' }}>{employee.full_name}</span>
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
        <span className="mobile-card-label">Sueldo Base</span>
        <span className="mobile-card-value">${employee.base_salary.toLocaleString('es-CL')}</span>
      </div>
      <div className="mobile-card-row">
        <span className="mobile-card-label">Estado</span>
        <span className="mobile-card-value"><StatusBadge status={employee.status} /></span>
      </div>
      <div className="mobile-card-actions">
        <button onClick={() => { setSelectedEmployeeId(employee.id); setIsSlideOpen(true) }} style={{ flex: 1, width: '100%', padding: '8px', fontSize: '14px' }}><FaEye style={{ marginRight: '6px' }} />Ver</button>
        <Link href={`/employees/${employee.id}/edit`} style={{ flex: 1 }}><button className="secondary" style={{ width: '100%', padding: '8px', fontSize: '14px' }}><FaPencilAlt style={{ marginRight: '6px' }} />Editar</button></Link>
        {employee.status === 'active' && (
          <button onClick={() => handleDelete(employee)} className="danger" style={{ padding: '8px', fontSize: '14px' }}><FaTrash /></button>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1>Trabajadores</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={loadAllEmployees} className="secondary" style={{ padding: '8px 16px' }}>Actualizar</button>
          <Link href="/contracts">
            <button style={{ background: '#fbbf24', color: '#000', fontWeight: '600', padding: '8px 16px' }}>Generar Contrato/Anexo</button>
          </Link>
          <Link href="/employees/new"><button>Nuevo Trabajador</button></Link>
          <Link href="/employees/form-pdf"><button style={{ background: '#10b981', color: 'white' }}>Formulario de Registro (PDF)</button></Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECCION 1: TRABAJADORES ACTIVOS                              */}
      {/* ============================================================ */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Trabajadores Activos
            <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280', marginLeft: '8px' }}>
              ({activeEmployees.length})
            </span>
          </h2>
        </div>

        {activeEmployees.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
            No hay trabajadores activos.
            <Link href="/employees/new" style={{ marginLeft: '8px' }}>Crear primer trabajador</Link>
          </p>
        ) : (
          <>
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
                    <th>Contrato</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.map((employee: any) => renderEmployeeRow(employee, false))}
                </tbody>
              </table>
            </div>
            <div className="table-mobile-card">
              {activeEmployees.map((employee: any) => renderMobileCard(employee))}
            </div>
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECCION 2: TRABAJADORES INACTIVOS (colapsable)               */}
      {/* ============================================================ */}
      <div className="card">
        <button
          onClick={() => setShowInactive(!showInactive)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showInactive ? '16px' : 0 }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Trabajadores Inactivos
            <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280', marginLeft: '8px' }}>
              ({inactiveEmployees.length})
            </span>
          </h2>
          {showInactive ? <FaChevronUp style={{ color: '#6b7280' }} /> : <FaChevronDown style={{ color: '#6b7280' }} />}
        </button>

        {showInactive && (
          <>
            {/* Filtros solo para inactivos */}
            <div className="form-row" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label>Estado</label>
                <select value={selectedStatus || ''} onChange={(e) => { setSelectedStatus(e.target.value || null) }}>
                  <option value="">Todos los inactivos</option>
                  <option value="inactive">Inactivo</option>
                  <option value="renuncia">Renuncia</option>
                  <option value="despido">Despido</option>
                  <option value="licencia_medica">Licencia Médica</option>
                </select>
              </div>
              {costCenters.length > 0 && (
                <div className="form-group">
                  <label>Centro de Costo</label>
                  <select value={selectedCostCenterId || ''} onChange={(e) => setSelectedCostCenterId(e.target.value || null)}>
                    <option value="">Todos</option>
                    {costCenters.map((cc) => (<option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Régimen Previsional</label>
                <select value={selectedRegime || ''} onChange={(e) => setSelectedRegime(e.target.value || null)}>
                  <option value="">Todos</option>
                  <optgroup label="Sistema AFP"><option value="AFP">AFP (Previred)</option></optgroup>
                  <optgroup label="Regímenes Especiales">
                    <option value="DIPRECA">DIPRECA</option>
                    <option value="CAPREDENA">CAPREDENA</option>
                    <option value="SIN_PREVISION">Sin Previsión</option>
                    <option value="OTRO">Otro Régimen</option>
                  </optgroup>
                </select>
              </div>
              {hasActiveFilters && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
                  <button className="secondary" onClick={clearFilters}>Limpiar Filtros</button>
                </div>
              )}
            </div>

            {(() => {
              const filtered = inactiveEmployees.filter(e => {
                if (selectedStatus && e.status !== selectedStatus) return false
                if (selectedCostCenterId && e.cost_center_id !== selectedCostCenterId) return false
                if (selectedRegime) {
                  if (selectedRegime === 'AFP' && e.previsional_regime !== 'AFP') return false
                  if (selectedRegime !== 'AFP' && e.other_regime_type !== selectedRegime) return false
                }
                if (selectedAFP && e.afp !== selectedAFP) return false
                if (selectedHealthSystem) {
                  if (selectedHealthSystem === 'MANUAL' && e.previsional_regime !== 'OTRO_REGIMEN') return false
                  if (selectedHealthSystem !== 'MANUAL' && e.health_system !== selectedHealthSystem) return false
                }
                if (selectedPosition && e.position !== selectedPosition) return false
                return true
              })

              if (filtered.length === 0) {
                return <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No hay trabajadores inactivos con los filtros seleccionados.</p>
              }

              return (
                <>
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
                        {filtered.map((employee: any) => renderEmployeeRow(employee, true))}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-mobile-card">
                    {filtered.map((employee: any) => renderMobileCard(employee))}
                  </div>
                </>
              )
            })()}
          </>
        )}
      </div>

      <EmployeeDetailSlide
        employeeId={selectedEmployeeId}
        isOpen={isSlideOpen}
        onClose={() => { setIsSlideOpen(false); setSelectedEmployeeId(null) }}
      />
    </div>
  )
}