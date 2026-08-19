import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateLREData } from '@/lib/services/lre/lreValidator'
import { mapPayrollItemsToLRE, calculateLTRETotals } from '@/lib/services/lre/lreCodeMapper'
import { formatRUTForLRE, formatDateForLRE } from '@/lib/services/lre/lreTypes'
import { calcularDiasTrabajados } from '@/lib/services/lre/lreCalculations'
import crypto from 'crypto'

const SEPARATOR = ';'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await request.json()
    const { companyId, year, month, bookId } = body

    if (!companyId || !year || !month) {
      return NextResponse.json({ error: 'companyId, year y month son obligatorios' }, { status: 400 })
    }

    const validation = await validateLREData(companyId, year, month, supabase)

    if (validation.blockingErrors > 0) {
      return NextResponse.json({
        success: false,
        validation_status: validation.status,
        blocking_errors: validation.blockingErrors,
        warnings: validation.warnings,
        errors: validation.errors,
        message: `Existen ${validation.blockingErrors} errores bloqueantes. Corríjalos antes de exportar.`
      }, { status: 400 })
    }

    const { data: book, error: bookError } = await supabase
      .from('payroll_books')
      .select('*')
      .eq('id', bookId || '')
      .single()

    if (bookError || !book) {
      const { data: bookByPeriod } = await supabase
        .from('payroll_books')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .eq('month', month)
        .single()

      if (!bookByPeriod) {
        return NextResponse.json({ error: 'Libro de remuneraciones no encontrado' }, { status: 404 })
      }
    }

    const payrollBook = book || (await supabase.from('payroll_books').select('*').eq('company_id', companyId).eq('year', year).eq('month', month).single()).data

    const { data: entries, error: entriesError } = await supabase
      .from('payroll_book_entries')
      .select('*')
      .eq('payroll_book_id', payrollBook.id)

    if (entriesError || !entries || entries.length === 0) {
      return NextResponse.json({ error: 'No hay entradas en el libro de remuneraciones' }, { status: 400 })
    }

    // Obtener payroll_items directamente con lre_dt_code para mapeo granular
    const slipIds = entries.map((e: any) => e.payroll_slip_id).filter(Boolean)
    const { data: allPayrollItems } = await supabase
      .from('payroll_items')
      .select('id, payroll_slip_id, type, category, amount, lre_dt_code')
      .in('payroll_slip_id', slipIds.length > 0 ? slipIds : ['00000000-0000-0000-0000-000000000000'])

    const itemsBySlip = new Map<string, any[]>()
    for (const item of (allPayrollItems || [])) {
      const slipId = item.payroll_slip_id
      if (!itemsBySlip.has(slipId)) itemsBySlip.set(slipId, [])
      itemsBySlip.get(slipId)!.push(item)
    }

    const { data: company } = await supabase
      .from('companies')
      .select('rut, mutual_ley16744_code, sat_accident_rate')
      .eq('id', companyId)
      .single()

    const companyRut = formatRUTForLRE(company?.rut || '').replace(/\./g, '').replace(/-/g, '')
    const periodStr = `${year}${String(month).padStart(2, '0')}`
    const fileName = `LRE_${companyRut}_${periodStr}.csv`

    const employeeIds = entries.map((e: any) => e.employee_id)

    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .in('id', employeeIds)

    const employeeMap = new Map((employees || []).map((e: any) => [e.id, e]))

    const regionIds = [...new Set((employees || []).map((e: any) => e.region_id).filter(Boolean))]
    const communeIds = [...new Set((employees || []).map((e: any) => e.commune_id).filter(Boolean))]

    const { data: regions } = await supabase
      .from('geo_regions')
      .select('id, dt_code')
      .in('id', regionIds.length > 0 ? regionIds : ['00000000-0000-0000-0000-000000000000'])

    const { data: communes } = await supabase
      .from('geo_communes')
      .select('id, dt_code')
      .in('id', communeIds.length > 0 ? communeIds : ['00000000-0000-0000-0000-000000000000'])

    const regionDTCodeMap = new Map((regions || []).map((r: any) => [r.id, r.dt_code]))
    const communeDTCodeMap = new Map((communes || []).map((c: any) => [c.id, c.dt_code]))

    const { data: fieldMappings } = await supabase
      .from('lre_field_mapping')
      .select('*')
      .eq('active', true)
      .order('dt_code')

    const { data: sindicatos } = await supabase
      .from('employee_sindicatos')
      .select('*')
      .in('employee_id', employeeIds)

    const sindicatosMap = new Map<string, any[]>()
    for (const s of (sindicatos || [])) {
      if (!sindicatosMap.has(s.employee_id)) sindicatosMap.set(s.employee_id, [])
      sindicatosMap.get(s.employee_id)!.push(s)
    }

    const csvHeaders = buildCSVHeaders()
    const csvRows: string[][] = []

    for (const entry of entries) {
      const emp = employeeMap.get(entry.employee_id)
      if (!emp) continue

      const row = buildLREmployeeRow(entry, emp, sindicatosMap.get(entry.employee_id) || [], year, month, regionDTCodeMap, communeDTCodeMap, itemsBySlip.get(entry.payroll_slip_id) || [], fieldMappings || [], company?.mutual_ley16744_code ?? 0, company?.sat_accident_rate ?? 0)
      csvRows.push(row)
    }

    let csvContent = csvHeaders.join(SEPARATOR) + '\n'
    for (const row of csvRows) {
      csvContent += row.join(SEPARATOR) + '\n'
    }

    const ansiContent = Buffer.from(csvContent, 'latin1').toString('latin1')
    const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex')

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || 'unknown'

    await supabase.from('lre_export_logs').insert({
      company_id: companyId,
      payroll_book_id: payrollBook.id,
      generated_by: userId,
      period_year: year,
      period_month: month,
      file_name: fileName,
      file_hash: fileHash,
      file_size: Buffer.byteLength(ansiContent, 'latin1'),
      total_employees: csvRows.length,
      validation_status: validation.status,
      blocking_errors: validation.blockingErrors,
      warnings: validation.warnings,
      validation_log: validation.errors,
    })

    return NextResponse.json({
      success: true,
      validation_status: validation.status,
      blocking_errors: validation.blockingErrors,
      warnings: validation.warnings,
      errors: validation.errors,
      file_name: fileName,
      file_content: ansiContent,
      total_employees: csvRows.length,
    })

  } catch (error) {
    console.error('[LRE Export API] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al exportar LRE', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

function buildCSVHeaders(): string[] {
  return [
    '1101', '1102', '1103', '1104', '1105', '1106', '1170', '1146', '1107', '1108', '1109',
    '1141', '1142', '1143', '1151', '1110', '1152', '1111', '1112', '1113', '1114',
    '1171', '1172', '1173', '1174', '1175', '1176', '1177', '1178', '1179', '1180',
    '1115', '1116', '1117', '1118', '1154', '1155', '1157', '1131', '1132',
    '2101', '2102', '2103', '2104', '2105', '2106', '2107', '2108', '2109', '2110',
    '2111', '2112', '2113', '2114', '2115', '2116', '2117', '2118', '2119', '2120',
    '2121', '2122', '2123', '2124', '2161',
    '2201', '2202', '2203', '2204',
    '2301', '2302', '2303', '2304', '2305', '2311', '2306', '2307', '2308', '2309',
    '2347', '2310', '2312', '2313', '2314', '2315', '2316', '2331',
    '2417', '2418',
    '3141', '3143', '3144', '3151', '3146', '3147', '3155', '3156', '3157', '3158',
    '3161', '3162', '3163', '3164', '3165', '3166', '3167',
    '3171', '3172', '3173', '3174', '3175', '3176', '3177', '3178', '3179', '3180',
    '3110', '3181', '3182', '3183', '3154', '3184', '3185', '3186', '3187', '3188',
    '4151', '4152', '4155', '4131', '4154',
    '5201', '5210', '5220', '5230', '5240',
    '5301', '5361', '5362', '5341', '5302',
    '5410',
    '5501', '5502', '5564', '5565',
  ]
}

function buildLREmployeeRow(
  entry: any,
  emp: any,
  sindicatos: any[],
  year: number,
  month: number,
  regionDTCodeMap: Map<string, number | null>,
  communeDTCodeMap: Map<string, number | null>,
  payrollItems: any[],
  fieldMappings: any[],
  companyMutualCode: number,
  companySatRate: number
): string[] {
  const empty = ''

  const regionDTCode = emp.region_id ? (regionDTCodeMap.get(emp.region_id) ?? empty) : empty
  const communeDTCode = emp.commune_id ? (communeDTCodeMap.get(emp.commune_id) ?? empty) : empty

  const diasTrabajados = calcularDiasTrabajados(
    emp.hire_date, emp.contract_end_date, month, year,
    emp.dias_licencia_medica_mes || 0, emp.dias_vacaciones_mes || 0
  )

  const sindicatosOrdered = sindicatos.sort((a: any, b: any) => a.sindicato_order - b.sindicato_order)

  const lreAmounts = mapPayrollItemsToLRE(
    payrollItems.map((item: any) => ({
      type: item.type,
      category: item.category,
      amount: Number(item.amount),
      lre_dt_code: item.lre_dt_code || null,
    })),
    fieldMappings
  )

  // Aportes del empleador (no están en payroll_items, vienen de payroll_book_entries)
  lreAmounts[4151] = Math.round(Number(entry.employer_afc_contribution) || 0)

  // 4152: SAT + Ley SANNA (0,03%). Solo desde agosto 2026 en adelante.
  // Ley SANNA = base_imponible * 0.0003 (0.03%)
  // SAT = base_imponible * tasa_empresa (configurada en companies.sat_accident_rate)
  const period202608 = year > 2026 || (year === 2026 && month >= 8)
  if (period202608) {
    const taxableBase4152 = lreAmounts[5210] || 0
    const leySanna = Math.round(taxableBase4152 * 0.0003)
    const sat = Math.round(taxableBase4152 * (Number(companySatRate) / 100))
    lreAmounts[4152] = leySanna + sat
  } else {
    lreAmounts[4152] = 0
  }

  lreAmounts[4155] = Math.round(Number(entry.employer_sis_contribution) || 0)
  lreAmounts[4131] = Math.round(Number(entry.employer_afp_account) || 0)
  lreAmounts[4154] = Math.round(Number(entry.employer_afp_contribution) || 0)

  const totals = calculateLTRETotals(lreAmounts)

  const row: string[] = [
    formatRUTForLRE(emp.rut) || empty,
    formatDateForLRE(emp.hire_date) || empty,
    formatDateForLRE(emp.contract_end_date) || empty,
    emp.termination_cause_code?.toString() || empty,
    regionDTCode ? regionDTCode.toString() : empty,
    communeDTCode ? communeDTCode.toString() : empty,
    (emp.dt_tipo_impuesto_renta || 1).toString(),
    (emp.dt_tecnico_extranjero || 0).toString(),
    (emp.dt_tipo_jornada_code || 101).toString(),
    (emp.dt_discapacidad || 0).toString(),
    (emp.dt_pensionado_vejez || 0).toString(),
    (emp.dt_afp_code || empty).toString(),
    (emp.dt_ips_code || empty).toString(),
    (emp.dt_isapre_fonasa_code || empty).toString(),
    (emp.dt_afc_code ?? (emp.afc_applicable ? 1 : 0)).toString(),
    (emp.dt_ccaf_code ?? 0).toString(),
    (companyMutualCode || 0).toString(),
    (emp.cargas_familiares_legales ?? 0).toString(),
    (emp.cargas_familiares_maternales ?? 0).toString(),
    (emp.cargas_familiares_invalidez ?? 0).toString(),
    emp.tramo_asignacion_familiar || 'D',
    ...Array.from({ length: 10 }, (_, i) => sindicatosOrdered[i]?.rut_sindicato ? formatRUTForLRE(sindicatosOrdered[i].rut_sindicato) : empty),
    diasTrabajados.toString(),
    (emp.dias_licencia_medica_mes ?? 0).toString(),
    (emp.dias_vacaciones_mes ?? 0).toString(),
    (emp.subsidio_trabajador_joven ?? 0).toString(),
    emp.puesto_trabajo_pesado || empty,
    (emp.ahorro_previsional_voluntario ?? 0).toString(),
    (emp.ahorro_previsional_colectivo ?? 0).toString(),
    (emp.indemnizacion_a_todo_evento ?? 0).toString(),
    emp.tasa_indemnizacion?.toString() || empty,
    (lreAmounts[2101] || 0).toString(),
    (lreAmounts[2102] || 0).toString(),
    (lreAmounts[2103] || 0).toString(),
    (lreAmounts[2104] || 0).toString(),
    (lreAmounts[2105] || 0).toString(),
    (lreAmounts[2106] || 0).toString(),
    (lreAmounts[2107] || 0).toString(),
    (lreAmounts[2108] || 0).toString(),
    (lreAmounts[2109] || 0).toString(),
    (lreAmounts[2110] || 0).toString(),
    (lreAmounts[2111] || 0).toString(),
    (lreAmounts[2112] || 0).toString(),
    (lreAmounts[2113] || 0).toString(),
    (lreAmounts[2114] || 0).toString(),
    (lreAmounts[2115] || 0).toString(),
    (lreAmounts[2116] || 0).toString(),
    (lreAmounts[2117] || 0).toString(),
    (lreAmounts[2118] || 0).toString(),
    (lreAmounts[2119] || 0).toString(),
    (lreAmounts[2120] || 0).toString(),
    (lreAmounts[2121] || 0).toString(),
    (lreAmounts[2122] || 0).toString(),
    (lreAmounts[2123] || 0).toString(),
    (lreAmounts[2124] || 0).toString(),
    (lreAmounts[2161] || 0).toString(),
    (lreAmounts[2201] || 0).toString(),
    (lreAmounts[2202] || 0).toString(),
    (lreAmounts[2203] || 0).toString(),
    (lreAmounts[2204] || 0).toString(),
    (lreAmounts[2301] || 0).toString(),
    (lreAmounts[2302] || 0).toString(),
    (lreAmounts[2303] || 0).toString(),
    (lreAmounts[2304] || 0).toString(),
    (lreAmounts[2305] || 0).toString(),
    (lreAmounts[2311] || 0).toString(),
    (lreAmounts[2306] || 0).toString(),
    (lreAmounts[2307] || 0).toString(),
    (lreAmounts[2308] || 0).toString(),
    (lreAmounts[2309] || 0).toString(),
    (lreAmounts[2347] || 0).toString(),
    (lreAmounts[2310] || 0).toString(),
    (lreAmounts[2312] || 0).toString(),
    (lreAmounts[2313] || 0).toString(),
    (lreAmounts[2314] || 0).toString(),
    (lreAmounts[2315] || 0).toString(),
    (lreAmounts[2316] || 0).toString(),
    (lreAmounts[2331] || 0).toString(),
    (lreAmounts[2417] || 0).toString(),
    (lreAmounts[2418] || 0).toString(),
    (lreAmounts[3141] || 0).toString(),
    (lreAmounts[3143] || 0).toString(),
    (lreAmounts[3144] || 0).toString(),
    (lreAmounts[3151] || 0).toString(),
    (lreAmounts[3146] || 0).toString(),
    (lreAmounts[3147] || 0).toString(),
    (lreAmounts[3155] || 0).toString(),
    (lreAmounts[3156] || 0).toString(),
    (lreAmounts[3157] || 0).toString(),
    (lreAmounts[3158] || 0).toString(),
    (lreAmounts[3161] || 0).toString(),
    (lreAmounts[3162] || 0).toString(),
    (lreAmounts[3163] || 0).toString(),
    (lreAmounts[3164] || 0).toString(),
    (lreAmounts[3165] || 0).toString(),
    (lreAmounts[3166] || 0).toString(),
    (lreAmounts[3167] || 0).toString(),
    (lreAmounts[3171] || 0).toString(),
    (lreAmounts[3172] || 0).toString(),
    (lreAmounts[3173] || 0).toString(),
    (lreAmounts[3174] || 0).toString(),
    (lreAmounts[3175] || 0).toString(),
    (lreAmounts[3176] || 0).toString(),
    (lreAmounts[3177] || 0).toString(),
    (lreAmounts[3178] || 0).toString(),
    (lreAmounts[3179] || 0).toString(),
    (lreAmounts[3180] || 0).toString(),
    (lreAmounts[3110] || 0).toString(),
    (lreAmounts[3181] || 0).toString(),
    (lreAmounts[3182] || 0).toString(),
    (lreAmounts[3183] || 0).toString(),
    (lreAmounts[3154] || 0).toString(),
    (lreAmounts[3184] || 0).toString(),
    (lreAmounts[3185] || 0).toString(),
    (lreAmounts[3186] || 0).toString(),
    (lreAmounts[3187] || 0).toString(),
    (lreAmounts[3188] || 0).toString(),
    (lreAmounts[4151] || 0).toString(),
    (lreAmounts[4152] || 0).toString(),
    (lreAmounts[4155] || 0).toString(),
    (lreAmounts[4131] || 0).toString(),
    (lreAmounts[4154] || 0).toString(),
    (totals[5201] || 0).toString(),
    (totals[5210] || 0).toString(),
    (totals[5220] || 0).toString(),
    (totals[5230] || 0).toString(),
    (totals[5240] || 0).toString(),
    (totals[5301] || 0).toString(),
    (totals[5361] || 0).toString(),
    (totals[5362] || 0).toString(),
    (totals[5341] || 0).toString(),
    (totals[5302] || 0).toString(),
    (totals[5410] || 0).toString(),
    (totals[5501] || 0).toString(),
    (totals[5502] || 0).toString(),
    (totals[5564] || 0).toString(),
    (totals[5565] || 0).toString(),
  ]

  return row
}