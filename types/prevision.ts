/**
 * Tipos para el manejo de regímenes previsionales
 * Soporta AFP (Previred) y regímenes especiales (DIPRECA, CAPREDENA, etc.)
 */

export type PrevisionRegimeType = 'AFP' | 'OTRO_REGIMEN'

export type OtherRegimeType = 'DIPRECA' | 'CAPREDENA' | 'SIN_PREVISION' | 'OTRO'

export type ManualBaseType = 'imponible' | 'sueldo_base'

/**
 * Configuración de régimen especial (DIPRECA, CAPREDENA, etc.)
 */
export interface OtherRegimeConfig {
  type: OtherRegimeType
  pensionRate: number // Porcentaje (ej: 6 para 6%)
  healthRate: number // Porcentaje (ej: 7 para 7%)
  employerRate?: number // Porcentaje empleador (opcional)
  baseType: ManualBaseType
  label?: string // Etiqueta personalizada para liquidación
  code?: string // Código de régimen (ej: D9113)
  note?: string // Observación legal
}

/**
 * Empleado con datos de previsión extendidos
 */
export interface EmployeeWithPrevision {
  // Datos básicos
  id: string
  rut: string
  full_name: string
  base_salary: number
  
  // Régimen previsional
  previsional_regime: PrevisionRegimeType
  
  // Datos AFP (solo si previsional_regime = 'AFP')
  afp?: string
  health_system?: string
  health_plan?: string
  health_plan_percentage?: number
  
  // Datos régimen especial (solo si previsional_regime = 'OTRO_REGIMEN')
  other_regime_type?: OtherRegimeType
  manual_pension_rate?: number
  manual_health_rate?: number
  manual_employer_rate?: number
  manual_base_type?: ManualBaseType
  manual_regime_label?: string
  other_regime_code?: string
  other_regime_note?: string
  
  // Control de AFC
  afc_applicable: boolean
  
  // Otros campos necesarios para liquidación
  contract_type?: string
  transportation?: number
  meal_allowance?: number
  status: string
}

/**
 * Resultado de cálculo de cotizaciones previsionales
 */
export interface PrevisionCalculationResult {
  regime: PrevisionRegimeType
  regimeType?: OtherRegimeType | string // Para OTRO_REGIMEN o nombre AFP
  regimeLabel: string
  
  // Descuentos al trabajador
  pension: {
    amount: number
    percentage: number
    base: number
    label: string
  }
  
  health: {
    amount: number
    percentage: number
    base: number
    label: string
  }
  
  // AFP específicos (solo si regime = 'AFP')
  afp?: {
    obligatorio: number // ~10%
    comision: number // Varía por AFP
    total: number
  }
  
  sis?: {
    amount: number
    percentage: number
  }
  
  afc?: {
    amount: number
    percentage: number
  }
  
  // Cotizaciones empleador (para reportes)
  employer?: {
    pension?: number
    sis?: number
    afc?: number
    total: number
  }
}

/**
 * Helpers para obtener etiquetas
 */
export function getRegimeLabel(regime: OtherRegimeType, customLabel?: string): string {
  if (customLabel) return customLabel
  
  const labels: Record<OtherRegimeType, string> = {
    'DIPRECA': 'Cotización DIPRECA',
    'CAPREDENA': 'Cotización CAPREDENA',
    'SIN_PREVISION': 'Sin Previsión',
    'OTRO': 'Cotización Previsional'
  }
  
  return labels[regime] || 'Cotización Previsional'
}

/**
 * Helpers para validación
 */
export function validateOtherRegimeConfig(config: Partial<OtherRegimeConfig>): string[] {
  const errors: string[] = []
  
  if (!config.type) {
    errors.push('Tipo de régimen es obligatorio')
  }
  
  if (config.pensionRate === undefined || config.pensionRate < 0) {
    errors.push('Porcentaje de cotización previsional debe ser mayor o igual a 0')
  }
  
  if (config.healthRate === undefined || config.healthRate < 7) {
    errors.push('Porcentaje de cotización de salud debe ser al menos 7%')
  }
  
  if (!config.baseType) {
    errors.push('Base de cálculo es obligatoria')
  }
  
  return errors
}

/**
 * Helper para determinar si debe calcularse AFC
 */
export function shouldCalculateAFC(employee: EmployeeWithPrevision): boolean {
  // OTRO_REGIMEN nunca tiene AFC
  if (employee.previsional_regime === 'OTRO_REGIMEN') {
    return false
  }
  
  // AFP: depende del flag afc_applicable
  return employee.afc_applicable
}


