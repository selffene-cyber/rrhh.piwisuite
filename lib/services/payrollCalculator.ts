import { PayrollCalculationInput, PayrollCalculationResult } from '@/types'
import { PreviredIndicators, getAFPRate, getUnemploymentInsuranceRate } from './previredAPI'

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
    permissionDiscount = 0,
  } = input

  // Sueldo base proporcional a días trabajados (redondear hacia arriba)
  const baseSalaryProportional = Math.ceil((baseSalary / 30) * daysWorked)

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
    
    // Proporcional a días trabajados (redondear hacia arriba)
    monthlyGratification = Math.ceil((gratificacionMensual / 30) * daysWorked)
  } else {
    // Si no hay indicadores, usar cálculo tradicional (25% del sueldo)
    // Esto es un fallback, idealmente siempre deberían estar los indicadores
    monthlyGratification = Math.ceil((baseSalary * 0.25 / 30) * daysWorked)
  }

  // Haberes imponibles (redondear todos hacia arriba)
  const otherTaxableEarnings = Math.ceil((input as any).otherTaxableEarnings || 0)
  const taxableEarnings = {
    baseSalary: baseSalaryProportional,
    bonuses: Math.ceil(bonuses),
    monthlyGratification,
    overtime: Math.ceil(overtime),
    vacation: Math.ceil(vacation),
    otherTaxableEarnings,
    total: Math.ceil(baseSalaryProportional + bonuses + monthlyGratification + overtime + vacation + otherTaxableEarnings),
  }

  // Base imponible (para AFP e impuestos) - ya está redondeada arriba
  const taxableBase = taxableEarnings.total

  // Haberes no imponibles (redondear todos hacia arriba)
  const nonTaxableEarnings = {
    transportation: Math.ceil(transportation),
    mealAllowance: Math.ceil(mealAllowance),
    aguinaldo: Math.ceil(aguinaldo),
    total: Math.ceil(transportation + mealAllowance + aguinaldo),
  }

  // Descuentos legales

  // Obtener tasas de AFP según indicadores de Previred
  const afpRates = getAFPRate(afp, indicators || null)
  // El trabajador paga el porcentaje de "trabajador" (ej: 11.44% para PROVIDA)
  // Este porcentaje incluye el 10% base + adicionales específicos de cada AFP
  const afpTotal = Math.ceil(taxableBase * (afpRates.trabajador / 100))
  // Separar en 10% base y adicional (redondear hacia arriba)
  const afp10 = Math.ceil(taxableBase * 0.10) // 10% base
  const afpAdditional = Math.ceil(afpTotal - afp10) // Diferencia (adicional específico de cada AFP)

  // Salud: según indicadores de Previred
  // FONASA: 7% del trabajador sobre la base imponible
  // ISAPRE: monto del plan en UF * valor UF del día (REEMPLAZA el 7%, no se suma)
  // El monto del plan en UF viene en input.healthPlanPercentage
  const healthPlanUF = (input as any).healthPlanPercentage || 0
  
  // Función helper para parsear números chilenos (puntos para miles, coma para decimales)
  const parseChileanNumber = (str: string): number => {
    if (!str) return 0
    return parseFloat(str.replace(/\./g, '').replace(',', '.'))
  }
  
  let health = 0
  if (healthSystem === 'FONASA') {
    // FONASA: 7% del trabajador sobre la base imponible (redondear hacia arriba)
    health = Math.ceil(taxableBase * 0.07)
  } else if (healthSystem === 'ISAPRE') {
    // ISAPRE: monto del plan en UF * valor UF del día (reemplaza el 7%)
    // Obtener valor de UF del día desde los indicadores
    let ufValue = 0
    if (indicators && indicators.UFValPeriodo) {
      ufValue = parseChileanNumber(indicators.UFValPeriodo)
    }
    
    // Calcular monto del plan: UF del plan * valor UF del día (redondear hacia arriba)
    health = Math.ceil(healthPlanUF * ufValue)
    
    // Debug: verificar cálculo de salud
    console.log('Cálculo de salud ISAPRE:', {
      healthSystem,
      healthPlanUF,
      ufValue,
      health,
      taxableBase,
    })
  }

  // Seguro de cesantía: según indicadores de Previred (redondear hacia arriba)
  const unemploymentRate = getUnemploymentInsuranceRate(indicators || null)
  const unemploymentInsurance = Math.ceil(taxableBase * (unemploymentRate / 100))

  // Impuesto único (usar tramos desde base de datos si están disponibles)
  let uniqueTax = 0
  let usedFallback = false
  // Renta Líquida Imponible (RLI) = Haberes imponibles - cotizaciones del trabajador
  // Cotizaciones del trabajador = AFP + Salud + Cesantía (redondear hacia arriba)
  const taxableForTax = Math.ceil(taxableBase - afpTotal - health - unemploymentInsurance)

  // Intentar obtener tramos desde la base de datos
  if (year && month && taxableForTax > 0) {
    try {
      const { getTaxBrackets } = await import('./taxBracketsScraper')
      let brackets = await getTaxBrackets(year, month, 'MENSUAL')
      
      // Si no hay tramos para el mes solicitado, intentar usar los del mes actual como fallback
      if (!brackets || brackets.length === 0) {
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        
        // Solo usar fallback si el mes solicitado es diferente al actual
        if (year !== currentYear || month !== currentMonth) {
          console.log(`No hay tramos para ${month}/${year}, intentando usar tramos del mes actual ${currentMonth}/${currentYear}`)
          brackets = await getTaxBrackets(currentYear, currentMonth, 'MENSUAL')
        }
      }
      
      if (brackets && brackets.length > 0) {
        // Ordenar tramos por "desde" ascendente para buscar correctamente
        const sortedBrackets = [...brackets].sort((a, b) => {
          const desdeA = a.desde ?? 0
          const desdeB = b.desde ?? 0
          return desdeA - desdeB
        })
        
        // Determinar qué mes se está usando realmente (puede ser diferente si se usó fallback)
        const actualYear = sortedBrackets[0] ? year : null
        const actualMonth = sortedBrackets[0] ? month : null
        
        // Debug: log para verificar cálculo
        console.log('Cálculo Impuesto Único:', {
          yearSolicitado: year,
          monthSolicitado: month,
          yearUsado: actualYear,
          monthUsado: actualMonth,
          taxableBase: Math.ceil(taxableBase),
          afpTotal: Math.ceil(afpTotal),
          health: Math.ceil(health),
          unemploymentInsurance: Math.ceil(unemploymentInsurance),
          taxableForTax: Math.ceil(taxableForTax),
          bracketsCount: sortedBrackets.length
        })
        
        // Buscar el tramo correspondiente
        let foundBracket = false
        for (const bracket of sortedBrackets) {
          const desde = bracket.desde
          const hasta = bracket.hasta
          
          // Verificar si la renta está en este tramo
          // Tramo exento: desde es null y hasta tiene valor
          if (desde === null && hasta !== null) {
            if (taxableForTax <= hasta) {
              // Está en el tramo exento
              uniqueTax = 0
              foundBracket = true
              console.log('Tramo exento aplicado:', { hasta, taxableForTax })
              break
            }
            // Si es mayor que el límite exento, continuar buscando el siguiente tramo
            continue
          }
          
          // Tramo normal: verificar si está dentro del rango
          // Rango: desde < RLI <= hasta (o hasta es null para el último tramo "Y MÁS")
          // Ejemplo: Tramo $938.817,01 - $2.086.260,00 significa: 938.817,01 < RLI <= 2.086.260,00
          if (desde !== null) {
            const isInRange = taxableForTax > desde && (hasta === null || taxableForTax <= hasta)
            
            if (isInRange) {
              // Calcular impuesto según la fórmula oficial: (RLI × Factor) - Rebaja
              const calculatedTax = (taxableForTax * bracket.factor) - bracket.cantidad_rebajar
              // Asegurar que no sea negativo y redondear hacia arriba
              uniqueTax = Math.max(0, Math.ceil(calculatedTax))
              foundBracket = true
              console.log('Tramo aplicado:', {
                desde,
                hasta,
                factor: bracket.factor,
                rebaja: bracket.cantidad_rebajar,
                calculatedTax,
                uniqueTax
              })
              break
            }
          }
        }
        
        // Si no se encontró tramo, log de advertencia
        if (!foundBracket && taxableForTax > 0) {
          console.error('❌ NO SE ENCONTRÓ TRAMO para RLI:', Math.ceil(taxableForTax))
          console.error('Tramos disponibles:', sortedBrackets.map(b => ({ 
            desde: b.desde, 
            hasta: b.hasta,
            factor: b.factor,
            rebaja: b.cantidad_rebajar
          })))
          usedFallback = true
        }
      } else {
        console.warn(`No se encontraron tramos en BD para ${month}/${year}, usando valores por defecto`)
        usedFallback = true
      }
    } catch (error) {
      console.error('Error al obtener tramos desde BD:', error)
      usedFallback = true
    }
  } else {
    usedFallback = true
  }
  
  // Si no se encontraron tramos en BD o no se calculó impuesto, usar valores por defecto (fallback)
  // SOLO usar fallback si realmente no hay tramos disponibles
  if (usedFallback && uniqueTax === 0 && taxableForTax > 0) {
    console.warn('⚠️ Usando valores por defecto (fallback) - Los tramos del SII no están disponibles')
    // Tabla progresiva simplificada (valores por defecto - solo como último recurso)
    // NOTA: Estos valores son aproximados y deberían reemplazarse por los tramos reales del SII
    // Redondear hacia arriba todos los cálculos
    if (taxableForTax > 3500000) {
      uniqueTax = Math.ceil((taxableForTax - 3500000) * 0.23 + 135000)
    } else if (taxableForTax > 2500000) {
      uniqueTax = Math.ceil((taxableForTax - 2500000) * 0.135 + 80000)
    } else if (taxableForTax > 1500000) {
      uniqueTax = Math.ceil((taxableForTax - 1500000) * 0.08 + 20000)
    } else if (taxableForTax > 1000000) {
      uniqueTax = Math.ceil((taxableForTax - 1000000) * 0.04)
    }
    // Si es menor o igual a 1.000.000, el impuesto es 0 (exento)
  }

  const legalDeductions = {
    afp10,
    afpAdditional,
    health,
    unemploymentInsurance,
    uniqueTax,
    total: Math.ceil(afpTotal + health + unemploymentInsurance + uniqueTax),
  }

  // Otros descuentos (redondear hacia arriba)
  const otherDeductions = {
    loans: Math.ceil(loans),
    advances: Math.ceil(advances),
    permissionDiscount: Math.ceil(permissionDiscount),
    total: Math.ceil(loans + advances + permissionDiscount),
  }

  // Total haberes (ya están redondeados arriba)
  const totalEarnings = taxableEarnings.total + nonTaxableEarnings.total

  // Total descuentos (ya están redondeados arriba)
  const totalDeductions = legalDeductions.total + otherDeductions.total

  // Líquido a pagar (redondear hacia arriba)
  const netPay = Math.ceil(totalEarnings - totalDeductions)

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

