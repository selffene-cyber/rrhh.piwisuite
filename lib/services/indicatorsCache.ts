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
      // SIEMPRE usar el campo numérico como fuente de verdad para RMITrabDepeInd
      // Esto previene problemas de discrepancia entre JSON y campo numérico
      const numericRMI = cached.rmi_trab_depe_ind
      const jsonRMI = cached.indicators_json.RMITrabDepeInd
      
      // Parsear el JSON para comparar (eliminar puntos y comas)
      const parseChileanNumber = (str: string): number => {
        if (!str) return 0
        return parseFloat(str.replace(/\./g, '').replace(',', '.'))
      }
      
      const jsonRMIParsed = parseChileanNumber(jsonRMI || '0')
      
      // SIEMPRE usar el campo numérico como fuente de verdad
      // Esto asegura que siempre devolvamos el valor correcto, sin importar qué tenga el JSON
      if (numericRMI) {
        const numericRMIString = Math.trunc(numericRMI).toString()
        
        // DEBUG: Log siempre para diagnosticar
        console.log('🔍 [INDICADORES DEBUG]', {
          año: year,
          mes: month,
          campo_numerico: numericRMI,
          json_original: jsonRMI,
          json_parseado: jsonRMIParsed,
          valor_a_usar: numericRMIString
        })
        
        // SIEMPRE crear un JSON corregido usando el campo numérico
        // Esto garantiza que siempre devolvamos el valor correcto
        const correctedJson = {
          ...cached.indicators_json,
          RMITrabDepeInd: numericRMIString
        }
        
        // Si el JSON no coincide, actualizar en BD (async, no bloquea)
        if (jsonRMIParsed !== numericRMI || jsonRMI !== numericRMIString) {
          console.warn('⚠️ [INDICADORES] JSON no coincide, actualizando en BD:', {
            campo_numerico: numericRMI,
            json_actual: jsonRMI,
            nuevo_valor: numericRMIString
          })
          
          supabase
            .from('previred_indicators')
            .update({
              indicators_json: correctedJson,
              updated_at: new Date().toISOString()
            })
            .eq('year', year)
            .eq('month', month)
            .then(() => {
              console.log('✅ [INDICADORES] JSON actualizado en BD a:', numericRMIString)
            })
            .catch((err: any) => {
              console.error('❌ [INDICADORES] Error al actualizar JSON:', err)
            })
        }
        
        // SIEMPRE devolver el JSON corregido (usando campo numérico)
        return correctedJson as PreviredIndicators
      }
      
      // Si no hay campo numérico, devolver el JSON original
      console.warn('⚠️ [INDICADORES] No hay campo numérico, usando JSON original')
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

