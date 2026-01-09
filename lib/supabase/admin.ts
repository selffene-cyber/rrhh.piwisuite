import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Cliente de Supabase con service_role para operaciones administrativas
 * que necesitan bypassear RLS (Row Level Security)
 * 
 * ⚠️ USAR CON PRECAUCIÓN: Este cliente tiene acceso completo a la base de datos
 * Solo usar en API routes del servidor, nunca exponer al cliente
 */
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)






