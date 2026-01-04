import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { assertSupabasePublicEnv } from './env'

// Para API Routes (usa cookies de request)
export function createServerClientForAPI(request: NextRequest) {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = assertSupabasePublicEnv()

  return createSupabaseServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Las cookies se establecerán mediante los headers de respuesta
          // No podemos establecerlas directamente aquí
        },
      },
    }
  )
}

