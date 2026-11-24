import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/settlements/[id]/approve/route'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import type { Database } from '@/types/database'

vi.mock('@/lib/supabase/server-api', () => ({
  createServerClientForAPI: vi.fn(),
}))

const id = 'settlement-test'
const userId = 'approver-test'
const approvalDate = new Date('2026-03-10T12:00:00.000Z')

function approve(body?: string) {
  const request = new NextRequest(`http://localhost/api/settlements/${id}/approve`, {
    method: 'POST',
    ...(body === undefined ? {} : { body, headers: { 'Content-Type': 'application/json' } }),
  })
  return POST(request, { params: { id } })
}

function createFixture() {
  const draft = {
    id,
    employee_id: 'employee-test',
    contract_id: 'contract-test',
    status: 'draft',
    approved_at: null,
    approved_by: null,
    notes: 'Nota existente',
  }
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname === '/auth/v1/user' && init?.method === 'GET') {
      return Response.json({ id: userId, aud: 'authenticated' })
    }
    if (url.pathname === '/rest/v1/contracts' && url.searchParams.get('id') === 'eq.contract-test') {
      return Response.json([{ status: 'terminated' }])
    }
    if (url.pathname === '/rest/v1/settlements' && url.searchParams.get('id') === `eq.${id}`) {
      if (init?.method === 'PATCH') {
        Object.assign(draft, JSON.parse(String(init.body)))
      }
      return Response.json(draft)
    }
    throw new Error(`Solicitud inesperada: ${init?.method} ${url.pathname}`)
  })
  const client = createClient<Database>('http://supabase.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch, headers: { Authorization: 'Bearer test-token' } },
  })
  vi.mocked(createServerClientForAPI).mockReturnValue(client)
  return { draft, fetch }
}

describe('POST /api/settlements/[id]/approve', () => {
  beforeEach(() => {
    vi.setSystemTime(approvalDate)
    return () => vi.useRealTimers()
  })

  it('aprueba un borrador sin cuerpo y registra quién y cuándo lo aprobó', async () => {
    const { draft } = createFixture()
    expect(draft.status).toBe('draft')

    const response = await approve()

    expect(response.status).toBe(200)
    const approved = {
      status: 'approved',
      approved_by: userId,
      approved_at: approvalDate.toISOString(),
      notes: 'Nota existente',
    }
    expect(draft).toMatchObject(approved)
    await expect(response.json()).resolves.toMatchObject({ settlement: approved })
  })

  it('guarda las notas cuando se incluyen', async () => {
    const { draft } = createFixture()

    const response = await approve(JSON.stringify({ notes: 'Revisado por RRHH' }))

    expect(response.status).toBe(200)
    expect(draft.notes).toBe('Revisado por RRHH')
  })

  it.each([
    ['{"notes":', 'El cuerpo de la solicitud no contiene JSON válido'],
    ['null', 'El cuerpo de la solicitud debe ser un objeto JSON'],
    ['[]', 'El cuerpo de la solicitud debe ser un objeto JSON'],
    ['{"notes":42}', 'Las notas deben ser texto'],
  ])('rechaza el cuerpo %s sin modificar el borrador', async (body, error) => {
    const { draft, fetch } = createFixture()

    const response = await approve(body)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error })
    expect(draft.status).toBe('draft')
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  })
})
