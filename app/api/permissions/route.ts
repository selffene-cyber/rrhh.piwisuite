import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getPermissions,
  createPermission,
} from '@/lib/services/permissionService'
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
    const permissionTypeCode = searchParams.get('permission_type_code')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (employeeId) filters.employee_id = employeeId
    if (status) filters.status = status
    if (permissionTypeCode) filters.permission_type_code = permissionTypeCode
    if (startDate) filters.start_date = startDate
    if (endDate) filters.end_date = endDate

    const permissions = await getPermissions(companyId, supabase, filters)
    return NextResponse.json(permissions)
  } catch (error: any) {
    console.error('Error al obtener permisos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener permisos' },
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

    // Validar que el empleado pueda recibir un permiso
    if (body.employee_id) {
      const { employee } = createValidationServices(supabase)
      const validation = await employee.canCreatePermission(body.employee_id)
      
      const errorResponse = handleValidationError(validation)
      if (errorResponse) return errorResponse
    }

    const permission = await createPermission(
      {
        ...body,
        created_by: user.id,
      },
      supabase
    )

    return NextResponse.json(permission, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear permiso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear permiso' },
      { status: 500 }
    )
  }
}

