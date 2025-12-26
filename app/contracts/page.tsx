'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaFileContract, FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([])
  const [annexes, setAnnexes] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'contracts' | 'annexes'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')

  // Estadísticas
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    pendingSignatures: 0,
    totalAnnexes: 0,
  })

  useEffect(() => {
    loadData()
  }, [filter, statusFilter, employeeFilter])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar empleados
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('status', 'active')
        .order('full_name')

      setEmployees(employeesData || [])

      // Cargar contratos
      let contractsQuery = supabase
        .from('contracts')
        .select(`
          *,
          employees (id, full_name, rut),
          companies (id, name, rut)
        `)
        .order('created_at', { ascending: false })

      if (employeeFilter !== 'all') {
        contractsQuery = contractsQuery.eq('employee_id', employeeFilter)
      }

      if (statusFilter !== 'all') {
        contractsQuery = contractsQuery.eq('status', statusFilter)
      }

      const { data: contractsData } = await contractsQuery

      // Cargar anexos
      let annexesQuery = supabase
        .from('contract_annexes')
        .select(`
          *,
          contracts (id, contract_number),
          employees (id, full_name, rut),
          companies (id, name, rut)
        `)
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

      // Calcular estadísticas
      const activeContracts = (contractsData || []).filter((c: any) => c.status === 'active').length
      const pendingSignatures = (contractsData || []).filter((c: any) => 
        c.status === 'issued' || c.status === 'draft'
      ).length

      setStats({
        totalContracts: contractsData?.length || 0,
        activeContracts,
        pendingSignatures,
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
    if (!confirm('¿Estás seguro de eliminar este ' + (type === 'contract' ? 'contrato' : 'anexo') + '?')) {
      return
    }

    try {
      const table = type === 'contract' ? 'contracts' : 'contract_annexes'
      const { error } = await supabase.from(table).delete().eq('id', id)

      if (error) throw error

      alert((type === 'contract' ? 'Contrato' : 'Anexo') + ' eliminado correctamente')
      loadData()
    } catch (error: any) {
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

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { text: string; color: string } } = {
      draft: { text: 'Borrador', color: '#6b7280' },
      issued: { text: 'Emitido', color: '#f59e0b' },
      signed: { text: 'Firmado', color: '#10b981' },
      active: { text: 'Activo', color: '#3b82f6' },
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

  const displayData = filter === 'all' 
    ? [...contracts, ...annexes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : filter === 'contracts' 
    ? contracts 
    : annexes

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Gestión de Contratos y Anexos</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/contracts/new">
            <button>
              <FaPlus style={{ marginRight: '8px' }} />
              Nuevo Contrato
            </button>
          </Link>
          <Link href="/contracts/annex/new">
            <button className="secondary">
              <FaPlus style={{ marginRight: '8px' }} />
              Nuevo Anexo
            </button>
          </Link>
        </div>
      </div>

      {/* Cards de estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Total Contratos</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
            {stats.totalContracts}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Contratos Activos</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {stats.activeContracts}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Pendientes Firma</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
            {stats.pendingSignatures}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Total Anexos</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {stats.totalAnnexes}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Filtros</h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: '200px' }}>
            <label>Tipo</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="all">Todos</option>
              <option value="contracts">Solo Contratos</option>
              <option value="annexes">Solo Anexos</option>
            </select>
          </div>
          <div className="form-group" style={{ minWidth: '200px' }}>
            <label>Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="issued">Emitido</option>
              <option value="signed">Firmado</option>
              <option value="active">Activo</option>
              <option value="terminated">Terminado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div className="form-group" style={{ minWidth: '200px' }}>
            <label>Trabajador</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">Todos</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        {displayData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p>No hay {filter === 'all' ? 'contratos ni anexos' : filter === 'contracts' ? 'contratos' : 'anexos'} registrados.</p>
            <Link href="/contracts/new">
              <button style={{ marginTop: '16px' }}>
                Crear Primer {filter === 'annexes' ? 'Anexo' : 'Contrato'}
              </button>
            </Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Número</th>
                <th>Trabajador</th>
                {filter === 'all' && <th>Tipo Documento</th>}
                {filter === 'contracts' && <th>Tipo Contrato</th>}
                {filter === 'annexes' && <th>Tipo Anexo</th>}
                <th>Fecha Inicio</th>
                <th>Fecha Término</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item: any) => {
                const isContract = 'contract_number' in item
                const employee = item.employees || item.employee
                
                return (
                  <tr key={item.id}>
                    <td>
                      {isContract ? (
                        <FaFileContract style={{ color: '#3b82f6' }} />
                      ) : (
                        <FaFileContract style={{ color: '#8b5cf6' }} />
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                        {isContract ? item.contract_number : item.annex_number}
                      </code>
                    </td>
                    <td>
                      {employee?.full_name || 'N/A'}
                      <br />
                      <small style={{ color: '#6b7280' }}>{employee?.rut || ''}</small>
                    </td>
                    {filter === 'all' && (
                      <td>
                        {isContract ? (
                          <span style={{ color: '#3b82f6' }}>Contrato</span>
                        ) : (
                          <span style={{ color: '#8b5cf6' }}>Anexo</span>
                        )}
                      </td>
                    )}
                    {filter === 'contracts' && (
                      <td>{getContractTypeText(item.contract_type)}</td>
                    )}
                    {filter === 'annexes' && (
                      <td>
                        {item.annex_type === 'modificacion_sueldo' ? 'Modificación Sueldo' :
                         item.annex_type === 'cambio_cargo' ? 'Cambio Cargo' :
                         item.annex_type === 'cambio_jornada' ? 'Cambio Jornada' :
                         item.annex_type === 'prorroga' ? 'Prórroga' :
                         item.annex_type || 'Otro'}
                      </td>
                    )}
                    <td>{formatDate(item.start_date)}</td>
                    <td>{item.end_date ? formatDate(item.end_date) : '-'}</td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Link href={isContract ? `/contracts/${item.id}` : `/contracts/annex/${item.id}`}>
                          <button style={{ padding: '4px 8px', fontSize: '12px' }}>
                            <FaEye />
                          </button>
                        </Link>
                        <Link href={isContract ? `/contracts/${item.id}/edit` : `/contracts/annex/${item.id}/edit`}>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            disabled={item.status === 'signed' || item.status === 'active'}
                          >
                            <FaEdit />
                          </button>
                        </Link>
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                          onClick={() => handleDelete(item.id, isContract ? 'contract' : 'annex')}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

