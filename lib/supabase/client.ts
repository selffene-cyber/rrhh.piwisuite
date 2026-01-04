import { createBrowserClient } from '@supabase/ssr'
import { assertSupabasePublicEnv, getSupabasePublicEnv } from './env'

function createMissingEnvProxy(): any {
  const message =
    'Supabase no está configurado. Crea `.env.local` (o copia `env.example`) y define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'

  return new Proxy(
    {},
    {
      get() {
        throw new Error(message)
      },
    }
  )
}

/**
 * Cliente de Supabase para el navegador.
 *
 * Nota: si faltan variables de entorno, devolvemos un Proxy para evitar que
 * la app falle en tiempo de import (y permitir que `npm run dev` levante).
 */
export const supabase = (() => {
  const env = getSupabasePublicEnv()
  if (!env) return createMissingEnvProxy()
  // Validación con error más claro (por si alguien lo usa en runtime y env cambió)
  const { url, anonKey } = assertSupabasePublicEnv()
  return createBrowserClient(url, anonKey)
})()


