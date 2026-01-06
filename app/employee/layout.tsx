'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { FaHome, FaFileAlt, FaListAlt, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa'
import './employee-portal.css'

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

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Verificar que es trabajador
      const { data: emp } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .single()

      if (!emp) {
        // No es trabajador, redirigir
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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6'
      }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!employee) {
    return null
  }

  return (
    <div className="employee-portal-container" style={{
      minHeight: '100vh',
      paddingBottom: '80px' // Espacio para navegación inferior
    }}>
      {/* Header */}
      <header className="employee-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: 'white'
            }}>
              Buen día, {employee.full_name?.split(' ')[0] || 'Trabajador'} 👋
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="logout-button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSignOutAlt /> Salir
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main style={{ padding: '20px' }}>
        {children}
      </main>

      {/* Navegación inferior */}
      <nav className="employee-bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        zIndex: 100
      }}>
        <Link
          href="/employee"
          className={pathname === '/employee' ? 'active' : ''}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: pathname === '/employee' ? '#4F46E5' : '#6b7280',
            fontSize: '12px',
            gap: '4px'
          }}
        >
          <FaHome style={{ fontSize: '22px' }} />
          <span>Inicio</span>
        </Link>
        <Link
          href="/employee/requests"
          className={pathname === '/employee/requests' ? 'active' : ''}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: pathname === '/employee/requests' ? '#4F46E5' : '#6b7280',
            fontSize: '12px',
            gap: '4px'
          }}
        >
          <FaListAlt style={{ fontSize: '22px' }} />
          <span>Solicitudes</span>
        </Link>
        <Link
          href="/employee/compliance"
          className={pathname === '/employee/compliance' ? 'active' : ''}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: pathname === '/employee/compliance' ? '#4F46E5' : '#6b7280',
            fontSize: '12px',
            gap: '4px'
          }}
        >
          <FaShieldAlt style={{ fontSize: '22px' }} />
          <span>Cumplimiento</span>
        </Link>
        <Link
          href="/employee/documents"
          className={pathname === '/employee/documents' ? 'active' : ''}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: pathname === '/employee/documents' ? '#4F46E5' : '#6b7280',
            fontSize: '12px',
            gap: '4px'
          }}
        >
          <FaFileAlt style={{ fontSize: '22px' }} />
          <span>Documentos</span>
        </Link>
      </nav>
    </div>
  )
}

