'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { FaHome, FaFileAlt, FaListAlt, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa'
import PWAUpdateBanner from '@/components/PWAUpdateBanner'
import './employee-portal-tailwind.css'

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  // Inicializar Preline UI solo en el cliente (después del mount)
  useEffect(() => {
    // Solo ejecutar en el cliente, no en SSR
    if (typeof window === 'undefined') return
    
    // Cargar Preline dinámicamente solo en el cliente
    const initPreline = async () => {
      try {
        // Usar import dinámico para evitar SSR
        await import('preline/preline')
        // Esperar un momento para que Preline se inicialice
        setTimeout(() => {
          if (typeof window !== 'undefined' && (window as any).HSStaticMethods) {
            (window as any).HSStaticMethods.autoInit()
          }
        }, 100)
      } catch (err) {
        // Silenciar errores de Preline en desarrollo
        console.warn('Preline no disponible:', err)
      }
    }
    
    initPreline()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: emp } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .single()

      if (!emp) {
        router.push('/')
        return
      }

      setEmployee(emp)
    } catch (error) {
      console.error('Error al verificar autenticación:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="employee-portal-wrapper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-sky-200 border-t-sky-500 mb-4"></div>
          <p className="text-gray-600 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return null
  }

  const firstName = employee.full_name?.split(' ')[0] || 'Trabajador'
  const initials = employee.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="employee-portal-isolated min-h-screen bg-gray-50 pb-20">
      {/* Header con Preline UI */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 border-b border-blue-400 sticky top-0 z-50 shadow-sm">
        <div className="px-5 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-white m-0">
                Buen día, {firstName}
              </h1>
              <p className="text-xs text-white/80 m-0">{employee.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:bg-white/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              <FaSignOutAlt className="text-xs" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="px-5 py-6 max-w-2xl mx-auto">
        {children}
      </main>

      {/* Banner de Actualización PWA */}
      <PWAUpdateBanner />

      {/* Navegación inferior con Preline UI */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-4 gap-0">
            <Link
              href="/employee"
              className={`flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
                pathname === '/employee'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <FaHome className="text-lg" />
              <span>Inicio</span>
            </Link>
            <Link
              href="/employee/requests"
              className={`flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
                pathname === '/employee/requests'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <FaListAlt className="text-lg" />
              <span>Solicitudes</span>
            </Link>
            <Link
              href="/employee/compliance"
              className={`flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
                pathname === '/employee/compliance'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <FaShieldAlt className="text-lg" />
              <span>Cumplimiento</span>
            </Link>
            <Link
              href="/employee/documents"
              className={`flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
                pathname === '/employee/documents'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <FaFileAlt className="text-lg" />
              <span>Documentos</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}
