import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { askGemini } from '@/lib/services/geminiClient'
import { checkRateLimit } from '@/lib/services/rateLimiter'
import { buildContextFromQuestion } from '@/lib/services/aiContextBuilder'

function sanitizeQuestion(question: string): string {
  // Limitar longitud
  const maxLength = 2000
  if (question.length > maxLength) {
    return question.substring(0, maxLength)
  }
  
  // Remover caracteres peligrosos básicos (opcional, Gemini maneja bien la mayoría)
  return question.trim()
}

async function buildBusinessContext(
  supabase: any,
  userId: string,
  companyId: string,
  context?: { employeeId?: string; periodId?: string }
): Promise<string> {
  const contextParts: string[] = []

  if (context?.employeeId) {
    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, base_salary, status, hire_date')
        .eq('id', context.employeeId)
        .eq('company_id', companyId)
        .single()

      if (employee) {
        contextParts.push(`Trabajador: ${employee.full_name}`)
        contextParts.push(`RUT: ${employee.rut}`)
        contextParts.push(`Cargo: ${employee.position || 'No especificado'}`)
        contextParts.push(`Estado: ${employee.status}`)
        contextParts.push(`Fecha de ingreso: ${employee.hire_date}`)
        contextParts.push(`Sueldo base: $${employee.base_salary?.toLocaleString('es-CL') || 'No especificado'}`)

        // Obtener liquidaciones recientes (últimas 3)
        const { data: recentSlips } = await supabase
          .from('payroll_slips')
          .select('id, net_pay, status, created_at, payroll_periods(year, month)')
          .eq('employee_id', context.employeeId)
          .order('created_at', { ascending: false })
          .limit(3)

        if (recentSlips && recentSlips.length > 0) {
          contextParts.push('\nLiquidaciones recientes:')
          recentSlips.forEach((slip: any) => {
            const period = slip.payroll_periods
            contextParts.push(
              `- ${period?.month}/${period?.year}: Líquido $${slip.net_pay?.toLocaleString('es-CL')} (${slip.status})`
            )
          })
        }
      }
    } catch (error) {
      console.error('Error al obtener contexto del empleado:', error)
    }
  }

  if (context?.periodId) {
    try {
      const { data: period } = await supabase
        .from('payroll_periods')
        .select('id, year, month, payroll_slips(id, employee_id, net_pay, status, employees(full_name, rut))')
        .eq('id', context.periodId)
        .single()

      if (period) {
        contextParts.push(`\nPeríodo de liquidación: ${period.month}/${period.year}`)
        
        if (period.payroll_slips && period.payroll_slips.length > 0) {
          contextParts.push(`Total de liquidaciones: ${period.payroll_slips.length}`)
          const totalNetPay = period.payroll_slips.reduce(
            (sum: number, slip: any) => sum + (slip.net_pay || 0),
            0
          )
          contextParts.push(`Total líquido a pagar: $${totalNetPay.toLocaleString('es-CL')}`)
        }
      }
    } catch (error) {
      console.error('Error al obtener contexto del período:', error)
    }
  }

  return contextParts.length > 0 ? contextParts.join('\n') : ''
}

export async function POST(request: NextRequest) {
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

    // Obtener perfil del usuario y empresa actual
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      )
    }

    // Leer body PRIMERO para obtener companyId si viene del frontend
    const body = await request.json()
    const { question, context, companyId: requestedCompanyId } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'La pregunta es requerida' },
        { status: 400 }
      )
    }

    // Obtener empresa actual
    let companyId: string | null = null

    // Si viene companyId en el request, usarlo (es la empresa seleccionada en el frontend)
    if (requestedCompanyId) {
      companyId = requestedCompanyId
    } else {
      // Si no viene, intentar obtener del perfil del usuario (default_company_id)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('default_company_id, role')
        .eq('id', user.id)
        .single()

      if (profile?.default_company_id) {
        companyId = profile.default_company_id
      } else if (profile?.role === 'super_admin') {
        // Si es super_admin, obtener la primera empresa disponible
        const { data: firstCompany } = await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .single()
        companyId = firstCompany?.id || null
      } else {
        // Obtener la primera empresa activa del usuario
        const { data: companyUser } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .single()
        companyId = companyUser?.company_id || null
      }
    }

    console.log(`[AI Context] Company ID: ${companyId}`)

    const sanitizedQuestion = sanitizeQuestion(question)

    // Rate limiting - verificar primero SIN incrementar
    const rateLimitCheck = checkRateLimit(user.id, false)
    if (!rateLimitCheck.allowed) {
      const resetInMinutes = rateLimitCheck.resetAt 
        ? Math.ceil((rateLimitCheck.resetAt - Date.now()) / (60 * 1000))
        : 60
      console.log(`[Rate Limit] Usuario ${user.id} excedió límite. Restantes: 0, Reset en: ${resetInMinutes} min`)
      return NextResponse.json(
        { 
          error: `Has excedido el límite de solicitudes (${rateLimitCheck.limit || 50} por hora). Por favor, intenta nuevamente en ${resetInMinutes} minutos.`,
          rateLimit: {
            limit: rateLimitCheck.limit,
            remaining: 0,
            resetAt: rateLimitCheck.resetAt
          }
        },
        { status: 429 }
      )
    }

    console.log(`[Rate Limit] Usuario ${user.id} - Restantes: ${rateLimitCheck.remaining}/${rateLimitCheck.limit}`)

    // Validar que tenemos companyId antes de continuar
    if (!companyId) {
      console.warn(`[AI Context] No se pudo determinar companyId para usuario ${user.id}`)
      return NextResponse.json(
        { error: 'No se pudo determinar la empresa actual. Por favor, selecciona una empresa en la aplicación.' },
        { status: 400 }
      )
    }

    // Construir contexto de negocio inteligente basado en la pregunta
    let businessContext = ''
    
    try {
      // Contexto específico si viene employeeId o periodId (del parámetro context)
      const specificContext = await buildBusinessContext(supabase, user.id, companyId, context)
      
      // Contexto inteligente basado en la pregunta del usuario (detecta automáticamente qué datos necesita)
      const questionContext = await buildContextFromQuestion(sanitizedQuestion, companyId, supabase)
      
      // Combinar ambos contextos
      businessContext = [specificContext, questionContext].filter(Boolean).join('\n\n')
      
      console.log(`[AI Context] Contexto construido: ${businessContext.length} caracteres`)
      console.log(`[AI Context] Preview: ${businessContext.substring(0, 200)}...`)
    } catch (contextError: any) {
      console.error(`[AI Context] Error al construir contexto:`, contextError)
      // Continuar sin contexto adicional si hay error
    }

    // Construir prompt para Gemini
    const systemPrompt = `Eres un asistente experto de una aplicación de Remuneraciones y RRHH para Chile. 
Tu función es ayudar a los usuarios con consultas relacionadas con:
- Cálculo de liquidaciones de sueldo según normativa chilena
- Gestión de trabajadores, vacaciones, licencias médicas, pactos de horas extra
- Interpretación de datos de remuneraciones
- Consultas sobre períodos de liquidación
- Información sobre trabajadores específicos

INSTRUCCIONES IMPORTANTES:
1. Responde de forma clara, breve y profesional en español.
2. USA SIEMPRE TODA la información del contexto proporcionado. Si hay datos específicos en el contexto (nombres, RUTs, listas), úsalos DIRECTAMENTE en tu respuesta.
3. Si el contexto incluye listas de trabajadores, nombres, RUTs, o datos específicos, inclúyelos TODOS en tu respuesta, no solo algunos.
4. Si el contexto muestra trabajadores con licencia médica, incluye TODOS los trabajadores listados con TODA su información (nombre, RUT, días restantes, fechas, etc.).
5. Si el contexto muestra trabajadores "SIN pacto activo" o "pendientes", lista TODOS esos trabajadores con sus nombres y RUTs.
6. Si el contexto incluye información sobre días restantes, fechas, folios, o cualquier detalle adicional, inclúyelo en tu respuesta.
7. Si no tienes información suficiente en el contexto, indícalo claramente.
8. Si la pregunta es sobre legislación laboral chilena, proporciona información general pero siempre recomienda consultar con un experto legal para casos específicos.
9. Mantén las respuestas concisas pero informativas (máximo 500 palabras).
10. Si se mencionan montos, usa formato chileno con puntos como separador de miles.
11. Cuando el contexto incluya datos estructurados (listas, tablas), presenta TODA la información de forma clara y organizada.
12. CRÍTICO: Si el contexto lista múltiples trabajadores, menciona TODOS, no solo uno o algunos.

${businessContext ? `\n=== DATOS DE LA APLICACIÓN ===\n${businessContext}\n` : ''}

PREGUNTA DEL USUARIO:
${sanitizedQuestion}

IMPORTANTE: Responde usando los datos específicos del contexto proporcionado. Si hay trabajadores listados, nombres, RUTs, o información específica en el contexto, inclúyela en tu respuesta.`

    // Llamar a Gemini - Solo incrementar rate limit si es exitoso
    let geminiResponse
    try {
      console.log(`[Gemini] Llamando a Gemini API para usuario ${user.id}`)
      geminiResponse = await askGemini({
        prompt: systemPrompt,
        temperature: 0.7,
        maxTokens: 1024,
      })
      console.log(`[Gemini] Respuesta exitosa. Tokens: ${geminiResponse.usage?.totalTokens || 'N/A'}`)
      
      // Solo ahora incrementar el rate limit después de éxito
      const finalRateLimit = checkRateLimit(user.id, true)
      console.log(`[Rate Limit] Incrementado. Restantes: ${finalRateLimit.remaining}/${finalRateLimit.limit}`)
    } catch (geminiError: any) {
      console.error(`[Gemini] Error al llamar a Gemini:`, geminiError.message)
      // NO incrementar rate limit si falla la llamada
      throw geminiError
    }

    // Logging opcional (guardar en base de datos si existe la tabla)
    try {
      await supabase.from('ai_queries').insert({
        user_id: user.id,
        company_id: companyId || null,
        question: sanitizedQuestion.substring(0, 500), // Limitar longitud
        answer_preview: geminiResponse.answer.substring(0, 200), // Preview de respuesta
        context_type: context?.employeeId ? 'employee' : context?.periodId ? 'period' : 'general',
        context_id: context?.employeeId || context?.periodId || null,
        tokens_used: geminiResponse.usage?.totalTokens || null,
      })
    } catch (logError) {
      // Si la tabla no existe aún, solo loguear en consola
      console.log('Query registrada:', {
        userId: user.id,
        question: sanitizedQuestion.substring(0, 100),
        tokens: geminiResponse.usage?.totalTokens,
      })
    }

    // Obtener el rate limit final después del incremento
    const finalRateLimit = checkRateLimit(user.id, false)
    
    return NextResponse.json({
      answer: geminiResponse.answer,
      usage: geminiResponse.usage,
      rateLimit: {
        limit: finalRateLimit.limit,
        remaining: finalRateLimit.remaining,
        resetAt: finalRateLimit.resetAt
      }
    })
  } catch (error: any) {
    console.error('Error en /api/ai/ask:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}





