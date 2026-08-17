import { createClient } from '@supabase/supabase-js'
import type {
  LRECatalogItem,
  LREAFP,
  LREIPSExINP,
  LREIsapreFonasa,
  LRECCAF,
  LREMutual,
  LRECausalTermino,
  LRETipoJornada,
  LRETramoAsignacion,
  LREFieldMapping,
} from './lreTypes'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function getCausalesTermino(): Promise<LRECausalTermino[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_causales_termino')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapCausalTermino)
}

export async function getTiposImpuestoRenta(): Promise<LRECatalogItem[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_tipo_impuesto_renta')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapCatalogItem)
}

export async function getTecnicoExtranjero(): Promise<LRECatalogItem[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_tecnico_extranjero')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapCatalogItem)
}

export async function getTiposJornada(): Promise<LRETipoJornada[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_tipo_jornada')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapTipoJornada)
}

export async function getDiscapacidad(): Promise<LRECatalogItem[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_discapacidad')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapCatalogItem)
}

export async function getPensionadoVejez(): Promise<LRECatalogItem[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_pensionado_vejez')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapCatalogItem)
}

export async function getAFPs(): Promise<LREAFP[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_afp')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapAFP)
}

export async function getIPSExINP(): Promise<LREIPSExINP[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_ips_exinp')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapIPS)
}

export async function getIsapreFonasa(): Promise<LREIsapreFonasa[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_isapre_fonasa')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapIsapreFonasa)
}

export async function getAFC(): Promise<LRECatalogItem[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_afc')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapCatalogItem)
}

export async function getCCAF(): Promise<LRECCAF[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_ccaf')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapCCAF)
}

export async function getMutualLey16744(): Promise<LREMutual[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_mutual_ley16744')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapMutual)
}

export async function getTramosAsignacionFamiliar(): Promise<LRETramoAsignacion[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_tramo_asignacion_familiar')
    .select('*')
    .eq('active', true)
    .order('code')
  if (error) throw error
  return (data || []).map(mapTramo)
}

export async function getFieldMappings(): Promise<LREFieldMapping[]> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('lre_field_mapping')
    .select('*')
    .eq('active', true)
    .order('dt_code')
  if (error) throw error
  return (data || []).map(mapFieldMapping)
}

export async function getRegionDTCode(regionId: string): Promise<number | null> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('geo_regions')
    .select('dt_code')
    .eq('id', regionId)
    .single()
  if (error || !data) return null
  return data.dt_code
}

export async function getCommuneDTCode(communeId: string): Promise<number | null> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('geo_communes')
    .select('dt_code')
    .eq('id', communeId)
    .single()
  if (error || !data) return null
  return data.dt_code
}

export async function getAllCatalogs(): Promise<{
  causalesTermino: LRECausalTermino[]
  tiposImpuestoRenta: LRECatalogItem[]
  tecnicoExtranjero: LRECatalogItem[]
  tiposJornada: LRETipoJornada[]
  discapacidad: LRECatalogItem[]
  pensionadoVejez: LRECatalogItem[]
  afps: LREAFP[]
  ipsExINP: LREIPSExINP[]
  isapreFonasa: LREIsapreFonasa[]
  afc: LRECatalogItem[]
  ccaf: LRECCAF[]
  mutualLey16744: LREMutual[]
  tramosAsignacionFamiliar: LRETramoAsignacion[]
  fieldMappings: LREFieldMapping[]
}> {
  const [
    causalesTermino,
    tiposImpuestoRenta,
    tecnicoExtranjero,
    tiposJornada,
    discapacidad,
    pensionadoVejez,
    afps,
    ipsExINP,
    isapreFonasa,
    afc,
    ccaf,
    mutualLey16744,
    tramosAsignacionFamiliar,
    fieldMappings,
  ] = await Promise.all([
    getCausalesTermino(),
    getTiposImpuestoRenta(),
    getTecnicoExtranjero(),
    getTiposJornada(),
    getDiscapacidad(),
    getPensionadoVejez(),
    getAFPs(),
    getIPSExINP(),
    getIsapreFonasa(),
    getAFC(),
    getCCAF(),
    getMutualLey16744(),
    getTramosAsignacionFamiliar(),
    getFieldMappings(),
  ])

  return {
    causalesTermino,
    tiposImpuestoRenta,
    tecnicoExtranjero,
    tiposJornada,
    discapacidad,
    pensionadoVejez,
    afps,
    ipsExINP,
    isapreFonasa,
    afc,
    ccaf,
    mutualLey16744,
    tramosAsignacionFamiliar,
    fieldMappings,
  }
}

function mapCatalogItem(row: Record<string, unknown>): LRECatalogItem {
  return {
    id: row.id as number,
    code: row.code as number,
    label: row.label as string,
    description: row.description as string | null,
  }
}

function mapCausalTermino(row: Record<string, unknown>): LRECausalTermino {
  return {
    ...mapCatalogItem(row),
    article: row.article as string,
    requires_end_date: row.requires_end_date as boolean,
  }
}

function mapTipoJornada(row: Record<string, unknown>): LRETipoJornada {
  return {
    ...mapCatalogItem(row),
    description: row.description as string | null,
  }
}

function mapAFP(row: Record<string, unknown>): LREAFP {
  return {
    ...mapCatalogItem(row),
    name: row.name as string,
  }
}

function mapIPS(row: Record<string, unknown>): LREIPSExINP {
  return {
    ...mapCatalogItem(row),
    name: row.name as string,
    description: row.description as string | null,
  }
}

function mapIsapreFonasa(row: Record<string, unknown>): LREIsapreFonasa {
  return {
    ...mapCatalogItem(row),
    name: row.name as string,
    type: row.type as 'FONASA' | 'ISAPRE',
  }
}

function mapCCAF(row: Record<string, unknown>): LRECCAF {
  return {
    ...mapCatalogItem(row),
    name: row.name as string,
  }
}

function mapMutual(row: Record<string, unknown>): LREMutual {
  return {
    ...mapCatalogItem(row),
    name: row.name as string,
  }
}

function mapTramo(row: Record<string, unknown>): LRETramoAsignacion {
  return {
    id: row.id as number,
    code: row.code as string,
    label: row.label as string,
    description: row.description as string | null,
  }
}

function mapFieldMapping(row: Record<string, unknown>): LREFieldMapping {
  return {
    id: row.id as string,
    internal_category: row.internal_category as string,
    dt_code: row.dt_code as number,
    dt_concept: row.dt_concept as string,
    lre_category: row.lre_category as LREFieldMapping['lre_category'],
    dt_type: row.dt_type as LREFieldMapping['dt_type'],
    dt_max_size: row.dt_max_size as number,
    is_mandatory: row.is_mandatory as boolean,
    description: row.description as string | null,
  }
}