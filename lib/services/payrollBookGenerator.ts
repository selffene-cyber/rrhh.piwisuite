import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { PayrollBook, PayrollBookEntry } from '@/types'
import { calculatePayroll } from './payrollCalculator'
import { getCachedIndicators } from './indicatorsCache'
import { getEmployerContributionsForBookEntry } from './previsional/payrollBookAdapter'

/**
 * Genera el Libro de Remuneraciones para una empresa, año y mes
 * Según art. 62 del Código del Trabajo y Dictamen DT 887/006/2021
 * 
 * @param companyId ID de la empresa
 * @param year Año del período
 * @param month Mes del período (1-12)
 * @param userId ID del usuario que genera el libro
 * @param supabase Cliente de Supabase
 * @returns El libro generado con todas sus entradas
 */
export async function generatePayrollBook(
  companyId: string,
  year: number,
  month: number,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<PayrollBook & { entries: PayrollBookEntry[] }> {
  // 1. Verificar que existe el período de liquidación
  const { data: periodData, error: periodError } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (periodError || !periodData) {
    throw new Error(`No existe período de liquidación para ${month}/${year}`)
  }

  const period = periodData as any

  // 2. Obtener todas las liquidaciones emitidas del período
  const { data: payrollSlips, error: slipsError } = await supabase
    .from('payroll_slips')
    .select(`
      *,
      employees (*),
      payroll_items (*)
    `)
    .eq('period_id', period.id)
    .eq('status', 'issued') // Solo liquidaciones emitidas
    .order('employees(full_name)', { ascending: true })

  if (slipsError) {
    throw new Error(`Error al obtener liquidaciones: ${slipsError.message}`)
  }

  if (!payrollSlips || payrollSlips.length === 0) {
    throw new Error(`No hay liquidaciones emitidas para el período ${month}/${year}`)
  }

  // 3. Obtener indicadores previsionales del período (para calcular aportes del empleador)
  const indicators = await getCachedIndicators(year, month)

  // 4. Crear o actualizar el libro principal
  const { data: existingBookData } = await supabase
    .from('payroll_books')
    .select('*')
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  let payrollBook: PayrollBook

  if (existingBookData) {
    const existingBook = existingBookData as any
    
    // PERIODO CERRADO: No regenerar libros cerrados o enviados
    // Los resultados historicos deben conservarse intactos.
    if (existingBook.status === 'closed' || existingBook.status === 'sent_dt') {
      throw new Error(
        `El Libro de Remuneraciones para ${month}/${year} ya está cerrado o enviado. ` +
        `No se puede regenerar un libro cerrado. Los resultados historicos deben conservarse.`
      )
    }
    
    // Actualizar libro existente (solo si está en draft)
    const { data: updatedBook, error: updateError } = await (supabase
      .from('payroll_books') as any)
      .update({
        generated_by: userId,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingBook.id)
      .select()
      .single()

    if (updateError) throw updateError
    payrollBook = updatedBook as PayrollBook

    // Eliminar entradas anteriores para regenerar
    await supabase
      .from('payroll_book_entries')
      .delete()
      .eq('payroll_book_id', payrollBook.id)
  } else {
    // Crear nuevo libro
    const { data: newBook, error: createError } = await (supabase
      .from('payroll_books') as any)
      .insert({
        company_id: companyId,
        year,
        month,
        status: 'draft',
        generated_by: userId,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) throw createError
    payrollBook = newBook as PayrollBook
  }

  // 5. Verificar si el libro ya está cerrado o enviado
  const isBookClosed = payrollBook.status === 'closed' || payrollBook.status === 'sent_dt'

  // 6. Obtener reliquidaciones según el caso:
  // - Si el libro NO está cerrado: las reliquidaciones del mismo período corrigen las liquidaciones
  //   (se usan los valores corregidos de las liquidaciones, no se crean entradas separadas)
  // - Si el libro está cerrado: solo incluir reliquidaciones pagadas en este período (ajuste hacia adelante)
  let reliquidationsToInclude: any[] = []

  if (isBookClosed) {
    // Caso 2: Libro cerrado - solo reliquidaciones pagadas en este período (mes diferente al original)
    const { data: paidReliquidations, error: reliquidationsError } = await supabase
      .from('payroll_reliquidations')
      .select(`
        *,
        employees (*),
        payroll_periods (*),
        payroll_reliquidation_deltas (*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'paid')
      .not('paid_at', 'is', null)

    if (reliquidationsError) {
      console.error('Error al obtener reliquidaciones pagadas:', reliquidationsError)
    } else {
      // Filtrar reliquidaciones pagadas en este período (mes/año) Y que el período original sea diferente
      reliquidationsToInclude = (paidReliquidations || []).filter((rel: any) => {
        if (!rel.paid_at) return false
        const paidDate = new Date(rel.paid_at)
        const paidYear = paidDate.getFullYear()
        const paidMonth = paidDate.getMonth() + 1
        // Solo incluir si se pagó en este período Y el período original es diferente
        const originalPeriod = rel.payroll_periods
        const originalYear = originalPeriod?.year
        const originalMonth = originalPeriod?.month
        return paidYear === year && paidMonth === month && 
               (originalYear !== year || originalMonth !== month)
      })
    }
  }
  // Si el libro NO está cerrado, no incluimos reliquidaciones como entradas separadas
  // porque las liquidaciones ya reflejan los valores corregidos si se recalculó

  // 7. Generar entradas del libro para cada trabajador
  const entries: PayrollBookEntry[] = []
  let totalTaxableEarnings = 0
  let totalNonTaxableEarnings = 0
  let totalLegalDeductions = 0
  let totalOtherDeductions = 0
  let totalEmployerContributions = 0
  let totalNetPay = 0

  for (const slipItem of payrollSlips) {
    const slip = slipItem as any
    const employee = slip.employees
    if (!employee) continue

    // Consolidar ítems de la liquidación
    const items = (slip.payroll_items || []) as any[]

    // Haberes imponibles
    const baseSalary = items
      .filter((i: any) => i.type === 'taxable_earning' && i.category === 'sueldo_base')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const monthlyGratification = items
      .filter((i: any) => i.type === 'taxable_earning' && i.category === 'gratificacion')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const bonuses = items
      .filter((i: any) => i.type === 'taxable_earning' && i.category === 'bonos')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const overtime = items
      .filter((i: any) => i.type === 'taxable_earning' && i.category === 'horas_extras')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const vacationPaid = items
      .filter((i: any) => i.type === 'taxable_earning' && i.category === 'vacaciones')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const otherTaxableEarnings = items
      .filter((i: any) => i.type === 'taxable_earning' && 
        !['sueldo_base', 'gratificacion', 'bonos', 'horas_extras', 'vacaciones'].includes(i.category))
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const totalTaxableEarningsEntry = Number(slip.total_taxable_earnings) || 0

    // Haberes no imponibles
    const transportation = items
      .filter((i: any) => i.type === 'non_taxable_earning' && i.category === 'movilizacion')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const mealAllowance = items
      .filter((i: any) => i.type === 'non_taxable_earning' && i.category === 'colacion')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const aguinaldo = items
      .filter((i: any) => i.type === 'non_taxable_earning' && i.category === 'aguinaldo')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const otherNonTaxableEarnings = items
      .filter((i: any) => i.type === 'non_taxable_earning' && 
        !['movilizacion', 'colacion', 'aguinaldo'].includes(i.category))
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const totalNonTaxableEarningsEntry = Number(slip.total_non_taxable_earnings) || 0

    // Descuentos legales
    const afpDeduction = items
      .filter((i: any) => i.type === 'legal_deduction' && i.category === 'afp')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const healthDeduction = items
      .filter((i: any) => i.type === 'legal_deduction' && i.category === 'salud')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const unemploymentInsuranceDeduction = items
      .filter((i: any) => i.type === 'legal_deduction' && i.category === 'cesantia')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const uniqueTaxDeduction = items
      .filter((i: any) => i.type === 'legal_deduction' && i.category === 'impuesto_unico')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const totalLegalDeductionsEntry = Number(slip.total_legal_deductions) || 0

    // Otros descuentos
    const loansDeduction = items
      .filter((i: any) => i.type === 'other_deduction' && i.category === 'prestamos')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const advancesDeduction = items
      .filter((i: any) => i.type === 'other_deduction' && i.category === 'anticipos')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const otherDeductions = items
      .filter((i: any) => i.type === 'other_deduction' && 
        !['prestamos', 'anticipos'].includes(i.category))
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const totalOtherDeductionsEntry = Number(slip.total_other_deductions) || 0

    // Calcular aportes del empleador usando el motor central previsional
    // FASE 4: Si el motor central tiene tasas validated, las usa.
    // Si el motor central bloquea (falta tasa validated), BLOQUEA la generacion.
    // Solo cae al calculo legacy por errores tecnicos inesperados.
    // Periodos cerrados: NO se recalculan, se usa el resultado historico de la BD.
    const taxableBase = Number(slip.taxable_base) || 0
    let employerAfpContribution = 0
    let employerSisContribution = 0
    let employerAfcContribution = 0
    let employerRentabilidadProtegida = 0
    let employerAfpAccount = 0

    const employerContribs = await getEmployerContributionsForBookEntry(
      employee, year, month, taxableBase, indicators, supabase
    )

    if (employerContribs.blocked && employerContribs.blockedConcepts.length > 0) {
      // BLOQUEO: Faltan tasas validated. NO generar el libro con datos incorrectos.
      throw new Error(
        `No se puede generar el Libro de Remuneraciones: faltan tasas previsionales validadas para ` +
        `[${employerContribs.blockedConcepts.join(', ')}] en ${month}/${year}. ` +
        `Valide las tasas en la tabla prevision_rates antes de generar el libro.`
      )
    }

    if (!employerContribs.blocked) {
      employerAfpContribution = employerContribs.afpAccount
      employerSisContribution = employerContribs.sis
      employerAfcContribution = employerContribs.afc
      employerRentabilidadProtegida = employerContribs.crp
      employerAfpAccount = employerContribs.afpAccount
    }

    const totalEmployerContributionsEntry = employerAfpContribution + employerSisContribution + employerAfcContribution + employerRentabilidadProtegida

    // Totales
    const totalEarningsEntry = totalTaxableEarningsEntry + totalNonTaxableEarningsEntry
    const totalDeductionsEntry = totalLegalDeductionsEntry + totalOtherDeductionsEntry
    const netPayEntry = Number(slip.net_pay) || 0

    // Crear entrada del libro
    const entry: Omit<PayrollBookEntry, 'id' | 'created_at'> = {
      payroll_book_id: payrollBook.id,
      employee_id: employee.id,
      payroll_slip_id: slip.id,
      // Snapshot del trabajador
      employee_rut: employee.rut,
      employee_name: employee.full_name,
      employee_hire_date: employee.hire_date,
      employee_contract_end_date: employee.contract_end_date || null,
      employee_contract_type: employee.contract_type || null,
      employee_afp: employee.afp,
      employee_health_system: employee.health_system,
      employee_health_plan: employee.health_plan || null,
      employee_position: employee.position || null,
      employee_cost_center: employee.cost_center || null,
      // Haberes imponibles
      base_salary: baseSalary,
      monthly_gratification: monthlyGratification,
      bonuses,
      overtime,
      vacation_paid: vacationPaid,
      other_taxable_earnings: otherTaxableEarnings,
      total_taxable_earnings: totalTaxableEarningsEntry,
      // Haberes no imponibles
      transportation,
      meal_allowance: mealAllowance,
      aguinaldo,
      other_non_taxable_earnings: otherNonTaxableEarnings,
      total_non_taxable_earnings: totalNonTaxableEarningsEntry,
      // Descuentos legales
      afp_deduction: afpDeduction,
      health_deduction: healthDeduction,
      unemployment_insurance_deduction: unemploymentInsuranceDeduction,
      unique_tax_deduction: uniqueTaxDeduction,
      total_legal_deductions: totalLegalDeductionsEntry,
      // Otros descuentos
      loans_deduction: loansDeduction,
      advances_deduction: advancesDeduction,
      other_deductions: otherDeductions,
      total_other_deductions: totalOtherDeductionsEntry,
      // Aportes empleador
      employer_afp_contribution: employerAfpContribution,
      employer_sis_contribution: employerSisContribution,
      employer_afc_contribution: employerAfcContribution,
      employer_rentabilidad_protegida: employerRentabilidadProtegida,
      employer_afp_account: employerAfpAccount,
      total_employer_contributions: totalEmployerContributionsEntry,
      // Totales
      total_earnings: totalEarningsEntry,
      total_deductions: totalDeductionsEntry,
      net_pay: netPayEntry,
      // Días
      days_worked: slip.days_worked,
      days_leave: slip.days_leave || 0,
    }

    // Insertar entrada
    const { data: insertedEntry, error: insertError } = await (supabase
      .from('payroll_book_entries') as any)
      .insert(entry)
      .select()
      .single()

    if (insertError) {
      console.error('Error al insertar entrada:', insertError)
      throw insertError
    }

    entries.push(insertedEntry as PayrollBookEntry)

    // Acumular totales
    totalTaxableEarnings += totalTaxableEarningsEntry
    totalNonTaxableEarnings += totalNonTaxableEarningsEntry
    totalLegalDeductions += totalLegalDeductionsEntry
    totalOtherDeductions += totalOtherDeductionsEntry
    totalEmployerContributions += totalEmployerContributionsEntry
    totalNetPay += netPayEntry
  }

  // 7. Agregar entradas de reliquidaciones
  for (const reliquidation of reliquidationsToInclude) {
    const rel = reliquidation as any
    const employee = rel.employees
    if (!employee) continue

    // Obtener delta de la reliquidación
    const delta = Array.isArray(rel.payroll_reliquidation_deltas)
      ? (rel.payroll_reliquidation_deltas.length > 0 ? rel.payroll_reliquidation_deltas[0] : null)
      : rel.payroll_reliquidation_deltas

    // Obtener período original
    const originalPeriod = rel.payroll_periods
    const originalYear = originalPeriod?.year || null
    const originalMonth = originalPeriod?.month || null

    // Valores de la reliquidación (diferencias)
    const diffTaxableEarnings = rel.diff_taxable_earnings || 0
    const diffNonTaxableEarnings = rel.diff_non_taxable_earnings || 0
    const diffTotalEarnings = rel.diff_total_earnings || 0
    const diffLegalDeductions = rel.diff_legal_deductions || 0
    const diffOtherDeductions = rel.diff_other_deductions || 0
    const diffTotalDeductions = rel.diff_total_deductions || 0
    const diffNetPay = rel.diff_net_pay || 0

    // Si la diferencia aumenta el imponible, recalcular cotizaciones
    // Las cotizaciones adicionales se calculan sobre el aumento del imponible
    const increasedTaxableBase = diffTaxableEarnings > 0 ? diffTaxableEarnings : 0
    let additionalEmployerAfp = 0
    let additionalEmployerSis = 0
    let additionalEmployerAfc = 0

    if (increasedTaxableBase > 0 && indicators) {
      // AFP Empleador: 0.1% del aumento imponible
      additionalEmployerAfp = Math.ceil(increasedTaxableBase * 0.001)

      // SIS: Tasa del indicador sobre el aumento
      const sisRate = indicators.TasaSIS ? parseFloat(String(indicators.TasaSIS).replace(/\./g, '').replace(',', '.')) / 100 : 0
      additionalEmployerSis = Math.ceil(increasedTaxableBase * sisRate)

      // AFC Empleador: según tipo de contrato
      const contractType = employee.contract_type || 'indefinido'
      let afcRate = 0
      if (contractType === 'indefinido' && indicators.AFCCpiEmpleador) {
        afcRate = parseFloat(String(indicators.AFCCpiEmpleador).replace(/\./g, '').replace(',', '.')) / 100
      } else if (contractType === 'plazo_fijo' && indicators.AFCCpfEmpleador) {
        afcRate = parseFloat(String(indicators.AFCCpfEmpleador).replace(/\./g, '').replace(',', '.')) / 100
      } else if (contractType === 'temporal' && indicators.AFCTcpEmpleador) {
        afcRate = parseFloat(String(indicators.AFCTcpEmpleador).replace(/\./g, '').replace(',', '.')) / 100
      }
      additionalEmployerAfc = Math.ceil(increasedTaxableBase * afcRate)
    }

    const additionalEmployerContributions = additionalEmployerAfp + additionalEmployerSis + additionalEmployerAfc

    // Crear entrada de reliquidación
    const reliquidationEntry: Omit<PayrollBookEntry, 'id' | 'created_at'> = {
      payroll_book_id: payrollBook.id,
      employee_id: employee.id,
      payroll_slip_id: null, // No está vinculada a una liquidación del período actual
      // Campos de reliquidación
      is_reliquidation: true,
      reliquidation_id: rel.id,
      reference_period_year: originalYear,
      reference_period_month: originalMonth,
      // Snapshot del trabajador
      employee_rut: employee.rut,
      employee_name: employee.full_name,
      employee_hire_date: employee.hire_date,
      employee_contract_end_date: employee.contract_end_date || null,
      employee_contract_type: employee.contract_type || null,
      employee_afp: employee.afp,
      employee_health_system: employee.health_system,
      employee_health_plan: employee.health_plan || null,
      employee_position: employee.position || null,
      employee_cost_center: employee.cost_center || null,
      // Haberes imponibles: la diferencia se agrega como "other_taxable_earnings"
      base_salary: 0,
      monthly_gratification: 0,
      bonuses: 0,
      overtime: 0,
      vacation_paid: 0,
      other_taxable_earnings: diffTaxableEarnings > 0 ? diffTaxableEarnings : 0,
      total_taxable_earnings: diffTaxableEarnings > 0 ? diffTaxableEarnings : 0,
      // Haberes no imponibles
      transportation: 0,
      meal_allowance: 0,
      aguinaldo: 0,
      other_non_taxable_earnings: diffNonTaxableEarnings > 0 ? diffNonTaxableEarnings : 0,
      total_non_taxable_earnings: diffNonTaxableEarnings > 0 ? diffNonTaxableEarnings : 0,
      // Descuentos legales: la diferencia se agrega aquí
      afp_deduction: 0, // Se calcula sobre el aumento, no se duplica
      health_deduction: 0,
      unemployment_insurance_deduction: 0,
      unique_tax_deduction: 0,
      total_legal_deductions: diffLegalDeductions > 0 ? diffLegalDeductions : 0,
      // Otros descuentos
      loans_deduction: 0,
      advances_deduction: 0,
      other_deductions: diffOtherDeductions > 0 ? diffOtherDeductions : 0,
      total_other_deductions: diffOtherDeductions > 0 ? diffOtherDeductions : 0,
      // Aportes empleador adicionales por el aumento imponible
      employer_afp_contribution: additionalEmployerAfp,
      employer_sis_contribution: additionalEmployerSis,
      employer_afc_contribution: additionalEmployerAfc,
      total_employer_contributions: additionalEmployerContributions,
      // Totales
      total_earnings: diffTotalEarnings > 0 ? diffTotalEarnings : 0,
      total_deductions: diffTotalDeductions > 0 ? diffTotalDeductions : 0,
      net_pay: diffNetPay,
      // Días: no aplica para reliquidación
      days_worked: 0,
      days_leave: 0,
    }

    // Insertar entrada de reliquidación
    const { data: insertedReliquidationEntry, error: insertReliquidationError } = await (supabase
      .from('payroll_book_entries') as any)
      .insert(reliquidationEntry)
      .select()
      .single()

    if (insertReliquidationError) {
      console.error('Error al insertar entrada de reliquidación:', insertReliquidationError)
      throw insertReliquidationError
    }

    entries.push(insertedReliquidationEntry as PayrollBookEntry)

    // Acumular totales de reliquidación
    totalTaxableEarnings += reliquidationEntry.total_taxable_earnings
    totalNonTaxableEarnings += reliquidationEntry.total_non_taxable_earnings
    totalLegalDeductions += reliquidationEntry.total_legal_deductions
    totalOtherDeductions += reliquidationEntry.total_other_deductions
    totalEmployerContributions += reliquidationEntry.total_employer_contributions
    totalNetPay += reliquidationEntry.net_pay
  }

  // 8. Actualizar totales del libro
  const { data: updatedBook, error: updateError } = await (supabase
    .from('payroll_books') as any)
    .update({
      total_employees: entries.length,
      total_taxable_earnings: totalTaxableEarnings,
      total_non_taxable_earnings: totalNonTaxableEarnings,
      total_legal_deductions: totalLegalDeductions,
      total_other_deductions: totalOtherDeductions,
      total_employer_contributions: totalEmployerContributions,
      total_net_pay: totalNetPay,
      metadata: {
        indicators_version: indicators ? `${year}-${month}` : null,
        generated_from_period_id: period.id,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', payrollBook.id)
    .select()
    .single()

  if (updateError) throw updateError

  return {
    ...(updatedBook as PayrollBook),
    entries,
  }
}

/**
 * Cierra el libro de remuneraciones (cambia estado a 'closed')
 * Valida que todas las liquidaciones requeridas estén emitidas
 */
export async function closePayrollBook(
  bookId: string,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<PayrollBook> {
  const { data: bookData, error: bookError } = await supabase
    .from('payroll_books')
    .select('*')
    .eq('id', bookId)
    .maybeSingle()

  if (bookError || !bookData) {
    throw new Error('Libro no encontrado')
  }

  const book = bookData as any
  if (book.status === 'closed' || book.status === 'sent_dt') {
    throw new Error('El libro ya está cerrado o enviado')
  }

  // Validar que todas las liquidaciones del período estén emitidas
  const { data: periodData } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('company_id', book.company_id)
    .eq('year', book.year)
    .eq('month', book.month)
    .maybeSingle()

  if (periodData) {
    const period = periodData as any
    const { data: allSlips } = await supabase
      .from('payroll_slips')
      .select('id, status')
      .eq('period_id', period.id)

    const notIssued = allSlips?.filter((s: any) => s.status !== 'issued') || []
    if (notIssued.length > 0) {
      throw new Error(`Hay ${notIssued.length} liquidación(es) que no están emitidas. Debe emitir todas las liquidaciones antes de cerrar el libro.`)
    }
  }

  // Cerrar el libro
  const { data: closedBook, error: closeError } = await (supabase
    .from('payroll_books') as any)
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .select()
    .single()

  if (closeError) throw closeError

  return closedBook as PayrollBook
}

/**
 * Obtiene el libro de remuneraciones con sus entradas
 */
export async function getPayrollBook(
  bookId: string,
  supabase: SupabaseClient<Database>
): Promise<PayrollBook & { entries: PayrollBookEntry[] }> {
  const { data: book, error: bookError } = await supabase
    .from('payroll_books')
    .select('*')
    .eq('id', bookId)
    .single()

  if (bookError || !book) {
    throw new Error('Libro no encontrado')
  }

  const { data: entries, error: entriesError } = await supabase
    .from('payroll_book_entries')
    .select('*')
    .eq('payroll_book_id', bookId)
    .order('employee_name', { ascending: true })

  if (entriesError) throw entriesError

  return {
    ...(book as PayrollBook),
    entries: (entries || []) as PayrollBookEntry[],
  }
}

/**
 * Obtiene el libro de remuneraciones por empresa, año y mes
 */
export async function getPayrollBookByPeriod(
  companyId: string,
  year: number,
  month: number,
  supabase: SupabaseClient<Database>
): Promise<(PayrollBook & { entries: PayrollBookEntry[] }) | null> {
  const { data: bookData, error: bookError } = await supabase
    .from('payroll_books')
    .select('*')
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (bookError) {
    if (bookError.code === 'PGRST116') {
      // No encontrado
      return null
    }
    throw bookError
  }

  if (!bookData) return null

  const book = bookData as any
  const { data: entries, error: entriesError } = await supabase
    .from('payroll_book_entries')
    .select('*')
    .eq('payroll_book_id', book.id)
    .order('employee_name', { ascending: true })

  if (entriesError) throw entriesError

  return {
    ...(book as PayrollBook),
    entries: (entries || []) as PayrollBookEntry[],
  }
}





