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
 * @param hireDate Fecha de ingreso del trabajador
 * @param referenceDate Fecha de referencia (por defecto: hoy)
 * @returns Días acumulados (1.25 por mes trabajado)
 */
export function calculateAccumulatedVacations(
  hireDate: Date | string,
  referenceDate: Date = new Date()
): number {
  const hire = typeof hireDate === 'string' ? new Date(hireDate) : hireDate
  const ref = referenceDate

  // Calcular diferencia en meses
  const yearsDiff = ref.getFullYear() - hire.getFullYear()
  const monthsDiff = ref.getMonth() - hire.getMonth()
  const daysDiff = ref.getDate() - hire.getDate()

  // Calcular meses totales trabajados
  let totalMonths = yearsDiff * 12 + monthsDiff
  
  // Si el día del mes es mayor o igual, contar el mes completo
  if (daysDiff >= 0) {
    totalMonths += 1
  }

  // Asegurar que sea al menos 0
  totalMonths = Math.max(0, totalMonths)

  // Calcular días acumulados: meses × 1.25
  const accumulatedDays = totalMonths * 1.25

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


