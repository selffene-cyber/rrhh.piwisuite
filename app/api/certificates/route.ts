import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener el companyId del empleado para verificar permisos
    if (body.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', body.employee_id)
        .single()

      if (!employee) {
        return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
      }

      // Verificar permisos del usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const isSuperAdmin = profile?.role === 'super_admin'

      if (!isSuperAdmin) {
        const { data: permissions } = await supabase
          .from('user_permissions')
          .select('can_create_certificates')
          .eq('user_id', user.id)
          .eq('company_id', employee.company_id)
          .single()

        if (!permissions?.can_create_certificates) {
          return NextResponse.json(
            { error: 'No tienes permiso para crear certificados' },
            { status: 403 }
          )
        }
      }

      // Validar que el empleado pueda recibir un certificado (requiere contrato activo, pero permite durante licencia médica)
      const { employee: employeeValidator } = createValidationServices(supabase)
      const validation = await employeeValidator.canGenerateCertificate(body.employee_id)
      
      const errorResponse = handleValidationError(validation)
      if (errorResponse) return errorResponse
    }

    // Insertar certificado
    const { data, error } = await supabase
      .from('certificates')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear certificado:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear certificado' },
      { status: 500 }
    )
  }
}








