import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { assertSupabasePublicEnv } from './env'

export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = assertSupabasePublicEnv()

  return createSupabaseServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
}

