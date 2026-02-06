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
      
      // DEBUG: Log siempre para diagnosticar
      console.log('🔍 [INDICADORES DEBUG]', {
        año: year,
        mes: month,
        campo_numerico: numericRMI,
        json_original: jsonRMI,
        json_parseado: jsonRMIParsed,
        coinciden: jsonRMIParsed === numericRMI
      })
      
      // SIEMPRE usar el campo numérico si existe (sin importar si coincide o no)
      // Esto asegura que siempre usemos el valor correcto de la BD
      if (numericRMI) {
        const numericRMIString = Math.trunc(numericRMI).toString()
        
        // Si el JSON no coincide con el numérico, corregirlo
        if (jsonRMIParsed !== numericRMI || jsonRMI !== numericRMIString) {
          console.warn('⚠️ [INDICADORES] Corrigiendo JSON para usar campo numérico:', {
            campo_numerico: numericRMI,
            json_actual: jsonRMI,
            json_parseado: jsonRMIParsed,
            nuevo_valor: numericRMIString,
            año: year,
            mes: month
          })
          
          // Actualizar el JSON con el valor del campo numérico (sin decimales)
          const correctedJson = {
            ...cached.indicators_json,
            RMITrabDepeInd: numericRMIString
          }
          
          // Guardar la corrección en la BD (async, no bloquea)
          supabase
            .from('previred_indicators')
            .update({
              indicators_json: correctedJson,
              updated_at: new Date().toISOString()
            })
            .eq('year', year)
            .eq('month', month)
            .then(() => {
              console.log('✅ [INDICADORES] JSON corregido automáticamente a:', numericRMIString)
            })
            .catch((err) => {
              console.error('❌ [INDICADORES] Error al corregir JSON:', err)
            })
          
          // Devolver el JSON corregido INMEDIATAMENTE
          return correctedJson as PreviredIndicators
        }
      }
      
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

