/**
 * API Routes para Finiquitos
 * GET: Lista finiquitos
 * POST: Crea nuevo finiquito
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getSettlements, createSettlement, getSettlementCauses } from '@/lib/services/settlementService'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id') || undefined
    const employee_id = searchParams.get('employee_id') || undefined
    const status = searchParams.get('status') || undefined
    const start_date = searchParams.get('start_date') || undefined
    const end_date = searchParams.get('end_date') || undefined

    const filters: any = {}
    if (company_id) filters.company_id = company_id
    if (employee_id) filters.employee_id = employee_id
    if (status) filters.status = status
    if (start_date) filters.start_date = start_date
    if (end_date) filters.end_date = end_date

    const settlements = await getSettlements(filters, supabase)

    return NextResponse.json({ settlements })
  } catch (error: any) {
    console.error('Error al obtener finiquitos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener finiquitos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { employee_id, termination_date, cause_code, notice_given, notice_days, notes } = body

    // Validaciones básicas
    if (!employee_id || !termination_date || !cause_code) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: employee_id, termination_date, cause_code' },
        { status: 400 }
      )
    }

    // Crear finiquito
    const settlement = await createSettlement(
      {
        employee_id,
        termination_date,
        cause_code,
        notice_given: notice_given || false,
        notice_days,
        notes
      },
      user.id,
      supabase
    )

    return NextResponse.json({ settlement }, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear finiquito:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear finiquito' },
      { status: 500 }
    )
  }
}

