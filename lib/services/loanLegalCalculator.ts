/**
 * Calcula el límite legal de descuentos voluntarios según el Código del Trabajo art. 58
 * El tope es del 15% de la remuneración devengada del mes
 */

export interface LegalLimitCalculation {
  monthlySalary: number
  workedDays: number
  licenseDays: number
  remunerationDevengada: number
  maxVoluntaryDiscount: number
  installmentAmount: number
  exceedsLimit: boolean
  excessAmount: number
  allowedDiscount: number
  deferredAmount: number
}

/**
 * Calcula el límite legal de descuentos voluntarios
 * @param monthlySalary Sueldo mensual base del trabajador
 * @param workedDays Días trabajados en el mes
 * @param licenseDays Días de licencia médica en el mes
 * @param installmentAmount Monto de la cuota del préstamo
 */
export function calculateLegalDiscountLimit(
  monthlySalary: number,
  workedDays: number,
  licenseDays: number,
  installmentAmount: number
): LegalLimitCalculation {
  // Calcular remuneración devengada (proporcional a días trabajados)
  // Remuneración devengada = (Sueldo mensual / 30) * días trabajados
  const remunerationDevengada = Math.ceil((monthlySalary / 30) * workedDays)

  // Límite legal: 15% de la remuneración devengada
  const maxVoluntaryDiscount = Math.floor(remunerationDevengada * 0.15)

  // Verificar si la cuota excede el límite
  const exceedsLimit = installmentAmount > maxVoluntaryDiscount
  const excessAmount = exceedsLimit ? installmentAmount - maxVoluntaryDiscount : 0
  const allowedDiscount = exceedsLimit ? maxVoluntaryDiscount : installmentAmount
  const deferredAmount = exceedsLimit ? excessAmount : 0

  return {
    monthlySalary,
    workedDays,
    licenseDays,
    remunerationDevengada,
    maxVoluntaryDiscount,
    installmentAmount,
    exceedsLimit,
    excessAmount,
    allowedDiscount,
    deferredAmount,
  }
}

/**
 * Genera mensaje de alerta cuando se excede el límite legal
 */
export function getLegalLimitAlert(calculation: LegalLimitCalculation): string {
  if (!calculation.exceedsLimit) {
    return ''
  }

  return `⚠️ ALERTA LEGAL: La cuota de $${calculation.installmentAmount.toLocaleString('es-CL')} excede el límite legal del 15% de la remuneración devengada ($${calculation.maxVoluntaryDiscount.toLocaleString('es-CL')}). Se requerirá autorización del trabajador y el sistema reprogramará automáticamente el exceso ($${calculation.excessAmount.toLocaleString('es-CL')}) a cuotas siguientes.`
}

/**
 * Genera mensaje informativo sobre el cálculo
 */
export function getLegalLimitInfo(calculation: LegalLimitCalculation): string {
  return `Remuneración devengada: $${calculation.remunerationDevengada.toLocaleString('es-CL')} (${calculation.workedDays} días trabajados) | Límite legal (15%): $${calculation.maxVoluntaryDiscount.toLocaleString('es-CL')}`
}

