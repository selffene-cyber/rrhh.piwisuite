/**
 * Sistema de conceptos modificables para anexos de contrato
 * Cada concepto mapea a uno o más campos del contrato
 */

export interface AnnexConcept {
  id: string
  label: string
  description: string
  fields: string[] // Campos del contrato que modifica
  category: 'remuneration' | 'position' | 'schedule' | 'payment' | 'contract' | 'location'
}

/**
 * Lista de conceptos modificables en anexos
 * Basado en campos editables del contrato
 */
export const ANNEX_CONCEPTS: AnnexConcept[] = [
  {
    id: 'contract_type',
    label: 'Tipo de Contrato',
    description: 'Modificar el tipo de contrato (indefinido, plazo fijo, obra/faena, part-time)',
    fields: ['contract_type', 'end_date'],
    category: 'contract',
  },
  {
    id: 'position',
    label: 'Cargo y Descripción de Funciones',
    description: 'Modificar el cargo y/o la descripción de las funciones del trabajador',
    fields: ['position', 'position_description'],
    category: 'position',
  },
  {
    id: 'work_schedule',
    label: 'Jornada / Horario de Trabajo',
    description: 'Modificar la jornada laboral, horarios, días de trabajo y duración de colación',
    fields: [
      'work_schedule_type',
      'work_schedule',
      'work_schedule_monday_thursday',
      'work_schedule_friday',
      'lunch_break_duration',
    ],
    category: 'schedule',
  },
  {
    id: 'remuneration',
    label: 'Remuneraciones',
    description: 'Modificar sueldo base, gratificación legal, montos de gratificación y bonos',
    fields: ['base_salary', 'gratuity', 'gratuity_amount', 'bonuses'],
    category: 'remuneration',
  },
  {
    id: 'work_location',
    label: 'Lugar de Trabajo',
    description: 'Modificar el lugar físico donde se prestan los servicios',
    fields: ['work_location'],
    category: 'location',
  },
  {
    id: 'payment',
    label: 'Método y Periodicidad de Pago',
    description: 'Modificar método de pago, periodicidad y datos bancarios',
    fields: [
      'payment_method',
      'payment_periodicity',
      'bank_name',
      'account_type',
      'account_number',
    ],
    category: 'payment',
  },
]

/**
 * Obtiene un concepto por su ID
 */
export function getConceptById(conceptId: string): AnnexConcept | undefined {
  return ANNEX_CONCEPTS.find((c) => c.id === conceptId)
}

/**
 * Obtiene conceptos por categoría
 */
export function getConceptsByCategory(category: AnnexConcept['category']): AnnexConcept[] {
  return ANNEX_CONCEPTS.filter((c) => c.category === category)
}

/**
 * Mapea un campo del contrato a conceptos que lo modifican
 */
export function getConceptsByField(fieldName: string): AnnexConcept[] {
  return ANNEX_CONCEPTS.filter((c) => c.fields.includes(fieldName))
}





