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
  DepConvenTopeAnuUF?: string
  DepConvenTopeAnuPesos?: string
  DepConvenidoUF?: string
  DepConvenidoPesos?: string
  // SIS (Seguro de Invalidez y Sobrevivencia) - viene como string "1,49"
  TasaSIS?: string
  // AFC (Seguro de Cesantía) - tasas del empleador
  AFCCpiEmpleador?: string // Contrato plazo indefinido (ej: "2,4")
  AFCCpfEmpleador?: string // Contrato plazo fijo (ej: "3,0")
  AFCTcpEmpleador?: string // Contrato temporal (ej: "3,0")
  // AFC - tasas del trabajador
  AFCCpiTrabajador?: string // Contrato plazo indefinido (ej: "0,6")
  AFCCpfTrabajador?: string // Contrato plazo fijo (ej: "0")
  AFCTcpTrabajador?: string // Contrato temporal (ej: "0")
  // Tasas AFP - formato de la API (vienen como strings con formato chileno)
  AFPCapitalTasaDepTrab?: string // Trabajador
  AFPCapitalTasaDepAPagar?: string // Total
  AFPCapitalTasaInd?: string // Independiente
  AFPCuprumTasaDepTrab?: string
  AFPCuprumTasaDepAPagar?: string
  AFPCuprumTasaInd?: string
  AFPHabitatTasaDepTrab?: string
  AFPHabitatTasaDepAPagar?: string
  AFPHabitatTasaInd?: string
  AFPPlanVitalTasaDepTrab?: string
  AFPPlanVitalTasaDepAPagar?: string
  AFPPlanVitalTasaInd?: string
  AFPProVidaTasaDepTrab?: string
  AFPProVidaTasaDepAPagar?: string
  AFPProVidaTasaInd?: string
  AFPModeloTasaDepTrab?: string
  AFPModeloTasaDepAPagar?: string
  AFPModeloTasaInd?: string
  AFPUnoTasaDepTrab?: string
  AFPUnoTasaDepAPagar?: string
  AFPUnoTasaInd?: string
  // Formato estructurado (para compatibilidad con código existente)
  AFP?: {
    [key: string]: {
      trabajador: number // Porcentaje cargo del trabajador
      empleador: number // Porcentaje cargo del empleador (0.1%)
      total: number // Total a pagar
      independientes: number // Para independientes (incluye SIS)
    }
  }
  // Seguro de Cesantía (formato estructurado para compatibilidad)
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
  // Otros campos de la API
  ExpVida?: string
  Dist7PorcCCAF?: string
  Dist7PorcFonasa?: string
  TrabPesadoEmpl?: string
  TrabPesadoCalif?: string
  TrabPesadoTrabaj?: string
  TrabMenosPesadoEmpl?: string
  TrabMenosPesadoCalif?: string
  TrabMenosPesadoTrabaj?: string
  AFamTramoADesde?: string
  AFamTramoAHasta?: string
  AFamTramoAMonto?: string
  AFamTramoBDesde?: string
  AFamTramoBHasta?: string
  AFamTramoBMonto?: string
  AFamTramoCDesde?: string
  AFamTramoCHasta?: string
  AFamTramoCMonto?: string
  AFamTramoDDesde?: string
  AFamTramoDHasta?: string
  AFamTramoDMonto?: string
  AFCCpi11Empleador?: string
  AFCCpi11Trabajador?: string
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
/**
 * Función helper para parsear números chilenos (puntos para miles, coma para decimales)
 */
function parseChileanNumber(str: string | undefined): number {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.'))
}

export function getAFPRate(afpName: string, indicators: PreviredIndicators | null): {
  trabajador: number
  empleador: number
  total: number
} {
  const afpUpper = afpName.toUpperCase()
  
  // Mapeo de nombres de AFP a campos de la API
  const afpFieldMap: { [key: string]: { trabajador: string; total: string } } = {
    'CAPITAL': { trabajador: 'AFPCapitalTasaDepTrab', total: 'AFPCapitalTasaDepAPagar' },
    'CUPRUM': { trabajador: 'AFPCuprumTasaDepTrab', total: 'AFPCuprumTasaDepAPagar' },
    'HABITAT': { trabajador: 'AFPHabitatTasaDepTrab', total: 'AFPHabitatTasaDepAPagar' },
    'PLANVITAL': { trabajador: 'AFPPlanVitalTasaDepTrab', total: 'AFPPlanVitalTasaDepAPagar' },
    'PROVIDA': { trabajador: 'AFPProVidaTasaDepTrab', total: 'AFPProVidaTasaDepAPagar' },
    'MODELO': { trabajador: 'AFPModeloTasaDepTrab', total: 'AFPModeloTasaDepAPagar' },
    'UNO': { trabajador: 'AFPUnoTasaDepTrab', total: 'AFPUnoTasaDepAPagar' },
  }

  const fieldMap = afpFieldMap[afpUpper]
  
  // Si la API tiene datos específicos, usarlos
  if (indicators && fieldMap) {
    const trabajador = parseChileanNumber((indicators as any)[fieldMap.trabajador])
    const total = parseChileanNumber((indicators as any)[fieldMap.total])
    
    if (trabajador > 0 && total > 0) {
      // El empleador siempre paga 0.1% según normativa
      const empleador = 0.1
      return {
        trabajador,
        empleador,
        total,
      }
    }
  }

  // Si la API tiene formato estructurado (compatibilidad)
  if (indicators?.AFP && indicators.AFP[afpUpper]) {
    return {
      trabajador: indicators.AFP[afpUpper].trabajador,
      empleador: indicators.AFP[afpUpper].empleador,
      total: indicators.AFP[afpUpper].total,
    }
  }

  // Valores por defecto basados en Previred (Diciembre 2025)
  const defaultRates: { [key: string]: { trabajador: number; empleador: number; total: number } } = {
    'CAPITAL': { trabajador: 11.44, empleador: 0.1, total: 11.54 },
    'CUPRUM': { trabajador: 11.44, empleador: 0.1, total: 11.54 },
    'HABITAT': { trabajador: 11.27, empleador: 0.1, total: 11.37 },
    'PLANVITAL': { trabajador: 11.16, empleador: 0.1, total: 11.26 },
    'PROVIDA': { trabajador: 11.45, empleador: 0.1, total: 11.55 },
    'MODELO': { trabajador: 10.58, empleador: 0.1, total: 10.68 },
    'UNO': { trabajador: 10.46, empleador: 0.1, total: 10.56 },
  }

  // Usar valores por defecto
  return defaultRates[afpUpper] || defaultRates['PROVIDA']
}

/**
 * Obtiene la tasa de seguro de cesantía del trabajador
 */
export function getUnemploymentInsuranceRate(indicators: PreviredIndicators | null): number {
  // Tasa fija del trabajador: 0.6% para contrato plazo indefinido
  return 0.6
}

/**
 * Obtiene la tasa de seguro de cesantía del empleador según tipo de contrato
 */
export function getUnemploymentInsuranceEmployerRate(
  contractType: string | null | undefined,
  indicators: PreviredIndicators | null
): number {
  // Si la API tiene datos específicos, usarlos
  if (indicators) {
    if (contractType === 'plazo_fijo') {
      // AFCCpfEmpleador para contrato plazo fijo
      const tasa = parseChileanNumber(indicators.AFCCpfEmpleador)
      if (tasa > 0) return tasa
    } else if (contractType === 'otro') {
      // AFCTcpEmpleador para contrato temporal
      const tasa = parseChileanNumber(indicators.AFCTcpEmpleador)
      if (tasa > 0) return tasa
    } else {
      // AFCCpiEmpleador para contrato plazo indefinido (por defecto)
      const tasa = parseChileanNumber(indicators.AFCCpiEmpleador)
      if (tasa > 0) return tasa
    }
  }
  
  // Si hay indicadores con formato estructurado (compatibilidad)
  if (indicators?.SeguroCesantia) {
    if (contractType === 'plazo_fijo') {
      return indicators.SeguroCesantia.plazoFijo?.empleador || 3.0
    } else {
      // Indefinido o por defecto
      return indicators.SeguroCesantia.plazoIndefinido?.empleador || 2.4
    }
  }
  
  // Valores por defecto si no hay indicadores
  if (contractType === 'plazo_fijo') {
    return 3.0 // 3.00% para plazo fijo
  }
  return 2.4 // 2.40% para indefinido
}

/**
 * Obtiene la tasa de SIS (Seguro de Invalidez y Sobrevivencia) del empleador
 */
export function getSISRate(indicators: PreviredIndicators | null): number {
  // Si la API proporciona el valor de SIS como "TasaSIS" (viene como string "1,49")
  if (indicators?.TasaSIS) {
    const tasa = parseChileanNumber(indicators.TasaSIS)
    if (tasa > 0) return tasa
  }
  
  // Valor por defecto según normativa vigente (1.49% desde octubre 2025)
  // Este valor puede cambiar según la normativa, por lo que es importante
  // que la API lo proporcione cuando esté disponible
  return 1.49
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

