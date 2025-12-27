'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { calculatePayroll } from '@/lib/services/payrollCalculator'
import { getCurrentMonthYear } from '@/lib/utils/date'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

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
    days_worked: 30,
    days_leave: 0,
    bonuses: 0,
    overtime: 0,
    vacation: 0,
    other_taxable_earnings: 0,
    transportation: 0,
    meal_allowance: 0,
    aguinaldo: 0,
    loans: 0,
    advances: 0,
  })
  const [defaultValuesLoaded, setDefaultValuesLoaded] = useState(false)
  const [calculation, setCalculation] = useState<any>(null)
  const [loansToPay, setLoansToPay] = useState<any[]>([])
  const [medicalLeaveDays, setMedicalLeaveDays] = useState(0)
  const [vacationDays, setVacationDays] = useState(0)
  const [permissionDaysWithoutPay, setPermissionDaysWithoutPay] = useState(0)
  const [periodAdvances, setPeriodAdvances] = useState<any[]>([])

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    } else {
      setEmployees([])
    }
  }, [companyId])

  useEffect(() => {
    if (formData.employee_id && selectedEmployee) {
      calculate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, selectedEmployee])

  const loadEmployees = async () => {
    try {
      if (!companyId) {
        setEmployees([])
        return
      }
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .eq('company_id', companyId)
        .order('full_name')

      if (error) throw error

      setEmployees(data || [])

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
        }
      }
    } catch (error: any) {
      alert('Error al cargar trabajadores: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e: any) => e.id === employeeId)
    setSelectedEmployee(employee || null)
    setFormData({ 
      ...formData, 
      employee_id: employeeId,
      transportation: employee?.transportation || 0,
      meal_allowance: employee?.meal_allowance || 0,
      advances: employee?.requests_advance ? (employee?.advance_amount || 0) : 0,
    })
    setDefaultValuesLoaded(true)
    setMedicalLeaveDays(0) // Resetear días de licencia al cambiar trabajador
  }

  const calculate = async () => {
    if (!selectedEmployee) return

    // Obtener vacaciones en el período
    const periodStart = new Date(formData.year, formData.month - 1, 1)
    const periodEnd = new Date(formData.year, formData.month, 0)
    
    const { data: periodVacations } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', selectedEmployee.id)
      .in('status', ['aprobada', 'tomada'])
      .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)

    // Calcular días de vacaciones en el período
    let vacationDays = 0
    if (periodVacations && periodVacations.length > 0) {
      for (const vacation of periodVacations) {
        const vacStart = new Date(vacation.start_date)
        const vacEnd = new Date(vacation.end_date)
        
        // Calcular intersección entre período y vacaciones
        const overlapStart = vacStart > periodStart ? vacStart : periodStart
        const overlapEnd = vacEnd < periodEnd ? vacEnd : periodEnd
        
        if (overlapStart <= overlapEnd) {
          const diffTime = overlapEnd.getTime() - overlapStart.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          vacationDays += diffDays
        }
      }
    }

    // Obtener licencias médicas activas para el período
    
    const { data: medicalLeaves } = await supabase
      .from('medical_leaves')
      .select('*')
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

    // Obtener permisos sin goce de sueldo del período (aprobados, no aplicados aún)
    const { data: periodPermissions } = await supabase
      .from('permissions')
      .select('*, permission_types (*)')
      .eq('employee_id', selectedEmployee.id)
      .eq('status', 'approved')
      .eq('applied_to_payroll', false)
      .or(`and(start_date.lte.${periodEnd.toISOString().split('T')[0]},end_date.gte.${periodStart.toISOString().split('T')[0]})`)

    // Calcular días de permisos sin goce en el período
    let permissionDaysWithoutPay = 0
    let totalPermissionDiscount = 0
    const permissionsToApply: any[] = []

    if (periodPermissions && periodPermissions.length > 0) {
      for (const permission of periodPermissions) {
        const permType = permission.permission_types
        // Solo considerar permisos sin goce de sueldo
        if (permType && permType.affects_payroll) {
          const permStart = new Date(permission.start_date)
          const permEnd = new Date(permission.end_date)
          
          // Calcular intersección entre período y permiso
          const overlapStart = permStart > periodStart ? permStart : periodStart
          const overlapEnd = permEnd < periodEnd ? permEnd : periodEnd
          
          if (overlapStart <= overlapEnd) {
            const diffTime = overlapEnd.getTime() - overlapStart.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
            permissionDaysWithoutPay += diffDays
            
            // Calcular descuento: (sueldo_base / 30) * días_permiso
            const discount = Math.round((selectedEmployee.base_salary / 30) * diffDays)
            totalPermissionDiscount += discount
            
            permissionsToApply.push({
              ...permission,
              days_in_period: diffDays,
              discount_amount: discount,
            })
          }
        }
      }
    }

    // Ajustar días trabajados si hay licencia médica o permisos sin goce
    // NOTA: Las vacaciones NO descuentan días trabajados (se pagan como días normales)
    const effectiveDaysWorked = Math.max(0, formData.days_worked - leaveDays - permissionDaysWithoutPay)
    setMedicalLeaveDays(leaveDays)
    setVacationDays(vacationDays)
    setPermissionDaysWithoutPay(permissionDaysWithoutPay)

    // Obtener préstamos activos del trabajador
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('*')
      .eq('employee_id', selectedEmployee.id)
      .eq('status', 'active')
      .gt('remaining_amount', 0)

    // Calcular total de préstamos a descontar (solo cuotas pendientes)
    let totalLoansAmount = 0
    const loansToPay: any[] = []

    if (activeLoans) {
      for (const loan of activeLoans) {
        const remainingInstallments = loan.installments - loan.paid_installments
        if (remainingInstallments > 0) {
          totalLoansAmount += loan.installment_amount
          loansToPay.push({
            ...loan,
            installmentNumber: loan.paid_installments + 1,
          })
        }
      }
    }

    // Sumar préstamos manuales si los hay
    totalLoansAmount += formData.loans

    // Obtener anticipos del período (firmados o pagados, no descontados aún)
    const periodStr = `${formData.year}-${String(formData.month).padStart(2, '0')}`
    const { data: periodAdvances } = await supabase
      .from('advances')
      .select('*')
      .eq('employee_id', selectedEmployee.id)
      .eq('period', periodStr)
      .in('status', ['firmado', 'pagado'])
      .is('payroll_slip_id', null) // Solo los que no han sido descontados

    // Sumar anticipos del período
    let totalAdvancesAmount = 0
    if (periodAdvances && periodAdvances.length > 0) {
      totalAdvancesAmount = periodAdvances.reduce((sum, adv) => sum + Number(adv.amount), 0)
    }

    // Sumar anticipos manuales si los hay
    totalAdvancesAmount += formData.advances

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

    const result = await calculatePayroll(
      {
        baseSalary: selectedEmployee.base_salary,
        daysWorked: effectiveDaysWorked, // Usar días efectivos (descontando licencia)
        daysLeave: formData.days_leave,
        afp: selectedEmployee.afp,
        healthSystem: selectedEmployee.health_system,
        healthPlanPercentage: selectedEmployee.health_plan_percentage || 0, // Porcentaje adicional del plan ISAPRE
        bonuses: formData.bonuses,
        overtime: formData.overtime,
        vacation: formData.vacation,
        otherTaxableEarnings: formData.other_taxable_earnings,
        transportation: formData.transportation,
        mealAllowance: formData.meal_allowance,
        aguinaldo: formData.aguinaldo,
        loans: totalLoansAmount,
        advances: totalAdvancesAmount,
        permissionDiscount: totalPermissionDiscount, // Descuento por permisos sin goce
      },
      indicators,
      formData.year,
      formData.month
    )

    // Guardar información de préstamos, anticipos y permisos para usar al guardar
    setLoansToPay(loansToPay)
    setCalculation({ 
      ...result, 
      periodAdvances: periodAdvances || [],
      periodPermissions: permissionsToApply,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee || !calculation) return

    setSaving(true)

    try {
      // Crear o obtener período
      // Primero intentar obtener uno existente
      const { data: existingPeriod } = await supabase
        .from('payroll_periods')
        .select('*')
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
            year: formData.year,
            month: formData.month,
          })
          .select()
          .single()

        if (periodError) throw periodError
        period = newPeriod
      }

          // Calcular días efectivos (descontando licencia médica)
          const effectiveDaysWorked = Math.max(0, formData.days_worked - medicalLeaveDays)

          // Crear liquidación
          // NOTA: days_worked incluye días de vacaciones (no se descuentan)
          // days_leave incluye licencias médicas
          const { data: slip, error: slipError } = await supabase
            .from('payroll_slips')
            .insert({
              employee_id: formData.employee_id,
              period_id: period.id,
              days_worked: formData.days_worked, // Días totales (incluye vacaciones, no se descuentan)
              days_leave: formData.days_leave + medicalLeaveDays, // Incluir días de licencia médica
          base_salary: selectedEmployee.base_salary,
          taxable_base: calculation.taxableBase,
          total_taxable_earnings: calculation.taxableEarnings.total,
          total_non_taxable_earnings: calculation.nonTaxableEarnings.total,
          total_earnings: calculation.taxableEarnings.total + calculation.nonTaxableEarnings.total,
          total_legal_deductions: calculation.legalDeductions.total,
          total_other_deductions: calculation.otherDeductions.total,
          total_deductions: calculation.legalDeductions.total + calculation.otherDeductions.total,
          net_pay: calculation.netPay,
          status: 'draft',
        })
        .select()
        .single()

      if (slipError) throw slipError

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
        { type: 'taxable_earning', category: 'bonos', description: 'Bonos', amount: calculation.taxableEarnings.bonuses },
        { type: 'taxable_earning', category: 'horas_extras', description: 'Horas Extras', amount: calculation.taxableEarnings.overtime },
        { type: 'taxable_earning', category: 'vacaciones', description: 'Vacaciones', amount: calculation.taxableEarnings.vacation },
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
        { type: 'non_taxable_earning', category: 'aguinaldo', description: 'Aguinaldo', amount: calculation.nonTaxableEarnings.aguinaldo },
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
        { type: 'other_deduction', category: 'prestamo', description: 'Préstamo', amount: calculation.otherDeductions.loans },
        { type: 'other_deduction', category: 'anticipo', description: 'Anticipo', amount: calculation.otherDeductions.advances },
        // Descuento por permisos sin goce de sueldo
        ...(calculation.otherDeductions.permissionDiscount && calculation.otherDeductions.permissionDiscount > 0 ? [{
          type: 'other_deduction' as const,
          category: 'permiso_sin_goce',
          description: 'Descuento Permiso sin Goce de Sueldo',
          amount: calculation.otherDeductions.permissionDiscount
        }] : []),
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

      // Registrar pagos de préstamos
      for (const loan of loansToPay) {
        const { error: paymentError } = await supabase
          .from('loan_payments')
          .insert({
            loan_id: loan.id,
            payroll_slip_id: slip.id,
            installment_number: loan.installmentNumber,
            amount: loan.installment_amount,
            payment_date: new Date().toISOString().split('T')[0],
          })

        if (paymentError) {
          console.error('Error al registrar pago de préstamo:', paymentError)
          // No lanzamos error, solo lo registramos
        }

        // Actualizar préstamo
        const newPaidInstallments = loan.paid_installments + 1
        const newRemainingAmount = loan.remaining_amount - loan.installment_amount
        const newStatus = newRemainingAmount <= 0 ? 'paid' : 'active'

        const { error: loanUpdateError } = await supabase
          .from('loans')
          .update({
            paid_installments: newPaidInstallments,
            remaining_amount: Math.max(0, newRemainingAmount),
            status: newStatus,
            paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
          })
          .eq('id', loan.id)

        if (loanUpdateError) {
          console.error('Error al actualizar préstamo:', loanUpdateError)
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
            <div className="form-group">
              <label>Año *</label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Mes *</label>
              <select
                required
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Días Trabajados *</label>
              <input
                type="number"
                required
                min="1"
                max="31"
                value={formData.days_worked}
                onChange={(e) => setFormData({ ...formData, days_worked: parseInt(e.target.value) })}
              />
              {medicalLeaveDays > 0 && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#fef3c7', borderRadius: '4px' }}>
                  <strong>⚠️ Licencia Médica Detectada</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                    Días de licencia en el período: {medicalLeaveDays}
                    <br />
                    Días efectivos a calcular: {Math.max(0, formData.days_worked - medicalLeaveDays)}
                  </p>
                </div>
              )}
              {vacationDays > 0 && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#dbeafe', borderRadius: '4px' }}>
                  <strong>ℹ️ Vacaciones en el Período</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                    Días de vacaciones: {vacationDays} días
                    <br />
                    <small>Las vacaciones se pagan como días normales (no se descuentan del sueldo)</small>
                  </p>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Días de Licencia</label>
              <input
                type="number"
                min="0"
                value={formData.days_leave}
                onChange={(e) => setFormData({ ...formData, days_leave: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Haberes Imponibles Adicionales</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
            Estos haberes son imponibles (se suman a la base para calcular AFP, salud, impuestos)
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>Bonos</label>
              <input
                type="text"
                value={formatNumberForInput(formData.bonuses)}
                onChange={(e) => setFormData({ ...formData, bonuses: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Horas Extras</label>
              <input
                type="text"
                value={formatNumberForInput(formData.overtime)}
                onChange={(e) => setFormData({ ...formData, overtime: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Vacaciones</label>
              <input
                type="text"
                value={formatNumberForInput(formData.vacation)}
                onChange={(e) => setFormData({ ...formData, vacation: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
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
        </div>

        <div className="card">
          <h2>Haberes No Imponibles</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
            Estos haberes NO son imponibles (no se suman a la base para calcular AFP, salud, impuestos)
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>Movilización</label>
              <input
                type="text"
                value={formatNumberForInput(formData.transportation)}
                onChange={(e) => setFormData({ ...formData, transportation: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Colación</label>
              <input
                type="text"
                value={formatNumberForInput(formData.meal_allowance)}
                onChange={(e) => setFormData({ ...formData, meal_allowance: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Aguinaldo</label>
              <input
                type="text"
                value={formatNumberForInput(formData.aguinaldo)}
                onChange={(e) => setFormData({ ...formData, aguinaldo: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              {/* Espacio vacío para mantener el layout */}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Otros Descuentos</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Préstamos</label>
              <input
                type="text"
                value={formatNumberForInput(formData.loans)}
                onChange={(e) => setFormData({ ...formData, loans: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Anticipos</label>
              <input
                type="text"
                value={formatNumberForInput(formData.advances)}
                onChange={(e) => setFormData({ ...formData, advances: parseFormattedNumber(e.target.value) })}
                placeholder="0"
              />
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
                      <td style={{ textAlign: 'right' }}>${calculation.otherDeductions.total.toLocaleString('es-CL')}</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold' }}>
                      <td>Total Descuentos:</td>
                      <td style={{ textAlign: 'right' }}>
                        ${(calculation.legalDeductions.total + calculation.otherDeductions.total).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: '8px' }}>Líquido a Pagar:</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                ${calculation.netPay.toLocaleString('es-CL')}
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

