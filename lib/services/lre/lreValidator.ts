import type { LREValidationError, LREValidationStatus } from '@/types'
import { MANDATORY_LRE_FIELDS, formatRUTForLRE } from './lreTypes'
import {
  validarConsistenciaAFC,
  validarConsistenciaTecnicoExtranjero,
  validarConsistenciaSindicatos,
  validarConsistenciaAPV,
  validarConsistenciaIndemnizacion,
  validarConsistenciaTrabajoPesado,
  validarConsistenciaCausalTermino,
} from './lreCalculations'
import type { SupabaseClient } from '@supabase/supabase-js'

interface EmployeeForValidation {
  id: string
  rut: string
  full_name: string
  hire_date: string | null
  contract_end_date: string | null
  region_id: string | null
  commune_id: string | null
  termination_cause_code: number | null
  dt_tipo_impuesto_renta: number
  dt_tecnico_extranjero: number
  dt_tipo_jornada_code: number | null
  dt_discapacidad: number
  dt_pensionado_vejez: number
  dt_afp_code: number | null
  dt_ips_code: number | null
  dt_isapre_fonasa_code: number | null
  dt_afc_code: number | null
  dt_ccaf_code: number
  dt_mutual_code: number
  cargas_familiares_legales: number
  cargas_familiares_maternales: number
  cargas_familiares_invalidez: number
  tramo_asignacion_familiar: string
  subsidio_trabajador_joven: number
  puesto_trabajo_pesado: string | null
  ahorro_previsional_voluntario: number
  ahorro_previsional_colectivo: number
  indemnizacion_a_todo_evento: number
  tasa_indemnizacion: number | null
  previsional_regime: string
  other_regime_type: string | null
  afp: string | null
  health_system: string | null
  afc_applicable: boolean
}

interface CatalogValidationSets {
  causalTerminoCodes: Set<number>
  regionCodes: Set<number>
  communeCodes: Set<number>
  tipoJornadaCodes: Set<number>
  discapacidadCodes: Set<number>
  pensionadoCodes: Set<number>
  afpCodes: Set<number>
  ipsCodes: Set<number>
  isapreFonasaCodes: Set<number>
  afcCodes: Set<number>
  ccafCodes: Set<number>
  mutualCodes: Set<number>
  tipoImpuestoCodes: Set<number>
  tecnicoExtranjeroCodes: Set<number>
  tramoAsignacionCodes: Set<string>
  employeeRegionDtCodes: Map<string, number | null>
  employeeCommuneDtCodes: Map<string, number | null>
}

type Severity = 'blocking' | 'warning'

export async function validateLREData(
  companyId: string,
  year: number,
  month: number,
  supabase: SupabaseClient<any, any, any>
): Promise<{
  status: LREValidationStatus
  blockingErrors: number
  warnings: number
  errors: LREValidationError[]
}> {
  const errors: LREValidationError[] = []

  const catalogs = await loadCatalogValidationSets(supabase)

  const { data: companyData } = await supabase
    .from('companies')
    .select('mutual_ley16744_code, sat_accident_rate')
    .eq('id', companyId)
    .single()

  const companyMutualCode = companyData?.mutual_ley16744_code ?? 0

  const { data: bookData, error: bookError } = await supabase
    .from('payroll_books')
    .select('id')
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (bookError || !bookData) {
    return { status: 'errors', blockingErrors: 1, warnings: 0, errors: [{ employee_id: '', employee_rut: '', employee_name: '', field_code: 0, field_name: 'Libro', error_type: 'missing_mandatory', severity: 'blocking', message: 'No existe libro de remuneraciones para el período' }] }
  }

  const { data: entries } = await supabase
    .from('payroll_book_entries')
    .select('employee_id')
    .eq('payroll_book_id', (bookData as any).id)

  if (!entries || entries.length === 0) {
    return { status: 'errors', blockingErrors: 1, warnings: 0, errors: [{ employee_id: '', employee_rut: '', employee_name: '', field_code: 0, field_name: 'Entradas', error_type: 'missing_mandatory', severity: 'blocking', message: 'No hay entradas en el libro de remuneraciones' }] }
  }

  const employeeIds = (entries as any[] || []).map(e => e.employee_id)

  const { data: empRaw } = await supabase
    .from('employees')
    .select('*')
    .in('id', employeeIds)

  if (!empRaw || empRaw.length === 0) {
    return { status: 'errors', blockingErrors: 1, warnings: 0, errors: [{ employee_id: '', employee_rut: '', employee_name: '', field_code: 0, field_name: 'Empleados', error_type: 'missing_mandatory', severity: 'blocking', message: 'No se pudieron cargar los datos de empleados' }] }
  }

  const employees = empRaw as any[]
  const regionIds = [...new Set(employees.map(e => e.region_id).filter(Boolean) as string[])]
  const communeIds = [...new Set(employees.map(e => e.commune_id).filter(Boolean) as string[])]

  const { data: empRegions } = await supabase
    .from('geo_regions')
    .select('id, dt_code')
    .in('id', regionIds.length > 0 ? regionIds : ['00000000-0000-0000-0000-000000000000'])

  const { data: empCommunes } = await supabase
    .from('geo_communes')
    .select('id, dt_code')
    .in('id', communeIds.length > 0 ? communeIds : ['00000000-0000-0000-0000-000000000000'])

  const employeeRegionDtCodes = new Map<string, number | null>()
  const regionDtMap = new Map((empRegions || []).map((r: any) => [r.id, r.dt_code]))
  for (const e of employees) {
    employeeRegionDtCodes.set(e.id, e.region_id ? (regionDtMap.get(e.region_id) ?? null) : null)
  }

  const employeeCommuneDtCodes = new Map<string, number | null>()
  const communeDtMap = new Map((empCommunes || []).map((c: any) => [c.id, c.dt_code]))
  for (const e of employees) {
    employeeCommuneDtCodes.set(e.id, e.commune_id ? (communeDtMap.get(e.commune_id) ?? null) : null)
  }

  for (const emp of employees) {
    const e = emp as unknown as EmployeeForValidation
    const rut = formatRUTForLRE(e.rut)

    if (!rut) {
      addError(errors, e.id, '', e.full_name, 1101, 'Rut trabajador', 'missing_mandatory', 'blocking', 'RUT del trabajador es obligatorio')
    } else if (!validateRUTFormat(rut)) {
      addError(errors, e.id, rut, e.full_name, 1101, 'Rut trabajador', 'invalid_type', 'blocking', `RUT con formato inválido: ${rut}`)
    }

    if (!e.hire_date) {
      addError(errors, e.id, rut, e.full_name, 1102, 'Fecha inicio contrato', 'missing_mandatory', 'blocking', 'Fecha de inicio de contrato es obligatoria')
    }

    const empRegionDtCode = employeeRegionDtCodes.get(e.id)
    const empCommuneDtCode = employeeCommuneDtCodes.get(e.id)

    if (!e.region_id) {
      addError(errors, e.id, rut, e.full_name, 1105, 'Región servicios', 'missing_mandatory', 'blocking', 'Región de prestación de servicios es obligatoria')
    } else if (empRegionDtCode === null || empRegionDtCode === undefined) {
      addError(errors, e.id, rut, e.full_name, 1105, 'Región servicios', 'missing_mandatory', 'blocking', 'Región no tiene código DT asignado. Verifique que la región tenga dt_code en la tabla geo_regions')
    }

    if (!e.commune_id) {
      addError(errors, e.id, rut, e.full_name, 1106, 'Comuna servicios', 'missing_mandatory', 'blocking', 'Comuna de prestación de servicios es obligatoria')
    } else if (empCommuneDtCode === null || empCommuneDtCode === undefined) {
      addError(errors, e.id, rut, e.full_name, 1106, 'Comuna servicios', 'missing_mandatory', 'blocking', 'Comuna no tiene código DT asignado. Verifique que la comuna tenga dt_code en la tabla geo_communes')
    }

    if (e.dt_tipo_jornada_code === null) {
      addError(errors, e.id, rut, e.full_name, 1107, 'Tipo jornada', 'missing_mandatory', 'blocking', 'Código tipo de jornada es obligatorio')
    } else if (!catalogs.tipoJornadaCodes.has(e.dt_tipo_jornada_code)) {
      addError(errors, e.id, rut, e.full_name, 1107, 'Tipo jornada', 'invalid_code', 'blocking', `Código tipo de jornada ${e.dt_tipo_jornada_code} no existe en Tabla N°6`)
    }

    if (!catalogs.discapacidadCodes.has(e.dt_discapacidad)) {
      addError(errors, e.id, rut, e.full_name, 1108, 'Discapacidad', 'invalid_code', 'blocking', `Código discapacidad ${e.dt_discapacidad} no existe en Tabla N°7`)
    }

    if (!catalogs.pensionadoCodes.has(e.dt_pensionado_vejez)) {
      addError(errors, e.id, rut, e.full_name, 1109, 'Pensionado vejez', 'invalid_code', 'blocking', `Código pensionado vejez ${e.dt_pensionado_vejez} no existe en Tabla N°8`)
    }

    if (e.dt_afp_code === null) {
      addError(errors, e.id, rut, e.full_name, 1141, 'AFP', 'missing_mandatory', 'blocking', 'Código AFP es obligatorio')
    } else if (!catalogs.afpCodes.has(e.dt_afp_code)) {
      addError(errors, e.id, rut, e.full_name, 1141, 'AFP', 'invalid_code', 'blocking', `Código AFP ${e.dt_afp_code} no existe en Tabla N°9`)
    }

    if (e.dt_ips_code === null && e.previsional_regime === 'OTRO_REGIMEN') {
      addError(errors, e.id, rut, e.full_name, 1142, 'IPS Ex-INP', 'missing_mandatory', 'blocking', 'Código IPS Ex-INP es obligatorio para régimen especial')
    }

    if (e.dt_isapre_fonasa_code === null) {
      addError(errors, e.id, rut, e.full_name, 1143, 'Fonasa/Isapre', 'missing_mandatory', 'blocking', 'Código Fonasa/Isapre es obligatorio')
    } else if (!catalogs.isapreFonasaCodes.has(e.dt_isapre_fonasa_code)) {
      addError(errors, e.id, rut, e.full_name, 1143, 'Fonasa/Isapre', 'invalid_code', 'blocking', `Código Fonasa/Isapre ${e.dt_isapre_fonasa_code} no existe en Tabla N°11`)
    }

    if (!catalogs.tipoImpuestoCodes.has(e.dt_tipo_impuesto_renta)) {
      addError(errors, e.id, rut, e.full_name, 1170, 'Tipo impuesto renta', 'invalid_code', 'blocking', `Código tipo impuesto renta ${e.dt_tipo_impuesto_renta} no existe en Tabla N°4`)
    }

    if (!catalogs.tecnicoExtranjeroCodes.has(e.dt_tecnico_extranjero)) {
      addError(errors, e.id, rut, e.full_name, 1146, 'Técnico extranjero', 'invalid_code', 'blocking', `Código técnico extranjero ${e.dt_tecnico_extranjero} no existe en Tabla N°5`)
    }

    if (e.dt_afc_code !== null && !catalogs.afcCodes.has(e.dt_afc_code)) {
      addError(errors, e.id, rut, e.full_name, 1151, 'AFC', 'invalid_code', 'blocking', `Código AFC ${e.dt_afc_code} no existe en Tabla N°12`)
    }

    if (!catalogs.ccafCodes.has(e.dt_ccaf_code)) {
      addError(errors, e.id, rut, e.full_name, 1110, 'CCAF', 'invalid_code', 'blocking', `Código CCAF ${e.dt_ccaf_code} no existe en Tabla N°13`)
    }

    if (companyMutualCode === 0) {
      addError(errors, '', '', '', 1152, 'Org. Ley 16.744', 'missing_mandatory', 'warning', 'No se ha configurado el organismo administrador Ley 16.744 a nivel de empresa. Configure el código mutual en Configuración de Empresa.')
    } else if (!catalogs.mutualCodes.has(companyMutualCode)) {
      addError(errors, '', '', '', 1152, 'Org. Ley 16.744', 'invalid_code', 'blocking', `Código mutual ${companyMutualCode} no existe en Tabla N°14`)
    }

    if (e.tramo_asignacion_familiar && !catalogs.tramoAsignacionCodes.has(e.tramo_asignacion_familiar)) {
      addError(errors, e.id, rut, e.full_name, 1114, 'Tramo asignación familiar', 'invalid_code', 'blocking', `Tramo "${e.tramo_asignacion_familiar}" no existe en Tabla N°15`)
    }

    const causalValidation = validarConsistenciaCausalTermino(e.contract_end_date, e.termination_cause_code)
    if (!causalValidation.valid) {
      addError(errors, e.id, rut, e.full_name, 1104, 'Causal término', 'invalid_business_rule', 'blocking', causalValidation.message!)
    }

    const afcValidation = validarConsistenciaAFC(e.dt_afc_code || 0, 0, 0)
    if (!afcValidation.valid) {
      addError(errors, e.id, rut, e.full_name, 1151, 'AFC', 'invalid_business_rule', 'warning', afcValidation.message!)
    }

    const indemnizacionValidation = validarConsistenciaIndemnizacion(
      e.indemnizacion_a_todo_evento, e.tasa_indemnizacion, 0
    )
    if (!indemnizacionValidation.valid) {
      for (const msg of indemnizacionValidation.messages) {
        addError(errors, e.id, rut, e.full_name, 1131, 'Indemnización a todo evento', 'invalid_business_rule', 'warning', msg)
      }
    }
  }

  // Validacion a nivel de empresa: SAT + Ley SANNA (4152)
  const period202608 = year > 2026 || (year === 2026 && month >= 8)
  if (period202608 && (!companyData?.sat_accident_rate || companyData.sat_accident_rate === 0)) {
    addError(errors, '', '', '', 4152, 'SAT + Ley SANNA', 'missing_mandatory', 'warning', 'No se ha configurado la tasa SAT en la empresa. El cálculo de 4152 será 0 (solo Ley SANNA 0,03%). Configure la tasa en Configuración de Empresa.')
  }

  const blockingErrors = errors.filter(e => e.severity === 'blocking').length
  const warnings = errors.filter(e => e.severity === 'warning').length
  const status: LREValidationStatus = blockingErrors > 0 ? 'errors' : warnings > 0 ? 'warnings' : 'valid'

  return { status, blockingErrors, warnings, errors }
}

function addError(
  errors: LREValidationError[],
  employeeId: string,
  employeeRut: string,
  employeeName: string,
  fieldCode: number,
  fieldName: string,
  errorType: LREValidationError['error_type'],
  severity: Severity,
  message: string,
  currentValue?: unknown
) {
  errors.push({
    employee_id: employeeId,
    employee_rut: employeeRut,
    employee_name: employeeName,
    field_code: fieldCode,
    field_name: fieldName,
    error_type: errorType,
    severity,
    message,
    current_value: currentValue,
  })
}

function validateRUTFormat(rut: string): boolean {
  const rutRegex = /^\d{1,10}-[\dkK]$/
  return rutRegex.test(rut)
}

async function loadCatalogValidationSets(supabase: SupabaseClient<any, any, any>): Promise<CatalogValidationSets> {
  const [
    { data: causales },
    { data: regiones },
    { data: comunas },
    { data: tiposJornada },
    { data: discapacidad },
    { data: pensionado },
    { data: afps },
    { data: ips },
    { data: isapreFonasa },
    { data: afc },
    { data: ccaf },
    { data: mutual },
    { data: tipoImpuesto },
    { data: tecnicoExt },
    { data: tramos },
  ] = await Promise.all([
    supabase.from('lre_causales_termino').select('code').eq('active', true),
    supabase.from('geo_regions').select('dt_code').not('dt_code', 'is', null),
    supabase.from('geo_communes').select('dt_code').not('dt_code', 'is', null),
    supabase.from('lre_tipo_jornada').select('code').eq('active', true),
    supabase.from('lre_discapacidad').select('code').eq('active', true),
    supabase.from('lre_pensionado_vejez').select('code').eq('active', true),
    supabase.from('lre_afp').select('code').eq('active', true),
    supabase.from('lre_ips_exinp').select('code').eq('active', true),
    supabase.from('lre_isapre_fonasa').select('code').eq('active', true),
    supabase.from('lre_afc').select('code').eq('active', true),
    supabase.from('lre_ccaf').select('code').eq('active', true),
    supabase.from('lre_mutual_ley16744').select('code').eq('active', true),
    supabase.from('lre_tipo_impuesto_renta').select('code').eq('active', true),
    supabase.from('lre_tecnico_extranjero').select('code').eq('active', true),
    supabase.from('lre_tramo_asignacion_familiar').select('code').eq('active', true),
  ])

  return {
    causalTerminoCodes: new Set((causales || []).map((c: any) => c.code)),
    regionCodes: new Set((regiones || []).map((r: any) => r.dt_code).filter((v: any) => v !== null)),
    communeCodes: new Set((comunas || []).map((c: any) => c.dt_code).filter((v: any) => v !== null)),
    tipoJornadaCodes: new Set((tiposJornada || []).map((t: any) => t.code)),
    discapacidadCodes: new Set((discapacidad || []).map((d: any) => d.code)),
    pensionadoCodes: new Set((pensionado || []).map((p: any) => p.code)),
    afpCodes: new Set((afps || []).map((a: any) => a.code)),
    ipsCodes: new Set((ips || []).map((i: any) => i.code)),
    isapreFonasaCodes: new Set((isapreFonasa || []).map((i: any) => i.code)),
    afcCodes: new Set((afc || []).map((a: any) => a.code)),
    ccafCodes: new Set((ccaf || []).map((c: any) => c.code)),
    mutualCodes: new Set((mutual || []).map((m: any) => m.code)),
    tipoImpuestoCodes: new Set((tipoImpuesto || []).map((t: any) => t.code)),
    tecnicoExtranjeroCodes: new Set((tecnicoExt || []).map((t: any) => t.code)),
    tramoAsignacionCodes: new Set((tramos || []).map((t: any) => t.code)),
    employeeRegionDtCodes: new Map(),
    employeeCommuneDtCodes: new Map(),
  }
}