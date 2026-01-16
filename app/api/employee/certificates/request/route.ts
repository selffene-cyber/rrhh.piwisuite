import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { createAuditService } from '@/lib/services/auditService'
import { NextRequest, NextResponse } from 'next/server'
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'

/**
 * API para que un trabajador solicite un certificado
 * Solo puede solicitar certificados para sí mismo
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

    // Validar que el trabajador pueda generar un certificado (tiene contrato activo)
    const { employee: employeeEligibility } = createValidationServices(supabase)
    const validation = await employeeEligibility.canGenerateCertificate(employee.id)
    
    const errorResponse = handleValidationError(validation)
    if (errorResponse) {
      return errorResponse
    }

    const body = await request.json()
    const { certificate_type, purpose, months_period } = body

    // Validaciones
    if (!certificate_type) {
      return NextResponse.json({ 
        error: 'El tipo de certificado es requerido' 
      }, { status: 400 })
    }

    const validTypes = ['antiguedad', 'renta', 'vigencia']
    if (!validTypes.includes(certificate_type)) {
      return NextResponse.json({ 
        error: 'Tipo de certificado inválido' 
      }, { status: 400 })
    }

    // Crear solicitud de certificado
    const certificateData: any = {
      company_id: employee.company_id,
      employee_id: employee.id,
      certificate_type,
      issue_date: new Date().toISOString().split('T')[0],
      status: 'requested', // Estado: solicitado
      requested_by: user.id,
      requested_at: new Date().toISOString(),
    }

    if (purpose?.trim()) {
      certificateData.purpose = purpose.trim()
    }

    // Campos específicos según tipo
    if (certificate_type === 'renta') {
      // Por defecto 12 meses si no se especifica
      certificateData.months_period = months_period || 12
    }

    // Usar el cliente normal de supabase (con RLS)
    // La política RLS "Employees can request certificates for themselves" permite esto
    console.log('[Certificate Request] Intentando crear certificado con datos:', JSON.stringify(certificateData, null, 2))
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .insert(certificateData)
      .select()
      .single()

    if (certError) {
      console.error('[Certificate Request] Error al crear certificado:', certError)
      console.error('[Certificate Request] Error code:', certError.code)
      console.error('[Certificate Request] Error message:', certError.message)
      console.error('[Certificate Request] Error details:', certError.details)
      console.error('[Certificate Request] Error hint:', certError.hint)
      return NextResponse.json({ 
        error: certError.message || 'Error al crear la solicitud de certificado' 
      }, { status: 500 })
    }

    console.log('[Certificate Request] Certificado creado exitosamente:', certificate?.id)
    console.log('[Certificate Request] Status del certificado:', certificate?.status)

    // Registrar evento de auditoría
    try {
      const auditService = createAuditService(supabase)
      const auditResult = await auditService.logEvent({
        companyId: employee.company_id,
        employeeId: employee.id,
        actorUserId: user.id,
        source: 'employee_portal',
        actionType: 'certificate.requested',
        module: 'certificates',
        entityType: 'certificates',
        entityId: certificate.id,
        status: 'success',
        afterData: {
          certificate_type,
          status: 'requested',
          months_period: certificate_type === 'renta' ? (months_period || 12) : null,
        },
        metadata: {
          purpose: purpose || null,
        },
      })
      console.log(`[Certificate Request] Evento de auditoría registrado para employee_id: ${employee.id}, company_id: ${employee.company_id}`)
    } catch (auditError: any) {
      // No interrumpir el flujo si falla el logging
      console.error('[Certificate Request] Error al registrar auditoría:', auditError)
      console.error('[Certificate Request] Employee ID:', employee.id)
      console.error('[Certificate Request] User ID:', user.id)
      console.error('[Certificate Request] Company ID:', employee.company_id)
      console.error('[Certificate Request] Error details:', JSON.stringify(auditError, null, 2))
    }

    return NextResponse.json({ 
      success: true, 
      certificate,
      message: 'Solicitud de certificado creada exitosamente. Será revisada por un administrador.' 
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error al solicitar certificado:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}

