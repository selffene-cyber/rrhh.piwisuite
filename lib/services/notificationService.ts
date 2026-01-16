/**
 * Servicio para obtener notificaciones del sistema
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export interface Notification {
  id: string
  type: 'contract_draft' | 'settlement_pending' | 'contract_expiring' | 'medical_leave_expiring' | 'vacation_pending'
  title: string
  message: string
  link: string
  createdAt: string
  priority: 'low' | 'medium' | 'high'
  employeeId?: string
  employeeName?: string
}

/**
 * Obtiene todas las notificaciones para la empresa actual
 */
export async function getNotifications(
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<Notification[]> {
  const notifications: Notification[] = []

  if (!companyId) return notifications

  try {
    // Obtener IDs de empleados de la empresa (se usa en varias consultas)
    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)

    const employeeIds = companyEmployees?.map((e: any) => e.id) || []

    // 1. Contratos en borrador
    const { data: draftContracts } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        status,
        created_at,
        employees (id, full_name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(10)

    if (draftContracts) {
      draftContracts.forEach((contract: any) => {
        notifications.push({
          id: `contract-draft-${contract.id}`,
          type: 'contract_draft',
          title: 'Contrato en Borrador',
          message: `El contrato ${contract.contract_number || 'sin número'} de ${contract.employees?.full_name || 'trabajador'} está pendiente de revisión`,
          link: `/contracts/${contract.id}`,
          createdAt: contract.created_at,
          priority: 'medium',
          employeeId: contract.employees?.id,
          employeeName: contract.employees?.full_name
        })
      })
    }

    // 2. Finiquitos pendientes de aprobación
    const { data: pendingSettlements } = await supabase
      .from('settlements')
      .select(`
        id,
        settlement_number,
        status,
        created_at,
        employees (id, full_name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(10)

    if (pendingSettlements) {
      pendingSettlements.forEach((settlement: any) => {
        notifications.push({
          id: `settlement-pending-${settlement.id}`,
          type: 'settlement_pending',
          title: 'Finiquito Pendiente',
          message: `El finiquito ${settlement.settlement_number || 'sin número'} de ${settlement.employees?.full_name || 'trabajador'} está pendiente de aprobación`,
          link: `/settlements/${settlement.id}`,
          createdAt: settlement.created_at,
          priority: 'high',
          employeeId: settlement.employees?.id,
          employeeName: settlement.employees?.full_name
        })
      })
    }

    // 3. Contratos próximos a vencer (en los próximos 30 días)
    const today = new Date()
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(today.getDate() + 30)

    const { data: expiringContracts } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        end_date,
        employees (id, full_name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', thirtyDaysLater.toISOString().split('T')[0])
      .order('end_date', { ascending: true })
      .limit(10)

    if (expiringContracts) {
      expiringContracts.forEach((contract: any) => {
        const endDate = new Date(contract.end_date)
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        notifications.push({
          id: `contract-expiring-${contract.id}`,
          type: 'contract_expiring',
          title: 'Contrato Próximo a Vencer',
          message: `El contrato ${contract.contract_number || 'sin número'} de ${contract.employees?.full_name || 'trabajador'} vence en ${daysUntilExpiry} día${daysUntilExpiry !== 1 ? 's' : ''}`,
          link: `/contracts/${contract.id}`,
          createdAt: contract.end_date,
          priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
          employeeId: contract.employees?.id,
          employeeName: contract.employees?.full_name
        })
      })
    }

    // 4. Licencias médicas próximas a vencer (en los próximos 7 días)
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(today.getDate() + 7)

    // Obtener licencias médicas de empleados de la empresa
    const { data: expiringMedicalLeaves } = await supabase
      .from('medical_leaves')
      .select(`
        id,
        folio_number,
        end_date,
        employees!inner (id, full_name, company_id)
      `)
      .in('employee_id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('is_active', true)
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', sevenDaysLater.toISOString().split('T')[0])
      .order('end_date', { ascending: true })
      .limit(10)

    if (expiringMedicalLeaves) {
      expiringMedicalLeaves.forEach((leave: any) => {
        const endDate = new Date(leave.end_date)
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        notifications.push({
          id: `medical-leave-expiring-${leave.id}`,
          type: 'medical_leave_expiring',
          title: 'Licencia Médica Próxima a Vencer',
          message: `La licencia médica ${leave.folio_number || 'sin folio'} de ${leave.employees?.full_name || 'trabajador'} vence en ${daysUntilExpiry} día${daysUntilExpiry !== 1 ? 's' : ''}`,
          link: `/employees/${leave.employees?.id}/medical-leaves`,
          createdAt: leave.end_date,
          priority: daysUntilExpiry <= 3 ? 'high' : 'medium',
          employeeId: leave.employees?.id,
          employeeName: leave.employees?.full_name
        })
      })
    }

    // 5. Solicitudes de vacaciones pendientes
    if (employeeIds.length > 0) {
      const { data: pendingVacations } = await supabase
        .from('vacations')
        .select(`
          id,
          start_date,
          status,
          created_at,
          employees!inner (id, full_name, company_id)
        `)
        .in('employee_id', employeeIds)
        .eq('status', 'solicitada')
        .order('created_at', { ascending: false })
        .limit(10)

      if (pendingVacations) {
        pendingVacations.forEach((vacation: any) => {
          notifications.push({
            id: `vacation-pending-${vacation.id}`,
            type: 'vacation_pending',
            title: 'Solicitud de Vacaciones Pendiente',
            message: `${vacation.employees?.full_name || 'Trabajador'} tiene una solicitud de vacaciones pendiente de aprobación`,
            link: `/vacations`,
            createdAt: vacation.created_at,
            priority: 'low',
            employeeId: vacation.employees?.id,
            employeeName: vacation.employees?.full_name
          })
        })
      }
    }

    // Ordenar por prioridad y fecha (más recientes primero)
    notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return notifications
  } catch (error) {
    console.error('Error al obtener notificaciones:', error)
    return []
  }
}





