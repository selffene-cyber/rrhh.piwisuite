import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Para Server Components (usa cookies de next/headers)
// Esta función SOLO debe usarse en Server Components
export async function createServerClient() {
  try {
    // Importación dinámica para evitar problemas en build
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()
    
    return createSupabaseServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Las cookies no se pueden establecer en Server Components
              // Esto está bien, la sesión se mantendrá en el cliente
            }
          },
        },
      }
    )
  } catch (error) {
    // Si no hay contexto de solicitud (build, pre-render, etc.)
    // Crear un cliente sin cookies (solo lectura)
    console.warn('createServerClient: No hay contexto de solicitud, usando cliente sin cookies')
    return createSupabaseServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No hacer nada si no hay contexto de solicitud
          },
        },
      }
    )
  }
}

