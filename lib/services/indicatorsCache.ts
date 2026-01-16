import { supabase } from '@/lib/supabase/client'
import { PreviredIndicators, getPreviredIndicators } from './previredAPI'

/**
 * Obtiene indicadores previsionales desde cache (BD) o API
 */
export async function getCachedIndicators(
  year: number,
  month: number
): Promise<PreviredIndicators | null> {
  try {
    // Primero intentar obtener desde la base de datos
    const { data: cached, error } = await supabase
      .from('previred_indicators')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single()

    if (!error && cached && cached.indicators_json) {
      // Devolver desde cache
      return cached.indicators_json as PreviredIndicators
    }

    // Si no hay en cache, obtener de la API
    const indicators = await getPreviredIndicators(month, year)
    
    if (indicators) {
      // Guardar en cache para próximas consultas
      await saveIndicatorsToCache(year, month, indicators)
    }

    return indicators
  } catch (error) {
    console.error('Error al obtener indicadores desde cache:', error)
    // Intentar obtener directamente de la API
    return await getPreviredIndicators(month, year)
  }
}

/**
 * Guarda indicadores en la base de datos para cache
 */
async function saveIndicatorsToCache(
  year: number,
  month: number,
  indicators: PreviredIndicators
): Promise<void> {
  try {
    const { error } = await supabase
      .from('previred_indicators')
      .upsert({
        year,
        month,
        uf_value: parseFloat(indicators.UFValPeriodo.replace(/\./g, '').replace(',', '.')),
        utm_value: parseFloat(indicators.UTMVal.replace(/\./g, '').replace(',', '.')),
        uta_value: parseFloat(indicators.UTAVal.replace(/\./g, '').replace(',', '.')),
        rti_afp_pesos: parseFloat(indicators.RTIAfpPesos.replace(/\./g, '').replace(',', '.')),
        rti_ips_pesos: parseFloat(indicators.RTIIpsPesos.replace(/\./g, '').replace(',', '.')),
        rti_seg_ces_pesos: parseFloat(indicators.RTISegCesPesos.replace(/\./g, '').replace(',', '.')),
        rmi_trab_depe_ind: parseFloat(indicators.RMITrabDepeInd.replace(/\./g, '').replace(',', '.')),
        rmi_men18_may65: parseFloat(indicators.RMIMen18May65.replace(',', '.')),
        rmi_trab_casa_part: parseFloat(indicators.RMITrabCasaPart.replace(',', '.')),
        rmi_no_remu: parseFloat(indicators.RMINoRemu.replace(',', '.')),
        indicators_json: indicators,
        source: 'gael_cloud',
      }, {
        onConflict: 'year,month'
      })

    if (error) {
      console.error('Error al guardar indicadores en cache:', error)
    }
  } catch (error) {
    console.error('Error al guardar indicadores:', error)
  }
}

