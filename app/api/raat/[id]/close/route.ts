import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { closeAccident } from '@/lib/services/raatService'

// POST: Cerrar un accidente
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const accident = await closeAccident(params.id, user.id, supabase)
    return NextResponse.json(accident)
  } catch (error: any) {
    console.error('Error al cerrar accidente:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cerrar accidente' },
      { status: 500 }
    )
  }
}








