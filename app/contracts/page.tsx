'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaFileContract, FaPlus, FaEdit, FaTrash, FaEye, FaChevronRight, FaChevronDown } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { calculateExpirationStatus } from '@/lib/services/contractNotifications'

const PAGE_SIZE = 15
const VIGENTE_STATUSES = ['draft', 'issued', 'signed', 'active', 'expired']
const HISTORICO_STATUSES = ['terminated', 'cancelled']
const ACTIVE_EMPLOYEE_STATUSES = ['active', 'licencia_medica']

export default function ContractsPage() {
  const { companyId } = useCurrentCompany()
  const [contracts, setContracts] = useState<any[]>([])
  const [annexes, setAnnexes] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')

  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set())
  const [currentPageVigentes, setCurrentPageVigentes] = useState(1)
  const [currentPageHistorico, setCurrentPageHistorico] = useState(1)

  // Estadísticas
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    expiredContracts: 0,
    totalAnnexes: 0,
  })

  useEffect(() => {
    if (companyId) {
      loadData()
    } else {
      setEmployees([])
      setContracts([])
      setAnnexes([])
      setLoading(false)
    }
  }, [statusFilter, employeeFilter, companyId])

  const loadData = async () => {
    if (!companyId) return

    try {
      setLoading(true)

      // Cargar TODOS los empleados de la empresa (activos e inactivos, para el histórico)
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, rut, status')
        .eq('company_id', companyId)
        .order('full_name')

      setEmployees(employeesData || [])

      const employeeIds = employeesData?.map((emp: { id: string }) => emp.id) || []

      let contractsQuery = supabase
        .from('contracts')
        .select(`
          *,
          employees (id, full_name, rut, status),
          companies (id, name, rut)
        `)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])
        .order('start_date', { ascending: false })

      if (employeeFilter !== 'all') {
        contractsQuery = contractsQuery.eq('employee_id', employeeFilter)
      }

      if (statusFilter !== 'all') {
        contractsQuery = contractsQuery.eq('status', statusFilter)
      }

      const { data: contractsData } = await contractsQuery

      // Cargar anexos de empleados de la empresa
      let annexesQuery = supabase
        .from('contract_annexes')
        .select(`
          *,
          contracts (id, contract_number),
          employees (id, full_name, rut),
          companies (id, name, rut)
        `)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })

      if (employeeFilter !== 'all') {
        annexesQuery = annexesQuery.eq('employee_id', employeeFilter)
      }

      if (statusFilter !== 'all') {
        annexesQuery = annexesQuery.eq('status', statusFilter)
      }

      const { data: annexesData } = await annexesQuery

      setContracts(contractsData || [])
      setAnnexes(annexesData || [])
      setCurrentPageVigentes(1)
      setCurrentPageHistorico(1)

      // Calcular estadísticas (expired NO cuenta como activo)
      const activeContracts = (contractsData || []).filter((c: any) => c.status === 'active').length
      const expiredContracts = (contractsData || []).filter((c: any) => c.status === 'expired').length

      setStats({
        totalContracts: contractsData?.length || 0,
        activeContracts,
        expiredContracts,
        totalAnnexes: annexesData?.length || 0,
      })
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, type: 'contract' | 'annex') => {
    const itemName = type === 'contract' ? 'contrato' : 'anexo'

    if (!confirm(`⚠️ ¿Estás seguro de ELIMINAR PERMANENTEMENTE este ${itemName}?\n\nEsta acción NO se puede deshacer.\n\nSi solo quieres desactivarlo, usa la opción "Cancelar" en lugar de "Eliminar".`)) {
      return
    }

    try {
      const table = type === 'contract' ? 'contracts' : 'contract_annexes'

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      alert(`${itemName.charAt(0).toUpperCase() + itemName.slice(1)} eliminado correctamente`)
      loadData()
    } catch (error: any) {
      console.error(`Error al eliminar ${type}:`, error)
      alert('Error al eliminar: ' + error.message)
    }
  }

  const getContractTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      indefinido: 'Indefinido',
      plazo_fijo: 'Plazo Fijo',
      obra_faena: 'Obra o Faena',
      part_time: 'Part-Time',
    }
    return types[type] || type
  }

  const getAnnexTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      modificacion_sueldo: 'Modificación Sueldo',
      cambio_cargo: 'Cambio Cargo',
      cambio_jornada: 'Cambio Jornada',
      prorroga: 'Prórroga',
      cambio_tipo_contrato: 'Cambio Tipo Contrato',
      cambio_lugar_trabajo: 'Cambio Lugar Trabajo',
      cambio_metodo_pago: 'Cambio Método Pago',
      otro: 'Otro',
    }
    return types[type] || type || 'Otro'
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { text: string; color: string } } = {
      draft: { text: 'Borrador', color: '#6b7280' },
      issued: { text: 'Emitido', color: '#f59e0b' },
      signed: { text: 'Firmado', color: '#10b981' },
      active: { text: 'Activo', color: '#3b82f6' },
      expired: { text: 'Vencido', color: '#dc2626' },
      terminated: { text: 'Terminado', color: '#ef4444' },
      cancelled: { text: 'Cancelado', color: '#9ca3af' },
    }
    const badge = badges[status] || { text: status, color: '#6b7280' }
    return (
      <span
        className="badge"
        style={{
          background: badge.color + '20',
          color: badge.color,
          border: `1px solid ${badge.color}`,
        }}
      >
        {badge.text}
      </span>
    )
  }

  const getExpirationBadge = (endDate: string | null, contractType: string, contractStatus: string) => {
    // Mostrar badge para contratos activos (vencimiento próximo) y vencidos
    if (contractStatus !== 'active' && contractStatus !== 'expired') {
      return null
    }

    const expiration = calculateExpirationStatus(endDate, contractType)

    // No mostrar badge si está "activo" (más de 30 días)
    if (expiration.status === 'active') {
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
          gap: '4px',
          marginTop: '4px'
        }}
      >
        {expiration.icon} {expiration.message}
      </span>
    )
  }

  // ===== Agrupación: anexos por contrato =====
  const annexesByContract: Record<string, any[]> = {}
  for (const annex of annexes) {
    const key = annex.contract_id
    if (!key) continue
    if (!annexesByContract[key]) annexesByContract[key] = []
    annexesByContract[key].push(annex)
  }

  // ===== Clasificación: vigentes vs histórico =====
  const isHistoricoContract = (contract: any) => {
    if (HISTORICO_STATUSES.includes(contract.status)) return true
    const empStatus = contract.employees?.status
    if (empStatus && !ACTIVE_EMPLOYEE_STATUSES.includes(empStatus)) return true
    if (contract.status === 'expired' && empStatus && !ACTIVE_EMPLOYEE_STATUSES.includes(empStatus)) return true
    return false
  }

  const vigenteContracts = contracts.filter((c) => !isHistoricoContract(c))
  const historicoContracts = contracts.filter((c) => isHistoricoContract(c))

  // ===== Agrupación por trabajador =====
  const groupByEmployee = (list: any[]) => {
    const groups: Record<string, any[]> = {}
    for (const c of list) {
      const key = c.employee_id
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    // Ordenar contratos por fecha de inicio descendente (más reciente primero)
    const entries = Object.entries(groups).map(([employeeId, cs]) => {
      const sorted = [...cs].sort((a, b) =>
        (b.start_date || '').localeCompare(a.start_date || '')
      )
      return { employeeId, contracts: sorted, latest: sorted[0] }
    })
    // Ordenar trabajadores por nombre
    entries.sort((a, b) =>
      (a.latest?.employees?.full_name || '').localeCompare(b.latest?.employees?.full_name || '', 'es')
    )
    return entries
  }

  const vigenteEntries = groupByEmployee(vigenteContracts)
  const historicoEntries = groupByEmployee(historicoContracts)

  const totalPagesVigentes = Math.ceil(vigenteEntries.length / PAGE_SIZE)
  const paginatedVigentes = vigenteEntries.slice((currentPageVigentes - 1) * PAGE_SIZE, currentPageVigentes * PAGE_SIZE)
  const totalPagesHistorico = Math.ceil(historicoEntries.length / PAGE_SIZE)
  const paginatedHistorico = historicoEntries.slice((currentPageHistorico - 1) * PAGE_SIZE, currentPageHistorico * PAGE_SIZE)

  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  const toggleContract = (contractId: string) => {
    setExpandedContracts(prev => {
      const next = new Set(prev)
      if (next.has(contractId)) next.delete(contractId)
      else next.add(contractId)
      return next
    })
  }

  if (loading) {
    return (
      <div>
        <h1>Gestión de Contratos y Anexos</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  const renderEmployeeRows = (entries: { employeeId: string; contracts: any[]; latest: any }[], isHistorico: boolean) => {
    return entries.map(({ employeeId, contracts: empContracts, latest }) => {
      const isExpanded = expandedEmployees.has(employeeId)
      const employee = latest.employees
      return (
        <Fragment key={employeeId}>
          {/* Fila principal del trabajador */}
          <tr style={{ background: isExpanded ? '#f0f9ff' : undefined }}>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => toggleEmployee(employeeId)}
                  style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', color: '#0369a1' }}
                  title={isExpanded ? 'Colapsar' : 'Expandir'}
                >
                  {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                </button>
                <div>
                  <strong>{employee?.full_name || 'N/A'}</strong>
                  <br />
                  <small style={{ color: '#6b7280' }}>{employee?.rut || ''}</small>
                </div>
              </div>
            </td>
            <td>
              <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                {latest.contract_number}
              </code>
            </td>
            <td style={{ fontSize: '13px' }}>{getContractTypeText(latest.contract_type)}</td>
            <td style={{ fontSize: '13px' }}>{formatDate(latest.start_date)}</td>
            <td style={{ fontSize: '13px' }}>
              {latest.end_date ? (
                <div>
                  <div>{formatDate(latest.end_date)}</div>
                  {getExpirationBadge(latest.end_date, latest.contract_type, latest.status)}
                </div>
              ) : '-'}
            </td>
            <td>{getStatusBadge(latest.status)}</td>
            <td></td>
          </tr>
          {/* Contratos del trabajador (nivel 2) */}
          {isExpanded && empContracts.map((contract: any) => {
            const contractAnnexes = annexesByContract[contract.id] || []
            const isContractExpanded = expandedContracts.has(contract.id)
            return (
              <Fragment key={contract.id}>
                <tr style={{ background: '#fafafa' }}>
                  <td style={{ padding: '4px 12px 4px 48px', borderLeft: '2px solid #bae6fd' }}>
                    {contractAnnexes.length > 0 ? (
                      <button
                        onClick={() => toggleContract(contract.id)}
                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0369a1', fontSize: '11px' }}
                        title={isContractExpanded ? 'Ocultar anexos' : 'Ver anexos'}
                      >
                        {isContractExpanded ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                        {contractAnnexes.length} {contractAnnexes.length === 1 ? 'anexo' : 'anexos'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>Sin anexos</span>
                    )}
                  </td>
                  <td>
                    <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                      {contract.contract_number}
                    </code>
                  </td>
                  <td style={{ fontSize: '13px' }}>{getContractTypeText(contract.contract_type)}</td>
                  <td style={{ fontSize: '13px' }}>{formatDate(contract.start_date)}</td>
                  <td style={{ fontSize: '13px' }}>
                    {contract.end_date ? (
                      <div>
                        <div>{formatDate(contract.end_date)}</div>
                        {getExpirationBadge(contract.end_date, contract.contract_type, contract.status)}
                      </div>
                    ) : '-'}
                  </td>
                  <td>{getStatusBadge(contract.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <Link href={`/contracts/${contract.id}`}>
                        <button style={{ padding: '4px 8px', fontSize: '12px' }} title="Ver">
                          <FaEye />
                        </button>
                      </Link>
                      <Link href={`/contracts/${contract.id}/edit`}>
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title="Editar"
                          disabled={['signed', 'active', 'expired', 'terminated', 'cancelled'].includes(contract.status)}
                        >
                          <FaEdit />
                        </button>
                      </Link>
                      <button
                        style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                        title="Eliminar"
                        onClick={() => handleDelete(contract.id, 'contract')}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Anexos del contrato (nivel 3) */}
                {isContractExpanded && contractAnnexes.map((annex: any) => (
                  <tr key={annex.id} style={{ background: '#f8fafc' }}>
                    <td style={{ padding: '4px 12px 4px 72px', borderLeft: '2px solid #c4b5fd', fontSize: '12px', color: '#6b7280' }}>
                      <FaFileContract style={{ color: '#8b5cf6', marginRight: '4px' }} />
                      Anexo
                    </td>
                    <td>
                      <code style={{ fontSize: '11px', background: '#ede9fe', padding: '4px 8px', borderRadius: '4px' }}>
                        {annex.annex_number}
                      </code>
                    </td>
                    <td style={{ fontSize: '13px' }}>{getAnnexTypeText(annex.annex_type)}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(annex.start_date)}</td>
                    <td style={{ fontSize: '13px' }}>
                      {annex.end_date ? formatDate(annex.end_date) : '-'}
                    </td>
                    <td>{getStatusBadge(annex.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Link href={`/contracts/annex/${annex.id}`}>
                          <button style={{ padding: '4px 8px', fontSize: '12px' }} title="Ver">
                            <FaEye />
                          </button>
                        </Link>
                        <Link href={`/contracts/annex/${annex.id}/edit`}>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Editar"
                            disabled={['signed', 'active', 'cancelled'].includes(annex.status)}
                          >
                            <FaEdit />
                          </button>
                        </Link>
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                          title="Eliminar"
                          onClick={() => handleDelete(annex.id, 'annex')}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </Fragment>
      )
    })
  }

  const renderMobileCards = (entries: { employeeId: string; contracts: any[]; latest: any }[]) => {
    return entries.map(({ employeeId, contracts: empContracts, latest }) => {
      const isExpanded = expandedEmployees.has(employeeId)
      const employee = latest.employees
      return (
        <div key={employeeId} className="mobile-card" style={{ padding: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <button
              onClick={() => toggleEmployee(employeeId)}
              style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#0369a1', fontSize: '13px' }}
            >
              {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
              <strong>{employee?.full_name || 'N/A'}</strong>
            </button>
            {getStatusBadge(latest.status)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '13px' }}>
            <div><span style={{ color: '#6b7280' }}>Contrato:</span><br />{latest.contract_number} · {getContractTypeText(latest.contract_type)}</div>
            <div><span style={{ color: '#6b7280' }}>Término:</span><br />{latest.end_date ? formatDate(latest.end_date) : '-'}</div>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {empContracts.length} {empContracts.length === 1 ? 'contrato' : 'contratos'} en el período
          </div>
          {isExpanded && empContracts.map((contract: any) => {
            const contractAnnexes = annexesByContract[contract.id] || []
            const isContractExpanded = expandedContracts.has(contract.id)
            return (
              <div key={contract.id} style={{ marginTop: '8px', padding: '8px', background: '#f9fafb', borderRadius: '6px', borderLeft: '2px solid #bae6fd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{contract.contract_number} · {getContractTypeText(contract.contract_type)}</span>
                  {getStatusBadge(contract.status)}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatDate(contract.start_date)} → {contract.end_date ? formatDate(contract.end_date) : '-'}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <Link href={`/contracts/${contract.id}`} style={{ flex: 1 }}><button style={{ width: '100%', padding: '6px', fontSize: '13px' }}><FaEye /> Ver</button></Link>
                  {contractAnnexes.length > 0 && (
                    <button onClick={() => toggleContract(contract.id)} className="secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                      {isContractExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                      {' '}{contractAnnexes.length}
                    </button>
                  )}
                </div>
                {isContractExpanded && contractAnnexes.map((annex: any) => (
                  <div key={annex.id} style={{ marginTop: '6px', padding: '6px', background: '#fff', borderRadius: '4px', borderLeft: '2px solid #c4b5fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px' }}>{annex.annex_number} · {getAnnexTypeText(annex.annex_type)}</span>
                      {getStatusBadge(annex.status)}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <Link href={`/contracts/annex/${annex.id}`}><button style={{ padding: '4px 8px', fontSize: '12px' }}><FaEye /> Ver</button></Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )
    })
  }

  const renderPagination = (currentPage: number, totalPages: number, setPage: (p: number) => void) => {
    if (totalPages <= 1) return null
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '12px 0', borderTop: '1px solid #e5e7eb' }}>
        <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="secondary" style={{ padding: '6px 12px' }}>
          Anterior
        </button>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          Página {currentPage} de {totalPages}
        </span>
        <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="secondary" style={{ padding: '6px 12px' }}>
          Siguiente
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1>Gestión de Contratos y Anexos</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/contracts/new">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus size={16} /> Nuevo Contrato
            </button>
          </Link>
          <Link href="/contracts/annex/new">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="secondary">
              <FaPlus size={16} /> Nuevo Anexo
            </button>
          </Link>
        </div>
      </div>

      {/* Cards de estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Total Contratos
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#3b82f6', display: 'block' }}>
            {stats.totalContracts}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Todos los estados</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #059669' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Contratos Activos
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#059669', display: 'block' }}>
            {stats.activeContracts}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Vigentes</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${stats.expiredContracts > 0 ? '#dc2626' : '#059669'}` }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Vencidos
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: stats.expiredContracts > 0 ? '#dc2626' : '#059669', display: 'block' }}>
            {stats.expiredContracts}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Requieren acción</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Total Anexos
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#8b5cf6', display: 'block' }}>
            {stats.totalAnnexes}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Todos los estados</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>Filtros</h2>
          <button onClick={() => loadData()} className="secondary" style={{ fontSize: '13px' }}>
            Actualizar
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', minWidth: '180px' }}
          >
            <option value="all">Todos los trabajadores</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} - {emp.rut}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="issued">Emitido</option>
            <option value="signed">Firmado</option>
            <option value="active">Activo</option>
            <option value="expired">Vencido</option>
            <option value="terminated">Terminado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Tabla 1: Contratos Vigentes */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>
            Contratos Vigentes
            <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
              ({vigenteEntries.length} {vigenteEntries.length === 1 ? 'trabajador' : 'trabajadores'})
            </span>
          </h2>
        </div>

        {vigenteEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
            <FaFileContract size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No hay contratos vigentes</p>
            <Link href="/contracts/new" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
              Crear un nuevo contrato
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-mobile-hidden">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th>N° Contrato</th>
                      <th>Tipo Contrato</th>
                      <th>Fecha Inicio</th>
                      <th>Fecha Término</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderEmployeeRows(paginatedVigentes, false)}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="table-mobile-card">
              {renderMobileCards(paginatedVigentes)}
            </div>

            {renderPagination(currentPageVigentes, totalPagesVigentes, setCurrentPageVigentes)}
          </>
        )}
      </div>

      {/* Tabla 2: Histórico de Contratos */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>
            Histórico de Contratos
            <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
              ({historicoEntries.length} {historicoEntries.length === 1 ? 'trabajador' : 'trabajadores'})
            </span>
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          Contratos terminados, cancelados o de trabajadores inactivos (renuncia, despido).
        </p>

        {historicoEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No hay contratos en el histórico</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-mobile-hidden">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th>N° Contrato</th>
                      <th>Tipo Contrato</th>
                      <th>Fecha Inicio</th>
                      <th>Fecha Término</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderEmployeeRows(paginatedHistorico, true)}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="table-mobile-card">
              {renderMobileCards(paginatedHistorico)}
            </div>

            {renderPagination(currentPageHistorico, totalPagesHistorico, setCurrentPageHistorico)}
          </>
        )}
      </div>
    </div>
  )
}