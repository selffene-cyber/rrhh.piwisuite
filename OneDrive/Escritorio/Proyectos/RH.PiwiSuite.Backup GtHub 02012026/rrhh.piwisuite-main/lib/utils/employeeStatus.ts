/**
 * Obtiene la etiqueta en español para el estado de un empleado
 */
export function getEmployeeStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    terminated: 'Terminado',
    on_leave: 'En Licencia',
    suspended: 'Suspendido',
  }

  return statusLabels[status] || status
}

