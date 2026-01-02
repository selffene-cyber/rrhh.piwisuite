import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { approveDisciplinaryAction } from '@/lib/services/disciplinaryActionService'

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

    const action = await approveDisciplinaryAction(
      params.id,
      user.id,
      supabase
    )

    return NextResponse.json(action)
  } catch (error: any) {
    console.error('Error al aprobar amonestación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al aprobar amonestación' },
      { status: 500 }
    )
  }
}

