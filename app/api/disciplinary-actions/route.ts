import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getDisciplinaryActions,
  createDisciplinaryAction,
} from '@/lib/services/disciplinaryActionService'
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    
    const companyId = searchParams.get('company_id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id es requerido' },
        { status: 400 }
      )
    }

    const filters: any = {}
    const employeeId = searchParams.get('employee_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    if (employeeId) filters.employee_id = employeeId
    if (status) filters.status = status
    if (type) filters.type = type

    const actions = await getDisciplinaryActions(companyId, supabase, filters)
    return NextResponse.json(actions)
  } catch (error: any) {
    console.error('Error al obtener amonestaciones:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener amonestaciones' },
      { status: 500 }
    )
  }
}

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
          .select('can_create_disciplinary')
          .eq('user_id', user.id)
          .eq('company_id', employee.company_id)
          .single()

        if (!permissions?.can_create_disciplinary) {
          return NextResponse.json(
            { error: 'No tienes permiso para crear amonestaciones' },
            { status: 403 }
          )
        }
      }

      // Validar que el empleado pueda recibir una amonestación (requiere contrato activo)
      const { employee: employeeValidator } = createValidationServices(supabase)
      const validation = await employeeValidator.canCreateDisciplinaryAction(body.employee_id)
      
      const errorResponse = handleValidationError(validation)
      if (errorResponse) return errorResponse
    }

    const action = await createDisciplinaryAction(
      {
        ...body,
        issuer_user_id: user.id,
      },
      supabase
    )

    return NextResponse.json(action, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear amonestación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear amonestación' },
      { status: 500 }
    )
  }
}

