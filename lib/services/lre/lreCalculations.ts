export function calcularDiasTrabajados(
  hireDate: string | null,
  contractEndDate: string | null,
  month: number,
  year: number,
  diasLicenciaMedica: number = 0,
  diasVacaciones: number = 0
): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let diasTrabajados = 30

  if (hireDate) {
    const hire = new Date(hireDate)
    const hireMonth = hire.getMonth() + 1
    const hireYear = hire.getFullYear()
    const hireDay = hire.getDate()

    if (hireYear === year && hireMonth === month) {
      diasTrabajados = daysInMonth - hireDay + 1
      if (diasTrabajados > 30) diasTrabajados = 30
      if (diasTrabajados < 0) diasTrabajados = 0
    }
  }

  if (contractEndDate) {
    const end = new Date(contractEndDate)
    const endMonth = end.getMonth() + 1
    const endYear = end.getFullYear()
    const endDay = end.getDate()

    if (endYear === year && endMonth === month) {
      const diasHastaTermino = endDay
      if (diasHastaTermino < diasTrabajados) {
        diasTrabajados = diasHastaTermino
      }
    }
  }

  if (diasLicenciaMedica > 0) {
    diasTrabajados = diasTrabajados - diasLicenciaMedica
  }

  if (diasVacaciones > 0) {
    diasTrabajados = diasTrabajados - diasVacaciones
  }

  if (diasTrabajados < 0) diasTrabajados = 0
  if (diasTrabajados > 30) diasTrabajados = 30

  return diasTrabajados
}

export type TramoAsignacionFamiliar = 'A' | 'B' | 'C' | 'D' | 'S'

export interface TramoLimites {
  tramo: TramoAsignacionFamiliar
  montoMensual: number
  limiteInferior: number
  limiteSuperior: number
}

const TRAMOS_ASIGNACION_FAMILIAR_2025: TramoLimites[] = [
  { tramo: 'A', montoMensual: 18978, limiteInferior: 0, limiteSuperior: 298413 },
  { tramo: 'B', montoMensual: 12218, limiteInferior: 298414, limiteSuperior: 391709 },
  { tramo: 'C', montoMensual: 3853, limiteInferior: 391710, limiteSuperior: 635857 },
  { tramo: 'D', montoMensual: 0, limiteInferior: 635858, limiteSuperior: Infinity },
]

const TRAMOS_ASIGNACION_FAMILIAR_2026: TramoLimites[] = [
  { tramo: 'A', montoMensual: 19290, limiteInferior: 0, limiteSuperior: 303319 },
  { tramo: 'B', montoMensual: 12419, limiteInferior: 303320, limiteSuperior: 398147 },
  { tramo: 'C', montoMensual: 3916, limiteInferior: 398148, limiteSuperior: 646309 },
  { tramo: 'D', montoMensual: 0, limiteInferior: 646310, limiteSuperior: Infinity },
]

function parseChileanNumber(str: string | undefined | null): number {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

export interface PreviredIndicatorsForTramos {
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
}

export function getTramosAsignacionFamiliar(year: number, month?: number, indicators?: PreviredIndicatorsForTramos | null): TramoLimites[] {
  if (indicators) {
    const tramos = buildTramosFromIndicators(indicators)
    if (tramos.length >= 4) return tramos
  }

  if (year >= 2026) return TRAMOS_ASIGNACION_FAMILIAR_2026
  return TRAMOS_ASIGNACION_FAMILIAR_2025
}

function buildTramosFromIndicators(ind: PreviredIndicatorsForTramos): TramoLimites[] {
  const tramos: TramoLimites[] = []

  const aDesde = parseChileanNumber(ind.AFamTramoADesde)
  const aHasta = parseChileanNumber(ind.AFamTramoAHasta)
  const aMonto = parseChileanNumber(ind.AFamTramoAMonto)
  if (aHasta > 0 && aMonto > 0) {
    tramos.push({ tramo: 'A', montoMensual: aMonto, limiteInferior: aDesde, limiteSuperior: aHasta })
  }

  const bDesde = parseChileanNumber(ind.AFamTramoBDesde)
  const bHasta = parseChileanNumber(ind.AFamTramoBHasta)
  const bMonto = parseChileanNumber(ind.AFamTramoBMonto)
  if (bHasta > 0 && bMonto > 0) {
    tramos.push({ tramo: 'B', montoMensual: bMonto, limiteInferior: bDesde, limiteSuperior: bHasta })
  }

  const cDesde = parseChileanNumber(ind.AFamTramoCDesde)
  const cHasta = parseChileanNumber(ind.AFamTramoCHasta)
  const cMonto = parseChileanNumber(ind.AFamTramoCMonto)
  if (cHasta > 0 && cMonto > 0) {
    tramos.push({ tramo: 'C', montoMensual: cMonto, limiteInferior: cDesde, limiteSuperior: cHasta })
  }

  const dDesde = parseChileanNumber(ind.AFamTramoDDesde)
  const dMonto = parseChileanNumber(ind.AFamTramoDMonto)
  if (dDesde > 0) {
    tramos.push({ tramo: 'D', montoMensual: dMonto || 0, limiteInferior: dDesde, limiteSuperior: Infinity })
  }

  return tramos
}

export function calcularTramoAsignacionFamiliar(
  remuneracionPromedio: number,
  year: number,
  month?: number,
  indicators?: PreviredIndicatorsForTramos | null
): TramoAsignacionFamiliar {
  const tramos = getTramosAsignacionFamiliar(year, month, indicators)
  for (const t of tramos) {
    if (remuneracionPromedio >= t.limiteInferior && remuneracionPromedio <= t.limiteSuperior) {
      return t.tramo
    }
  }
  return 'S'
}

export function validarTasaIndemnizacion(tasa: number | null | undefined): { valid: boolean; message?: string } {
  if (tasa === null || tasa === undefined) {
    return { valid: true }
  }
  if (tasa < 4.11) {
    return { valid: false, message: `La tasa de indemnización a todo evento (${tasa}%) es inferior al mínimo legal de 4.11%` }
  }
  return { valid: true }
}

export function validarConsistenciaAFC(afcCode: number, cotizacionAFCTrabajador: number, aporteAFCEmpleador: number): { valid: boolean; message?: string } {
  if (afcCode === 0) {
    if (cotizacionAFCTrabajador > 0 || aporteAFCEmpleador > 0) {
      return { valid: false, message: 'Si AFC=0 (no afiliado), no deben existir cotizaciones ni aportes AFC' }
    }
  }
  return { valid: true }
}

export function validarConsistenciaTecnicoExtranjero(
  tecnicoExtranjero: number,
  cotizacionPrevisional: number,
  cotizacionTecnicoExtranjero: number
): { valid: boolean; message?: string } {
  if (tecnicoExtranjero === 1 && cotizacionPrevisional > 0 && cotizacionTecnicoExtranjero === 0) {
    return { valid: false, message: 'Si es técnico extranjero exento, las cotizaciones previsionales deben ir en código 3146, no en 3141' }
  }
  return { valid: true }
}

export function validarConsistenciaSindicatos(
  rutsSindicatos: (string | null)[],
  cuotasSindicales: (number | null)[]
): { valid: boolean; messages: string[] } {
  const messages: string[] = []
  for (let i = 0; i < 10; i++) {
    const rut = rutsSindicatos[i]
    const cuota = cuotasSindicales[i]
    if (rut && (!cuota || cuota === 0)) {
      messages.push(`RUT de sindicato ${i + 1} sin cuota asociada (código ${3171 + i})`)
    }
    if (!rut && cuota && cuota > 0) {
      messages.push(`Cuota sindical ${i + 1} sin RUT de organización (código ${1171 + i})`)
    }
  }
  return { valid: messages.length === 0, messages }
}

export function validarConsistenciaAPV(
  apvIndividual: number,
  apvColectivo: number,
  montoAPVIndividualA: number,
  montoAPVIndividualB: number,
  montoAPVColectivoA: number,
  montoAPVColectivoB: number,
  aporteAPVColectivoEmpleador: number
): { valid: boolean; messages: string[] } {
  const messages: string[] = []
  if (apvIndividual === 1 && montoAPVIndividualA === 0 && montoAPVIndividualB === 0) {
    messages.push('APV individual=1 pero no hay monto en códigos 3155/3156')
  }
  if (apvColectivo === 1 && montoAPVColectivoA === 0 && montoAPVColectivoB === 0) {
    messages.push('APV colectivo=1 pero no hay monto en códigos 3157/3158')
  }
  if (apvColectivo === 1 && aporteAPVColectivoEmpleador === 0) {
    messages.push('APV colectivo=1 pero no hay aporte del empleador en código 4157')
  }
  return { valid: messages.length === 0, messages }
}

export function validarConsistenciaIndemnizacion(
  indemnizacionATodoEvento: number,
  tasaIndemnizacion: number | null,
  aporteIndemnizacion: number
): { valid: boolean; messages: string[] } {
  const messages: string[] = []
  if (indemnizacionATodoEvento === 1) {
    if (tasaIndemnizacion === null || tasaIndemnizacion === undefined) {
      messages.push('Indemnización a todo evento=1 pero no hay tasa (código 1132)')
    } else if (tasaIndemnizacion < 4.11) {
      messages.push(`Tasa de indemnización (${tasaIndemnizacion}%) inferior al mínimo legal de 4.11%`)
    }
    if (aporteIndemnizacion === 0) {
      messages.push('Indemnización a todo evento=1 pero no hay aporte del empleador en código 4131')
    }
  }
  return { valid: messages.length === 0, messages }
}

export function validarConsistenciaTrabajoPesado(
  puestoTrabajoPesado: string | null,
  cotizacionAdicional: number,
  aporteAdicional: number
): { valid: boolean; messages: string[] } {
  const messages: string[] = []
  if (puestoTrabajoPesado && puestoTrabajoPesado.trim() !== '') {
    if (cotizacionAdicional === 0 && aporteAdicional === 0) {
      messages.push('Puesto de trabajo pesado registrado pero sin cotización (3154) ni aporte (4154) asociado')
    }
  }
  return { valid: messages.length === 0, messages }
}

export function validarConsistenciaCausalTermino(
  fechaTermino: string | null,
  causalTermino: number | null
): { valid: boolean; message?: string } {
  if (fechaTermino && !causalTermino) {
    return { valid: false, message: 'Si hay fecha de término de contrato, es obligatorio completar la causal de término (código 1104)' }
  }
  if (causalTermino && !fechaTermino) {
    return { valid: false, message: 'Si hay causal de término, debe existir fecha de término de contrato (código 1103)' }
  }
  return { valid: true }
}