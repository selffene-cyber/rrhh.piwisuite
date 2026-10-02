import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const vercelCronHeader = request.headers.get('x-vercel-cron')
    const authHeader = request.headers.get('authorization')

    if (cronSecret) {
      if (!vercelCronHeader && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } else {
      if (!vercelCronHeader) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminClient as any
    const today = new Date().toISOString().split('T')[0]

    // Contratos activos con fecha de término vencida (el día del vencimiento sigue siendo laboral,
    // se expira al día siguiente: end_date < today)
    const { data: expiredContracts, error: fetchError } = await supabase
      .from('contracts')
      .select('id, employee_id, contract_number, end_date')
      .eq('status', 'active')
      .lt('end_date', today)
      .not('end_date', 'is', null)
      .neq('contract_type', 'indefinido')

    if (fetchError) {
      console.error('Error fetching expired contracts:', fetchError)
      return NextResponse.json({ error: 'Error al obtener contratos vencidos' }, { status: 500 })
    }

    if (!expiredContracts || expiredContracts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay contratos vencidos para expirar',
        expired: 0,
        timestamp: new Date().toISOString(),
      })
    }

    const contractIds = expiredContracts.map((c: { id: string }) => c.id)
    const { error: updateError } = await supabase
      .from('contracts')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('id', contractIds)

    if (updateError) {
      console.error('Error expiring contracts:', updateError)
      return NextResponse.json({ error: 'Error al expirar contratos' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      expired: contractIds.length,
      contracts: expiredContracts.map((c: { contract_number: string; end_date: string }) => ({
        contract_number: c.contract_number,
        end_date: c.end_date,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('Error en auto-expire:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}