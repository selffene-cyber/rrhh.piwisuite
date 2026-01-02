/**
 * Utilidades para formatear y mostrar estados de empleados
 */

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  licencia_medica: 'Licencia Médica',
  renuncia: 'Renuncia',
  despido: 'Despido',
}

export const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  active: '#10b981', // Verde
  inactive: '#6b7280', // Gris
  licencia_medica: '#f59e0b', // Amarillo/Naranja
  renuncia: '#3b82f6', // Azul
  despido: '#ef4444', // Rojo
}

/**
 * Obtiene la etiqueta formateada para un estado de empleado
 */
export function getEmployeeStatusLabel(status: string): string {
  return EMPLOYEE_STATUS_LABELS[status] || status
}

/**
 * Obtiene el color para un estado de empleado
 */
export function getEmployeeStatusColor(status: string): string {
  return EMPLOYEE_STATUS_COLORS[status] || '#6b7280'
}

/**
 * Obtiene el estilo completo para un badge de estado de empleado
 */
export function getEmployeeStatusBadgeStyle(status: string) {
  const color = getEmployeeStatusColor(status)
  return {
    backgroundColor: `${color}20`,
    color: color,
    border: `1px solid ${color}`,
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500' as const,
    display: 'inline-block',
  }
}

