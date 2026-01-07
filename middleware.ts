import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { hasSupabasePublicEnv } from '@/lib/supabase/env'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Si Supabase no está configurado en local, redirigir a una página de setup
  // (evita que el middleware crashee y guía al usuario).
  if (!hasSupabasePublicEnv()) {
    if (pathname === '/setup') return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = '/setup'
    return NextResponse.redirect(url)
  }

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/setup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Crear respuesta
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Crear cliente de Supabase para middleware
  const supabase = createMiddlewareClient(request, response)

  // Obtener usuario
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Si hay error de autenticación y no es ruta pública, redirigir a login
  if (authError && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si el usuario está autenticado y está en login, redirigir según tipo de usuario
  if (user && pathname === '/login') {
    try {
      // Verificar si es trabajador
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      const url = request.nextUrl.clone()
      
      // Si es trabajador (tiene registro en employees)
      if (employee && !employeeError) {
        // Es trabajador, verificar si debe cambiar contraseña
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('must_change_password')
          .eq('id', user.id)
          .maybeSingle()

        if (!profileError && profile?.must_change_password === true) {
          url.pathname = '/employee/change-password'
        } else {
          url.pathname = '/employee'
        }
        return NextResponse.redirect(url)
      } else {
        // No es trabajador (o hubo error), es admin/owner, ir al dashboard
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // Si hay error, redirigir al dashboard por defecto
      console.error('Error en middleware al verificar trabajador:', error)
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Si el usuario está autenticado y está en la raíz (/), verificar si es trabajador
  if (user && pathname === '/') {
    try {
      // Verificar si es super_admin (puede ver dashboard)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      // Si es super_admin, permitir acceso al dashboard
      if (profile?.role === 'super_admin' && !profileError) {
        return response
      }

      // Verificar si es trabajador
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      // Si es trabajador, redirigir al portal
      if (employee && !employeeError) {
        const url = request.nextUrl.clone()
        // Verificar si debe cambiar contraseña
        const { data: profileData, error: profileDataError } = await supabase
          .from('user_profiles')
          .select('must_change_password')
          .eq('id', user.id)
          .maybeSingle()

        if (!profileDataError && profileData?.must_change_password === true) {
          url.pathname = '/employee/change-password'
        } else {
          url.pathname = '/employee'
        }
        return NextResponse.redirect(url)
      }
      // Si no es trabajador ni super_admin, permitir acceso al dashboard (puede ser admin/owner)
    } catch (error) {
      console.error('Error en middleware al verificar trabajador en raíz:', error)
      // En caso de error, permitir acceso (fallback seguro)
    }
  }

  // Si no está autenticado y no es ruta pública, redirigir a login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Verificar acceso a rutas de administración
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'super_admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    } catch (profileError) {
      // Si hay error al obtener perfil, permitir acceso pero registrar error
      console.error('Error al verificar perfil en middleware:', profileError)
      // No redirigir para evitar bucles, pero el Layout manejará la UI
    }
  }

  // Excepciones: rutas de PDF que los trabajadores SÍ pueden acceder
  // Estas rutas permiten a los trabajadores ver sus propios documentos PDF
  // IMPORTANTE: Esta verificación debe ir ANTES de las verificaciones de rutas administrativas
  const isPDFRoute = 
    pathname.match(/^\/payroll\/[^/]+\/pdf$/) ||
    pathname.match(/^\/overtime\/[^/]+\/pdf$/) ||
    pathname.match(/^\/contracts\/annex\/[^/]+\/pdf$/) ||
    pathname.match(/^\/employees\/[^/]+\/loans\/[^/]+\/pdf$/) ||
    pathname.match(/^\/employees\/[^/]+\/certificates\/[^/]+\/pdf/)

  // Si es una ruta PDF permitida, permitir acceso inmediatamente (sin verificar si es trabajador)
  // Las rutas PDF tienen su propia validación de permisos en el componente
  if (isPDFRoute && user) {
    return response
  }

  // Verificar que los trabajadores no accedan a rutas administrativas
  // Solo verificar si NO es super_admin para evitar consultas innecesarias
  // EXCEPTO para rutas de PDF que los trabajadores pueden ver (ya manejadas arriba)
  if (user && !isPDFRoute && (pathname.startsWith('/employees') || pathname.startsWith('/contracts') || pathname.startsWith('/vacations') || pathname.startsWith('/permissions') || pathname.startsWith('/certificates') || pathname.startsWith('/payroll') || pathname.startsWith('/advances') || pathname.startsWith('/loans') || pathname.startsWith('/overtime') || pathname.startsWith('/settlements') || pathname.startsWith('/disciplinary-actions') || pathname.startsWith('/organigrama') || pathname.startsWith('/departments') || pathname.startsWith('/reports') || pathname.startsWith('/documents') || pathname.startsWith('/settings'))) {
    try {
      // Primero verificar si es super_admin (puede acceder a todo)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Si es super_admin, permitir acceso inmediatamente sin más verificaciones
      if (profile?.role === 'super_admin') {
        // Continuar normalmente - permitir acceso
        return response
      }

      // Si hay error al obtener perfil, permitir acceso (fallback seguro)
      if (profileError) {
        console.warn('Error al obtener perfil en middleware, permitiendo acceso:', profileError)
        return response
      }

      // Si no es super_admin, verificar si es trabajador
      if (profile?.role !== 'super_admin') {
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        // Solo redirigir si es trabajador (tiene registro en employees) Y no es super_admin
        if (employee && !employeeError) {
          // Es trabajador intentando acceder a ruta admin, redirigir al portal
          const url = request.nextUrl.clone()
          // Verificar si debe cambiar contraseña
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('must_change_password')
            .eq('id', user.id)
            .single()

          if (profileData?.must_change_password === true) {
            url.pathname = '/employee/change-password'
          } else {
            url.pathname = '/employee'
          }
          return NextResponse.redirect(url)
        }
      }
      // Si no es trabajador, permitir acceso (fallback seguro)
    } catch (error) {
      // Si hay error, permitir acceso (fallback seguro para evitar bloqueos)
      console.error('Error al verificar empleado en middleware:', error)
      // No bloquear el acceso en caso de error
    }
  }

  // Verificar acceso a rutas del portal de trabajadores (/employee/*)
  if (pathname.startsWith('/employee')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    try {
      // Verificar si el usuario está vinculado a un empleado
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!employee || employeeError) {
        // No es trabajador, redirigir al dashboard admin
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      // Si es trabajador y está en /employee/change-password, verificar que debe cambiar contraseña
      if (pathname === '/employee/change-password') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('must_change_password')
          .eq('id', user.id)
          .single()

        // Si ya cambió la contraseña, redirigir al portal
        if (profile?.must_change_password !== true) {
          const url = request.nextUrl.clone()
          url.pathname = '/employee'
          return NextResponse.redirect(url)
        }
      } else {
        // Si está en otra ruta /employee/* y debe cambiar contraseña, redirigir
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('must_change_password')
          .eq('id', user.id)
          .single()

        if (profile?.must_change_password === true) {
          const url = request.nextUrl.clone()
          url.pathname = '/employee/change-password'
          return NextResponse.redirect(url)
        }
      }
    } catch (error) {
      console.error('Error al verificar empleado en middleware:', error)
      // En caso de error, redirigir a login para seguridad
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|__nextjs|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
