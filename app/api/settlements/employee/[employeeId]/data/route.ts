/**
 * API Route para obtener datos de un trabajador para calcular finiquito
 * GET: Obtiene todos los datos necesarios para crear un finiquito
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getEmployeeDataForSettlement } from '@/lib/services/settlementService'

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener fecha de término de query params (opcional, por defecto hoy)
    const { searchParams } = new URL(request.url)
    const termination_date = searchParams.get('termination_date') || new Date().toISOString().split('T')[0]

    const employeeData = await getEmployeeDataForSettlement(
      params.employeeId,
      termination_date,
      supabase
    )

    return NextResponse.json({ data: employeeData })
  } catch (error: any) {
    console.error('Error al obtener datos del trabajador:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener datos del trabajador' },
      { status: 500 }
    )
  }
}

