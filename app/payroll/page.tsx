'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatMonthYear, MONTHS } from '@/lib/utils/date'
import { FaEye, FaTrash, FaBook, FaRedo } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function PayrollPage() {
  const { company: currentCompany } = useCurrentCompany()
  const [payrollSlips, setPayrollSlips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [filterYear, setFilterYear] = useState<number | ''>('')
  const [filterMonth, setFilterMonth] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'issued' | 'sent'>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('')
  const [reliquidationsMap, setReliquidationsMap] = useState<Map<string, number>>(new Map())
  
  // Estados para los cards
  const [totalNetPay, setTotalNetPay] = useState<number>(0)
  const [totalImpositions, setTotalImpositions] = useState<number>(0)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [overdueCount, setOverdueCount] = useState<number>(0)
  const [loadingCards, setLoadingCards] = useState<boolean>(false)
  
  // Estados para el gráfico histórico
  const [chartData, setChartData] = useState<any[]>([])
  const [loadingChart, setLoadingChart] = useState<boolean>(false)

  useEffect(() => {
    if (currentCompany) {
      loadEmployees()
      loadPayrollSlips()
      loadHistoricalData()
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

  const loadReliquidationsCount = async (slips: any[]) => {
    if (!currentCompany || slips.length === 0) return

    try {
      const slipIds = slips.map(s => s.id)
      const { data, error } = await supabase
        .from('payroll_reliquidations')
        .select('reference_payroll_slip_id')
        .in('reference_payroll_slip_id', slipIds)

      if (error) {
        console.error('Error al cargar reliquidaciones:', error)
        return
      }

      // Contar reliquidaciones por liquidación
      const countMap = new Map<string, number>()
      if (data) {
        for (const rel of data) {
          const count = countMap.get(rel.reference_payroll_slip_id) || 0
          countMap.set(rel.reference_payroll_slip_id, count + 1)
        }
      }
      setReliquidationsMap(countMap)
    } catch (error: any) {
      console.error('Error al cargar conteo de reliquidaciones:', error)
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
      
      // Primero obtener los IDs de los empleados de la empresa actual
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

      // Obtener las liquidaciones solo de los empleados de la empresa actual
      const { data, error } = await supabase
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
          payroll_periods (year, month),
          payroll_items (*)
        `)
        .in('employee_id', employeeIds)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      // Filtrar en el cliente después de obtener los datos
      let filtered = data || []

      if (filterStatus !== 'all') {
        filtered = filtered.filter((slip: any) => slip.status === filterStatus)
      }

      if (filterYear) {
        filtered = filtered.filter((slip: any) => 
          slip.payroll_periods && slip.payroll_periods.year === filterYear
        )
      }

      if (filterMonth) {
        filtered = filtered.filter((slip: any) => 
          slip.payroll_periods && slip.payroll_periods.month === filterMonth
        )
      }

      if (filterEmployee) {
        filtered = filtered.filter((slip: any) => 
          slip.employee_id === filterEmployee
        )
      }

      setPayrollSlips(filtered)
      
      // Cargar reliquidaciones asociadas
      await loadReliquidationsCount(filtered)
      
      // Calcular los cards después de cargar las liquidaciones
      await calculateCards(filtered)
    } catch (error: any) {
      console.error('Error al cargar liquidaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHistoricalData = async () => {
    if (!currentCompany) {
      console.log('No hay empresa seleccionada para cargar datos históricos')
      return
    }

    try {
      setLoadingChart(true)
      console.log('Cargando datos históricos para empresa:', currentCompany.id)

      // Obtener IDs de empleados de la empresa
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', currentCompany.id)

      if (employeesError) {
        console.error('Error al obtener empleados:', employeesError)
        throw employeesError
      }

      if (!employees || employees.length === 0) {
        console.log('No hay empleados para la empresa')
        setChartData([])
        setLoadingChart(false)
        return
      }

      const employeeIds = employees.map((emp: { id: string }) => emp.id)
      console.log('IDs de empleados:', employeeIds.length)

      // Obtener todas las liquidaciones emitidas/enviadas agrupadas por año
      const { data, error } = await supabase
        .from('payroll_slips')
        .select(`
          total_earnings,
          net_pay,
          status,
          payroll_periods (year, month)
        `)
        .in('employee_id', employeeIds)
        .in('status', ['issued', 'sent'])
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error al obtener liquidaciones:', error)
        throw error
      }

      console.log('Liquidaciones encontradas:', data?.length || 0)

      // Agrupar por año
      const yearData = new Map<number, { totalEarnings: number; totalNetPay: number; count: number }>()

      if (data && data.length > 0) {
        for (const slip of data) {
          if (!slip.payroll_periods) continue
          const year = slip.payroll_periods.year

          if (!yearData.has(year)) {
            yearData.set(year, { totalEarnings: 0, totalNetPay: 0, count: 0 })
          }

          const yearInfo = yearData.get(year)!
          yearInfo.totalEarnings += Number(slip.total_earnings) || 0
          yearInfo.totalNetPay += Number(slip.net_pay) || 0
          yearInfo.count += 1
        }
      }

      // Convertir a array y ordenar por año
      const chartDataArray = Array.from(yearData.entries())
        .map(([year, data]) => ({
          año: year.toString(),
          'Total Haberes': Math.round(data.totalEarnings),
          'Líquido Pagado': Math.round(data.totalNetPay)
        }))
        .sort((a, b) => parseInt(a.año) - parseInt(b.año))

      console.log('Datos del gráfico:', chartDataArray)
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

      const now = new Date()
      
      // Determinar el mes y año a usar para los totales (solo si hay filtros)
      const targetYear = filterYear || null
      const targetMonth = filterMonth || null

      // Card 1: Total líquido a pagar (solo liquidaciones emitidas/enviadas)
      let totalNet = 0
      if (targetYear && targetMonth) {
        totalNet = slips.reduce((sum, slip) => {
          // Solo sumar si coincide con el período filtrado Y está emitida o enviada
          if (slip.payroll_periods && 
              slip.payroll_periods.year === targetYear && 
              slip.payroll_periods.month === targetMonth &&
              (slip.status === 'issued' || slip.status === 'sent')) {
            return sum + (Number(slip.net_pay) || 0)
          }
          return sum
        }, 0)
      } else if (targetYear) {
        // Si solo hay filtro de año, sumar todas las del año (solo emitidas/enviadas)
        totalNet = slips.reduce((sum, slip) => {
          if (slip.payroll_periods && 
              slip.payroll_periods.year === targetYear &&
              (slip.status === 'issued' || slip.status === 'sent')) {
            return sum + (Number(slip.net_pay) || 0)
          }
          return sum
        }, 0)
      }
      setTotalNetPay(totalNet)

      // Card 2: Total imposiciones (descuentos legales + aportes empleador) - solo emitidas/enviadas
      let totalImpositionsValue = 0

      // Solo calcular si hay filtros de mes/año
      if (targetYear && targetMonth) {
        // Filtrar solo liquidaciones emitidas/enviadas del período seleccionado
        const issuedSlips = slips.filter((slip: any) => 
          slip.payroll_periods && 
          slip.payroll_periods.year === targetYear && 
          slip.payroll_periods.month === targetMonth &&
          (slip.status === 'issued' || slip.status === 'sent')
        )

        // Sumar descuentos legales
        const totalLegalDeductions = issuedSlips.reduce((sum, slip) => {
          return sum + (Number(slip.total_legal_deductions) || 0)
        }, 0)

        // Calcular aportes del empleador
        let totalEmployerContributions = 0
        const parseChileanNumber = (str: string): number => {
          if (!str) return 0
          return parseFloat(str.replace(/\./g, '').replace(',', '.'))
        }

        // Obtener indicadores del período
        const indicators = await getCachedIndicators(targetYear, targetMonth)

        if (indicators && issuedSlips.length > 0) {
          for (const slip of issuedSlips) {
            const taxableBase = Number(slip.taxable_base) || 0
            const employee = slip.employees

            if (taxableBase > 0 && employee) {
              // AFP Empleador: 0.1% de la base imponible
              const employerAfp = Math.ceil(taxableBase * 0.001)

              // SIS: Tasa del indicador
              const sisRate = indicators.TasaSIS ? parseChileanNumber(indicators.TasaSIS) / 100 : 0
              const employerSis = Math.ceil(taxableBase * sisRate)

              // AFC Empleador: según tipo de contrato
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
      } else if (targetYear) {
        // Si solo hay filtro de año, calcular para todo el año
        const issuedSlips = slips.filter((slip: any) => 
          slip.payroll_periods && 
          slip.payroll_periods.year === targetYear &&
          (slip.status === 'issued' || slip.status === 'sent')
        )

        // Sumar descuentos legales
        const totalLegalDeductions = issuedSlips.reduce((sum, slip) => {
          return sum + (Number(slip.total_legal_deductions) || 0)
        }, 0)

        // Calcular aportes del empleador agrupados por período
        let totalEmployerContributions = 0
        const parseChileanNumber = (str: string): number => {
          if (!str) return 0
          return parseFloat(str.replace(/\./g, '').replace(',', '.'))
        }

        // Agrupar por período
        const slipsByPeriod = new Map<string, any[]>()
        for (const slip of issuedSlips) {
          if (!slip.payroll_periods) continue
          const periodKey = `${slip.payroll_periods.year}-${slip.payroll_periods.month}`
          if (!slipsByPeriod.has(periodKey)) {
            slipsByPeriod.set(periodKey, [])
          }
          slipsByPeriod.get(periodKey)!.push(slip)
        }

        // Calcular aportes por período
        for (const [periodKey, periodSlips] of slipsByPeriod.entries()) {
          const [year, month] = periodKey.split('-').map(Number)
          const indicators = await getCachedIndicators(year, month)

          if (indicators) {
            for (const slip of periodSlips) {
              const taxableBase = Number(slip.taxable_base) || 0
              const employee = slip.employees

              if (taxableBase > 0 && employee) {
                // AFP Empleador: 0.1% de la base imponible
                const employerAfp = Math.ceil(taxableBase * 0.001)

                // SIS: Tasa del indicador
                const sisRate = indicators.TasaSIS ? parseChileanNumber(indicators.TasaSIS) / 100 : 0
                const employerSis = Math.ceil(taxableBase * sisRate)

                // AFC Empleador: según tipo de contrato
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
        }

        totalImpositionsValue = totalLegalDeductions + totalEmployerContributions
      }

      setTotalImpositions(totalImpositionsValue)

      // Card 3: Liquidaciones pendientes del mes en curso
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      // Obtener período del mes actual
      const { data: currentPeriod } = await supabase
        .from('payroll_periods')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .single()

      if (currentPeriod) {
        // Obtener trabajadores activos
        const { data: activeEmployees } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active')

        if (activeEmployees && activeEmployees.length > 0) {
          const activeEmployeeIds = activeEmployees.map((e: any) => e.id)

          // Obtener liquidaciones existentes del mes actual
          const { data: existingSlips } = await supabase
            .from('payroll_slips')
            .select('employee_id')
            .eq('period_id', currentPeriod.id)

          const existingEmployeeIds = existingSlips?.map((s: any) => s.employee_id) || []
          const pendingEmployeeIds = activeEmployeeIds.filter((id: string) => !existingEmployeeIds.includes(id))
          setPendingCount(pendingEmployeeIds.length)
        } else {
          setPendingCount(0)
        }
      } else {
        // Si no existe el período, todos los activos están pendientes
        const { data: activeEmployees } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active')
        setPendingCount(activeEmployees?.length || 0)
      }

      // Card 4: Liquidaciones atrasadas (mes anterior)
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear

      // Obtener período del mes anterior
      const { data: previousPeriod } = await supabase
        .from('payroll_periods')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('year', previousYear)
        .eq('month', previousMonth)
        .single()

      if (previousPeriod) {
        // Obtener trabajadores activos al final del mes anterior
        const { data: activeEmployeesPrevious } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active')

        if (activeEmployeesPrevious && activeEmployeesPrevious.length > 0) {
          const activeEmployeeIdsPrevious = activeEmployeesPrevious.map((e: any) => e.id)

          // Obtener liquidaciones existentes del mes anterior
          const { data: existingSlipsPrevious } = await supabase
            .from('payroll_slips')
            .select('employee_id')
            .eq('period_id', previousPeriod.id)

          const existingEmployeeIdsPrevious = existingSlipsPrevious?.map((s: any) => s.employee_id) || []
          const overdueEmployeeIds = activeEmployeeIdsPrevious.filter((id: string) => !existingEmployeeIdsPrevious.includes(id))
          setOverdueCount(overdueEmployeeIds.length)
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
    const slip = payrollSlips.find((s: any) => s.id === id)
    const isIssued = status === 'issued' || status === 'sent'
    const message = isIssued 
      ? '¿Estás seguro de que deseas eliminar esta liquidación EMITIDA? Esta acción no se puede deshacer y la liquidación será eliminada permanentemente. Los anticipos vinculados volverán a estar disponibles.'
      : '¿Estás seguro de que deseas eliminar esta liquidación? Esta acción no se puede deshacer. Los anticipos vinculados volverán a estar disponibles.'
    
    if (!confirm(message)) {
      return
    }

    try {
      // Primero, restaurar los anticipos vinculados a esta liquidación
      const { data: linkedAdvances, error: advancesError } = await supabase
        .from('advances')
        .select('id, status')
        .eq('payroll_slip_id', id)

      if (advancesError) {
        console.error('Error al buscar anticipos vinculados:', advancesError)
        // Continuar con la eliminación aunque falle esto
      }

      // Restaurar anticipos: cambiar de "descontado" a "pagado" y limpiar el vínculo
      if (linkedAdvances && linkedAdvances.length > 0) {
        const advanceIds = linkedAdvances.map((adv: any) => adv.id)
        const { error: updateAdvancesError } = await supabase
          .from('advances')
          .update({
            status: 'pagado', // Restaurar a estado anterior (asumiendo que solo se descuentan anticipos pagados)
            payroll_slip_id: null,
            discounted_at: null,
            updated_at: new Date().toISOString()
          })
          .in('id', advanceIds)
          .eq('status', 'descontado') // Solo actualizar los que están descontados

        if (updateAdvancesError) {
          console.error('Error al restaurar anticipos:', updateAdvancesError)
          // Continuar con la eliminación aunque falle esto
        } else {
          console.log(`${linkedAdvances.length} anticipo(s) restaurado(s)`)
        }
      }

      // Eliminar la liquidación (las reliquidaciones se eliminan en cascada por FK)
      const { error } = await supabase
        .from('payroll_slips')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Liquidación eliminada correctamente' + (linkedAdvances && linkedAdvances.length > 0 ? `. ${linkedAdvances.length} anticipo(s) restaurado(s).` : ''))
      loadPayrollSlips()
    } catch (error: any) {
      alert('Error al eliminar liquidación: ' + error.message)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

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
              <FaBook size={16} />
              Libro de Remuneraciones
            </button>
          </Link>
        </div>
        <div className="card">
          <p>Cargando liquidaciones...</p>
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
        <h1>Liquidaciones de Sueldo</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/payroll-book">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="secondary">
              <FaBook size={16} />
              Libro de Remuneraciones
            </button>
          </Link>
          <Link href="/payroll/new">
            <button>Nueva Liquidación</button>
          </Link>
        </div>
      </div>

      {/* Cards de Resumen */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {/* Card 1: Total Líquido a Pagar */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              Total Líquido a Pagar
            </span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
              {loadingCards ? (
                <span style={{ fontSize: '14px', color: '#9ca3af' }}>Calculando...</span>
              ) : (
                `$${totalNetPay.toLocaleString('es-CL')}`
              )}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {filterMonth && filterYear 
                ? `${MONTHS[filterMonth - 1]} ${filterYear}` 
                : filterYear 
                  ? `Año ${filterYear}` 
                  : 'Seleccione mes y año'}
            </span>
          </div>
        </div>

        {/* Card 2: Total Imposiciones */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              Total Imposiciones
            </span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
              {loadingCards ? (
                <span style={{ fontSize: '14px', color: '#9ca3af' }}>Calculando...</span>
              ) : (
                `$${totalImpositions.toLocaleString('es-CL')}`
              )}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              Descuentos legales + Aportes empleador
            </span>
          </div>
        </div>

        {/* Card 3: Liquidaciones Pendientes */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              Liquidaciones Pendientes
            </span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
              {loadingCards ? (
                <span style={{ fontSize: '14px', color: '#9ca3af' }}>Calculando...</span>
              ) : (
                pendingCount
              )}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              Mes en curso
            </span>
          </div>
        </div>

        {/* Card 4: Liquidaciones Atrasadas */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              Liquidaciones Atrasadas
            </span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: overdueCount > 0 ? '#dc2626' : '#059669' }}>
              {loadingCards ? (
                <span style={{ fontSize: '14px', color: '#9ca3af' }}>Calculando...</span>
              ) : (
                overdueCount
              )}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              Mes anterior
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Filtros</h2>
          <button onClick={loadPayrollSlips} className="secondary">
            Actualizar
          </button>
        </div>
        <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="form-group">
            <label>Trabajador</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
            >
              <option value="">Todos</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Año</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">Todos</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mes</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">Todos</option>
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'draft' | 'issued' | 'sent')}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="issued">Emitida</option>
              <option value="sent">Enviada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gráfico Histórico */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Histórico Anual de Liquidaciones</h2>
        {loadingChart ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>Cargando gráfico...</p>
        ) : chartData.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay datos históricos disponibles. El gráfico aparecerá cuando se generen liquidaciones emitidas.
          </p>
        ) : (
          <div style={{ width: '100%', height: '350px', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="año" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  formatter={(value: number | undefined) => value ? `$${value.toLocaleString('es-CL')}` : '$0'}
                  labelStyle={{ color: '#374151', fontWeight: '600', marginBottom: '8px' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Total Haberes" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Total Haberes"
                />
                <Line 
                  type="monotone" 
                  dataKey="Líquido Pagado" 
                  stroke="#059669" 
                  strokeWidth={3}
                  dot={{ fill: '#059669', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Líquido Pagado"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>
            Lista de Liquidaciones
            {payrollSlips.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                ({payrollSlips.length} {payrollSlips.length === 1 ? 'liquidación' : 'liquidaciones'})
              </span>
            )}
          </h2>
        </div>
        {payrollSlips.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay liquidaciones que coincidan con los filtros seleccionados.
            {filterStatus === 'all' && !filterYear && !filterMonth && !filterEmployee && (
              <> <Link href="/payroll/new">Crear una nueva</Link></>
            )}
          </p>
        ) : (
          <>
            {/* Tabla Desktop */}
            <div className="table-mobile-hidden">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th>RUT</th>
                      <th>Período</th>
                      <th>Días Trabajados</th>
                      <th>Total Haberes</th>
                      <th>Total Descuentos</th>
                      <th>Líquido a Pagar</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollSlips.map((slip: any) => (
                      <tr key={slip.id}>
                        <td>{slip.employees?.full_name || '-'}</td>
                        <td>{slip.employees?.rut || '-'}</td>
                        <td>
                          {slip.payroll_periods ? 
                            formatMonthYear(slip.payroll_periods.year, slip.payroll_periods.month) : 
                            '-'
                          }
                        </td>
                        <td>{slip.days_worked}</td>
                        <td>${(Number(slip.total_earnings) || 0).toLocaleString('es-CL')}</td>
                        <td>${(Number(slip.total_deductions) || 0).toLocaleString('es-CL')}</td>
                        <td>${(Number(slip.net_pay) || 0).toLocaleString('es-CL')}</td>
                        <td>
                          <span className={`badge ${slip.status}`}>
                            {slip.status === 'draft' ? 'Borrador' : slip.status === 'issued' ? 'Emitida' : 'Enviada'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Link href={`/payroll/${slip.id}`}>
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
                            {(reliquidationsMap.get(slip.id) || 0) > 0 && (
                              <Link href={`/payroll/reliquidations?reference=${slip.id}`}>
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
                                  title={`${reliquidationsMap.get(slip.id) || 0} reliquidación(es)`}
                                >
                                  <FaRedo style={{ fontSize: '14px', color: '#f59e0b' }} />
                                </button>
                              </Link>
                            )}
                            <button
                              onClick={() => handleDelete(slip.id, slip.status)}
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
                              title="Eliminar liquidación"
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
            </div>

            {/* Cards Mobile */}
            <div className="table-mobile-card">
              {payrollSlips.map((slip: any) => (
                <div key={slip.id} className="mobile-card">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Trabajador</span>
                    <span className="mobile-card-value" style={{ fontWeight: '600' }}>
                      {slip.employees?.full_name || '-'}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">RUT</span>
                    <span className="mobile-card-value">{slip.employees?.rut || '-'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Período</span>
                    <span className="mobile-card-value">
                      {slip.payroll_periods ? 
                        formatMonthYear(slip.payroll_periods.year, slip.payroll_periods.month) : 
                        '-'
                      }
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Días Trabajados</span>
                    <span className="mobile-card-value">{slip.days_worked}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Total Haberes</span>
                    <span className="mobile-card-value">
                      ${(Number(slip.total_earnings) || 0).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Total Descuentos</span>
                    <span className="mobile-card-value" style={{ color: '#dc2626' }}>
                      ${(Number(slip.total_deductions) || 0).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Líquido a Pagar</span>
                    <span className="mobile-card-value" style={{ fontWeight: '600', color: '#059669' }}>
                      ${(Number(slip.net_pay) || 0).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Estado</span>
                    <span className="mobile-card-value">
                      <span className={`badge ${slip.status}`}>
                        {slip.status === 'draft' ? 'Borrador' : slip.status === 'issued' ? 'Emitida' : 'Enviada'}
                      </span>
                    </span>
                  </div>
                  <div className="mobile-card-actions">
                    <Link href={`/payroll/${slip.id}`} style={{ flex: 1 }}>
                      <button style={{ width: '100%', padding: '8px', fontSize: '14px' }}>
                        <FaEye style={{ marginRight: '6px' }} />
                        Ver
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(slip.id, slip.status)}
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

