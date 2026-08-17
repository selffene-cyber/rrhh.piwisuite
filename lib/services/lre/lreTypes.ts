export interface LRECatalogItem {
  id: number
  code: number
  label: string
  description?: string | null
}

export interface LREAFP extends LRECatalogItem {
  name: string
}

export interface LREIPSExINP extends LRECatalogItem {
  name: string
  description?: string | null
}

export interface LREIsapreFonasa extends LRECatalogItem {
  name: string
  type: 'FONASA' | 'ISAPRE'
}

export interface LRECCAF extends LRECatalogItem {
  name: string
}

export interface LREMutual extends LRECatalogItem {
  name: string
}

export interface LRECausalTermino extends LRECatalogItem {
  article: string
  requires_end_date: boolean
}

export interface LRETipoJornada extends LRECatalogItem {
  description?: string | null
}

export interface LRETramoAsignacion {
  id: number
  code: string
  label: string
  description?: string | null
}

export interface LREFieldMapping {
  id: string
  internal_category: string
  dt_code: number
  dt_concept: string
  lre_category: 'identificacion' | 'haber_imp_trib' | 'haber_imp_no_trib' | 'haber_no_imp_no_trib' | 'haber_no_imp_trib' | 'descuento' | 'aporte_empleador' | 'total'
  dt_type: 'Int' | 'Date' | 'Tinyint' | 'Float'
  dt_max_size: number
  is_mandatory: boolean
  description?: string | null
}

export interface LREExportLog {
  id: string
  company_id: string
  payroll_book_id: string
  generated_by: string
  period_year: number
  period_month: number
  file_name: string
  file_hash?: string | null
  file_size?: number | null
  total_employees: number
  validation_status: 'valid' | 'warnings' | 'errors'
  blocking_errors: number
  warnings: number
  validation_log?: Record<string, unknown> | null
  created_at: string
}

export const LRE_CATEGORIES = [
  { key: 'identificacion', label: 'Identificación del Trabajador', codePrefix: '1' },
  { key: 'haber_imp_trib', label: 'Haberes Imponibles y Tributables', codePrefix: '2' },
  { key: 'haber_imp_no_trib', label: 'Haberes Imponibles y No Tributables', codePrefix: '2' },
  { key: 'haber_no_imp_no_trib', label: 'Haberes No Imponibles y No Tributables', codePrefix: '2' },
  { key: 'haber_no_imp_trib', label: 'Haberes No Imponibles y Tributables', codePrefix: '2' },
  { key: 'descuento', label: 'Descuentos', codePrefix: '3' },
  { key: 'aporte_empleador', label: 'Aportes del Empleador', codePrefix: '4' },
  { key: 'total', label: 'Totales', codePrefix: '5' },
] as const

export type LRECategory = typeof LRE_CATEGORIES[number]['key']

export function getLRECategoryForCode(dtCode: number): LRECategory | null {
  const prefix = Math.floor(dtCode / 1000)
  switch (prefix) {
    case 1: return 'identificacion'
    case 2: return dtCode >= 2400 ? 'haber_no_imp_trib' : dtCode >= 2300 ? 'haber_no_imp_no_trib' : dtCode >= 2200 ? 'haber_imp_no_trib' : 'haber_imp_trib'
    case 3: return 'descuento'
    case 4: return 'aporte_empleador'
    case 5: return 'total'
    default: return null
  }
}

export const MANDATORY_LRE_FIELDS = [
  1101, 1102, 1105, 1106, 1107, 1108, 1109, 1110, 1115, 1118,
  1131, 1141, 1142, 1143, 1146, 1151, 1152, 1155, 1157, 1170,
  2101, 3141, 3143, 3161, 4152, 4155,
  5201, 5210, 5220, 5230, 5240, 5301, 5341, 5302, 5361, 5410, 5501, 5564
] as const

export const LRE_VALIDATION_TABLES = [
  { code: 1104, table: 'lre_causales_termino', label: 'Causales de término' },
  { code: 1105, table: 'geo_regions', label: 'Regiones', dtCodeColumn: 'dt_code' },
  { code: 1106, table: 'geo_communes', label: 'Comunas', dtCodeColumn: 'dt_code' },
  { code: 1107, table: 'lre_tipo_jornada', label: 'Tipos de jornada' },
  { code: 1108, table: 'lre_discapacidad', label: 'Discapacidad/Pensionado invalidez' },
  { code: 1109, table: 'lre_pensionado_vejez', label: 'Pensionado por vejez' },
  { code: 1110, table: 'lre_ccaf', label: 'CCAF' },
  { code: 1114, table: 'lre_tramo_asignacion_familiar', label: 'Tramos asignación familiar' },
  { code: 1141, table: 'lre_afp', label: 'AFP' },
  { code: 1142, table: 'lre_ips_exinp', label: 'IPS Ex-INP' },
  { code: 1143, table: 'lre_isapre_fonasa', label: 'Fonasa/Isapre' },
  { code: 1146, table: 'lre_tecnico_extranjero', label: 'Técnico extranjero' },
  { code: 1151, table: 'lre_afc', label: 'AFC' },
  { code: 1152, table: 'lre_mutual_ley16744', label: 'Org. administrador Ley 16.744' },
  { code: 1170, table: 'lre_tipo_impuesto_renta', label: 'Tipo impuesto renta' },
] as const

export const AFP_NAME_TO_DT_CODE: Record<string, number> = {
  'CAPITAL': 31,
  'CUPRUM': 13,
  'HABITAT': 14,
  'PLANVITAL': 11,
  'PROVIDA': 6,
  'MODELO': 103,
  'UNO': 19,
}

export const HEALTH_SYSTEM_TO_DT_CODE: Record<string, number> = {
  'FONASA': 102,
}

export const ISAPRE_NAME_TO_DT_CODE: Record<string, number> = {
  'CRUZ BLANCA': 1,
  'BANMEDICA': 3,
  'CONSALUD': 9,
  'VIDA TRES': 12,
  'CHUQUICAMATA': 37,
  'CRUZ DEL NORTE': 38,
  'FUSAT': 39,
  'FUNDACION BANCOESTADO': 40,
  'RIO BLANCO': 41,
  'SAN LORENZO': 42,
  'NUEVA MAS VIDA': 43,
  'ESENCIAL': 44,
}

export const CCAF_NAME_TO_DT_CODE: Record<string, number> = {
  'LOS ANDES': 1,
  'LA ARAUCANA': 2,
  'LOS HEROES': 3,
  '18 DE SEPTIEMBRE': 4,
}

export const MUTUAL_NAME_TO_DT_CODE: Record<string, number> = {
  'ACHS': 1,
  'MUTUAL CCHC': 2,
  'IST': 3,
}

export const CONTRACT_TYPE_TO_DT_JORNADA: Record<string, number> = {
  'indefinido': 101,
  'plazo_fijo': 101,
  'obra_faena': 101,
  'temporal': 102,
  'parcial': 301,
}

export const PREVISION_REGIME_TO_DT_IPS: Record<string, number> = {
  'AFP': 1,
  'DIPRECA': 111,
  'CAPREDENA': 112,
}

export function formatRUTForLRE(rut: string): string {
  if (!rut) return ''
  const cleaned = rut.replace(/\./g, '').trim()
  if (cleaned.includes('-')) return cleaned
  if (cleaned.length < 2) return cleaned
  return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`
}

export function formatDateForLRE(date: string | null | undefined): string {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return ''
  }
}