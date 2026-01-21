import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar que el usuario esté autenticado y sea super admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Permitir a super_admin, admin y owner crear usuarios
    if (!['super_admin', 'admin', 'owner'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'No autorizado. Solo super_admin, admin y owner pueden crear usuarios.' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, role } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    // Usar service_role key para crear usuarios (solo desde el servidor)
    // NOTA: Esta key debe estar en las variables de entorno del servidor
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      // Si no hay service_role key, usar el método normal (requiere verificación de email)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name || '',
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rrhh.piwisuite.cl'}/login`,
        },
      })

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }

      // Actualizar perfil si el usuario se creó
      if (authData.user) {
        await supabase
          .from('user_profiles')
          .update({
            role: role || 'user',
            full_name: full_name || null,
          })
          .eq('id', authData.user.id)
      }

      return NextResponse.json({ 
        success: true, 
        user: authData.user,
        message: 'Usuario creado. Debe verificar su email.' 
      })
    }

    // Si hay service_role key, usar admin API
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Actualizar perfil
    if (authData.user) {
      await supabase
        .from('user_profiles')
        .update({
          role: role || 'user',
          full_name: full_name || null,
        })
        .eq('id', authData.user.id)
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json({ error: error.message || 'Error al crear usuario' }, { status: 500 })
  }
}


