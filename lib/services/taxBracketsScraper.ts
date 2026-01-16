/**
 * Scraper para obtener tramos del Impuesto Único de Segunda Categoría desde el SII
 * URL: https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto{year}.htm
 */

interface TaxBracket {
  desde: number | null
  hasta: number | null
  factor: number
  cantidad_rebajar: number
  tasa_efectiva: string
}

interface ScrapedTaxBrackets {
  year: number
  month: number
  period_type: 'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'DIARIO'
  brackets: TaxBracket[]
}

/**
 * Parsea un número chileno (formato: $ 938.817,00 o 938.817,00)
 */
function parseChileanNumber(str: string): number {
  if (!str || str.trim() === '' || str === '-.-' || str === 'Exento') {
    return 0
  }
  // Remover símbolos y espacios, convertir coma a punto
  const cleaned = str.replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim()
  return parseFloat(cleaned) || 0
}

/**
 * Extrae los tramos de una tabla HTML del SII
 * La estructura real es: <tr><td><strong>MENSUAL</strong></td><td>$ 938.817,00</td>...
 */
function extractBracketsFromTable(html: string, periodType: string): TaxBracket[] {
  const brackets: TaxBracket[] = []
  
  // Buscar todas las filas de la tabla que pertenecen a este período
  // El período está marcado con <td><strong>MENSUAL</strong></td> en la primera columna
  const periodRegex = new RegExp(`<td><strong>${periodType}</strong></td>`, 'i')
  
  // Encontrar todas las filas <tr> que contienen este período
  const allRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
  
  let inPeriodSection = false
  let currentPeriod = ''
  
  for (const rowHtml of allRows) {
    // Extraer todas las celdas <td> o <th>
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    const cells: string[] = []
    let cellMatch
    
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Limpiar HTML y obtener solo el texto
      const cellText = cellMatch[1]
        .replace(/<[^>]+>/g, '') // Remover tags HTML
        .replace(/&nbsp;/g, ' ') // Reemplazar &nbsp;
        .replace(/&amp;/g, '&') // Reemplazar &amp;
        .replace(/&aacute;/g, 'á')
        .replace(/&eacute;/g, 'é')
        .replace(/&iacute;/g, 'í')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uacute;/g, 'ú')
        .replace(/&Aacute;/g, 'Á')
        .replace(/&Eacute;/g, 'É')
        .replace(/&Iacute;/g, 'Í')
        .replace(/&Oacute;/g, 'Ó')
        .replace(/&Uacute;/g, 'Ú')
        .trim()
      cells.push(cellText)
    }
    
    if (cells.length < 5) continue
    
    // Verificar si esta fila marca el inicio de un nuevo período
    const firstCell = cells[0].toUpperCase()
    if (firstCell === periodType || firstCell.includes(periodType)) {
      inPeriodSection = true
      currentPeriod = periodType
      // Esta es la fila del header del período, continuar a la siguiente
      continue
    }
    
    // Si estamos en la sección del período correcto, procesar la fila
    if (inPeriodSection && currentPeriod === periodType) {
      // Verificar si esta fila marca el inicio de otro período (fin de este)
      const periodTypes = ['MENSUAL', 'QUINCENAL', 'SEMANAL', 'DIARIO']
      const isAnotherPeriod = periodTypes.some(p => 
        p !== periodType && (firstCell === p || firstCell.includes(p))
      )
      
      if (isAnotherPeriod) {
        // Hemos llegado al siguiente período, terminar
        break
      }
      
      // Estructura de la tabla real del SII:
      // Columna 0: Período (MENSUAL, QUINCENAL, etc.) o vacío para filas de datos
      // Columna 1: Desde (puede ser "-.-" para el primer tramo exento)
      // Columna 2: Hasta
      // Columna 3: Factor
      // Columna 4: Cantidad a rebajar
      // Columna 5: Tasa efectiva
      
      // Saltar filas de encabezado de la tabla
      if (cells[0].includes('Períodos') || cells[1]?.includes('Desde') || 
          cells[2]?.includes('Hasta') || cells[3]?.includes('Factor') || 
          cells[4]?.includes('Cantidad') || cells[0].includes('Monto de Cálculo')) {
        continue
      }
      
      // Los índices son fijos según la estructura HTML real
      const desde = cells[1] || ''
      const hasta = cells[2] || ''
      const factor = cells[3] || ''
      const cantidadRebajar = cells[4] || ''
      const tasaEfectiva = cells[5] || ''
      
      // Saltar si no hay datos válidos (todas las celdas vacías)
      if (!desde && !hasta && !factor && !cantidadRebajar) continue
      
      // Si es "Y MÁS" o contiene "MÁS", hasta es null
      const hastaValue = hasta === 'Y MÁS' || hasta.includes('MÁS') ? null : parseChileanNumber(hasta)
      const desdeValue = desde === '-.-' || desde === '' || desde === 'Exento' ? null : parseChileanNumber(desde)
      
      // Si factor es "Exento", es el primer tramo (exento hasta cierto monto)
      if (factor === 'Exento' || factor.includes('Exento')) {
        if (hastaValue !== null && hastaValue > 0) {
          brackets.push({
            desde: null,
            hasta: hastaValue,
            factor: 0,
            cantidad_rebajar: 0,
            tasa_efectiva: 'Exento'
          })
        }
        continue
      }
      
      // Si desde es null pero hay un valor numérico en hasta, es el primer tramo no exento
      // En este caso, desde debería ser 0 o el límite del tramo anterior
      const desdeFinal = desdeValue ?? (hastaValue !== null ? 0 : null)
      
      // Si no hay desde ni hasta válidos, saltar
      if (desdeFinal === null && hastaValue === null) continue
      
      // Parsear factor (puede venir como "0,04" o "0.04")
      const factorValue = parseFloat(factor.replace(',', '.').replace(/[^\d.]/g, '')) || 0
      
      brackets.push({
        desde: desdeFinal,
        hasta: hastaValue,
        factor: factorValue,
        cantidad_rebajar: parseChileanNumber(cantidadRebajar),
        tasa_efectiva: tasaEfectiva.trim()
      })
    }
  }
  
  return brackets
}

/**
 * Obtiene los tramos del impuesto único desde el SII para un mes/año específico
 */
export async function scrapeTaxBrackets(
  year: number,
  month: number
): Promise<ScrapedTaxBrackets[]> {
  try {
    // Construir URL del SII
    const url = `https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto${year}.htm`
    
    // Obtener HTML de la página
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Error al obtener página del SII: ${response.status}`)
    }
    
    const html = await response.text()
    
    // Buscar la sección del mes específico
    // La estructura real es: <div class='meses' id='mes_diciembre'>
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    const monthNameLower = monthNames[month - 1]
    const monthNameUpper = monthNameLower.charAt(0).toUpperCase() + monthNameLower.slice(1)
    
    // Buscar el div con id='mes_{nombre_mes}'
    let monthRegex = new RegExp(`<div[^>]*class=['"]meses['"][^>]*id=['"]mes_${monthNameLower}['"][^>]*>([\\s\\S]*?)<\\/div>`, 'i')
    let monthMatch = html.match(monthRegex)
    
    // Si no encuentra, buscar por el h3 con el nombre del mes
    if (!monthMatch) {
      monthRegex = new RegExp(`<h3[^>]*>${monthNameUpper}\\s+${year}<\\/h3>([\\s\\S]*?)(?=<div[^>]*class=['"]meses['"]|<h3|$)`, 'i')
      monthMatch = html.match(monthRegex)
    }
    
    // Si aún no encuentra, buscar cualquier referencia al mes y año
    if (!monthMatch) {
      monthRegex = new RegExp(`${monthNameUpper}[\\s\\S]{0,50}${year}[\\s\\S]*?(?=<div[^>]*class=['"]meses['"]|<h3|$)`, 'i')
      monthMatch = html.match(monthRegex)
    }
    
    if (!monthMatch) {
      throw new Error(`No se encontró la sección para ${monthNameUpper} ${year}. La página puede haber cambiado de estructura.`)
    }
    
    const monthSection = monthMatch[1] || monthMatch[0]
    
    // Extraer tramos para cada tipo de período
    const results: ScrapedTaxBrackets[] = []
    const periodTypes: Array<'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'DIARIO'> = 
      ['MENSUAL', 'QUINCENAL', 'SEMANAL', 'DIARIO']
    
    for (const periodType of periodTypes) {
      const brackets = extractBracketsFromTable(monthSection, periodType)
      console.log(`Tramos extraídos para ${periodType}:`, brackets.length)
      if (brackets.length > 0) {
        results.push({
          year,
          month,
          period_type: periodType,
          brackets
        })
        console.log(`Primer tramo ${periodType}:`, brackets[0])
      } else {
        console.warn(`No se encontraron tramos para ${periodType}`)
      }
    }
    
    console.log(`Total de períodos scrapeados: ${results.length}`)
    return results
  } catch (error) {
    console.error('Error al scrapear tramos del SII:', error)
    throw error
  }
}

/**
 * Guarda los tramos en la base de datos (historial completo)
 * Solo inserta si los datos son diferentes al último registro
 * NOTA: Esta función debe llamarse desde una API route, no desde un Client Component
 */
export async function saveTaxBrackets(
  year: number,
  month: number,
  brackets: ScrapedTaxBrackets[],
  supabaseClient?: any // Opcional: si se proporciona, se usa ese cliente
): Promise<void> {
  // Si no se proporciona cliente, intentar obtenerlo (solo funciona en Server Components o API Routes)
  if (!supabaseClient) {
    // Dynamic import para evitar problemas en build
    const serverModule = await import('@/lib/supabase/server-component')
    supabaseClient = await serverModule.createServerClient()
  }
  
  console.log(`Guardando ${brackets.length} tipos de períodos para ${month}/${year}`)
  
  for (const bracketData of brackets) {
    console.log(`Procesando ${bracketData.period_type}:`, {
      year: bracketData.year,
      month: bracketData.month,
      bracketsCount: bracketData.brackets.length
    })
    
    // Verificar si ya existe un registro reciente con los mismos datos
    const { data: existingData } = await supabaseClient
      .from('tax_brackets')
      .select('brackets, created_at')
      .eq('year', bracketData.year)
      .eq('month', bracketData.month)
      .eq('period_type', bracketData.period_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Comparar si los datos son diferentes
    let shouldInsert = true
    if (existingData) {
      const existingBrackets = existingData.brackets as TaxBracket[]
      const newBrackets = bracketData.brackets
      
      // Comparar si son iguales (comparación simple por longitud y primeros valores)
      if (existingBrackets.length === newBrackets.length) {
        const areEqual = existingBrackets.every((existing, index) => {
          const newBracket = newBrackets[index]
          return existing.desde === newBracket.desde &&
                 existing.hasta === newBracket.hasta &&
                 existing.factor === newBracket.factor &&
                 existing.cantidad_rebajar === newBracket.cantidad_rebajar
        })
        
        if (areEqual) {
          console.log(`Tramos ${bracketData.period_type} no han cambiado, no se inserta duplicado`)
          shouldInsert = false
        }
      }
    }
    
    if (shouldInsert) {
      const { error } = await supabaseClient
        .from('tax_brackets')
        .insert({
          year: bracketData.year,
          month: bracketData.month,
          period_type: bracketData.period_type,
          brackets: bracketData.brackets,
          source: 'sii_scraper',
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error(`Error al guardar tramos ${bracketData.period_type}:`, error)
        throw error
      }
      
      console.log(`Tramos ${bracketData.period_type} guardados correctamente (nueva versión)`)
    }
  }
  
  console.log('Todos los tramos procesados exitosamente')
}

/**
 * Obtiene los tramos desde la base de datos (versión más reciente)
 * NOTA: Esta función debe llamarse desde una API route, no desde un Client Component
 */
export async function getTaxBrackets(
  year: number,
  month: number,
  periodType: 'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'DIARIO' = 'MENSUAL',
  supabaseClient?: any // Opcional: si se proporciona, se usa ese cliente
): Promise<TaxBracket[] | null> {
  // Si no se proporciona cliente, intentar obtenerlo (solo funciona en Server Components o API Routes)
  if (!supabaseClient) {
    // Dynamic import para evitar problemas en build
    const serverModule = await import('@/lib/supabase/server-component')
    supabaseClient = await serverModule.createServerClient()
  }
  
  const { data, error } = await supabaseClient
    .from('tax_brackets')
    .select('brackets')
    .eq('year', year)
    .eq('month', month)
    .eq('period_type', periodType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data.brackets as TaxBracket[]
}

