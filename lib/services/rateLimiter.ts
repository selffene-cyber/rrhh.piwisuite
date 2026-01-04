/**
 * Rate Limiter simple en memoria
 * Para producción, considerar usar Redis o base de datos
 */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_REQUESTS = 50 // Máximo de solicitudes por ventana de tiempo
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hora en milisegundos

// Limpiar entradas expiradas periódicamente (cada 5 minutos)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [userId, limit] of rateLimitMap.entries()) {
      if (now > limit.resetAt) {
        rateLimitMap.delete(userId)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitResult {
  allowed: boolean
  remaining?: number
  resetAt?: number
  limit?: number
}

export function checkRateLimit(userId: string, increment: boolean = true): RateLimitResult {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    // Resetear o crear nuevo límite
    if (increment) {
      rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    }
    return { 
      allowed: true, 
      remaining: increment ? RATE_LIMIT_REQUESTS - 1 : RATE_LIMIT_REQUESTS,
      resetAt: now + RATE_LIMIT_WINDOW,
      limit: RATE_LIMIT_REQUESTS
    }
  }

  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return { 
      allowed: false,
      remaining: 0,
      resetAt: userLimit.resetAt,
      limit: RATE_LIMIT_REQUESTS
    }
  }

  if (increment) {
    userLimit.count++
  }
  
  return { 
    allowed: true,
    remaining: RATE_LIMIT_REQUESTS - userLimit.count,
    resetAt: userLimit.resetAt,
    limit: RATE_LIMIT_REQUESTS
  }
}

export function resetRateLimit(userId?: string): void {
  if (userId) {
    rateLimitMap.delete(userId)
  } else {
    // Resetear todos los rate limits
    rateLimitMap.clear()
  }
}

export function getRateLimitInfo(userId: string): RateLimitResult | null {
  const userLimit = rateLimitMap.get(userId)
  if (!userLimit) {
    return null
  }
  
  const now = Date.now()
  if (now > userLimit.resetAt) {
    return null // Expirado
  }
  
  return {
    allowed: userLimit.count < RATE_LIMIT_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_REQUESTS - userLimit.count),
    resetAt: userLimit.resetAt,
    limit: RATE_LIMIT_REQUESTS
  }
}





