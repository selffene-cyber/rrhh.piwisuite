import { PayrollCalculationInput, PayrollCalculationResult } from '@/types'
import { PreviredIndicators, getAFPRate, getUnemploymentInsuranceRate, getHealthRate } from './previredAPI'

/**
 * Calcula liquidación de sueldo según normativa chilena
 * @param input Datos de entrada para el cálculo
 * @param indicators Indicadores previsionales de Previred (opcional). Si no se proporcionan, se usan valores por defecto.
 * @param year Año de la liquidación (para obtener indicadores si no se proporcionan)
 * @param month Mes de la liquidación (para obtener indicadores si no se proporcionan)
 */
export async function calculatePayroll(
  input: PayrollCalculationInput,
  indicators?: PreviredIndicators | null,
  year?: number,
  month?: number
): Promise<PayrollCalculationResult> {
  const {
    baseSalary,
    daysWorked,
    daysLeave,
    afp,
    healthSystem,
    bonuses = 0,
    overtime = 0,
    vacation = 0,
    transportation = 0,
    mealAllowance = 0,
    aguinaldo = 0,
    loans = 0,
    advances = 0,
  } = input

  // Sueldo base proporcional a días trabajados
  const baseSalaryProportional = (baseSalary / 30) * daysWorked

  // Gratificación mensual legal
  // Según normativa chilena:
  // - La gratificación es el 25% del sueldo base mensual
  // - PERO tiene un tope legal: (4,75 × Ingreso Mínimo Mensual) / 12
  // - El Ingreso Mínimo Mensual está en los indicadores como RMITrabDepeInd
  // - Se usa el MENOR entre el 25% del sueldo y el tope legal
  let monthlyGratification = 0
  if (indicators && indicators.RMITrabDepeInd) {
    // Parsear número chileno (puntos para miles, coma para decimales)
    const parseChileanNumber = (str: string): number => {
      if (!str) return 0
      return parseFloat(str.replace(/\./g, '').replace(',', '.'))
    }
    
    const ingresoMinimo = parseChileanNumber(indicators.RMITrabDepeInd)
    const topeGratificacion = (4.75 * ingresoMinimo) / 12
    const gratificacion25Porciento = baseSalary * 0.25
    
    // La gratificación es el menor entre el tope legal y el 25% del sueldo
    const gratificacionMensual = Math.min(topeGratificacion, gratificacion25Porciento)
    
    // Proporcional a días trabajados
    monthlyGratification = (gratificacionMensual / 30) * daysWorked
  } else {
    // Si no hay indicadores, usar cálculo tradicional (25% del sueldo)
    // Esto es un fallback, idealmente siempre deberían estar los indicadores
    monthlyGratification = (baseSalary * 0.25 / 30) * daysWorked
  }

  // Haberes imponibles
  const taxableEarnings = {
    baseSalary: baseSalaryProportional,
    bonuses,
    monthlyGratification,
    overtime,
    vacation,
    total: baseSalaryProportional + bonuses + monthlyGratification + overtime + vacation,
  }

  // Base imponible (para AFP e impuestos)
  const taxableBase = taxableEarnings.total

  // Haberes no imponibles
  const nonTaxableEarnings = {
    transportation,
    mealAllowance,
    aguinaldo,
    total: transportation + mealAllowance + aguinaldo,
  }

  // Descuentos legales

  // Obtener tasas de AFP según indicadores de Previred
  const afpRates = getAFPRate(afp, indicators || null)
  // El trabajador paga el porcentaje de "trabajador" (ej: 11.44% para PROVIDA)
  // Este porcentaje incluye el 10% base + adicionales específicos de cada AFP
  const afpTotal = taxableBase * (afpRates.trabajador / 100)
  // Separar en 10% base y adicional
  const afp10 = taxableBase * 0.10 // 10% base
  const afpAdditional = afpTotal - afp10 // Diferencia (adicional específico de cada AFP)

  // Salud: según indicadores de Previred
  // FONASA: 7% del trabajador sobre la base imponible (siempre)
  // ISAPRE: 7% base + porcentaje adicional del plan del trabajador
  // El porcentaje del plan viene en input.healthPlanPercentage
  const healthPlanPercentage = (input as any).healthPlanPercentage || 0
  const healthRate = getHealthRate(healthSystem, healthPlanPercentage, indicators || null)
  const health = taxableBase * (healthRate / 100)
  
  // Debug: verificar cálculo de salud
  console.log('Cálculo de salud:', {
    healthSystem,
    healthPlanPercentage,
    healthRate,
    taxableBase,
    health,
  })

  // Seguro de cesantía: según indicadores de Previred
  const unemploymentRate = getUnemploymentInsuranceRate(indicators || null)
  const unemploymentInsurance = taxableBase * (unemploymentRate / 100)

  // Impuesto único (tabla progresiva simplificada)
  // Rango 1: hasta 1,000,000 -> 0%
  // Rango 2: 1,000,001 - 1,500,000 -> 4%
  // Rango 3: 1,500,001 - 2,500,000 -> 8%
  // Rango 4: 2,500,001 - 3,500,000 -> 13.5%
  // Rango 5: más de 3,500,000 -> 23%
  let uniqueTax = 0
  // Base para impuesto: renta imponible menos AFP total y seguro de cesantía
  const taxableForTax = taxableBase - afpTotal - unemploymentInsurance

  if (taxableForTax > 3500000) {
    uniqueTax = (taxableForTax - 3500000) * 0.23 + 135000 // 23% sobre exceso + tramos anteriores
  } else if (taxableForTax > 2500000) {
    uniqueTax = (taxableForTax - 2500000) * 0.135 + 80000 // 13.5% sobre exceso + tramos anteriores
  } else if (taxableForTax > 1500000) {
    uniqueTax = (taxableForTax - 1500000) * 0.08 + 20000 // 8% sobre exceso + tramos anteriores
  } else if (taxableForTax > 1000000) {
    uniqueTax = (taxableForTax - 1000000) * 0.04 // 4% sobre exceso
  }

  const legalDeductions = {
    afp10,
    afpAdditional,
    health,
    unemploymentInsurance,
    uniqueTax,
    total: afpTotal + health + unemploymentInsurance + uniqueTax,
  }

  // Otros descuentos
  const otherDeductions = {
    loans,
    advances,
    total: loans + advances,
  }

  // Total haberes
  const totalEarnings = taxableEarnings.total + nonTaxableEarnings.total

  // Total descuentos
  const totalDeductions = legalDeductions.total + otherDeductions.total

  // Líquido a pagar
  const netPay = totalEarnings - totalDeductions

  return {
    taxableBase,
    taxableEarnings,
    nonTaxableEarnings,
    legalDeductions,
    otherDeductions,
    netPay: Math.max(0, netPay), // No puede ser negativo
  }
}

/**
 * Formatea número a formato chileno (puntos para miles)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Convierte número a texto en español
 */
export function numberToWords(num: number): string {
  const ones = [
    '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'
  ]
  const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const hundreds = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  if (num === 0) return 'CERO'

  let result = ''
  const millions = Math.floor(num / 1000000)
  const thousands = Math.floor((num % 1000000) / 1000)
  const remainder = num % 1000

  if (millions > 0) {
    result += convertHundreds(millions, ones, tens, hundreds) + ' MILLON' + (millions > 1 ? 'ES' : '') + ' '
  }

  if (thousands > 0) {
    result += convertHundreds(thousands, ones, tens, hundreds) + ' MIL '
  }

  if (remainder > 0) {
    result += convertHundreds(remainder, ones, tens, hundreds)
  }

  return result.trim()
}

function convertHundreds(num: number, ones: string[], tens: string[], hundreds: string[]): string {
  if (num === 0) return ''
  if (num < 20) return ones[num]
  if (num < 100) {
    const ten = Math.floor(num / 10)
    const one = num % 10
    if (one === 0) return tens[ten]
    if (ten === 2) return 'VEINTI' + ones[one]
    return tens[ten] + ' Y ' + ones[one]
  }
  const hundred = Math.floor(num / 100)
  const remainder = num % 100
  if (remainder === 0) {
    if (hundred === 1) return 'CIEN'
    return hundreds[hundred]
  }
  if (hundred === 1) return 'CIENTO ' + convertHundreds(remainder, ones, tens, hundreds)
  return hundreds[hundred] + ' ' + convertHundreds(remainder, ones, tens, hundreds)
}

