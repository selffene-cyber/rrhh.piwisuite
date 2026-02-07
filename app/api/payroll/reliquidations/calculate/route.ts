import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { calculateReliquidation } from '@/lib/services/reliquidationCalculator'
import { ReliquidationModifications } from '@/lib/services/reliquidationCalculator'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const body = await request.json()

    const { reference_payroll_slip_id, modifications } = body

    if (!reference_payroll_slip_id) {
      return NextResponse.json(
        { error: 'Falta el ID de la liquidación de referencia' },
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

    // Calcular reliquidación
    const calculation = await calculateReliquidation(
      originalSlip as any,
      modifications as ReliquidationModifications,
      supabase
    )

    return NextResponse.json(calculation)
  } catch (error: any) {
    console.error('Error al calcular reliquidación:', error)
    return NextResponse.json(
      { error: error.message || 'Error al calcular reliquidación' },
      { status: 500 }
    )
  }
}
