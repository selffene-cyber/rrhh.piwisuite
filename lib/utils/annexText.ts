// Meses en español
const MONTHS_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Formatear fecha en formato legal chileno: "17 de Marzo del 2020"
export function formatDateLegal(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDate()
  const month = MONTHS_SPANISH[date.getMonth()]
  const year = date.getFullYear()
  return `${day} de ${month} del ${year}`
}

import { parseAnnexContent, generateAnnexTextFromClauses } from './annexClauses'

// Generar texto completo del anexo en formato legal chileno
export function generateAnnexText(annex: any, contract: any, employee: any, company: any): string {
  // Intentar parsear el contenido como JSON con cláusulas
  const parsed = parseAnnexContent(annex.content || '')
  
  if (parsed.isJson && parsed.clauses) {
    // Usar las cláusulas individuales
    return generateAnnexTextFromClauses(parsed.clauses as any, annex, contract, employee, company)
  }

  // Formato legacy: texto plano
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

  // PRIMERO: Identificación y contrato base
  text += `PRIMERO: Las partes declaran que se encuentran vinculadas por un contrato de trabajo celebrado con fecha ${contract?.start_date ? formatDateLegal(contract.start_date) : 'N/A'}, identificado con el número ${contract?.contract_number || 'N/A'}, y que mediante el presente anexo se modifican las siguientes estipulaciones del contrato original.\n\n`

  // SEGUNDO: Vigencia
  text += `SEGUNDO: El presente anexo entrará en vigencia a partir del ${formatDateLegal(annex.start_date)}`
  if (annex.end_date) {
    text += ` y tendrá vigencia hasta el ${formatDateLegal(annex.end_date)}`
  } else {
    text += ` y mantendrá su vigencia mientras subsista el contrato de trabajo que lo origina`
  }
  text += `.\n\n`

  // TERCERO: Modificaciones
  if (annex.modifications_summary) {
    text += `TERCERO: Resumen de modificaciones.\n\n`
    text += `${annex.modifications_summary}\n\n`
  }

  // CUARTO: Contenido del anexo
  text += `CUARTO: Contenido del anexo.\n\n`
  text += `${annex.content || 'Las modificaciones se detallan en el presente documento.'}\n\n`

  // QUINTO: Continuidad del contrato
  text += `QUINTO: Se deja expresa constancia que todas las demás cláusulas del contrato de trabajo original que no han sido modificadas mediante el presente anexo, mantendrán plena vigencia y continuarán rigiendo la relación laboral entre las partes.\n\n`

  // SEXTO: Ejemplares
  text += `SEXTO: El presente anexo se firma en dos ejemplares y se deja expresa constancia que el trabajador recibe una de ellas.\n\n`

  // Cierre
  text += `Para constancia, se firma el presente anexo en dos ejemplares del mismo tenor y fecha, quedando uno en poder de cada parte.`

  return text
}

