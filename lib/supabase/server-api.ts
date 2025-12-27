import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Para API Routes (usa cookies de request)
export function createServerClientForAPI(request: NextRequest) {
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

