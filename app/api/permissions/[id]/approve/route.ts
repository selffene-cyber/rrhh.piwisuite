import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { approvePermission } from '@/lib/services/permissionService'

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

    const permission = await approvePermission(
      params.id,
      user.id,
      supabase
    )

    return NextResponse.json(permission)
  } catch (error: any) {
    console.error('Error al aprobar permiso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al aprobar permiso' },
      { status: 500 }
    )
  }
}

