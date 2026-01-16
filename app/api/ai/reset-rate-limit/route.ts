import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resetRateLimit } from '@/lib/services/rateLimiter'

// Solo permitir en desarrollo
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Este endpoint solo está disponible en desarrollo' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createServerClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Resetear el rate limit para este usuario
    resetRateLimit(user.id)
    
    return NextResponse.json({
      message: 'Rate limit reseteado correctamente para tu usuario.',
      note: 'Ahora puedes hacer nuevas consultas sin restricciones hasta alcanzar el límite nuevamente.'
    })
  } catch (error: any) {
    console.error('Error en /api/ai/reset-rate-limit:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}





