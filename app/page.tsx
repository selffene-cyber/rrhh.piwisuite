'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { FaUsers, FaFileInvoiceDollar, FaUserPlus, FaCog, FaChartLine, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MONTHS } from '@/lib/utils/date'
import { calculatePayroll } from '@/lib/services/payrollCalculator'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'

export default function HomePage() {
  const [employeesCount, setEmployeesCount] = useState(0)
  const [payrollCount, setPayrollCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [projectedAmount, setProjectedAmount] = useState<number>(0)
  const [projectedLegalDeductions, setProjectedLegalDeductions] = useState<number>(0)
  const [employeesRanking, setEmployeesRanking] = useState<any[]>([])
  const [sortColumn, setSortColumn] = useState<string>('antiguedad')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadStats()
    loadMonthlyData()
    calculateProjection()
    loadEmployeesRanking()
    
    // Ejecutar Alert Engine automáticamente al cargar el dashboard
    runAlertEngineOnLoad()
  }, [])

  const runAlertEngineOnLoad = async () => {
    try {
      // Obtener company_id
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (company?.id) {
        // Ejecutar silenciosamente (sin mostrar alertas)
        await fetch('/api/alerts/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ company_id: company.id }),
        })
      }
    } catch (error) {
      // Silenciar errores en ejecución automática
      console.log('Alert Engine ejecutado automáticamente al cargar dashboard')
    }
  }

  const loadStats = async () => {
    try {
      // Obtener estadísticas básicas
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active')

      if (employeesError) {
        console.error('Error al contar trabajadores:', employeesError)
      } else {
        setEmployeesCount(employeesData?.length || 0)
      }

      // Contar liquidaciones emitidas o enviadas (no borradores)
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll_slips')
        .select('id')
        .in('status', ['issued', 'sent'])

      if (payrollError) {
        console.error('Error al contar liquidaciones:', payrollError)
      } else {
        setPayrollCount(payrollData?.length || 0)
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlyData = async () => {
    try {
      // Obtener liquidaciones de los últimos 12 meses
      const currentDate = new Date()
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

      const { data: payrollSlips, error } = await supabase
        .from('payroll_slips')
        .select(`
          net_pay,
          payroll_periods (year, month),
          created_at
        `)
        .in('status', ['issued', 'sent'])
        .gte('created_at', twelveMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error al cargar datos mensuales:', error)
        return
      }

      // Agrupar por mes/año y sumar net_pay
      const monthlyMap = new Map<string, number>()

      payrollSlips?.forEach((slip: any) => {
        if (slip.payroll_periods) {
          const key = `${slip.payroll_periods.year}-${slip.payroll_periods.month}`
          const current = monthlyMap.get(key) || 0
          monthlyMap.set(key, current + (slip.net_pay || 0))
        }
      })

      // Generar datos para los últimos 12 meses
      const data: any[] = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const key = `${year}-${month}`
        const total = monthlyMap.get(key) || 0

        data.push({
          month: `${MONTHS[month - 1]?.substring(0, 3)} ${year}`,
          total: Math.round(total),
          year,
          monthNum: month
        })
      }

      setMonthlyData(data)
    } catch (error) {
      console.error('Error al cargar datos mensuales:', error)
    }
  }

  const calculateProjection = async () => {
    try {
      // Obtener trabajadores activos con todos sus datos
      const { data: activeEmployees, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id, 
          base_salary, 
          transportation, 
          meal_allowance,
          afp,
          health_system,
          health_plan_percentage,
          requests_advance,
          advance_amount
        `)
        .eq('status', 'active')

      if (employeesError || !activeEmployees || activeEmployees.length === 0) {
        setProjectedAmount(0)
        setProjectedLegalDeductions(0)
        return
      }

      // Obtener el mes siguiente
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const nextYear = nextMonth.getFullYear()
      const nextMonthNum = nextMonth.getMonth() + 1

      // Calcular período del mes siguiente
      const periodStart = new Date(nextYear, nextMonthNum - 1, 1)
      const periodEnd = new Date(nextYear, nextMonthNum, 0)

      // Obtener indicadores de Previred del mes anterior (para el mes siguiente)
      let indicatorMonth = nextMonthNum - 1
      let indicatorYear = nextYear
      if (indicatorMonth === 0) {
        indicatorMonth = 12
        indicatorYear = nextYear - 1
      }
      const indicators = await getCachedIndicators(indicatorYear, indicatorMonth)

      // Obtener vacaciones y licencias del mes siguiente
      const { data: nextMonthVacations } = await supabase
        .from('vacations')
        .select('employee_id, start_date, end_date, days_count')
        .in('status', ['aprobada', 'tomada'])
        .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)

      const { data: nextMonthLeaves } = await supabase
        .from('medical_leaves')
        .select('employee_id, start_date, end_date, days_count')
        .eq('is_active', true)
        .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)

      // Calcular días de vacaciones/licencias por trabajador
      const vacationDaysByEmployee = new Map<string, number>()
      const leaveDaysByEmployee = new Map<string, number>()

      nextMonthVacations?.forEach((vac: any) => {
        const vacStart = new Date(vac.start_date)
        const vacEnd = new Date(vac.end_date)
        const overlapStart = vacStart > periodStart ? vacStart : periodStart
        const overlapEnd = vacEnd < periodEnd ? vacEnd : periodEnd
        
        if (overlapStart <= overlapEnd) {
          const diffTime = overlapEnd.getTime() - overlapStart.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          const current = vacationDaysByEmployee.get(vac.employee_id) || 0
          vacationDaysByEmployee.set(vac.employee_id, current + diffDays)
        }
      })

      nextMonthLeaves?.forEach((leave: any) => {
        const leaveStart = new Date(leave.start_date)
        const leaveEnd = new Date(leave.end_date)
        const overlapStart = leaveStart > periodStart ? leaveStart : periodStart
        const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd
        
        if (overlapStart <= overlapEnd) {
          const diffTime = overlapEnd.getTime() - overlapStart.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          const current = leaveDaysByEmployee.get(leave.employee_id) || 0
          leaveDaysByEmployee.set(leave.employee_id, current + diffDays)
        }
      })

      // Calcular pre-liquidación para cada trabajador
      let totalProjected = 0
      let totalLegalDeductions = 0

      for (const employee of activeEmployees) {
        // Días trabajados: 30 menos vacaciones y licencias
        const vacationDays = vacationDaysByEmployee.get(employee.id) || 0
        const leaveDays = leaveDaysByEmployee.get(employee.id) || 0
        const daysWorked = Math.max(0, 30 - leaveDays) // Vacaciones no se descuentan de días trabajados

        // Obtener préstamos activos del trabajador
        const { data: activeLoans } = await supabase
          .from('loans')
          .select('installment_amount')
          .eq('employee_id', employee.id)
          .eq('status', 'active')
          .gt('remaining_amount', 0)

        let totalLoansAmount = 0
        if (activeLoans && activeLoans.length > 0) {
          totalLoansAmount = activeLoans.reduce((sum, loan) => sum + (loan.installment_amount || 0), 0)
        }

        // Calcular anticipo si el trabajador lo solicita
        const advanceAmount = (employee.requests_advance && employee.advance_amount) ? employee.advance_amount : 0

        // Calcular pre-liquidación completa
        const calculation = await calculatePayroll(
          {
            baseSalary: employee.base_salary || 0,
            daysWorked: daysWorked,
            daysLeave: leaveDays,
            afp: employee.afp || '',
            healthSystem: employee.health_system || 'FONASA',
            healthPlanPercentage: employee.health_plan_percentage || 0,
            bonuses: 0, // Sin bonos adicionales en proyección
            overtime: 0, // Sin horas extras en proyección
            vacation: 0, // Las vacaciones ya están consideradas en días trabajados
            transportation: employee.transportation || 0,
            mealAllowance: employee.meal_allowance || 0,
            aguinaldo: 0, // Sin aguinaldo en proyección
            loans: totalLoansAmount,
            advances: advanceAmount,
          },
          indicators,
          nextYear,
          nextMonthNum
        )

        totalProjected += calculation.netPay
        totalLegalDeductions += calculation.legalDeductions.total
      }

      setProjectedAmount(Math.round(totalProjected))
      setProjectedLegalDeductions(Math.round(totalLegalDeductions))
    } catch (error) {
      console.error('Error al calcular proyección:', error)
      setProjectedAmount(0)
      setProjectedLegalDeductions(0)
    }
  }

  const loadEmployeesRanking = async () => {
    try {
      // Obtener todos los trabajadores activos
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, rut, hire_date')
        .eq('status', 'active')

      if (employeesError || !employees) {
        console.error('Error al cargar trabajadores:', employeesError)
        return
      }

      // Para cada trabajador, calcular métricas
      const rankingData = await Promise.all(
        employees.map(async (employee) => {
          // Calcular antigüedad en días
          const hireDate = new Date(employee.hire_date)
          const today = new Date()
          const antiguedad = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24))

          // Calcular ingresos líquidos totales
          const { data: payrolls } = await supabase
            .from('payroll_slips')
            .select('net_pay')
            .eq('employee_id', employee.id)
            .in('status', ['issued', 'sent'])

          const totalLiquidos = payrolls?.reduce((sum, p) => sum + (p.net_pay || 0), 0) || 0

          // Calcular días de vacaciones
          const { data: vacations } = await supabase
            .from('vacations')
            .select('days_count')
            .eq('employee_id', employee.id)
            .in('status', ['aprobada', 'tomada'])

          const diasVacaciones = vacations?.reduce((sum, v) => sum + (v.days_count || 0), 0) || 0

          // Calcular días de licencias médicas
          const { data: leaves } = await supabase
            .from('medical_leaves')
            .select('days_count')
            .eq('employee_id', employee.id)
            .eq('is_active', false) // Solo licencias completadas

          const diasLicencias = leaves?.reduce((sum, l) => sum + (l.days_count || 0), 0) || 0

          // Calcular total de préstamos
          const { data: loans } = await supabase
            .from('loans')
            .select('total_amount')
            .eq('employee_id', employee.id)
            .eq('status', 'active')

          const totalPrestamos = loans?.reduce((sum, l) => sum + (l.total_amount || 0), 0) || 0

          return {
            id: employee.id,
            nombre: employee.full_name,
            rut: employee.rut,
            antiguedad,
            totalLiquidos,
            diasAusencia: diasVacaciones + diasLicencias,
            diasLicencias,
            diasVacaciones,
            totalPrestamos
          }
        })
      )

      setEmployeesRanking(rankingData)
    } catch (error) {
      console.error('Error al cargar ranking de trabajadores:', error)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Ordenar datos localmente según la columna seleccionada
  const sortedRanking = [...employeesRanking].sort((a, b) => {
    let aValue: number
    let bValue: number

    switch (sortColumn) {
      case 'antiguedad':
        aValue = a.antiguedad
        bValue = b.antiguedad
        break
      case 'liquidos':
        aValue = a.totalLiquidos
        bValue = b.totalLiquidos
        break
      case 'ausencia':
        aValue = a.diasAusencia
        bValue = b.diasAusencia
        break
      case 'licencias':
        aValue = a.diasLicencias
        bValue = b.diasLicencias
        break
      case 'prestamos':
        aValue = a.totalPrestamos
        bValue = b.totalPrestamos
        break
      default:
        return 0
    }

    if (sortDirection === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
          Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Resumen general del sistema de remuneraciones
        </p>
      </div>

      {/* Cards de Estadísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
        marginBottom: '32px'
      }}
      className="stats-grid"
      >
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
          color: 'white',
          border: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Trabajadores Activos</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>
                {employeesCount || 0}
              </p>
            </div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUsers size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Liquidaciones Confirmadas</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>
                {payrollCount || 0}
              </p>
            </div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaFileInvoiceDollar size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '20px' }}>Accesos Rápidos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Link href="/employees" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <FaUsers size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Gestionar Trabajadores</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver y editar trabajadores</div>
              </div>
            </div>
          </Link>

          <Link href="/payroll" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <FaFileInvoiceDollar size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Ver Liquidaciones</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Historial de liquidaciones</div>
              </div>
            </div>
          </Link>

          <Link href="/payroll/new" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b'
              }}>
                <FaUserPlus size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Nueva Liquidación</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Crear nueva liquidación</div>
              </div>
            </div>
          </Link>

          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                <FaCog size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Configuración</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ajustes del sistema</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Gráfico de Remuneraciones Mensuales */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <FaChartLine size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Remuneraciones Mensuales</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Total pagado mes a mes (últimos 12 meses)</p>
          </div>
        </div>
        {monthlyData.length > 0 ? (
          <div style={{ width: '100%', height: '300px', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip 
                formatter={(value: number | undefined) => {
                  if (value === undefined) return ['$0', 'Total Pagado']
                  return [`$${value.toLocaleString('es-CL')}`, 'Total Pagado']
                }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#2563eb" 
                strokeWidth={3}
                dot={{ fill: '#2563eb', r: 4 }}
                name="Total Pagado"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No hay datos de liquidaciones para mostrar
          </div>
        )}
      </div>

      {/* Proyección del Mes Siguiente */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <FaChartLine size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Proyección del Mes Siguiente</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Estimación basada en trabajadores activos, vacaciones y licencias
            </p>
          </div>
        </div>
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px',
          border: '2px solid #f59e0b'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px', fontWeight: '500' }}>
                Sueldos Líquidos
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#78350f', margin: 0 }}>
                ${projectedAmount.toLocaleString('es-CL')}
              </p>
              <p style={{ fontSize: '12px', color: '#92400e', marginTop: '8px' }}>
                * Proyección estimada considerando trabajadores activos, vacaciones y licencias médicas programadas
              </p>
            </div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#78350f',
              flexShrink: 0
            }}>
              $
            </div>
          </div>
        </div>
      </div>

      {/* Imposiciones y Leyes Sociales */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <FaFileInvoiceDollar size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Imposiciones y Leyes Sociales</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Total proyectado en descuentos legales (AFP, Salud, Impuestos, Seguro de Cesantía)
            </p>
          </div>
        </div>
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          borderRadius: '12px',
          border: '2px solid #ef4444'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '8px', fontWeight: '500' }}>
                Total Imposiciones Proyectadas
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#7f1d1d', margin: 0 }}>
                ${projectedLegalDeductions.toLocaleString('es-CL')}
              </p>
              <p style={{ fontSize: '12px', color: '#991b1b', marginTop: '8px' }}>
                * Incluye: AFP, Salud/ISAPRE, Impuesto Único, Seguro de Cesantía (sin préstamos ni anticipos)
              </p>
            </div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#7f1d1d',
              flexShrink: 0
            }}>
              $
            </div>
          </div>
        </div>
      </div>

      {/* Ranking de Trabajadores */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <FaUsers size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Ranking de Trabajadores</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Estadísticas y métricas por trabajador
            </p>
          </div>
        </div>

        {/* Tabla Desktop */}
        <div className="table-mobile-hidden">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px', width: '50px' }}>
                    #
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px', width: '250px' }}>
                    Nombre
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px', width: '130px', whiteSpace: 'nowrap' }}>
                    RUT
                  </th>
                  <th 
                    style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#374151', 
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      width: '140px'
                    }}
                    onClick={() => handleSort('antiguedad')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Antigüedad (días)
                      {sortColumn === 'antiguedad' ? (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                  <th 
                    style={{ 
                      padding: '12px', 
                      textAlign: 'right', 
                      fontWeight: '600', 
                      color: '#374151', 
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      width: '160px'
                    }}
                    onClick={() => handleSort('liquidos')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                      Ingresos Líquidos
                      {sortColumn === 'liquidos' ? (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                  <th 
                    style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#374151', 
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      width: '130px'
                    }}
                    onClick={() => handleSort('ausencia')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      Días Ausencia
                      {sortColumn === 'ausencia' ? (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                  <th 
                    style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#374151', 
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      width: '130px'
                    }}
                    onClick={() => handleSort('licencias')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      Días Licencias
                      {sortColumn === 'licencias' ? (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                  <th 
                    style={{ 
                      padding: '12px', 
                      textAlign: 'right', 
                      fontWeight: '600', 
                      color: '#374151', 
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      width: '140px'
                    }}
                    onClick={() => handleSort('prestamos')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                      Préstamos
                      {sortColumn === 'prestamos' ? (
                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRanking.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      Cargando datos...
                    </td>
                  </tr>
                ) : (
                  sortedRanking.map((emp, index) => (
                    <tr 
                      key={emp.id} 
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                      }}
                    >
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '500', color: '#111827' }}>
                        <Link 
                          href={`/employees/${emp.id}`}
                          style={{ color: '#2563eb', textDecoration: 'none' }}
                        >
                          {emp.nombre}
                        </Link>
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px', whiteSpace: 'nowrap' }}>
                        {emp.rut}
                      </td>
                      <td style={{ padding: '12px', color: '#374151', fontSize: '14px' }}>
                        {emp.antiguedad.toLocaleString('es-CL')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500', color: '#059669' }}>
                        ${emp.totalLiquidos.toLocaleString('es-CL')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#374151', fontSize: '14px' }}>
                        {emp.diasAusencia}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#dc2626', fontSize: '14px' }}>
                        {emp.diasLicencias}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#7c3aed', fontSize: '14px' }}>
                        {emp.totalPrestamos > 0 ? `$${emp.totalPrestamos.toLocaleString('es-CL')}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards Mobile */}
        <div className="table-mobile-card">
          {sortedRanking.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              Cargando datos...
            </div>
          ) : (
            sortedRanking.map((emp, index) => (
              <div key={emp.id} className="mobile-card">
                <div className="mobile-card-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#8b5cf6' }}>#{index + 1}</span>
                  <Link 
                    href={`/employees/${emp.id}`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}
                  >
                    {emp.nombre}
                  </Link>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">RUT</span>
                  <span className="mobile-card-value">{emp.rut}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Antigüedad (días)</span>
                  <span className="mobile-card-value">{emp.antiguedad.toLocaleString('es-CL')}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Ingresos Líquidos</span>
                  <span className="mobile-card-value" style={{ fontWeight: '600', color: '#059669' }}>
                    ${emp.totalLiquidos.toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Días Ausencia</span>
                  <span className="mobile-card-value">{emp.diasAusencia}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Días Licencias</span>
                  <span className="mobile-card-value" style={{ color: '#dc2626' }}>{emp.diasLicencias}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Préstamos</span>
                  <span className="mobile-card-value" style={{ color: '#7c3aed' }}>
                    {emp.totalPrestamos > 0 ? `$${emp.totalPrestamos.toLocaleString('es-CL')}` : '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

