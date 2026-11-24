import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/previsional/sync-sis/route'
import { middleware } from '@/middleware'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ adminClient: { rpc } }))

function sync(token = 'test-secret') {
  return GET(new NextRequest('http://localhost/api/previsional/sync-sis', {
    headers: { Authorization: `Bearer ${token}` },
  }))
}

describe('sincronización mensual de SIS', () => {
  let fetchIndicators: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-12-01T01:00:00Z'))
    vi.stubEnv('CRON_SECRET', 'test-secret')
    fetchIndicators = vi.fn().mockImplementation(async () => Response.json({
      PeriodoMY: '112026', TasaSIS: '1,79', ExpVida: '0,71',
    }))
    vi.stubGlobal('fetch', fetchIndicators)
    rpc.mockReset().mockResolvedValue({ data: 'unchanged', error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('consulta el mes de Chile sin caché y sincroniza el SIS', async () => {
    const response = await sync()
    expect(response.status).toBe(200)
    expect(fetchIndicators).toHaveBeenCalledWith(
      'https://api.gael.cloud/general/public/previred/112026',
      expect.objectContaining({ cache: 'no-store' }),
    )
    expect(rpc).toHaveBeenCalledWith('sync_monthly_sis', { p_period: '2026-11-01', p_rate: 1.79 })
    await expect(response.json()).resolves.toMatchObject({ status: 'unchanged', sis: 1.79, expectativaVida: 0.71 })
  })

  it.each([
    ['102026', '1,79', '0,71'],
    ['112026', null, '0,71'],
    ['112026', '1,79', null],
    ['112026', '2,00', '0,71'],
  ])('no guarda un período o desglose inconsistente (%s / %s / %s)', async (PeriodoMY, TasaSIS, ExpVida) => {
    fetchIndicators.mockResolvedValue(Response.json({ PeriodoMY, TasaSIS, ExpVida }))
    expect((await sync()).status).toBe(502)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rechaza solicitudes no autorizadas sin consultar las fuentes', async () => {
    expect((await sync('incorrecto')).status).toBe(401)
    expect(fetchIndicators).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('deja que la ruta autentique al programador sin cookies de usuario', async () => {
    const response = await middleware(new NextRequest('http://localhost/api/previsional/sync-sis'))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('informa el conflicto cuando la tasa requiere revisión manual', async () => {
    rpc.mockResolvedValue({ data: 'conflict', error: null })
    const response = await sync()
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ status: 'conflict' })
  })
})
