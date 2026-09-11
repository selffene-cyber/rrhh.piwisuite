'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatMonthYear, MONTHS } from '@/lib/utils/date'
import { FaEye, FaTrash, FaBook, FaRedo, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const PAGE_SIZE = 15

export default function PayrollPage() {
  const { company: currentCompany } = useCurrentCompany()
  const [payrollSlips, setPayrollSlips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const now = new Date()
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1)
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'issued' | 'sent'>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('')
  const [reliquidationsMap, setReliquidationsMap] = useState<Map<string, number>>(new Map())
  const [currentPage, setCurrentPage] = useState(1)

  const [totalNetPay, setTotalNetPay] = useState<number>(0)
  const [totalImpositions, setTotalImpositions] = useState<number>(0)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [overdueCount, setOverdueCount] = useState<number>(0)
  const [loadingCards, setLoadingCards] = useState<boolean>(false)

  const [chartData, setChartData] = useState<any[]>([])
  const [loadingChart, setLoadingChart] = useState<boolean>(false)

  useEffect(() => {
    if (currentCompany) {
      loadEmployees()
    } else {
      setPayrollSlips([])
      setEmployees([])
      setChartData([])
      setLoading(false)
    }
  }, [currentCompany])

  useEffect(() => {
    if (currentCompany) {
      loadPayrollSlips()
    }
  }, [currentCompany, filterYear, filterMonth, filterStatus, filterEmployee])

  useEffect(() => {
    if (currentCompany) {
      loadHistoricalData()
    }
  }, [currentCompany])

  const loadReliquidationsCount = async (slips: any[]) => {
    if (!currentCompany || slips.length === 0) return
    try {
      const slipIds = slips.map(s => s.id)
      const { data, error } = await supabase
        .from('payroll_reliquidations')
        .select('reference_payroll_slip_id')
        .in('reference_payroll_slip_id', slipIds)
      if (error) return
      const countMap = new Map<string, number>()
      if (data) {
        for (const rel of data) {
          const count = countMap.get(rel.reference_payroll_slip_id) || 0
          countMap.set(rel.reference_payroll_slip_id, count + 1)
        }
      }
      setReliquidationsMap(countMap)
    } catch (error) {
      console.error('Error al cargar reliquidaciones:', error)
    }
  }

  const loadEmployees = async () => {
    if (!currentCompany) return
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('full_name', { ascending: true })
      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error al cargar trabajadores:', error)
    }
  }

  const loadPayrollSlips = async () => {
    if (!currentCompany) return
    try {
      setLoading(true)

      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', currentCompany.id)
      if (employeesError) throw employeesError
      if (!employees || employees.length === 0) {
        setPayrollSlips([])
        setLoading(false)
        return
      }

      const employeeIds = employees.map((emp: { id: string }) => emp.id)

      let query = supabase
        .from('payroll_slips')
        .select(`
          id,
          employee_id,
          period_id,
          days_worked,
          total_earnings,
          total_deductions,
          net_pay,
          taxable_base,
          total_legal_deductions,
          status,
          created_at,
          employees (full_name, rut, company_id, contract_type),
          payroll_periods (year, month)
        `)
        .in('employee_id', employeeIds)

      if (filterYear && filterMonth) {
        const { data: periodData } = await supabase
          .from('payroll_periods')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('year', filterYear)
          .eq('month', filterMonth)

        if (periodData && periodData.length > 0) {
          const periodIds = periodData.map((p: any) => p.id)
          query = query.in('period_id', periodIds)
        } else {
          setPayrollSlips([])
          setLoading(false)
          calculateCards([])
          return
        }
      } else if (filterYear) {
        const { data: periodData } = await supabase
          .from('payroll_periods')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('year', filterYear)

        if (periodData && periodData.length > 0) {
          const periodIds = periodData.map((p: any) => p.id)
          query = query.in('period_id', periodIds)
        } else {
          setPayrollSlips([])
          setLoading(false)
          calculateCards([])
          return
        }
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      let filtered = data || []

      if (filterStatus !== 'all') {
        filtered = filtered.filter((slip: any) => slip.status === filterStatus)
      }

      if (filterEmployee) {
        filtered = filtered.filter((slip: any) => slip.employee_id === filterEmployee)
      }

      setPayrollSlips(filtered)
      await loadReliquidationsCount(filtered)
      await calculateCards(filtered)
      setCurrentPage(1)
    } catch (error: any) {
      console.error('Error al cargar liquidaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHistoricalData = async () => {
    if (!currentCompany) return
    try {
      setLoadingChart(true)

      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', currentCompany.id)

      if (employeesError || !employees || employees.length === 0) {
        setChartData([])
        setLoadingChart(false)
        return
      }

      const employeeIds = employees.map((emp: { id: string }) => emp.id)

      const { data, error } = await supabase
        .from('payroll_slips')
        .select('total_earnings, net_pay, status, payroll_periods (year, month)')
        .in('employee_id', employeeIds)
        .in('status', ['issued', 'sent'])
        .order('created_at', { ascending: true })

      if (error) throw error

      const monthData = new Map<string, { totalEarnings: number; totalNetPay: number; count: number }>()
      const monthsToShow = 12
      const chartLabels: string[] = []

      for (let i = monthsToShow - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = `${MONTHS[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`
        monthData.set(key, { totalEarnings: 0, totalNetPay: 0, count: 0 })
        chartLabels.push(key)
      }

      if (data) {
        for (const slip of data) {
          if (!slip.payroll_periods) continue
          const key = `${slip.payroll_periods.year}-${String(slip.payroll_periods.month).padStart(2, '0')}`
          if (monthData.has(key)) {
            const info = monthData.get(key)!
            info.totalEarnings += Number(slip.total_earnings) || 0
            info.totalNetPay += Number(slip.net_pay) || 0
            info.count += 1
          }
        }
      }

      const chartDataArray = chartLabels.map(key => {
        const d = monthData.get(key)!
        const [year, month] = key.split('-').map(Number)
        return {
          periodo: `${MONTHS[month - 1].substring(0, 3)} ${year}`,
          'Total Haberes': Math.round(d.totalEarnings),
          'Líquido Pagado': Math.round(d.totalNetPay),
        }
      })

      setChartData(chartDataArray)
    } catch (error: any) {
      console.error('Error al cargar datos históricos:', error)
      setChartData([])
    } finally {
      setLoadingChart(false)
    }
  }

  const calculateCards = async (slips: any[]) => {
    if (!currentCompany) return
    try {
      setLoadingCards(true)

      const targetYear = filterYear || null
      const targetMonth = filterMonth || null

      let totalNet = 0
      const issuedSlips = slips.filter((s: any) => s.status === 'issued' || s.status === 'sent')
      totalNet = issuedSlips.reduce((sum, s) => sum + (Number(s.net_pay) || 0), 0)
      setTotalNetPay(totalNet)

      let totalImpositionsValue = 0
      if (targetYear && targetMonth && issuedSlips.length > 0) {
        const totalLegalDeductions = issuedSlips.reduce((sum, s) => sum + (Number(s.total_legal_deductions) || 0), 0)

        let totalEmployerContributions = 0
        const parseChileanNumber = (str: string): number => {
          if (!str) return 0
          return parseFloat(str.replace(/\./g, '').replace(',', '.'))
        }
        const indicators = await getCachedIndicators(targetYear, targetMonth)
        if (indicators) {
          for (const slip of issuedSlips) {
            const taxableBase = Number(slip.taxable_base) || 0
            const employee = slip.employees
            if (taxableBase > 0 && employee) {
              const employerAfp = Math.ceil(taxableBase * 0.001)
              const sisRate = indicators.TasaSIS ? parseChileanNumber(indicators.TasaSIS) / 100 : 0
              const employerSis = Math.ceil(taxableBase * sisRate)
              const contractType = employee.contract_type || 'indefinido'
              let afcRate = 0
              if (contractType === 'indefinido' && indicators.AFCCpiEmpleador) {
                afcRate = parseChileanNumber(indicators.AFCCpiEmpleador) / 100
              } else if (contractType === 'plazo_fijo' && indicators.AFCCpfEmpleador) {
                afcRate = parseChileanNumber(indicators.AFCCpfEmpleador) / 100
              } else if (contractType === 'temporal' && indicators.AFCTcpEmpleador) {
                afcRate = parseChileanNumber(indicators.AFCTcpEmpleador) / 100
              }
              const employerAfc = Math.ceil(taxableBase * afcRate)
              totalEmployerContributions += (employerAfp + employerSis + employerAfc)
            }
          }
        }
        totalImpositionsValue = totalLegalDeductions + totalEmployerContributions
      }
      setTotalImpositions(totalImpositionsValue)

      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const { data: currentPeriod } = await supabase
        .from('payroll_periods')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .single()

      if (currentPeriod) {
        const { data: activeEmployees } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active')
        if (activeEmployees && activeEmployees.length > 0) {
          const { data: existingSlips } = await supabase
            .from('payroll_slips')
            .select('employee_id')
            .eq('period_id', currentPeriod.id)
          const existingIds = existingSlips?.map((s: any) => s.employee_id) || []
          setPendingCount(activeEmployees.filter((e: any) => !existingIds.includes(e.id)).length)
        } else {
          setPendingCount(0)
        }
      } else {
        const { data: activeEmployees } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active')
        setPendingCount(activeEmployees?.length || 0)
      }

      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear
      const { data: previousPeriod } = await supabase
        .from('payroll_periods')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('year', previousYear)
        .eq('month', previousMonth)
        .single()

      if (previousPeriod) {
        const { data: activeEmpPrev } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active')
        if (activeEmpPrev && activeEmpPrev.length > 0) {
          const { data: existingPrev } = await supabase
            .from('payroll_slips')
            .select('employee_id')
            .eq('period_id', previousPeriod.id)
          const existingPrevIds = existingPrev?.map((s: any) => s.employee_id) || []
          setOverdueCount(activeEmpPrev.filter((e: any) => !existingPrevIds.includes(e.id)).length)
        } else {
          setOverdueCount(0)
        }
      } else {
        setOverdueCount(0)
      }
    } catch (error: any) {
      console.error('Error al calcular cards:', error)
    } finally {
      setLoadingCards(false)
    }
  }

  const handleDelete = async (id: string, status: string) => {
    const isIssued = status === 'issued' || status === 'sent'
    const message = isIssued
      ? '¿Estás seguro de que deseas eliminar esta liquidación EMITIDA? Esta acción no se puede deshacer y la liquidación será eliminada permanentemente. Los anticipos vinculados volverán a estar disponibles.'
      : '¿Estás seguro de que deseas eliminar esta liquidación? Esta acción no se puede deshacer. Los anticipos vinculados volverán a estar disponibles.'
    if (!confirm(message)) return

    try {
      const { data: linkedAdvances, error: advancesError } = await supabase
        .from('advances')
        .select('id, status')
        .eq('payroll_slip_id', id)
      if (advancesError) console.error('Error al buscar anticipos:', advancesError)

      if (linkedAdvances && linkedAdvances.length > 0) {
        const advanceIds = linkedAdvances.map((adv: any) => adv.id)
        await supabase
          .from('advances')
          .update({ status: 'pagado', payroll_slip_id: null, discounted_at: null, updated_at: new Date().toISOString() })
          .in('id', advanceIds)
          .eq('status', 'descontado')
      }

      const { error } = await supabase
        .from('payroll_slips')
        .delete()
        .eq('id', id)
      if (error) throw error

      alert('Liquidación eliminada correctamente')
      loadPayrollSlips()
    } catch (error: any) {
      alert('Error al eliminar liquidación: ' + error.message)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const totalPages = Math.ceil(payrollSlips.length / PAGE_SIZE)
  const paginatedSlips = payrollSlips.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const groupedSlips = paginatedSlips.reduce((groups: Record<string, any[]>, slip: any) => {
    const key = slip.payroll_periods
      ? `${MONTHS[slip.payroll_periods.month - 1]} ${slip.payroll_periods.year}`
      : 'Sin Período'
    if (!groups[key]) groups[key] = []
    groups[key].push(slip)
    return groups
  }, {})

  const navigateMonth = (direction: number) => {
    let newMonth = filterMonth + direction
    let newYear = filterYear
    if (newMonth < 1) { newMonth = 12; newYear-- }
    if (newMonth > 12) { newMonth = 1; newYear++ }
    setFilterMonth(newMonth)
    setFilterYear(newYear)
  }

  if (!currentCompany) {
    return (
      <div>
        <h1>Liquidaciones de Sueldo</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver las liquidaciones.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Liquidaciones de Sueldo</h1>
          <Link href="/payroll-book">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaBook size={16} /> Libro de Remuneraciones
            </button>
          </Link>
        </div>
        <div className="card"><p>Cargando liquidaciones...</p></div>
      </div>
    )
  }

  const periodLabel = filterMonth && filterYear ? `${MONTHS[filterMonth - 1]} ${filterYear}` : filterYear ? `Año ${filterYear}` : 'Todos los períodos'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1>Liquidaciones de Sueldo</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/payroll-book">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="secondary">
              <FaBook size={16} /> Libro de Remuneraciones
            </button>
          </Link>
          <Link href="/payroll/new">
            <button>Nueva Liquidación</button>
          </Link>
        </div>
      </div>

      {/* Cards de Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #059669' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Líquido a Pagar
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#059669', display: 'block' }}>
            {loadingCards ? '...' : `$${totalNetPay.toLocaleString('es-CL')}`}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{periodLabel}</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Imposiciones
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626', display: 'block' }}>
            {loadingCards ? '...' : `$${totalImpositions.toLocaleString('es-CL')}`}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Descuentos + Aportes</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Pendientes
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b', display: 'block' }}>
            {loadingCards ? '...' : pendingCount}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Mes en curso</span>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${overdueCount > 0 ? '#dc2626' : '#059669'}` }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Atrasadas
          </span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: overdueCount > 0 ? '#dc2626' : '#059669', display: 'block' }}>
            {loadingCards ? '...' : overdueCount}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Mes anterior</span>
        </div>
      </div>

      {/* Filtros con navegación de período */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>Período</h2>
          <button onClick={loadPayrollSlips} className="secondary" style={{ fontSize: '13px' }}>
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
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'draft' | 'issued' | 'sent')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="issued">Emitida</option>
              <option value="sent">Enviada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gráfico Histórico Mensual */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '16px' }}>Evolución Mensual — Últimos 12 Meses</h2>
        {loadingChart ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>Cargando gráfico...</p>
        ) : chartData.length === 0 || chartData.every(d => d['Total Haberes'] === 0 && d['Líquido Pagado'] === 0) ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay datos históricos disponibles. El gráfico aparecerá cuando se generen liquidaciones emitidas.
          </p>
        ) : (
          <div style={{ width: '100%', height: '300px', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="periodo" stroke="#6b7280" style={{ fontSize: '11px' }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}
                  formatter={(value: number | undefined) => value ? `$${value.toLocaleString('es-CL')}` : '$0'}
                  labelStyle={{ color: '#374151', fontWeight: '600', marginBottom: '8px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="Total Haberes" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} name="Total Haberes" />
                <Line type="monotone" dataKey="Líquido Pagado" stroke="#059669" strokeWidth={2.5} dot={{ fill: '#059669', r: 3 }} activeDot={{ r: 5 }} name="Líquido Pagado" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Lista de Liquidaciones */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>
            Liquidaciones — {periodLabel}
            <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
              ({payrollSlips.length} {payrollSlips.length === 1 ? 'registro' : 'registros'})
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

        {payrollSlips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No hay liquidaciones para {periodLabel}</p>
            <Link href="/payroll/new" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
              Crear una nueva liquidación
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
                      <th>RUT</th>
                      <th>Días</th>
                      <th>Total Haberes</th>
                      <th>Descuentos</th>
                      <th>Líquido</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedSlips).map(([period, slips]) => (
                      <>
                        <tr key={`header-${period}`}>
                          <td colSpan={8} style={{ background: '#f0f9ff', fontWeight: '600', fontSize: '13px', color: '#0369a1', padding: '8px 12px', borderBottom: '2px solid #bae6fd' }}>
                            {period}
                          </td>
                        </tr>
                        {slips.map((slip: any) => (
                          <tr key={slip.id}>
                            <td>{slip.employees?.full_name || '-'}</td>
                            <td style={{ fontSize: '13px' }}>{slip.employees?.rut || '-'}</td>
                            <td>{slip.days_worked}</td>
                            <td style={{ fontSize: '13px' }}>${(Number(slip.total_earnings) || 0).toLocaleString('es-CL')}</td>
                            <td style={{ fontSize: '13px', color: '#dc2626' }}>${(Number(slip.total_deductions) || 0).toLocaleString('es-CL')}</td>
                            <td style={{ fontWeight: '600', color: '#059669' }}>${(Number(slip.net_pay) || 0).toLocaleString('es-CL')}</td>
                            <td>
                              <span style={{
                                padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
                                background: slip.status === 'draft' ? '#f59e0b20' : slip.status === 'issued' ? '#10b98120' : '#3b82f620',
                                color: slip.status === 'draft' ? '#f59e0b' : slip.status === 'issued' ? '#10b981' : '#3b82f6',
                              }}>
                                {slip.status === 'draft' ? 'Borrador' : slip.status === 'issued' ? 'Emitida' : 'Enviada'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <Link href={`/payroll/${slip.id}`}>
                                  <button style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                                    <FaEye size={12} color="#3b82f6" />
                                  </button>
                                </Link>
                                {(reliquidationsMap.get(slip.id) || 0) > 0 && (
                                  <Link href={`/payroll/reliquidations?reference=${slip.id}`}>
                                    <button style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer' }} title={`${reliquidationsMap.get(slip.id)} reliquidación(es)`}>
                                      <FaRedo size={12} color="#f59e0b" />
                                    </button>
                                  </Link>
                                )}
                                <button
                                  onClick={() => handleDelete(slip.id, slip.status)}
                                  style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                                  title="Eliminar"
                                >
                                  <FaTrash size={12} color="#ef4444" />
                                </button>
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
              {Object.entries(groupedSlips).map(([period, slips]) => (
                <div key={period} style={{ marginBottom: '16px' }}>
                  <div style={{ background: '#f0f9ff', padding: '8px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', color: '#0369a1', marginBottom: '8px' }}>
                    {period}
                  </div>
                  {slips.map((slip: any) => (
                    <div key={slip.id} className="mobile-card" style={{ padding: '12px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong>{slip.employees?.full_name || '-'}</strong>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
                          background: slip.status === 'draft' ? '#f59e0b20' : slip.status === 'issued' ? '#10b98120' : '#3b82f620',
                          color: slip.status === 'draft' ? '#f59e0b' : slip.status === 'issued' ? '#10b981' : '#3b82f6',
                        }}>
                          {slip.status === 'draft' ? 'Borrador' : slip.status === 'issued' ? 'Emitida' : 'Enviada'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '13px' }}>
                        <div><span style={{ color: '#6b7280' }}>Haberes:</span><br />${(Number(slip.total_earnings) || 0).toLocaleString('es-CL')}</div>
                        <div><span style={{ color: '#6b7280' }}>Desc.:</span><br /><span style={{ color: '#dc2626' }}>${(Number(slip.total_deductions) || 0).toLocaleString('es-CL')}</span></div>
                        <div><span style={{ color: '#6b7280' }}>Líquido:</span><br /><span style={{ fontWeight: '600', color: '#059669' }}>${(Number(slip.net_pay) || 0).toLocaleString('es-CL')}</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <Link href={`/payroll/${slip.id}`} style={{ flex: 1 }}><button style={{ width: '100%', padding: '6px', fontSize: '13px' }}><FaEye /> Ver</button></Link>
                        <button onClick={() => handleDelete(slip.id, slip.status)} className="danger" style={{ padding: '6px' }}><FaTrash size={12} /></button>
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
  )
}