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

    // Validar que el empleado pueda recibir una liquidación (requiere contrato activo)
    if (body.employee_id) {
      const { employee } = createValidationServices(supabase)
      const validation = await employee.canGeneratePayrollSlip(body.employee_id)
      
      const errorResponse = handleValidationError(validation)
      if (errorResponse) return errorResponse
    }

    // Insertar liquidación
    const { data, error } = await supabase
      .from('payroll_slips')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear liquidación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear liquidación' },
      { status: 500 }
    )
  }
}







