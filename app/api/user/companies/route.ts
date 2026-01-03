import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getUserCompanies } from '@/lib/services/companyService'

export const dynamic = 'force-dynamic'

// GET: Obtener empresas del usuario actual
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const companies = await getUserCompanies(supabase)
    return NextResponse.json({ companies })
  } catch (error: any) {
    console.error('Error al obtener empresas del usuario:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener empresas' }, { status: 500 })
  }
}

