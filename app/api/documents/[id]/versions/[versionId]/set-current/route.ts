import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { setCurrentVersion } from '@/lib/services/documentBankService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    await setCurrentVersion(params.id, params.versionId, supabase)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error al establecer versión vigente:', error)
    return NextResponse.json(
      { error: error.message || 'Error al establecer versión vigente' },
      { status: 500 }
    )
  }
}

