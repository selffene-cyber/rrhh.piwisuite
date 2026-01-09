/**
 * Motor de Cálculo de Liquidaciones v2
 * Soporta AFP (Previred) y Regímenes Especiales (DIPRECA, CAPREDENA, etc.)
 */

import { 
  PreviredIndicators, 
  getAFPRate, 
  getUnemploymentInsuranceRate,
  getUnemploymentInsuranceEmployerRate,
  getSISRate 
} from './previredAPI'
import { 
  EmployeeWithPrevision, 
  PrevisionCalculationResult,
  shouldCalculateAFC 
} from '@/types/prevision'

// ============================================
// TIPOS
// ============================================

export interface PayrollCalculationInputV2 {
  // Datos del empleado
  employee: EmployeeWithPrevision
  
  // Período
  year: number
  month: number
  daysWorked: number
  daysLeave?: number
  
  // Haberes imponibles
  baseSalary: number
  bonuses?: number
  overtime?: number
  vacation?: number
  otherTaxableEarnings?: number
  
  // Haberes no imponibles
  transportation?: number
  mealAllowance?: number
  aguinaldo?: number
  otherNonTaxableEarnings?: number
  
  // Descuentos
  loans?: number
  advances?: number
  permissionDiscount?: number
  otherDeductions?: number
  
  // Indicadores (opcional, se obtienen automáticamente si no se proveen)
  indicators?: PreviredIndicators | null
}

export interface PayrollCalculationResultV2 {
  // Régimen aplicado
  prevision: PrevisionCalculationResult
  
  // Haberes
  taxableEarnings: {
    baseSalary: number
    bonuses: number
    monthlyGratification: number
    overtime: number
    vacation: number
    otherTaxableEarnings: number
    total: number
  }
  
  nonTaxableEarnings: {
    transportation: number
    mealAllowance: number
    aguinaldo: number
    otherNonTaxableEarnings: number
    total: number
  }
  
  // Descuentos legales
  legalDeductions: {
    pension: number // AFP o DIPRECA/CAPREDENA
    health: number // FONASA/ISAPRE o manual
    sis?: number // Solo AFP
    afc?: number // Solo si aplica
    uniqueTax: number // Impuesto único
    total: number
  }
  
  // Otros descuentos
  otherDeductions: {
    loans: number
    advances: number
    permissionDiscount: number
    otherDeductions: number
    total: number
  }
  
  // Totales
  grossPay: number // Total haberes
  totalDeductions: number
  netPay: number
  
  // Contribuciones empleador (para reportes)
  employerContributions: {
    sis?: number
    afc?: number
    pension?: number // Solo OTRO_REGIMEN
    total: number
  }
  
  // Metadata
  calculationDate: string
  taxableBase: number
  indicators: PreviredIndicators | null
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

export async function calculatePayrollV2(
  input: PayrollCalculationInputV2
): Promise<PayrollCalculationResultV2> {
  
  const { employee } = input
  
  // Determinar qué flujo usar
  if (employee.previsional_regime === 'AFP') {
    return calculateAFPRegime(input)
  } else {
    return calculateOtherRegime(input)
  }
}

// ============================================
// FLUJO AFP (PREVIRED)
// ============================================

async function calculateAFPRegime(
  input: PayrollCalculationInputV2
): Promise<PayrollCalculationResultV2> {
  
  const {
    employee,
    year,
    month,
    daysWorked,
    baseSalary,
    bonuses = 0,
    overtime = 0,
    vacation = 0,
    otherTaxableEarnings = 0,
    transportation = 0,
    mealAllowance = 0,
    aguinaldo = 0,
    otherNonTaxableEarnings = 0,
    loans = 0,
    advances = 0,
    permissionDiscount = 0,
    otherDeductions = 0,
    indicators = null
  } = input
  
  // Obtener indicadores si no se proveyeron
  let previredIndicators = indicators
  if (!previredIndicators) {
    const { getPreviredIndicators } = await import('./previredAPI')
    previredIndicators = await getPreviredIndicators(month, year)
  }
  
  // 1. HABERES IMPONIBLES
  const baseSalaryProportional = Math.ceil((baseSalary / 30) * daysWorked)
  
  // Gratificación mensual (25% con tope legal)
  let monthlyGratification = 0
  if (previredIndicators?.RMITrabDepeInd) {
    const parseChileanNumber = (str: string): number => {
      if (!str) return 0
      return parseFloat(str.replace(/\./g, '').replace(',', '.'))
    }
    const ingresoMinimo = parseChileanNumber(previredIndicators.RMITrabDepeInd)
    const topeGratificacion = (4.75 * ingresoMinimo) / 12
    const gratificacion25Porciento = baseSalary * 0.25
    const gratificacionMensual = Math.min(topeGratificacion, gratificacion25Porciento)
    monthlyGratification = Math.ceil((gratificacionMensual / 30) * daysWorked)
  } else {
    monthlyGratification = Math.ceil((baseSalary * 0.25 / 30) * daysWorked)
  }
  
  const taxableEarnings = {
    baseSalary: baseSalaryProportional,
    bonuses: Math.ceil(bonuses),
    monthlyGratification,
    overtime: Math.ceil(overtime),
    vacation: Math.ceil(vacation),
    otherTaxableEarnings: Math.ceil(otherTaxableEarnings),
    total: 0
  }
  taxableEarnings.total = Math.ceil(
    taxableEarnings.baseSalary + 
    taxableEarnings.bonuses + 
    taxableEarnings.monthlyGratification + 
    taxableEarnings.overtime + 
    taxableEarnings.vacation + 
    taxableEarnings.otherTaxableEarnings
  )
  
  const taxableBase = taxableEarnings.total
  
  // 2. HABERES NO IMPONIBLES
  const nonTaxableEarnings = {
    transportation: Math.ceil(transportation),
    mealAllowance: Math.ceil(mealAllowance),
    aguinaldo: Math.ceil(aguinaldo),
    otherNonTaxableEarnings: Math.ceil(otherNonTaxableEarnings),
    total: 0
  }
  nonTaxableEarnings.total = Math.ceil(
    nonTaxableEarnings.transportation + 
    nonTaxableEarnings.mealAllowance + 
    nonTaxableEarnings.aguinaldo + 
    nonTaxableEarnings.otherNonTaxableEarnings
  )
  
  // 3. DESCUENTOS PREVISIONALES
  
  // AFP
  const afpRates = getAFPRate(employee.afp || 'PROVIDA', previredIndicators)
  const afpTotal = Math.ceil(taxableBase * (afpRates.trabajador / 100))
  const afp10 = Math.ceil(taxableBase * 0.10)
  const afpAdditional = afpTotal - afp10
  
  // SIS (Seguro Invalidez y Sobrevivencia)
  const sisRate = getSISRate(previredIndicators)
  const sisAmount = Math.ceil(taxableBase * (sisRate / 100))
  
  // SALUD
  let healthAmount = 0
  if (employee.health_system === 'FONASA') {
    healthAmount = Math.ceil(taxableBase * 0.07)
  } else if (employee.health_system === 'ISAPRE') {
    const percentage = employee.health_plan_percentage || 7
    healthAmount = Math.ceil(taxableBase * (percentage / 100))
  }
  
  // AFC (Seguro de Cesantía) - Solo si aplica
  let afcAmount = 0
  if (shouldCalculateAFC(employee)) {
    const afcRate = getUnemploymentInsuranceRate(previredIndicators)
    afcAmount = Math.ceil(taxableBase * (afcRate / 100))
  }
  
  // 4. IMPUESTO ÚNICO (usando la lógica existente)
  const uniqueTax = await calculateUniqueTax(taxableBase, year, month)
  
  // 5. DESCUENTOS LEGALES TOTALES
  const legalDeductions = {
    pension: afpTotal,
    health: healthAmount,
    sis: sisAmount,
    afc: afcAmount,
    uniqueTax,
    total: afpTotal + healthAmount + sisAmount + afcAmount + uniqueTax
  }
  
  // 6. OTROS DESCUENTOS
  const otherDeductionsTotal = {
    loans: Math.ceil(loans),
    advances: Math.ceil(advances),
    permissionDiscount: Math.ceil(permissionDiscount),
    otherDeductions: Math.ceil(otherDeductions),
    total: 0
  }
  otherDeductionsTotal.total = Math.ceil(
    otherDeductionsTotal.loans + 
    otherDeductionsTotal.advances + 
    otherDeductionsTotal.permissionDiscount + 
    otherDeductionsTotal.otherDeductions
  )
  
  // 7. CONTRIBUCIONES EMPLEADOR
  const sisEmployer = sisAmount // SIS lo paga el empleador
  const afcEmployer = shouldCalculateAFC(employee) 
    ? Math.ceil(taxableBase * (getUnemploymentInsuranceEmployerRate(employee.contract_type, previredIndicators) / 100))
    : 0
  
  const employerContributions = {
    sis: sisEmployer,
    afc: afcEmployer,
    total: sisEmployer + afcEmployer
  }
  
  // 8. TOTALES
  const grossPay = taxableEarnings.total + nonTaxableEarnings.total
  const totalDeductions = legalDeductions.total + otherDeductionsTotal.total
  const netPay = grossPay - totalDeductions
  
  // 9. METADATA DE PREVISIÓN
  const prevision: PrevisionCalculationResult = {
    regime: 'AFP',
    regimeType: employee.afp || 'PROVIDA',
    regimeLabel: `AFP ${employee.afp || 'PROVIDA'}`,
    pension: {
      amount: afpTotal,
      percentage: afpRates.trabajador,
      base: taxableBase,
      label: `AFP ${employee.afp || 'PROVIDA'}`
    },
    health: {
      amount: healthAmount,
      percentage: employee.health_system === 'ISAPRE' 
        ? (employee.health_plan_percentage || 7) 
        : 7,
      base: taxableBase,
      label: employee.health_system === 'ISAPRE' 
        ? `ISAPRE ${employee.health_plan || ''}` 
        : 'FONASA'
    },
    afp: {
      obligatorio: afp10,
      comision: afpAdditional,
      total: afpTotal
    },
    sis: {
      amount: sisAmount,
      percentage: sisRate
    },
    afc: shouldCalculateAFC(employee) ? {
      amount: afcAmount,
      percentage: getUnemploymentInsuranceRate(previredIndicators)
    } : undefined,
    employer: employerContributions
  }
  
  return {
    prevision,
    taxableEarnings,
    nonTaxableEarnings,
    legalDeductions,
    otherDeductions: otherDeductionsTotal,
    grossPay,
    totalDeductions,
    netPay,
    employerContributions,
    calculationDate: new Date().toISOString(),
    taxableBase,
    indicators: previredIndicators
  }
}

// ============================================
// FLUJO OTRO RÉGIMEN (DIPRECA, CAPREDENA, etc.)
// ============================================

async function calculateOtherRegime(
  input: PayrollCalculationInputV2
): Promise<PayrollCalculationResultV2> {
  
  const {
    employee,
    year,
    month,
    daysWorked,
    baseSalary,
    bonuses = 0,
    overtime = 0,
    vacation = 0,
    otherTaxableEarnings = 0,
    transportation = 0,
    mealAllowance = 0,
    aguinaldo = 0,
    otherNonTaxableEarnings = 0,
    loans = 0,
    advances = 0,
    permissionDiscount = 0,
    otherDeductions = 0,
    indicators = null
  } = input
  
  // 1. HABERES IMPONIBLES
  const baseSalaryProportional = Math.ceil((baseSalary / 30) * daysWorked)
  
  // Para regímenes especiales, la gratificación puede o no aplicar
  // Por ahora la calculamos igual que AFP
  let monthlyGratification = 0
  if (indicators?.RMITrabDepeInd) {
    const parseChileanNumber = (str: string): number => {
      if (!str) return 0
      return parseFloat(str.replace(/\./g, '').replace(',', '.'))
    }
    const ingresoMinimo = parseChileanNumber(indicators.RMITrabDepeInd)
    const topeGratificacion = (4.75 * ingresoMinimo) / 12
    const gratificacion25Porciento = baseSalary * 0.25
    const gratificacionMensual = Math.min(topeGratificacion, gratificacion25Porciento)
    monthlyGratification = Math.ceil((gratificacionMensual / 30) * daysWorked)
  } else {
    monthlyGratification = Math.ceil((baseSalary * 0.25 / 30) * daysWorked)
  }
  
  const taxableEarnings = {
    baseSalary: baseSalaryProportional,
    bonuses: Math.ceil(bonuses),
    monthlyGratification,
    overtime: Math.ceil(overtime),
    vacation: Math.ceil(vacation),
    otherTaxableEarnings: Math.ceil(otherTaxableEarnings),
    total: 0
  }
  taxableEarnings.total = Math.ceil(
    taxableEarnings.baseSalary + 
    taxableEarnings.bonuses + 
    taxableEarnings.monthlyGratification + 
    taxableEarnings.overtime + 
    taxableEarnings.vacation + 
    taxableEarnings.otherTaxableEarnings
  )
  
  // 2. BASE DE CÁLCULO SEGÚN CONFIGURACIÓN
  let calculationBase = 0
  if (employee.manual_base_type === 'imponible') {
    calculationBase = taxableEarnings.total
  } else {
    // Solo sueldo base
    calculationBase = baseSalaryProportional
  }
  
  // 3. HABERES NO IMPONIBLES
  const nonTaxableEarnings = {
    transportation: Math.ceil(transportation),
    mealAllowance: Math.ceil(mealAllowance),
    aguinaldo: Math.ceil(aguinaldo),
    otherNonTaxableEarnings: Math.ceil(otherNonTaxableEarnings),
    total: 0
  }
  nonTaxableEarnings.total = Math.ceil(
    nonTaxableEarnings.transportation + 
    nonTaxableEarnings.mealAllowance + 
    nonTaxableEarnings.aguinaldo + 
    nonTaxableEarnings.otherNonTaxableEarnings
  )
  
  // 4. DESCUENTOS PREVISIONALES (MANUAL)
  
  // Previsión (DIPRECA, CAPREDENA, etc.)
  const pensionRate = employee.manual_pension_rate || 0
  const pensionAmount = Math.ceil(calculationBase * (pensionRate / 100))
  
  // Salud
  const healthRate = employee.manual_health_rate || 7
  const healthAmount = Math.ceil(calculationBase * (healthRate / 100))
  
  // AFC y SIS NO aplican a OTRO_REGIMEN
  const sisAmount = 0
  const afcAmount = 0
  
  // 5. IMPUESTO ÚNICO
  const taxableBase = taxableEarnings.total
  const uniqueTax = await calculateUniqueTax(taxableBase, year, month)
  
  // 6. DESCUENTOS LEGALES TOTALES
  const legalDeductions = {
    pension: pensionAmount,
    health: healthAmount,
    sis: undefined,
    afc: undefined,
    uniqueTax,
    total: pensionAmount + healthAmount + uniqueTax
  }
  
  // 7. OTROS DESCUENTOS
  const otherDeductionsTotal = {
    loans: Math.ceil(loans),
    advances: Math.ceil(advances),
    permissionDiscount: Math.ceil(permissionDiscount),
    otherDeductions: Math.ceil(otherDeductions),
    total: 0
  }
  otherDeductionsTotal.total = Math.ceil(
    otherDeductionsTotal.loans + 
    otherDeductionsTotal.advances + 
    otherDeductionsTotal.permissionDiscount + 
    otherDeductionsTotal.otherDeductions
  )
  
  // 8. CONTRIBUCIONES EMPLEADOR (si están definidas)
  const employerPensionRate = employee.manual_employer_rate || 0
  const employerPension = Math.ceil(calculationBase * (employerPensionRate / 100))
  
  const employerContributions = {
    pension: employerPension > 0 ? employerPension : undefined,
    total: employerPension
  }
  
  // 9. TOTALES
  const grossPay = taxableEarnings.total + nonTaxableEarnings.total
  const totalDeductions = legalDeductions.total + otherDeductionsTotal.total
  const netPay = grossPay - totalDeductions
  
  // 10. METADATA DE PREVISIÓN
  const regimeLabel = employee.manual_regime_label || 
    getRegimeLabelByType(employee.other_regime_type || 'OTRO')
  
  const prevision: PrevisionCalculationResult = {
    regime: 'OTRO_REGIMEN',
    regimeType: employee.other_regime_type || 'OTRO',
    regimeLabel,
    pension: {
      amount: pensionAmount,
      percentage: pensionRate,
      base: calculationBase,
      label: regimeLabel
    },
    health: {
      amount: healthAmount,
      percentage: healthRate,
      base: calculationBase,
      label: `Cotización Salud ${employee.other_regime_type || ''}`
    },
    employer: employerContributions
  }
  
  return {
    prevision,
    taxableEarnings,
    nonTaxableEarnings,
    legalDeductions,
    otherDeductions: otherDeductionsTotal,
    grossPay,
    totalDeductions,
    netPay,
    employerContributions,
    calculationDate: new Date().toISOString(),
    taxableBase,
    indicators
  }
}

// ============================================
// HELPERS
// ============================================

function getRegimeLabelByType(type: string): string {
  const labels: Record<string, string> = {
    'DIPRECA': 'Cotización DIPRECA',
    'CAPREDENA': 'Cotización CAPREDENA',
    'SIN_PREVISION': 'Sin Previsión',
    'OTRO': 'Cotización Previsional'
  }
  return labels[type] || 'Cotización Previsional'
}

/**
 * Calcula el impuesto único
 * Usa la lógica existente de tax_brackets
 */
async function calculateUniqueTax(
  taxableBase: number,
  year: number,
  month: number
): Promise<number> {
  try {
    // Importar la función existente
    const { getTaxBrackets } = await import('./taxBracketsScraper')
    const brackets = await getTaxBrackets(year, month, 'MENSUAL')
    
    if (!brackets || brackets.length === 0) {
      console.warn('No se encontraron tramos de impuestos, usando 0')
      return 0
    }
    
    // Buscar el tramo correspondiente (filtrar valores null)
    const bracket = brackets.find(b => 
      b.desde !== null && b.hasta !== null &&
      taxableBase >= b.desde && taxableBase <= b.hasta
    )
    
    if (!bracket) {
      console.warn('No se encontró tramo para RLI:', taxableBase)
      return 0
    }
    
    // Calcular impuesto según tramo
    const tax = Math.max(0, Math.ceil((taxableBase * bracket.factor) - bracket.cantidad_rebajar))
    return tax
    
  } catch (error) {
    console.error('Error calculando impuesto único:', error)
    return 0
  }
}

