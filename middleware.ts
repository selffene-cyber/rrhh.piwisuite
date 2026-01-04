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
  let response = NextResponse.next({
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

  // Si el usuario está autenticado y está en login, redirigir al dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
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

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|__nextjs|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
