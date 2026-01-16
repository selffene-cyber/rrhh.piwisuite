/**
 * Utilidades para generar cláusulas de anexo basadas en conceptos seleccionados
 */

import { AnnexConcept } from '@/lib/services/annexConcepts'
import { formatDateLegal } from './annexText'
import { formatNumberForInput, parseFormattedNumber } from './formatNumber'

/**
 * Genera el texto de la cláusula CUARTO basado en los conceptos seleccionados
 * y los valores modificados
 */
export function generateConceptClauseText(
  selectedConcepts: string[],
  conceptValues: Record<string, any>,
  currentContract: any,
  conceptDefs: AnnexConcept[],
  deletedBonuses?: Record<string, boolean>
): string {
  if (selectedConcepts.length === 0) {
    return 'Las modificaciones se detallan en el presente documento.'
  }

  let clauseText = ''
  const conceptLabels: Record<string, string> = {
    contract_type: 'Tipo de Contrato',
    position: 'Cargo y Descripción de Funciones',
    work_schedule: 'Jornada / Horario de Trabajo',
    remuneration: 'Remuneraciones',
    work_location: 'Lugar de Trabajo',
    payment: 'Método y Periodicidad de Pago',
  }

  const conceptTexts: string[] = []

  // Tipo de Contrato
  if (selectedConcepts.includes('contract_type')) {
    const newType = conceptValues.contract_type
    const oldType = currentContract.contract_type
    const typeLabels: Record<string, string> = {
      indefinido: 'Indefinido',
      plazo_fijo: 'Plazo Fijo',
      obra_faena: 'Obra o Faena',
      part_time: 'Part Time',
    }
    if (newType && newType !== oldType) {
      conceptTexts.push(
        `El tipo de contrato se modifica de "${typeLabels[oldType] || oldType}" a "${typeLabels[newType] || newType}".`
      )
    }
  }

  // Cargo y Descripción de Funciones
  if (selectedConcepts.includes('position')) {
    const newPosition = conceptValues.position
    const oldPosition = currentContract.position
    const newDescription = conceptValues.position_description
    const oldDescription = currentContract.position_description

    if (newPosition && newPosition !== oldPosition) {
      conceptTexts.push(
        `El cargo se modifica de "${oldPosition || 'no especificado'}" a "${newPosition}".`
      )
    }

    if (newDescription && newDescription !== oldDescription) {
      conceptTexts.push(
        `La descripción de funciones se actualiza según lo establecido en este anexo.`
      )
    }
  }

  // Jornada / Horario de Trabajo
  if (selectedConcepts.includes('work_schedule')) {
    const oldSchedule = currentContract.work_schedule_type === 'unified'
      ? currentContract.work_schedule
      : `${currentContract.work_schedule_monday_thursday}; ${currentContract.work_schedule_friday}`

    let newSchedule = ''
    if (conceptValues.work_schedule_type === 'unified') {
      newSchedule = conceptValues.work_schedule || ''
    } else {
      newSchedule = `${conceptValues.work_schedule_monday_thursday || ''}; ${conceptValues.work_schedule_friday || ''}`
    }

    if (newSchedule && newSchedule !== oldSchedule) {
      conceptTexts.push(
        `La jornada de trabajo se modifica de "${oldSchedule || 'no especificada'}" a "${newSchedule}".`
      )
      if (conceptValues.lunch_break_duration && conceptValues.lunch_break_duration !== currentContract.lunch_break_duration) {
        conceptTexts.push(
          `La duración de la colación se establece en ${conceptValues.lunch_break_duration} minutos.`
        )
      }
    }
  }

  // Remuneraciones
  if (selectedConcepts.includes('remuneration')) {
    const modifications: string[] = []

    if (conceptValues.base_salary) {
      const newSalary = parseFormattedNumber(conceptValues.base_salary) || 0
      const oldSalary = currentContract.base_salary || 0
      if (newSalary !== oldSalary) {
        modifications.push(
          `El sueldo base se modifica de $${oldSalary.toLocaleString('es-CL')} a $${newSalary.toLocaleString('es-CL')}.`
        )
      }
    }

    if (conceptValues.gratuity !== undefined && conceptValues.gratuity !== currentContract.gratuity) {
      modifications.push(
        `La gratificación legal se ${conceptValues.gratuity ? 'establece' : 'elimina'}.`
      )
    }

    if (conceptValues.gratuity_amount) {
      const newGratuity = parseFormattedNumber(conceptValues.gratuity_amount) || 0
      const oldGratuity = currentContract.gratuity_amount || 0
      if (newGratuity !== oldGratuity) {
        modifications.push(
          `El monto de gratificación se establece en $${newGratuity.toLocaleString('es-CL')}.`
        )
      }
    }

    // Bonos eliminados
    if (conceptValues.bonuses && Array.isArray(conceptValues.bonuses) && deletedBonuses) {
      const deleted = conceptValues.bonuses.filter((b: any) => deletedBonuses[b.id])
      if (deleted.length > 0) {
        const deletedList = deleted.map((b: any) => b.name).join(', ')
        modifications.push(`Se eliminan los siguientes bonos: ${deletedList}.`)
      }
    }

    // Bonos nuevos
    if (conceptValues.newBonuses && Array.isArray(conceptValues.newBonuses) && conceptValues.newBonuses.length > 0) {
      const newBonusesList = conceptValues.newBonuses
        .filter((b: any) => b.name && b.amount)
        .map((b: any) => `${b.name}: $${parseFormattedNumber(b.amount || '0').toLocaleString('es-CL')}`)
        .join(', ')
      if (newBonusesList) {
        modifications.push(`Se establecen los siguientes bonos nuevos: ${newBonusesList}.`)
      }
    }

    if (modifications.length > 0) {
      conceptTexts.push(...modifications)
    }
  }

  // Lugar de Trabajo
  if (selectedConcepts.includes('work_location')) {
    const newLocation = conceptValues.work_location
    const oldLocation = currentContract.work_location
    if (newLocation && newLocation !== oldLocation) {
      conceptTexts.push(
        `El lugar de trabajo se modifica de "${oldLocation || 'no especificado'}" a "${newLocation}".`
      )
    }
  }

  // Método y Periodicidad de Pago
  if (selectedConcepts.includes('payment')) {
    const modifications: string[] = []

    if (conceptValues.payment_method && conceptValues.payment_method !== currentContract.payment_method) {
      const methodLabels: Record<string, string> = {
        transferencia: 'Transferencia Bancaria',
        efectivo: 'Efectivo',
        cheque: 'Cheque',
      }
      modifications.push(
        `El método de pago se modifica a "${methodLabels[conceptValues.payment_method] || conceptValues.payment_method}".`
      )
    }

    if (conceptValues.payment_periodicity && conceptValues.payment_periodicity !== currentContract.payment_periodicity) {
      const periodLabels: Record<string, string> = {
        mensual: 'Mensual',
        quincenal: 'Quincenal',
        semanal: 'Semanal',
      }
      modifications.push(
        `La periodicidad de pago se modifica a "${periodLabels[conceptValues.payment_periodicity] || conceptValues.payment_periodicity}".`
      )
    }

    if (conceptValues.bank_name || conceptValues.account_type || conceptValues.account_number) {
      const bankInfo = []
      if (conceptValues.bank_name) bankInfo.push(`Banco: ${conceptValues.bank_name}`)
      if (conceptValues.account_type) bankInfo.push(`Tipo de cuenta: ${conceptValues.account_type}`)
      if (conceptValues.account_number) bankInfo.push(`Número de cuenta: ${conceptValues.account_number}`)
      if (bankInfo.length > 0) {
        modifications.push(`Los datos bancarios se actualizan: ${bankInfo.join(', ')}.`)
      }
    }

    if (modifications.length > 0) {
      conceptTexts.push(...modifications)
    }
  }

  // Si hay modificaciones, generar el texto
  if (conceptTexts.length > 0) {
    clauseText = conceptTexts.join('\n\n')
  } else {
    clauseText = 'Las modificaciones se detallan en el presente documento.'
  }

  return clauseText
}

/**
 * Obtiene los campos que deben mostrarse para editar según los conceptos seleccionados
 */
export function getFieldsForConcepts(selectedConcepts: string[], conceptDefs: AnnexConcept[]): string[] {
  const fields = new Set<string>()
  
  selectedConcepts.forEach((conceptId) => {
    const concept = conceptDefs.find((c) => c.id === conceptId)
    if (concept) {
      concept.fields.forEach((field) => fields.add(field))
    }
  })

  return Array.from(fields)
}

