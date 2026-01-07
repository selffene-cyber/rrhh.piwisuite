'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import './login.css'

export default function LoginPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mostrar el formulario después de que termine la animación del logo
    const timer = setTimeout(() => {
      setShowForm(true)
    }, 1800)

    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Esperar un momento para que la sesión y las cookies se establezcan
        await new Promise(resolve => setTimeout(resolve, 500))

        // Verificar si es trabajador y si debe cambiar contraseña
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('must_change_password')
          .eq('id', data.user.id)
          .single()

        // Verificar si el usuario está vinculado a un empleado
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', data.user.id)
          .single()

        const isEmployee = !!employee && !employeeError
        const mustChangePassword = profile?.must_change_password === true

        console.log('Login - user_id:', data.user.id)
        console.log('Login - employee:', employee, 'employeeError:', employeeError)
        console.log('Login - profile:', profile, 'profileError:', profileError)
        console.log('Login - isEmployee:', isEmployee, 'mustChangePassword:', mustChangePassword)

        // Redirigir según el tipo de usuario
        if (isEmployee) {
          // Es trabajador
          if (mustChangePassword) {
            // Debe cambiar contraseña en primer login
            console.log('Redirigiendo trabajador a cambio de contraseña')
            window.location.href = '/employee/change-password'
            return
          } else {
            // Ya cambió contraseña, ir al portal del trabajador
            console.log('Redirigiendo trabajador a portal')
            window.location.href = '/employee'
            return
          }
        } else {
          // No es trabajador (o hubo error), es admin/owner, ir al dashboard administrativo
          console.log('Redirigiendo admin/owner a dashboard (isEmployee:', isEmployee, ')')
          window.location.href = '/'
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="login-page-container">
      {/* Background - Imagen antártica */}
      <div
        className="login-background"
        style={{
          backgroundImage: `url(/fondo_login.png)`,
        }}
      >
        {/* Overlay sutil para legibilidad */}
        <div className="login-overlay" />
      </div>

      {/* Main content */}
      <div className="login-content-wrapper">
        <AnimatePresence mode="wait">
          {!showForm ? (
            // Logo animation phase
            <motion.div
              key="logo"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{
                duration: 1.2,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="login-logo-container"
            >
              <Image
                src="/pinguino-icon.png"
                alt="Piwi Suite"
                width={256}
                height={256}
                className="login-logo-large"
                priority
              />
            </motion.div>
          ) : (
            // Login form phase
            <motion.div
              key="form"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="login-form-wrapper"
            >
              {/* Contenedor principal del formulario */}
              <div className="login-form-container">
                {/* Logo pequeño en el header */}
                <div className="login-header-logo">
                  <Image
                    src="/pinguino-icon.png"
                    alt="Piwi Suite"
                    width={80}
                    height={80}
                    className="login-logo-small"
                    priority
                  />
                </div>

                {/* Título y subtítulo */}
                <div className="login-header-text">
                  <h1 className="login-title">Iniciar Sesión</h1>
                  <p className="login-subtitle">Sistema de Gestión de Personas</p>
                </div>

                {/* Mensaje de error */}
                {error && (
                  <div className="login-error-message">
                    {error}
                  </div>
                )}

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="login-form">
                  {/* Campo Email */}
                  <div className="login-field-group">
                    <label htmlFor="email" className="login-label">
                      Correo electrónico
                    </label>
                    <div className="login-input-wrapper">
                      <Mail className="login-input-icon" />
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="usuario@empresa.com"
                        required
                        autoComplete="email"
                        className="login-input"
                      />
                    </div>
                  </div>

                  {/* Campo Contraseña */}
                  <div className="login-field-group">
                    <label htmlFor="password" className="login-label">
                      Contraseña
                    </label>
                    <div className="login-input-wrapper">
                      <Lock className="login-input-icon" />
                      <input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        className="login-input"
                      />
                    </div>
                  </div>

                  {/* Botón de envío */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-button"
                  >
                    <span>{loading ? 'Iniciando sesión...' : 'Acceder al sistema'}</span>
                    {!loading && (
                      <ArrowRight className="login-button-icon" />
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="login-footer">
                  <p className="login-footer-text">
                    Sistema de Gestión Integral de Personas by Piwi Suite - Noviembre2025
                  </p>
                </div>
              </div>

              {/* Badge de seguridad */}
              <div className="login-security-badge">
                <div className="login-security-dot" />
                <span>Conexión segura SSL</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
