'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentMonthYear, MONTHS } from '@/lib/utils/date'
import { calculatePayroll } from '@/lib/services/payrollCalculator'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import Link from 'next/link'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function BulkPayrollPage() {
  const { companyId } = useCurrentCompany()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [formData, setFormData] = useState({
    year: getCurrentMonthYear().year,
    month: getCurrentMonthYear().month,
    days_worked: 30,
    days_leave: 0,
    bonus_name: '',
    bonus_amount: 0,
    overtime_hours: 0,
    vacation: 0,
    transportation: 0,
    meal_allowance: 0,
    advances: 0,
  })
  const [generatedSlips, setGeneratedSlips] = useState<any[]>([])
  const [processing, setProcessing] = useState(false)
  const [overtimePactStats, setOvertimePactStats] = useState<{
    withPact: number
    withoutPact: number
    pendingList: Array<{ id: string; full_name: string; rut: string }>
  } | null>(null)
  const [showPendingList, setShowPendingList] = useState(false)

  // Lista de bonos disponibles (misma que en liquidación individual)
  const availableBonuses = [
    'Bono de Producción',
    'Bono de Cumplimiento de Metas / KPI',
    'Bono de Desempeño',
    'Bono de Asistencia',
    'Bono de Puntualidad',
    'Bono de Responsabilidad',
    'Bono por Turno',
    'Bono por Trabajo en Altura',
    'Bono por Trabajo en Faena',
    'Bono de Disponibilidad',
    'Bono por Zona / Zona Extrema',
    'Bono de Permanencia',
    'Bono de Retención',
    'Bono de Riesgo',
  ]

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    } else {
      setEmployees([])
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (companyId && employees.length > 0) {
      checkOvertimePacts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, employees.length, formData.year, formData.month])

  const loadEmployees = async () => {
    try {
      if (!companyId) {
        setEmployees([])
        return
      }
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary, transportation, meal_allowance, afp, health_system, health_plan_percentage, contract_type, status, termination_date')
        .in('status', ['active', 'licencia_medica']) // Solo activos o con licencia médica
        .eq('company_id', companyId)
        .order('full_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      alert('Error al cargar trabajadores: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const checkOvertimePacts = async () => {
    if (!companyId || employees.length === 0) return

    try {
      const periodStart = new Date(formData.year, formData.month - 1, 1)
      const periodEnd = new Date(formData.year, formData.month, 0)

      // Obtener todos los pactos activos para el período
      const { data: pacts } = await supabase
        .from('overtime_pacts')
        .select('employee_id, status')
        .eq('status', 'active')
        .lte('start_date', periodEnd.toISOString().split('T')[0])
        .gte('end_date', periodStart.toISOString().split('T')[0])

      const employeesWithPact = new Set((pacts || []).map((p: any) => p.employee_id))
      const withPact = employees.filter((emp: any) => employeesWithPact.has(emp.id)).length
      const withoutPact = employees.length - withPact

      // Lista de trabajadores sin pacto
      const pendingList = employees
        .filter((emp: any) => !employeesWithPact.has(emp.id))
        .map((emp: any) => ({
          id: emp.id,
          full_name: emp.full_name,
          rut: emp.rut,
        }))

      setOvertimePactStats({
        withPact,
        withoutPact,
        pendingList,
      })
    } catch (error) {
      console.error('Error al verificar pactos de horas extra:', error)
    }
  }

  const handleBulkGenerate = async () => {
    if (employees.length === 0) {
      alert('No hay trabajadores activos para generar liquidaciones')
      return
    }

    if (!confirm(`¿Generar liquidaciones para ${employees.length} trabajador(es)? Todas quedarán en borrador.`)) {
      return
    }

    setGenerating(true)
    setProcessing(true)
    const newSlips: any[] = []

    try {
      // Obtener indicadores de Previred
      let indicatorMonth = formData.month - 1
      let indicatorYear = formData.year
      if (indicatorMonth === 0) {
        indicatorMonth = 12
        indicatorYear = formData.year - 1
      }

      const indicators = await getCachedIndicators(indicatorYear, indicatorMonth)

      // Crear o obtener período
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

      // Procesar cada trabajador
      const periodStart = new Date(formData.year, formData.month - 1, 1)
      
      for (const employee of employees) {
        try {
          // Validar que el trabajador no haya renunciado o sido despedido antes del período
          if (employee.status === 'renuncia' || employee.status === 'despido') {
            if (employee.termination_date) {
              const terminationDate = new Date(employee.termination_date)
              if (terminationDate < periodStart) {
                console.log(`Omitiendo ${employee.full_name}: ${employee.status === 'renuncia' ? 'renunció' : 'fue despedido'} el ${terminationDate.toLocaleDateString('es-CL')}, antes del período`)
                continue
              }
            } else {
              console.log(`Omitiendo ${employee.full_name}: tiene estado "${employee.status}" pero no tiene fecha de término registrada`)
              continue
            }
          }

          // Verificar si ya existe una liquidación para este trabajador y período
          const { data: existingSlip } = await supabase
            .from('payroll_slips')
            .select('id')
            .eq('employee_id', employee.id)
            .eq('period_id', period.id)
            .maybeSingle()

          if (existingSlip) {
            console.log(`Liquidación ya existe para ${employee.full_name}, omitiendo...`)
            continue
          }

          // Obtener licencias médicas activas para el período
          const periodEnd = new Date(formData.year, formData.month, 0)
          
          const { data: medicalLeaves } = await supabase
            .from('medical_leaves')
            .select('*')
            .eq('employee_id', employee.id)
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

          // Ajustar días trabajados si hay licencia médica
          const effectiveDaysWorked = Math.max(0, formData.days_worked - leaveDays)

          // Obtener anticipos del período (firmados o pagados, no descontados aún)
          const periodStr = `${formData.year}-${String(formData.month).padStart(2, '0')}`
          const { data: periodAdvances } = await supabase
            .from('advances')
            .select('*')
            .eq('employee_id', employee.id)
            .eq('period', periodStr)
            .in('status', ['firmado', 'pagado'])
            .is('payroll_slip_id', null) // Solo los que no han sido descontados

          // Sumar anticipos del período
          let totalAdvancesAmount = 0
          if (periodAdvances && periodAdvances.length > 0) {
            totalAdvancesAmount = periodAdvances.reduce((sum: number, adv: { amount: number | null }) => sum + Number(adv.amount || 0), 0)
          }

          // Sumar anticipos manuales si los hay
          totalAdvancesAmount += formData.advances

          // Obtener préstamos activos del trabajador
          const { data: activeLoans } = await supabase
            .from('loans')
            .select('*')
            .eq('employee_id', employee.id)
            .eq('status', 'active')
            .gt('remaining_amount', 0)

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

          // Calcular liquidación (usar valores del trabajador si no se especificaron valores globales)
          const transportation = formData.transportation > 0 ? formData.transportation : (employee.transportation || 0)
          const mealAllowance = formData.meal_allowance > 0 ? formData.meal_allowance : (employee.meal_allowance || 0)
          
          // Calcular monto de horas extras automáticamente según sueldo del trabajador
          // Según ley chilena: primera hora 50% adicional, siguientes 100% adicional
          // Valor hora normal = (sueldo base / 30) / 8 (asumiendo 8 horas diarias)
          let overtimeAmount = 0
          if (formData.overtime_hours > 0) {
            const dailySalary = employee.base_salary / 30
            const hourlySalary = dailySalary / 8
            if (formData.overtime_hours === 1) {
              // Primera hora: 50% adicional
              overtimeAmount = hourlySalary * 1.5
            } else {
              // Primera hora: 50% adicional, siguientes: 100% adicional
              overtimeAmount = (hourlySalary * 1.5) + (hourlySalary * 2 * (formData.overtime_hours - 1))
            }
            overtimeAmount = Math.ceil(overtimeAmount)
          }

          // Usar el bono seleccionado si existe
          const bonusAmount = formData.bonus_name && formData.bonus_amount > 0 ? formData.bonus_amount : 0
          
          const calculation = await calculatePayroll(
            {
              baseSalary: employee.base_salary,
              daysWorked: effectiveDaysWorked, // Usar días efectivos (descontando licencia)
              daysLeave: formData.days_leave,
              afp: employee.afp,
              healthSystem: employee.health_system,
              healthPlanPercentage: employee.health_plan_percentage || 0,
              bonuses: bonusAmount,
              overtime: overtimeAmount,
              vacation: formData.vacation,
              transportation: transportation,
              mealAllowance: mealAllowance,
              aguinaldo: 0,
              loans: totalLoansAmount,
              advances: totalAdvancesAmount,
            },
            indicators,
            formData.year,
            formData.month
          )

          // Validar que el empleado pueda recibir una liquidación (requiere contrato activo)
          const { createValidationServices } = await import('@/lib/services/validationHelpers')
          const { employee: employeeValidation } = createValidationServices(supabase as any)
          const validation = await employeeValidation.canGeneratePayrollSlip(employee.id)
          
          if (!validation.allowed) {
            console.log(`Omitiendo ${employee.full_name}: ${validation.message}`)
            continue
          }

          // Crear liquidación
          const { data: slip, error: slipError } = await supabase
            .from('payroll_slips')
            .insert({
              employee_id: employee.id,
              period_id: period.id,
              days_worked: effectiveDaysWorked, // Guardar días efectivos trabajados
              days_leave: formData.days_leave + leaveDays, // Incluir días de licencia
              base_salary: employee.base_salary,
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

          if (slipError) {
            console.error(`Error al crear liquidación para ${employee.full_name}:`, slipError)
            continue
          }

          // Crear ítems de liquidación
          const items = [
            // Haberes imponibles
            { type: 'taxable_earning', category: 'sueldo_base', description: 'Sueldo Base Días Trabajados', amount: calculation.taxableEarnings.baseSalary },
            { type: 'taxable_earning', category: 'gratificacion', description: 'Gratificación Mensual', amount: calculation.taxableEarnings.monthlyGratification },
            // Bono con nombre si fue seleccionado
            ...(formData.bonus_name && bonusAmount > 0 ? [{
              type: 'taxable_earning' as const,
              category: 'bono',
              description: formData.bonus_name,
              amount: bonusAmount,
            }] : []),
            // Horas extras con descripción detallada (calculadas automáticamente según sueldo)
            ...(formData.overtime_hours > 0 && overtimeAmount > 0 ? [{
              type: 'taxable_earning' as const,
              category: 'horas_extras',
              description: `Horas Extras (${formData.overtime_hours} hora${formData.overtime_hours !== 1 ? 's' : ''})`,
              amount: overtimeAmount,
            }] : []),
            { type: 'taxable_earning', category: 'vacaciones', description: 'Vacaciones', amount: calculation.taxableEarnings.vacation },
            // Haberes no imponibles
            { type: 'non_taxable_earning', category: 'movilizacion', description: 'Movilización', amount: calculation.nonTaxableEarnings.transportation },
            { type: 'non_taxable_earning', category: 'colacion', description: 'Colación', amount: calculation.nonTaxableEarnings.mealAllowance },
            { type: 'non_taxable_earning', category: 'aguinaldo', description: 'Aguinaldo', amount: calculation.nonTaxableEarnings.aguinaldo },
            // Descuentos legales
            { type: 'legal_deduction', category: 'afp', description: 'FONDO DE PENSIONES AFP', amount: calculation.legalDeductions.afp10 + calculation.legalDeductions.afpAdditional },
            { 
              type: 'legal_deduction', 
              category: 'salud', 
              description: employee.health_system === 'ISAPRE' 
                ? `${employee.health_plan_percentage || 0} UF Salud ISAPRE` 
                : '7% Salud FONASA', 
              amount: calculation.legalDeductions.health 
            },
            { type: 'legal_deduction', category: 'cesantia', description: 'Seguro de Cesantía', amount: calculation.legalDeductions.unemploymentInsurance },
            { type: 'legal_deduction', category: 'impuesto_unico', description: 'Impuesto Único', amount: calculation.legalDeductions.uniqueTax },
            // Préstamos automáticos
            ...loansToPay.map((loan: any) => ({
              type: 'other_deduction' as const,
              category: 'prestamo',
              description: `Préstamo (Cuota ${loan.installmentNumber}/${loan.installments})`,
              amount: loan.installment_amount,
            })),
            { type: 'other_deduction', category: 'anticipo', description: 'Anticipo', amount: calculation.otherDeductions.advances },
          ].filter(item => item.amount > 0)

          const { error: itemsError } = await supabase
            .from('payroll_items')
            .insert(items.map(item => ({
              payroll_slip_id: slip.id,
              ...item,
            })))

          if (itemsError) {
            console.error(`Error al crear ítems para ${employee.full_name}:`, itemsError)
            continue
          }

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

            if (!paymentError) {
              // Actualizar préstamo
              const newPaidInstallments = loan.paid_installments + 1
              const newRemainingAmount = loan.remaining_amount - loan.installment_amount
              const newStatus = newRemainingAmount <= 0 ? 'paid' : 'active'

              await supabase
                .from('loans')
                .update({
                  paid_installments: newPaidInstallments,
                  remaining_amount: Math.max(0, newRemainingAmount),
                  status: newStatus,
                  paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
                })
                .eq('id', loan.id)
            }
          }

          // Actualizar anticipos como descontados
          if (periodAdvances && periodAdvances.length > 0) {
            const advanceIds = periodAdvances.map((adv: { id: string }) => adv.id)
            await supabase
              .from('advances')
              .update({
                status: 'descontado',
                payroll_slip_id: slip.id,
                discounted_at: new Date().toISOString(),
              })
              .in('id', advanceIds)
          }

          newSlips.push({ ...slip, employee_name: employee.full_name })
        } catch (error: any) {
          console.error(`Error procesando ${employee.full_name}:`, error)
          // Continuar con el siguiente trabajador
        }
      }

      setGeneratedSlips(newSlips)
      alert(`Se generaron ${newSlips.length} liquidaciones en borrador`)
    } catch (error: any) {
      alert('Error al generar liquidaciones: ' + error.message)
    } finally {
      setGenerating(false)
      setProcessing(false)
    }
  }

  const handleBulkIssue = async () => {
    if (generatedSlips.length === 0) {
      alert('No hay liquidaciones generadas para emitir')
      return
    }

    if (!confirm(`¿Emitir ${generatedSlips.length} liquidación(es)?`)) {
      return
    }

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('payroll_slips')
        .update({
          status: 'issued',
          issued_at: new Date().toISOString(),
        })
        .in('id', generatedSlips.map(s => s.id))

      if (error) throw error

      // Actualizar estado local
      setGeneratedSlips(generatedSlips.map(s => ({ ...s, status: 'issued', issued_at: new Date().toISOString() })))
      alert(`${generatedSlips.length} liquidación(es) emitida(s) correctamente`)
    } catch (error: any) {
      alert('Error al emitir liquidaciones: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkSend = async () => {
    if (generatedSlips.length === 0) {
      alert('No hay liquidaciones para enviar')
      return
    }

    // Placeholder - implementar envío masivo más adelante
    alert('Funcionalidad de envío masivo por correo pendiente de implementar')
  }

  const handleDownloadAll = () => {
    // Abrir cada PDF en una nueva pestaña para descarga
    generatedSlips.forEach((slip, index) => {
      setTimeout(() => {
        window.open(`/payroll/${slip.id}/pdf`, '_blank')
      }, index * 500) // Delay para no saturar el navegador
    })
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Generación Masiva de Liquidaciones</h1>
        <Link href="/payroll/new">
          <button className="secondary">Volver a Crear Individual</button>
        </Link>
      </div>

      <div className="card">
        <h2>Parámetros de Liquidación</h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          Se generarán liquidaciones para todos los trabajadores activos ({employees.length} trabajador{employees.length !== 1 ? 'es' : ''})
        </p>
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
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
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

        {/* Título: Montos Generales de Bonificaciones */}
        <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
          Montos Generales de Bonificaciones
        </h3>

        {/* Fila 2: Bonos y Horas Extras */}
        <div className="form-row">
          <div className="form-group">
            <label>Bonos</label>
            <select
              value={formData.bonus_name}
              onChange={(e) => setFormData({ ...formData, bonus_name: e.target.value })}
            >
              <option value="">Seleccionar tipo de bono</option>
              {availableBonuses.map((bonus) => (
                <option key={bonus} value={bonus}>{bonus}</option>
              ))}
            </select>
            {formData.bonus_name && (
              <input
                type="text"
                placeholder="Monto del bono"
                value={formatNumberForInput(formData.bonus_amount)}
                onChange={(e) => setFormData({ ...formData, bonus_amount: parseFormattedNumber(e.target.value) })}
                style={{ marginTop: '8px' }}
              />
            )}
            {formData.bonus_name && formData.bonus_amount > 0 && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                Este bono se aplicará a todos los trabajadores
              </p>
            )}
          </div>
          <div className="form-group">
            <label>Horas Extras</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Número de horas"
              value={formData.overtime_hours}
              onChange={(e) => setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })}
            />
            {formData.overtime_hours > 0 && (
              <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                El monto se calculará automáticamente para cada trabajador según su sueldo base y términos del contrato (primera hora 50% adicional, siguientes 100% adicional).
              </small>
            )}
            {overtimePactStats && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                borderRadius: '6px',
                border: overtimePactStats.withoutPact > 0 ? '1px solid #f59e0b' : '1px solid #10b981',
                background: overtimePactStats.withoutPact > 0 ? '#fef3c7' : '#d1fae5'
              }}>
                <strong style={{ 
                  color: overtimePactStats.withoutPact > 0 ? '#92400e' : '#065f46', 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '12px' 
                }}>
                  {overtimePactStats.withoutPact > 0 ? '⚠️' : '✅'} Estado de Pactos de Horas Extra
                </strong>
                <p style={{ margin: 0, fontSize: '11px', color: overtimePactStats.withoutPact > 0 ? '#78350f' : '#047857' }}>
                  Trabajadores con pacto activo: {overtimePactStats.withPact} | 
                  Sin pacto: {overtimePactStats.withoutPact}
                </p>
                {overtimePactStats.withoutPact > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowPendingList(!showPendingList)}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '10px', 
                        background: '#f59e0b', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer' 
                      }}
                    >
                      {showPendingList ? 'Ocultar' : 'Ver'} Lista de Pendientes ({overtimePactStats.pendingList.length})
                    </button>
                    {showPendingList && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        background: 'white', 
                        borderRadius: '4px', 
                        border: '1px solid #e5e7eb',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {overtimePactStats.pendingList.map((emp) => (
                          <div key={emp.id} style={{ fontSize: '10px', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                            {emp.full_name} ({emp.rut})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fila 3: Movilización, Colación, Anticipo y Vacaciones */}
        <div className="form-row" style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label>Movilización</label>
            <input
              type="text"
              value={formatNumberForInput(formData.transportation)}
              onChange={(e) => setFormData({ ...formData, transportation: parseFormattedNumber(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Colación</label>
            <input
              type="text"
              value={formatNumberForInput(formData.meal_allowance)}
              onChange={(e) => setFormData({ ...formData, meal_allowance: parseFormattedNumber(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Anticipo</label>
            <input
              type="text"
              value={formatNumberForInput(formData.advances)}
              onChange={(e) => setFormData({ ...formData, advances: parseFormattedNumber(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Vacaciones</label>
            <input
              type="text"
              value={formatNumberForInput(formData.vacation)}
              onChange={(e) => setFormData({ ...formData, vacation: parseFormattedNumber(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
          <button onClick={handleBulkGenerate} disabled={generating || processing}>
            {generating ? 'Generando...' : 'Generar Liquidaciones Masivas'}
          </button>
        </div>
      </div>

      {generatedSlips.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h2>Liquidaciones Generadas ({generatedSlips.length})</h2>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleBulkIssue} disabled={processing || generatedSlips[0]?.status === 'issued'}>
              {processing ? 'Emitiendo...' : 'Emitir Todas'}
            </button>
            <button onClick={handleBulkSend} disabled={processing} className="secondary">
              Enviar por Correo (Placeholder)
            </button>
            <button onClick={handleDownloadAll} disabled={processing} className="secondary">
              Descargar Todos los PDFs
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Período</th>
                <th>Líquido a Pagar</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {generatedSlips.map((slip: any) => (
                <tr key={slip.id}>
                  <td>{slip.employee_name}</td>
                  <td>{formData.month}/{formData.year}</td>
                  <td>${slip.net_pay.toLocaleString('es-CL')}</td>
                  <td>
                    <span className={`badge ${slip.status}`}>
                      {slip.status === 'draft' ? 'Borrador' : slip.status === 'issued' ? 'Emitida' : 'Enviada'}
                    </span>
                  </td>
                  <td>
                    <Link href={`/payroll/${slip.id}`}>
                      <button style={{ padding: '4px 8px', fontSize: '12px' }}>Ver</button>
                    </Link>
                    <Link href={`/payroll/${slip.id}/pdf`} target="_blank">
                      <button style={{ padding: '4px 8px', fontSize: '12px', marginLeft: '4px' }} className="secondary">PDF</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

