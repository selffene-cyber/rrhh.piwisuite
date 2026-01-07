import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { createAuditService } from '@/lib/services/auditService'
import { NextRequest, NextResponse } from 'next/server'
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'

/**
 * API para que un trabajador solicite un permiso
 * Solo puede solicitar permisos para sí mismo
 * Valida que tenga contrato activo antes de crear la solicitud
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que es trabajador
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, company_id, full_name, rut')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ 
        error: 'No se encontró información del trabajador' 
      }, { status: 403 })
    }

    // Validar que el trabajador pueda crear un permiso (tiene contrato activo)
    const { employee: employeeEligibility } = createValidationServices(supabase)
    const validation = await employeeEligibility.canCreatePermission(employee.id)
    
    const errorResponse = handleValidationError(validation)
    if (errorResponse) {
      return errorResponse
    }

    const body = await request.json()
    const { permission_type_code, reason, start_date, end_date, days, hours, notes } = body

    // Validaciones
    if (!permission_type_code) {
      return NextResponse.json({ 
        error: 'El tipo de permiso es requerido' 
      }, { status: 400 })
    }

    if (!reason?.trim()) {
      return NextResponse.json({ 
        error: 'El motivo del permiso es requerido' 
      }, { status: 400 })
    }

    if (!start_date || !end_date) {
      return NextResponse.json({ 
        error: 'Las fechas de inicio y fin son requeridas' 
      }, { status: 400 })
    }

    const start = new Date(start_date)
    const end = new Date(end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (start < today) {
      return NextResponse.json({ 
        error: 'La fecha de inicio no puede ser anterior a hoy' 
      }, { status: 400 })
    }

    if (end < start) {
      return NextResponse.json({ 
        error: 'La fecha de fin debe ser posterior a la fecha de inicio' 
      }, { status: 400 })
    }

    // Validar que el tipo de permiso existe (permission_types es una tabla global, sin company_id)
    const { data: permissionType, error: typeError } = await supabase
      .from('permission_types')
      .select('code, label, affects_payroll')
      .eq('code', permission_type_code)
      .single()

    if (typeError || !permissionType) {
      return NextResponse.json({ 
        error: 'Tipo de permiso no encontrado' 
      }, { status: 404 })
    }

    // Calcular días si no se proporciona
    let calculatedDays = days
    if (!calculatedDays || calculatedDays <= 0) {
      // Calcular días hábiles entre las fechas
      let daysCount = 0
      const currentDate = new Date(start)
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysCount++
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      calculatedDays = daysCount || 1 // Mínimo 1 día
    }

    // Crear solicitud de permiso
    const permissionData: any = {
      company_id: employee.company_id,
      employee_id: employee.id,
      permission_type_code,
      reason: reason.trim(),
      start_date,
      end_date,
      days: calculatedDays,
      hours: hours || 0,
      status: 'requested', // Estado: solicitado
      requested_by: user.id,
      requested_at: new Date().toISOString(),
      created_by: user.id,
    }

    if (notes?.trim()) {
      permissionData.notes = notes.trim()
    }

    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .insert(permissionData)
      .select()
      .single()

    if (permError) {
      console.error('Error al crear permiso:', permError)
      return NextResponse.json({ 
        error: permError.message || 'Error al crear la solicitud de permiso' 
      }, { status: 500 })
    }

    // Registrar evento de auditoría
    try {
      const auditService = createAuditService(supabase)
      await auditService.logEvent({
        companyId: employee.company_id,
        employeeId: employee.id,
        actorUserId: user.id,
        source: 'employee_portal',
        actionType: 'permission.requested',
        module: 'permissions',
        entityType: 'permissions',
        entityId: permission.id,
        status: 'success',
        afterData: {
          permission_type_code,
          start_date,
          end_date,
          days: calculatedDays,
          hours: hours || 0,
          status: 'requested',
        },
        metadata: {
          reason: reason.trim(),
          notes: notes || null,
        },
      }).catch((err) => console.error('Error al registrar auditoría:', err))
    } catch (auditError) {
      // No interrumpir el flujo si falla el logging
      console.error('Error al registrar auditoría:', auditError)
    }

    return NextResponse.json({ 
      success: true, 
      permission,
      message: 'Solicitud de permiso creada exitosamente. Será revisada por un administrador.' 
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error al solicitar permiso:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

