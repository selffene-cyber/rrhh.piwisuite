'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { FaHome, FaUsers, FaFileInvoiceDollar, FaCog, FaUserShield, FaBell, FaSearch, FaBars, FaTimes, FaMoneyBillWave, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import AlertFab from './AlertFab'
import './Layout.css'

// Componente de icono de pingüino en estilo de líneas
const PenguinIcon = ({ size = 32 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    {/* Cuerpo del pingüino */}
    <ellipse cx="32" cy="42" rx="18" ry="20" stroke="white" strokeWidth="2.5" fill="none"/>
    {/* Cabeza */}
    <ellipse cx="32" cy="18" rx="14" ry="16" stroke="white" strokeWidth="2.5" fill="none"/>
    {/* Barriga blanca */}
    <ellipse cx="32" cy="38" rx="10" ry="14" stroke="white" strokeWidth="2" fill="none" opacity="0.6"/>
    {/* Ojo izquierdo */}
    <circle cx="28" cy="16" r="2.5" fill="white"/>
    {/* Ojo derecho */}
    <circle cx="36" cy="16" r="2.5" fill="white"/>
    {/* Pico */}
    <path d="M 32 20 L 28 24 L 32 24 Z" fill="white" stroke="white" strokeWidth="1.5"/>
    {/* Ala izquierda */}
    <ellipse cx="20" cy="38" rx="6" ry="12" stroke="white" strokeWidth="2" fill="none"/>
    {/* Ala derecha */}
    <ellipse cx="44" cy="38" rx="6" ry="12" stroke="white" strokeWidth="2" fill="none"/>
    {/* Pie izquierdo */}
    <ellipse cx="26" cy="58" rx="4" ry="3" fill="white"/>
    {/* Pie derecho */}
    <ellipse cx="38" cy="58" rx="4" ry="3" fill="white"/>
  </svg>
)

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [remuneracionesOpen, setRemuneracionesOpen] = useState(false)
  const hasLoaded = useRef(false)

  // Si estamos en login, no hacer nada - SALIR INMEDIATAMENTE
  if (pathname === '/login') {
    return <>{children}</>
  }

  useEffect(() => {
    // Prevenir múltiples cargas
    if (hasLoaded.current) {
      return
    }

    hasLoaded.current = true
    loadUser()
    
    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUser()
      } else {
        setUser(null)
        setUserProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Sin dependencias para que solo se ejecute una vez

  const loadUser = async () => {
    if (pathname === '/login') {
      setLoading(false)
      return
    }

    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error al obtener usuario:', userError)
        setLoading(false)
        return
      }
      
      if (currentUser) {
        setUser(currentUser)
        
        // Intentar obtener el perfil
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()
        
        if (profileError) {
          console.error('Error al obtener perfil:', profileError)
          // No crear perfil automáticamente aquí, dejar que se cree desde el trigger
        } else {
          setUserProfile(profile)
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Verificar si estamos en una página de remuneraciones para mantener abierto el submenú
  useEffect(() => {
    if (pathname?.startsWith('/payroll') || pathname?.startsWith('/advances')) {
      setRemuneracionesOpen(true)
    }
  }, [pathname])

  const navItems: Array<{
    href?: string
    label: string
    icon: any
    subItems?: Array<{ href: string; label: string; icon: any }>
  }> = [
    { href: '/', label: 'Inicio', icon: FaHome },
    { href: '/employees', label: 'Trabajadores', icon: FaUsers },
    {
      label: 'Remuneraciones',
      icon: FaMoneyBillWave,
      subItems: [
        { href: '/advances', label: 'Anticipos', icon: FaMoneyBillWave },
        { href: '/payroll', label: 'Liquidaciones', icon: FaFileInvoiceDollar },
      ]
    },
    { href: '/settings', label: 'Configuración', icon: FaCog },
  ]

  // Agregar link de administración si es super admin
  if (userProfile?.role === 'super_admin') {
    navItems.push({ href: '/admin/users', label: 'Usuarios', icon: FaUserShield })
  }

  // Verificar si estamos en una subpágina de settings o admin
  const isSettingsPage = pathname?.startsWith('/settings')
  const isAdminPage = pathname?.startsWith('/admin')

  if (loading) {
    return (
      <div className="layout">
        <main className="main-content">
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
        </main>
      </div>
    )
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="layout-modern">
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon-collapsed">
            <PenguinIcon size={32} />
          </div>
          <div className="logo-expanded">
            <div className="logo-title">Sistema de Remuneración</div>
            <div className="logo-subtitle">by Piwi Suite</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            
            // Si tiene subitems, renderizar como menú desplegable
            if (item.subItems) {
              const isParentActive = item.subItems.some(subItem => 
                pathname === subItem.href || pathname?.startsWith(subItem.href + '/')
              )
              
              return (
                <div key={item.label} className="sidebar-nav-group">
                  <button
                    className={`sidebar-nav-item ${isParentActive ? 'active' : ''}`}
                    onClick={() => setRemuneracionesOpen(!remuneracionesOpen)}
                    title={item.label}
                  >
                    <Icon size={20} />
                    <span className="sidebar-nav-label">{item.label}</span>
                    {remuneracionesOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                  </button>
                  {remuneracionesOpen && (
                    <div className="sidebar-nav-subitems">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = pathname === subItem.href || pathname?.startsWith(subItem.href + '/')
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={`sidebar-nav-item sidebar-nav-subitem ${isSubActive ? 'active' : ''}`}
                            title={subItem.label}
                            onClick={closeMobileMenu}
                          >
                            <SubIcon size={16} />
                            <span className="sidebar-nav-label">{subItem.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }
            
            // Item normal sin subitems
            const isActive = pathname === item.href || 
              (item.href === '/settings' && isSettingsPage) ||
              (item.href === '/admin/users' && isAdminPage)
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                title={item.label}
                onClick={closeMobileMenu}
              >
                <Icon size={20} />
                <span className="sidebar-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="layout-main">
        {/* Header */}
        <header className="header-modern">
          <div className="header-left">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="search-input"
              />
            </div>
          </div>
          <div className="header-right">
            <button className="icon-button" title="Notificaciones">
              <FaBell size={18} />
            </button>
            {user && (
              <div className="user-profile">
                <div className="user-avatar">
                  {(userProfile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{userProfile?.full_name || user.email}</div>
                  <div className="user-email">{user.email}</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="logout-button"
                  title="Cerrar Sesión"
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content-modern">
          {children}
        </main>

        {/* Alert Fab - Botón flotante de alertas */}
        <AlertFab />
      </div>
    </div>
  )
}
