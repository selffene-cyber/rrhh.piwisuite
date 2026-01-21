import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { issueDisciplinaryAction } from '@/lib/services/disciplinaryActionService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener companyId de la amonestación
    const { data: action, error: actionError } = await supabase
      .from('disciplinary_actions')
      .select('employee_id, employees!inner(company_id)')
      .eq('id', params.id)
      .single()

    if (actionError || !action) {
      return NextResponse.json({ error: 'Amonestación no encontrada' }, { status: 404 })
    }

    const companyId = (action as any).employees.company_id

    // Verificar permisos del usuario - "Emitir" requiere poder aprobar
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_approve_disciplinary')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .single()

    if (!permissions?.can_approve_disciplinary) {
      return NextResponse.json(
        { error: 'No tienes permiso para emitir amonestaciones' },
        { status: 403 }
      )
    }

    const issuedAction = await issueDisciplinaryAction(params.id, supabase)
    return NextResponse.json(issuedAction)
  } catch (error: any) {
    console.error('Error al emitir amonestación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al emitir amonestación' },
      { status: 500 }
    )
  }
}

