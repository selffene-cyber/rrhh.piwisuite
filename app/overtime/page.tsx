'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaPlus, FaEye, FaEdit, FaTrash, FaFilePdf, FaClock, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'
import { formatDate } from '@/lib/utils/date'

export default function OvertimePage() {
  const { companyId } = useCurrentCompany()
  const [pacts, setPacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'expired' | 'renewed' | 'void'>('all')
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1)
  const [filterEmployee, setFilterEmployee] = useState<string>('all')
  const [stats, setStats] = useState({
    active: 0,
    expiring: 0,
    expired: 0,
    totalHours: 0
  })

  useEffect(() => {
    if (companyId) {
      loadEmployees()
      loadPacts()
      loadStats()
    }
  }, [companyId, filterStatus, filterYear, filterMonth, filterEmployee])

  const loadEmployees = async () => {
    if (!companyId) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error al cargar trabajadores:', error)
    }
  }

  const loadPacts = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      
      // Obtener empleados de la empresa
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)

      if (!employees || employees.length === 0) {
        setPacts([])
        setLoading(false)
        return
      }

      const employeeIds = employees.map((emp: { id: string }) => emp.id)

      // Aplicar filtro de trabajador
      let filteredEmployeeIds = employeeIds
      if (filterEmployee !== 'all') {
        filteredEmployeeIds = [filterEmployee]
      }

      // Obtener pactos
      let query = supabase
        .from('overtime_pacts')
        .select(`
          id,
          employee_id,
          company_id,
          start_date,
          end_date,
          max_daily_hours,
          reason,
          status,
          pact_number,
          created_at,
          employees (full_name, rut),
          companies (name)
        `)
        .in('employee_id', filteredEmployeeIds)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      // Filtrar por año y mes (basado en start_date)
      if (filterYear && filterMonth > 0) {
        const monthStart = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`
        const monthEnd = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
        query = query.gte('start_date', monthStart).lte('start_date', monthEnd)
      } else if (filterYear) {
        const yearStart = `${filterYear}-01-01`
        const yearEnd = `${filterYear}-12-31`
        query = query.gte('start_date', yearStart).lte('start_date', yearEnd)
      }

      const { data, error } = await query

      if (error) throw error
      setPacts(data || [])
    } catch (error: any) {
      console.error('Error al cargar pactos:', error)
      alert('Error al cargar pactos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!companyId) return

    try {
      // Obtener empleados de la empresa
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)

      if (!employees || employees.length === 0) {
        setStats({ active: 0, expiring: 0, expired: 0, totalHours: 0 })
        return
      }

      const employeeIds = employees.map((emp: { id: string }) => emp.id)

      // Contar pactos activos
      const { data: activePacts } = await supabase
        .from('overtime_pacts')
        .select('id, end_date')
        .in('employee_id', employeeIds)
        .eq('status', 'active')

      // Contar pactos por vencer (15 días)
      const today = new Date()
      const in15Days = new Date()
      in15Days.setDate(today.getDate() + 15)

      const expiringCount = activePacts?.filter((pact: { end_date: string }) => {
        const endDate = new Date(pact.end_date)
        return endDate >= today && endDate <= in15Days
      }).length || 0

      // Contar pactos vencidos
      const { count: expiredCount } = await supabase
        .from('overtime_pacts')
        .select('*', { count: 'exact', head: true })
        .in('employee_id', employeeIds)
        .eq('status', 'expired')

      // Calcular horas extra del mes actual
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const monthStart = new Date(currentYear, currentMonth - 1, 1)
      const monthEnd = new Date(currentYear, currentMonth, 0)

      const { data: monthEntries } = await supabase
        .from('overtime_entries')
        .select('hours')
        .in('employee_id', employeeIds)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])

      const totalHours = monthEntries?.reduce((sum: number, entry: { hours: number }) => sum + Number(entry.hours), 0) || 0

      setStats({
        active: activePacts?.length || 0,
        expiring: expiringCount,
        expired: expiredCount || 0,
        totalHours
      })
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const handleDelete = async (id: string, status: string) => {
    if (status !== 'draft' && status !== 'void') {
      alert('Solo se pueden eliminar pactos en estado "Borrador" o "Anulado"')
      return
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este pacto?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('overtime_pacts')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('Pacto eliminado correctamente')
      loadPacts()
      loadStats()
    } catch (error: any) {
      alert('Error al eliminar pacto: ' + error.message)
    }
  }

  if (!companyId) {
    return (
      <div>
        <h1>Gestión de Horas Extras</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver los pactos de horas extra.
          </p>
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
        <h1>Gestión de Horas Extras</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/overtime/history">
            <button className="secondary">
              <FaClock style={{ marginRight: '8px' }} />
              Histórico HH
            </button>
          </Link>
          <Link href="/overtime/new">
            <button>
              <FaPlus style={{ marginRight: '8px' }} />
              Nuevo Pacto
            </button>
          </Link>
        </div>
      </div>

      {/* Cards de estadísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {/* Card 1: Pactos Activos */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          borderRadius: '12px',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaCheckCircle size={24} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
              Pactos Activos
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: '8px 0' }}>
            {stats.active}
          </p>
          <p style={{ fontSize: '11px', color: '#1e40af', margin: 0, opacity: 0.8 }}>
            Pactos vigentes actualmente
          </p>
        </div>

        {/* Card 2: Por Vencer */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px',
          border: '2px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaExclamationTriangle size={24} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#92400e', fontWeight: '600' }}>
              Por Vencer (15 días)
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#92400e', margin: '8px 0' }}>
            {stats.expiring}
          </p>
          <p style={{ fontSize: '11px', color: '#92400e', margin: 0, opacity: 0.8 }}>
            Pactos próximos a vencer
          </p>
        </div>

        {/* Card 3: Pactos Vencidos */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          borderRadius: '12px',
          border: '2px solid #ef4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaClock size={24} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#991b1b', fontWeight: '600' }}>
              Pactos Vencidos
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#991b1b', margin: '8px 0' }}>
            {stats.expired}
          </p>
          <p style={{ fontSize: '11px', color: '#991b1b', margin: 0, opacity: 0.8 }}>
            Pactos que requieren renovación
          </p>
        </div>

        {/* Card 4: Horas Extra del Mes */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)',
          borderRadius: '12px',
          border: '2px solid #8b5cf6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaClock size={24} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#6b21a8', fontWeight: '600' }}>
              Horas Extra del Mes
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#6b21a8', margin: '8px 0' }}>
            {stats.totalHours.toFixed(1)}
          </p>
          <p style={{ fontSize: '11px', color: '#6b21a8', margin: 0, opacity: 0.8 }}>
            Total de horas registradas este mes
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <h2>Filtros</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="expired">Vencido</option>
              <option value="renewed">Renovado</option>
              <option value="void">Anulado</option>
            </select>
          </div>
          <div className="form-group">
            <label>Año</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="form-group">
            <label>Mes</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            >
              <option value="0">Todos</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
          <div className="form-group">
            <label>Trabajador</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
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

      {/* Lista de pactos */}
      <div className="card">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>
            Pactos de Horas Extra
            {pacts.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                ({pacts.length} {pacts.length === 1 ? 'pacto' : 'pactos'})
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <p>Cargando pactos...</p>
        ) : pacts.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay pactos que coincidan con los filtros seleccionados.
            <Link href="/overtime/new" style={{ marginLeft: '8px' }}>Crear uno nuevo</Link>
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Trabajador</th>
                  <th>RUT</th>
                  <th>Fecha Inicio</th>
                  <th>Fecha Término</th>
                  <th>Duración</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacts.map((pact: any) => {
                  const startDate = new Date(pact.start_date)
                  const endDate = new Date(pact.end_date)
                  const today = new Date()
                  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                  const isExpiring = endDate >= today && endDate <= new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)
                  
                  return (
                    <tr key={pact.id}>
                      <td>
                        <code style={{
                          background: '#f3f4f6',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: '#1f2937'
                        }}>
                          {pact.pact_number || '-'}
                        </code>
                      </td>
                      <td>{pact.employees?.full_name || '-'}</td>
                      <td>{pact.employees?.rut || '-'}</td>
                      <td>{formatDate(pact.start_date, 'dd/MM/yyyy')}</td>
                      <td>
                        {formatDate(pact.end_date, 'dd/MM/yyyy')}
                        {isExpiring && pact.status === 'active' && (
                          <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '12px' }}>
                            ⚠️ Por vencer
                          </span>
                        )}
                      </td>
                      <td>{daysDiff} días</td>
                      <td>
                        <span className={`badge ${pact.status}`}>
                          {pact.status === 'draft' ? 'Borrador' : 
                           pact.status === 'active' ? 'Activo' : 
                           pact.status === 'expired' ? 'Vencido' : 
                           pact.status === 'renewed' ? 'Renovado' : 'Anulado'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Link href={`/overtime/${pact.id}`}>
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
                          <Link href={`/overtime/${pact.id}/pdf`}>
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
                              title="Ver PDF"
                            >
                              <FaFilePdf style={{ fontSize: '14px', color: '#ef4444' }} />
                            </button>
                          </Link>
                          {(pact.status === 'draft' || pact.status === 'void') && (
                            <button
                              onClick={() => handleDelete(pact.id, pact.status)}
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
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

