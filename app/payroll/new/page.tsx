'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { calculatePayroll } from '@/lib/services/payrollCalculator'
import { getCurrentMonthYear, MONTHS, formatDate } from '@/lib/utils/date'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { createValidationServices } from '@/lib/services/validationHelpers'

export default function NewPayrollPage() {
  const { companyId } = useCurrentCompany()
  const router = useRouter()
  const searchParams = useSearchParams()
  const employeeIdParam = searchParams.get('employee_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [formData, setFormData] = useState({
    employee_id: employeeIdParam || '',
    year: getCurrentMonthYear().year,
    month: getCurrentMonthYear().month,
    days_worked: 30, // Siempre 30 días según convención legal chilena (independiente del mes)
    days_leave: 0,
    bonuses: 0,
    overtime_hours: 0, // Solo número de horas
    vacation: 0,
    other_taxable_earnings: 0,
    transportation: 0,
    meal_allowance: 0,
    aguinaldo: 0,
    loans: 0,
    advances: 0,
  })
  const [bonuses, setBonuses] = useState<Array<{ id: string, name: string, amount: number }>>([])
  const [nonTaxableEarnings, setNonTaxableEarnings] = useState<Array<{ id: string, name: string, amount: number }>>([])
  const [defaultValuesLoaded, setDefaultValuesLoaded] = useState(false)
  const [calculation, setCalculation] = useState<any>(null)
  const [loansToPay, setLoansToPay] = useState<any[]>([])
  const [installmentsToUpdate, setInstallmentsToUpdate] = useState<any[]>([])
  const [medicalLeaveDays, setMedicalLeaveDays] = useState(0)
  const [vacationDays, setVacationDays] = useState(0)
  const [vacationAmount, setVacationAmount] = useState(0)
  const [vacationDetails, setVacationDetails] = useState<any[]>([])
  const [overtimeAmount, setOvertimeAmount] = useState(0)
  const [permissionDaysWithoutPay, setPermissionDaysWithoutPay] = useState(0)
  const [permissionsToApply, setPermissionsToApply] = useState<any[]>([])
  const [periodAdvances, setPeriodAdvances] = useState<any[]>([])
  const [overtimePactInfo, setOvertimePactInfo] = useState<{
    exists: boolean
    status: string | null
    pactNumber: string | null
    startDate: string | null
    endDate: string | null
  } | null>(null)

  // Verificar pacto de horas extra cuando se ingresan horas o cambia el trabajador/período
  useEffect(() => {
    const checkOvertimePact = async () => {
      if (!selectedEmployee || formData.overtime_hours === 0) {
        setOvertimePactInfo(null)
        return
      }

      try {
        const periodStart = new Date(formData.year, formData.month - 1, 1)
        const periodEnd = new Date(formData.year, formData.month, 0)

        // Buscar pactos de horas extra que cubran el período de la liquidación
        const { data: pacts } = await supabase
          .from('overtime_pacts')
          .select('status, pact_number, start_date, end_date')
          .eq('employee_id', selectedEmployee.id)
          .lte('start_date', periodEnd.toISOString().split('T')[0])
          .gte('end_date', periodStart.toISOString().split('T')[0])
          .order('created_at', { ascending: false })
          .limit(1)

        if (pacts && pacts.length > 0) {
          const pact = pacts[0]
          setOvertimePactInfo({
            exists: true,
            status: pact.status,
            pactNumber: pact.pact_number || null,
            startDate: pact.start_date,
            endDate: pact.end_date,
          })
        } else {
          setOvertimePactInfo({
            exists: false,
            status: null,
            pactNumber: null,
            startDate: null,
            endDate: null,
          })
        }
      } catch (error) {
        console.error('Error al verificar pacto de horas extra:', error)
        setOvertimePactInfo(null)
      }
    }

    checkOvertimePact()
  }, [selectedEmployee, formData.overtime_hours, formData.year, formData.month])

  // En Chile, la convención legal es usar siempre 30 días para el cálculo mensual
  // Independientemente de si el mes tiene 28, 29, 30 o 31 días
  // No necesitamos cambiar el valor automáticamente, siempre será 30 por defecto

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    } else {
      setEmployees([])
    }
  }, [companyId, formData.year, formData.month]) // Recargar cuando cambie el período

  useEffect(() => {
    if (formData.employee_id && selectedEmployee) {
      // Pequeño delay para asegurar que todos los estados se hayan actualizado
      const timer = setTimeout(() => {
        calculate()
      }, 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.employee_id, 
    selectedEmployee, 
    formData.year, 
    formData.month, 
    bonuses, 
    nonTaxableEarnings,
    formData.transportation,
    formData.meal_allowance,
    formData.aguinaldo,
    formData.other_taxable_earnings,
    formData.overtime_hours,
    overtimeAmount,
    vacationAmount,
    medicalLeaveDays,
    permissionDaysWithoutPay,
    periodAdvances
  ])

  const loadEmployees = async () => {
    try {
      if (!companyId) {
        setEmployees([])
        return
      }
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary, transportation, meal_allowance, requests_advance, advance_amount, afp, health_system, health_plan_percentage, contract_type, status, termination_date')
        .in('status', ['active', 'licencia_medica', 'renuncia', 'despido']) // Incluir renuncia/despido para validar después
        .eq('company_id', companyId)
        .order('full_name')

      if (error) throw error

      // Filtrar empleados que renunciaron/despedidos antes del período seleccionado
      const periodStart = new Date(formData.year, formData.month - 1, 1)
      const filteredEmployees = (data || []).filter((emp: any) => {
        // Si está activo o con licencia médica, incluirlo
        if (emp.status === 'active' || emp.status === 'licencia_medica') {
          return true
        }
        
        // Si renunció o fue despedido, solo incluirlo si la fecha de término es posterior o igual al inicio del período
        if (emp.status === 'renuncia' || emp.status === 'despido') {
          if (!emp.termination_date) {
            return false // Sin fecha de término, no incluirlo
          }
          const terminationDate = new Date(emp.termination_date)
          return terminationDate >= periodStart
        }
        
        return false
      })

      setEmployees(filteredEmployees)

      if (employeeIdParam && data) {
        const employee = data.find((e: any) => e.id === employeeIdParam)
        if (employee) {
          setSelectedEmployee(employee)
          setFormData({ 
            ...formData, 
            employee_id: employeeIdParam,
            transportation: employee.transportation || 0,
            meal_allowance: employee.meal_allowance || 0,
            advances: employee.requests_advance ? (employee.advance_amount || 0) : 0,
          })
          setDefaultValuesLoaded(true)
          
          // Cargar bonos del contrato activo del trabajador
          try {
            const { data: activeContract } = await supabase
              .from('contracts')
              .select('other_allowances')
              .eq('employee_id', employeeIdParam)
              .eq('status', 'active')
              .order('start_date', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (activeContract?.other_allowances) {
              // Parsear bonos desde other_allowances (formato: "Bono Nombre: $Monto; Otro Bono: $Monto")
              const bonusesFromContract: Array<{ id: string; name: string; amount: number }> = []
              const bonusStrings = activeContract.other_allowances.split(';').map((b: string) => b.trim()).filter((b: string) => b)
              
              bonusStrings.forEach((bonusStr: string, idx: number) => {
                const match = bonusStr.match(/^(.+?):\s*\$\s*(.+)$/)
                if (match) {
                  const bonusName = match[1].trim()
                  const bonusAmount = parseFormattedNumber(match[2].trim()) || 0
                  if (bonusName && bonusAmount > 0) {
                    bonusesFromContract.push({
                      id: `contract-bonus-${idx}-${Date.now()}`,
                      name: bonusName,
                      amount: bonusAmount
                    })
                  }
                }
              })

              if (bonusesFromContract.length > 0) {
                setBonuses(bonusesFromContract)
              }
            }
          } catch (error) {
            console.error('Error al cargar bonos del contrato:', error)
          }
        }
      }
    } catch (error: any) {
      alert('Error al cargar trabajadores: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeChange = async (employeeId: string) => {
    const employee = employees.find((e: any) => e.id === employeeId)
    setSelectedEmployee(employee || null)
    setFormData({ 
      ...formData, 
      employee_id: employeeId,
      transportation: employee?.transportation || 0,
      meal_allowance: employee?.meal_allowance || 0,
      advances: employee?.requests_advance ? (employee?.advance_amount || 0) : 0,
      overtime_hours: 0,
    })
    setNonTaxableEarnings([])
    setDefaultValuesLoaded(true)
    setMedicalLeaveDays(0) // Resetear días de licencia al cambiar trabajador
    setVacationAmount(0)
    setVacationDetails([])
    setOvertimeAmount(0)
    setPermissionDaysWithoutPay(0) // Resetear días de permiso al cambiar trabajador
    setPermissionsToApply([]) // Resetear lista de permisos al cambiar trabajador

    // Cargar bonos del contrato activo del trabajador
    try {
      const { data: activeContract } = await supabase
        .from('contracts')
        .select('other_allowances')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeContract?.other_allowances) {
        // Parsear bonos desde other_allowances (formato: "Bono Nombre: $Monto; Otro Bono: $Monto")
        const bonusesFromContract: Array<{ id: string; name: string; amount: number }> = []
        const bonusStrings = activeContract.other_allowances.split(';').map((b: string) => b.trim()).filter((b: string) => b)
        
        bonusStrings.forEach((bonusStr: string, idx: number) => {
          const match = bonusStr.match(/^(.+?):\s*\$\s*(.+)$/)
          if (match) {
            const bonusName = match[1].trim()
            const bonusAmount = parseFormattedNumber(match[2].trim()) || 0
            if (bonusName && bonusAmount > 0) {
              bonusesFromContract.push({
                id: `contract-bonus-${idx}-${Date.now()}`,
                name: bonusName,
                amount: bonusAmount
              })
            }
          }
        })

        if (bonusesFromContract.length > 0) {
          setBonuses(bonusesFromContract)
        } else {
          setBonuses([])
        }
      } else {
        setBonuses([])
      }
    } catch (error) {
      console.error('Error al cargar bonos del contrato:', error)
      setBonuses([])
    }
  }

  const calculate = async () => {
    if (!selectedEmployee) return

    // Obtener vacaciones en el período
    const periodStart = new Date(formData.year, formData.month - 1, 1)
    const periodEnd = new Date(formData.year, formData.month, 0)
    
    const { data: periodVacations } = await supabase
      .from('vacations')
      .select('id, start_date, end_date, days_count, status')
      .eq('employee_id', selectedEmployee.id)
      .in('status', ['aprobada', 'tomada'])
      .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)

    // Calcular días de vacaciones en el período y monto
    let vacationDays = 0
    let totalVacationAmount = 0
    const vacationDetailsList: any[] = []
    
    if (periodVacations && periodVacations.length > 0) {
      for (const vacation of periodVacations) {
        const vacStart = new Date(vacation.start_date)
        const vacEnd = new Date(vacation.end_date)
        
        // Calcular intersección entre período y vacaciones
        const overlapStart = vacStart > periodStart ? vacStart : periodStart
        const overlapEnd = vacEnd < periodEnd ? vacEnd : periodEnd
        
        if (overlapStart <= overlapEnd) {
          // Verificar si la vacación está completamente dentro del período
          const isFullyInPeriod = vacStart >= periodStart && vacEnd <= periodEnd
          
          let diffDays = 0
          
          if (isFullyInPeriod) {
            // Si la vacación está completamente dentro del período, usar el days_count almacenado
            // Esto es más preciso porque ya fue calculado correctamente al crear la vacación
            diffDays = vacation.days_count || 0
          } else {
            // Si la vacación está parcialmente en el período, calcular proporcionalmente
            // Calcular días hábiles de la intersección
            const { calculateBusinessDays } = await import('@/lib/services/vacationCalculator')
            const overlapBusinessDays = await calculateBusinessDays(overlapStart, overlapEnd)
            
            // Calcular días hábiles totales de la vacación completa
            const totalBusinessDays = await calculateBusinessDays(vacStart, vacEnd)
            
            // Calcular proporción: días en período / días totales
            if (totalBusinessDays > 0) {
              const proportion = overlapBusinessDays / totalBusinessDays
              diffDays = Math.round((vacation.days_count || 0) * proportion)
            } else {
              diffDays = overlapBusinessDays
            }
          }
          
          vacationDays += diffDays
          
          // Calcular monto según ley chilena: (sueldo base / 30) * días de vacaciones
          // NOTA: Este monto NO se suma como concepto adicional, las vacaciones se pagan como días trabajados normales
          const dailySalary = selectedEmployee.base_salary / 30
          const vacationAmountForPeriod = Math.ceil(dailySalary * diffDays)
          totalVacationAmount += vacationAmountForPeriod
          
          vacationDetailsList.push({
            ...vacation,
            days_in_period: diffDays,
            amount: vacationAmountForPeriod,
            start_date: overlapStart.toISOString().split('T')[0],
            end_date: overlapEnd.toISOString().split('T')[0],
          })
        }
      }
    }
    
    setVacationAmount(totalVacationAmount)
    setVacationDetails(vacationDetailsList)

    // Obtener licencias médicas activas para el período
    
    const { data: medicalLeaves } = await supabase
      .from('medical_leaves')
      .select('id, start_date, end_date, days_count, is_active')
      .eq('employee_id', selectedEmployee.id)
      .eq('is_active', true)
      .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)

    // Calcular días de licencia en el período
    let leaveDays = 0
    if (medicalLeaves && medicalLeaves.length > 0) {
      for (const leave of medicalLeaves) {
        const leaveStart = new Date(leave.start_date)
        const leaveEnd = new Date(leave.end_date)
        
        // Calcular intersección entre período y licencia
        const overlapStart = leaveStart > periodStart ? leaveStart : periodStart
        const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd
        
        if (overlapStart <= overlapEnd) {
          const diffTime = overlapEnd.getTime() - overlapStart.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          leaveDays += diffDays
        }
      }
    }

    // Obtener permisos sin goce de sueldo del período
    // Buscar tanto permisos aprobados no aplicados como permisos aplicados del período actual
    // (un permiso puede estar aplicado pero aún no asignado a una liquidación específica)
    const { data: periodPermissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('*, permission_types (*)')
      .eq('employee_id', selectedEmployee.id)
      .in('status', ['approved', 'applied']) // Incluir tanto aprobados como aplicados
      .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)
    
    if (permissionsError) {
      console.error('Error al obtener permisos:', permissionsError)
    }
    
    // Filtrar permisos: solo los que no están aplicados a otra liquidación del mismo período
    // o que están aprobados y listos para aplicar
    let filteredPermissions = periodPermissions || []
    let existingSlipIds: string[] = [] // Declarar fuera del bloque if para que esté disponible
    
    // Si hay permisos aplicados, verificar que no pertenezcan a otra liquidación del mismo período
    if (filteredPermissions.length > 0) {
      // Obtener liquidaciones existentes del período para este trabajador
      const { data: existingSlips } = await supabase
        .from('payroll_slips')
        .select('id, payroll_periods!inner(year, month)')
        .eq('employee_id', selectedEmployee.id)
      
      // Filtrar por período manualmente ya que el join puede ser complejo
      const slipsInPeriod = existingSlips?.filter((slip: any) => 
        slip.payroll_periods?.year === formData.year && 
        slip.payroll_periods?.month === formData.month
      ) || []
      
      existingSlipIds = slipsInPeriod.map((s: any) => s.id)
      
      // Filtrar: incluir aprobados no aplicados, o aplicados sin payroll_slip_id, o aplicados con payroll_slip_id que no existe
      filteredPermissions = filteredPermissions.filter((perm: any) => {
        // Si está aprobado y no aplicado, incluirlo
        if (perm.status === 'approved' && !perm.applied_to_payroll) {
          return true
        }
        // Si está aplicado, verificar que no tenga payroll_slip_id o que el payroll_slip_id no corresponda a una liquidación existente
        if (perm.status === 'applied') {
          // Si no tiene payroll_slip_id, está disponible para este período
          if (!perm.payroll_slip_id) {
            return true
          }
          // Si tiene payroll_slip_id pero no está en las liquidaciones existentes, también está disponible
          // (puede ser de otro período o una liquidación eliminada)
          if (existingSlipIds.length === 0 || !existingSlipIds.includes(perm.payroll_slip_id)) {
            return true
          }
        }
        return false
      })
    }
    
    console.log('🔍 [PERMISOS DEBUG]', {
      employee_id: selectedEmployee.id,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      permissionsFound: filteredPermissions.length,
      permissions: filteredPermissions,
      existingSlipsInPeriod: existingSlipIds.length
    })

    // Calcular días de permisos sin goce en el período
    // NOTA: NO se calcula descuento adicional porque el sueldo ya se calcula proporcional a los días trabajados
    // El descuento está implícito en: (sueldo_base / 30) * (días_trabajados - días_permiso)
    let permissionDaysWithoutPay = 0
    const permissionsToApply: any[] = []

    if (filteredPermissions && filteredPermissions.length > 0) {
      for (const permission of filteredPermissions) {
        const permType = permission.permission_types
        // Solo considerar permisos sin goce de sueldo
        if (permType && permType.affects_payroll) {
          // Parsear fechas correctamente (sin hora, solo fecha)
          const permStart = new Date(permission.start_date + 'T00:00:00')
          const permEnd = new Date(permission.end_date + 'T00:00:00')
          
          // Calcular intersección entre período y permiso
          const overlapStart = permStart > periodStart ? permStart : periodStart
          const overlapEnd = permEnd < periodEnd ? permEnd : periodEnd
          
          if (overlapStart <= overlapEnd) {
            // Normalizar fechas para evitar problemas de zona horaria
            const overlapStartNormalized = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), overlapStart.getDate())
            const overlapEndNormalized = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), overlapEnd.getDate())
            const permStartNormalized = new Date(permStart.getFullYear(), permStart.getMonth(), permStart.getDate())
            const permEndNormalized = new Date(permEnd.getFullYear(), permEnd.getMonth(), permEnd.getDate())
            
            // Verificar si el permiso está completamente dentro del período
            // Si está completamente dentro, usar el campo days del permiso (ya calculado)
            // Si hay intersección parcial, recalcular días hábiles
            const isFullyWithinPeriod = 
              permStartNormalized.getTime() >= periodStart.getTime() &&
              permEndNormalized.getTime() <= periodEnd.getTime()
            
            let diffDays: number
            
            if (isFullyWithinPeriod && permission.days && permission.days > 0) {
              // Usar los días guardados en el permiso si está completamente dentro del período
              diffDays = Math.round(permission.days)
            } else {
              // Recalcular días hábiles (lunes a viernes) excluyendo feriados
              // Usar calculateBusinessDays para excluir sábados, domingos y feriados legales
              const { calculateBusinessDays } = await import('@/lib/services/vacationCalculator')
              diffDays = await calculateBusinessDays(overlapStartNormalized, overlapEndNormalized)
            }
            
            console.log('🔍 [PERMISO DEBUG]', {
              permiso_id: permission.id,
              start_date: permission.start_date,
              end_date: permission.end_date,
              permission_days_field: permission.days, // Días guardados en el permiso
              permStart_parsed: permStartNormalized.toISOString().split('T')[0],
              permEnd_parsed: permEndNormalized.toISOString().split('T')[0],
              overlapStart: overlapStartNormalized.toISOString().split('T')[0],
              overlapEnd: overlapEndNormalized.toISOString().split('T')[0],
              isFullyWithinPeriod,
              days_used: diffDays,
              days_source: isFullyWithinPeriod && permission.days ? 'permission.days' : 'calculated',
              periodStart: periodStart.toISOString().split('T')[0],
              periodEnd: periodEnd.toISOString().split('T')[0]
            })
            
            permissionDaysWithoutPay += diffDays
            
            permissionsToApply.push({
              ...permission,
              days_in_period: diffDays,
            })
          }
        }
      }
    }

    // Calcular monto de horas extras
    // Según ley chilena: primera hora 50% adicional, siguientes 100% adicional
    // Valor hora normal = (sueldo base / 30) / 8 (asumiendo 8 horas diarias)
    const dailySalary = selectedEmployee.base_salary / 30
    const hourlySalary = dailySalary / 8
    let overtimeAmountCalc = 0
    if (formData.overtime_hours > 0) {
      if (formData.overtime_hours === 1) {
        // Primera hora: 50% adicional
        overtimeAmountCalc = hourlySalary * 1.5
      } else {
        // Primera hora: 50% adicional, siguientes: 100% adicional
        overtimeAmountCalc = (hourlySalary * 1.5) + (hourlySalary * 2 * (formData.overtime_hours - 1))
      }
    }
    setOvertimeAmount(Math.ceil(overtimeAmountCalc))

    // Ajustar días trabajados si hay licencia médica o permisos sin goce
    // IMPORTANTE: Las vacaciones NO se descuentan de los días trabajados
    // Las vacaciones se pagan como días trabajados normales (remuneración íntegra)
    // Por lo tanto, los días de vacaciones deben estar incluidos en daysWorked
    // Ejemplo: Si tiene 30 días de trabajo y 10 días de vacaciones, daysWorked = 30 (incluye los 10 días de vacaciones)
    const effectiveDaysWorked = Math.max(0, formData.days_worked - leaveDays - permissionDaysWithoutPay)
    setMedicalLeaveDays(leaveDays)
    setVacationDays(vacationDays)
    setPermissionDaysWithoutPay(permissionDaysWithoutPay)
    setPermissionsToApply(permissionsToApply)

    // Obtener TODOS los préstamos activos del trabajador
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('id, installment_amount, remaining_amount, status, installments, paid_installments, loan_date, loan_number, amount, total_amount')
      .eq('employee_id', selectedEmployee.id)
      .eq('status', 'active')
      .gt('remaining_amount', 0)
      .order('loan_date', { ascending: true })

    // Calcular paid_installments real basándome en loan_payments (solo liquidaciones emitidas)
    if (activeLoans && activeLoans.length > 0) {
      for (const loan of activeLoans) {
        // Obtener pagos de liquidaciones emitidas (no borradores)
        const { data: payments } = await supabase
          .from('loan_payments')
          .select('id, payroll_slip_id, payroll_slips!inner(id, status)')
          .eq('loan_id', loan.id)
          .eq('payroll_slips.status', 'issued')
        
        const actualPaidInstallments = payments?.length || 0
        const loanAmount = loan.total_amount || loan.amount || 0
        const totalPaid = actualPaidInstallments * loan.installment_amount
        const calculatedRemainingAmount = Math.max(0, loanAmount - totalPaid)
        
        // Si el valor almacenado es diferente, corregirlo en memoria (no en BD aún)
        if (loan.paid_installments !== actualPaidInstallments) {
          console.log(`⚠️ [CORRECCIÓN] Préstamo ${loan.loan_number}: paid_installments almacenado (${loan.paid_installments}) != real (${actualPaidInstallments})`)
          loan.paid_installments = actualPaidInstallments
          loan.remaining_amount = calculatedRemainingAmount
        }
      }
    }

    // Obtener los IDs de los préstamos activos
    const activeLoanIds = activeLoans?.map((loan: any) => loan.id) || []

    // Obtener cuotas pendientes del período actual (si existen)
    // Filtrar por los IDs de préstamos activos del empleado
    const { data: pendingInstallments } = activeLoanIds.length > 0
      ? await supabase
          .from('loan_installments')
          .select('*, loans (*)')
          .in('loan_id', activeLoanIds)
          .eq('due_month', formData.month)
          .eq('due_year', formData.year)
          .in('status', ['pending', 'partial'])
      : { data: null }

    // Calcular límite legal de descuentos voluntarios
    const remunerationDevengada = Math.ceil((selectedEmployee.base_salary / 30) * effectiveDaysWorked)
    const maxVoluntaryDiscount = Math.floor(remunerationDevengada * 0.15)

    // Calcular total de préstamos a descontar aplicando límite legal
    let totalLoansAmount = 0
    const loansToPay: any[] = []
    const installmentsToUpdate: any[] = []

    // Crear un mapa de préstamos que ya tienen cuotas en loan_installments
    const loansWithInstallments = new Map<string, any>()
    if (pendingInstallments && pendingInstallments.length > 0) {
      for (const installment of pendingInstallments) {
        const loan = installment.loans
        if (loan) {
          loansWithInstallments.set(loan.id, installment)
        }
      }
    }

    // Procesar TODOS los préstamos activos
    if (activeLoans && activeLoans.length > 0) {
      let remainingDiscountCapacity = maxVoluntaryDiscount

      for (const loan of activeLoans) {
        const remainingInstallments = loan.installments - loan.paid_installments
        
        // Si no hay cuotas pendientes, saltar este préstamo
        if (remainingInstallments <= 0) continue

        // Verificar si este préstamo tiene una cuota en loan_installments para este período
        const installmentInTable = loansWithInstallments.get(loan.id)
        
        if (installmentInTable) {
          // Usar la cuota de loan_installments
          const expectedAmount = Number(installmentInTable.amount_expected) || loan.installment_amount
          const allowedAmount = Math.min(expectedAmount, remainingDiscountCapacity)
          const deferredAmount = expectedAmount - allowedAmount

          if (allowedAmount > 0) {
            totalLoansAmount += allowedAmount
            loansToPay.push({
              ...loan,
              installmentId: installmentInTable.id,
              installmentNumber: installmentInTable.installment_number,
              expectedAmount,
              allowedAmount,
              deferredAmount,
            })

            // Registrar actualización de cuota
            installmentsToUpdate.push({
              id: installmentInTable.id,
              amount_applied: allowedAmount,
              amount_deferred: deferredAmount,
              status: deferredAmount > 0 ? 'partial' : 'paid',
            })

            remainingDiscountCapacity -= allowedAmount
          } else {
            // No hay capacidad para descontar, todo se difiere
            installmentsToUpdate.push({
              id: installmentInTable.id,
              amount_applied: 0,
              amount_deferred: expectedAmount,
              status: 'deferred',
            })
          }
        } else {
          // No tiene cuota en loan_installments, calcular si corresponde descontar en este período
          // Calcular el mes de inicio del préstamo
          const loanDate = new Date(loan.loan_date + 'T00:00:00')
          const loanMonth = loanDate.getMonth() + 1
          const loanYear = loanDate.getFullYear()
          
          // Calcular cuántos meses han pasado desde el préstamo hasta el período actual
          // Si el préstamo es en enero y estamos liquidando enero → monthsDiff = 0 → primera cuota
          // Si el préstamo es en enero y estamos liquidando febrero → monthsDiff = 1 → segunda cuota
          const monthsDiff = (formData.year - loanYear) * 12 + (formData.month - loanMonth)
          
          // La primera cuota se descuenta en el mismo mes del préstamo
          // Si el préstamo es en enero y estamos liquidando enero, la primera cuota se descuenta en enero
          // Si el préstamo es en enero y estamos liquidando febrero, la segunda cuota se descuenta en febrero
          
          // Debug para este préstamo específico
          console.log('🔍 [PRÉSTAMO DEBUG]', {
            loan_id: loan.id,
            loan_number: loan.loan_number,
            loan_date: loan.loan_date,
            loan_month: loanMonth,
            loan_year: loanYear,
            period_month: formData.month,
            period_year: formData.year,
            monthsDiff,
            installments: loan.installments,
            paid_installments: loan.paid_installments,
            remaining_installments: remainingInstallments
          })
          
          // IMPORTANTE: Si el préstamo es del mismo mes o anterior (monthsDiff >= 0), calcular cuál cuota corresponde
          // monthsDiff = 0 → mismo mes → primera cuota (cuota 1)
          // monthsDiff = 1 → mes siguiente → segunda cuota (cuota 2)
          // monthsDiff = 2 → dos meses después → tercera cuota (cuota 3)
          if (monthsDiff >= 0) {
            // La cuota número (monthsDiff + 1) corresponde a este período
            // Ejemplo: Préstamo en enero, liquidando enero → monthsDiff = 0 → cuota 1
            // Ejemplo: Préstamo en enero, liquidando febrero → monthsDiff = 1 → cuota 2
            const expectedInstallmentNumber = monthsDiff + 1
            
            console.log('🔍 [CUOTA CALCULADA]', {
              loan_id: loan.id,
              loan_number: loan.loan_number,
              expectedInstallmentNumber,
              installments_total: loan.installments,
              paid_installments: loan.paid_installments,
              condition_1: expectedInstallmentNumber <= loan.installments,
              condition_2: expectedInstallmentNumber > loan.paid_installments,
              will_include: expectedInstallmentNumber <= loan.installments && expectedInstallmentNumber > loan.paid_installments
            })
            
            // Verificar que esta cuota no haya sido pagada ya y que esté dentro del rango de cuotas
            if (expectedInstallmentNumber <= loan.installments && expectedInstallmentNumber > loan.paid_installments) {
              const expectedAmount = loan.installment_amount
              const allowedAmount = Math.min(expectedAmount, remainingDiscountCapacity)
              const deferredAmount = expectedAmount - allowedAmount

              console.log('✅ [PRÉSTAMO INCLUIDO]', {
                loan_id: loan.id,
                loan_number: loan.loan_number,
                installment_number: expectedInstallmentNumber,
                expected_amount: expectedAmount,
                allowed_amount: allowedAmount,
                deferred_amount: deferredAmount,
                remaining_capacity: remainingDiscountCapacity
              })

              // IMPORTANTE: Incluir el préstamo incluso si allowedAmount es 0 (se difiere todo)
              // Esto permite que aparezca en la UI aunque no se pueda descontar por límite legal
              totalLoansAmount += allowedAmount
              loansToPay.push({
                ...loan,
                installmentNumber: expectedInstallmentNumber,
                expectedAmount,
                allowedAmount,
                deferredAmount,
              })

              if (allowedAmount > 0) {
                remainingDiscountCapacity -= allowedAmount
              }
            } else {
              console.log('❌ [PRÉSTAMO EXCLUIDO]', {
                loan_id: loan.id,
                loan_number: loan.loan_number,
                reason: expectedInstallmentNumber <= loan.installments 
                  ? `Cuota ${expectedInstallmentNumber} ya pagada (paid_installments: ${loan.paid_installments})`
                  : `Cuota ${expectedInstallmentNumber} fuera de rango (total: ${loan.installments})`
              })
            }
          } else {
            console.log('❌ [PRÉSTAMO FUTURO]', {
              loan_id: loan.id,
              loan_number: loan.loan_number,
              loan_date: loan.loan_date,
              period: `${formData.month}/${formData.year}`,
              monthsDiff,
              reason: 'Préstamo es del futuro, no corresponde descontar aún'
            })
          }
        }
      }
    }

    // Debug: verificar préstamos procesados
    console.log('🔍 [PRÉSTAMOS DEBUG - RESUMEN]', {
      activeLoans_count: activeLoans?.length || 0,
      activeLoans: activeLoans?.map((l: any) => ({
        id: l.id,
        loan_number: l.loan_number,
        loan_date: l.loan_date,
        installments: l.installments,
        paid_installments: l.paid_installments,
        remaining_amount: l.remaining_amount
      })),
      pendingInstallments_count: pendingInstallments?.length || 0,
      loansWithInstallments_count: loansWithInstallments.size,
      loansToPay_count: loansToPay.length,
      loansToPay: loansToPay.map((l: any) => ({
        loan_id: l.id,
        loan_number: l.loan_number,
        installment_number: l.installmentNumber,
        expected_amount: l.expectedAmount,
        allowed_amount: l.allowedAmount
      })),
      period: `${formData.month}/${formData.year}`
    })

    // Guardar información de cuotas a actualizar
    setInstallmentsToUpdate(installmentsToUpdate)

    // Guardar préstamos en el estado para mostrarlos en la UI
    setLoansToPay(loansToPay)

    // Sumar préstamos manuales si los hay
    totalLoansAmount += formData.loans

    // Obtener anticipos del período (firmados o pagados, no descontados aún)
    const periodStr = `${formData.year}-${String(formData.month).padStart(2, '0')}`
    const { data: periodAdvances } = await supabase
      .from('advances')
      .select('id, amount, advance_date, period, status, payroll_slip_id')
      .eq('employee_id', selectedEmployee.id)
      .eq('period', periodStr)
      .in('status', ['firmado', 'pagado'])
      .is('payroll_slip_id', null) // Solo los que no han sido descontados

    // Guardar anticipos en el estado para mostrarlos en la UI
    setPeriodAdvances(periodAdvances || [])

    // Sumar anticipos del período
    let totalAdvancesAmount = 0
    if (periodAdvances && periodAdvances.length > 0) {
      totalAdvancesAmount = periodAdvances.reduce((sum: number, adv: { amount: number | null }) => sum + Number(adv.amount), 0)
    }

    // Sumar anticipos manuales si los hay
    totalAdvancesAmount += formData.advances

    // Calcular total de bonos
    const totalBonuses = bonuses.reduce((sum: number, bonus: { amount: number }) => sum + (bonus.amount || 0), 0)

    // Calcular total de haberes no imponibles adicionales
    const totalNonTaxableEarnings = nonTaxableEarnings.reduce((sum: number, earning: { amount: number }) => sum + (earning.amount || 0), 0)

    // Obtener indicadores de Previred
    // IMPORTANTE: Los indicadores de Previred son del mes anterior
    // Ej: Para liquidaciones de Enero 2026, se usan indicadores de Diciembre 2025
    let indicatorMonth = formData.month - 1
    let indicatorYear = formData.year
    if (indicatorMonth === 0) {
      indicatorMonth = 12
      indicatorYear = formData.year - 1
    }

    const indicators = await getCachedIndicators(indicatorYear, indicatorMonth)

    // IMPORTANTE: Los haberes no imponibles adicionales se suman al aguinaldo
    // pero transportation y mealAllowance se pasan por separado
    const result = await calculatePayroll(
      {
        baseSalary: selectedEmployee.base_salary,
        daysWorked: effectiveDaysWorked, // Usar días efectivos (descontando licencia)
        daysLeave: medicalLeaveDays,
        afp: selectedEmployee.afp,
        healthSystem: selectedEmployee.health_system,
        healthPlanPercentage: selectedEmployee.health_plan_percentage || 0, // Porcentaje adicional del plan ISAPRE
        bonuses: totalBonuses,
        overtime: overtimeAmount,
        vacation: 0, // Las vacaciones NO son un concepto adicional, se pagan como días trabajados normales
        otherTaxableEarnings: formData.other_taxable_earnings,
        transportation: Number(formData.transportation) || 0,
        mealAllowance: Number(formData.meal_allowance) || 0,
        aguinaldo: (Number(formData.aguinaldo) || 0) + totalNonTaxableEarnings,
        loans: totalLoansAmount,
        advances: totalAdvancesAmount,
        permissionDiscount: 0, // NO aplicar descuento adicional - ya está implícito en el cálculo proporcional de días trabajados
      },
      indicators,
      formData.year,
      formData.month
    )

    // Debug: verificar valores de haberes no imponibles
    console.log('🔍 [HABERES NO IMPONIBLES DEBUG]', {
      transportation: formData.transportation,
      transportation_parsed: Number(formData.transportation) || 0,
      meal_allowance: formData.meal_allowance,
      meal_allowance_parsed: Number(formData.meal_allowance) || 0,
      aguinaldo: formData.aguinaldo,
      aguinaldo_parsed: Number(formData.aguinaldo) || 0,
      totalNonTaxableEarnings,
      aguinaldo_final: (Number(formData.aguinaldo) || 0) + totalNonTaxableEarnings,
      calculation_result: result.nonTaxableEarnings,
      total_calculated: result.nonTaxableEarnings.total
    })

    // Guardar información de préstamos, anticipos y permisos para usar al guardar
    setLoansToPay(loansToPay)
    
    // Calcular total esperado de otros descuentos para mostrar en la UI
    // Esto incluye todos los expectedAmount (no solo allowedAmount) + préstamos manuales + anticipos
    const totalExpectedLoans = loansToPay.reduce((sum: number, loan: any) => sum + (loan.expectedAmount || loan.installment_amount || 0), 0)
    const totalExpectedOtherDeductions = totalExpectedLoans + formData.loans + totalAdvancesAmount
    
    // Calcular líquido a pagar usando el total esperado de descuentos (sin límite del 15%)
    // Total Haberes - Total Descuentos (esperados)
    const totalEarnings = result.taxableEarnings.total + result.nonTaxableEarnings.total
    const totalExpectedDeductions = result.legalDeductions.total + totalExpectedOtherDeductions
    const expectedNetPay = Math.max(0, Math.ceil(totalEarnings - totalExpectedDeductions))
    
    setCalculation({ 
      ...result, 
      periodAdvances: periodAdvances || [],
      periodPermissions: permissionsToApply,
      // Agregar total esperado para mostrar en la UI
      totalExpectedOtherDeductions,
      // Agregar líquido a pagar esperado (sin límite del 15%)
      expectedNetPay,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee || !calculation) return

    // Validar que el trabajador no haya renunciado o sido despedido antes del período
    if (selectedEmployee.status === 'renuncia' || selectedEmployee.status === 'despido') {
      if (!selectedEmployee.termination_date) {
        alert(`No se puede crear una liquidación para ${selectedEmployee.full_name} porque tiene estado "${selectedEmployee.status === 'renuncia' ? 'Renuncia' : 'Despido'}" pero no tiene fecha de término registrada. Por favor, complete la fecha de término en la ficha del trabajador.`)
        return
      }

      const terminationDate = new Date(selectedEmployee.termination_date)
      const periodStart = new Date(formData.year, formData.month - 1, 1)
      
      if (terminationDate < periodStart) {
        alert(`No se puede crear una liquidación para ${selectedEmployee.full_name} en el período ${MONTHS[formData.month - 1]} ${formData.year} porque ${selectedEmployee.status === 'renuncia' ? 'renunció' : 'fue despedido'} el ${terminationDate.toLocaleDateString('es-CL')}, antes del inicio del período.`)
        return
      }
    }

    setSaving(true)

    try {
      // Crear o obtener período
      // Primero intentar obtener uno existente
      const { data: existingPeriod } = await supabase
        .from('payroll_periods')
        .select('id, company_id, year, month')
        .eq('company_id', companyId)
        .eq('year', formData.year)
        .eq('month', formData.month)
        .maybeSingle()

      let period
      if (existingPeriod) {
        period = existingPeriod
      } else {
        const { data: newPeriod, error: periodError } = await supabase
          .from('payroll_periods')
          .insert({
            company_id: companyId,
            year: formData.year,
            month: formData.month,
          })
          .select()
          .single()

        if (periodError) throw periodError
        period = newPeriod
      }

      // Verificar si ya existe una liquidación para este empleado y período
      const { data: existingSlip } = await supabase
        .from('payroll_slips')
        .select('id, status')
        .eq('employee_id', formData.employee_id)
        .eq('period_id', period.id)
        .maybeSingle()

      if (existingSlip) {
        const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
        const monthName = MONTHS[formData.month - 1]
        throw new Error(`Ya existe una liquidación para ${selectedEmployee.full_name} en el período ${monthName} ${formData.year}. Por favor, edite la liquidación existente o elimínela antes de crear una nueva.`)
      }

      // Validar que el empleado pueda recibir una liquidación (requiere contrato activo)
      const { employee } = createValidationServices(supabase as any)
      const validation = await employee.canGeneratePayrollSlip(formData.employee_id)
      
      if (!validation.allowed) {
        alert(validation.message)
        setSaving(false)
        return
      }

      // Calcular días efectivos (descontando licencia médica y permisos sin goce)
      const effectiveDaysWorked = Math.max(0, formData.days_worked - medicalLeaveDays - permissionDaysWithoutPay)

      // Crear liquidación
      // NOTA: days_worked incluye días de vacaciones (no se descuentan)
      // days_leave incluye licencias médicas
      const { data: slip, error: slipError } = await supabase
        .from('payroll_slips')
        .insert({
          employee_id: formData.employee_id,
          period_id: period.id,
          days_worked: effectiveDaysWorked, // Días efectivos (descontando licencias y permisos sin goce)
          days_leave: medicalLeaveDays, // Días de licencia médica calculados automáticamente
          base_salary: selectedEmployee.base_salary,
          taxable_base: calculation.taxableBase,
          total_taxable_earnings: calculation.taxableEarnings.total,
          total_non_taxable_earnings: calculation.nonTaxableEarnings.total,
          total_earnings: calculation.taxableEarnings.total + calculation.nonTaxableEarnings.total,
          total_legal_deductions: calculation.legalDeductions.total,
          total_other_deductions: calculation.otherDeductions.total,
          // IMPORTANTE: total_deductions y net_pay deben usar el total esperado (sin límite del 15%)
          total_deductions: calculation.legalDeductions.total + (calculation.totalExpectedOtherDeductions || calculation.otherDeductions.total),
          // IMPORTANTE: net_pay debe ser exactamente Total Haberes - Total Descuentos (esperados, sin límite del 15%)
          net_pay: calculation.expectedNetPay || Math.max(0, Math.ceil((calculation.taxableEarnings.total + calculation.nonTaxableEarnings.total) - (calculation.legalDeductions.total + (calculation.totalExpectedOtherDeductions || calculation.otherDeductions.total)))),
          status: 'draft',
        })
        .select()
        .single()

      if (slipError) {
        // Si el error es de clave duplicada, mostrar mensaje más amigable
        if (slipError.code === '23505' || slipError.message.includes('duplicate key')) {
          const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
          const monthName = MONTHS[formData.month - 1]
          throw new Error(`Ya existe una liquidación para ${selectedEmployee.full_name} en el período ${monthName} ${formData.year}. Por favor, edite la liquidación existente o elimínela antes de crear una nueva.`)
        }
        throw slipError
      }

      // Registrar evento de auditoría
      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: companyId,
            employeeId: formData.employee_id,
            source: 'admin_dashboard',
            actionType: 'payroll.created',
            module: 'payroll',
            entityType: 'payroll_slips',
            entityId: slip.id,
            status: 'success',
            afterData: {
              period_id: period.id,
              days_worked: slip.days_worked,
              base_salary: slip.base_salary,
              net_pay: slip.net_pay,
              status: slip.status,
            },
            metadata: {
              year: formData.year,
              month: formData.month,
            },
          }),
        }).catch((err) => console.error('Error al registrar auditoría:', err))
      } catch (auditError) {
        console.error('Error al registrar auditoría:', auditError)
      }

      // Marcar anticipos como descontados y linkearlos a la liquidación
      if (calculation.periodAdvances && calculation.periodAdvances.length > 0) {
        const advanceIds = calculation.periodAdvances.map((adv: any) => adv.id)
        const { error: advancesError } = await supabase
          .from('advances')
          .update({
            status: 'descontado',
            payroll_slip_id: slip.id,
            discounted_at: new Date().toISOString(),
          })
          .in('id', advanceIds)

        if (advancesError) {
          console.error('Error al actualizar anticipos:', advancesError)
          // No lanzamos error, solo lo registramos
        }
      }

      // Marcar permisos como aplicados y linkearlos a la liquidación
      if (calculation.periodPermissions && calculation.periodPermissions.length > 0) {
        for (const permission of calculation.periodPermissions) {
          const { error: permissionError } = await supabase
            .from('permissions')
            .update({
              status: 'applied',
              applied_to_payroll: true,
              payroll_slip_id: slip.id,
              discount_amount: permission.discount_amount,
            })
            .eq('id', permission.id)

          if (permissionError) {
            console.error('Error al actualizar permiso:', permissionError)
            // No lanzamos error, solo lo registramos
          }
        }
      }

      // Crear ítems de liquidación
      console.log('Cálculo completo:', calculation)
      console.log('Descuentos legales:', calculation.legalDeductions)
      console.log('Salud calculada:', calculation.legalDeductions.health)
      console.log('Sistema de salud del trabajador:', selectedEmployee.health_system)
      
      const items = [
        // Haberes imponibles
        { 
          type: 'taxable_earning', 
          category: 'sueldo_base', 
          description: (() => {
            const parts = []
            if (medicalLeaveDays > 0) parts.push(`${medicalLeaveDays} días licencia médica`)
            if (permissionDaysWithoutPay > 0) parts.push(`${permissionDaysWithoutPay} días permiso sin goce`)
            if (parts.length > 0) {
              return `Sueldo Base Días Trabajados (${effectiveDaysWorked} días - ${parts.join(', ')})`
            }
            return 'Sueldo Base Días Trabajados'
          })(),
          amount: calculation.taxableEarnings.baseSalary 
        },
        { type: 'taxable_earning', category: 'gratificacion', description: 'Gratificación Mensual', amount: calculation.taxableEarnings.monthlyGratification },
        // Bonos individuales
        ...bonuses.filter(b => b.name && b.amount > 0).map(bonus => ({
          type: 'taxable_earning' as const,
          category: 'bono',
          description: bonus.name,
          amount: bonus.amount,
        })),
        { type: 'taxable_earning', category: 'horas_extras', description: `Horas Extras (${formData.overtime_hours} hora${formData.overtime_hours !== 1 ? 's' : ''})`, amount: calculation.taxableEarnings.overtime },
        // NOTA: Las vacaciones NO se agregan como item separado porque ya están incluidas en el sueldo base proporcional (daysWorked)
        // Las vacaciones se pagan como días trabajados normales según ley chilena (remuneración íntegra)
        // Otros haberes imponibles
        ...(calculation.taxableEarnings.otherTaxableEarnings && calculation.taxableEarnings.otherTaxableEarnings > 0 ? [{
          type: 'taxable_earning' as const,
          category: 'otros_imponibles',
          description: 'Otros Haberes Imponibles',
          amount: calculation.taxableEarnings.otherTaxableEarnings
        }] : []),
        // Haberes no imponibles
        { type: 'non_taxable_earning', category: 'movilizacion', description: 'Movilización', amount: calculation.nonTaxableEarnings.transportation },
        { type: 'non_taxable_earning', category: 'colacion', description: 'Colación', amount: calculation.nonTaxableEarnings.mealAllowance },
        // Haberes no imponibles adicionales individuales
        ...nonTaxableEarnings.filter(e => e.name && e.amount > 0).map(earning => ({
          type: 'non_taxable_earning' as const,
          category: 'otro_no_imponible',
          description: earning.name,
          amount: earning.amount,
        })),
        { type: 'non_taxable_earning', category: 'aguinaldo', description: 'Aguinaldo', amount: formData.aguinaldo },
        // Descuentos legales
        { type: 'legal_deduction', category: 'afp', description: 'FONDO DE PENSIONES AFP', amount: calculation.legalDeductions.afp10 + calculation.legalDeductions.afpAdditional },
        // Salud: siempre se descuenta (7% para FONASA, 7% + plan para ISAPRE)
        { 
          type: 'legal_deduction', 
          category: 'salud', 
          description: selectedEmployee.health_system === 'ISAPRE' 
            ? `${selectedEmployee.health_plan_percentage || 0} UF Salud ISAPRE` 
            : '7% Salud FONASA', 
          amount: calculation.legalDeductions.health 
        },
        { type: 'legal_deduction', category: 'cesantia', description: 'Seguro de Cesantía', amount: calculation.legalDeductions.unemploymentInsurance },
        { type: 'legal_deduction', category: 'impuesto_unico', description: 'Impuesto Único', amount: calculation.legalDeductions.uniqueTax },
        // Otros descuentos
        // Separar préstamos manuales de préstamos con cuotas
        // Los préstamos manuales (formData.loans) se guardan como "Otros Préstamos"
        // Los préstamos con cuotas (loansToPay) se registran en loan_payments
        ...(formData.loans > 0 ? [{ 
          type: 'other_deduction', 
          category: 'otros_prestamos', 
          description: 'Otros Préstamos', 
          amount: formData.loans 
        }] : []),
        { type: 'other_deduction', category: 'anticipo', description: 'Anticipo', amount: calculation.otherDeductions.advances },
        // NO agregar descuento por permisos sin goce - ya está implícito en el cálculo proporcional
      ].filter(item => item.amount > 0)

      const { error: itemsError } = await supabase
        .from('payroll_items')
        .insert(items.map(item => {
          const { loan_id, ...itemData } = item as any
          return {
            payroll_slip_id: slip.id,
            ...itemData,
            ...(loan_id && { loan_id }), // Solo incluir loan_id si existe
          }
        }))

      if (itemsError) throw itemsError

      // IMPORTANTE: Solo registrar pagos y actualizar préstamos si la liquidación NO está en borrador
      // Si está en borrador, solo se registran los loan_payments pero NO se actualiza paid_installments
      if (slip.status !== 'draft') {
        // Registrar pagos de préstamos
        for (const loan of loansToPay) {
          const { error: paymentError } = await supabase
            .from('loan_payments')
            .insert({
              loan_id: loan.id,
              payroll_slip_id: slip.id,
              installment_number: loan.installmentNumber,
              amount: loan.allowedAmount || loan.installment_amount,
              payment_date: new Date().toISOString().split('T')[0],
            })

          if (paymentError) {
            console.error('Error al registrar pago de préstamo:', paymentError)
            // No lanzamos error, solo lo registramos
            continue
          }

          // Calcular paid_installments real contando pagos de liquidaciones emitidas
          const { data: issuedPayments } = await supabase
            .from('loan_payments')
            .select('id, payroll_slip_id, payroll_slips!inner(id, status)')
            .eq('loan_id', loan.id)
            .eq('payroll_slips.status', 'issued')

          const actualPaidInstallments = issuedPayments?.length || 0
          
          // Calcular remaining_amount basándome en pagos reales
          const loanAmount = loan.total_amount || loan.amount || 0
          const totalPaid = actualPaidInstallments * loan.installment_amount
          const newRemainingAmount = Math.max(0, loanAmount - totalPaid)
          const newStatus = newRemainingAmount <= 0 ? 'paid' : 'active'

          const { error: loanUpdateError } = await supabase
            .from('loans')
            .update({
              paid_installments: actualPaidInstallments,
              remaining_amount: newRemainingAmount,
              status: newStatus,
              paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
            })
            .eq('id', loan.id)

          if (loanUpdateError) {
            console.error('Error al actualizar préstamo:', loanUpdateError)
          }
        }
      } else {
        // Si está en borrador, solo registrar los loan_payments (sin actualizar el préstamo)
        // Esto permite que aparezcan en el historial pero no afecta el estado del préstamo
        for (const loan of loansToPay) {
          const { error: paymentError } = await supabase
            .from('loan_payments')
            .insert({
              loan_id: loan.id,
              payroll_slip_id: slip.id,
              installment_number: loan.installmentNumber,
              amount: loan.allowedAmount || loan.installment_amount,
              payment_date: new Date().toISOString().split('T')[0],
            })

          if (paymentError) {
            console.error('Error al registrar pago de préstamo (borrador):', paymentError)
          }
        }
      }

      router.push(`/payroll/${slip.id}`)
    } catch (error: any) {
      alert('Error al crear liquidación: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nueva Liquidación</h1>
        <Link href="/payroll/bulk">
          <button style={{ 
            background: '#fbbf24', 
            color: '#000',
            fontWeight: '600'
          }}>Generación Masiva</button>
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Datos de la Liquidación</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Trabajador *</label>
              <select
                required
                value={formData.employee_id}
                onChange={(e) => handleEmployeeChange(e.target.value)}
              >
                <option value="">Seleccionar trabajador</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.rut}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: '0 0 25%' }}>
              <label>Año *</label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 30%' }}>
              <label>Mes *</label>
              <select
                required
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>{MONTHS[m - 1]}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 0 25%' }}>
              <label>Días Trabajados *</label>
              <input
                type="number"
                required
                min="1"
                max="31"
                value={formData.days_worked}
                onChange={(e) => setFormData({ ...formData, days_worked: parseInt(e.target.value) })}
              />
              {(() => {
                const effectiveDays = Math.max(0, formData.days_worked - medicalLeaveDays - permissionDaysWithoutPay)
                if (effectiveDays !== formData.days_worked) {
                  const parts: string[] = []
                  if (permissionDaysWithoutPay > 0) {
                    parts.push(`${permissionDaysWithoutPay} día${permissionDaysWithoutPay > 1 ? 's' : ''} de permiso${permissionDaysWithoutPay > 1 ? 's' : ''} sin goce`)
                  }
                  if (medicalLeaveDays > 0) {
                    parts.push(`${medicalLeaveDays} día${medicalLeaveDays > 1 ? 's' : ''} de licencia${medicalLeaveDays > 1 ? 's' : ''} médica`)
                  }
                  return (
                    <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                      ✅ <strong>Días efectivos a calcular: {effectiveDays}</strong> 
                      <br />
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                        (El sistema descuenta automáticamente: {parts.join(' y ')})
                      </span>
                      <br />
                      <span style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' }}>
                        La liquidación se calculará por {effectiveDays} días, no por {formData.days_worked} días.
                      </span>
                    </small>
                  )
                }
                return null
              })()}
            </div>
            <div className="form-group" style={{ flex: '0 0 20%' }}>
              <label>Días de Licencia</label>
              <input
                type="number"
                min="0"
                readOnly
                value={medicalLeaveDays}
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                title="Calculado automáticamente desde la gestión de licencias médicas"
              />
            </div>
          </div>
          
          {/* Mensaje informativo de permisos sin goce detectados */}
          {permissionDaysWithoutPay > 0 && permissionsToApply.length > 0 && (
            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group" style={{ width: '100%' }}>
                <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <strong style={{ color: '#991b1b', fontSize: '14px' }}>⚠️ Permisos sin Goce de Sueldo Detectados</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f1d1d', marginBottom: '8px' }}>
                    <strong>Total de días de permiso sin goce:</strong> {permissionDaysWithoutPay} día{permissionDaysWithoutPay > 1 ? 's' : ''}
                    <br />
                    <strong>Días efectivos a calcular:</strong> {Math.max(0, formData.days_worked - medicalLeaveDays - permissionDaysWithoutPay)} días
                    <br />
                    <strong>Cálculo del sueldo:</strong> (Sueldo Base / 30) × {Math.max(0, formData.days_worked - medicalLeaveDays - permissionDaysWithoutPay)} días efectivos
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
                    <strong>Detalle de permisos:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                      {permissionsToApply.map((perm, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          <strong>{perm.permission_types?.name || perm.permission_types?.label || 'Permiso sin goce'}:</strong> {perm.days_in_period} día{perm.days_in_period > 1 ? 's' : ''}
                          {' '}({new Date(perm.start_date).toLocaleDateString('es-CL')} - {new Date(perm.end_date).toLocaleDateString('es-CL')})
                          {perm.reason && ` - Motivo: ${perm.reason}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          {(medicalLeaveDays > 0 || vacationDays > 0 || permissionDaysWithoutPay > 0) && (
            <div className="form-row">
              <div className="form-group" style={{ width: '100%' }}>
                {medicalLeaveDays > 0 && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#fef3c7', borderRadius: '4px', marginBottom: (vacationDays > 0 || permissionDaysWithoutPay > 0) ? '8px' : '0' }}>
                    <strong>⚠️ Licencia Médica Detectada</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                      Días de licencia en el período: {medicalLeaveDays}
                      <br />
                      Días efectivos a calcular: {Math.max(0, formData.days_worked - medicalLeaveDays - permissionDaysWithoutPay)}
                    </p>
                  </div>
                )}
                {permissionDaysWithoutPay > 0 && (
                  <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '4px', marginBottom: vacationDays > 0 ? '8px' : '0' }}>
                    <strong>⚠️ Permisos sin Goce de Sueldo Detectados</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                      Días de permiso sin goce en el período: {permissionDaysWithoutPay} día(s)
                      <br />
                      {permissionsToApply.length > 0 && (
                        <>
                          Permisos:
                          <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '11px' }}>
                            {permissionsToApply.map((perm, idx) => (
                              <li key={idx}>
                                {perm.permission_types?.name || perm.permission_types?.label || 'Permiso sin goce'}: {perm.days_in_period} día(s) 
                                ({new Date(perm.start_date).toLocaleDateString('es-CL')} - {new Date(perm.end_date).toLocaleDateString('es-CL')})
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      Días efectivos a calcular: {Math.max(0, formData.days_worked - medicalLeaveDays - permissionDaysWithoutPay)}
                      <br />
                      <small style={{ color: '#991b1b' }}>
                        ⚠️ El sueldo se calculará proporcionalmente: (Sueldo Base / {formData.days_worked}) × {Math.max(0, formData.days_worked - medicalLeaveDays - permissionDaysWithoutPay)} días efectivos
                      </small>
                    </p>
                  </div>
                )}
                {vacationDays > 0 && (
                  <div style={{ padding: '8px', background: '#dbeafe', borderRadius: '4px' }}>
                    <strong>ℹ️ Vacaciones en el Período</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                      Días de vacaciones: {vacationDays} día(s)
                      <br />
                      Monto calculado: ${vacationAmount.toLocaleString('es-CL')}
                      <br />
                      <small>Las vacaciones se pagan como días normales según ley chilena: (Sueldo Base / 30) × Días de Vacaciones</small>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Haberes Imponibles Adicionales</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
            Estos haberes son imponibles (se suman a la base para calcular AFP, salud, impuestos)
          </p>
          
          {/* Bonos */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ marginBottom: '12px', display: 'block', fontWeight: '600' }}>Bonos</label>
            {bonuses.map((bonus, index) => (
              <div key={bonus.id} className="form-row" style={{ marginBottom: '8px' }}>
                <div className="form-group" style={{ flex: '1' }}>
                  <select
                    value={bonus.name}
                    onChange={(e) => {
                      const updated = [...bonuses]
                      updated[index].name = e.target.value
                      setBonuses(updated)
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="">Seleccionar tipo de bono</option>
                    <option value="Bono de Producción">Bono de Producción</option>
                    <option value="Bono de Cumplimiento de Metas / KPI">Bono de Cumplimiento de Metas / KPI</option>
                    <option value="Bono de Desempeño">Bono de Desempeño</option>
                    <option value="Bono de Asistencia">Bono de Asistencia</option>
                    <option value="Bono de Puntualidad">Bono de Puntualidad</option>
                    <option value="Bono de Responsabilidad">Bono de Responsabilidad</option>
                    <option value="Bono por Turno">Bono por Turno</option>
                    <option value="Bono por Trabajo en Altura">Bono por Trabajo en Altura</option>
                    <option value="Bono por Trabajo en Faena">Bono por Trabajo en Faena</option>
                    <option value="Bono de Disponibilidad">Bono de Disponibilidad</option>
                    <option value="Bono por Zona / Zona Extrema">Bono por Zona / Zona Extrema</option>
                    <option value="Bono de Permanencia">Bono de Permanencia</option>
                    <option value="Bono de Retención">Bono de Retención</option>
                    <option value="Bono de Riesgo">Bono de Riesgo</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: '1' }}>
                  <input
                    type="text"
                    value={formatNumberForInput(bonus.amount)}
                    onChange={(e) => {
                      const updated = [...bonuses]
                      updated[index].amount = parseFormattedNumber(e.target.value) || 0
                      setBonuses(updated)
                    }}
                    placeholder="Monto"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = bonuses.filter((_, i) => i !== index)
                      setBonuses(updated)
                    }}
                    style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setBonuses([...bonuses, { id: Date.now().toString(), name: '', amount: 0 }])
              }}
              style={{ marginTop: '8px', padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Agregar Bono
            </button>
          </div>

          {/* Horas Extras y Vacaciones en una sola fila */}
          <div className="form-row" style={{ marginBottom: '16px' }}>
            <div className="form-group" style={{ flex: '0 0 25%' }}>
              <label>Horas Extras</label>
              <input
                type="number"
                min="0"
                value={formData.overtime_hours}
                onChange={(e) => setFormData({ ...formData, overtime_hours: parseInt(e.target.value) || 0 })}
                placeholder="Número de horas"
              />
              {/* Validación de límites legales de horas extras */}
              {(() => {
                const hoursInput = formData.overtime_hours || 0
                const daysWorked = formData.days_worked || 30
                
                if (hoursInput === 0) return null
                
                // Límite diario: máximo 2 horas extra por día (art. 30 Código del Trabajo)
                const maxDaily = 2
                const maxMonthlyByDaily = maxDaily * daysWorked
                
                // Límite semanal: máximo 10 horas extra por semana (jornada 44 hrs + 10 hrs extra = 54 hrs máximo)
                // Asumiendo jornada estándar de 44 hrs/semana
                const maxWeekly = 10
                // Calcular semanas: días trabajados / 5 días laborales por semana (redondeado hacia arriba)
                const weeksInMonth = Math.ceil(daysWorked / 5)
                const maxMonthlyByWeekly = maxWeekly * weeksInMonth
                
                // El límite real es el menor entre ambos
                const maxAllowed = Math.min(maxMonthlyByDaily, maxMonthlyByWeekly)
                
                // Calcular promedio diario para validación
                const avgDaily = hoursInput / daysWorked
                
                const exceedsDaily = avgDaily > maxDaily
                const exceedsWeekly = hoursInput > maxMonthlyByWeekly
                const exceedsMax = hoursInput > maxAllowed
                const hasWarning = exceedsDaily || exceedsWeekly || exceedsMax
                
                if (!hasWarning) return null
                
                return (
                  <div style={{ marginTop: '8px', padding: '10px', background: '#fef3c7', borderRadius: '4px', fontSize: '11px', border: '1px solid #f59e0b' }}>
                    <strong style={{ color: '#d97706', display: 'block', marginBottom: '6px', fontSize: '12px' }}>⚠️ Advertencia Legal - Horas Extras</strong>
                    {exceedsDaily && (
                      <div style={{ marginBottom: '6px', color: '#92400e', lineHeight: '1.5' }}>
                        <strong>❌ Límite diario excedido:</strong> Has ingresado {hoursInput.toFixed(1)} horas extras ({avgDaily.toFixed(2)} hrs/día promedio).
                        <br />
                        <span style={{ fontSize: '10px' }}>Máximo legal: {maxDaily} horas extra por día. Con {daysWorked} días trabajados, máximo permitido: {maxMonthlyByDaily} horas extras.</span>
                      </div>
                    )}
                    {exceedsWeekly && !exceedsDaily && (
                      <div style={{ marginBottom: '6px', color: '#92400e', lineHeight: '1.5' }}>
                        <strong>❌ Límite semanal excedido:</strong> Has ingresado {hoursInput.toFixed(1)} horas extras.
                        <br />
                        <span style={{ fontSize: '10px' }}>Máximo legal: {maxWeekly} horas extra por semana. Con {weeksInMonth} semana(s) en el período, máximo permitido: {maxMonthlyByWeekly} horas extras.</span>
                      </div>
                    )}
                    {exceedsMax && (
                      <div style={{ marginBottom: '6px', color: '#b45309', lineHeight: '1.5', fontWeight: 'bold' }}>
                        ⚠️ El total de horas extras ({hoursInput}) excede el límite máximo permitido ({maxAllowed} horas).
                      </div>
                    )}
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #fbbf24', fontSize: '10px', color: '#78350f', lineHeight: '1.4' }}>
                      <strong>📋 Referencia legal:</strong> Código del Trabajo, art. 30-32
                      <br />
                      • Máximo diario: {maxDaily} horas extra por día
                      <br />
                      • Máximo semanal: {maxWeekly} horas extra por semana (jornada 44 hrs + 10 hrs extra = 54 hrs máximo)
                      <br />
                      <span style={{ fontStyle: 'italic' }}>Nota: Puedes continuar, pero esto puede generar riesgos legales y de inspección del trabajo.</span>
                    </div>
                  </div>
                )
              })()}
            </div>
            <div className="form-group" style={{ flex: '0 0 25%' }}>
              <label>Monto Horas Extras</label>
              <input
                type="text"
                readOnly
                value={formatNumberForInput(overtimeAmount)}
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                title="Calculado automáticamente según ley chilena (primera hora 50% adicional, siguientes 100% adicional)"
              />
              <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Monto a pagar por horas extra
              </small>
              
              {/* Alerta sobre pacto de horas extra */}
              {formData.overtime_hours > 0 && overtimePactInfo && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  borderRadius: '6px',
                  border: overtimePactInfo.exists && overtimePactInfo.status === 'active' 
                    ? '1px solid #10b981' 
                    : '1px solid #f59e0b',
                  background: overtimePactInfo.exists && overtimePactInfo.status === 'active'
                    ? '#d1fae5'
                    : '#fef3c7'
                }}>
                  {overtimePactInfo.exists && overtimePactInfo.status === 'active' ? (
                    <div>
                      <strong style={{ color: '#065f46', display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                        ✅ Pacto de Horas Extra Activo
                      </strong>
                      <p style={{ margin: 0, fontSize: '11px', color: '#047857' }}>
                        El trabajador tiene un pacto de horas extra activo (ID: {overtimePactInfo.pactNumber || 'N/A'}) 
                        vigente desde {overtimePactInfo.startDate ? new Date(overtimePactInfo.startDate).toLocaleDateString('es-CL') : 'N/A'} 
                        hasta {overtimePactInfo.endDate ? new Date(overtimePactInfo.endDate).toLocaleDateString('es-CL') : 'N/A'}. 
                        El registro de horas extra está conforme a la normativa legal.
                      </p>
                    </div>
                  ) : overtimePactInfo.exists && overtimePactInfo.status !== 'active' ? (
                    <div>
                      <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                        ⚠️ Pacto de Horas Extra {overtimePactInfo.status === 'expired' ? 'Vencido' : overtimePactInfo.status === 'draft' ? 'en Borrador' : 'Inactivo'}
                      </strong>
                      <p style={{ margin: 0, fontSize: '11px', color: '#78350f' }}>
                        El trabajador tiene un pacto de horas extra (ID: {overtimePactInfo.pactNumber || 'N/A'}) 
                        pero está {overtimePactInfo.status === 'expired' ? 'vencido' : overtimePactInfo.status === 'draft' ? 'en borrador' : 'inactivo'}. 
                        <strong> Riesgo legal:</strong> La Dirección del Trabajo puede cuestionar el pago de horas extra sin un pacto activo. 
                        Se recomienda renovar o activar el pacto antes de liquidar.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                        ⚠️ Sin Pacto de Horas Extra Firmado
                      </strong>
                      <p style={{ margin: 0, fontSize: '11px', color: '#78350f' }}>
                        <strong>Riesgo legal importante:</strong> El trabajador no tiene un pacto de horas extra firmado y activo 
                        para el período de esta liquidación. Según el Código del Trabajo art. 32, las horas extraordinarias deben 
                        constar por escrito. La Dirección del Trabajo puede cuestionar este pago y aplicar sanciones. 
                        Se recomienda crear y firmar un pacto de horas extra antes de liquidar.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="form-group" style={{ flex: '0 0 25%' }}>
              <label>Vacaciones (Calculado Automáticamente)</label>
              <input
                type="text"
                readOnly
                value={formatNumberForInput(vacationAmount)}
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                title="Calculado automáticamente desde la gestión de vacaciones según ley chilena"
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 25%' }}>
              <label>Otros Haberes Imponibles</label>
              <input
                type="text"
                value={formatNumberForInput(formData.other_taxable_earnings)}
                onChange={(e) => setFormData({ ...formData, other_taxable_earnings: parseFormattedNumber(e.target.value) })}
                placeholder="Ej: Comisiones, Incentivos, etc."
              />
              <small style={{ fontSize: '11px', color: '#6b7280' }}>
                Para otros conceptos imponibles no contemplados arriba
              </small>
            </div>
          </div>
          
          {/* Detalle de Vacaciones (si hay) */}
          {vacationDetails.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '8px', background: '#dbeafe', borderRadius: '4px', fontSize: '12px' }}>
              <strong>Detalle de Vacaciones:</strong>
              {vacationDetails.map((vac, idx) => (
                <div key={idx} style={{ marginTop: '4px' }}>
                  {vac.start_date} al {vac.end_date}: {vac.days_in_period} día(s) = ${vac.amount.toLocaleString('es-CL')}
                </div>
              ))}
              <div style={{ marginTop: '4px', fontWeight: 'bold' }}>
                Total: {vacationDays} día(s) = ${vacationAmount.toLocaleString('es-CL')}
              </div>
              <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
                Cálculo según ley chilena: (Sueldo Base / 30) × Días de Vacaciones
              </small>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Haberes No Imponibles</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
            Estos haberes NO son imponibles (no se suman a la base para calcular AFP, salud, impuestos)
          </p>
          
          {/* Movilización, Colación y Aguinaldo (en una sola fila) */}
          <div className="form-row">
            <div className="form-group" style={{ flex: '0 0 33%' }}>
              <label>Movilización</label>
              <input
                type="text"
                value={formatNumberForInput(formData.transportation)}
                onChange={(e) => setFormData({ ...formData, transportation: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
              <small style={{ fontSize: '11px', color: '#6b7280' }}>
                Desde ficha del trabajador
              </small>
            </div>
            <div className="form-group" style={{ flex: '0 0 33%' }}>
              <label>Colación</label>
              <input
                type="text"
                value={formatNumberForInput(formData.meal_allowance)}
                onChange={(e) => setFormData({ ...formData, meal_allowance: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
              <small style={{ fontSize: '11px', color: '#6b7280' }}>
                Desde ficha del trabajador
              </small>
            </div>
            <div className="form-group" style={{ flex: '0 0 33%' }}>
              <label>Aguinaldo</label>
              <input
                type="text"
                value={formatNumberForInput(formData.aguinaldo)}
                onChange={(e) => setFormData({ ...formData, aguinaldo: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Haberes No Imponibles Adicionales */}
          <div style={{ marginTop: '24px', marginBottom: '24px' }}>
            <label style={{ marginBottom: '12px', display: 'block', fontWeight: '600' }}>Haberes No Imponibles Adicionales</label>
            {nonTaxableEarnings.map((earning, index) => (
              <div key={earning.id} className="form-row" style={{ marginBottom: '8px' }}>
                <div className="form-group" style={{ flex: '1' }}>
                  <select
                    value={earning.name}
                    onChange={(e) => {
                      const updated = [...nonTaxableEarnings]
                      updated[index].name = e.target.value
                      setNonTaxableEarnings(updated)
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="">Seleccionar tipo de haber</option>
                    <option value="Viáticos">Viáticos (con respaldo y razonabilidad)</option>
                    <option value="Asignación de Pérdida de Caja">Asignación de Pérdida de Caja</option>
                    <option value="Asignación de Herramientas">Asignación de Herramientas</option>
                    <option value="Asignación de Desgaste de Herramientas">Asignación de Desgaste de Herramientas</option>
                    <option value="Asignación de Traslado">Asignación de Traslado</option>
                    <option value="Asignación de Alojamiento">Asignación de Alojamiento</option>
                    <option value="Asignación de Alimentación en Faena">Asignación de Alimentación en Faena</option>
                    <option value="Reembolso de Gastos">Reembolso de Gastos (pasajes, peajes, combustible con respaldo)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: '1' }}>
                  <input
                    type="text"
                    value={formatNumberForInput(earning.amount)}
                    onChange={(e) => {
                      const updated = [...nonTaxableEarnings]
                      updated[index].amount = parseFormattedNumber(e.target.value) || 0
                      setNonTaxableEarnings(updated)
                    }}
                    placeholder="Monto"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = nonTaxableEarnings.filter((_, i) => i !== index)
                      setNonTaxableEarnings(updated)
                    }}
                    style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setNonTaxableEarnings([...nonTaxableEarnings, { id: Date.now().toString(), name: '', amount: 0 }])
              }}
              style={{ marginTop: '8px', padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Agregar Haber No Imponible
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Otros Descuentos</h2>
          <div className="form-row">
            <div className="form-group" style={{ flex: '1' }}>
              <label>Préstamos</label>
              <input
                type="text"
                value={formatNumberForInput(formData.loans)}
                onChange={(e) => setFormData({ ...formData, loans: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
              <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Monto adicional manual (se suma a los préstamos automáticos)
              </small>
              {/* Detalle de préstamos activos */}
              {loansToPay.length > 0 && (
                <div style={{ marginTop: '12px', padding: '10px', background: '#eff6ff', borderRadius: '4px', fontSize: '12px', border: '1px solid #bfdbfe' }}>
                  <strong style={{ color: '#1e40af', display: 'block', marginBottom: '8px' }}>📋 Préstamos a Descontar Automáticamente:</strong>
                  {loansToPay.map((loan, idx) => {
                    const totalFromLoans = loansToPay.reduce((sum: number, l: { installment_amount: number }) => sum + l.installment_amount, 0)
                    return (
                      <div key={loan.id || idx} style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: idx < loansToPay.length - 1 ? '1px solid #dbeafe' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: '1' }}>
                            <strong style={{ color: '#1e3a8a' }}>Préstamo {loan.loan_number || `#${idx + 1}`}</strong>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                              Cuota {loan.installmentNumber}/{loan.installments}
                              {loan.description && (
                                <span style={{ display: 'block', marginTop: '2px', fontStyle: 'italic' }}>
                                  {loan.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e40af' }}>
                            ${loan.installment_amount.toLocaleString('es-CL')}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#1e3a8a' }}>
                    <span>Total Préstamos Automáticos:</span>
                    <span>${loansToPay.reduce((sum: number, l: { installment_amount: number }) => sum + l.installment_amount, 0).toLocaleString('es-CL')}</span>
                  </div>
                </div>
              )}
              {loansToPay.length === 0 && formData.loans === 0 && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                  No hay préstamos activos para descontar
                </div>
              )}
            </div>
            <div className="form-group" style={{ flex: '1' }}>
              <label>Anticipos</label>
              <input
                type="text"
                value={formatNumberForInput(formData.advances)}
                onChange={(e) => setFormData({ ...formData, advances: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
              <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Monto adicional manual (se suma a los anticipos del período)
              </small>
              {/* Detalle de anticipos del período */}
              {periodAdvances && periodAdvances.length > 0 && (
                <div style={{ marginTop: '12px', padding: '10px', background: '#fef3c7', borderRadius: '4px', fontSize: '12px', border: '1px solid #fde68a' }}>
                  <strong style={{ color: '#92400e', display: 'block', marginBottom: '8px' }}>💰 Anticipos del Período a Descontar:</strong>
                  {periodAdvances.map((advance, idx) => (
                    <div key={advance.id || idx} style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: idx < periodAdvances.length - 1 ? '1px solid #fde68a' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: '1' }}>
                          <strong style={{ color: '#78350f' }}>Anticipo {advance.advance_number || `#${idx + 1}`}</strong>
                          <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
                            {advance.advance_date && new Date(advance.advance_date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {advance.reason && (
                              <span style={{ display: 'block', marginTop: '2px', fontStyle: 'italic' }}>
                                {advance.reason}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#92400e' }}>
                          ${Number(advance.amount).toLocaleString('es-CL')}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#78350f' }}>
                    <span>Total Anticipos del Período:</span>
                    <span>${periodAdvances.reduce((sum: number, a: { amount: number | null }) => sum + Number(a.amount), 0).toLocaleString('es-CL')}</span>
                  </div>
                </div>
              )}
              {(!periodAdvances || periodAdvances.length === 0) && formData.advances === 0 && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                  No hay anticipos del período para descontar
                </div>
              )}
            </div>
          </div>
        </div>

        {calculation && (
          <div className="card">
            <h2>Resumen de Cálculo</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3>Haberes</h3>
                <table>
                  <tbody>
                    <tr>
                      <td>Haberes Imponibles:</td>
                      <td style={{ textAlign: 'right' }}>${calculation.taxableEarnings.total.toLocaleString('es-CL')}</td>
                    </tr>
                    <tr>
                      <td>Haberes No Imponibles:</td>
                      <td style={{ textAlign: 'right' }}>${calculation.nonTaxableEarnings.total.toLocaleString('es-CL')}</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold' }}>
                      <td>Total Haberes:</td>
                      <td style={{ textAlign: 'right' }}>
                        ${(calculation.taxableEarnings.total + calculation.nonTaxableEarnings.total).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h3>Descuentos</h3>
                <table>
                  <tbody>
                    <tr>
                      <td>Descuentos Legales:</td>
                      <td style={{ textAlign: 'right' }}>${calculation.legalDeductions.total.toLocaleString('es-CL')}</td>
                    </tr>
                    <tr>
                      <td>Otros Descuentos:</td>
                      <td style={{ textAlign: 'right' }}>
                        ${(calculation.totalExpectedOtherDeductions || calculation.otherDeductions.total).toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr style={{ fontWeight: 'bold' }}>
                      <td>Total Descuentos:</td>
                      <td style={{ textAlign: 'right' }}>
                        ${(calculation.legalDeductions.total + (calculation.totalExpectedOtherDeductions || calculation.otherDeductions.total)).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: '8px' }}>Líquido a Pagar:</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                ${(calculation.expectedNetPay || calculation.netPay).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
          <button type="submit" disabled={saving || !calculation}>
            {saving ? 'Guardando...' : 'Guardar Liquidación'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => router.back()}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

