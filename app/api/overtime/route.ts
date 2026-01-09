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

    // Validar que el empleado pueda recibir un pacto de horas extra (requiere contrato activo)
    if (body.employee_id) {
      const { employee } = createValidationServices(supabase)
      const validation = await employee.canCreateOvertimePact(body.employee_id)
      
      const errorResponse = handleValidationError(validation)
      if (errorResponse) return errorResponse
    }

    // Insertar pacto
    const { data, error } = await supabase
      .from('overtime_pacts')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear pacto de horas extra:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear pacto de horas extra' },
      { status: 500 }
    )
  }
}








