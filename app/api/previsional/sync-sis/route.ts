import { timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type SisSchema = {
  public: {
    Tables: Record<never, never>
    Views: Record<never, never>
    Functions: {
      sync_monthly_sis: {
        Args: { p_period: string; p_rate: number }
        Returns: 'inserted' | 'updated' | 'unchanged' | 'conflict'
      }
    }
  }
}

function parseRate(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,2}(?:[,.]\d{1,2})?$/.test(value)) return null
  return Math.round(Number(value.replace(',', '.')) * 100)
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[sync-sis] CRON_SECRET no configurado')
    return NextResponse.json({ error: 'Sincronización no configurada' }, { status: 503 })
  }
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const period = `${year}-${month}-01`
  const periodCode = `${month}${year}`
  let sis: number
  let expectativaVida: number
  try {
    const response = await fetch(`https://api.gael.cloud/general/public/previred/${periodCode}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(`Gael Cloud respondió HTTP ${response.status}`)
    const indicators = await response.json()
    const sisPoints = parseRate(indicators?.TasaSIS)
    const lifePoints = parseRate(indicators?.ExpVida)
    // El desglose publicado del Seguro Social debe coincidir con el total vigente de 2,50%.
    if (indicators?.PeriodoMY !== periodCode || sisPoints === null || sisPoints <= 0 ||
        lifePoints === null || sisPoints + lifePoints !== 250) {
      throw new Error('Período incorrecto o desglose SIS/expectativa de vida incompleto o inconsistente')
    }
    sis = sisPoints / 100
    expectativaVida = lifePoints / 100
  } catch (error) {
    console.warn('[sync-sis] No se sincronizó el período', period, error)
    return NextResponse.json({ error: 'Indicadores SIS no disponibles o inconsistentes', period }, { status: 502 })
  }

  try {
    const { adminClient } = await import('@/lib/supabase/admin')
    const sisClient = adminClient as unknown as SupabaseClient<SisSchema>
    const { data: status, error } = await sisClient.rpc('sync_monthly_sis', { p_period: period, p_rate: sis })
    if (error) throw error
    if (status === 'conflict') {
      console.warn('[sync-sis] La tasa existente requiere revisión manual', { period, sis, expectativaVida })
      return NextResponse.json({ status, period, sis, expectativaVida, error: 'La vigencia SIS existente requiere revisión manual' }, { status: 409 })
    }
    console.info('[sync-sis]', { status, period, sis, expectativaVida, source: 'gael_cloud' })
    return NextResponse.json({ status, period, sis, expectativaVida })
  } catch (error) {
    console.error('[sync-sis] No se pudo guardar el período', period, error)
    return NextResponse.json({ error: 'No se pudo guardar la tasa SIS', period }, { status: 500 })
  }
}
