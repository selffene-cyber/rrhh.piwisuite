import { NextRequest, NextResponse } from 'next/server'
import { askGemini } from '@/lib/services/geminiClient'

// Modelo que se está usando
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

/**
 * Endpoint de prueba para verificar la conexión con Gemini API
 * Solo disponible en desarrollo
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Este endpoint solo está disponible en desarrollo' },
      { status: 403 }
    )
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { 
        error: 'GEMINI_API_KEY no está configurada',
        details: 'Por favor, agrega GEMINI_API_KEY a tu archivo .env.local'
      },
      { status: 500 }
    )
  }

  // Ocultar la API key en la respuesta (mostrar solo los primeros y últimos caracteres)
  const maskedKey = apiKey.length > 10 
    ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
    : '***'

  try {
    console.log('[Test] Probando conexión con Gemini API...')
    
    // Probar con un prompt muy simple
    const testPrompt = 'Di solo "OK"'
    const response = await askGemini({
      prompt: testPrompt,
      temperature: 0.1,
      maxTokens: 5,
    })

    return NextResponse.json({
      success: true,
      message: 'Conexión con Gemini API exitosa',
      model: GEMINI_MODEL,
      apiKey: maskedKey,
      response: response.answer,
      usage: response.usage,
      note: 'Si recibes errores de rate limit, espera unos minutos o considera cambiar a otro modelo disponible (gemini-3-pro-preview, gemini-2.0-flash-exp)'
    })
  } catch (error: any) {
    console.error('[Test] Error al probar Gemini API:', error)
    console.error('[Test] Error stack:', error.stack)
    console.error('[Test] Error details:', JSON.stringify(error, null, 2))
    
    // Detectar si es un error de rate limit de Gemini
    const errorMessage = error?.message || error?.toString() || 'Error desconocido'
    const isRateLimitError = errorMessage.includes('Límite de solicitudes') || 
                            errorMessage.includes('rate limit') ||
                            errorMessage.includes('429') ||
                            errorMessage.includes('quota')
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        errorType: error?.name || 'Unknown',
        model: GEMINI_MODEL,
        apiKey: maskedKey,
        isRateLimitError,
        details: isRateLimitError 
          ? 'La API de Gemini tiene límites de rate limit. Espera unos minutos o considera usar un modelo diferente (gemini-1.5-pro).'
          : 'Verifica que tu API key sea válida y tenga permisos para usar Gemini API. Revisa la consola del servidor para más detalles.'
      },
      { status: 500 }
    )
  }
}





