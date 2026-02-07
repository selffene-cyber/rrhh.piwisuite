import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { calculateReliquidation } from '@/lib/services/reliquidationCalculator'
import { ReliquidationModifications } from '@/lib/services/reliquidationCalculator'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const periodId = searchParams.get('period_id')

    let query = supabase
      .from('payroll_reliquidations')
      .select(`
        *,
        employees (*),
        payroll_periods (*),
        payroll_slips!payroll_reliquidations_reference_payroll_slip_id_fkey (*)
      `)
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (periodId) {
      query = query.eq('period_id', periodId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error al obtener reliquidaciones:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener reliquidaciones' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const body = await request.json()

    const {
      reference_payroll_slip_id,
      type,
      reason_category,
      reason_text,
      modifications,
    } = body

    if (!reference_payroll_slip_id || !type || !reason_category) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Obtener liquidación original
    const { data: originalSlip, error: slipError } = await supabase
      .from('payroll_slips')
      .select(`
        *,
        employees (*),
        payroll_periods (*),
        payroll_items (*)
      `)
      .eq('id', reference_payroll_slip_id)
      .single()

    if (slipError || !originalSlip) {
      return NextResponse.json(
        { error: 'Liquidación original no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que la liquidación esté emitida o enviada
    if (originalSlip.status !== 'issued' && originalSlip.status !== 'sent') {
      return NextResponse.json(
        { error: 'Solo se pueden crear reliquidaciones de liquidaciones emitidas o enviadas' },
        { status: 400 }
      )
    }

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Calcular reliquidación
    const calculation = await calculateReliquidation(
      originalSlip as any,
      modifications as ReliquidationModifications,
      supabase
    )

    // Crear reliquidación
    const { data: reliquidation, error: relError } = await supabase
      .from('payroll_reliquidations')
      .insert({
        company_id: originalSlip.employees?.company_id,
        employee_id: originalSlip.employee_id,
        period_id: originalSlip.period_id,
        reference_payroll_slip_id: reference_payroll_slip_id,
        type: type,
        reason_category: reason_category,
        reason_text: reason_text || null,
        diff_taxable_earnings: calculation.delta.diff_total_taxable_earnings,
        diff_non_taxable_earnings: calculation.delta.diff_total_non_taxable_earnings,
        diff_total_earnings: calculation.delta.diff_total_earnings,
        diff_legal_deductions: calculation.delta.diff_total_legal_deductions,
        diff_other_deductions: calculation.delta.diff_total_other_deductions,
        diff_total_deductions: calculation.delta.diff_total_deductions,
        diff_net_pay: calculation.delta.diff_net_pay,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (relError) throw relError

    // Crear ítems de reliquidación
    if (calculation.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('payroll_reliquidation_items')
        .insert(
          calculation.items.map(item => ({
            reliquidation_id: reliquidation.id,
            original_item_id: item.original_item_id,
            type: item.type,
            category: item.category,
            description: item.description,
            original_amount: item.original_amount,
            corrected_amount: item.corrected_amount,
            difference: item.difference,
            is_taxable: item.is_taxable,
            is_tributable: item.is_tributable,
            affects_deductions: item.affects_deductions,
            affects_gratification: item.affects_gratification,
          }))
        )

      if (itemsError) throw itemsError
    }

    // Crear delta
    const { reliquidation_id, id, created_at, ...deltaData } = calculation.delta as any
    const { error: deltaError } = await supabase
      .from('payroll_reliquidation_deltas')
      .insert({
        reliquidation_id: reliquidation.id,
        ...deltaData,
      })

    if (deltaError) throw deltaError

    // Obtener reliquidación completa
    const { data: completeReliquidation, error: fetchError } = await supabase
      .from('payroll_reliquidations')
      .select(`
        *,
        employees (*),
        payroll_periods (*),
        payroll_slips!payroll_reliquidations_reference_payroll_slip_id_fkey (*),
        payroll_reliquidation_items (*),
        payroll_reliquidation_deltas (*)
      `)
      .eq('id', reliquidation.id)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json(completeReliquidation)
  } catch (error: any) {
    console.error('Error al crear reliquidación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear reliquidación' },
      { status: 500 }
    )
  }
}
