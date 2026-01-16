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
        // Verificar si también es admin/owner en alguna empresa
        const { data: companyUsers, error: companyUserError } = await supabase
          .from('company_users')
          .select('role, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .in('role', ['admin', 'owner', 'executive'])

        console.log('[Middleware /login] Usuario es empleado, verificando si es admin/owner:', {
          userId: user.id,
          companyUsers,
          companyUserError,
          isAdminOwner: companyUsers && companyUsers.length > 0
        })

        // Si es admin/owner, ir al dashboard
        if (companyUsers && companyUsers.length > 0 && !companyUserError) {
          console.log('[Middleware /login] Usuario es admin/owner, redirigiendo al dashboard')
          url.pathname = '/'
          return NextResponse.redirect(url)
        }

        // Si NO es admin/owner, es trabajador, verificar si debe cambiar contraseña
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

      // Si es trabajador, verificar si también es admin/owner
      if (employee && !employeeError) {
        // Verificar si tiene rol de admin/owner en alguna empresa activa
        const { data: companyUsers, error: companyUserError } = await supabase
          .from('company_users')
          .select('role, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .in('role', ['admin', 'owner', 'executive'])

        console.log('[Middleware /] Usuario es empleado, verificando si es admin/owner:', {
          userId: user.id,
          companyUsers,
          companyUserError,
          isAdminOwner: companyUsers && companyUsers.length > 0
        })

        // Solo redirigir al portal si NO es admin/owner
        if (!companyUsers || companyUsers.length === 0 || companyUserError) {
          console.log('[Middleware /] Usuario NO es admin/owner, redirigiendo al portal empleado')
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
        // Si es admin/owner, permitir acceso al dashboard
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

      // Rutas exclusivas de super_admin
      const superAdminOnlyRoutes = ['/admin/companies', '/admin/users']
      const isSuperAdminOnlyRoute = superAdminOnlyRoutes.some(route => pathname.startsWith(route))

      // Si es ruta exclusiva de super_admin, verificar que lo sea
      if (isSuperAdminOnlyRoute && profile?.role !== 'super_admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      // Para otras rutas /admin (como /admin/cost-centers, /admin/departments)
      // Permitir acceso a super_admin o a admin/owner de alguna empresa
      if (!isSuperAdminOnlyRoute && profile?.role !== 'super_admin') {
        // Verificar si es admin/owner en alguna empresa
        const { data: companyUsers, error: companyUserError } = await supabase
          .from('company_users')
          .select('role, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .in('role', ['admin', 'owner', 'executive'])

        console.log('[Middleware /admin] Verificando permisos para ruta /admin:', {
          userId: user.id,
          pathname,
          isSuperAdminOnlyRoute,
          companyUsers,
          companyUserError,
          isAdminOwner: companyUsers && companyUsers.length > 0
        })

        // Si no es admin/owner, redirigir al dashboard
        if (!companyUsers || companyUsers.length === 0 || companyUserError) {
          console.log('[Middleware /admin] Usuario NO es admin/owner, redirigiendo al dashboard')
          const url = request.nextUrl.clone()
          url.pathname = '/'
          return NextResponse.redirect(url)
        }
        console.log('[Middleware /admin] Usuario ES admin/owner, permitiendo acceso')
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
    pathname.match(/^\/employees\/[^/]+\/certificates\/[^/]+\/pdf/) ||
    pathname.match(/^\/employees\/[^/]+\/vacations\/[^/]+\/pdf$/)

  // Si es una ruta PDF permitida, permitir acceso inmediatamente (sin verificar si es trabajador)
  // Las rutas PDF tienen su propia validación de permisos en el componente
  if (isPDFRoute && user) {
    return response
  }

  // Verificar que los trabajadores no accedan a rutas administrativas
  // Solo verificar si NO es super_admin para evitar consultas innecesarias
  // EXCEPTO para rutas de PDF que los trabajadores pueden ver (ya manejadas arriba)
  if (user && !isPDFRoute && (pathname.startsWith('/employees') || pathname.startsWith('/contracts') || pathname.startsWith('/vacations') || pathname.startsWith('/permissions') || pathname.startsWith('/certificates') || pathname.startsWith('/payroll') || pathname.startsWith('/advances') || pathname.startsWith('/loans') || pathname.startsWith('/overtime') || pathname.startsWith('/settlements') || pathname.startsWith('/disciplinary-actions') || pathname.startsWith('/organigrama') || pathname.startsWith('/departments') || pathname.startsWith('/reports') || pathname.startsWith('/documents') || pathname.startsWith('/settings'))) {
    console.log('[Middleware rutas admin] Verificando acceso a ruta administrativa:', pathname)
    try {
      // Primero verificar si es super_admin (puede acceder a todo)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('[Middleware rutas admin] Perfil de usuario:', { userId: user.id, role: profile?.role, profileError })

      // Si es super_admin, permitir acceso inmediatamente sin más verificaciones
      if (profile?.role === 'super_admin') {
        console.log('[Middleware rutas admin] Usuario es super_admin, permitiendo acceso')
        // Continuar normalmente - permitir acceso
        return response
      }

      // Si hay error al obtener perfil, permitir acceso (fallback seguro)
      if (profileError) {
        console.warn('Error al obtener perfil en middleware, permitiendo acceso:', profileError)
        return response
      }

      // Si no es super_admin, verificar primero si es admin/owner
      if (profile?.role !== 'super_admin') {
        console.log('[Middleware rutas admin] Usuario NO es super_admin, verificando permisos...')
        
        // Primero verificar si es admin/owner en alguna empresa (esto permite el acceso)
        const { data: companyUsers, error: companyUserError } = await supabase
          .from('company_users')
          .select('role, status, company_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .in('role', ['admin', 'owner', 'executive'])

        // Diferenciar entre admin/owner y executive
        const isAdminOrOwner = companyUsers?.some(cu => cu.role === 'admin' || cu.role === 'owner')
        const isExecutive = companyUsers?.some(cu => cu.role === 'executive')
        const userRole = companyUsers?.[0]?.role || 'none'

        console.log('[Middleware rutas admin] Verificando permisos de usuario:', {
          userId: user.id,
          pathname,
          userRole,
          isAdminOrOwner,
          isExecutive,
          hasCompanyUsers: companyUsers && companyUsers.length > 0
        })

        // Si es admin/owner, permitir acceso inmediatamente
        if (isAdminOrOwner) {
          console.log(`[Middleware rutas admin] Usuario admin/owner, permitiendo acceso a ruta:`, pathname)
          return response
        }

        // Si es executive, verificar permisos granulares
        if (isExecutive) {
          console.log('[Middleware rutas admin] Usuario executive, verificando permisos granulares...')
          
          // Obtener companyId del usuario
          const companyId = companyUsers?.[0]?.company_id
          
          // Cargar permisos del usuario
          const { data: permissions, error: permissionsError } = await supabase
            .from('user_permissions')
            .select('*')
            .eq('user_id', user.id)
            .eq('company_id', companyId)
            .maybeSingle()

          console.log('[Middleware rutas admin] Permisos del usuario:', { permissions, permissionsError })

          // Mapeo de rutas a permisos requeridos
          const routePermissions: Record<string, (p: any) => boolean> = {
            '/payroll': (p) => p.can_create_payroll || p.can_approve_payroll,
            '/contracts': (p) => p.can_view_contracts || p.can_create_contracts || p.can_approve_contracts,
            '/advances': (p) => p.can_create_advances || p.can_approve_advances,
            '/settlements': (p) => p.can_create_settlements || p.can_approve_settlements,
            '/permissions': (p) => p.can_create_permissions || p.can_approve_permissions,
            '/vacations': (p) => p.can_create_vacations || p.can_approve_vacations,
            '/certificates': (p) => p.can_create_certificates || p.can_approve_certificates,
            '/disciplinary-actions': (p) => p.can_create_disciplinary || p.can_approve_disciplinary,
            '/compliance': (p) => p.can_view_compliance || p.can_create_compliance,
            '/raat': (p) => p.can_view_raat || p.can_create_raat,
            '/documents': (p) => p.can_view_documents || p.can_upload_documents,
            '/departments': (p) => p.can_view_departments || p.can_create_departments,
            '/cost-centers': (p) => p.can_view_cost_centers || p.can_create_cost_centers,
            '/org-chart': (p) => p.can_view_org_chart || p.can_edit_org_chart,
            '/loans': (p) => p.can_view_loans || p.can_create_loans,
            '/settings': (p) => p.can_edit_company_settings,
            '/settings/indicators': (p) => p.can_manage_indicators,
            '/settings/signatures': (p) => p.can_manage_signatures,
            '/settings/tax-brackets': (p) => p.can_manage_tax_brackets,
            '/settings/usuarios-roles': (p) => p.can_manage_users_roles,
          }

          // Verificar si la ruta requiere permisos específicos
          const permissionCheck = routePermissions[pathname]
          
          if (permissionCheck && permissions) {
            const hasPermission = permissionCheck(permissions)
            console.log('[Middleware rutas admin] Resultado verificación permiso:', { pathname, hasPermission })
            
            if (!hasPermission) {
              console.log('[Middleware rutas admin] Usuario executive SIN PERMISO para:', pathname)
              const url = request.nextUrl.clone()
              url.pathname = '/'
              url.searchParams.set('error', 'no_permission')
              return NextResponse.redirect(url)
            }
          }

          console.log(`[Middleware rutas admin] Usuario executive con permiso, permitiendo acceso a:`, pathname)
          return response
        }

        // Si no tiene ningún rol administrativo, continuar con verificación de empleado
        if (!companyUsers || companyUsers.length === 0 || companyUserError) {
          console.log('[Middleware rutas admin] Usuario sin rol administrativo')
        }

        // Si NO es admin/owner, verificar si es trabajador (y redirigir al portal)
        console.log('[Middleware rutas admin] Usuario NO es admin/owner, verificando si es empleado...')
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        
        console.log('[Middleware rutas admin] Resultado consulta employees:', { employee, employeeError })

        // Si es trabajador pero NO es admin/owner, redirigir al portal del trabajador
        if (employee && !employeeError) {
          console.log('[Middleware rutas admin] Usuario es empleado sin permisos admin, redirigiendo al portal empleado')
          // Es trabajador sin permisos administrativos, redirigir al portal
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
        
        // Si no es admin/owner ni empleado, bloquear acceso (redirigir al dashboard)
        console.log('[Middleware rutas admin] Usuario NO tiene permisos, redirigiendo al dashboard')
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
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
