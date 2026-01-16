'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { FaUsers, FaFileInvoiceDollar, FaUserPlus, FaCog, FaChartLine, FaSort, FaFileAlt, FaSortUp, FaSortDown, FaUmbrellaBeach, FaMoneyBillWave, FaHandHoldingUsd, FaExclamationTriangle, FaCalendarCheck, FaFolderOpen, FaClock, FaStethoscope } from 'react-icons/fa'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MONTHS } from '@/lib/utils/date'
import { calculatePayroll } from '@/lib/services/payrollCalculator'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'
import { getAFPRate, getUnemploymentInsuranceEmployerRate, getSISRate } from '@/lib/services/previredAPI'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

// Función para formatear fecha en formato "24/DIC/2025"
const formatDataDate = (year: number, month: number): string => {
  const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  const today = new Date()
  const day = today.getDate()
  return `${day}/${monthNames[month - 1]}/${year}`
}

export default function HomePage() {
  const { companyId } = useCurrentCompany()
  const [activeEmployeesCount, setActiveEmployeesCount] = useState(0)
  const [medicalLeaveEmployeesCount, setMedicalLeaveEmployeesCount] = useState(0)
  const [permissionEmployeesCount, setPermissionEmployeesCount] = useState(0)
  const [pendingPayrollCount, setPendingPayrollCount] = useState(0)
  const [confirmedPayrollCount, setConfirmedPayrollCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [monthlyDetailedData, setMonthlyDetailedData] = useState<any[]>([])
  const [chartView, setChartView] = useState<'net' | 'detailed' | 'employer'>('net')
  const [projectedAmount, setProjectedAmount] = useState<number>(0)
  const [projectedLegalDeductions, setProjectedLegalDeductions] = useState<{
    afp: number
    health: number
    uniqueTax: number
    unemploymentInsurance: number
    total: number
  }>({
    afp: 0,
    health: 0,
    uniqueTax: 0,
    unemploymentInsurance: 0,
    total: 0
  })
  const [dataDates, setDataDates] = useState<{
    afp: string
    health: string
    uniqueTax: string
    unemploymentInsurance: string
  }>({
    afp: '',
    health: '',
    uniqueTax: '',
    unemploymentInsurance: ''
  })
  const [projectedEmployerContributions, setProjectedEmployerContributions] = useState<number>(0)
  const [projectedEmployerContributionsBreakdown, setProjectedEmployerContributionsBreakdown] = useState<{
    afp: number
    sis: number
    afc: number
    total: number
  }>({
    afp: 0,
    sis: 0,
    afc: 0,
    total: 0
  })
  const [employerContributionRates, setEmployerContributionRates] = useState<{
    afp: number
    sis: number
    afc: number
  }>({
    afp: 0,
    sis: 0,
    afc: 0
  })
  const [employeesRanking, setEmployeesRanking] = useState<any[]>([])
  const [sortColumn, setSortColumn] = useState<string>('antiguedad')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Verificar si es trabajador y redirigir al portal
  useEffect(() => {
    const checkEmployeeAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Verificar si es super_admin (puede ver dashboard)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'super_admin') {
          return // Super admin puede ver el dashboard
        }

        // Verificar si es trabajador
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (employee) {
          // Es trabajador, redirigir al portal
          // Verificar si debe cambiar contraseña
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('must_change_password')
            .eq('id', user.id)
            .single()

          if (profileData?.must_change_password === true) {
            window.location.href = '/employee/change-password'
          } else {
            window.location.href = '/employee'
          }
        }
      } catch (error) {
        console.error('Error al verificar trabajador:', error)
      }
    }

    checkEmployeeAndRedirect()
  }, [])

  useEffect(() => {
    // Paralelizar carga de datos críticos
    Promise.all([
      loadStats(),
      loadMonthlyData(),
      runAlertEngineOnLoad() // Ejecutar en paralelo pero no esperar
    ]).catch(error => {
      console.error('Error al cargar datos del dashboard:', error)
    })

    // Cargar datos pesados después (no bloquean la UI inicial)
    // Usar setTimeout para no bloquear el render inicial
    setTimeout(() => {
      calculateProjection()
      loadEmployeesRanking()
    }, 100)
  }, [companyId])

  const runAlertEngineOnLoad = async () => {
    try {
      if (!companyId) return
      
      // Ejecutar silenciosamente (sin mostrar alertas) - no esperar respuesta
      fetch('/api/alerts/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_id: companyId }),
      }).catch(() => {
        // Silenciar errores en ejecución automática
      })
    } catch (error) {
      // Silenciar errores en ejecución automática
      console.log('Alert Engine ejecutado automáticamente al cargar dashboard')
    }
  }

  const loadStats = async () => {
    try {
      // Obtener estadísticas básicas
      if (!companyId) {
        setActiveEmployeesCount(0)
        setMedicalLeaveEmployeesCount(0)
        setPermissionEmployeesCount(0)
        setPendingPayrollCount(0)
        setConfirmedPayrollCount(0)
        setLoading(false)
        return
      }
      
      // Obtener todos los IDs de empleados de la empresa
      const { data: allEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('id, status')
        .eq('company_id', companyId)
      
      if (employeesError) {
        console.error('Error al cargar trabajadores:', employeesError)
        setActiveEmployeesCount(0)
        setMedicalLeaveEmployeesCount(0)
        setPermissionEmployeesCount(0)
        setPendingPayrollCount(0)
        setConfirmedPayrollCount(0)
        setLoading(false)
        return
      }

      const employeeIds = allEmployees?.map((emp: { id: string }) => emp.id) || []
      
      // Contar trabajadores activos
      const activeCount = allEmployees?.filter((emp: { status: string }) => emp.status === 'active').length || 0
      setActiveEmployeesCount(activeCount)

      // Contar trabajadores con licencia médica
      const medicalLeaveCount = allEmployees?.filter((emp: { status: string }) => emp.status === 'licencia_medica').length || 0
      setMedicalLeaveEmployeesCount(medicalLeaveCount)

      // Contar trabajadores con permiso laboral (trabajadores con permisos activos en el mes actual)
      const today = new Date()
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      
      const { data: currentPermissions, error: permissionsError } = await supabase
        .from('permissions')
        .select('employee_id')
        .in('employee_id', employeeIds)
        .eq('status', 'approved')
        .lte('start_date', currentMonthEnd.toISOString().split('T')[0])
        .gte('end_date', currentMonthStart.toISOString().split('T')[0])
      
      if (!permissionsError && currentPermissions) {
        const uniqueEmployeesWithPermissions = new Set(currentPermissions.map((p: { employee_id: string }) => p.employee_id))
        setPermissionEmployeesCount(uniqueEmployeesWithPermissions.size)
      } else {
        setPermissionEmployeesCount(0)
      }

      // Contar liquidaciones pendientes y confirmadas
      if (employeeIds.length > 0) {
        const [pendingResult, confirmedResult] = await Promise.all([
          // Liquidaciones pendientes (draft - no emitidas)
          supabase
            .from('payroll_slips')
            .select('id', { count: 'exact', head: true })
            .in('employee_id', employeeIds)
            .eq('status', 'draft'),
          
          // Liquidaciones confirmadas (issued o sent - emitidas)
          supabase
            .from('payroll_slips')
            .select('id', { count: 'exact', head: true })
            .in('employee_id', employeeIds)
            .in('status', ['issued', 'sent'])
        ])

        if (pendingResult.error) {
          console.error('Error al contar liquidaciones pendientes:', pendingResult.error)
          setPendingPayrollCount(0)
        } else {
          setPendingPayrollCount(pendingResult.count || 0)
        }

        if (confirmedResult.error) {
          console.error('Error al contar liquidaciones confirmadas:', confirmedResult.error)
          setConfirmedPayrollCount(0)
        } else {
          setConfirmedPayrollCount(confirmedResult.count || 0)
        }
      } else {
        setPendingPayrollCount(0)
        setConfirmedPayrollCount(0)
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
      setActiveEmployeesCount(0)
      setMedicalLeaveEmployeesCount(0)
      setPermissionEmployeesCount(0)
      setPendingPayrollCount(0)
      setConfirmedPayrollCount(0)
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlyData = async () => {
    try {
      if (!companyId) {
        setMonthlyData([])
        return
      }
      
      // Obtener IDs de empleados de la empresa
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
      
      const employeeIds = employeesData?.map((emp: { id: string }) => emp.id) || []
      
      if (employeeIds.length === 0) {
        setMonthlyData([])
        return
      }
      
      // Obtener liquidaciones de los últimos 12 meses de empleados de la empresa
      const currentDate = new Date()
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

      const { data: payrollSlips, error } = await supabase
        .from('payroll_slips')
        .select(`
          net_pay,
          total_earnings,
          taxable_base,
          total_legal_deductions,
          payroll_periods (year, month),
          employees!inner(afp, contract_type),
          created_at
        `)
        .in('employee_id', employeeIds)
        .in('status', ['issued', 'sent'])
        .gte('created_at', twelveMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error al cargar datos mensuales:', error)
        return
      }

      // Agrupar por mes/año y calcular totales
      const monthlyMap = new Map<string, {
        netPay: number
        totalEarnings: number
        taxableBase: number
        legalDeductions: number
        employerContributions: number
        employees: Array<{ afp: string, contract_type: string, taxable_base: number }>
      }>()

      payrollSlips?.forEach((slip: any) => {
        if (slip.payroll_periods && slip.employees) {
          const key = `${slip.payroll_periods.year}-${slip.payroll_periods.month}`
          const current = monthlyMap.get(key) || {
            netPay: 0,
            totalEarnings: 0,
            taxableBase: 0,
            legalDeductions: 0,
            employerContributions: 0,
            employees: []
          }
          
          current.netPay += (slip.net_pay || 0)
          current.totalEarnings += (slip.total_earnings || 0)
          current.taxableBase += (slip.taxable_base || 0)
          current.legalDeductions += (slip.total_legal_deductions || 0)
          current.employees.push({
            afp: slip.employees.afp || '',
            contract_type: slip.employees.contract_type || 'indefinido',
            taxable_base: slip.taxable_base || 0
          })
          
          monthlyMap.set(key, current)
        }
      })

      // Calcular aportes del empleador para cada mes
      const detailedData: any[] = []
      const simpleData: any[] = []
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const key = `${year}-${month}`
        const monthData = monthlyMap.get(key) || {
          netPay: 0,
          totalEarnings: 0,
          taxableBase: 0,
          legalDeductions: 0,
          employerContributions: 0,
          employees: []
        }

        // Calcular aportes del empleador para este mes
        let employerContributions = 0
        if (monthData.employees.length > 0) {
          // Obtener indicadores del período
          let indicatorMonth = month - 1
          let indicatorYear = year
          if (indicatorMonth === 0) {
            indicatorMonth = 12
            indicatorYear = year - 1
          }
          
          try {
            const indicators = await getCachedIndicators(indicatorYear, indicatorMonth)
            
            for (const emp of monthData.employees) {
              const taxableBase = emp.taxable_base
              
              // AFP empleador: 0.1%
              const afpRates = getAFPRate(emp.afp || '', indicators)
              const afpEmployer = taxableBase * (afpRates.empleador / 100)
              
              // SIS: según indicadores
              const sisRate = getSISRate(indicators)
              const sisEmployer = taxableBase * (sisRate / 100)
              
              // AFC: según tipo de contrato
              const afcRate = getUnemploymentInsuranceEmployerRate(emp.contract_type, indicators)
              const afcEmployer = taxableBase * (afcRate / 100)
              
              employerContributions += (afpEmployer + sisEmployer + afcEmployer)
            }
          } catch (error) {
            console.warn(`Error al calcular aportes empleador para ${year}-${month}:`, error)
          }
        }

        const monthLabel = `${MONTHS[month - 1]?.substring(0, 3)} ${year}`
        
        simpleData.push({
          month: monthLabel,
          total: Math.round(monthData.netPay),
          year,
          monthNum: month
        })

        detailedData.push({
          month: monthLabel,
          netPay: Math.round(monthData.netPay),
          totalEarnings: Math.round(monthData.totalEarnings),
          taxableBase: Math.round(monthData.taxableBase),
          legalDeductions: Math.round(monthData.legalDeductions),
          employerContributions: Math.round(employerContributions),
          totalWithEmployer: Math.round(monthData.totalEarnings + employerContributions),
          year,
          monthNum: month
        })
      }

      setMonthlyData(simpleData)
      setMonthlyDetailedData(detailedData)
    } catch (error) {
      console.error('Error al cargar datos mensuales:', error)
    }
  }

  const calculateProjection = async () => {
    try {
      if (!companyId) {
        setProjectedAmount(0)
        setProjectedLegalDeductions({
          afp: 0,
          health: 0,
          uniqueTax: 0,
          unemploymentInsurance: 0,
          total: 0
        })
        setProjectedEmployerContributionsBreakdown({
          afp: 0,
          sis: 0,
          afc: 0,
          total: 0
        })
        setProjectedEmployerContributions(0)
        return
      }

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
          contract_type,
          requests_advance,
          advance_amount
        `)
        .eq('status', 'active')
        .eq('company_id', companyId)

      if (employeesError || !activeEmployees || activeEmployees.length === 0) {
        setProjectedAmount(0)
        setProjectedLegalDeductions({
          afp: 0,
          health: 0,
          uniqueTax: 0,
          unemploymentInsurance: 0,
          total: 0
        })
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

      // Obtener IDs de empleados de la empresa actual para filtrar vacaciones y licencias
      const employeeIds = activeEmployees.map((emp: { id: string }) => emp.id)

      // Obtener vacaciones y licencias del mes siguiente (solo de empleados de la empresa actual)
      const { data: nextMonthVacations } = await supabase
        .from('vacations')
        .select('employee_id, start_date, end_date, days_count')
        .in('status', ['aprobada', 'tomada'])
        .in('employee_id', employeeIds)
        .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)

      const { data: nextMonthLeaves } = await supabase
        .from('medical_leaves')
        .select('employee_id, start_date, end_date, days_count')
        .eq('is_active', true)
        .in('employee_id', employeeIds)
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
      let totalAFP = 0
      let totalHealth = 0
      let totalUniqueTax = 0
      let totalUnemploymentInsurance = 0
      let totalEmployerContributions = 0
      let totalEmployerAFP = 0
      let totalEmployerSIS = 0
      let totalEmployerAFC = 0
      
      // Variables para almacenar las tasas (se usarán las del último trabajador o promedio)
      let afpEmployerRate = 0.1 // Por defecto 0.1%
      let sisEmployerRate = 0
      let totalTaxableBaseForAFC = 0 // Para calcular promedio ponderado de AFC
      let totalAFCRateWeighted = 0 // Suma ponderada de tasas AFC

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
          totalLoansAmount = activeLoans.reduce((sum: number, loan: { installment_amount: number | null }) => sum + (loan.installment_amount || 0), 0)
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
        // Sumar cada concepto por separado (AFP incluye 10% + adicional)
        totalAFP += (calculation.legalDeductions.afp10 + calculation.legalDeductions.afpAdditional)
        totalHealth += calculation.legalDeductions.health
        totalUniqueTax += calculation.legalDeductions.uniqueTax
        totalUnemploymentInsurance += calculation.legalDeductions.unemploymentInsurance
        
        // Calcular aportes del empleador para este trabajador
        // Usar la misma base imponible que se calculó en calculatePayroll
        // La base imponible es: sueldo proporcional + gratificación mensual
        const taxableBase = calculation.taxableBase
        
        // AFP empleador: 0.1%
        const afpRates = getAFPRate(employee.afp || '', indicators)
        afpEmployerRate = afpRates.empleador // Guardar tasa (es constante: 0.1%)
        const afpEmployer = taxableBase * (afpRates.empleador / 100)
        totalEmployerAFP += afpEmployer
        
        // SIS: según indicadores (típicamente 1.49%)
        const sisRate = getSISRate(indicators)
        sisEmployerRate = sisRate // Guardar tasa
        const sisEmployer = taxableBase * (sisRate / 100)
        totalEmployerSIS += sisEmployer
        
        // AFC: según tipo de contrato (2.40% indefinido, 3.00% plazo fijo)
        // Calcular promedio ponderado por base imponible
        const afcRate = getUnemploymentInsuranceEmployerRate(employee.contract_type, indicators)
        totalTaxableBaseForAFC += taxableBase
        totalAFCRateWeighted += (afcRate * taxableBase) // Ponderar tasa por base imponible
        const afcEmployer = taxableBase * (afcRate / 100)
        totalEmployerAFC += afcEmployer
        
        // Total aportes empleador para este trabajador
        totalEmployerContributions += (afpEmployer + sisEmployer + afcEmployer)
      }

      const totalLegalDeductions = totalAFP + totalHealth + totalUniqueTax + totalUnemploymentInsurance

      // Determinar qué mes se usó para el impuesto único (puede ser el mes siguiente o el actual)
      // Intentar obtener tramos para ver qué mes se usó realmente
      let taxMonthUsed = nextMonthNum
      let taxYearUsed = nextYear
      try {
        // Llamar a API route en lugar de importar directamente
        const responseNext = await fetch(`/api/tax-brackets?year=${nextYear}&month=${nextMonthNum}&period_type=MENSUAL`)
        if (responseNext.ok) {
          const dataNext = await responseNext.json()
          const bracketsNext = dataNext.brackets || null
          if (!bracketsNext || bracketsNext.length === 0) {
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth() + 1
            // Llamar a API route en lugar de importar directamente
            const responseCurrent = await fetch(`/api/tax-brackets?year=${currentYear}&month=${currentMonth}&period_type=MENSUAL`)
            if (responseCurrent.ok) {
              const dataCurrent = await responseCurrent.json()
              const bracketsCurrent = dataCurrent.brackets || null
              if (bracketsCurrent && bracketsCurrent.length > 0) {
                taxMonthUsed = currentMonth
                taxYearUsed = currentYear
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error al determinar mes de tramos:', error)
      }

      setProjectedAmount(Math.round(totalProjected))
      setProjectedLegalDeductions({
        afp: Math.round(totalAFP),
        health: Math.round(totalHealth),
        uniqueTax: Math.round(totalUniqueTax),
        unemploymentInsurance: Math.round(totalUnemploymentInsurance),
        total: Math.round(totalLegalDeductions)
      })
      setDataDates({
        afp: formatDataDate(indicatorYear, indicatorMonth),
        health: formatDataDate(indicatorYear, indicatorMonth),
        uniqueTax: formatDataDate(taxYearUsed, taxMonthUsed),
        unemploymentInsurance: formatDataDate(indicatorYear, indicatorMonth)
      })
      setProjectedEmployerContributions(Math.round(totalEmployerContributions))
      
      // Calcular promedio ponderado de AFC
      const afcEmployerRate = totalTaxableBaseForAFC > 0 ? totalAFCRateWeighted / totalTaxableBaseForAFC : 0
      
      // Usar las tasas reales de los indicadores (ya calculadas en el loop)
      setProjectedEmployerContributionsBreakdown({
        afp: Math.round(totalEmployerAFP),
        sis: Math.round(totalEmployerSIS),
        afc: Math.round(totalEmployerAFC),
        total: Math.round(totalEmployerContributions)
      })
      setEmployerContributionRates({
        afp: afpEmployerRate,
        sis: sisEmployerRate,
        afc: afcEmployerRate
      })
    } catch (error) {
      console.error('Error al calcular proyección:', error)
      setProjectedAmount(0)
      setProjectedLegalDeductions({
        afp: 0,
        health: 0,
        uniqueTax: 0,
        unemploymentInsurance: 0,
        total: 0
      })
      setProjectedEmployerContributions(0)
      setProjectedEmployerContributionsBreakdown({
        afp: 0,
        sis: 0,
        afc: 0,
        total: 0
      })
      setEmployerContributionRates({
        afp: 0,
        sis: 0,
        afc: 0
      })
    }
  }

  const loadEmployeesRanking = async () => {
    try {
      if (!companyId) {
        setEmployeesRanking([])
        return
      }
      
      // Obtener todos los trabajadores activos de la empresa
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, rut, hire_date')
        .eq('status', 'active')
        .eq('company_id', companyId)

      if (employeesError || !employees || employees.length === 0) {
        setEmployeesRanking([])
        return
      }

      const employeeIds = employees.map((emp: { id: string }) => emp.id)

      // Paralelizar todas las consultas agregadas (evitar N+1)
      const [payrollsResult, vacationsResult, leavesResult, loansResult] = await Promise.all([
        // Obtener todas las liquidaciones de todos los empleados
        supabase
          .from('payroll_slips')
          .select('employee_id, net_pay')
          .in('employee_id', employeeIds)
          .in('status', ['issued', 'sent']),
        
        // Obtener todas las vacaciones de todos los empleados
        supabase
          .from('vacations')
          .select('employee_id, days_count')
          .in('employee_id', employeeIds)
          .in('status', ['aprobada', 'tomada']),
        
        // Obtener todas las licencias médicas de todos los empleados
        supabase
          .from('medical_leaves')
          .select('employee_id, days_count')
          .in('employee_id', employeeIds)
          .eq('is_active', false),
        
        // Obtener todos los préstamos activos de todos los empleados
        supabase
          .from('loans')
          .select('employee_id, total_amount')
          .in('employee_id', employeeIds)
          .eq('status', 'active')
      ])

      // Agregar datos por empleado
      const payrollsByEmployee = new Map<string, number>()
      payrollsResult.data?.forEach((p: any) => {
        const current = payrollsByEmployee.get(p.employee_id) || 0
        payrollsByEmployee.set(p.employee_id, current + (p.net_pay || 0))
      })

      const vacationsByEmployee = new Map<string, number>()
      vacationsResult.data?.forEach((v: any) => {
        const current = vacationsByEmployee.get(v.employee_id) || 0
        vacationsByEmployee.set(v.employee_id, current + (v.days_count || 0))
      })

      const leavesByEmployee = new Map<string, number>()
      leavesResult.data?.forEach((l: any) => {
        const current = leavesByEmployee.get(l.employee_id) || 0
        leavesByEmployee.set(l.employee_id, current + (l.days_count || 0))
      })

      const loansByEmployee = new Map<string, number>()
      loansResult.data?.forEach((l: any) => {
        const current = loansByEmployee.get(l.employee_id) || 0
        loansByEmployee.set(l.employee_id, current + (l.total_amount || 0))
      })

      // Construir ranking
      const today = new Date()
      const rankingData = employees.map((employee: { id: string; hire_date: string; full_name: string; rut: string }) => {
        const hireDate = new Date(employee.hire_date)
        const antiguedad = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24))
        const diasVacaciones = vacationsByEmployee.get(employee.id) || 0
        const diasLicencias = leavesByEmployee.get(employee.id) || 0

        return {
          id: employee.id,
          nombre: employee.full_name,
          rut: employee.rut,
          antiguedad,
          totalLiquidos: payrollsByEmployee.get(employee.id) || 0,
          diasAusencia: diasVacaciones + diasLicencias,
          diasLicencias,
          diasVacaciones,
          totalPrestamos: loansByEmployee.get(employee.id) || 0
        }
      })

      setEmployeesRanking(rankingData)
    } catch (error) {
      console.error('Error al cargar ranking de trabajadores:', error)
      setEmployeesRanking([])
    }
  }

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }, [sortColumn, sortDirection])

  // Ordenar datos localmente según la columna seleccionada (memoizado)
  const sortedRanking = useMemo(() => {
    return [...employeesRanking].sort((a, b) => {
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
  }, [employeesRanking, sortColumn, sortDirection])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
    )
  }

  // Calcular el mes siguiente para mostrar en los títulos
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonthName = MONTHS[nextMonth.getMonth()]

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px'
      }}
      className="stats-grid"
      >
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            borderRadius: '12px',
            border: '2px solid #3b82f6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#1e40af', marginBottom: '8px', fontWeight: '500' }}>
                  TRABAJADORES ACTIVOS
                </p>
                <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
                  {activeEmployeesCount || 0}
                </p>
              </div>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '12px', 
                background: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e40af'
              }}>
                <FaUsers size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Trabajadores con Licencia Médica */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '12px',
            border: '2px solid #f59e0b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px', fontWeight: '500' }}>
                  CON LICENCIA MÉDICA
                </p>
                <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#78350f', margin: 0 }}>
                  {medicalLeaveEmployeesCount || 0}
                </p>
              </div>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '12px', 
                background: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#92400e'
              }}>
                <FaStethoscope size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Trabajadores con Permiso Laboral */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
            borderRadius: '12px',
            border: '2px solid #6366f1'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#4338ca', marginBottom: '8px', fontWeight: '500' }}>
                  CON PERMISO LABORAL
                </p>
                <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#312e81', margin: 0 }}>
                  {permissionEmployeesCount || 0}
                </p>
              </div>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '12px', 
                background: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4338ca'
              }}>
                <FaCalendarCheck size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Liquidaciones Pendientes */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            borderRadius: '12px',
            border: '2px solid #ef4444'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#991b1b', marginBottom: '8px', fontWeight: '500' }}>
                  LIQUIDACIONES PENDIENTES
                </p>
                <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#7f1d1d', margin: 0 }}>
                  {pendingPayrollCount || 0}
                </p>
              </div>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '12px', 
                background: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#991b1b'
              }}>
                <FaClock size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Liquidaciones Confirmadas */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
            borderRadius: '12px',
            border: '2px solid #10b981'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#065f46', marginBottom: '8px', fontWeight: '500' }}>
                  LIQUIDACIONES CONFIRMADAS
                </p>
                <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#064e3b', margin: 0 }}>
                  {confirmedPayrollCount || 0}
                </p>
              </div>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '12px', 
                background: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#065f46'
              }}>
                <FaFileInvoiceDollar size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '20px' }}>Accesos Rápidos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
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
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
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
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver y editar</div>
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
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
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
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Historial</div>
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
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
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
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Crear liquidación</div>
              </div>
            </div>
          </Link>

          <Link href="/vacations" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
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
                <FaUmbrellaBeach size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Gestionar Vacaciones</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver vacaciones</div>
              </div>
            </div>
          </Link>

          {/* Anticipos */}
          <Link href="/advances" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(245, 158, 11, 0.1)'
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
                <FaMoneyBillWave size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Gestionar Anticipos</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver anticipos</div>
              </div>
            </div>
          </Link>
          {/* Cartas de Amonestación */}
          <Link href="/disciplinary-actions" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(245, 158, 11, 0.1)'
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
                <FaExclamationTriangle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Cartas de Amonestación</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Gestionar amonestaciones</div>
              </div>
            </div>
          </Link>
          {/* Permisos */}
          <Link href="/permissions" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.1)'
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
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6'
              }}>
                <FaCalendarCheck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Permisos</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Gestionar permisos</div>
              </div>
            </div>
          </Link>
          {/* Banco de Documentos */}
          <Link href="/documents" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#059669'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(5, 150, 105, 0.1)'
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
                background: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}>
                <FaFolderOpen size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Banco de Documentos</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Gestionar documentos</div>
              </div>
            </div>
          </Link>
          {/* Generar Certificados */}
          <Link href="/certificates/generate" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#7c3aed'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(124, 58, 237, 0.1)'
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
                background: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed'
              }}>
                <FaFileAlt size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Generar Certificados</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Certificados laborales</div>
              </div>
            </div>
          </Link>
          {/* Gestión Horas Extras */}
          <Link href="/overtime" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(245, 158, 11, 0.1)'
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
                <FaClock size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Gestión Horas Extras</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Pactos y registros</div>
              </div>
            </div>
          </Link>
          {/* Licencias Médicas */}
          <Link href="/medical-leaves" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ef4444'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(239, 68, 68, 0.1)'
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
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <FaStethoscope size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Licencias Médicas</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Gestionar licencias</div>
              </div>
            </div>
          </Link>
          <Link href="/loans" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#8b5cf6'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(139, 92, 246, 0.1)'
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
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6'
              }}>
                <FaHandHoldingUsd size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Gestionar Préstamos</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver préstamos</div>
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
              gap: '12px',
              height: '88px',
              boxSizing: 'border-box'
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
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ajustes sistema</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Gráfico de Remuneraciones Mensuales */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                {chartView === 'net' ? 'Total líquido pagado mes a mes (últimos 12 meses)' :
                 chartView === 'detailed' ? 'Desglose completo mes a mes (últimos 12 meses)' :
                 'Aportes del empleador mes a mes (últimos 12 meses)'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setChartView('net')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: chartView === 'net' ? '#2563eb' : 'white',
                color: chartView === 'net' ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: chartView === 'net' ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              Líquido
            </button>
            <button
              onClick={() => setChartView('detailed')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: chartView === 'detailed' ? '#2563eb' : 'white',
                color: chartView === 'detailed' ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: chartView === 'detailed' ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              Completo
            </button>
            <button
              onClick={() => setChartView('employer')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: chartView === 'employer' ? '#f59e0b' : 'white',
                color: chartView === 'employer' ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: chartView === 'employer' ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              Aportes Empleador
            </button>
          </div>
        </div>
        {chartView === 'net' && monthlyData.length > 0 ? (
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
                    if (value === undefined) return ['$0', 'Total Líquido']
                    return [`$${value.toLocaleString('es-CL')}`, 'Total Líquido']
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
                  name="Total Líquido Pagado"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : chartView === 'detailed' && monthlyDetailedData.length > 0 ? (
          <div style={{ width: '100%', height: '300px', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyDetailedData}>
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
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (value === undefined) return ['$0', name || '']
                    return [`$${value.toLocaleString('es-CL')}`, name || '']
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
                  dataKey="totalEarnings" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  name="Total Haberes"
                />
                <Line 
                  type="monotone" 
                  dataKey="legalDeductions" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 3 }}
                  name="Descuentos Legales"
                />
                <Line 
                  type="monotone" 
                  dataKey="employerContributions" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                  name="Aportes Empleador"
                />
                <Line 
                  type="monotone" 
                  dataKey="netPay" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', r: 4 }}
                  name="Líquido Pagado"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalWithEmployer" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  name="Total con Aportes Empleador"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : chartView === 'employer' && monthlyDetailedData.length > 0 ? (
          <div style={{ width: '100%', height: '300px', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyDetailedData}>
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
                    if (value === undefined) return ['$0', 'Aportes Empleador']
                    return [`$${value.toLocaleString('es-CL')}`, 'Aportes Empleador']
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
                  dataKey="employerContributions" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  name="Total Aportes Empleador"
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
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Proyección de sueldos para el mes de {nextMonthName}</h2>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
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
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Imposiciones y Leyes Sociales - {nextMonthName}</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Descuentos legales proyectados por concepto
            </p>
          </div>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          {/* Card AFP */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            borderRadius: '12px',
            border: '2px solid #3b82f6'
          }}>
            <p style={{ fontSize: '12px', color: '#1e40af', marginBottom: '8px', fontWeight: '500' }}>
              FONDO DE PENSIONES AFP
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, marginBottom: '12px' }}>
              ${projectedLegalDeductions.afp.toLocaleString('es-CL')}
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#1e40af'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Se paga dónde: AFP</p>
              <p style={{ margin: '2px 0' }}>Vía: Previred</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                Datos: {dataDates.afp || 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Card Salud/ISAPRE */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
            borderRadius: '12px',
            border: '2px solid #10b981'
          }}>
            <p style={{ fontSize: '12px', color: '#065f46', marginBottom: '8px', fontWeight: '500' }}>
              SALUD / ISAPRE
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#064e3b', margin: 0, marginBottom: '12px' }}>
              ${projectedLegalDeductions.health.toLocaleString('es-CL')}
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#065f46'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Se paga dónde: Fonasa / Isapre</p>
              <p style={{ margin: '2px 0' }}>Vía: Previred</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                Datos: {dataDates.health || 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Card Impuesto Único */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '12px',
            border: '2px solid #f59e0b'
          }}>
            <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px', fontWeight: '500' }}>
              IMPUESTO ÚNICO
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#78350f', margin: 0, marginBottom: '12px' }}>
              ${projectedLegalDeductions.uniqueTax.toLocaleString('es-CL')}
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#92400e'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Se paga dónde: SII</p>
              <p style={{ margin: '2px 0' }}>Vía: F29</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                Datos: {dataDates.uniqueTax || 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Card Seguro de Cesantía */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
            borderRadius: '12px',
            border: '2px solid #ec4899'
          }}>
            <p style={{ fontSize: '12px', color: '#9f1239', marginBottom: '8px', fontWeight: '500' }}>
              SEGURO DE CESANTÍA
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#831843', margin: 0, marginBottom: '12px' }}>
              ${projectedLegalDeductions.unemploymentInsurance.toLocaleString('es-CL')}
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#9f1239'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Se paga dónde: AFC</p>
              <p style={{ margin: '2px 0' }}>Vía: Previred</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                Datos: {dataDates.unemploymentInsurance || 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Card Total */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            borderRadius: '12px',
            border: '2px solid #ef4444'
          }}>
            <p style={{ fontSize: '12px', color: '#991b1b', marginBottom: '8px', fontWeight: '500' }}>
              TOTAL IMPOSICIONES
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#7f1d1d', margin: 0 }}>
              ${projectedLegalDeductions.total.toLocaleString('es-CL')}
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#991b1b'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Total descuentos legales</p>
              <p style={{ margin: '2px 0' }}>del trabajador</p>
            </div>
          </div>
        </div>

        {/* Segunda Fila: Aportes del Empleador */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          marginTop: '24px'
        }}>
          {/* Card AFP Empleador */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
            borderRadius: '12px',
            border: '2px solid #6366f1'
          }}>
            <p style={{ fontSize: '12px', color: '#312e81', marginBottom: '8px', fontWeight: '500' }}>
              AFP EMPLEADOR
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e1b4b', margin: 0, marginBottom: '4px' }}>
              ${projectedEmployerContributionsBreakdown.afp.toLocaleString('es-CL')}
            </p>
            <p style={{ fontSize: '14px', color: '#4338ca', margin: 0, marginBottom: '12px', fontWeight: '600' }}>
              {employerContributionRates.afp.toFixed(2)}%
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#312e81'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Se paga dónde: AFP</p>
              <p style={{ margin: '2px 0' }}>Vía: Previred</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                Datos: {dataDates.afp || 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Card SIS Empleador */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            borderRadius: '12px',
            border: '2px solid #10b981'
          }}>
            <p style={{ fontSize: '12px', color: '#065f46', marginBottom: '8px', fontWeight: '500' }}>
              SIS EMPLEADOR
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#064e3b', margin: 0, marginBottom: '4px' }}>
              ${projectedEmployerContributionsBreakdown.sis.toLocaleString('es-CL')}
            </p>
            <p style={{ fontSize: '14px', color: '#059669', margin: 0, marginBottom: '12px', fontWeight: '600' }}>
              {employerContributionRates.sis.toFixed(2)}%
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#065f46'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Se paga dónde: AFP</p>
              <p style={{ margin: '2px 0' }}>Vía: Previred</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                Datos: {dataDates.afp || 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Card AFC Empleador */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
            borderRadius: '12px',
            border: '2px solid #ec4899'
          }}>
            <p style={{ fontSize: '12px', color: '#9f1239', marginBottom: '8px', fontWeight: '500' }}>
              AFC EMPLEADOR
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#831843', margin: 0, marginBottom: '4px' }}>
              ${projectedEmployerContributionsBreakdown.afc.toLocaleString('es-CL')}
            </p>
            <p style={{ fontSize: '14px', color: '#db2777', margin: 0, marginBottom: '12px', fontWeight: '600' }}>
              {employerContributionRates.afc.toFixed(2)}%
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#9f1239'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Se paga dónde: AFC</p>
              <p style={{ margin: '2px 0' }}>Vía: Previred</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontStyle: 'italic' }}>
                Datos: {dataDates.unemploymentInsurance || 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Card Total Aportes Empleador */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '12px',
            border: '2px solid #f59e0b'
          }}>
            <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px', fontWeight: '500' }}>
              TOTAL APORTES EMPLEADOR
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#78350f', margin: 0 }}>
              ${projectedEmployerContributionsBreakdown.total.toLocaleString('es-CL')}
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#92400e'
            }}>
              <p style={{ margin: '2px 0', fontWeight: '600' }}>Total aportes del empleador</p>
              <p style={{ margin: '2px 0' }}>AFP + SIS + AFC</p>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '8px' }}>
            * Proyección basada en trabajadores activos del mes siguiente (sin préstamos ni anticipos)
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            * Los aportes del empleador (AFP, SIS, AFC) son adicionales a los descuentos legales del trabajador y se calculan sobre la base imponible. Todos los valores y porcentajes se obtienen de los indicadores actualizados de Previred.
          </p>
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

