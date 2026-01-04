import { format } from 'date-fns'

export const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  if (!date) return '-'
  
  let dateObj: Date
  if (typeof date === 'string') {
    // Parsear fecha sin problemas de zona horaria
    // Si viene como "2024-12-01", crear Date directamente con año, mes, día
    const dateStr = date.split('T')[0] // Quitar hora si existe
    const [y, m, d] = dateStr.split('-').map(Number)
    dateObj = new Date(y, m - 1, d) // Mes es 0-indexed
  } else {
    dateObj = date
  }
  
  return format(dateObj, formatStr)
}

export function formatDateReadable(date: Date | string): string {
  if (!date) return '-'
  try {
    const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
    if (isNaN(dateObj.getTime())) return String(date)
    
    const day = dateObj.getDate().toString().padStart(2, '0')
    const month = dateObj.getMonth()
    const year = dateObj.getFullYear()
    
    return `${day} de ${MONTH_NAMES[month]} de ${year}`
  } catch {
    return String(date)
  }
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`
}

export function getCurrentMonthYear(): { year: number; month: number } {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

