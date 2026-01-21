/**
 * Servicio para gestionar vacaciones según Código del Trabajo chileno
 * - Las vacaciones NO son por año calendario, son por años de servicio
 * - Se acumulan 1.25 días hábiles por cada mes completo trabajado desde la fecha de ingreso
 * - Un mes se considera completo cuando se alcanza el mismo día del mes siguiente
 * - Máximo 2 períodos (60 días) pueden guardarse según ley
 * - Permite días negativos (dar días de períodos futuros)
 */

import { supabase } from '@/lib/supabase/client'

export interface VacationPeriod {
  id: string
  employee_id: string
  period_year: number
  accumulated_days: number
  used_days: number
  available_days: number
  status?: string // 'active' | 'completed' | 'archived'
  archived_reason?: string | null
  archived_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * Calcula los meses completos trabajados desde la fecha de ingreso
 * Un mes se considera completo cuando se alcanza el mismo día del mes siguiente
 * Ejemplo: ingreso 4 de marzo → acumula 1.25 días el 4 de abril
 * @param hireDate Fecha de ingreso del trabajador
 * @param referenceDate Fecha de referencia (por defecto: hoy)
 * @returns Número de meses completos trabajados
 */
export function calculateCompleteMonthsWorked(
  hireDate: Date | string,
  referenceDate: Date = new Date()
): number {
  // Parsear fecha de ingreso correctamente
  let hire: Date
  if (typeof hireDate === 'string') {
    const dateParts = hireDate.split('T')[0].split('-')
    hire = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
  } else {
    hire = new Date(hireDate.getFullYear(), hireDate.getMonth(), hireDate.getDate())
  }
  
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  
  // Si la fecha de referencia es anterior a la fecha de ingreso, retornar 0
  if (ref.getTime() < hire.getTime()) {
    return 0
  }
  
  // Calcular diferencia en años, meses y días
  let yearsDiff = ref.getFullYear() - hire.getFullYear()
  let monthsDiff = ref.getMonth() - hire.getMonth()
  let daysDiff = ref.getDate() - hire.getDate()
  
  // Calcular meses completos trabajados
  // Un mes se considera completo cuando se alcanza el mismo día del mes siguiente
  // Ejemplo: ingreso 4 de marzo, hoy 4 de abril = 1 mes completo
  // Ejemplo: ingreso 4 de marzo, hoy 3 de abril = 0 meses completos (aún no cumple el mes)
  let completeMonths = yearsDiff * 12 + monthsDiff
  
  // Si el día del mes de referencia es mayor o igual al día de ingreso, el mes actual cuenta como completo
  // Si es menor, aún no ha completado el mes actual
  if (daysDiff >= 0) {
    // Ya completó el mes actual
    completeMonths += 0 // No sumar, ya está incluido en monthsDiff
  } else {
    // Aún no ha completado el mes actual, restar 1
    completeMonths -= 1
  }
  
  // Asegurar que sea al menos 0
  return Math.max(0, completeMonths)
}

/**
 * Calcula los días acumulados de vacaciones desde la fecha de ingreso
 * @param hireDate Fecha de ingreso del trabajador
 * @param referenceDate Fecha de referencia (por defecto: hoy)
 * @returns Días acumulados (1.25 por mes completo trabajado)
 */
export function calculateAccumulatedVacationDays(
  hireDate: Date | string,
  referenceDate: Date = new Date()
): number {
  const completeMonths = calculateCompleteMonthsWorked(hireDate, referenceDate)
  const accumulatedDays = completeMonths * 1.25
  return Math.round(accumulatedDays * 100) / 100 // Redondear a 2 decimales
}

/**
 * ✅ NUEVO: Calcula los días acumulados para un año de servicio específico
 * Según Código del Trabajo chileno (Art. 67): 15 días hábiles por año de servicio
 * El año de servicio se cuenta desde la fecha de ingreso (aniversario)
 * 
 * @param hireDate Fecha de ingreso del trabajador
 * @param serviceYear Número de año de servicio (1 = primer año, 2 = segundo año, etc.)
 * @param referenceDate Fecha de referencia (por defecto: hoy)
 * @returns Días acumulados en ese año de servicio
 * 
 * @example
 * Ingreso: 14/04/2023
 * serviceYear 1: 14/04/2023 → 13/04/2024 = 15 días
 * serviceYear 2: 14/04/2024 → 13/04/2025 = 15 días
 * serviceYear 3: 14/04/2025 → 13/04/2026 = 15 días
 */
export function calculateAccumulatedDaysForServiceYear(
  hireDate: Date | string,
  serviceYear: number,
  referenceDate: Date = new Date()
): number {
  // Parsear fecha de ingreso correctamente
  let hire: Date
  if (typeof hireDate === 'string') {
    const dateParts = hireDate.split('T')[0].split('-')
    hire = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
  } else {
    hire = new Date(hireDate.getFullYear(), hireDate.getMonth(), hireDate.getDate())
  }
  
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  
  // Calcular el inicio y fin del año de servicio
  // serviceYear 1: desde ingreso hasta 1 año después
  // serviceYear 2: desde 1 año después hasta 2 años después
  // etc.
  
  const serviceYearStart = new Date(hire)
  serviceYearStart.setFullYear(hire.getFullYear() + (serviceYear - 1))
  
  const serviceYearEnd = new Date(hire)
  serviceYearEnd.setFullYear(hire.getFullYear() + serviceYear)
  serviceYearEnd.setDate(serviceYearEnd.getDate() - 1) // Un día antes del siguiente aniversario
  
  // Si el periodo aún no ha comenzado
  if (ref.getTime() < serviceYearStart.getTime()) {
    return 0
  }
  
  // Si el periodo ya terminó completamente, retornar 15 días
  if (ref.getTime() > serviceYearEnd.getTime()) {
    return 15.0 // Año completo de servicio = 15 días
  }
  
  // Si estamos dentro del periodo, calcular días acumulados hasta hoy
  const monthsAtStart = calculateCompleteMonthsWorked(hire, serviceYearStart)
  const monthsAtRef = calculateCompleteMonthsWorked(hire, ref)
  
  const monthsInPeriod = monthsAtRef - monthsAtStart
  const accumulated = monthsInPeriod * 1.25
  
  return Math.round(accumulated * 100) / 100 // Redondear a 2 decimales
}

/**
 * @deprecated Use calculateAccumulatedDaysForServiceYear instead
 * Esta función calculaba por año calendario, lo cual NO es correcto según ley chilena
 */
export function calculateAccumulatedDaysForYear(
  hireDate: Date | string,
  year: number
): number {
  console.warn('⚠️ calculateAccumulatedDaysForYear está deprecated. Usa calculateAccumulatedDaysForServiceYear')
  
  // Parsear fecha de ingreso correctamente
  let hire: Date
  if (typeof hireDate === 'string') {
    const dateParts = hireDate.split('T')[0].split('-')
    hire = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
  } else {
    hire = new Date(hireDate.getFullYear(), hireDate.getMonth(), hireDate.getDate())
  }
  
  const yearStart = new Date(year, 0, 1) // 1 de enero del año
  const yearEnd = new Date(year, 11, 31) // 31 de diciembre del año
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Si el trabajador ingresó después del fin del año, no tiene días acumulados
  if (hire.getTime() > yearEnd.getTime()) {
    return 0
  }
  
  // Si el año es futuro, no hay días acumulados aún
  if (year > today.getFullYear()) {
    return 0
  }
  
  // Fecha de inicio: máximo entre fecha de ingreso y inicio del año
  const startDate = hire.getTime() > yearStart.getTime() ? hire : yearStart
  
  // Fecha de fin: mínimo entre hoy y fin del año
  const endDate = today.getFullYear() > year ? yearEnd : (today.getTime() < yearEnd.getTime() ? today : yearEnd)
  
  if (startDate.getTime() > endDate.getTime()) {
    return 0
  }
  
  // Calcular meses completos trabajados en ese año calendario
  // Usar la lógica de meses completos desde fecha de ingreso
  const monthsAtYearStart = calculateCompleteMonthsWorked(hire, startDate)
  const monthsAtYearEnd = calculateCompleteMonthsWorked(hire, endDate)
  
  // Días acumulados en ese año = diferencia de meses completos × 1.25
  const monthsInYear = monthsAtYearEnd - monthsAtYearStart
  const accumulated = monthsInYear * 1.25
  
  return Math.round(accumulated * 100) / 100 // Redondear a 2 decimales
}

/**
 * Obtiene los períodos de vacaciones de un trabajador
 * Aplica la regla de máximo 2 períodos (60 días)
 * @param employeeId ID del trabajador
 * @param includeArchived Si es true, incluye períodos archivados (histórico completo)
 * @returns Array de períodos ordenados por año (más antiguo primero)
 */
export async function getVacationPeriods(
  employeeId: string,
  includeArchived: boolean = false
): Promise<VacationPeriod[]> {
  try {
    // Construir query base
    let query = supabase
      .from('vacation_periods')
      .select('*')
      .eq('employee_id', employeeId)
    
    // Si no se incluyen archivados, filtrar solo activos y completados
    if (!includeArchived) {
      query = query.in('status', ['active', 'completed'])
    }
    
    const { data: periods, error } = await query.order('period_year', { ascending: true })
    
    if (error) throw error
    
    return periods || []
  } catch (error) {
    console.error('Error al obtener períodos de vacaciones:', error)
    return []
  }
}

/**
 * ✅ NUEVO: Sincroniza los períodos de vacaciones por año de servicio
 * Según Código del Trabajo chileno: periodos basados en aniversario de ingreso
 * Aplica la regla de máximo 2 períodos (60 días)
 * 
 * @param employeeId ID del trabajador
 * @param hireDate Fecha de ingreso
 * 
 * @example
 * Ingreso: 14/04/2023
 * Periodo 1 (2023): 14/04/2023 → 13/04/2024 = 15 días
 * Periodo 2 (2024): 14/04/2024 → 13/04/2025 = 15 días
 * Periodo 3 (2025): 14/04/2025 → 13/04/2026 = 15 días (en curso)
 */
export async function syncVacationPeriods(
  employeeId: string,
  hireDate: Date | string
): Promise<void> {
  try {
    // Parsear fecha correctamente
    let hire: Date
    if (typeof hireDate === 'string') {
      const dateParts = hireDate.split('T')[0].split('-')
      hire = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
    } else {
      hire = new Date(hireDate.getFullYear(), hireDate.getMonth(), hireDate.getDate())
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Calcular cuántos años de servicio ha completado o está cursando
    const totalMonthsWorked = calculateCompleteMonthsWorked(hire, today)
    const serviceYearsToCreate = Math.ceil(totalMonthsWorked / 12) // Redondear arriba para incluir año en curso
    
    // Si aún no ha completado ni siquiera 1 mes, crear al menos el primer periodo
    const serviceYears = Math.max(1, serviceYearsToCreate)
    
    console.log(`📅 Sincronizando ${serviceYears} periodo(s) de servicio para empleado ${employeeId}`)
    console.log(`   Fecha ingreso: ${hire.toISOString().split('T')[0]}`)
    console.log(`   Meses trabajados: ${totalMonthsWorked}`)
    
    // Crear períodos por año de servicio
    const periodsToUpsert = []
    
    for (let serviceYear = 1; serviceYear <= serviceYears; serviceYear++) {
      const accumulated = calculateAccumulatedDaysForServiceYear(hire, serviceYear, today)
      
      // period_year representa el año de inicio del periodo de servicio
      // Periodo 1: año de ingreso
      // Periodo 2: año de ingreso + 1
      // etc.
      const periodYearStart = hire.getFullYear() + (serviceYear - 1)
      
      periodsToUpsert.push({
        employee_id: employeeId,
        period_year: periodYearStart,
        accumulated_days: accumulated,
      })
      
      console.log(`   Periodo ${serviceYear} (${periodYearStart}): ${accumulated} días`)
    }
    
    // Upsert períodos
    for (const period of periodsToUpsert) {
      const { error } = await supabase
        .from('vacation_periods')
        .upsert(period, {
          onConflict: 'employee_id,period_year',
        })
      
      if (error) {
        console.error(`Error al upsert periodo ${period.period_year}:`, error)
        throw error
      }
    }
    
    // Obtener todos los períodos activos (no archivados)
    const { data: activePeriods } = await supabase
      .from('vacation_periods')
      .select('*')
      .eq('employee_id', employeeId)
      .in('status', ['active', 'completed'])
      .order('period_year', { ascending: false })
    
    // Si hay más de 2 períodos activos, archivar los más antiguos (Art. 70 Código del Trabajo)
    if (activePeriods && activePeriods.length > 2) {
      const periodsToArchive = activePeriods.slice(2) // Todos excepto los 2 primeros (más recientes)
      
      console.log(`⚠️ Archivando ${periodsToArchive.length} periodo(s) antiguo(s) (límite máximo: 2 periodos activos)`)
      
      for (const period of periodsToArchive) {
        const { error } = await supabase
          .from('vacation_periods')
          .update({
            status: 'archived',
            archived_reason: 'Límite máximo de 2 períodos según Art. 70 Código del Trabajo',
            archived_at: new Date().toISOString(),
          })
          .eq('id', period.id)
        
        if (error) {
          console.error(`Error al archivar periodo ${period.period_year}:`, error)
          throw error
        }
      }
    }
    
    console.log(`✅ Periodos sincronizados correctamente`)
  } catch (error) {
    console.error('Error al sincronizar períodos de vacaciones:', error)
    throw error
  }
}

/**
 * Asigna días de vacaciones a uno o más períodos usando FIFO (First In, First Out)
 * FIFO significa que siempre se descuentan primero los días del período más antiguo
 * @param employeeId ID del trabajador
 * @param days Días a asignar (positivo para usar, negativo para devolver)
 * @param periodYear Año del período (opcional, para asignación manual con autorización)
 * @param allowArchived Si permite tomar días de períodos archivados (requiere autorización admin)
 * @returns Array de períodos actualizados
 */
export async function assignVacationDays(
  employeeId: string,
  days: number,
  periodYear?: number,
  allowArchived: boolean = false
): Promise<VacationPeriod[]> {
  try {
    // ✅ SIEMPRE incluir TODOS los períodos (incluyendo archivados) para FIFO correcto
    // El FIFO debe descontar del más antiguo sin importar si está archivado
    const periods = await getVacationPeriods(employeeId, true)
    
    if (periods.length === 0) {
      throw new Error('No hay períodos de vacaciones para este trabajador')
    }
    
    // Modo Manual: Si se especifica el año (con autorización de admin)
    if (periodYear) {
      const targetPeriod = periods.find(p => p.period_year === periodYear)
      if (!targetPeriod) {
        throw new Error(`No se encontró el período ${periodYear}`)
      }
      
      const availableInPeriod = targetPeriod.accumulated_days - targetPeriod.used_days
      
      // Verificar si el período está archivado
      if (targetPeriod.status === 'archived') {
        // Si está archivado y no tiene días disponibles, rechazar
        if (availableInPeriod <= 0 && days > 0) {
          throw new Error(
            `❌ El período ${periodYear} está archivado y no tiene días disponibles (saldo: ${availableInPeriod.toFixed(2)} días). ` +
            `Solo se pueden tomar días de períodos archivados si aún tienen saldo positivo.`
          )
        }
        
        // Si tiene días disponibles, permitir con advertencia
        if (days > 0 && availableInPeriod > 0) {
          console.warn(
            `⚠️ AUTORIZACIÓN ESPECIAL: Se están tomando ${days} días del período ARCHIVADO ${periodYear}. ` +
            `Disponible: ${availableInPeriod.toFixed(2)} días. Esta operación requiere autorización explícita de administrador.`
          )
        }
      }
      
      // Validar que no se excedan los días acumulados
      const newUsedDays = targetPeriod.used_days + days
      if (newUsedDays > targetPeriod.accumulated_days && days > 0) {
        throw new Error(
          `No se pueden tomar ${days} días del período ${periodYear}. ` +
          `Solo hay ${availableInPeriod.toFixed(2)} días disponibles.`
        )
      }
      
      // Actualizar estado si se completa el período
      const newStatus = (newUsedDays >= targetPeriod.accumulated_days) ? 'completed' : targetPeriod.status
      
      const { data: updated, error } = await supabase
        .from('vacation_periods')
        .update({ 
          used_days: Math.max(0, newUsedDays),
          status: newStatus
        })
        .eq('id', targetPeriod.id)
        .select()
        .single()
      
      if (error) throw error
      
      return [updated]
    }
    
    // ✅ Modo FIFO Automático: Ya tenemos TODOS LOS PERÍODOS (incluso archivados)
    // Esto permite dar vacaciones de períodos antiguos aunque estén archivados
    // El empleador puede otorgar días de cualquier período por mutuo acuerdo
    const allPeriods = periods
    
    if (allPeriods.length === 0) {
      throw new Error('No hay períodos de vacaciones para este trabajador')
    }
    
    // ✅ NUEVO: Manejar días negativos (DEVOLVER días)
    if (days < 0) {
      console.log(`🔄 Devolviendo ${Math.abs(days)} días (LIFO reverso)`)
      
      // Para devolver días, usar LIFO (Last In, First Out) - reverso de FIFO
      // Devolver días al periodo más reciente primero (que fue el último en usarse)
      const sortedPeriods = [...allPeriods].sort((a, b) => b.period_year - a.period_year) // Más reciente primero
      
      let remainingDaysToReturn = Math.abs(days) // Convertir a positivo
      const updatedPeriods: VacationPeriod[] = []
      
      for (const period of sortedPeriods) {
        if (remainingDaysToReturn <= 0) break
        
        // Solo devolver días a periodos que tengan días usados
        if (period.used_days <= 0) continue
        
        // Calcular cuántos días devolver a este período
        const daysToReturn = Math.min(remainingDaysToReturn, period.used_days)
        
        if (daysToReturn > 0) {
          const newUsedDays = period.used_days - daysToReturn
          
          // Actualizar estado (si tenía "completed", volver a "active")
          const newStatus = (newUsedDays < period.accumulated_days) ? 'active' : 'completed'
          
          const { data: updated, error } = await supabase
            .from('vacation_periods')
            .update({ 
              used_days: Math.max(0, newUsedDays),
              status: newStatus
            })
            .eq('id', period.id)
            .select()
            .single()
          
          if (error) throw error
          
          updatedPeriods.push(updated)
          remainingDaysToReturn -= daysToReturn
          
          console.log(`   ↩️ Devueltos ${daysToReturn} días al periodo ${period.period_year}`)
        }
      }
      
      if (remainingDaysToReturn > 0) {
        console.warn(`⚠️ Solo se pudieron devolver ${Math.abs(days) - remainingDaysToReturn} de ${Math.abs(days)} días`)
      }
      
      return updatedPeriods
    }
    
    // ✅ Modo FIFO Normal: Asignar días (positivo)
    // Ordenar por año ascendente (más antiguo primero) para FIFO
    // Esto asegura que se descuente primero de 2020, luego 2021, 2022, etc.
    const sortedPeriods = [...allPeriods].sort((a, b) => a.period_year - b.period_year)
    
    let remainingDays = days
    const updatedPeriods: VacationPeriod[] = []
    
    for (const period of sortedPeriods) {
      if (remainingDays <= 0) break
      
      // Calcular días disponibles en este período
      const availableInPeriod = period.accumulated_days - period.used_days
      
      // Calcular cuántos días asignar a este período
      const daysToAssign = Math.min(remainingDays, availableInPeriod)
      
      if (daysToAssign > 0) {
        const newUsedDays = period.used_days + daysToAssign
        
        // Actualizar estado si el período se completa
        const newStatus = (newUsedDays >= period.accumulated_days) ? 'completed' : period.status
        
        const { data: updated, error } = await supabase
          .from('vacation_periods')
          .update({ 
            used_days: newUsedDays,
            status: newStatus
          })
          .eq('id', period.id)
          .select()
          .single()
        
        if (error) throw error
        
        updatedPeriods.push(updated)
        remainingDays -= daysToAssign
      }
    }
    
    // Si quedan días sin asignar, significa que no hay suficientes días acumulados
    if (remainingDays > 0) {
      const totalAvailable = allPeriods.reduce((sum, p) => 
        sum + (p.accumulated_days - p.used_days), 0
      )
      throw new Error(
        `No hay suficientes días disponibles. ` +
        `Solicitados: ${days} días, Disponibles: ${totalAvailable.toFixed(2)} días, ` +
        `Faltan: ${remainingDays.toFixed(2)} días.`
      )
    }
    
    return updatedPeriods
  } catch (error) {
    console.error('Error al asignar días de vacaciones:', error)
    throw error
  }
}

/**
 * Obtiene el resumen de vacaciones de un trabajador
 * Calcula días acumulados basado en años de servicio (no año calendario)
 * @param employeeId ID del trabajador
 * @param hireDate Fecha de ingreso (para cálculo correcto)
 * @returns Resumen con períodos y totales
 */
export async function getVacationSummary(
  employeeId: string,
  hireDate?: Date | string
): Promise<{
  periods: VacationPeriod[]
  totalAccumulated: number
  totalUsed: number
  totalAvailable: number
}> {
  // ✅ Obtener solo períodos activos para mostrar en la tabla
  const periods = await getVacationPeriods(employeeId)
  
  // ✅ Pero obtener TODOS los períodos (incluyendo archivados) para calcular días usados correctamente
  const allPeriods = await getVacationPeriods(employeeId, true)
  
  // Si se proporciona hireDate, calcular días acumulados basado en años de servicio
  // Si no, usar la suma de períodos (para compatibilidad)
  let totalAccumulated: number
  if (hireDate) {
    totalAccumulated = calculateAccumulatedVacationDays(hireDate)
  } else {
    totalAccumulated = allPeriods.reduce((sum, p) => sum + p.accumulated_days, 0)
  }
  
  // ✅ Calcular días usados de TODOS los períodos (incluyendo archivados)
  const totalUsed = allPeriods.reduce((sum, p) => sum + p.used_days, 0)
  const totalAvailable = totalAccumulated - totalUsed
  
  return {
    periods, // Solo períodos activos para la tabla
    totalAccumulated,
    totalUsed, // Incluye días usados de períodos archivados
    totalAvailable,
  }
}

/**
 * Verifica si un trabajador ha cumplido al menos 1 año de servicio
 * @param hireDate Fecha de ingreso
 * @param referenceDate Fecha de referencia (por defecto: hoy)
 * @returns true si ha cumplido al menos 1 año
 */
export function hasCompletedOneYear(
  hireDate: Date | string,
  referenceDate: Date = new Date()
): boolean {
  const completeMonths = calculateCompleteMonthsWorked(hireDate, referenceDate)
  return completeMonths >= 12
}
