export type SupabasePublicEnv = {
  url: string
  anonKey: string
}

/**
 * Lee variables públicas de Supabase.
 *
 * Importante: NO lanzar errores en tiempo de import, para que `npm run dev`
 * pueda levantar aunque falte `.env.local`.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function hasSupabasePublicEnv(): boolean {
  return !!getSupabasePublicEnv()
}

export function assertSupabasePublicEnv(): SupabasePublicEnv {
  const env = getSupabasePublicEnv()
  if (!env) {
    throw new Error(
      'Faltan variables de entorno de Supabase. Crea `.env.local` (o copia `env.example`) y define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
  return env
}


