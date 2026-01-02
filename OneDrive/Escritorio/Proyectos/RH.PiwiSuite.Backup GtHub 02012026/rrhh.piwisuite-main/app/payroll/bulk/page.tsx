'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentMonthYear } from '@/lib/utils/date'
import { calculatePayroll } from '@/lib/services/payrollCalculator'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'
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
    bonuses: 0,
    overtime: 0,
    vacation: 0,
    transportation: 0,
    meal_allowance: 0,
    aguinaldo: 0,
    advances: 0,
  })
  const [generatedSlips, setGeneratedSlips] = useState<any[]>([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    } else {
      setEmployees([])
      setLoading(false)
    }
  }, [companyId])

  const loadEmployees = async () => {
    try {
      if (!companyId) {
        setEmployees([])
        return
      }
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary, transportation, meal_allowance, afp, health_system, health_plan_percentage, contract_type')
        .eq('status', 'active')
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
      for (const employee of employees) {
        try {
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
          const periodStart = new Date(formData.year, formData.month - 1, 1)
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
            totalAdvancesAmount = periodAdvances.reduce((sum, adv) => sum + Number(adv.amount || 0), 0)
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
          
          const calculation = await calculatePayroll(
            {
              baseSalary: employee.base_salary,
              daysWorked: effectiveDaysWorked, // Usar días efectivos (descontando licencia)
              daysLeave: formData.days_leave,
              afp: employee.afp,
              healthSystem: employee.health_system,
              healthPlanPercentage: employee.health_plan_percentage || 0,
              bonuses: formData.bonuses,
              overtime: formData.overtime,
              vacation: formData.vacation,
              transportation: transportation,
              mealAllowance: mealAllowance,
              aguinaldo: formData.aguinaldo,
              loans: totalLoansAmount,
              advances: totalAdvancesAmount,
            },
            indicators,
            formData.year,
            formData.month
          )

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
            { type: 'taxable_earning', category: 'bonos', description: 'Bonos', amount: calculation.taxableEarnings.bonuses },
            { type: 'taxable_earning', category: 'horas_extras', description: 'Horas Extras', amount: calculation.taxableEarnings.overtime },
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
            const advanceIds = periodAdvances.map(adv => adv.id)
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
        <div className="form-row">
          <div className="form-group">
            <label>Bonos</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.bonuses}
              onChange={(e) => setFormData({ ...formData, bonuses: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label>Horas Extras</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.overtime}
              onChange={(e) => setFormData({ ...formData, overtime: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Vacaciones</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.vacation}
              onChange={(e) => setFormData({ ...formData, vacation: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label>Movilización</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.transportation}
              onChange={(e) => setFormData({ ...formData, transportation: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Colación</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.meal_allowance}
              onChange={(e) => setFormData({ ...formData, meal_allowance: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label>Anticipo</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.advances}
              onChange={(e) => setFormData({ ...formData, advances: parseFloat(e.target.value) || 0 })}
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

