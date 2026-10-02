/**
 * Helper para manejo consistente de fechas de contrato
 * Usa comparación de strings YYYY-MM-DD para evitar problemas de zona horaria.
 * El día del vencimiento (end_date === today) el contrato sigue vigente (día laboral).
 */

export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Un contrato está vencido si tiene end_date (no es indefinido),
 * el tipo no es 'indefinido', y end_date < hoy.
 * Contratos indefinidos o sin end_date nunca están vencidos.
 */
export function isContractExpired(
  endDate: string | null | undefined,
  contractType?: string | null
): boolean {
  if (!endDate || contractType === 'indefinido') return false
  return endDate < getTodayString()
}

/**
 * Normaliza una fecha a string YYYY-MM-DD (sin zona horaria)
 */
export function toDateInputString(date: Date | string): string {
  if (typeof date === 'string') {
    return date.split('T')[0]
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Valida que end_date > start_date (o que end_date sea null = indefinido)
 */
export function isValidContractDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): boolean {
  if (!startDate) return false
  if (!endDate) return true // indefinido
  return endDate >= startDate
}

/**
 * Calcula días desde el vencimiento (positivo = días vencido, 0 = vence hoy, negativo = días restantes)
 */
export function daysSinceExpiration(endDate: string | null | undefined): number {
  if (!endDate) return Infinity
  const today = getTodayString()
  if (endDate >= today) return -(daysBetween(today, endDate))
  return daysBetween(endDate, today)
}

function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  const date1 = Date.UTC(y1, m1 - 1, d1)
  const date2 = Date.UTC(y2, m2 - 1, d2)
  return Math.floor((date2 - date1) / (1000 * 60 * 60 * 24))
}