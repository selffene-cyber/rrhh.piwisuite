/**
 * Servicio de Notificaciones de Contratos
 * Detecta contratos vencidos, por vencer y genera alertas
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type ContractExpirationStatus = 
  | 'active' 
  | 'expiring_soon'      // 16-30 días
  | 'expiring_urgent'    // 8-15 días
  | 'expiring_critical'  // 1-7 días
  | 'expires_today'      // Vence hoy
  | 'expired'            // Ya vencido

export interface ContractNotification {
  id: string
  contract_number: string
  contract_id: string
  employee_id: string
  employee_name: string
  employee_rut: string
  contract_type: string
  end_date: string
  status: ContractExpirationStatus
  daysUntilExpiration: number
  message: string
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  color: string
  icon: string
}

/**
 * Calcula el estado de vencimiento de un contrato
 */
export function calculateExpirationStatus(endDate: string | null, contractType: string): {
  status: ContractExpirationStatus
  daysUntilExpiration: number
  message: string
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  color: string
  icon: string
} {
  // Contratos indefinidos no vencen
  if (!endDate || contractType === 'indefinido') {
    return {
      status: 'active',
      daysUntilExpiration: Infinity,
      message: 'Contrato vigente',
      urgencyLevel: 'low',
      color: '#10b981',
      icon: '✅'
    }
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Resetear hora para comparación precisa
  
  const endDateObj = new Date(endDate)
  endDateObj.setHours(0, 0, 0, 0)
  
  const diffTime = endDateObj.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    // Vencido
    const daysExpired = Math.abs(diffDays)
    return {
      status: 'expired',
      daysUntilExpiration: diffDays,
      message: daysExpired === 1 
        ? 'Vencido hace 1 día' 
        : `Vencido hace ${daysExpired} días`,
      urgencyLevel: 'critical',
      color: '#ef4444',
      icon: '🔴'
    }
  } else if (diffDays === 0) {
    // Vence hoy
    return {
      status: 'expires_today',
      daysUntilExpiration: 0,
      message: 'Vence hoy',
      urgencyLevel: 'critical',
      color: '#ef4444',
      icon: '🔴'
    }
  } else if (diffDays <= 7) {
    // Crítico (1-7 días)
    return {
      status: 'expiring_critical',
      daysUntilExpiration: diffDays,
      message: diffDays === 1 
        ? 'Vence mañana' 
        : `Vence en ${diffDays} días`,
      urgencyLevel: 'critical',
      color: '#dc2626',
      icon: '🚨'
    }
  } else if (diffDays <= 15) {
    // Urgente (8-15 días)
    return {
      status: 'expiring_urgent',
      daysUntilExpiration: diffDays,
      message: `Vence en ${diffDays} días`,
      urgencyLevel: 'high',
      color: '#f59e0b',
      icon: '⚠️'
    }
  } else if (diffDays <= 30) {
    // Próximo (16-30 días)
    return {
      status: 'expiring_soon',
      daysUntilExpiration: diffDays,
      message: `Vence en ${diffDays} días`,
      urgencyLevel: 'medium',
      color: '#fbbf24',
      icon: '🟡'
    }
  } else {
    // Activo (más de 30 días)
    return {
      status: 'active',
      daysUntilExpiration: diffDays,
      message: 'Contrato vigente',
      urgencyLevel: 'low',
      color: '#10b981',
      icon: '✅'
    }
  }
}

/**
 * Obtiene todas las notificaciones de contratos para una empresa
 */
export async function getContractNotifications(
  companyId: string,
  supabase: SupabaseClient
): Promise<ContractNotification[]> {
  try {
    // Obtener contratos activos a plazo fijo de la empresa
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        contract_type,
        end_date,
        employee_id,
        employees (
          id,
          full_name,
          rut
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .in('contract_type', ['plazo_fijo', 'obra_faena'])
      .not('end_date', 'is', null)
      .order('end_date', { ascending: true })
    
    if (error) throw error
    
    if (!contracts || contracts.length === 0) {
      return []
    }
    
    // Procesar cada contrato y generar notificación
    const notifications: ContractNotification[] = contracts
      .map((contract: any) => {
        const expiration = calculateExpirationStatus(
          contract.end_date,
          contract.contract_type
        )
        
        const employee = contract.employees
        
        return {
          id: `contract-${contract.id}`,
          contract_number: contract.contract_number || 'N/A',
          contract_id: contract.id,
          employee_id: contract.employee_id,
          employee_name: employee?.full_name || 'Desconocido',
          employee_rut: employee?.rut || '',
          contract_type: contract.contract_type,
          end_date: contract.end_date,
          ...expiration
        }
      })
      // Filtrar solo contratos que requieren atención (no los "activos" con >30 días)
      .filter(notif => notif.status !== 'active')
    
    return notifications
  } catch (error) {
    console.error('Error obteniendo notificaciones de contratos:', error)
    return []
  }
}

/**
 * Cuenta las notificaciones por nivel de urgencia
 */
export function getNotificationCounts(notifications: ContractNotification[]): {
  total: number
  critical: number   // Vencidos + vence hoy + 1-7 días
  high: number       // 8-15 días
  medium: number     // 16-30 días
  low: number
} {
  return {
    total: notifications.length,
    critical: notifications.filter(n => 
      n.urgencyLevel === 'critical'
    ).length,
    high: notifications.filter(n => 
      n.urgencyLevel === 'high'
    ).length,
    medium: notifications.filter(n => 
      n.urgencyLevel === 'medium'
    ).length,
    low: notifications.filter(n => 
      n.urgencyLevel === 'low'
    ).length
  }
}

/**
 * Agrupa notificaciones por estado
 */
export function groupNotificationsByStatus(notifications: ContractNotification[]): {
  expired: ContractNotification[]
  expiringCritical: ContractNotification[]
  expiringUrgent: ContractNotification[]
  expiringSoon: ContractNotification[]
} {
  return {
    expired: notifications.filter(n => 
      n.status === 'expired' || n.status === 'expires_today'
    ),
    expiringCritical: notifications.filter(n => 
      n.status === 'expiring_critical'
    ),
    expiringUrgent: notifications.filter(n => 
      n.status === 'expiring_urgent'
    ),
    expiringSoon: notifications.filter(n => 
      n.status === 'expiring_soon'
    )
  }
}

/**
 * Verifica si un contrato específico está vencido o por vencer
 */
export function getContractExpirationInfo(
  endDate: string | null,
  contractType: string
): {
  isExpired: boolean
  isExpiring: boolean
  shouldBlock: boolean
  info: ReturnType<typeof calculateExpirationStatus>
} {
  const info = calculateExpirationStatus(endDate, contractType)
  
  return {
    isExpired: info.status === 'expired' || info.status === 'expires_today',
    isExpiring: info.status !== 'active',
    shouldBlock: info.status === 'expired' || info.status === 'expires_today',
    info
  }
}

