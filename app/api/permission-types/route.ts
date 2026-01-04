import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getPermissionTypes } from '@/lib/services/permissionService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const types = await getPermissionTypes(supabase)
    return NextResponse.json(types)
  } catch (error: any) {
    console.error('Error al obtener tipos de permisos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener tipos de permisos' },
      { status: 500 }
    )
  }
}

