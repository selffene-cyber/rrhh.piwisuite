'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { calculatePayroll } from '@/lib/services/payrollCalculator'
import { getCachedIndicators } from '@/lib/services/indicatorsCache'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'

export default function EditPayrollPage() {
  const router = useRouter()
  const params = useParams()
  const slipId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slip, setSlip] = useState<any>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [formData, setFormData] = useState({
    year: 0,
    month: 0,
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
  const [calculation, setCalculation] = useState<any>(null)
  const [loansToPay, setLoansToPay] = useState<any[]>([])
  const [medicalLeaveDays, setMedicalLeaveDays] = useState(0)
  const [vacationDays, setVacationDays] = useState(0)

  useEffect(() => {
    loadSlip()
  }, [slipId])

  useEffect(() => {
    if (slip && selectedEmployee) {
      calculate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, selectedEmployee, slip])

  const loadSlip = async () => {
    try {
      const { data: slipData, error } = await supabase
        .from('payroll_slips')
        .select(`
          *,
          employees (*),
          payroll_periods (*),
          payroll_items (*)
        `)
        .eq('id', slipId)
        .single()

      if (error) throw error

      setSlip(slipData)
      setSelectedEmployee(slipData.employees)

      // Cargar valores desde los ítems de la liquidación
      const items = slipData.payroll_items || []
      const bonuses = items.find((i: any) => i.category === 'bonos')?.amount || 0
      const overtime = items.find((i: any) => i.category === 'horas_extras')?.amount || 0
      const vacation = items.find((i: any) => i.category === 'vacaciones')?.amount || 0
      // Buscar otros haberes imponibles (cualquier item imponible que no sea bonos, horas_extras o vacaciones)
      const otherTaxableItems = items.filter((i: any) => 
        i.type === 'taxable_earning' && 
        !['sueldo_base', 'gratificacion', 'bonos', 'horas_extras', 'vacaciones'].includes(i.category)
      )
      const otherTaxableEarnings = otherTaxableItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
      const transportation = items.find((i: any) => i.category === 'movilizacion')?.amount || 0
      const mealAllowance = items.find((i: any) => i.category === 'colacion')?.amount || 0
      const aguinaldo = items.find((i: any) => i.category === 'aguinaldo')?.amount || 0
      const loans = items.find((i: any) => i.category === 'prestamo')?.amount || 0
      const advances = items.find((i: any) => i.category === 'anticipo')?.amount || 0

      setFormData({
        year: slipData.payroll_periods?.year || new Date().getFullYear(),
        month: slipData.payroll_periods?.month || new Date().getMonth() + 1,
        days_worked: slipData.days_worked || 30,
        days_leave: slipData.days_leave || 0,
        bonuses,
        overtime,
        vacation,
        other_taxable_earnings: otherTaxableEarnings,
        transportation,
        meal_allowance: mealAllowance,
        aguinaldo,
        loans,
        advances,
      })
    } catch (error: any) {
      alert('Error al cargar liquidación: ' + error.message)
      router.push('/payroll')
    } finally {
      setLoading(false)
    }
  }

  const calculate = async () => {
    if (!selectedEmployee || !slip) return

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
    setMedicalLeaveDays(leaveDays)
    setVacationDays(vacationDays)

    // Obtener préstamos activos del trabajador
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('*')
      .eq('employee_id', selectedEmployee.id)
      .eq('status', 'active')
      .gt('remaining_amount', 0)

    // Calcular total de préstamos a descontar
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

    // Obtener indicadores de Previred
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
        daysWorked: effectiveDaysWorked,
        daysLeave: formData.days_leave,
        afp: selectedEmployee.afp,
        healthSystem: selectedEmployee.health_system,
        healthPlanPercentage: selectedEmployee.health_plan_percentage || 0,
        bonuses: formData.bonuses,
        overtime: formData.overtime,
        vacation: formData.vacation,
        otherTaxableEarnings: formData.other_taxable_earnings,
        transportation: formData.transportation,
        mealAllowance: formData.meal_allowance,
        aguinaldo: formData.aguinaldo,
        loans: totalLoansAmount,
        advances: formData.advances,
      },
      indicators,
      formData.year,
      formData.month
    )

    setLoansToPay(loansToPay)
    setCalculation(result)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee || !calculation || !slip) return

    setSaving(true)

    try {
      // Calcular días efectivos
      const effectiveDaysWorked = Math.max(0, formData.days_worked - medicalLeaveDays)

      // Actualizar liquidación
      const { error: slipError } = await supabase
        .from('payroll_slips')
        .update({
          days_worked: formData.days_worked,
          days_leave: formData.days_leave + medicalLeaveDays,
          taxable_base: calculation.taxableBase,
          total_taxable_earnings: calculation.taxableEarnings.total,
          total_non_taxable_earnings: calculation.nonTaxableEarnings.total,
          total_earnings: calculation.taxableEarnings.total + calculation.nonTaxableEarnings.total,
          total_legal_deductions: calculation.legalDeductions.total,
          total_other_deductions: calculation.otherDeductions.total,
          total_deductions: calculation.legalDeductions.total + calculation.otherDeductions.total,
          net_pay: calculation.netPay,
        })
        .eq('id', slip.id)

      if (slipError) throw slipError

      // Eliminar ítems antiguos
      const { error: deleteError } = await supabase
        .from('payroll_items')
        .delete()
        .eq('payroll_slip_id', slip.id)

      if (deleteError) throw deleteError

      // Crear nuevos ítems
      const items = [
        // Haberes imponibles
        { 
          type: 'taxable_earning', 
          category: 'sueldo_base', 
          description: medicalLeaveDays > 0 
            ? `Sueldo Base Días Trabajados (${effectiveDaysWorked} días - ${medicalLeaveDays} días licencia médica)` 
            : 'Sueldo Base Días Trabajados', 
          amount: calculation.taxableEarnings.baseSalary 
        },
        { type: 'taxable_earning', category: 'gratificacion', description: 'Gratificación Mensual', amount: calculation.taxableEarnings.monthlyGratification },
        { type: 'taxable_earning', category: 'bonos', description: 'Bonos', amount: calculation.taxableEarnings.bonuses },
        { type: 'taxable_earning', category: 'horas_extras', description: 'Horas Extras', amount: calculation.taxableEarnings.overtime },
        { type: 'taxable_earning', category: 'vacaciones', description: 'Vacaciones', amount: calculation.taxableEarnings.vacation },
        // Otros haberes imponibles
        ...(calculation.taxableEarnings.otherTaxableEarnings > 0 ? [{
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
      ].filter(item => item.amount > 0)

      const { error: itemsError } = await supabase
        .from('payroll_items')
        .insert(items.map(item => ({
          payroll_slip_id: slip.id,
          ...item,
        })))

      if (itemsError) throw itemsError

      router.push(`/payroll/${slip.id}`)
    } catch (error: any) {
      alert('Error al actualizar liquidación: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!slip) {
    return <div>Liquidación no encontrada</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Editar Liquidación</h1>
        <Link href={`/payroll/${slip.id}`}>
          <button className="secondary">Cancelar</button>
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Datos de la Liquidación</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Trabajador</label>
              <input
                type="text"
                value={selectedEmployee?.full_name || ''}
                disabled
              />
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
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link href={`/payroll/${slip.id}`}>
            <button type="button" className="secondary">
              Cancelar
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}

