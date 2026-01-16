'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { FaHome, FaUsers, FaFileInvoiceDollar, FaCog, FaUserShield, FaBell, FaSearch, FaBars, FaTimes, FaMoneyBillWave, FaChevronDown, FaChevronUp, FaArrowLeft, FaFileContract, FaUmbrellaBeach, FaCalendarCheck, FaExclamationTriangle, FaFolderOpen, FaHandHoldingUsd, FaFileAlt, FaClock, FaChartBar, FaRobot, FaSitemap, FaProjectDiagram, FaBuilding, FaShieldAlt, FaExclamationCircle } from 'react-icons/fa'
import AlertFab from './AlertFab'
import CompanySelector from './CompanySelector'
import AIChatWidget from './AIChatWidget'
import NotificationsDropdown from './NotificationsDropdown'
import './Layout.css'

// Componente de icono de pingüino usando imagen
const PenguinIcon = ({ size = 32 }: { size?: number }) => (
  <img
    src="/pinguino-icon.png"
    alt="PiwiSuite"
    width={size}
    height={size}
    style={{
      display: 'block',
      objectFit: 'contain',
      filter: 'brightness(0) invert(1)', // Hace la imagen blanca para que contraste con el fondo azul
    }}
  />
)

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [remuneracionesOpen, setRemuneracionesOpen] = useState(false)
  const [trabajadoresOpen, setTrabajadoresOpen] = useState(false)
  const [organizacionOpen, setOrganizacionOpen] = useState(false)
  const [gestionPersonasOpen, setGestionPersonasOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const hasLoaded = useRef(false)

  useEffect(() => {
    // Si estamos en login, no hacer nada
    if (pathname === '/login') {
      setLoading(false)
      return
    }
    // Prevenir múltiples cargas
    if (hasLoaded.current) {
      return
    }

    hasLoaded.current = true
    loadUser()
    
    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
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
    if (pathname?.startsWith('/payroll') || pathname?.startsWith('/advances') || pathname?.startsWith('/loans')) {
      setRemuneracionesOpen(true)
    }
    // Verificar si estamos en una página de trabajadores para mantener abierto el submenú
    if (pathname?.startsWith('/employees') || pathname?.startsWith('/contracts') || pathname?.startsWith('/vacations') || pathname?.startsWith('/permissions') || pathname?.startsWith('/certificates') || pathname?.startsWith('/disciplinary-actions') ||
        pathname?.startsWith('/contracts') ||
        pathname?.startsWith('/vacations') || 
        pathname?.startsWith('/permissions') || 
        pathname?.startsWith('/disciplinary-actions') ||
        pathname?.startsWith('/certificates')) {
      setTrabajadoresOpen(true)
    }
    // Verificar si estamos en una página de organización para mantener abierto el submenú
    if (pathname?.startsWith('/organigrama') || pathname?.startsWith('/reports') || pathname?.startsWith('/admin/departments') || pathname?.startsWith('/departments/chart')) {
      setOrganizacionOpen(true)
    }
    // Verificar si estamos en una página de gestión de personas para mantener abierto el submenú
    if (pathname?.startsWith('/compliance') || pathname?.startsWith('/raat')) {
      setGestionPersonasOpen(true)
    }
    // Verificar si estamos en una página de settings para mantener abierto el submenú
    if (pathname?.startsWith('/settings')) {
      setSettingsOpen(true)
    }
  }, [pathname])

  // Si estamos en login o en rutas de empleado (portal trabajador), no renderizar el Layout (después de todos los hooks)
  // Nota: /employee/* es el portal del trabajador, /employees/* es la vista admin
  // Verificar que sea /employee (singular) pero NO /employees (plural)
  const isEmployeePortal = pathname && !pathname.startsWith('/employees') && (
    pathname === '/employee' || pathname.startsWith('/employee/')
  )
  
  // Excluir rutas de PDF del Layout (mostrar solo el PDF)
  const isPDFRoute = pathname?.includes('/pdf')
  
  if (pathname === '/login' || isEmployeePortal || isPDFRoute) {
    return <>{children}</>
  }

  const navItems: Array<{
    href?: string
    label: string
    icon: any
    subItems?: Array<{ href: string; label: string; icon: any }>
    openState?: boolean
    setOpenState?: (open: boolean) => void
  }> = [
    { href: '/', label: 'Inicio', icon: FaHome },
    {
      label: 'Trabajadores',
      icon: FaUsers,
      openState: trabajadoresOpen,
      setOpenState: setTrabajadoresOpen,
      subItems: [
        { href: '/employees', label: 'Lista de Trabajadores', icon: FaUsers },
        { href: '/contracts', label: 'Gestión de Contratos', icon: FaFileContract },
        { href: '/vacations', label: 'Gestionar Vacaciones', icon: FaUmbrellaBeach },
        { href: '/permissions', label: 'Permisos', icon: FaCalendarCheck },
        { href: '/disciplinary-actions', label: 'Cartas de Amonestación', icon: FaExclamationTriangle },
        { href: '/certificates', label: 'Certificados Laborales', icon: FaFileAlt },
      ]
    },
    {
      label: 'Remuneraciones',
      icon: FaMoneyBillWave,
      openState: remuneracionesOpen,
      setOpenState: setRemuneracionesOpen,
      subItems: [
        { href: '/advances', label: 'Anticipos', icon: FaMoneyBillWave },
        { href: '/payroll', label: 'Liquidaciones', icon: FaFileInvoiceDollar },
        { href: '/loans', label: 'Gestionar Préstamos', icon: FaHandHoldingUsd },
        { href: '/overtime', label: 'Gestión Horas Extras', icon: FaClock },
        { href: '/settlements', label: 'Finiquitos', icon: FaFileContract },
      ]
    },
    {
      label: 'Organización',
      icon: FaSitemap,
      openState: organizacionOpen,
      setOpenState: setOrganizacionOpen,
      subItems: [
        { href: '/organigrama', label: 'Organigrama', icon: FaProjectDiagram },
        { href: '/departments/chart', label: 'Organigrama de Departamentos', icon: FaBuilding },
        { href: '/admin/departments', label: 'Departamentos', icon: FaBuilding },
        { href: '/admin/cost-centers', label: 'Centros de Costo', icon: FaBuilding },
        { href: '/reports', label: 'Reportes', icon: FaChartBar },
        { href: '/documents', label: 'Banco de Documentos', icon: FaFolderOpen },
      ]
    },
    {
      label: 'Gestión de Personas',
      icon: FaUsers,
      openState: gestionPersonasOpen,
      setOpenState: setGestionPersonasOpen,
      subItems: [
        { href: '/compliance', label: 'Cumplimientos y Vencimientos', icon: FaShieldAlt },
        { href: '/raat', label: 'RAAT', icon: FaExclamationCircle },
      ]
    },
    {
      label: 'Configuración',
      icon: FaCog,
      openState: settingsOpen,
      setOpenState: setSettingsOpen,
      subItems: [
        { href: '/settings', label: 'Datos de Empresa', icon: FaBuilding },
        { href: '/settings/indicators', label: 'Indicadores', icon: FaChartBar },
        { href: '/settings/signatures', label: 'Firmas Digitales', icon: FaFileAlt },
        { href: '/settings/tax-brackets', label: 'Tramos Tributarios', icon: FaMoneyBillWave },
        { href: '/settings/usuarios-roles', label: 'Usuarios y Roles', icon: FaUserShield },
      ]
    },
  ]

  // Agregar links de administración si es super admin
  if (userProfile?.role === 'super_admin') {
    navItems.push({ href: '/admin/companies', label: 'Empresas', icon: FaUserShield })
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
              const isOpen = item.openState ?? false
              const toggleOpen = item.setOpenState ?? (() => {})
              
              return (
                <div key={item.label} className="sidebar-nav-group">
                  <button
                    type="button"
                    className={`sidebar-nav-item ${isParentActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      toggleOpen(!isOpen)
                    }}
                    title={item.label}
                  >
                    <Icon size={20} />
                    <span className="sidebar-nav-label">{item.label}</span>
                    {isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                  </button>
                  {isOpen && (
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
                            onClick={(e) => {
                              closeMobileMenu()
                              // Permitir que el Link navegue normalmente
                            }}
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
            <button 
              className="back-button" 
              onClick={() => router.back()}
              title="Volver"
            >
              <FaArrowLeft size={16} />
              <span className="back-button-text">Volver</span>
            </button>
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
            {user && <CompanySelector />}
            {user && <NotificationsDropdown />}
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
        {/* <AlertFab /> */}
        {/* Desactivado temporalmente - genera demasiadas alertas sin sentido */}

        {/* Botón flotante del Asistente IA */}
        {user && (
          <>
            <button
              onClick={() => setAiChatOpen(true)}
              style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              title="Abrir Asistente IA"
            >
              <FaRobot size={24} />
            </button>
            <AIChatWidget isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
          </>
        )}
      </div>
    </div>
  )
}
