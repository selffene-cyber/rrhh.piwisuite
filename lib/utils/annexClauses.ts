/**
 * Utilidades para generar cláusulas de anexos
 */

import { formatDateLegal } from './annexText'

export interface AnnexClauses {
  clause_1: string
  clause_2: string
  clause_3?: string // Opcional, ya no se usa pero se mantiene para compatibilidad
  clause_4: string
  clause_5: string
  clause_6: string
  clause_1_enabled: boolean
  clause_2_enabled: boolean
  clause_3_enabled?: boolean // Opcional, ya no se usa pero se mantiene para compatibilidad
  clause_4_enabled: boolean
  clause_5_enabled: boolean
  clause_6_enabled: boolean
}

/**
 * Genera el texto de una cláusula específica del anexo
 */
export function generateAnnexClauseText(
  clauseNumber: number,
  annex: any,
  contract: any,
  employee: any,
  company: any
): string {
  const annexDate = formatDateLegal(annex.start_date)
  const contractDate = contract?.start_date ? formatDateLegal(contract.start_date) : 'N/A'
  const contractNumber = contract?.contract_number || 'N/A'

  switch (clauseNumber) {
    case 1:
      return `Las partes declaran que se encuentran vinculadas por un contrato de trabajo celebrado con fecha ${contractDate}, identificado con el número ${contractNumber}, y que mediante el presente anexo se modifican las siguientes estipulaciones del contrato original.`

    case 2:
      let vigenciaText = `El presente anexo entrará en vigencia a partir del ${formatDateLegal(annex.start_date)}`
      if (annex.end_date) {
        vigenciaText += ` y tendrá vigencia hasta el ${formatDateLegal(annex.end_date)}`
      } else {
        vigenciaText += ` y mantendrá su vigencia mientras subsista el contrato de trabajo que lo origina`
      }
      return vigenciaText + '.'

    case 4:
      // Para la cláusula CUARTO, usar el contenido específico del anexo si está disponible
      // Si el anexo tiene clause_4 en el formData, usarlo; si no, usar un texto genérico
      if (annex.clause_4) {
        return annex.clause_4
      }
      // Si no hay clause_4 pero hay content (formato legacy), usarlo
      if (annex.content && typeof annex.content === 'string' && !annex.content.startsWith('{')) {
        return annex.content
      }
      return 'Las modificaciones se detallan en el presente documento.'

    case 5:
      return `Se deja expresa constancia que todas las demás cláusulas del contrato de trabajo original que no han sido modificadas mediante el presente anexo, mantendrán plena vigencia y continuarán rigiendo la relación laboral entre las partes.`

    case 6:
      return `El presente anexo se firma en dos ejemplares y se deja expresa constancia que el trabajador recibe una de ellas.`

    default:
      return ''
  }
}

/**
 * Genera el texto completo del anexo usando las cláusulas individuales
 */
export function generateAnnexTextFromClauses(
  clauses: AnnexClauses,
  annex: any,
  contract: any,
  employee: any,
  company: any
): string {
  const annexDate = formatDateLegal(annex.start_date)
  
  const getAnnexTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      modificacion_sueldo: 'MODIFICACIÓN DE SUELDO',
      cambio_cargo: 'CAMBIO DE CARGO',
      cambio_jornada: 'CAMBIO DE JORNADA',
      cambio_tipo_contrato: 'CAMBIO DE TIPO DE CONTRATO',
      cambio_lugar_trabajo: 'CAMBIO DE LUGAR DE TRABAJO',
      cambio_metodo_pago: 'CAMBIO DE MÉTODO DE PAGO',
      prorroga: 'PRÓRROGA',
      otro: 'OTRO',
    }
    return types[type] || 'MODIFICACIÓN DE CONTRATO'
  }

  // Párrafo inicial
  let text = `En ${company?.city || 'Santiago'}, a ${annexDate}, entre ${company?.name || 'EMPRESA'}, R.U.T ${company?.rut || 'N/A'}, representado legalmente por ${company?.employer_name || 'REPRESENTANTE LEGAL'}, cédula de identidad ${company?.rut || 'N/A'}, ambos con domicilio en ${company?.address || 'N/A'}${company?.city ? `, comuna de ${company.city}` : ''}, en adelante el "Empleador" y don/doña: *${employee?.full_name || 'N/A'}*, con Rut: ${employee?.rut || 'N/A'}, domiciliado(a) en ${employee?.address || 'N/A'}, en adelante "Trabajador". Las partes convienen en modificar el contrato de trabajo que las vincula mediante el siguiente ANEXO DE CONTRATO DE TRABAJO, de tipo ${getAnnexTypeText(annex.annex_type)}, para cuyo efecto, las partes convienen denominarse respectivamente *EMPLEADOR* Y *TRABAJADOR*.\n\n`

  // Agregar cláusulas habilitadas (excluyendo TERCERO que ya no se usa)
  const clauseTitles = ['PRIMERO', 'SEGUNDO', 'CUARTO', 'QUINTO', 'SEXTO']
  const clauseKeys = ['clause_1', 'clause_2', 'clause_4', 'clause_5', 'clause_6'] as const
  const enabledKeys = ['clause_1_enabled', 'clause_2_enabled', 'clause_4_enabled', 'clause_5_enabled', 'clause_6_enabled'] as const

  let clauseCounter = 0
  for (let i = 0; i < clauseKeys.length; i++) {
    if (clauses[enabledKeys[i]]) {
      clauseCounter++
      const clauseTitle = clauseTitles[i]
      const clauseText = clauses[clauseKeys[i]] || ''
      if (clauseText.trim()) {
        text += `${clauseTitle}: ${clauseText}\n\n`
      }
    }
  }

  // Cierre
  text += `Para constancia, se firma el presente anexo en dos ejemplares del mismo tenor y fecha, quedando uno en poder de cada parte.`

  return text
}

/**
 * Parsea el contenido del anexo para extraer las cláusulas si están en formato JSON
 */
export function parseAnnexContent(content: string): { clauses: Partial<AnnexClauses> | null; isJson: boolean } {
  try {
    const parsed = JSON.parse(content)
    if (parsed.clauses) {
      return { clauses: parsed.clauses, isJson: true }
    }
  } catch {
    // No es JSON, es texto plano
  }
  return { clauses: null, isJson: false }
}

/**
 * Serializa las cláusulas a JSON para almacenar en content
 */
export function serializeAnnexClauses(clauses: AnnexClauses): string {
  return JSON.stringify({ clauses, version: 1 })
}





