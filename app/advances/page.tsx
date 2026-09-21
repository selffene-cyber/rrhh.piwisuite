'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate, formatMonthYear, MONTHS } from '@/lib/utils/date'
import { FaPlus, FaFilePdf, FaEdit, FaCheck, FaMoneyBillWave, FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import ActionOverlay, { useActionOverlay } from '@/components/ActionOverlay'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const PAGE_SIZE = 15

export default function AdvancesPage() {
  const { companyId } = useCurrentCompany()
  const { isActing, errorMessage, executeAction } = useActionOverlay()
  const [loading, setLoading] = useState(true)
  const [loadingCards, setLoadingCards] = useState(false)
  const [loadingChart, setLoadingChart] = useState(false)
  const [advances, setAdvances] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [filterEmployee, setFilterEmployee] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const now = new Date()
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1)
  const [currentPage, setCurrentPage] = useState(1)
  const [chartData, setChartData] = useState<any[]>([])

  const [stats, setStats] = useState({
    totalPeriodAmount: 0,
    projectedNextMonth: 0,
    pendingCount: 0,
    discountedCount: 0,
    totalDiscountedAmount: 0
  })

  useEffect(() => {
    if (companyId) {
      loadData()
      checkAndFixOrphanedAdvances()
    } else {
      setEmployees([])
      setAdvances([])
      setLoading(false)
    }
  }, [filterEmployee, filterYear, filterMonth, filterStatus, companyId])

  useEffect(() => {
    if (companyId) {
      loadChartData()
    }
  }, [companyId])

  const checkAndFixOrphanedAdvances = async () => {
    try {
      const { data: orphanedAdvances, error } = await supabase
        .from('advances')
        .select('id, payroll_slip_id')
        .eq('status', 'descontado')
        .not('payroll_slip_id', 'is', null)

      if (error) {
        console.error('Error al verificar anticipos huérfanos:', error)
        return
      }

      if (!orphanedAdvances || orphanedAdvances.length === 0) {
        return
      }

      const payrollIds = orphanedAdvances.map((adv: { id: string; payroll_slip_id: string | null }) => adv.payroll_slip_id).filter(Boolean)
      if (payrollIds.length === 0) return

      const { data: existingPayrolls } = await supabase
        .from('payroll_slips')
        .select('id')
        .in('id', payrollIds)

      const existingPayrollIds = new Set(existingPayrolls?.map((p: { id: string }) => p.id) || [])

      const toFix = orphanedAdvances.filter((adv: { id: string; payroll_slip_id: string | null }) =>
        adv.payroll_slip_id && !existingPayrollIds.has(adv.payroll_slip_id)
      )

      if (toFix.length > 0) {
        const idsToFix = toFix.map((adv: { id: string; payroll_slip_id: string | null }) => adv.id)
        const { error: updateError } = await supabase
          .from('advances')
          .update({
            status: 'pagado',
            payroll_slip_id: null,
            discounted_at: null,
            updated_at: new Date().toISOString()
          })
          .in('id', idsToFix)

        if (updateError) {
          console.error('Error al restaurar anticipos huérfanos:', updateError)
        } else {
          console.log(`${toFix.length} anticipo(s) huérfano(s) restaurado(s) automáticamente`)
          loadData()
        }
      }
    } catch (error) {
      console.error('Error en verificación de anticipos huérfanos:', error)
    }
  }

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)

      if (!companyId) return

      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .in('status', ['active', 'licencia_medica'])
        .eq('company_id', companyId)
        .order('full_name')

      if (employeesData) {
        setEmployees(employeesData)
      }

      const employeeIds = employeesData?.map((emp: { id: string; full_name: string; rut: string }) => emp.id) || []

      const currentPeriod = `${filterYear}-${String(filterMonth).padStart(2, '0')}`

      let query = supabase
        .from('advances')
        .select(`
          *,
          employees (id, full_name, rut),
          payroll_slips (id, payroll_periods (year, month))
        `)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('period', currentPeriod)
        .order('advance_date', { ascending: false })

      if (filterEmployee) {
        query = query.eq('employee_id', filterEmployee)
      }

      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setAdvances(data || [])
      setCurrentPage(1)

      await loadStats(employeeIds)
    } catch (error: any) {
      console.error('Error al cargar anticipos:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const loadStats = async (employeeIds?: string[]) => {
    try {
      setLoadingCards(true)
      if (!companyId) return
      const ids = employeeIds || employees.map((e: any) => e.id)
      if (ids.length === 0) {
        setStats({ totalPeriodAmount: 0, projectedNextMonth: 0, pendingCount: 0, discountedCount: 0, totalDiscountedAmount: 0 })
        return
      }

      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

      const { data: periodAdvances } = await supabase
        .from('advances')
        .select('amount')
        .eq('period', currentPeriod)
        .in('status', ['firmado', 'pagado'])
        .is('payroll_slip_id', null)
        .in('employee_id', ids)

      const totalPeriodAmount = periodAdvances?.reduce((sum: number, adv: { amount: number | null }) => sum + Number(adv.amount || 0), 0) || 0

      const last3Months: string[] = []
      for (let i = 1; i <= 3; i++) {
        const date = new Date(currentYear, currentMonth - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        last3Months.push(`${year}-${String(month).padStart(2, '0')}`)
      }

      const { data: last3MonthsAdvances } = await supabase
        .from('advances')
        .select('amount, period')
        .in('period', last3Months)
        .in('status', ['pagado', 'descontado'])
        .in('employee_id', ids)

      let totalLast3Months = 0
      if (last3MonthsAdvances) {
        totalLast3Months = last3MonthsAdvances.reduce((sum: number, adv: { amount: number | null; period: string }) => sum + Number(adv.amount || 0), 0)
      }
      const projectedNextMonth = Math.ceil(totalLast3Months / 3)

      const { data: pendingAdvances } = await supabase
        .from('advances')
        .select('id')
        .in('status', ['firmado', 'pagado'])
        .is('payroll_slip_id', null)
        .in('employee_id', ids)

      const pendingCount = pendingAdvances?.length || 0

      const { data: discountedAdvances } = await supabase
        .from('advances')
        .select('id, amount')
        .eq('period', currentPeriod)
        .eq('status', 'descontado')
        .in('employee_id', ids)

      const discountedCount = discountedAdvances?.length || 0
      const totalDiscountedAmount = discountedAdvances?.reduce((sum: number, adv: { id: string; amount: number | null }) => sum + Number(adv.amount || 0), 0) || 0

      setStats({
        totalPeriodAmount,
        projectedNextMonth,
        pendingCount,
        discountedCount,
        totalDiscountedAmount
      })
    } catch (error: any) {
      console.error('Error al cargar estadísticas:', error)
    } finally {
      setLoadingCards(false)
    }
  }

  const loadChartData = async () => {
    if (!companyId) return
    try {
      setLoadingChart(true)
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)

      if (!employeesData || employeesData.length === 0) {
        setChartData([])
        setLoadingChart(false)
        return
      }

      const employeeIds = employeesData.map((e: { id: string }) => e.id)

      const monthsToShow = 12
      const monthData = new Map<string, { totalAmount: number; count: number }>()
      const chartLabels: string[] = []

      for (let i = monthsToShow - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthData.set(key, { totalAmount: 0, count: 0 })
        chartLabels.push(key)
      }

      const { data, error } = await supabase
        .from('advances')
        .select('amount, period, status')
        .in('employee_id', employeeIds)
        .in('status', ['pagado', 'descontado', 'firmado'])
        .order('advance_date', { ascending: true })

      if (error) throw error

      if (data) {
        for (const adv of data) {
          const key = adv.period
          if (monthData.has(key)) {
            const info = monthData.get(key)!
            info.totalAmount += Number(adv.amount) || 0
            info.count += 1
          }
        }
      }

      const chartDataArray = chartLabels.map(key => {
        const d = monthData.get(key)!
        const [year, month] = key.split('-').map(Number)
        return {
          periodo: `${MONTHS[month - 1].substring(0, 3)} ${year}`,
          'Monto Total': Math.round(d.totalAmount),
          'Cantidad': d.count,
        }
      })

      setChartData(chartDataArray)
    } catch (error) {
      console.error('Error al cargar gráfico:', error)
      setChartData([])
    } finally {
      setLoadingChart(false)
    }
  }

  const handleStatusChange = async (advanceId: string, newStatus: string) => {
    await executeAction(async () => {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'emitido') {
        updateData.issued_at = new Date().toISOString()
      } else if (newStatus === 'firmado') {
        updateData.signed_at = new Date().toISOString()
      } else if (newStatus === 'pagado') {
        updateData.paid_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('advances')
        .update(updateData)
        .eq('id', advanceId)

      if (error) throw error
      await loadData(true)
    }, 'Actualizando estado...')
  }

  const handleDelete = async (advanceId: string, employeeName: string, amount: number) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el anticipo de ${employeeName} por $${amount.toLocaleString('es-CL')}? Esta acción no se puede deshacer.`)) {
      return
    }

    await executeAction(async () => {
      const { error } = await supabase
        .from('advances')
        .delete()
        .eq('id', advanceId)

      if (error) throw error
      await loadData(true)
    }, 'Eliminando anticipo...')
  }

  const navigateMonth = (direction: number) => {
    let newMonth = filterMonth + direction
    let newYear = filterYear
    if (newMonth < 1) { newMonth = 12; newYear-- }
    if (newMonth > 12) { newMonth = 1; newYear++ }
    setFilterMonth(newMonth)
    setFilterYear(newYear)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      borrador: { label: 'Borrador', color: '#6b7280' },
      emitido: { label: 'Emitido', color: '#3b82f6' },
      firmado: { label: 'Firmado', color: '#8b5cf6' },
      pagado: { label: 'Pagado', color: '#10b981' },
      descontado: { label: 'Descontado', color: '#059669' },
    }
    const badge = badges[status] || { label: status, color: '#6b7280' }
    return (
      <span style={{
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '500',
        background: badge.color + '20',
        color: badge.color,
      }}>
        {badge.label}
      </span>
    )
  }

  const totalPages = Math.ceil(advances.length / PAGE_SIZE)
  const paginatedAdvances = advances.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const groupedAdvances = paginatedAdvances.reduce((groups: Record<string, any[]>, adv: any) => {
    const key = adv.period
      ? `${MONTHS[parseInt(adv.period.split('-')[1]) - 1]} ${adv.period.split('-')[0]}`
      : 'Sin Período'
    if (!groups[key]) groups[key] = []
    groups[key].push(adv)
    return groups
  }, {})

  const periodLabel = filterMonth && filterYear ? `${MONTHS[filterMonth - 1]} ${filterYear}` : ''

  if (!companyId) {
    return (
      <div>
        <h1>Anticipos de Remuneración</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver los anticipos.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Anticipos de Remuneración</h1>
        </div>
        <div className="card"><p>Cargando anticipos...</p></div>
      </div>
    )
  }

  return (
    <>
    <ActionOverlay isVisible={isActing} errorMessage={errorMessage} message="Procesando..." />
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1>Anticipos de Remuneración</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/advances/bulk">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="secondary">
              <FaPlus size={16} /> Anticipos Masivos
            </button>
          </Link>
          <Link href="/advances/new">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus size={16} /> Nuevo Anticipo
            </button>
          </Link>
        </div>
      </div>

      {/* Cards de Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Total a Pagar
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b', display: 'block' }}>
            {loadingCards ? '...' : `$${stats.totalPeriodAmount.toLocaleString('es-CL')}`}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Pendientes de descuento</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Proyección Próx. Mes
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#3b82f6', display: 'block' }}>
            {loadingCards ? '...' : `$${stats.projectedNextMonth.toLocaleString('es-CL')}`}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Promedio últimos 3 meses</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${stats.pendingCount > 0 ? '#8b5cf6' : '#059669'}` }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Pendientes
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: stats.pendingCount > 0 ? '#8b5cf6' : '#059669', display: 'block' }}>
            {loadingCards ? '...' : stats.pendingCount}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Sin descontar</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #059669' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Descontados
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#059669', display: 'block' }}>
            {loadingCards ? '...' : stats.discountedCount}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            {loadingCards ? '' : `$${stats.totalDiscountedAmount.toLocaleString('es-CL')}`} este mes
          </span>
        </div>
      </div>

      {/* Filtros con navegación de período */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>Período</h2>
          <button onClick={() => loadData()} className="secondary" style={{ fontSize: '13px' }}>
            Actualizar
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => navigateMonth(-1)} className="secondary" style={{ padding: '6px 10px' }}><FaChevronLeft /></button>
            <span style={{ fontWeight: '600', fontSize: '15px', minWidth: '140px', textAlign: 'center' }}>
              {MONTHS[filterMonth - 1]} {filterYear}
            </span>
            <button onClick={() => navigateMonth(1)} className="secondary" style={{ padding: '6px 10px' }}><FaChevronRight /></button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', minWidth: '180px' }}
            >
              <option value="">Todos los trabajadores</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="emitido">Emitido</option>
              <option value="firmado">Firmado</option>
              <option value="pagado">Pagado</option>
              <option value="descontado">Descontado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gráfico Histórico Mensual */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '16px' }}>Evolución Mensual — Últimos 12 Meses</h2>
        {loadingChart ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>Cargando gráfico...</p>
        ) : chartData.length === 0 || chartData.every(d => d['Monto Total'] === 0) ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay datos históricos disponibles. El gráfico aparecerá cuando se registren anticipos.
          </p>
        ) : (
          <div style={{ width: '100%', height: '300px', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="periodo" stroke="#6b7280" style={{ fontSize: '11px' }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (name === 'Monto Total') return value ? `$${value.toLocaleString('es-CL')}` : '$0'
                    return value !== undefined ? value : ''
                  }}
                  labelStyle={{ color: '#374151', fontWeight: '600', marginBottom: '8px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="Monto Total" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} name="Monto Total" />
                <Line yAxisId="right" type="monotone" dataKey="Cantidad" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 3 }} activeDot={{ r: 5 }} name="Cantidad" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Lista de Anticipos */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>
            Anticipos — {periodLabel}
            <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
              ({advances.length} {advances.length === 1 ? 'registro' : 'registros'})
            </span>
          </h2>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="secondary" style={{ padding: '4px 8px' }}>
                <FaChevronLeft size={10} />
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="secondary" style={{ padding: '4px 8px' }}>
                <FaChevronRight size={10} />
              </button>
            </div>
          )}
        </div>

        {advances.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No hay anticipos para {periodLabel}</p>
            <Link href="/advances/new" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
              Crear un nuevo anticipo
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
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th>Liquidación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedAdvances).map(([period, advs]) => (
                      <>
                        <tr key={`header-${period}`}>
                          <td colSpan={6} style={{ background: '#f0f9ff', fontWeight: '600', fontSize: '13px', color: '#0369a1', padding: '8px 12px', borderBottom: '2px solid #bae6fd' }}>
                            {period}
                          </td>
                        </tr>
                        {advs.map((advance: any) => (
                          <tr key={advance.id}>
                            <td>
                              <div>
                                <strong>{advance.employees?.full_name}</strong>
                                <br />
                                <small style={{ color: '#6b7280' }}>{advance.employees?.rut}</small>
                              </div>
                            </td>
                            <td>{formatDate(advance.advance_date)}</td>
                            <td style={{ fontWeight: '600', color: '#f59e0b' }}>${Number(advance.amount).toLocaleString('es-CL')}</td>
                            <td>{getStatusBadge(advance.status)}</td>
                            <td>
                              {advance.payroll_slip_id ? (
                                <Link href={`/payroll/${advance.payroll_slip_id}`} style={{ color: '#2563eb', fontSize: '13px' }}>
                                  Ver Liquidación
                                </Link>
                              ) : (
                                <span style={{ color: '#6b7280', fontSize: '13px' }}>-</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <Link href={`/advances/${advance.id}/pdf`} target="_blank">
                                  <button style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer' }} title="Ver PDF">
                                    <FaFilePdf size={12} color="#ef4444" />
                                  </button>
                                </Link>
                                {(advance.status === 'borrador' || advance.status === 'emitido') && (
                                  <Link href={`/advances/${advance.id}/edit`}>
                                    <button style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer' }} title="Editar">
                                      <FaEdit size={12} color="#3b82f6" />
                                    </button>
                                  </Link>
                                )}
                                {advance.status === 'borrador' && (
                                  <button
                                    onClick={() => handleStatusChange(advance.id, 'emitido')}
                                    style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer', color: '#3b82f6' }}
                                    title="Emitir"
                                  >
                                    <FaCheck size={12} />
                                  </button>
                                )}
                                {advance.status === 'emitido' && (
                                  <button
                                    onClick={() => handleStatusChange(advance.id, 'firmado')}
                                    style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer', color: '#8b5cf6' }}
                                    title="Marcar Firmado"
                                  >
                                    <FaCheck size={12} />
                                  </button>
                                )}
                                {advance.status === 'firmado' && (
                                  <button
                                    onClick={() => handleStatusChange(advance.id, 'pagado')}
                                    style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer', color: '#10b981' }}
                                    title="Marcar Pagado"
                                  >
                                    <FaCheck size={12} />
                                  </button>
                                )}
                                {advance.status === 'descontado' && (
                                  <button
                                    onClick={async () => {
                                      if (advance.payroll_slip_id) {
                                        const { data: payrollExists } = await supabase
                                          .from('payroll_slips')
                                          .select('id')
                                          .eq('id', advance.payroll_slip_id)
                                          .single()

                                        if (!payrollExists) {
                                          if (confirm('La liquidación vinculada no existe. ¿Restaurar este anticipo?')) {
                                            await executeAction(async () => {
                                              const { error } = await supabase
                                                .from('advances')
                                                .update({
                                                  status: 'pagado',
                                                  payroll_slip_id: null,
                                                  discounted_at: null,
                                                  updated_at: new Date().toISOString()
                                                })
                                                .eq('id', advance.id)
                                              if (error) throw error
                                              await loadData(true)
                                            }, 'Restaurando anticipo...')
                                          }
                                        } else {
                                          alert('Este anticipo está vinculado a una liquidación existente. No se puede restaurar.')
                                        }
                                      } else {
                                        if (confirm('¿Restaurar este anticipo?')) {
                                          await executeAction(async () => {
                                            const { error } = await supabase
                                              .from('advances')
                                              .update({
                                                status: 'pagado',
                                                updated_at: new Date().toISOString()
                                              })
                                              .eq('id', advance.id)
                                            if (error) throw error
                                            await loadData(true)
                                          }, 'Restaurando anticipo...')
                                        }
                                      }
                                    }}
                                    style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer', color: '#059669' }}
                                    title="Restaurar anticipo"
                                  >
                                    <FaCheck size={12} />
                                  </button>
                                )}
                                {advance.status !== 'descontado' && (
                                  <button
                                    onClick={() => handleDelete(advance.id, advance.employees?.full_name || 'el trabajador', Number(advance.amount))}
                                    style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Eliminar"
                                  >
                                    <FaTrash size={12} color="#ef4444" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="table-mobile-card">
              {Object.entries(groupedAdvances).map(([period, advs]) => (
                <div key={period} style={{ marginBottom: '16px' }}>
                  <div style={{ background: '#f0f9ff', padding: '8px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', color: '#0369a1', marginBottom: '8px' }}>
                    {period}
                  </div>
                  {advs.map((advance: any) => (
                    <div key={advance.id} className="mobile-card" style={{ padding: '12px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong>{advance.employees?.full_name || '-'}</strong>
                        {getStatusBadge(advance.status)}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '13px' }}>
                        <div><span style={{ color: '#6b7280' }}>Fecha:</span><br />{formatDate(advance.advance_date)}</div>
                        <div><span style={{ color: '#6b7280' }}>Monto:</span><br /><span style={{ fontWeight: '600', color: '#f59e0b' }}>${Number(advance.amount).toLocaleString('es-CL')}</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <Link href={`/advances/${advance.id}/pdf`} target="_blank" style={{ flex: 1 }}><button style={{ width: '100%', padding: '6px', fontSize: '13px' }}><FaFilePdf /> PDF</button></Link>
                        {(advance.status === 'borrador' || advance.status === 'emitido') && (
                          <Link href={`/advances/${advance.id}/edit`} style={{ flex: 1 }}><button style={{ width: '100%', padding: '6px', fontSize: '13px' }}><FaEdit /> Editar</button></Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '12px 0', borderTop: '1px solid #e5e7eb' }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="secondary" style={{ padding: '6px 12px' }}>
                  Anterior
                </button>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="secondary" style={{ padding: '6px 12px' }}>
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  )
}