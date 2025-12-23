/**
 * Servicio para obtener indicadores previsionales de Previred
 * Utiliza la API de Gael Cloud: https://api.gael.cloud/
 */

export interface PreviredIndicators {
  PreviredID: number
  Fecha: string
  PeriodoMY: string // Formato: MMYYYY (ej: 082025)
  PeriodoYM: string // Formato: YYMM (ej: 2508)
  UFDescPeriodo: string
  UFValPeriodo: string
  UFDescPeridoAnt: string
  UFValPeriodoAnt: string
  UTMDesc: string
  UTMVal: string
  UTAVal: string
  RTIAfpUF: string
  RTIIpsUF: string
  RTISegCesUF: string
  RTIAfpPesos: string
  RTIIpsPesos: string
  RTISegCesPesos: string
  RMITrabDepeInd: string
  RMIMen18May65: string
  RMITrabCasaPart: string
  RMINoRemu: string
  APVTopeMensUF: string
  APVTopeAnuUF: string
  APVTopeMensPesos: string
  APVTopeAnuPesos: string
  DepConvenTopeAnuUF: string
  DepConvenTopeAnuPesos: string
  // Tasas AFP por nombre
  AFP?: {
    [key: string]: {
      trabajador: number // Porcentaje cargo del trabajador
      empleador: number // Porcentaje cargo del empleador
      total: number // Total a pagar
      independientes: number // Para independientes (incluye SIS)
    }
  }
  // Seguro de Cesantía
  SeguroCesantia?: {
    plazoIndefinido: {
      empleador: number
      trabajador: number
    }
    plazoFijo: {
      empleador: number
      trabajador: number
    }
  }
  // Salud
  Salud?: {
    isapre: number // 7% generalmente
    fonasa: number // 0% para trabajador
  }
  // Impuesto único (tabla progresiva)
  ImpuestoUnico?: {
    tramos: Array<{
      desde: number
      hasta: number | null
      porcentaje: number
    }>
  }
}

/**
 * Obtiene los indicadores previsionales de Previred para un mes/año específico
 * @param month Mes (1-12)
 * @param year Año (ej: 2025)
 * @returns Indicadores previsionales o null si hay error
 */
export async function getPreviredIndicators(
  month: number,
  year: number
): Promise<PreviredIndicators | null> {
  try {
    // Formatear mes con 2 dígitos y año completo
    // Formato esperado por la API: MMYYYY (ej: 082025 para agosto 2025)
    const monthStr = month.toString().padStart(2, '0')
    const yearStr = year.toString()
    const periodoMY = `${monthStr}${yearStr}`

    const url = `https://api.gael.cloud/general/public/previred/${periodoMY}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`Error al obtener indicadores: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data as PreviredIndicators
  } catch (error) {
    console.error('Error al obtener indicadores de Previred:', error)
    return null
  }
}

/**
 * Obtiene los indicadores del mes actual
 */
export async function getCurrentMonthIndicators(): Promise<PreviredIndicators | null> {
  const now = new Date()
  return getPreviredIndicators(now.getMonth() + 1, now.getFullYear())
}

/**
 * Obtiene la tasa de AFP según el nombre de la AFP
 * Nota: La API de Gael Cloud no siempre incluye las tasas por AFP,
 * por lo que se usan valores por defecto basados en los indicadores de Previred
 */
export function getAFPRate(afpName: string, indicators: PreviredIndicators | null): {
  trabajador: number
  empleador: number
  total: number
} {
  // Valores por defecto basados en Previred (Diciembre 2025)
  // Estos valores pueden cambiar mes a mes
  const defaultRates: { [key: string]: { trabajador: number; empleador: number; total: number } } = {
    'CAPITAL': { trabajador: 11.44, empleador: 0.1, total: 11.54 },
    'CUPRUM': { trabajador: 11.44, empleador: 0.1, total: 11.54 },
    'HABITAT': { trabajador: 11.27, empleador: 0.1, total: 11.37 },
    'PLANVITAL': { trabajador: 11.16, empleador: 0.1, total: 11.26 },
    'PROVIDA': { trabajador: 11.45, empleador: 0.1, total: 11.55 },
    'MODELO': { trabajador: 10.58, empleador: 0.1, total: 10.68 },
    'UNO': { trabajador: 10.46, empleador: 0.1, total: 10.56 },
  }

  const afpUpper = afpName.toUpperCase()
  
  // Si la API tiene datos específicos, usarlos
  if (indicators?.AFP && indicators.AFP[afpUpper]) {
    return {
      trabajador: indicators.AFP[afpUpper].trabajador,
      empleador: indicators.AFP[afpUpper].empleador,
      total: indicators.AFP[afpUpper].total,
    }
  }

  // Usar valores por defecto
  return defaultRates[afpUpper] || defaultRates['PROVIDA']
}

/**
 * Obtiene la tasa de seguro de cesantía
 */
export function getUnemploymentInsuranceRate(indicators: PreviredIndicators | null): number {
  // Tasa fija del trabajador: 0.6% para contrato plazo indefinido
  return 0.6
}

/**
 * Obtiene la tasa de salud según el sistema
 * @param healthSystem Sistema de salud (FONASA o ISAPRE)
 * @param healthPlanPercentage Porcentaje adicional del plan ISAPRE (solo para ISAPRE)
 * @param indicators Indicadores de Previred (opcional)
 * @returns Porcentaje total a descontar al trabajador
 */
export function getHealthRate(
  healthSystem: string, 
  healthPlanPercentage: number = 0,
  indicators: PreviredIndicators | null = null
): number {
  // FONASA: 7% del trabajador (siempre)
  if (healthSystem === 'FONASA') {
    return 7
  }
  
  // ISAPRE: 7% base + porcentaje adicional del plan del trabajador
  if (healthSystem === 'ISAPRE') {
    return 7 + (healthPlanPercentage || 0)
  }
  
  return 0
}

/**
 * Lista de AFPs disponibles en Chile
 */
export const AVAILABLE_AFPS = [
  { value: 'CAPITAL', label: 'CAPITAL' },
  { value: 'CUPRUM', label: 'CUPRUM' },
  { value: 'HABITAT', label: 'HABITAT' },
  { value: 'PLANVITAL', label: 'PLANVITAL' },
  { value: 'PROVIDA', label: 'PROVIDA' },
  { value: 'MODELO', label: 'MODELO' },
  { value: 'UNO', label: 'UNO' },
]

/**
 * Lista de sistemas de salud disponibles
 */
export const AVAILABLE_HEALTH_SYSTEMS = [
  { value: 'FONASA', label: 'FONASA' },
  { value: 'ISAPRE', label: 'ISAPRE' },
]

