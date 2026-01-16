import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // TODO: Implementar exportación CSV de reporte organizacional
    return NextResponse.json({ error: 'Endpoint no implementado aún' }, { status: 501 })
  } catch (error: any) {
    console.error('Error al exportar CSV:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar CSV' }, { status: 500 })
  }
}

