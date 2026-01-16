import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

/**
 * Endpoint para ejecutar el job diario de cumplimientos
 * Este endpoint debe ser llamado por un cron job (ej: Vercel Cron, o similar)
 * 
 * Ejemplo de configuración en vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/compliance/cron",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar que la solicitud viene de un cron job autorizado
    // Vercel automáticamente agrega el header 'x-vercel-cron' para cron jobs configurados
    const cronSecret = process.env.CRON_SECRET
    const vercelCronHeader = request.headers.get('x-vercel-cron')
    const authHeader = request.headers.get('authorization')

    // Si hay CRON_SECRET configurado, validarlo
    if (cronSecret) {
      // Permitir si viene de Vercel Cron o con el secret correcto
      if (!vercelCronHeader && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } else {
      // Si no hay secret, solo permitir desde Vercel Cron
      if (!vercelCronHeader) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const supabase = adminClient

    // Paso 1: Recalcular estados de cumplimientos
    console.log('Recalculando estados de cumplimientos...')
    const { error: recalcError } = await supabase.rpc('recalculate_compliance_status')

    if (recalcError) {
      console.error('Error recalculando estados:', recalcError)
      return NextResponse.json(
        { error: 'Error al recalcular estados', details: recalcError.message },
        { status: 500 }
      )
    }

    // Paso 2: Generar notificaciones automáticas
    console.log('Generando notificaciones automáticas...')
    const { error: notifyError } = await supabase.rpc('generate_compliance_notifications')

    if (notifyError) {
      console.error('Error generando notificaciones:', notifyError)
      return NextResponse.json(
        { error: 'Error al generar notificaciones', details: notifyError.message },
        { status: 500 }
      )
    }

    // Paso 3: Obtener estadísticas del proceso
    const { data: stats } = await supabase
      .from('worker_compliance')
      .select('status', { count: 'exact', head: false })

    const statusCounts = stats?.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {}) || {}

    const { count: notificationCount } = await supabase
      .from('compliance_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false)

    return NextResponse.json({
      success: true,
      message: 'Job de cumplimientos ejecutado correctamente',
      stats: {
        compliance_status: statusCounts,
        unread_notifications: notificationCount || 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error en job de cumplimientos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

// También permitir POST para mayor flexibilidad
export async function POST(request: NextRequest) {
  return GET(request)
}

