import type { LREFieldMapping, LRECategory } from './lreTypes'
import { MANDATORY_LRE_FIELDS } from './lreTypes'

type PayrollItemCategory = string

const INTERNAL_CATEGORY_TO_DT: Record<PayrollItemCategory, { dtCode: number; lreCategory: LRECategory }> = {
  'sueldo_base': { dtCode: 2101, lreCategory: 'haber_imp_trib' },
  'horas_extras': { dtCode: 2102, lreCategory: 'haber_imp_trib' },
  'sobresueldo': { dtCode: 2102, lreCategory: 'haber_imp_trib' },
  'comisiones': { dtCode: 2103, lreCategory: 'haber_imp_trib' },
  'semana_corrida': { dtCode: 2104, lreCategory: 'haber_imp_trib' },
  'participacion': { dtCode: 2105, lreCategory: 'haber_imp_trib' },
  'gratificacion': { dtCode: 2106, lreCategory: 'haber_imp_trib' },
  'monthly_gratification': { dtCode: 2106, lreCategory: 'haber_imp_trib' },
  'recargo_domingo': { dtCode: 2107, lreCategory: 'haber_imp_trib' },
  'vacaciones': { dtCode: 2108, lreCategory: 'haber_imp_trib' },
  'vacation_paid': { dtCode: 2108, lreCategory: 'haber_imp_trib' },
  'rem_variable_vacaciones': { dtCode: 2108, lreCategory: 'haber_imp_trib' },
  'aguinaldo': { dtCode: 2110, lreCategory: 'haber_imp_trib' },
  'bonos': { dtCode: 2111, lreCategory: 'haber_imp_trib' },
  'bono': { dtCode: 2111, lreCategory: 'haber_imp_trib' },
  'bonos_fijos': { dtCode: 2111, lreCategory: 'haber_imp_trib' },
  'bonos_variables': { dtCode: 2113, lreCategory: 'haber_imp_trib' },
  'beneficios_especie': { dtCode: 2115, lreCategory: 'haber_imp_trib' },
  'otros_imponibles': { dtCode: 2123, lreCategory: 'haber_imp_trib' },
  'other_taxable_earnings': { dtCode: 2123, lreCategory: 'haber_imp_trib' },
  'overtime': { dtCode: 2102, lreCategory: 'haber_imp_trib' },
  'colacion': { dtCode: 2301, lreCategory: 'haber_no_imp_no_trib' },
  'movilizacion': { dtCode: 2302, lreCategory: 'haber_no_imp_no_trib' },
  'viaticos': { dtCode: 2303, lreCategory: 'haber_no_imp_no_trib' },
  'transportation': { dtCode: 2302, lreCategory: 'haber_no_imp_no_trib' },
  'meal_allowance': { dtCode: 2301, lreCategory: 'haber_no_imp_no_trib' },
  'otro_no_imponible': { dtCode: 2204, lreCategory: 'haber_imp_no_trib' },
  'other_non_taxable_earnings': { dtCode: 2204, lreCategory: 'haber_imp_no_trib' },
  'afp': { dtCode: 3141, lreCategory: 'descuento' },
  'salud': { dtCode: 3143, lreCategory: 'descuento' },
  'cesantia': { dtCode: 3151, lreCategory: 'descuento' },
  'impuesto_unico': { dtCode: 3161, lreCategory: 'descuento' },
  'prestamos': { dtCode: 3188, lreCategory: 'descuento' },
  'prestamo': { dtCode: 3188, lreCategory: 'descuento' },
  'otros_prestamos': { dtCode: 3188, lreCategory: 'descuento' },
  'anticipos': { dtCode: 3188, lreCategory: 'descuento' },
  'anticipo': { dtCode: 3188, lreCategory: 'descuento' },
  'permission_discount': { dtCode: 3185, lreCategory: 'descuento' },
  'otros_descuentos': { dtCode: 3183, lreCategory: 'descuento' },
}

export function mapInternalCategoryToDT(category: string): { dtCode: number; lreCategory: LRECategory } | null {
  const normalized = category.toLowerCase().trim().replace(/\s+/g, '_')
  if (INTERNAL_CATEGORY_TO_DT[normalized]) {
    return INTERNAL_CATEGORY_TO_DT[normalized]
  }
  if (INTERNAL_CATEGORY_TO_DT[category]) {
    return INTERNAL_CATEGORY_TO_DT[category]
  }
  for (const [key, value] of Object.entries(INTERNAL_CATEGORY_TO_DT)) {
    if (category.includes(key) || normalized.includes(key)) {
      return value
    }
  }
  return null
}

export function mapPayrollItemsToLRE(
  items: Array<{ type: string; category: string; amount: number; lre_dt_code?: number | null }>,
  fieldMappings: LREFieldMapping[]
): Record<number, number> {
  const lreAmounts: Record<number, number> = {}
  for (const mapping of fieldMappings) {
    if (mapping.lre_category !== 'identificacion' && mapping.lre_category !== 'total') {
      lreAmounts[mapping.dt_code] = 0
    }
  }

  for (const item of items) {
    let dtCode: number | null = null

    if (item.lre_dt_code && item.lre_dt_code > 0) {
      dtCode = item.lre_dt_code
    } else {
      const mapping = mapInternalCategoryToDT(item.category)
      if (mapping) {
        dtCode = mapping.dtCode
      }
    }

    if (dtCode !== null) {
      if (lreAmounts[dtCode] !== undefined) {
        lreAmounts[dtCode] += Math.round(item.amount)
      } else {
        lreAmounts[dtCode] = Math.round(item.amount)
      }
    }
  }

  return lreAmounts
}

export function calculateLTRETotals(lreAmounts: Record<number, number>): Record<number, number> {
  const totals: Record<number, number> = {}

  const sumByCategory = (codes: number[]): number => {
    return codes.reduce((sum, code) => sum + (lreAmounts[code] || 0), 0)
  }

  const haberImpTribCodes = [2101, 2102, 2103, 2104, 2105, 2106, 2107, 2108, 2109, 2110, 2111, 2112, 2113, 2114, 2115, 2116, 2117, 2118, 2119, 2120, 2121, 2122, 2123, 2124, 2161]
  const haberImpNoTribCodes = [2201, 2202, 2203, 2204]
  const haberNoImpNoTribCodes = [2301, 2302, 2303, 2304, 2305, 2311, 2306, 2307, 2308, 2309, 2347, 2310, 2312, 2313, 2314, 2315, 2316, 2331]
  const haberNoImpTribCodes = [2417, 2418]
  const descuentoCotizacionesCodes = [3141, 3143, 3144, 3146, 3147, 3151, 3154, 3155, 3156, 3157, 3158]
  const descuentoImpuestosRemCodes = [3161, 3162, 3163, 3164, 3165, 3166]
  const descuentoImpuestosIndCodes = [3162]
  const otrosDescuentosCodes = [3171, 3172, 3173, 3174, 3175, 3176, 3177, 3178, 3179, 3180, 3110, 3181, 3182, 3183, 3184, 3185, 3186, 3187, 3188, 3167]
  const aportesEmpleadorCodes = [4151, 4152, 4155, 4131, 4154, 4157]

  totals[5210] = sumByCategory(haberImpTribCodes)
  totals[5220] = sumByCategory(haberImpNoTribCodes)
  totals[5230] = sumByCategory(haberNoImpNoTribCodes)
  totals[5240] = sumByCategory(haberNoImpTribCodes)
  totals[5201] = totals[5210] + totals[5220] + totals[5230] + totals[5240]

  totals[5341] = sumByCategory(descuentoCotizacionesCodes)
  totals[5361] = sumByCategory(descuentoImpuestosRemCodes)
  totals[5362] = sumByCategory(descuentoImpuestosIndCodes)
  totals[5302] = sumByCategory(otrosDescuentosCodes)
  totals[5301] = totals[5341] + totals[5361] + totals[5362] + totals[5302]

  totals[5410] = sumByCategory(aportesEmpleadorCodes)

  totals[5501] = totals[5201] - totals[5301]

  const indemNoTribCodes = [2313, 2314, 2315, 2316, 2331]
  const indemTribCodes = [2417, 2418]
  totals[5502] = sumByCategory([...indemNoTribCodes, ...indemTribCodes])
  totals[5564] = sumByCategory(indemTribCodes)
  totals[5565] = sumByCategory(indemNoTribCodes)

  return totals
}

export function isMandatoryField(dtCode: number): boolean {
  return (MANDATORY_LRE_FIELDS as readonly number[]).includes(dtCode)
}

export function getDTCodeForPayrollItemCategory(category: string): number | null {
  const mapping = mapInternalCategoryToDT(category)
  return mapping?.dtCode ?? null
}