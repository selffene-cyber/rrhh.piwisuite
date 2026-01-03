/**
 * Servicio para construir contexto de datos según el tipo de pregunta del usuario
 * Esto permite que el asistente IA tenga acceso a datos reales de la aplicación
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type SupabaseClientType = SupabaseClient<Database>

/**
 * Construye contexto base que siempre se incluye (resúmenes generales)
 */
async function buildBaseContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  const contextParts: string[] = []
  
  try {
    // Resumen de trabajadores activos
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, rut, position, status, base_salary')
      .eq('company_id', companyId)

    if (employees && employees.length > 0) {
      const activeEmployees = employees.filter((e: any) => e.status === 'active')
      const byStatus = employees.reduce((acc: any, emp: any) => {
        acc[emp.status] = (acc[emp.status] || 0) + 1
        return acc
      }, {})

      contextParts.push('=== RESUMEN GENERAL DE TRABAJADORES ===')
      contextParts.push(`Total de trabajadores: ${employees.length}`)
      contextParts.push(`Trabajadores activos: ${activeEmployees.length}`)
      
      Object.entries(byStatus).forEach(([status, count]) => {
        const statusLabel =
          status === 'active' ? 'Activos' :
          status === 'licencia_medica' ? 'Con Licencia Médica' :
          status === 'inactive' ? 'Inactivos' :
          status === 'renuncia' ? 'Renuncia' :
          status === 'despido' ? 'Despido' : status
        contextParts.push(`- ${statusLabel}: ${count}`)
      })

      // Lista completa de trabajadores activos con información básica
      if (activeEmployees.length > 0) {
        contextParts.push('\n--- LISTA DE TRABAJADORES ACTIVOS ---')
        activeEmployees.forEach((emp: any) => {
          const salary = emp.base_salary ? ` - Sueldo: $${emp.base_salary.toLocaleString('es-CL')}` : ''
          contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}) - Cargo: ${emp.position || 'Sin cargo'}${salary}`)
        })
      }
    }

    // Resumen de liquidaciones recientes
    const { data: recentPeriods } = await supabase
      .from('payroll_periods')
      .select('id, year, month, payroll_slips(id, status)')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(3)

    if (recentPeriods && recentPeriods.length > 0) {
      contextParts.push('\n=== RESUMEN DE LIQUIDACIONES RECIENTES ===')
      recentPeriods.forEach((period: any) => {
        const slips = period.payroll_slips || []
        const issued = slips.filter((s: any) => s.status === 'issued').length
        contextParts.push(`- Período ${period.month}/${period.year}: ${slips.length} liquidaciones (${issued} emitidas)`)
      })
    }

    // Resumen de licencias médicas activas (con información completa)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)

    if (companyEmployees && companyEmployees.length > 0) {
      const employeeIds = companyEmployees.map((e: any) => e.id)
      
      // Obtener todas las licencias activas y filtrar por fecha en JavaScript
      const { data: allActiveLeaves, error: leavesError } = await supabase
        .from('medical_leaves')
        .select(`
          id, 
          employee_id, 
          start_date, 
          end_date, 
          days_count, 
          folio_number,
          employees (full_name, rut, position)
        `)
        .in('employee_id', employeeIds)
        .eq('is_active', true)
      
      if (leavesError) {
        console.error('[AI Context] Error al obtener licencias médicas:', leavesError)
      }
      
      console.log(`[AI Context] Licencias activas encontradas (sin filtrar fecha): ${allActiveLeaves?.length || 0}`)
      
      // Filtrar las que están activas hoy (start_date <= today <= end_date)
      const activeLeaves = (allActiveLeaves || []).filter((leave: any) => {
        const startDate = new Date(leave.start_date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(leave.end_date)
        endDate.setHours(0, 0, 0, 0)
        const isActive = startDate <= today && endDate >= today
        if (!isActive) {
          console.log(`[AI Context] Licencia filtrada: ${leave.employees?.full_name} - Del ${leave.start_date} al ${leave.end_date} - Hoy: ${today.toISOString().split('T')[0]}`)
        }
        return isActive
      })
      
      console.log(`[AI Context] Licencias activas HOY: ${activeLeaves.length}`)

      if (activeLeaves.length > 0) {
        contextParts.push('\n=== LICENCIAS MÉDICAS ACTIVAS ===')
        contextParts.push(`Total: ${activeLeaves.length} trabajadores con licencia médica activa`)
        contextParts.push('\n--- DETALLE DE LICENCIAS MÉDICAS ACTIVAS ---')
        activeLeaves.forEach((leave: any) => {
          const emp = leave.employees
          const daysRemaining = Math.ceil(
            (new Date(leave.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
          const startDate = new Date(leave.start_date).toLocaleDateString('es-CL')
          const endDate = new Date(leave.end_date).toLocaleDateString('es-CL')
          contextParts.push(
            `- ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Folio: ${leave.folio_number || 'N/A'} - ${leave.days_count} días totales - Del ${startDate} al ${endDate} - Días restantes: ${daysRemaining} días`
          )
        })
      } else {
        contextParts.push('\n=== LICENCIAS MÉDICAS ACTIVAS ===')
        contextParts.push('No hay trabajadores con licencia médica activa actualmente.')
      }
    }

    // Resumen de pactos de horas extra activos
    const { data: activePacts } = await supabase
      .from('overtime_pacts')
      .select('id, employee_id, employees(full_name, rut)')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .gte('end_date', today.toISOString().split('T')[0])

    if (activePacts && activePacts.length > 0) {
      contextParts.push('\n=== PACTOS DE HORAS EXTRA ACTIVOS ===')
      contextParts.push(`Total: ${activePacts.length} trabajadores con pacto activo`)
    }

    // Resumen de días disponibles de vacaciones (top 5 trabajadores con más días)
    // Solo incluir trabajadores activos o con licencia médica
    const activeEmployeeIds = (companyEmployees || [])
      .filter((e: any) => e.status === 'active' || e.status === 'licencia_medica')
      .map((e: any) => e.id)
    
    const { data: vacationPeriods } = await supabase
      .from('vacation_periods')
      .select(`
        employee_id,
        accumulated_days,
        used_days,
        available_days,
        employees (full_name, rut, status)
      `)
      .in('employee_id', activeEmployeeIds)
      .in('employees.status', ['active', 'licencia_medica'])

    if (vacationPeriods && vacationPeriods.length > 0) {
      const vacationSummary: Record<string, {
        full_name: string
        rut: string
        totalAvailable: number
      }> = {}

      vacationPeriods.forEach((period: any) => {
        const empId = period.employee_id
        const emp = period.employees
        
        if (!vacationSummary[empId] && emp?.status === 'active') {
          vacationSummary[empId] = {
            full_name: emp.full_name || 'N/A',
            rut: emp.rut || 'N/A',
            totalAvailable: 0
          }
        }
        
        if (vacationSummary[empId]) {
          vacationSummary[empId].totalAvailable += parseFloat(period.available_days || 0)
        }
      })

      const sortedByAvailable = Object.values(vacationSummary)
        .sort((a, b) => b.totalAvailable - a.totalAvailable)
        .slice(0, 5)

      if (sortedByAvailable.length > 0) {
        contextParts.push('\n=== RESUMEN DE DÍAS DISPONIBLES DE VACACIONES (TOP 5) ===')
        sortedByAvailable.forEach((summary, index) => {
          contextParts.push(
            `${index + 1}. ${summary.full_name} (RUT: ${summary.rut}): ${summary.totalAvailable.toFixed(2)} días disponibles`
          )
        })
      }
    }

    // Información adicional: Contratos activos, Préstamos, Anticipos, Permisos, Bonos
    const additionalContext = await buildAdditionalEmployeeData(companyId, supabase)
    if (additionalContext) {
      contextParts.push(additionalContext)
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto base:', error)
    return ''
  }
}

/**
 * Detecta el tipo de pregunta y extrae datos relevantes
 */
export async function buildContextFromQuestion(
  question: string,
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  const lowerQuestion = question.toLowerCase()
  const contextParts: string[] = []

  // SIEMPRE incluir contexto base primero
  const baseContext = await buildBaseContext(companyId, supabase)
  if (baseContext) {
    contextParts.push(baseContext)
  }

  // Detectar preguntas sobre pactos de horas extra
  if (
    lowerQuestion.includes('pacto') ||
    lowerQuestion.includes('horas extra') ||
    lowerQuestion.includes('horas extras') ||
    lowerQuestion.includes('he') ||
    lowerQuestion.includes('pendiente') ||
    lowerQuestion.includes('sin pacto')
  ) {
    const overtimeContext = await buildOvertimePactsContext(companyId, supabase)
    if (overtimeContext) {
      contextParts.push(overtimeContext)
    }
  }

  // Detectar preguntas sobre trabajadores, sueldos, salarios
  if (
    lowerQuestion.includes('trabajador') ||
    lowerQuestion.includes('empleado') ||
    lowerQuestion.includes('personal') ||
    lowerQuestion.includes('dotación') ||
    lowerQuestion.includes('dotacion') ||
    lowerQuestion.includes('ficha') ||
    lowerQuestion.includes('sueldo') ||
    lowerQuestion.includes('salario') ||
    lowerQuestion.includes('remuneración') ||
    lowerQuestion.includes('remuneracion') ||
    lowerQuestion.includes('más alto') ||
    lowerQuestion.includes('mas alto') ||
    lowerQuestion.includes('mayor sueldo') ||
    lowerQuestion.includes('menor sueldo') ||
    lowerQuestion.includes('promedio') ||
    lowerQuestion.includes('quien') ||
    lowerQuestion.includes('quién') ||
    lowerQuestion.includes('cual') ||
    lowerQuestion.includes('cuál') ||
    lowerQuestion.includes('ingresaron') ||
    lowerQuestion.includes('ingreso')
  ) {
    const employeesContext = await buildEmployeesContext(companyId, supabase, lowerQuestion)
    if (employeesContext) {
      contextParts.push(employeesContext)
    }
  }

  // Detectar preguntas sobre liquidaciones
  if (
    lowerQuestion.includes('liquidación') ||
    lowerQuestion.includes('liquidacion') ||
    lowerQuestion.includes('nómina') ||
    lowerQuestion.includes('nomina') ||
    lowerQuestion.includes('período') ||
    lowerQuestion.includes('periodo') ||
    lowerQuestion.includes('haberes') ||
    lowerQuestion.includes('imponibles') ||
    lowerQuestion.includes('no imponibles') ||
    lowerQuestion.includes('líquido') ||
    lowerQuestion.includes('liquido') ||
    lowerQuestion.includes('neto a pagar') ||
    lowerQuestion.includes('borrador') ||
    lowerQuestion.includes('emitida')
  ) {
    const payrollContext = await buildPayrollContext(companyId, supabase, lowerQuestion)
    if (payrollContext) {
      contextParts.push(payrollContext)
    }
  }

  // Detectar preguntas sobre vacaciones
  if (
    lowerQuestion.includes('vacación') ||
    lowerQuestion.includes('vacaciones') ||
    lowerQuestion.includes('días disponibles') ||
    lowerQuestion.includes('dias disponibles') ||
    lowerQuestion.includes('días de vacaciones') ||
    lowerQuestion.includes('dias de vacaciones') ||
    lowerQuestion.includes('acumulados') ||
    lowerQuestion.includes('disponibles') ||
    lowerQuestion.includes('pendientes') ||
    lowerQuestion.includes('solicitud de vacaciones')
  ) {
    const vacationContext = await buildVacationContext(companyId, supabase)
    if (vacationContext) {
      contextParts.push(vacationContext)
    }
  }

  // Detectar preguntas sobre cartas de amonestación
  if (
    lowerQuestion.includes('amonestación') ||
    lowerQuestion.includes('amonestacion') ||
    lowerQuestion.includes('carta de amonestación') ||
    lowerQuestion.includes('carta de amonestacion') ||
    lowerQuestion.includes('disciplinaria') ||
    lowerQuestion.includes('sanción') ||
    lowerQuestion.includes('sancion') ||
    lowerQuestion.includes('riohs') ||
    lowerQuestion.includes('reglamento interno')
  ) {
    const disciplinaryContext = await buildDisciplinaryActionsContext(companyId, supabase)
    if (disciplinaryContext) {
      contextParts.push(disciplinaryContext)
    }
  }

  // Detectar preguntas sobre licencias médicas
  if (
    lowerQuestion.includes('licencia médica') ||
    lowerQuestion.includes('licencia medica') ||
    lowerQuestion.includes('licencia') ||
    lowerQuestion.includes('enfermedad') ||
    lowerQuestion.includes('ausentismo') ||
    lowerQuestion.includes('días de licencia') ||
    lowerQuestion.includes('dias de licencia') ||
    lowerQuestion.includes('folio')
  ) {
    const medicalLeaveContext = await buildMedicalLeavesContext(companyId, supabase)
    if (medicalLeaveContext) {
      contextParts.push(medicalLeaveContext)
    }
  }

  // Detectar preguntas sobre contratos, cláusulas, horarios
  if (
    lowerQuestion.includes('contrato') ||
    lowerQuestion.includes('cláusula') ||
    lowerQuestion.includes('clausula') ||
    lowerQuestion.includes('horario') ||
    lowerQuestion.includes('jornada')
  ) {
    const contractContext = await buildContractContext(companyId, supabase)
    if (contractContext) {
      contextParts.push(contractContext)
    }
  }

  // Detectar preguntas sobre préstamos
  if (
    lowerQuestion.includes('préstamo') ||
    lowerQuestion.includes('prestamo') ||
    lowerQuestion.includes('cuota') ||
    lowerQuestion.includes('pago préstamo') ||
    lowerQuestion.includes('pago prestamo') ||
    lowerQuestion.includes('saldo pendiente') ||
    lowerQuestion.includes('vigente')
  ) {
    const loanContext = await buildLoanContext(companyId, supabase)
    if (loanContext) {
      contextParts.push(loanContext)
    }
  }

  // Detectar preguntas sobre anticipos
  if (
    lowerQuestion.includes('anticipo') ||
    lowerQuestion.includes('quincena') ||
    lowerQuestion.includes('firmado') ||
    lowerQuestion.includes('descontado')
  ) {
    const advanceContext = await buildAdvanceContext(companyId, supabase)
    if (advanceContext) {
      contextParts.push(advanceContext)
    }
  }

  // Detectar preguntas sobre centros de costo y análisis organizacional
  if (
    lowerQuestion.includes('centro de costo') ||
    lowerQuestion.includes('centro de costos') ||
    lowerQuestion.includes('centros de costo') ||
    lowerQuestion.includes('centros de costos') ||
    lowerQuestion.includes('masa salarial') ||
    lowerQuestion.includes('distribución') ||
    lowerQuestion.includes('distribucion') ||
    lowerQuestion.includes('organizacional') ||
    lowerQuestion.includes('estructura') ||
    lowerQuestion.includes('por centro')
  ) {
    const costCenterContext = await buildCostCenterContext(companyId, supabase, lowerQuestion)
    if (costCenterContext) {
      contextParts.push(costCenterContext)
    }
  }

  // Detectar preguntas sobre AFP, salud e imposiciones legales
  if (
    lowerQuestion.includes('afp') ||
    lowerQuestion.includes('fonasa') ||
    lowerQuestion.includes('isapre') ||
    lowerQuestion.includes('salud') ||
    lowerQuestion.includes('previsional') ||
    lowerQuestion.includes('seguro de cesantía') ||
    lowerQuestion.includes('seguro de cesantia') ||
    lowerQuestion.includes('afc') ||
    lowerQuestion.includes('imposiciones') ||
    lowerQuestion.includes('descuentos legales') ||
    lowerQuestion.includes('cotización') ||
    lowerQuestion.includes('cotizacion')
  ) {
    const afpHealthContext = await buildAFPHealthContext(companyId, supabase)
    if (afpHealthContext) {
      contextParts.push(afpHealthContext)
    }
  }

  // Detectar preguntas sobre renuncias, despidos y estados laborales
  if (
    lowerQuestion.includes('renuncia') ||
    lowerQuestion.includes('despido') ||
    lowerQuestion.includes('rotación') ||
    lowerQuestion.includes('rotacion') ||
    lowerQuestion.includes('término de contrato') ||
    lowerQuestion.includes('termino de contrato') ||
    lowerQuestion.includes('vencido') ||
    lowerQuestion.includes('antigüedad') ||
    lowerQuestion.includes('antiguedad') ||
    lowerQuestion.includes('año en la empresa') ||
    lowerQuestion.includes('ano en la empresa')
  ) {
    const employmentStatusContext = await buildEmploymentStatusContext(companyId, supabase)
    if (employmentStatusContext) {
      contextParts.push(employmentStatusContext)
    }
  }

  // Detectar preguntas sobre cumplimiento legal
  if (
    lowerQuestion.includes('cumplimiento') ||
    lowerQuestion.includes('legal') ||
    lowerQuestion.includes('ley laboral') ||
    lowerQuestion.includes('normativa') ||
    lowerQuestion.includes('sueldo mínimo') ||
    lowerQuestion.includes('sueldo minimo') ||
    lowerQuestion.includes('gratificación') ||
    lowerQuestion.includes('gratificacion') ||
    lowerQuestion.includes('riesgo') ||
    lowerQuestion.includes('incumplimiento') ||
    lowerQuestion.includes('brecha')
  ) {
    const complianceContext = await buildComplianceContext(companyId, supabase)
    if (complianceContext) {
      contextParts.push(complianceContext)
    }
  }

  // Detectar preguntas sobre finiquitos
  if (
    lowerQuestion.includes('finiquito') ||
    lowerQuestion.includes('término de contrato') ||
    lowerQuestion.includes('termino de contrato') ||
    lowerQuestion.includes('antigüedad') ||
    lowerQuestion.includes('antiguedad') ||
    lowerQuestion.includes('años de servicio') ||
    lowerQuestion.includes('anos de servicio') ||
    lowerQuestion.includes('indemnización') ||
    lowerQuestion.includes('indemnizacion') ||
    lowerQuestion.includes('simular finiquito') ||
    lowerQuestion.includes('simula el finiquito') ||
    lowerQuestion.includes('cálculo de finiquito') ||
    lowerQuestion.includes('calculo de finiquito') ||
    lowerQuestion.includes('feriado proporcional') ||
    lowerQuestion.includes('vacaciones pendientes') ||
    lowerQuestion.includes('causal de término') ||
    lowerQuestion.includes('causal de termino') ||
    lowerQuestion.includes('necesidades de la empresa') ||
    lowerQuestion.includes('renuncia') ||
    lowerQuestion.includes('despido')
  ) {
    const settlementContext = await buildSettlementContext(companyId, supabase, lowerQuestion)
    if (settlementContext) {
      contextParts.push(settlementContext)
    }
  }

  // Detectar preguntas sobre trabajador específico por RUT o nombre
  const rutMatch = lowerQuestion.match(/\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]/)
  const nameMatch = lowerQuestion.match(/(?:trabajador|empleado|personal)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i)
  if (rutMatch || nameMatch) {
    const specificEmployeeContext = await buildSpecificEmployeeContext(companyId, supabase, lowerQuestion, rutMatch?.[0], nameMatch?.[1])
    if (specificEmployeeContext) {
      contextParts.push(specificEmployeeContext)
    }
  }

  // Detectar preguntas sobre permisos
  if (
    lowerQuestion.includes('permiso') ||
    lowerQuestion.includes('permisos')
  ) {
    const permissionContext = await buildPermissionContext(companyId, supabase)
    if (permissionContext) {
      contextParts.push(permissionContext)
    }
  }

  // Detectar preguntas sobre bonos
  if (
    lowerQuestion.includes('bono') ||
    lowerQuestion.includes('bonos') ||
    lowerQuestion.includes('bonificación')
  ) {
    const bonusContext = await buildBonusContext(companyId, supabase)
    if (bonusContext) {
      contextParts.push(bonusContext)
    }
  }

  return contextParts.join('\n\n')
}

/**
 * Construye contexto sobre pactos de horas extra
 */
async function buildOvertimePactsContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    // Obtener todos los trabajadores activos
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, rut, status')
      .eq('company_id', companyId)
      .in('status', ['active', 'licencia_medica'])

    if (!employees || employees.length === 0) {
      return 'No hay trabajadores activos en la empresa.'
    }

    // Obtener pactos activos y vigentes
    const today = new Date().toISOString().split('T')[0]
    const { data: activePacts } = await supabase
      .from('overtime_pacts')
      .select(`
        id, 
        employee_id, 
        start_date, 
        end_date, 
        status,
        employees (full_name, rut)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .gte('end_date', today)

    const employeesWithPact = new Set(activePacts?.map((pact: any) => pact.employee_id) || [])
    const employeesWithoutPact = (employees || []).filter((emp: any) => !employeesWithPact.has(emp.id))

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN SOBRE PACTOS DE HORAS EXTRA ===')
    contextParts.push(`\nTotal de trabajadores activos: ${employees.length}`)
    contextParts.push(`Trabajadores con pacto activo: ${activePacts?.length || 0}`)
    contextParts.push(`Trabajadores SIN pacto activo: ${employeesWithoutPact.length}`)

    if (employeesWithoutPact.length > 0) {
      contextParts.push('\n--- TRABAJADORES SIN PACTO ACTIVO ---')
      employeesWithoutPact.forEach((emp: any) => {
        contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut})`)
      })
    }

    if (activePacts && activePacts.length > 0) {
      contextParts.push('\n--- TRABAJADORES CON PACTO ACTIVO ---')
      activePacts.forEach((pact: any) => {
        const employee = pact.employees
        const endDate = new Date(pact.end_date)
        const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        contextParts.push(
          `- ${employee?.full_name || 'N/A'} (RUT: ${employee?.rut || 'N/A'}) - Vence en ${daysUntilExpiry} días (${pact.end_date})`
        )
      })
    }

    // Obtener pactos próximos a vencer (próximos 30 días)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const { data: expiringPacts } = await supabase
      .from('overtime_pacts')
      .select(`
        id, 
        employee_id, 
        end_date,
        employees (full_name, rut)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .gte('end_date', today)
      .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0])

    if (expiringPacts && expiringPacts.length > 0) {
      contextParts.push('\n--- PACTOS PRÓXIMOS A VENCER (próximos 30 días) ---')
      expiringPacts.forEach((pact: any) => {
        const employee = pact.employees
        contextParts.push(`- ${employee?.full_name || 'N/A'} - Vence el ${pact.end_date}`)
      })
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de pactos:', error)
    return ''
  }
}

/**
 * Construye contexto sobre trabajadores
 */
async function buildEmployeesContext(
  companyId: string,
  supabase: SupabaseClientType,
  question: string
): Promise<string> {
  try {
    // Obtener información completa de trabajadores incluyendo sueldos
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, rut, position, status, hire_date, base_salary, transportation_allowance, meal_allowance')
      .eq('company_id', companyId)
      .order('full_name', { ascending: true })

    if (!employees || employees.length === 0) {
      return 'No hay trabajadores registrados en la empresa.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN COMPLETA DE TRABAJADORES ===')
    contextParts.push(`\nTotal de trabajadores: ${employees.length}`)

    // Agrupar por estado
    const byStatus = employees.reduce((acc: any, emp: any) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1
      return acc
    }, {})

    contextParts.push('\n--- Distribución por Estado ---')
    Object.entries(byStatus).forEach(([status, count]) => {
      const statusLabel =
        status === 'active' ? 'Activos' :
        status === 'licencia_medica' ? 'Con Licencia Médica' :
        status === 'inactive' ? 'Inactivos' :
        status === 'renuncia' ? 'Renuncia' :
        status === 'despido' ? 'Despido' : status
      contextParts.push(`- ${statusLabel}: ${count}`)
    })

    // Si pregunta sobre sueldos, incluir información detallada adicional
    const isSalaryQuestion = question.includes('sueldo') || 
                             question.includes('salario') || 
                             question.includes('remuneración') ||
                             question.includes('más alto') ||
                             question.includes('mayor') ||
                             question.includes('menor') ||
                             question.includes('quien') ||
                             question.includes('quién')

    if (isSalaryQuestion) {
      // Filtrar solo trabajadores activos para preguntas de sueldo
      const activeEmployees = employees.filter((e: any) => e.status === 'active')
      
      if (activeEmployees.length > 0) {
        contextParts.push('\n--- INFORMACIÓN DETALLADA DE SUELDOS ---')
        
        // Ordenar por sueldo base descendente
        const sortedBySalary = [...activeEmployees].sort((a: any, b: any) => {
          const salaryA = a.base_salary || 0
          const salaryB = b.base_salary || 0
          return salaryB - salaryA
        })

        sortedBySalary.forEach((emp: any) => {
          const salary = emp.base_salary ? `$${emp.base_salary.toLocaleString('es-CL')}` : 'No especificado'
          const transport = emp.transportation_allowance ? ` | Movilización: $${emp.transportation_allowance.toLocaleString('es-CL')}` : ''
          const meal = emp.meal_allowance ? ` | Colación: $${emp.meal_allowance.toLocaleString('es-CL')}` : ''
          contextParts.push(
            `- ${emp.full_name} (RUT: ${emp.rut}) - Cargo: ${emp.position || 'Sin cargo'} - Sueldo Base: ${salary}${transport}${meal}`
          )
        })

        // Información adicional sobre sueldos
        const salaries = activeEmployees
          .map((e: any) => e.base_salary || 0)
          .filter((s: number) => s > 0)
        
        if (salaries.length > 0) {
          const maxSalary = Math.max(...salaries)
          const minSalary = Math.min(...salaries)
          const avgSalary = salaries.reduce((a: number, b: number) => a + b, 0) / salaries.length
          const maxEmployee: any = activeEmployees.find((e: any) => e.base_salary === maxSalary)
          const minEmployee: any = activeEmployees.find((e: any) => e.base_salary === minSalary)

          contextParts.push('\n--- ESTADÍSTICAS DE SUELDOS ---')
          contextParts.push(`- Sueldo más alto: $${maxSalary.toLocaleString('es-CL')} - ${maxEmployee?.full_name || 'N/A'} (RUT: ${maxEmployee?.rut || 'N/A'})`)
          contextParts.push(`- Sueldo más bajo: $${minSalary.toLocaleString('es-CL')} - ${minEmployee?.full_name || 'N/A'} (RUT: ${minEmployee?.rut || 'N/A'})`)
          contextParts.push(`- Sueldo promedio: $${Math.round(avgSalary).toLocaleString('es-CL')}`)
        }
      }
    } else if (question.includes('activo')) {
      // Si pregunta específicamente por trabajadores activos (sin mencionar sueldo)
      const activeEmployees = employees.filter((e: any) => e.status === 'active')
      if (activeEmployees.length > 0) {
        contextParts.push('\n--- TRABAJADORES ACTIVOS ---')
        activeEmployees.slice(0, 20).forEach((emp: any) => {
          contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}) - ${emp.position || 'Sin cargo'}`)
        })
        if (activeEmployees.length > 20) {
          contextParts.push(`\n... y ${activeEmployees.length - 20} trabajadores más`)
        }
      }
    }
    // Nota: La lista completa de trabajadores activos ya está en el contexto base

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de trabajadores:', error)
    return ''
  }
}

/**
 * Construye contexto sobre liquidaciones
 */
async function buildPayrollContext(
  companyId: string,
  supabase: SupabaseClientType,
  question: string
): Promise<string> {
  try {
    // Obtener períodos recientes
    const { data: recentPeriods } = await supabase
      .from('payroll_periods')
      .select('id, year, month, payroll_slips(id, employee_id, net_pay, status, employees(full_name))')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(3)

    if (!recentPeriods || recentPeriods.length === 0) {
      return 'No hay períodos de liquidación registrados.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DE LIQUIDACIONES ===')

    recentPeriods.forEach((period: any) => {
      const slips = period.payroll_slips || []
      const totalNetPay = slips.reduce((sum: number, slip: any) => sum + (slip.net_pay || 0), 0)
      const issuedSlips = slips.filter((s: any) => s.status === 'issued')

      contextParts.push(
        `\n--- Período ${period.month}/${period.year} ---`
      )
      contextParts.push(`- Total de liquidaciones: ${slips.length}`)
      contextParts.push(`- Liquidaciones emitidas: ${issuedSlips.length}`)
      contextParts.push(`- Total líquido a pagar: $${totalNetPay.toLocaleString('es-CL')}`)
    })

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de liquidaciones:', error)
    return ''
  }
}

/**
 * Construye contexto sobre vacaciones (incluyendo días disponibles)
 */
async function buildVacationContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    // Obtener trabajadores de la empresa con su fecha de ingreso
    // IMPORTANTE: Solo incluir trabajadores activos o con licencia médica
    // Excluir renuncia, despido e inactivos
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id, full_name, rut, hire_date, status')
      .eq('company_id', companyId)
      .in('status', ['active', 'licencia_medica']) // Solo activos y con licencia médica

    if (!companyEmployees || companyEmployees.length === 0) {
      return 'No hay trabajadores activos en la empresa.'
    }

    const employeeIds = companyEmployees.map((e: any) => e.id)
    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN COMPLETA DE VACACIONES ===')

    // Obtener períodos de vacaciones con días disponibles
    const { data: vacationPeriods } = await supabase
      .from('vacation_periods')
      .select(`
        id,
        employee_id,
        period_year,
        accumulated_days,
        used_days,
        available_days,
        employees (full_name, rut, hire_date)
      `)
      .in('employee_id', employeeIds)
      .order('period_year', { ascending: false })

    // Obtener solicitudes de vacaciones recientes
    const { data: vacations } = await supabase
      .from('vacations')
      .select('id, employee_id, start_date, end_date, days_count, status, employees(full_name, rut)')
      .in('employee_id', employeeIds)
      .order('start_date', { ascending: false })
      .limit(30)

    // Calcular días disponibles totales por trabajador
    const vacationSummary: Record<string, {
      full_name: string
      rut: string
      totalAccumulated: number
      totalUsed: number
      totalAvailable: number
      periods: any[]
    }> = {}

    if (vacationPeriods && vacationPeriods.length > 0) {
      vacationPeriods.forEach((period: any) => {
        const empId = period.employee_id
        const emp = period.employees
        
        if (!vacationSummary[empId]) {
          vacationSummary[empId] = {
            full_name: emp?.full_name || 'N/A',
            rut: emp?.rut || 'N/A',
            totalAccumulated: 0,
            totalUsed: 0,
            totalAvailable: 0,
            periods: []
          }
        }
        
        vacationSummary[empId].totalAccumulated += parseFloat(period.accumulated_days || 0)
        vacationSummary[empId].totalUsed += parseFloat(period.used_days || 0)
        vacationSummary[empId].totalAvailable += parseFloat(period.available_days || 0)
        vacationSummary[empId].periods.push(period)
      })
    }

    // Agregar trabajadores sin períodos registrados (calcular manualmente)
    // Solo para trabajadores activos (ya filtrados arriba)
    companyEmployees.forEach((emp: any) => {
      if (!vacationSummary[emp.id] && emp.hire_date && (emp.status === 'active' || emp.status === 'licencia_medica')) {
        // Calcular días acumulados basado en fecha de ingreso (1.25 días por mes)
        const hireDate = new Date(emp.hire_date)
        const today = new Date()
        const monthsWorked = (today.getFullYear() - hireDate.getFullYear()) * 12 + 
                           (today.getMonth() - hireDate.getMonth())
        const accumulated = monthsWorked * 1.25
        
        // Obtener días usados de solicitudes aprobadas/tomadas
        const usedDays = vacations?.filter((v: any) => 
          v.employee_id === emp.id && 
          (v.status === 'aprobada' || v.status === 'tomada')
        ).reduce((sum: number, v: any) => sum + (v.days_count || 0), 0) || 0
        
        vacationSummary[emp.id] = {
          full_name: emp.full_name,
          rut: emp.rut,
          totalAccumulated: accumulated,
          totalUsed: usedDays,
          totalAvailable: accumulated - usedDays,
          periods: []
        }
      }
    })

    // Ordenar por días disponibles (mayor a menor)
    const sortedByAvailable = Object.values(vacationSummary)
      .sort((a, b) => b.totalAvailable - a.totalAvailable)

    if (sortedByAvailable.length > 0) {
      contextParts.push('\n--- DÍAS DISPONIBLES DE VACACIONES POR TRABAJADOR ---')
      sortedByAvailable.forEach((summary) => {
        contextParts.push(
          `- ${summary.full_name} (RUT: ${summary.rut}) - Acumulados: ${summary.totalAccumulated.toFixed(2)} días - Usados: ${summary.totalUsed} días - Disponibles: ${summary.totalAvailable.toFixed(2)} días`
        )
      })
    }

    // Información de solicitudes recientes
    if (vacations && vacations.length > 0) {
      const byStatus = vacations.reduce((acc: any, vac: any) => {
        acc[vac.status] = (acc[vac.status] || 0) + 1
        return acc
      }, {})

      contextParts.push('\n--- SOLICITUDES DE VACACIONES RECIENTES ---')
      contextParts.push(`Total de registros: ${vacations.length}`)
      
      Object.entries(byStatus).forEach(([status, count]) => {
        const statusLabel =
          status === 'solicitada' ? 'Solicitadas' :
          status === 'aprobada' ? 'Aprobadas' :
          status === 'tomada' ? 'Tomadas' :
          status === 'rechazada' ? 'Rechazadas' :
          status === 'cancelada' ? 'Canceladas' : status
        contextParts.push(`- ${statusLabel}: ${count}`)
      })

      // Listar solicitudes pendientes de aprobación
      const pending = vacations.filter((v: any) => v.status === 'solicitada' || v.status === 'aprobada')
      if (pending.length > 0) {
        contextParts.push('\n--- SOLICITUDES PENDIENTES/APROBADAS ---')
        pending.slice(0, 10).forEach((vac: any) => {
          const emp = vac.employees
          const startDate = new Date(vac.start_date).toLocaleDateString('es-CL')
          const endDate = new Date(vac.end_date).toLocaleDateString('es-CL')
          contextParts.push(
            `- ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - ${vac.days_count} días - Del ${startDate} al ${endDate} - Estado: ${vac.status}`
          )
        })
      }
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de vacaciones:', error)
    return ''
  }
}

/**
 * Construye contexto sobre licencias médicas
 */
async function buildMedicalLeavesContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    // Obtener IDs de empleados de la empresa primero
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)

    if (!companyEmployees || companyEmployees.length === 0) {
      return 'No hay trabajadores en la empresa.'
    }

    const employeeIds = companyEmployees.map((e: any) => e.id)

    // Obtener todas las licencias activas y filtrar por fecha en JavaScript
    const { data: allActiveLeaves, error: leavesError } = await supabase
      .from('medical_leaves')
      .select(`
        id, 
        employee_id, 
        start_date, 
        end_date, 
        days_count, 
        folio_number, 
        is_active,
        employees (full_name, rut, position)
      `)
      .in('employee_id', employeeIds)
      .eq('is_active', true)
    
    if (leavesError) {
      console.error('[AI Context] Error al obtener licencias médicas:', leavesError)
    }
    
    console.log(`[AI Context] Licencias activas encontradas (sin filtrar fecha): ${allActiveLeaves?.length || 0}`)
    
    // Filtrar las que están activas hoy (start_date <= today <= end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const activeLeaves = (allActiveLeaves || []).filter((leave: any) => {
      const startDate = new Date(leave.start_date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(leave.end_date)
      endDate.setHours(0, 0, 0, 0)
      const isActive = startDate <= today && endDate >= today
      if (!isActive && allActiveLeaves && allActiveLeaves.length > 0) {
        console.log(`[AI Context] Licencia filtrada: ${leave.employees?.full_name} - Del ${leave.start_date} al ${leave.end_date} - Hoy: ${today.toISOString().split('T')[0]}`)
      }
      return isActive
    })
    
    console.log(`[AI Context] Licencias activas HOY: ${activeLeaves.length}`)

    if (!activeLeaves || activeLeaves.length === 0) {
      return 'No hay licencias médicas activas actualmente.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DE LICENCIAS MÉDICAS ===')
    contextParts.push(`\nTotal de licencias médicas activas: ${activeLeaves.length}`)

    contextParts.push('\n--- TRABAJADORES CON LICENCIA MÉDICA ACTIVA (DETALLE COMPLETO) ---')
    activeLeaves.forEach((leave: any) => {
      const employee = leave.employees
      const daysRemaining = Math.ceil(
        (new Date(leave.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      const startDate = new Date(leave.start_date).toLocaleDateString('es-CL')
      const endDate = new Date(leave.end_date).toLocaleDateString('es-CL')
      contextParts.push(
        `- ${employee?.full_name || 'N/A'} (RUT: ${employee?.rut || 'N/A'}) - Cargo: ${employee?.position || 'N/A'} - Folio: ${leave.folio_number || 'N/A'} - ${leave.days_count} días totales - Período: Del ${startDate} al ${endDate} - Días restantes: ${daysRemaining} días`
      )
    })

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de licencias médicas:', error)
    return ''
  }
}

/**
 * Construye contexto sobre cartas de amonestación (acciones disciplinarias)
 */
async function buildDisciplinaryActionsContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    // Obtener todas las cartas de amonestación de la empresa
    const { data: disciplinaryActions } = await supabase
      .from('disciplinary_actions')
      .select(`
        id,
        employee_id,
        type,
        status,
        incident_date,
        location,
        site_client,
        facts,
        evidence,
        witnesses,
        issued_at,
        acknowledged_at,
        ack_method,
        notes,
        riohs_rules (code, title, description),
        employees (full_name, rut, position)
      `)
      .eq('company_id', companyId)
      .order('incident_date', { ascending: false })
      .limit(50)

    if (!disciplinaryActions || disciplinaryActions.length === 0) {
      return 'No hay cartas de amonestación registradas.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DE CARTAS DE AMONESTACIÓN ===')
    contextParts.push(`\nTotal de cartas registradas: ${disciplinaryActions.length}`)

    // Agrupar por tipo
    const byType = disciplinaryActions.reduce((acc: any, action: any) => {
      acc[action.type] = (acc[action.type] || 0) + 1
      return acc
    }, {})

    contextParts.push('\n--- Distribución por Tipo ---')
    Object.entries(byType).forEach(([type, count]) => {
      const typeLabel = type === 'verbal' ? 'Verbales' : type === 'written' ? 'Escritas' : type
      contextParts.push(`- ${typeLabel}: ${count}`)
    })

    // Agrupar por estado
    const byStatus = disciplinaryActions.reduce((acc: any, action: any) => {
      acc[action.status] = (acc[action.status] || 0) + 1
      return acc
    }, {})

    contextParts.push('\n--- Distribución por Estado ---')
    Object.entries(byStatus).forEach(([status, count]) => {
      const statusLabel =
        status === 'draft' ? 'Borrador' :
        status === 'under_review' ? 'En Revisión' :
        status === 'approved' ? 'Aprobada' :
        status === 'issued' ? 'Emitida' :
        status === 'acknowledged' ? 'Acusada Recibo' :
        status === 'void' ? 'Anulada' : status
      contextParts.push(`- ${statusLabel}: ${count}`)
    })

    // Listar cartas recientes con detalles
    contextParts.push('\n--- CARTAS DE AMONESTACIÓN RECIENTES (DETALLE COMPLETO) ---')
    disciplinaryActions.slice(0, 20).forEach((action: any) => {
      const emp = action.employees
      const rule = action.riohs_rules
      const incidentDate = new Date(action.incident_date).toLocaleDateString('es-CL')
      const typeLabel = action.type === 'verbal' ? 'Verbal' : 'Escrita'
      const statusLabel =
        action.status === 'draft' ? 'Borrador' :
        action.status === 'under_review' ? 'En Revisión' :
        action.status === 'approved' ? 'Aprobada' :
        action.status === 'issued' ? 'Emitida' :
        action.status === 'acknowledged' ? 'Acusada Recibo' :
        action.status === 'void' ? 'Anulada' : action.status

      contextParts.push(`\n- Trabajador: ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Cargo: ${emp?.position || 'N/A'}`)
      contextParts.push(`  Tipo: ${typeLabel} - Estado: ${statusLabel}`)
      contextParts.push(`  Fecha del incidente: ${incidentDate}`)
      if (action.location) contextParts.push(`  Lugar: ${action.location}`)
      if (action.site_client) contextParts.push(`  Faena/Cliente: ${action.site_client}`)
      if (rule) contextParts.push(`  Regla RIOHS: ${rule.code} - ${rule.title}`)
      if (action.facts) {
        const factsPreview = action.facts.length > 200 
          ? action.facts.substring(0, 200) + '...' 
          : action.facts
        contextParts.push(`  Hechos: ${factsPreview}`)
      }
      if (action.witnesses && Array.isArray(action.witnesses) && action.witnesses.length > 0) {
        contextParts.push(`  Testigos: ${action.witnesses.length} testigo(s) registrado(s)`)
      }
      if (action.evidence && Array.isArray(action.evidence) && action.evidence.length > 0) {
        contextParts.push(`  Evidencia: ${action.evidence.length} elemento(s) de evidencia`)
      }
      if (action.issued_at) {
        const issuedDate = new Date(action.issued_at).toLocaleDateString('es-CL')
        contextParts.push(`  Fecha de emisión: ${issuedDate}`)
      }
      if (action.acknowledged_at) {
        const ackDate = new Date(action.acknowledged_at).toLocaleDateString('es-CL')
        contextParts.push(`  Acusada recibo: ${ackDate} (${action.ack_method || 'N/A'})`)
      }
    })

    // Resumen por trabajador (quién tiene más amonestaciones)
    const byEmployee: Record<string, number> = {}
    disciplinaryActions.forEach((action: any) => {
      const empId = action.employee_id
      byEmployee[empId] = (byEmployee[empId] || 0) + 1
    })

    const sortedByCount = Object.entries(byEmployee)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    if (sortedByCount.length > 0) {
      contextParts.push('\n--- TRABAJADORES CON MÁS AMONESTACIONES ---')
      sortedByCount.forEach(([empId, count]) => {
        const action: any = disciplinaryActions.find((a: any) => a.employee_id === empId)
        const emp: any = action?.employees
        if (emp) {
          contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}): ${count} amonestación(es)`)
        }
      })
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de cartas de amonestación:', error)
    return ''
  }
}

/**
 * Construye contexto sobre centros de costo y análisis organizacional
 */
async function buildCostCenterContext(
  companyId: string,
  supabase: SupabaseClientType,
  question: string
): Promise<string> {
  try {
    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DE CENTROS DE COSTO Y ANÁLISIS ORGANIZACIONAL ===')

    // Obtener todos los centros de costo
    const { data: costCenters } = await supabase
      .from('cost_centers')
      .select('id, code, name, description, status')
      .eq('company_id', companyId)
      .order('code', { ascending: true })

    if (!costCenters || costCenters.length === 0) {
      return 'No hay centros de costo registrados.'
    }

    contextParts.push(`\nTotal de centros de costo: ${costCenters.length}`)
    
    const activeCCs = costCenters.filter((cc: any) => cc.status === 'active')
    contextParts.push(`Centros de costo activos: ${activeCCs.length}`)

    // Obtener trabajadores por centro de costo
    const { data: employees } = await supabase
      .from('employees')
      .select(`
        id,
        full_name,
        rut,
        position,
        status,
        base_salary,
        transportation_allowance,
        meal_allowance,
        hire_date,
        contract_type,
        cost_centers (code, name)
      `)
      .eq('company_id', companyId)

    // Agrupar por centro de costo
    const byCostCenter: Record<string, any[]> = {}
    employees?.forEach((emp: any) => {
      const ccCode = emp.cost_centers?.code || 'Sin asignar'
      if (!byCostCenter[ccCode]) {
        byCostCenter[ccCode] = []
      }
      byCostCenter[ccCode].push(emp)
    })

    contextParts.push('\n--- TRABAJADORES POR CENTRO DE COSTO ---')
    Object.entries(byCostCenter).forEach(([ccCode, emps]) => {
      const activeEmps = emps.filter((e: any) => e.status === 'active')
      const totalSalary = activeEmps.reduce((sum: number, e: any) => sum + (e.base_salary || 0), 0)
      const avgSalary = activeEmps.length > 0 ? totalSalary / activeEmps.length : 0
      
      contextParts.push(`\n${ccCode}:`)
      contextParts.push(`  - Total trabajadores: ${emps.length} (${activeEmps.length} activos)`)
      contextParts.push(`  - Masa salarial (sueldos base): $${totalSalary.toLocaleString('es-CL')}`)
      contextParts.push(`  - Sueldo promedio: $${avgSalary.toLocaleString('es-CL')}`)
      
      // Agrupar por cargo
      const byPosition: Record<string, number> = {}
      activeEmps.forEach((emp: any) => {
        const pos = emp.position || 'Sin cargo'
        byPosition[pos] = (byPosition[pos] || 0) + 1
      })
      
      if (Object.keys(byPosition).length > 0) {
        contextParts.push(`  - Cargos:`)
        Object.entries(byPosition).forEach(([pos, count]) => {
          contextParts.push(`    * ${pos}: ${count} persona(s)`)
        })
      }

      // Tipos de contrato
      const byContractType: Record<string, number> = {}
      activeEmps.forEach((emp: any) => {
        const type = emp.contract_type || 'No especificado'
        byContractType[type] = (byContractType[type] || 0) + 1
      })
      
      if (Object.keys(byContractType).length > 0) {
        contextParts.push(`  - Tipos de contrato:`)
        Object.entries(byContractType).forEach(([type, count]) => {
          contextParts.push(`    * ${type}: ${count}`)
        })
      }
    })

    // Si pregunta sobre masa salarial, incluir detalles de liquidaciones recientes
    if (question.includes('masa salarial') || question.includes('neto a pagar')) {
      const { data: recentPeriod } = await supabase
        .from('payroll_periods')
        .select('id, year, month')
        .eq('company_id', companyId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentPeriod) {
        const period = recentPeriod as { id: string; year: number; month: number }
        const { data: slips } = await supabase
          .from('payroll_slips')
          .select(`
            net_pay,
            employees (cost_centers (code))
          `)
          .eq('period_id', period.id)
          .eq('status', 'issued')

        if (slips && slips.length > 0) {
          const netPayByCC: Record<string, number> = {}
          slips.forEach((slip: any) => {
            const ccCode = slip.employees?.cost_centers?.code || 'Sin asignar'
            netPayByCC[ccCode] = (netPayByCC[ccCode] || 0) + (slip.net_pay || 0)
          })

          contextParts.push(`\n--- MASA SALARIAL NETO A PAGAR (Período ${period.month}/${period.year}) ---`)
          Object.entries(netPayByCC)
            .sort(([, a], [, b]) => b - a)
            .forEach(([ccCode, total]) => {
              contextParts.push(`- ${ccCode}: $${total.toLocaleString('es-CL')}`)
            })
        }
      }
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de centros de costo:', error)
    return ''
  }
}

/**
 * Construye contexto sobre AFP, salud e imposiciones legales
 */
async function buildAFPHealthContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DE AFP, SALUD E IMPOSICIONES LEGALES ===')

    // Obtener trabajadores con información previsional
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, rut, afp, health_system, health_plan, health_plan_percentage, status')
      .eq('company_id', companyId)

    if (!employees || employees.length === 0) {
      return 'No hay trabajadores registrados.'
    }

    const activeEmployees = employees.filter((e: any) => e.status === 'active')

    // Distribución por AFP
    const byAFP: Record<string, number> = {}
    const byHealthSystem: Record<string, number> = {}
    const missingAFP: any[] = []
    const missingHealth: any[] = []

    activeEmployees.forEach((emp: any) => {
      if (emp.afp) {
        byAFP[emp.afp] = (byAFP[emp.afp] || 0) + 1
      } else {
        missingAFP.push(emp)
      }

      if (emp.health_system) {
        byHealthSystem[emp.health_system] = (byHealthSystem[emp.health_system] || 0) + 1
      } else {
        missingHealth.push(emp)
      }
    })

    contextParts.push(`\nTotal de trabajadores activos: ${activeEmployees.length}`)

    contextParts.push('\n--- DISTRIBUCIÓN POR AFP ---')
    if (Object.keys(byAFP).length > 0) {
      Object.entries(byAFP)
        .sort(([, a], [, b]) => b - a)
        .forEach(([afp, count]) => {
          contextParts.push(`- ${afp}: ${count} trabajador(es)`)
        })
    } else {
      contextParts.push('- No hay trabajadores con AFP registrada')
    }

    if (missingAFP.length > 0) {
      contextParts.push(`\n⚠️ Trabajadores SIN AFP registrada: ${missingAFP.length}`)
      missingAFP.slice(0, 5).forEach((emp: any) => {
        contextParts.push(`  - ${emp.full_name} (RUT: ${emp.rut})`)
      })
    }

    contextParts.push('\n--- DISTRIBUCIÓN POR SISTEMA DE SALUD ---')
    if (Object.keys(byHealthSystem).length > 0) {
      Object.entries(byHealthSystem)
        .sort(([, a], [, b]) => b - a)
        .forEach(([system, count]) => {
          contextParts.push(`- ${system}: ${count} trabajador(es)`)
        })
    } else {
      contextParts.push('- No hay trabajadores con sistema de salud registrado')
    }

    if (missingHealth.length > 0) {
      contextParts.push(`\n⚠️ Trabajadores SIN sistema de salud registrado: ${missingHealth.length}`)
      missingHealth.slice(0, 5).forEach((emp: any) => {
        contextParts.push(`  - ${emp.full_name} (RUT: ${emp.rut})`)
      })
    }

    // Información de ISAPRE
    const isapreEmployees = activeEmployees.filter((e: any) => e.health_system === 'ISAPRE')
    if (isapreEmployees.length > 0) {
      contextParts.push('\n--- TRABAJADORES CON ISAPRE (Detalle de Planes) ---')
      isapreEmployees.forEach((emp: any) => {
        const planInfo = emp.health_plan 
          ? `Plan: ${emp.health_plan}${emp.health_plan_percentage ? ` (${emp.health_plan_percentage} UF)` : ''}`
          : 'Plan no especificado'
        contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}): ${planInfo}`)
      })
    }

    // Descuentos legales de liquidaciones recientes
    const { data: recentPeriod } = await supabase
      .from('payroll_periods')
      .select('id, year, month')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentPeriod) {
      const period = recentPeriod as { id: string; year: number; month: number }
      const { data: slips } = await supabase
        .from('payroll_slips')
        .select(`
          id,
          employees (full_name, rut, afp, health_system),
          payroll_items (category, description, amount, type)
        `)
        .eq('period_id', period.id)
        .eq('status', 'issued')

      if (slips && slips.length > 0) {
        let totalAFP = 0
        let totalHealth = 0
        let totalAFC = 0
        let totalTax = 0

        slips.forEach((slip: any) => {
          slip.payroll_items?.forEach((item: any) => {
            if (item.type === 'deduction') {
              if (item.category === 'afp' || item.description?.toLowerCase().includes('afp')) {
                totalAFP += parseFloat(item.amount || 0)
              } else if (item.category === 'salud' || item.description?.toLowerCase().includes('fonasa') || item.description?.toLowerCase().includes('isapre')) {
                totalHealth += parseFloat(item.amount || 0)
              } else if (item.category === 'afc' || item.description?.toLowerCase().includes('cesantía') || item.description?.toLowerCase().includes('cesantia')) {
                totalAFC += parseFloat(item.amount || 0)
              } else if (item.category === 'impuesto' || item.description?.toLowerCase().includes('impuesto único')) {
                totalTax += parseFloat(item.amount || 0)
              }
            }
          })
        })

        contextParts.push(`\n--- DESCUENTOS LEGALES (Período ${period.month}/${period.year}) ---`)
        contextParts.push(`- AFP: $${totalAFP.toLocaleString('es-CL')}`)
        contextParts.push(`- Salud (FONASA/ISAPRE): $${totalHealth.toLocaleString('es-CL')}`)
        contextParts.push(`- Seguro de Cesantía (AFC): $${totalAFC.toLocaleString('es-CL')}`)
        contextParts.push(`- Impuesto Único: $${totalTax.toLocaleString('es-CL')}`)
        contextParts.push(`- Total Descuentos Legales: $${(totalAFP + totalHealth + totalAFC + totalTax).toLocaleString('es-CL')}`)
      }
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de AFP y salud:', error)
    return ''
  }
}

/**
 * Construye contexto sobre renuncias, despidos y estados laborales
 */
async function buildEmploymentStatusContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DE ESTADOS LABORALES, RENUNCIAS Y DESPIDOS ===')

    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, rut, status, hire_date, contract_type, contract_end_date, cost_centers (code, name)')
      .eq('company_id', companyId)
      .order('hire_date', { ascending: true })

    if (!employees || employees.length === 0) {
      return 'No hay trabajadores registrados.'
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Renuncias
    const renuncias = employees.filter((e: any) => e.status === 'renuncia')
    if (renuncias.length > 0) {
      contextParts.push(`\n--- RENUNCIAS (Total: ${renuncias.length}) ---`)
      renuncias.slice(0, 10).forEach((emp: any) => {
        const cc = emp.cost_centers?.name || emp.cost_centers?.code || 'Sin asignar'
        contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}) - Centro de Costo: ${cc}`)
      })
    }

    // Despidos
    const despidos = employees.filter((e: any) => e.status === 'despido')
    if (despidos.length > 0) {
      contextParts.push(`\n--- DESPIDOS (Total: ${despidos.length}) ---`)
      despidos.slice(0, 10).forEach((emp: any) => {
        const cc = emp.cost_centers?.name || emp.cost_centers?.code || 'Sin asignar'
        contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}) - Centro de Costo: ${cc}`)
      })
    }

    // Contratos por vencer (próximos 60 días)
    const contractsExpiring = employees.filter((emp: any) => {
      if (emp.contract_type !== 'plazo_fijo' || !emp.contract_end_date) return false
      const endDate = new Date(emp.contract_end_date)
      endDate.setHours(0, 0, 0, 0)
      const daysDiff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff >= 0 && daysDiff <= 60 && emp.status === 'active'
    })

    if (contractsExpiring.length > 0) {
      contextParts.push(`\n--- CONTRATOS POR VENCER (Próximos 60 días) ---`)
      contractsExpiring.forEach((emp: any) => {
        const endDate = new Date(emp.contract_end_date).toLocaleDateString('es-CL')
        const cc = emp.cost_centers?.name || emp.cost_centers?.code || 'Sin asignar'
        contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}) - Vence: ${endDate} - Centro de Costo: ${cc}`)
      })
    }

    // Contratos vencidos pero aún activos
    const expiredContracts = employees.filter((emp: any) => {
      if (emp.contract_type !== 'plazo_fijo' || !emp.contract_end_date) return false
      const endDate = new Date(emp.contract_end_date)
      endDate.setHours(0, 0, 0, 0)
      return endDate < today && emp.status === 'active'
    })

    if (expiredContracts.length > 0) {
      contextParts.push(`\n⚠️ CONTRATOS VENCIDOS PERO TRABAJADOR AÚN ACTIVO (${expiredContracts.length}) ---`)
      expiredContracts.forEach((emp: any) => {
        const endDate = new Date(emp.contract_end_date).toLocaleDateString('es-CL')
        const cc = emp.cost_centers?.name || emp.cost_centers?.code || 'Sin asignar'
        contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}) - Venció: ${endDate} - Centro de Costo: ${cc}`)
      })
    }

    // Antigüedad (próximos a cumplir 1 año)
    const upcomingAnniversary = employees.filter((emp: any) => {
      if (!emp.hire_date || emp.status !== 'active') return false
      const hireDate = new Date(emp.hire_date)
      const nextAnniversary = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate())
      if (nextAnniversary < today) {
        nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1)
      }
      const daysDiff = Math.ceil((nextAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff >= 0 && daysDiff <= 30
    })

    if (upcomingAnniversary.length > 0) {
      contextParts.push(`\n--- TRABAJADORES PRÓXIMOS A CUMPLIR AÑO EN LA EMPRESA (Próximos 30 días) ---`)
      upcomingAnniversary.forEach((emp: any) => {
        const hireDate = new Date(emp.hire_date).toLocaleDateString('es-CL')
        const cc = emp.cost_centers?.name || emp.cost_centers?.code || 'Sin asignar'
        contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}) - Ingreso: ${hireDate} - Centro de Costo: ${cc}`)
      })
    }

    // Trabajadores con más antigüedad por centro de costo
    const byCostCenter: Record<string, any[]> = {}
    employees.filter((e: any) => e.status === 'active').forEach((emp: any) => {
      const ccCode = emp.cost_centers?.code || 'Sin asignar'
      if (!byCostCenter[ccCode]) {
        byCostCenter[ccCode] = []
      }
      byCostCenter[ccCode].push(emp)
    })

    contextParts.push(`\n--- TRABAJADORES CON MÁS ANTIGÜEDAD POR CENTRO DE COSTO ---`)
    Object.entries(byCostCenter).forEach(([ccCode, emps]) => {
      const sortedByHireDate = [...emps].sort((a: any, b: any) => {
        const dateA = new Date(a.hire_date || 0).getTime()
        const dateB = new Date(b.hire_date || 0).getTime()
        return dateA - dateB
      })
      
      if (sortedByHireDate.length > 0) {
        const oldest = sortedByHireDate[0]
        const hireDate = new Date(oldest.hire_date).toLocaleDateString('es-CL')
        const yearsWorked = Math.floor((today.getTime() - new Date(oldest.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
        contextParts.push(`- ${ccCode}: ${oldest.full_name} (RUT: ${oldest.rut}) - Ingreso: ${hireDate} (${yearsWorked} años)`)
      }
    })

    // Tasa de rotación (último año)
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    const hiredLastYear = employees.filter((emp: any) => {
      const hireDate = new Date(emp.hire_date)
      return hireDate >= oneYearAgo
    }).length

    const leftLastYear = renuncias.length + despidos.length

    const activeCount = employees.filter((e: any) => e.status === 'active').length
    const turnoverRate = activeCount > 0 ? (leftLastYear / activeCount) * 100 : 0

    contextParts.push(`\n--- TASA DE ROTACIÓN (Último año) ---`)
    contextParts.push(`- Trabajadores contratados: ${hiredLastYear}`)
    contextParts.push(`- Trabajadores que salieron: ${leftLastYear}`)
    contextParts.push(`- Tasa de rotación: ${turnoverRate.toFixed(2)}%`)

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de estados laborales:', error)
    return ''
  }
}

/**
 * Construye contexto sobre cumplimiento legal
 */
async function buildComplianceContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    const contextParts: string[] = []
    contextParts.push('=== ANÁLISIS DE CUMPLIMIENTO LEGAL ===')

    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, rut, base_salary, afp, health_system, status, hire_date')
      .eq('company_id', companyId)

    if (!employees || employees.length === 0) {
      return 'No hay trabajadores registrados.'
    }

    const activeEmployees = employees.filter((e: any) => e.status === 'active')

    // Trabajadores sin AFP o salud
    const missingData = activeEmployees.filter((emp: any) => !emp.afp || !emp.health_system)
    if (missingData.length > 0) {
      contextParts.push(`\n⚠️ TRABAJADORES CON DATOS PREVISIONALES FALTANTES (${missingData.length}) ---`)
      missingData.forEach((emp: any) => {
        const issues: string[] = []
        if (!emp.afp) issues.push('Sin AFP')
        if (!emp.health_system) issues.push('Sin sistema de salud')
        contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}): ${issues.join(', ')}`)
      })
    }

    // Verificar períodos cerrados sin liquidaciones emitidas
    const { data: closedPeriods } = await supabase
      .from('payroll_periods')
      .select(`
        id,
        year,
        month,
        status,
        payroll_slips (id, status)
      `)
      .eq('company_id', companyId)
      .eq('status', 'closed')

    if (closedPeriods && closedPeriods.length > 0) {
      const incompletePeriods: any[] = []
      closedPeriods.forEach((period: any) => {
        const slips = period.payroll_slips || []
        const issuedSlips = slips.filter((s: any) => s.status === 'issued')
        if (issuedSlips.length < slips.length) {
          incompletePeriods.push({
            period: `${period.month}/${period.year}`,
            total: slips.length,
            issued: issuedSlips.length
          })
        }
      })

      if (incompletePeriods.length > 0) {
        contextParts.push(`\n⚠️ PERÍODOS CERRADOS CON LIQUIDACIONES PENDIENTES ---`)
        incompletePeriods.forEach((p: any) => {
          contextParts.push(`- Período ${p.period}: ${p.issued}/${p.total} liquidaciones emitidas`)
        })
      }
    }

    // Verificar acumulación de vacaciones (1.25 días por mes)
    const { data: vacationPeriods } = await supabase
      .from('vacation_periods')
      .select(`
        employee_id,
        period_year,
        accumulated_days,
        employees (full_name, rut, hire_date)
      `)
      .in('employee_id', activeEmployees.map((e: any) => e.id))

    if (vacationPeriods && vacationPeriods.length > 0) {
      const incorrectAccumulation: any[] = []
      vacationPeriods.forEach((vp: any) => {
        const emp = vp.employees
        if (!emp?.hire_date) return
        
        const hireDate = new Date(emp.hire_date)
        const periodStart = new Date(vp.period_year, 0, 1)
        const periodEnd = new Date(vp.period_year, 11, 31)
        
        if (hireDate > periodEnd) return // Trabajador ingresó después del período
        
        const startDate = hireDate > periodStart ? hireDate : periodStart
        const monthsWorked = Math.max(0, Math.floor((periodEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
        const expectedDays = monthsWorked * 1.25
        
        if (Math.abs(vp.accumulated_days - expectedDays) > 0.5) {
          incorrectAccumulation.push({
            name: emp.full_name,
            rut: emp.rut,
            period: vp.period_year,
            expected: expectedDays.toFixed(2),
            actual: vp.accumulated_days.toFixed(2)
          })
        }
      })

      if (incorrectAccumulation.length > 0) {
        contextParts.push(`\n⚠️ POSIBLES INCONSISTENCIAS EN ACUMULACIÓN DE VACACIONES ---`)
        incorrectAccumulation.slice(0, 5).forEach((item: any) => {
          contextParts.push(`- ${item.name} (RUT: ${item.rut}) - Período ${item.period}: Esperado ${item.expected} días, Actual ${item.actual} días`)
        })
      }
    }

    contextParts.push(`\n--- RESUMEN DE CUMPLIMIENTO ---`)
    contextParts.push(`- Trabajadores activos: ${activeEmployees.length}`)
    contextParts.push(`- Con datos previsionales completos: ${activeEmployees.length - missingData.length}`)
    contextParts.push(`- Con datos faltantes: ${missingData.length}`)

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de cumplimiento:', error)
    return ''
  }
}

/**
 * Construye contexto sobre finiquitos
 */
async function buildSettlementContext(
  companyId: string,
  supabase: SupabaseClientType,
  question: string
): Promise<string> {
  try {
    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DE FINIQUITOS ===')

    // Detectar si pregunta sobre un trabajador específico
    const rutMatch = question.match(/\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]/)
    const nameMatch = question.match(/(?:trabajador|empleado|personal)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i)
    
    let specificEmployee: any = null
    if (rutMatch || nameMatch) {
      if (rutMatch) {
        const cleanRUT = rutMatch[0].replace(/\./g, '').replace(/-/g, '')
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyId)
          .ilike('rut', `%${cleanRUT}%`)
          .limit(1)
          .single()
        specificEmployee = data
      } else if (nameMatch) {
        const nameParts = nameMatch[1].trim().split(/\s+/)
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyId)
          .ilike('full_name', `%${nameParts[0]}%`)
          .limit(5)
        if (data && data.length > 0) {
          specificEmployee = data.find((emp: any) => 
            emp.full_name.toLowerCase().includes(nameMatch[1].toLowerCase())
          ) || data[0]
        }
      }
    }

    // Si pregunta sobre un trabajador específico, dar contexto detallado
    if (specificEmployee) {
      contextParts.push(`\n=== CONTEXTO PARA FINIQUITO DE ${specificEmployee.full_name.toUpperCase()} ===`)
      contextParts.push(`RUT: ${specificEmployee.rut}`)
      contextParts.push(`Estado actual: ${specificEmployee.status}`)
      
      // Antigüedad
      if (specificEmployee.hire_date) {
        const hireDate = new Date(specificEmployee.hire_date)
        const today = new Date()
        const yearsDiff = (today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
        const monthsDiff = Math.floor((yearsDiff % 1) * 12)
        const years = Math.floor(yearsDiff)
        contextParts.push(`\n--- ANTIGÜEDAD ---`)
        contextParts.push(`Fecha de ingreso: ${hireDate.toLocaleDateString('es-CL')}`)
        contextParts.push(`Años de servicio: ${years} años y ${monthsDiff} meses (${yearsDiff.toFixed(4)} años totales)`)
      }

      // Sueldo base y asignaciones
      contextParts.push(`\n--- REMUNERACIÓN BASE ---`)
      contextParts.push(`Sueldo base mensual: $${specificEmployee.base_salary?.toLocaleString('es-CL') || 'N/A'}`)
      if (specificEmployee.transportation) {
        contextParts.push(`Movilización: $${specificEmployee.transportation.toLocaleString('es-CL')}`)
      }
      if (specificEmployee.meal_allowance) {
        contextParts.push(`Colación: $${specificEmployee.meal_allowance.toLocaleString('es-CL')}`)
      }
      const totalMonthly = (specificEmployee.base_salary || 0) + 
                          (specificEmployee.transportation || 0) + 
                          (specificEmployee.meal_allowance || 0)
      contextParts.push(`Total mensual: $${totalMonthly.toLocaleString('es-CL')}`)

      // Vacaciones pendientes
      const { data: vacationPeriods } = await supabase
        .from('vacation_periods')
        .select('period_year, accumulated_days, used_days, available_days')
        .eq('employee_id', specificEmployee.id)

      if (vacationPeriods && vacationPeriods.length > 0) {
        const totalAvailable = vacationPeriods.reduce((sum: number, vp: any) => 
          sum + parseFloat(vp.available_days || 0), 0)
        contextParts.push(`\n--- VACACIONES PENDIENTES ---`)
        contextParts.push(`Días disponibles: ${totalAvailable.toFixed(2)} días`)
        vacationPeriods.forEach((vp: any) => {
          contextParts.push(`  - Período ${vp.period_year}: ${vp.available_days.toFixed(2)} días disponibles (${vp.accumulated_days.toFixed(2)} acumulados - ${vp.used_days} usados)`)
        })
      } else {
        // Calcular manualmente si no hay períodos
        if (specificEmployee.hire_date) {
          const hireDate = new Date(specificEmployee.hire_date)
          const today = new Date()
          const monthsWorked = (today.getFullYear() - hireDate.getFullYear()) * 12 + 
                             (today.getMonth() - hireDate.getMonth())
          const accumulated = monthsWorked * 1.25
          contextParts.push(`\n--- VACACIONES PENDIENTES (estimado) ---`)
          contextParts.push(`Días acumulados estimados: ${accumulated.toFixed(2)} días (${monthsWorked} meses × 1.25)`)
        }
      }

      // Préstamos pendientes
      const { data: activeLoans } = await supabase
        .from('loans')
        .select('id, amount, total_amount, remaining_amount, installments, paid_installments, loan_date, description')
        .eq('employee_id', specificEmployee.id)
        .eq('status', 'active')
        .gt('remaining_amount', 0)

      if (activeLoans && activeLoans.length > 0) {
        const totalLoanBalance = activeLoans.reduce((sum: number, loan: any) => 
          sum + parseFloat(loan.remaining_amount || 0), 0)
        contextParts.push(`\n--- PRÉSTAMOS PENDIENTES ---`)
        contextParts.push(`Total saldo pendiente: $${totalLoanBalance.toLocaleString('es-CL')}`)
        activeLoans.forEach((loan: any) => {
          contextParts.push(`  - Préstamo del ${new Date(loan.loan_date).toLocaleDateString('es-CL')}: $${loan.remaining_amount.toLocaleString('es-CL')} pendiente (${loan.paid_installments}/${loan.installments} cuotas pagadas)`)
        })
      } else {
        contextParts.push(`\n--- PRÉSTAMOS PENDIENTES ---`)
        contextParts.push(`No hay préstamos activos pendientes`)
      }

      // Anticipos pendientes
      const { data: pendingAdvances } = await supabase
        .from('advances')
        .select('id, amount, period, advance_date, reason, status')
        .eq('employee_id', specificEmployee.id)
        .neq('status', 'descontado')

      if (pendingAdvances && pendingAdvances.length > 0) {
        const totalAdvanceBalance = pendingAdvances.reduce((sum: number, adv: any) => 
          sum + parseFloat(adv.amount || 0), 0)
        contextParts.push(`\n--- ANTICIPOS PENDIENTES ---`)
        contextParts.push(`Total saldo pendiente: $${totalAdvanceBalance.toLocaleString('es-CL')}`)
        pendingAdvances.forEach((adv: any) => {
          contextParts.push(`  - Anticipo del ${new Date(adv.advance_date).toLocaleDateString('es-CL')}: $${adv.amount.toLocaleString('es-CL')} - Estado: ${adv.status}`)
        })
      } else {
        contextParts.push(`\n--- ANTICIPOS PENDIENTES ---`)
        contextParts.push(`No hay anticipos pendientes`)
      }

      // Última liquidación (para referencia de sueldo líquido)
      const { data: lastSlip } = await supabase
        .from('payroll_slips')
        .select(`
          net_pay,
          days_worked,
          payroll_periods (year, month)
        `)
        .eq('employee_id', specificEmployee.id)
        .eq('status', 'issued')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastSlip) {
        const slip = lastSlip as { net_pay: number | null; days_worked: number | null; payroll_periods: { year: number; month: number } | null }
        const period = slip.payroll_periods
        contextParts.push(`\n--- ÚLTIMA LIQUIDACIÓN (Referencia) ---`)
        contextParts.push(`Período: ${period?.month}/${period?.year}`)
        contextParts.push(`Días trabajados: ${slip.days_worked}`)
        contextParts.push(`Líquido pagado: $${slip.net_pay?.toLocaleString('es-CL') || 'N/A'}`)
      }

      // Tipo de contrato
      contextParts.push(`\n--- TIPO DE CONTRATO ---`)
      contextParts.push(`Tipo: ${specificEmployee.contract_type || 'No especificado'}`)
      if (specificEmployee.contract_end_date) {
        contextParts.push(`Fecha término contrato: ${new Date(specificEmployee.contract_end_date).toLocaleDateString('es-CL')}`)
      }

      // Finiquitos existentes
      const { data: existingSettlements } = await supabase
        .from('settlements')
        .select(`
          id,
          settlement_number,
          termination_date,
          cause_code,
          status,
          net_to_pay,
          settlement_causes (label, article)
        `)
        .eq('employee_id', specificEmployee.id)
        .order('termination_date', { ascending: false })
        .limit(5)

      if (existingSettlements && existingSettlements.length > 0) {
        contextParts.push(`\n--- FINIQUITOS EXISTENTES ---`)
        existingSettlements.forEach((settlement: any) => {
          const cause = settlement.settlement_causes
          contextParts.push(`  - ${settlement.settlement_number}: Fecha término ${new Date(settlement.termination_date).toLocaleDateString('es-CL')} - Causal: ${cause?.label || settlement.cause_code} (${cause?.article || ''}) - Estado: ${settlement.status} - Líquido: $${settlement.net_to_pay.toLocaleString('es-CL')}`)
        })
      }
    }

    // Si pregunta sobre trabajadores que necesitan revisión de finiquito
    if (question.includes('próximo') || question.includes('proximo') || question.includes('vencer') || question.includes('requerir')) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const thirtyDaysFromNow = new Date(today)
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { data: expiringContracts } = await supabase
        .from('employees')
        .select('id, full_name, rut, contract_type, contract_end_date, hire_date, base_salary, status')
        .eq('company_id', companyId)
        .eq('contract_type', 'plazo_fijo')
        .not('contract_end_date', 'is', null)
        .gte('contract_end_date', today.toISOString().split('T')[0])
        .lte('contract_end_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .in('status', ['active', 'licencia_medica'])

      if (expiringContracts && expiringContracts.length > 0) {
        contextParts.push(`\n=== TRABAJADORES CON CONTRATOS POR VENCER (Próximos 30 días) ===`)
        expiringContracts.forEach((emp: any) => {
          const endDate = new Date(emp.contract_end_date).toLocaleDateString('es-CL')
          const hireDate = new Date(emp.hire_date)
          const yearsDiff = (new Date(emp.contract_end_date).getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
          const years = Math.floor(yearsDiff)
          const months = Math.floor((yearsDiff % 1) * 12)
          contextParts.push(`- ${emp.full_name} (RUT: ${emp.rut}) - Vence: ${endDate} - Antigüedad: ${years} años ${months} meses - Sueldo base: $${emp.base_salary?.toLocaleString('es-CL') || 'N/A'}`)
        })
      }
    }

    // Información sobre causales
    const { data: causes } = await supabase
      .from('settlement_causes')
      .select('code, label, article, has_ias, has_iap, description')
      .order('code', { ascending: true })

    if (causes && causes.length > 0 && (question.includes('causal') || question.includes('renuncia') || question.includes('despido') || question.includes('necesidades'))) {
      contextParts.push(`\n=== CAUSALES DE TÉRMINO (Código del Trabajo) ===`)
      causes.forEach((cause: any) => {
        contextParts.push(`\n- ${cause.label} (${cause.article || cause.code}):`)
        contextParts.push(`  Indemnización años de servicio: ${cause.has_ias ? 'Sí' : 'No'}`)
        contextParts.push(`  Indemnización aviso previo: ${cause.has_iap ? 'Sí' : 'No'}`)
        if (cause.description) {
          contextParts.push(`  Descripción: ${cause.description}`)
        }
      })
    }

    // Resumen de finiquitos recientes
    const { data: recentSettlements } = await supabase
      .from('settlements')
      .select(`
        id,
        settlement_number,
        termination_date,
        cause_code,
        status,
        net_to_pay,
        service_years_effective,
        employees (full_name, rut),
        settlement_causes (label)
      `)
      .eq('company_id', companyId)
      .order('termination_date', { ascending: false })
      .limit(10)

    if (recentSettlements && recentSettlements.length > 0) {
      contextParts.push(`\n=== FINIQUITOS RECIENTES ===`)
      recentSettlements.forEach((settlement: any) => {
        const emp = settlement.employees
        const cause = settlement.settlement_causes
        contextParts.push(`- ${settlement.settlement_number}: ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Fecha: ${new Date(settlement.termination_date).toLocaleDateString('es-CL')} - Causal: ${cause?.label || settlement.cause_code} - Años servicio: ${settlement.service_years_effective} - Líquido: $${settlement.net_to_pay.toLocaleString('es-CL')} - Estado: ${settlement.status}`)
      })
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de finiquitos:', error)
    return ''
  }
}

/**
 * Construye contexto sobre un trabajador específico (por RUT o nombre)
 */
async function buildSpecificEmployeeContext(
  companyId: string,
  supabase: SupabaseClientType,
  question: string,
  rut?: string,
  name?: string
): Promise<string> {
  try {
    const contextParts: string[] = []
    
    let employee: any = null

    // Buscar por RUT
    if (rut) {
      const cleanRUT = rut.replace(/\./g, '').replace(/-/g, '')
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .ilike('rut', `%${cleanRUT}%`)
        .limit(1)
        .single()
      
      employee = data
    }

    // Buscar por nombre si no se encontró por RUT
    if (!employee && name) {
      const nameParts = name.trim().split(/\s+/)
      if (nameParts.length > 0) {
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyId)
          .ilike('full_name', `%${nameParts[0]}%`)
          .limit(5)
        
        // Buscar coincidencia más cercana
        if (data && data.length > 0) {
          employee = data.find((emp: any) => 
            emp.full_name.toLowerCase().includes(name.toLowerCase())
          ) || data[0]
        }
      }
    }

    if (!employee) {
      return `No se encontró el trabajador especificado.`
    }

    contextParts.push(`=== FICHA COMPLETA DEL TRABAJADOR ===`)
    contextParts.push(`\nNombre: ${employee.full_name}`)
    contextParts.push(`RUT: ${employee.rut}`)
    contextParts.push(`Estado: ${employee.status}`)
    if (employee.hire_date) contextParts.push(`Fecha de ingreso: ${new Date(employee.hire_date).toLocaleDateString('es-CL')}`)
    if (employee.position) contextParts.push(`Cargo: ${employee.position}`)
    if (employee.base_salary) contextParts.push(`Sueldo base: $${employee.base_salary.toLocaleString('es-CL')}`)
    if (employee.transportation_allowance) contextParts.push(`Movilización: $${employee.transportation_allowance.toLocaleString('es-CL')}`)
    if (employee.meal_allowance) contextParts.push(`Colación: $${employee.meal_allowance.toLocaleString('es-CL')}`)
    if (employee.afp) contextParts.push(`AFP: ${employee.afp}`)
    if (employee.health_system) contextParts.push(`Sistema de salud: ${employee.health_system}`)
    if (employee.health_plan) contextParts.push(`Plan de salud: ${employee.health_plan}`)
    if (employee.contract_type) contextParts.push(`Tipo de contrato: ${employee.contract_type}`)
    if (employee.contract_end_date) contextParts.push(`Fecha término contrato: ${new Date(employee.contract_end_date).toLocaleDateString('es-CL')}`)

    // Obtener información adicional
    const { data: costCenter } = await supabase
      .from('cost_centers')
      .select('code, name')
      .eq('id', employee.cost_center_id)
      .maybeSingle()

    if (costCenter) {
      const cc = costCenter as { code: string; name: string }
      contextParts.push(`Centro de costo: ${cc.name} (${cc.code})`)
    }

    // Vacaciones disponibles
    const { data: vacationPeriods } = await supabase
      .from('vacation_periods')
      .select('period_year, accumulated_days, used_days, available_days')
      .eq('employee_id', employee.id)

    if (vacationPeriods && vacationPeriods.length > 0) {
      const totalAvailable = vacationPeriods.reduce((sum: number, vp: any) => sum + parseFloat(vp.available_days || 0), 0)
      contextParts.push(`\nDías de vacaciones disponibles: ${totalAvailable.toFixed(2)}`)
    }

    // Última liquidación
    const { data: lastSlip } = await supabase
      .from('payroll_slips')
      .select(`
        net_pay,
        payroll_periods (year, month)
      `)
      .eq('employee_id', employee.id)
      .eq('status', 'issued')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSlip) {
      const slip = lastSlip as { net_pay: number | null; payroll_periods: { year: number; month: number } | null }
      const period = slip.payroll_periods
      contextParts.push(`\nÚltima liquidación: Período ${period?.month}/${period?.year} - Líquido: $${slip.net_pay?.toLocaleString('es-CL') || 'N/A'}`)
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de trabajador específico:', error)
    return ''
  }
}

/**
 * Construye información adicional sobre trabajadores: contratos, préstamos, anticipos, permisos, bonos
 */
async function buildAdditionalEmployeeData(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  const contextParts: string[] = []
  
  try {
    // Obtener IDs de empleados de la empresa
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)

    if (!companyEmployees || companyEmployees.length === 0) {
      return ''
    }

    const employeeIds = companyEmployees.map((e: any) => e.id)

    // === CONTRATOS ACTIVOS ===
    const { data: activeContracts } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        employee_id,
        contract_type,
        start_date,
        end_date,
        position,
        work_schedule,
        base_salary,
        gratuity,
        status,
        employees (full_name, rut)
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'signed'])

    if (activeContracts && activeContracts.length > 0) {
      contextParts.push('\n=== CONTRATOS ACTIVOS ===')
      contextParts.push(`Total: ${activeContracts.length} contratos activos`)
      activeContracts.forEach((contract: any) => {
        const emp = contract.employees
        const endDateInfo = contract.end_date ? ` - Hasta: ${new Date(contract.end_date).toLocaleDateString('es-CL')}` : ' - Indefinido'
        contextParts.push(
          `- ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Contrato ${contract.contract_number || 'N/A'} - Tipo: ${contract.contract_type} - Cargo: ${contract.position || 'N/A'} - Horario: ${contract.work_schedule || 'No especificado'} - Sueldo: $${contract.base_salary?.toLocaleString('es-CL') || 'N/A'}${endDateInfo}`
        )
      })
    }

    // === PRÉSTAMOS ACTIVOS ===
    const { data: activeLoans } = await supabase
      .from('loans')
      .select(`
        id,
        employee_id,
        amount,
        total_amount,
        installments,
        installment_amount,
        paid_installments,
        remaining_amount,
        status,
        loan_date,
        description,
        employees (full_name, rut)
      `)
      .in('employee_id', employeeIds)
      .eq('status', 'active')

    if (activeLoans && activeLoans.length > 0) {
      contextParts.push('\n=== PRÉSTAMOS ACTIVOS ===')
      contextParts.push(`Total: ${activeLoans.length} préstamos activos`)
      
      for (const loanItem of activeLoans) {
        const loan = loanItem as any
        const emp = loan.employees
        const remainingInstallments = loan.installments - loan.paid_installments
        const completionDate = remainingInstallments > 0 
          ? ` - Cuotas restantes: ${remainingInstallments} de ${loan.installments}`
          : ' - COMPLETADO'
        
        // Obtener cuotas pendientes
        const { data: pendingInstallments } = await supabase
          .from('loan_installments')
          .select('installment_number, due_year, due_month, status, amount_expected')
          .eq('loan_id', loan.id)
          .in('status', ['pending', 'partial'])
          .order('installment_number', { ascending: true })

        let installmentsInfo = ''
        if (pendingInstallments && pendingInstallments.length > 0) {
          const nextInstallment = pendingInstallments[0] as any
          installmentsInfo = ` - Próxima cuota: ${nextInstallment.installment_number} (${nextInstallment.due_month}/${nextInstallment.due_year}) - $${nextInstallment.amount_expected?.toLocaleString('es-CL') || 'N/A'}`
        }

        contextParts.push(
          `- ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Monto: $${loan.amount?.toLocaleString('es-CL') || 'N/A'} - Total a pagar: $${loan.total_amount?.toLocaleString('es-CL') || 'N/A'} - Cuota: $${loan.installment_amount?.toLocaleString('es-CL') || 'N/A'}${completionDate}${installmentsInfo} - Pendiente: $${loan.remaining_amount?.toLocaleString('es-CL') || 'N/A'}`
        )
      }
    }

    // === ANTICIPOS PENDIENTES ===
    const { data: pendingAdvances } = await supabase
      .from('advances')
      .select(`
        id,
        employee_id,
        period,
        advance_date,
        amount,
        status,
        reason,
        employees (full_name, rut)
      `)
      .eq('company_id', companyId)
      .in('status', ['borrador', 'emitido', 'firmado', 'pagado'])

    if (pendingAdvances && pendingAdvances.length > 0) {
      const notDiscounted = pendingAdvances.filter((a: any) => a.status !== 'descontado')
      if (notDiscounted.length > 0) {
        contextParts.push('\n=== ANTICIPOS PENDIENTES DE DESCONTAR ===')
        contextParts.push(`Total: ${notDiscounted.length} anticipos pendientes`)
        notDiscounted.forEach((advance: any) => {
          const emp = advance.employees
          contextParts.push(
            `- ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Monto: $${advance.amount?.toLocaleString('es-CL') || 'N/A'} - Período: ${advance.period} - Fecha: ${new Date(advance.advance_date).toLocaleDateString('es-CL')} - Estado: ${advance.status}`
          )
        })
      }
    }

    // === PERMISOS RECIENTES ===
    const { data: recentPermissions } = await supabase
      .from('permissions')
      .select(`
        id,
        employee_id,
        permission_type_code,
        reason,
        start_date,
        end_date,
        days,
        status,
        permission_types (label),
        employees (full_name, rut)
      `)
      .eq('company_id', companyId)
      .order('start_date', { ascending: false })
      .limit(20)

    if (recentPermissions && recentPermissions.length > 0) {
      const pendingPermissions = recentPermissions.filter((p: any) => p.status === 'approved' || p.status === 'draft')
      if (pendingPermissions.length > 0) {
        contextParts.push('\n=== PERMISOS RECIENTES ===')
        contextParts.push(`Total: ${pendingPermissions.length} permisos recientes`)
        pendingPermissions.slice(0, 10).forEach((perm: any) => {
          const emp = perm.employees
          const type = perm.permission_types
          contextParts.push(
            `- ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Tipo: ${type?.label || perm.permission_type_code} - Motivo: ${perm.reason || 'N/A'} - ${perm.days} días - Del ${new Date(perm.start_date).toLocaleDateString('es-CL')} al ${new Date(perm.end_date).toLocaleDateString('es-CL')} - Estado: ${perm.status}`
          )
        })
      }
    }

    // === BONOS EN LIQUIDACIONES RECIENTES ===
    const { data: recentPeriods } = await supabase
      .from('payroll_periods')
      .select('id, year, month')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(3)

    if (recentPeriods && recentPeriods.length > 0) {
      const periodIds = recentPeriods.map((p: any) => p.id)
      const { data: recentSlips } = await supabase
        .from('payroll_slips')
        .select(`
          id,
          employee_id,
          period_id,
          employees (full_name, rut),
          payroll_items (category, description, amount, type)
        `)
        .in('period_id', periodIds)

      if (recentSlips && recentSlips.length > 0) {
        const bonusesByEmployee: Record<string, any[]> = {}
        
        recentSlips.forEach((slip: any) => {
          const emp = slip.employees
          const empKey = `${emp?.full_name || 'N/A'}|${emp?.rut || 'N/A'}`
          const items = slip.payroll_items || []
          const bonuses = items.filter((item: any) => item.category === 'bonos' && item.type === 'taxable_earning')
          
          if (bonuses.length > 0) {
            if (!bonusesByEmployee[empKey]) {
              bonusesByEmployee[empKey] = []
            }
            bonusesByEmployee[empKey].push(...bonuses)
          }
        })

        if (Object.keys(bonusesByEmployee).length > 0) {
          contextParts.push('\n=== BONOS EN LIQUIDACIONES RECIENTES ===')
          Object.entries(bonusesByEmployee).forEach(([empKey, bonuses]) => {
            const [name, rut] = empKey.split('|')
            const totalBonuses = bonuses.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0)
            const bonusList = bonuses.map((b: any) => `${b.description || 'Bono'}: $${Number(b.amount).toLocaleString('es-CL')}`).join(', ')
            contextParts.push(
              `- ${name} (RUT: ${rut}) - Total bonos: $${totalBonuses.toLocaleString('es-CL')} - Detalle: ${bonusList}`
            )
          })
        }
      }
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir información adicional:', error)
    return ''
  }
}

/**
 * Construye contexto detallado sobre contratos
 */
async function buildContractContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    const { data: contracts } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        employee_id,
        contract_type,
        start_date,
        end_date,
        position,
        position_description,
        work_schedule,
        work_location,
        base_salary,
        gratuity,
        gratuity_amount,
        other_allowances,
        confidentiality_clause,
        authorized_deductions,
        advances_clause,
        internal_regulations,
        additional_clauses,
        status,
        employees (full_name, rut)
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'signed'])

    if (!contracts || contracts.length === 0) {
      return 'No hay contratos activos registrados.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DETALLADA DE CONTRATOS ===')
    contextParts.push(`Total: ${contracts.length} contratos activos`)

    contracts.forEach((contract: any) => {
      const emp = contract.employees
      const endDateInfo = contract.end_date ? ` - Hasta: ${new Date(contract.end_date).toLocaleDateString('es-CL')}` : ' - Indefinido'
      contextParts.push(`\n--- Contrato ${contract.contract_number || 'N/A'} ---`)
      contextParts.push(`Trabajador: ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'})`)
      contextParts.push(`Tipo: ${contract.contract_type} - Cargo: ${contract.position || 'N/A'}`)
      contextParts.push(`Horario de trabajo: ${contract.work_schedule || 'No especificado'}`)
      contextParts.push(`Ubicación: ${contract.work_location || 'N/A'}`)
      contextParts.push(`Sueldo base: $${contract.base_salary?.toLocaleString('es-CL') || 'N/A'}`)
      contextParts.push(`Gratificación: ${contract.gratuity ? 'Sí' : 'No'}${contract.gratuity_amount ? ` - Monto: $${contract.gratuity_amount.toLocaleString('es-CL')}` : ''}`)
      if (contract.other_allowances) {
        contextParts.push(`Otras asignaciones: ${contract.other_allowances}`)
      }
      if (contract.confidentiality_clause) {
        contextParts.push(`Cláusula de confidencialidad: ${contract.confidentiality_clause.substring(0, 200)}...`)
      }
      if (contract.authorized_deductions) {
        contextParts.push(`Descuentos autorizados: ${contract.authorized_deductions.substring(0, 200)}...`)
      }
      if (contract.additional_clauses) {
        contextParts.push(`Cláusulas adicionales: ${contract.additional_clauses.substring(0, 200)}...`)
      }
    })

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de contratos:', error)
    return ''
  }
}

/**
 * Construye contexto detallado sobre préstamos
 */
async function buildLoanContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)

    if (!companyEmployees || companyEmployees.length === 0) {
      return 'No hay trabajadores en la empresa.'
    }

    const employeeIds = companyEmployees.map((e: any) => e.id)

    const { data: loans } = await supabase
      .from('loans')
      .select(`
        id,
        employee_id,
        amount,
        total_amount,
        installments,
        installment_amount,
        paid_installments,
        remaining_amount,
        status,
        loan_date,
        description,
        employees (full_name, rut)
      `)
      .in('employee_id', employeeIds)
      .in('status', ['active', 'paid'])

    if (!loans || loans.length === 0) {
      return 'No hay préstamos registrados.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DETALLADA DE PRÉSTAMOS ===')
    contextParts.push(`Total: ${loans.length} préstamos`)

    for (const loanItem of loans) {
      const loan = loanItem as any
      const emp = loan.employees
      const remainingInstallments = loan.installments - loan.paid_installments
      
      contextParts.push(`\n--- Préstamo de ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) ---`)
      contextParts.push(`Monto original: $${loan.amount?.toLocaleString('es-CL') || 'N/A'}`)
      contextParts.push(`Total a pagar: $${loan.total_amount?.toLocaleString('es-CL') || 'N/A'}`)
      contextParts.push(`Cuotas: ${loan.paid_installments}/${loan.installments} pagadas - Restantes: ${remainingInstallments}`)
      contextParts.push(`Monto por cuota: $${loan.installment_amount?.toLocaleString('es-CL') || 'N/A'}`)
      contextParts.push(`Monto pendiente: $${loan.remaining_amount?.toLocaleString('es-CL') || 'N/A'}`)
      contextParts.push(`Estado: ${loan.status === 'active' ? 'Activo' : 'Pagado'}`)
      
      if (loan.status === 'active') {
        // Obtener cuotas pendientes
        const { data: installments } = await supabase
          .from('loan_installments')
          .select('installment_number, due_year, due_month, status, amount_expected, amount_applied')
          .eq('loan_id', loan.id)
          .order('installment_number', { ascending: true })

        if (installments && installments.length > 0) {
          const pending = installments.filter((i: any) => i.status !== 'paid')
          if (pending.length > 0) {
            contextParts.push(`Cuotas pendientes:`)
            pending.slice(0, 5).forEach((inst: any) => {
              contextParts.push(`  - Cuota ${inst.installment_number}: $${inst.amount_expected?.toLocaleString('es-CL') || 'N/A'} - Vence: ${inst.due_month}/${inst.due_year} - Estado: ${inst.status}`)
            })
            if (pending.length > 5) {
              contextParts.push(`  ... y ${pending.length - 5} cuotas más`)
            }
          }
        }
      }
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de préstamos:', error)
    return ''
  }
}

/**
 * Construye contexto detallado sobre anticipos
 */
async function buildAdvanceContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    const { data: advances } = await supabase
      .from('advances')
      .select(`
        id,
        employee_id,
        period,
        advance_date,
        amount,
        status,
        reason,
        employees (full_name, rut)
      `)
      .eq('company_id', companyId)
      .order('advance_date', { ascending: false })
      .limit(30)

    if (!advances || advances.length === 0) {
      return 'No hay anticipos registrados.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DETALLADA DE ANTICIPOS ===')
    contextParts.push(`Total: ${advances.length} anticipos`)

    const byStatus = advances.reduce((acc: any, adv: any) => {
      acc[adv.status] = (acc[adv.status] || 0) + 1
      return acc
    }, {})

    contextParts.push('\n--- Distribución por Estado ---')
    Object.entries(byStatus).forEach(([status, count]) => {
      const statusLabel =
        status === 'borrador' ? 'Borrador' :
        status === 'emitido' ? 'Emitido' :
        status === 'firmado' ? 'Firmado' :
        status === 'pagado' ? 'Pagado' :
        status === 'descontado' ? 'Descontado' : status
      contextParts.push(`- ${statusLabel}: ${count}`)
    })

    const pending = advances.filter((a: any) => a.status !== 'descontado')
    if (pending.length > 0) {
      contextParts.push('\n--- ANTICIPOS PENDIENTES DE DESCONTAR ---')
      pending.forEach((advance: any) => {
        const emp = advance.employees
        contextParts.push(
          `- ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Monto: $${advance.amount?.toLocaleString('es-CL') || 'N/A'} - Período: ${advance.period} - Fecha: ${new Date(advance.advance_date).toLocaleDateString('es-CL')} - Estado: ${advance.status}${advance.reason ? ` - Motivo: ${advance.reason}` : ''}`
        )
      })
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de anticipos:', error)
    return ''
  }
}

/**
 * Construye contexto detallado sobre permisos
 */
async function buildPermissionContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    const { data: permissions } = await supabase
      .from('permissions')
      .select(`
        id,
        employee_id,
        permission_type_code,
        reason,
        start_date,
        end_date,
        days,
        hours,
        status,
        applied_to_payroll,
        discount_amount,
        permission_types (label, affects_payroll),
        employees (full_name, rut)
      `)
      .eq('company_id', companyId)
      .order('start_date', { ascending: false })
      .limit(50)

    if (!permissions || permissions.length === 0) {
      return 'No hay permisos registrados.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DETALLADA DE PERMISOS ===')
    contextParts.push(`Total: ${permissions.length} permisos`)

    const byStatus = permissions.reduce((acc: any, perm: any) => {
      acc[perm.status] = (acc[perm.status] || 0) + 1
      return acc
    }, {})

    contextParts.push('\n--- Distribución por Estado ---')
    Object.entries(byStatus).forEach(([status, count]) => {
      const statusLabel =
        status === 'draft' ? 'Borrador' :
        status === 'approved' ? 'Aprobado' :
        status === 'applied' ? 'Aplicado' :
        status === 'void' ? 'Anulado' : status
      contextParts.push(`- ${statusLabel}: ${count}`)
    })

    const recent = permissions.slice(0, 20)
    contextParts.push('\n--- PERMISOS RECIENTES ---')
    recent.forEach((perm: any) => {
      const emp = perm.employees
      const type = perm.permission_types
      contextParts.push(
        `- ${emp?.full_name || 'N/A'} (RUT: ${emp?.rut || 'N/A'}) - Tipo: ${type?.label || perm.permission_type_code} - Motivo: ${perm.reason || 'N/A'} - ${perm.days} días${perm.hours ? ` (${perm.hours} horas)` : ''} - Del ${new Date(perm.start_date).toLocaleDateString('es-CL')} al ${new Date(perm.end_date).toLocaleDateString('es-CL')} - Estado: ${perm.status}${perm.discount_amount > 0 ? ` - Descuento: $${perm.discount_amount.toLocaleString('es-CL')}` : ''}${perm.applied_to_payroll ? ' - Aplicado a liquidación' : ''}`
      )
    })

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de permisos:', error)
    return ''
  }
}

/**
 * Construye contexto detallado sobre bonos
 */
async function buildBonusContext(
  companyId: string,
  supabase: SupabaseClientType
): Promise<string> {
  try {
    const { data: recentPeriods } = await supabase
      .from('payroll_periods')
      .select('id, year, month')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(6)

    if (!recentPeriods || recentPeriods.length === 0) {
      return 'No hay períodos de liquidación registrados.'
    }

    const periodIds = recentPeriods.map((p: any) => p.id)
    const { data: slips } = await supabase
      .from('payroll_slips')
      .select(`
        id,
        employee_id,
        period_id,
        employees (full_name, rut),
        payroll_periods (year, month),
        payroll_items (category, description, amount, type)
      `)
      .in('period_id', periodIds)

    if (!slips || slips.length === 0) {
      return 'No hay liquidaciones con bonos registradas.'
    }

    const contextParts: string[] = []
    contextParts.push('=== INFORMACIÓN DETALLADA DE BONOS ===')

    const bonusesByPeriod: Record<string, any[]> = {}
    const bonusesByEmployee: Record<string, any[]> = {}

    slips.forEach((slip: any) => {
      const period = slip.payroll_periods
      const periodKey = `${period?.month || 'N/A'}/${period?.year || 'N/A'}`
      const emp = slip.employees
      const empKey = `${emp?.full_name || 'N/A'}|${emp?.rut || 'N/A'}`
      
      const items = slip.payroll_items || []
      const bonuses = items.filter((item: any) => item.category === 'bonos' && item.type === 'taxable_earning')
      
      if (bonuses.length > 0) {
        if (!bonusesByPeriod[periodKey]) {
          bonusesByPeriod[periodKey] = []
        }
        bonusesByPeriod[periodKey].push(...bonuses)

        if (!bonusesByEmployee[empKey]) {
          bonusesByEmployee[empKey] = []
        }
        bonusesByEmployee[empKey].push(...bonuses.map((b: any) => ({ ...b, period: periodKey })))
      }
    })

    if (Object.keys(bonusesByPeriod).length > 0) {
      contextParts.push('\n--- BONOS POR PERÍODO ---')
      Object.entries(bonusesByPeriod).forEach(([period, bonuses]) => {
        const total = bonuses.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0)
        contextParts.push(`Período ${period}: Total bonos $${total.toLocaleString('es-CL')} - ${bonuses.length} bonos registrados`)
      })

      contextParts.push('\n--- BONOS POR TRABAJADOR ---')
      Object.entries(bonusesByEmployee).forEach(([empKey, bonuses]) => {
        const [name, rut] = empKey.split('|')
        const total = bonuses.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0)
        const bonusList = bonuses.map((b: any) => `${b.description || 'Bono'} (${b.period}): $${Number(b.amount).toLocaleString('es-CL')}`).join(', ')
        contextParts.push(`- ${name} (RUT: ${rut}) - Total: $${total.toLocaleString('es-CL')} - Detalle: ${bonusList}`)
      })
    } else {
      return 'No se encontraron bonos en las liquidaciones recientes.'
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error al construir contexto de bonos:', error)
    return ''
  }
}




