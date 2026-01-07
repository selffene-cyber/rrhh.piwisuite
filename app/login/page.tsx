'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)

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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#2563eb',
      position: 'relative'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '24px' }}>Iniciar Sesión</h1>
        
        {error && (
          <div style={{ 
            padding: '12px', 
            background: '#fee2e2', 
            border: '1px solid #dc2626', 
            borderRadius: '4px',
            marginBottom: '16px',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo Electrónico *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Contraseña *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '24px',
        textAlign: 'center',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        Sistema de Gestión Integral de Personas by Piwi Suite - Noviembre2025
      </div>
    </div>
  )
}
