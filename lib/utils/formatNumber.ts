/**
 * Formatea un número para mostrar en input con separador de miles (puntos)
 * Ejemplo: 1000000 -> "1.000.000"
 */
export function formatNumberForInput(value: number | string): string {
  if (!value && value !== 0) return ''
  const numStr = String(value).replace(/\./g, '')
  const num = parseFloat(numStr)
  if (isNaN(num)) return ''
  return num.toLocaleString('es-CL', { maximumFractionDigits: 0 })
}

/**
 * Parsea un string con formato chileno (puntos para miles) a número
 * Ejemplo: "1.000.000" -> 1000000
 */
export function parseFormattedNumber(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

