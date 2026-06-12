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

    const { data: expiredLeaves, error: fetchError } = await supabase
      .from('medical_leaves')
      .select('id, employee_id, start_date, end_date')
      .eq('is_active', true)
      .lt('end_date', today)

    if (fetchError) {
      console.error('Error fetching expired leaves:', fetchError)
      return NextResponse.json({ error: 'Error al obtener licencias vencidas' }, { status: 500 })
    }

    if (!expiredLeaves || expiredLeaves.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay licencias vencidas para desactivar',
        deactivated: 0,
        employees_updated: 0,
        timestamp: new Date().toISOString(),
      })
    }

    const leaveIds = expiredLeaves.map((l: { id: string }) => l.id)
    const { error: updateError } = await supabase
      .from('medical_leaves')
      .update({ is_active: false })
      .in('id', leaveIds)

    if (updateError) {
      console.error('Error deactivating leaves:', updateError)
      return NextResponse.json({ error: 'Error al desactivar licencias' }, { status: 500 })
    }

    const employeeIds = [...new Set(expiredLeaves.map((l: { employee_id: string }) => l.employee_id))]
    let employeesUpdated = 0

    for (const employeeId of employeeIds) {
      const { data: remainingActive } = await supabase
        .from('medical_leaves')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .limit(1)

      if (!remainingActive || remainingActive.length === 0) {
        const { data: empData } = await supabase
          .from('employees')
          .select('status')
          .eq('id', employeeId)
          .single()

        if (empData && empData.status === 'licencia_medica') {
          const { error: empUpdateError } = await supabase
            .from('employees')
            .update({ status: 'active' })
            .eq('id', employeeId)
            .eq('status', 'licencia_medica')

          if (!empUpdateError) {
            employeesUpdated++
          } else {
            console.error(`Error updating employee ${employeeId}:`, empUpdateError)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      deactivated: leaveIds.length,
      employees_updated: employeesUpdated,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('Error en deactivate-expired:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}