import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import {
  getRIOHSRules,
  createRIOHSRule,
} from '@/lib/services/disciplinaryActionService'

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

    const rules = await getRIOHSRules(companyId, supabase)
    return NextResponse.json(rules)
  } catch (error: any) {
    console.error('Error al obtener reglas RIOHS:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener reglas RIOHS' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const body = await request.json()

    const rule = await createRIOHSRule(body, supabase)
    return NextResponse.json(rule, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear regla RIOHS:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear regla RIOHS' },
      { status: 500 }
    )
  }
}

