import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'
import { createClient } from '@supabase/supabase-js'

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

    // Usar adminClient para insertar el certificado (bypass RLS)
    // porque las políticas RLS actuales solo permiten a admins crear certificados
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: certificate, error: certError } = await adminClient
      .from('certificates')
      .insert(certificateData)
      .select()
      .single()

    if (certError) {
      console.error('Error al crear certificado:', certError)
      return NextResponse.json({ 
        error: certError.message || 'Error al crear la solicitud de certificado' 
      }, { status: 500 })
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

