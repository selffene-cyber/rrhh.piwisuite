/**
 * Calculadora de vacaciones según Código del Trabajo chileno
 * 
 * Reglas legales:
 * - 15 días hábiles de vacaciones por año trabajado
 * - 1.25 días hábiles por mes trabajado
 * - Las vacaciones son pagadas como remuneración normal
 */

/**
 * Calcula los días hábiles entre dos fechas (excluyendo domingos)
 * Nota: Esta es una versión simplificada. Para una versión completa,
 * debería excluir también festivos chilenos.
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    // Excluir domingos (0)
    if (dayOfWeek !== 0) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

/**
 * Calcula las vacaciones acumuladas desde la fecha de ingreso
 * Según Código del Trabajo: 1.25 días hábiles por mes completo trabajado
 * Un mes se considera completo cuando se alcanza el mismo día del mes siguiente
 * @param hireDate Fecha de ingreso del trabajador
 * @param referenceDate Fecha de referencia (por defecto: hoy)
 * @returns Días acumulados (1.25 por mes completo trabajado)
 */
export function calculateAccumulatedVacations(
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
    // Ya completó el mes actual (no sumar, ya está incluido)
    completeMonths += 0
  } else {
    // Aún no ha completado el mes actual, restar 1
    completeMonths -= 1
  }
  
  // Asegurar que sea al menos 0
  completeMonths = Math.max(0, completeMonths)

  // Calcular días acumulados: meses completos × 1.25
  const accumulatedDays = completeMonths * 1.25

  return Math.round(accumulatedDays * 100) / 100 // Redondear a 2 decimales
}

/**
 * Calcula el saldo disponible de vacaciones
 * @param accumulatedDays Días acumulados
 * @param usedDays Días usados
 * @returns Saldo disponible
 */
export function calculateAvailableVacations(
  accumulatedDays: number,
  usedDays: number
): number {
  return Math.max(0, accumulatedDays - usedDays)
}

/**
 * Valida si un trabajador tiene suficientes días de vacaciones disponibles
 * @param availableDays Días disponibles
 * @param requestedDays Días solicitados
 * @returns true si tiene suficientes días
 */
export function hasEnoughVacationDays(
  availableDays: number,
  requestedDays: number
): boolean {
  return availableDays >= requestedDays
}


