import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getAccidentStats } from '@/lib/services/raatService'

export const dynamic = 'force-dynamic'

// GET: Obtener estadísticas de accidentes
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

    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const filters: any = {}
    if (startDate) filters.start_date = startDate
    if (endDate) filters.end_date = endDate

    const stats = await getAccidentStats(companyId, supabase, filters)
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}



