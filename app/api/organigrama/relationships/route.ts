import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

// POST: Crear o actualizar relación superior-subordinado
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

    const { employee_id, superior_id } = body

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id es requerido' }, { status: 400 })
    }

    // Obtener información del empleado para validar company_id
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('company_id, id')
      .eq('id', employee_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Si se proporciona superior_id, validar que pertenezca a la misma empresa
    if (superior_id) {
      const { data: superior, error: superiorError } = await supabase
        .from('employees')
        .select('company_id, id')
        .eq('id', superior_id)
        .single()

      if (superiorError || !superior) {
        return NextResponse.json({ error: 'Superior no encontrado' }, { status: 404 })
      }

      if (superior.company_id !== employee.company_id) {
        return NextResponse.json(
          { error: 'El superior debe pertenecer a la misma empresa' },
          { status: 400 }
        )
      }

      // Validar que no se cree un ciclo (el superior no puede ser subordinado del empleado)
      const { data: cycleCheck } = await supabase
        .from('employees')
        .select('id')
        .eq('id', superior_id)
        .eq('superior_id', employee_id)
        .single()

      if (cycleCheck) {
        return NextResponse.json(
          { error: 'No se puede crear un ciclo en la jerarquía' },
          { status: 400 }
        )
      }

      // Validar que el empleado no sea su propio superior
      if (employee_id === superior_id) {
        return NextResponse.json(
          { error: 'Un empleado no puede ser su propio superior' },
          { status: 400 }
        )
      }
    }

    // Actualizar el superior_id del empleado
    const { data, error } = await supabase
      .from('employees')
      .update({ superior_id: superior_id || null })
      .eq('id', employee_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('Error al actualizar relación jerárquica:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar relación jerárquica' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar relación (quitar superior)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id es requerido' }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Actualizar el superior_id a null
    const { data, error } = await supabase
      .from('employees')
      .update({ superior_id: null })
      .eq('id', employee_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('Error al eliminar relación jerárquica:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar relación jerárquica' },
      { status: 500 }
    )
  }
}

