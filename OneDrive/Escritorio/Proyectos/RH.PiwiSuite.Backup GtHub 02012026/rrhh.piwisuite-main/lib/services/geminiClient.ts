/**
 * Cliente para interactuar con la API de Google Gemini usando el SDK oficial @google/genai
 * Este cliente solo debe usarse desde el servidor (nunca en el cliente)
 */

import { GoogleGenAI } from '@google/genai'

// Modelo por defecto - usar gemini-2.5-flash o gemini-3-pro-preview según disponibilidad
// gemini-1.5-flash no está disponible en v1beta del SDK @google/genai
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Inicializar el cliente de Gemini (singleton)
let aiClient: GoogleGenAI | null = null

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada. Por favor, agrega GEMINI_API_KEY a tus variables de entorno.')
    }
    
    aiClient = new GoogleGenAI({ apiKey })
  }
  
  return aiClient
}

export interface GeminiRequest {
  prompt: string
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface GeminiResponse {
  answer: string
  usage?: {
    promptTokens?: number
    candidatesTokens?: number
    totalTokens?: number
  }
}

/**
 * Realiza una pregunta a Gemini API usando el SDK oficial
 * @param request - Objeto con el prompt y opciones
 * @returns Respuesta de Gemini con el texto generado
 */
export async function askGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const { prompt, temperature = 0.7, maxTokens = 2048, model = GEMINI_MODEL } = request

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('El prompt no puede estar vacío')
  }

  // Limitar longitud del prompt (máximo ~32k tokens aprox, pero ser conservador)
  const maxPromptLength = 30000 // caracteres
  const truncatedPrompt = prompt.length > maxPromptLength 
    ? prompt.substring(0, maxPromptLength) + '\n\n[Prompt truncado por límite de longitud]'
    : prompt

  try {
    const ai = getGeminiClient()
    
    console.log(`[Gemini] Usando modelo: ${model}`)
    
    // Usar la API según el ejemplo proporcionado: ai.models.generateContent
    const response = await ai.models.generateContent({
      model,
      contents: truncatedPrompt,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      },
    } as any)

    // Extraer el texto de la respuesta (según el ejemplo: response.text)
    const responseData = response as any
    const answer = responseData.text || ''

    if (!answer) {
      throw new Error('La respuesta de Gemini no contiene texto válido')
    }

    // Extraer información de uso si está disponible
    const usage = responseData.usage ? {
      promptTokens: responseData.usage.promptTokenCount,
      candidatesTokens: responseData.usage.candidatesTokenCount,
      totalTokens: responseData.usage.totalTokenCount,
    } : undefined

    return {
      answer,
      usage,
    }
  } catch (error: any) {
    // Manejar errores específicos de Gemini
    const errorMessage = error.message || error.toString()
    
    if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      throw new Error('Límite de solicitudes de Gemini API excedido. Por favor, espera unos minutos antes de intentar nuevamente.')
    }
    
    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('API key')) {
      throw new Error('Error de autenticación con Gemini API. Verifica tu API key.')
    }
    
    if (errorMessage.includes('400') || errorMessage.includes('invalid')) {
      throw new Error(`Solicitud inválida: ${errorMessage}`)
    }
    
    // Manejar errores de modelo no encontrado (404)
    if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
      throw new Error(`Modelo '${model}' no encontrado o no disponible. Prueba con: gemini-2.5-flash, gemini-3-pro-preview, o gemini-2.0-flash-exp`)
    }
    
    // Manejar errores de red o timeout
    if (error.name === 'TypeError' || errorMessage.includes('fetch') || errorMessage.includes('network')) {
      throw new Error('Error de conexión con Gemini API. Verifica tu conexión a internet.')
    }
    
    // Re-lanzar errores que ya tienen mensaje claro
    if (errorMessage) {
      throw new Error(`Error al comunicarse con Gemini: ${errorMessage}`)
    }
    
    throw new Error(`Error inesperado al comunicarse con Gemini: ${error.toString()}`)
  }
}





