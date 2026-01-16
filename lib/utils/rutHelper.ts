/**
 * Helper para formateo y validación de RUT chileno
 * Implementa algoritmo Módulo 11 con dígito verificador
 */

/**
 * Limpia el RUT dejando solo dígitos y K/k
 * Ej: "18.968.229-8" → "189682298"
 */
export function cleanRut(rut: string): string {
  if (!rut) return ''
  return rut.toString().replace(/[^0-9kK]/g, '').toUpperCase()
}

/**
 * Formatea el RUT al formato chileno: XX.XXX.XXX-X
 * Ej: "189682298" → "18.968.229-8"
 * Ej: "96822988" → "9.682.298-8"
 */
export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut)
  if (!cleaned) return ''
  
  // Separar cuerpo y DV
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)
  
  if (!body) return cleaned
  
  // Formatear cuerpo con puntos (cada 3 dígitos de derecha a izquierda)
  const reversed = body.split('').reverse().join('')
  const formatted = reversed.match(/.{1,3}/g)?.join('.') || reversed
  const bodyFormatted = formatted.split('').reverse().join('')
  
  return `${bodyFormatted}-${dv}`
}

/**
 * Calcula el dígito verificador usando Módulo 11
 * @param rutBody - Cuerpo del RUT sin DV (ej: "18968229")
 * @returns Dígito verificador: "0"-"9" o "K"
 */
export function calculateDV(rutBody: string): string {
  const cleaned = rutBody.replace(/[^0-9]/g, '')
  if (!cleaned) return ''
  
  // Multiplicadores cíclicos 2, 3, 4, 5, 6, 7
  const multipliers = [2, 3, 4, 5, 6, 7]
  let sum = 0
  let multiplierIndex = 0
  
  // Recorrer de derecha a izquierda
  for (let i = cleaned.length - 1; i >= 0; i--) {
    const digit = parseInt(cleaned[i], 10)
    sum += digit * multipliers[multiplierIndex]
    multiplierIndex = (multiplierIndex + 1) % 6
  }
  
  const remainder = sum % 11
  const dv = 11 - remainder
  
  if (dv === 11) return '0'
  if (dv === 10) return 'K'
  return dv.toString()
}

/**
 * Valida que el RUT tenga un dígito verificador correcto (Módulo 11)
 * @param rut - RUT completo (puede estar formateado o no)
 * @returns true si es válido, false si no
 */
export function validateRutModulo11(rut: string): boolean {
  const cleaned = cleanRut(rut)
  
  // Validaciones básicas
  if (!cleaned || cleaned.length < 2) return false
  
  // Separar cuerpo y DV
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)
  
  // El cuerpo debe tener entre 7 y 8 dígitos (rango típico en Chile)
  if (body.length < 7 || body.length > 8) return false
  
  // Validar que el cuerpo sea solo números
  if (!/^\d+$/.test(body)) return false
  
  // Validar que el DV sea 0-9 o K
  if (!/^[0-9K]$/.test(dv)) return false
  
  // Calcular DV esperado
  const expectedDV = calculateDV(body)
  
  return dv === expectedDV
}

/**
 * Valida estructura básica del RUT (sin validar módulo 11)
 * Útil para validaciones no críticas
 */
export function isValidRutFormat(rut: string): boolean {
  const cleaned = cleanRut(rut)
  
  // Debe tener entre 8 y 9 caracteres (7-8 dígitos + DV)
  if (cleaned.length < 8 || cleaned.length > 9) return false
  
  // El cuerpo debe ser solo números
  const body = cleaned.slice(0, -1)
  if (!/^\d+$/.test(body)) return false
  
  // El DV debe ser 0-9 o K
  const dv = cleaned.slice(-1)
  if (!/^[0-9K]$/.test(dv)) return false
  
  return true
}

/**
 * Extrae el cuerpo del RUT (sin DV)
 * Ej: "18.968.229-8" → "18968229"
 */
export function getRutBody(rut: string): string {
  const cleaned = cleanRut(rut)
  return cleaned.slice(0, -1)
}

/**
 * Extrae el dígito verificador del RUT
 * Ej: "18.968.229-8" → "8"
 */
export function getRutDV(rut: string): string {
  const cleaned = cleanRut(rut)
  return cleaned.slice(-1)
}

/**
 * Compara dos RUTs ignorando formato
 * Útil para búsquedas
 */
export function areRutsEqual(rut1: string, rut2: string): boolean {
  return cleanRut(rut1) === cleanRut(rut2)
}

/**
 * Normaliza el RUT para guardado en BD
 * Siempre retorna formato: XX.XXX.XXX-X
 * Si no es válido, retorna string vacío
 */
export function normalizeRutForStorage(rut: string): string {
  const cleaned = cleanRut(rut)
  if (!cleaned || !isValidRutFormat(cleaned)) return ''
  return formatRut(cleaned)
}

/**
 * Valida RUT con mensaje de error
 * @returns { valid: boolean, error?: string }
 */
export function validateRutWithMessage(rut: string): { valid: boolean; error?: string } {
  if (!rut || !rut.trim()) {
    return { valid: false, error: 'RUT es requerido' }
  }
  
  const cleaned = cleanRut(rut)
  
  if (cleaned.length < 8) {
    return { valid: false, error: 'RUT muy corto (mínimo 7 dígitos + DV)' }
  }
  
  if (cleaned.length > 9) {
    return { valid: false, error: 'RUT muy largo (máximo 8 dígitos + DV)' }
  }
  
  if (!isValidRutFormat(cleaned)) {
    return { valid: false, error: 'Formato de RUT inválido' }
  }
  
  if (!validateRutModulo11(cleaned)) {
    return { valid: false, error: 'RUT inválido: dígito verificador incorrecto' }
  }
  
  return { valid: true }
}

/**
 * Hook para detectar si el RUT fue modificado
 * Útil para retrocompatibilidad (no validar si no cambió)
 */
export function hasRutChanged(originalRut: string, currentRut: string): boolean {
  return cleanRut(originalRut) !== cleanRut(currentRut)
}

// =====================================================
// Ejemplos de uso:
// =====================================================

/*
// 1. Formatear en display
const formatted = formatRut('189682298')  // → "18.968.229-8"

// 2. Validar antes de guardar
const { valid, error } = validateRutWithMessage('18.968.229-8')
if (!valid) {
  alert(error)
}

// 3. Limpiar para búsqueda
const cleaned = cleanRut('18.968.229-8')  // → "189682298"

// 4. Normalizar para BD
const normalized = normalizeRutForStorage('189682298')  // → "18.968.229-8"

// 5. Comparar RUTs
if (areRutsEqual('18.968.229-8', '189682298')) {
  console.log('Son el mismo RUT')
}

// 6. Validar Módulo 11
if (validateRutModulo11('18.968.229-8')) {
  console.log('RUT válido')
}

// 7. Calcular DV
const dv = calculateDV('18968229')  // → "8"
*/


