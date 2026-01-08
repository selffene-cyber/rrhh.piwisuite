import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API para crear usuario automáticamente cuando se crea un trabajador
 * Crea usuario con contraseña inicial "colaborador1" y marca must_change_password = true
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar que el usuario esté autenticado y sea admin/owner
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar permisos (solo admin/owner pueden crear trabajadores)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'

    const body = await request.json()
    const { email, employee_id } = body

    if (!email || !employee_id) {
      return NextResponse.json({ 
        error: 'Email y employee_id son requeridos' 
      }, { status: 400 })
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Email inválido' 
      }, { status: 400 })
    }

    // Verificar que el empleado existe y obtener sus datos
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, company_id, full_name')
      .eq('id', employee_id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ 
        error: 'Empleado no encontrado' 
      }, { status: 404 })
    }

    // Si no es super admin, verificar que el empleado pertenece a una empresa del usuario
    if (!isSuperAdmin) {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('company_id', employee.company_id)
        .eq('status', 'active')
        .single()

      if (!companyUser) {
        return NextResponse.json({ 
          error: 'No autorizado para crear usuario para este empleado' 
        }, { status: 403 })
      }
    }

    // Verificar que el email no esté ya en uso
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Este email ya está registrado en el sistema' 
      }, { status: 400 })
    }

    // Verificar que el empleado no tenga ya un usuario asociado
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', employee_id)
      .single()

    if (existingEmployee?.user_id) {
      return NextResponse.json({ 
        error: 'Este empleado ya tiene un usuario asociado' 
      }, { status: 400 })
    }

    // Usar service_role key para crear usuarios
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Service role key no configurada. Contacte al administrador.' 
      }, { status: 500 })
    }

    // Crear cliente admin
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

    // Contraseña inicial estándar para todos los trabajadores
    const initialPassword = 'colaborador1'

    // Crear usuario con email confirmado
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true, // No requiere verificación de email
      user_metadata: {
        is_employee: true,
        full_name: employee.full_name || '',
        default_company_id: employee.company_id,
      },
    })

    if (authError) {
      console.error('Error al crear usuario:', authError)
      return NextResponse.json({ 
        error: authError.message || 'Error al crear usuario' 
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ 
        error: 'No se pudo crear el usuario' 
      }, { status: 500 })
    }

    // Crear/actualizar perfil de usuario usando adminClient para evitar problemas de RLS
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        role: 'user', // Trabajadores tienen rol 'user' por defecto
        full_name: employee.full_name || '',
        default_company_id: employee.company_id,
        must_change_password: true, // Debe cambiar contraseña en primer login
        password_changed_at: null,
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Error al crear perfil:', profileError)
      // Intentar eliminar el usuario creado si falla la creación del perfil
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ 
        error: 'Error al crear perfil de usuario: ' + profileError.message 
      }, { status: 500 })
    }

    // Vincular usuario al empleado usando adminClient para evitar problemas de RLS
    const { error: linkError } = await adminClient
      .from('employees')
      .update({
        user_id: authData.user.id,
        email: email,
      })
      .eq('id', employee_id)

    if (linkError) {
      console.error('Error al vincular usuario al empleado:', linkError)
      // Intentar limpiar: eliminar usuario y perfil usando adminClient
      await adminClient.auth.admin.deleteUser(authData.user.id)
      await adminClient
        .from('user_profiles')
        .delete()
        .eq('id', authData.user.id)
      return NextResponse.json({ 
        error: 'Error al vincular usuario al empleado: ' + linkError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user_id: authData.user.id,
      message: 'Usuario creado exitosamente. El trabajador debe cambiar su contraseña en el primer login.' 
    })
  } catch (error: any) {
    console.error('Error al crear usuario para trabajador:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al crear usuario' 
    }, { status: 500 })
  }
}

