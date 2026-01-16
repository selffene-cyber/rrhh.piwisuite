'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Verificar que es trabajador
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!employee) {
        // No es trabajador, redirigir al dashboard admin
        router.push('/')
        return
      }

      // Verificar que debe cambiar contraseña
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.must_change_password !== true) {
        // Ya cambió contraseña, redirigir al portal
        router.push('/employee')
        return
      }

      setChecking(false)
    } catch (err) {
      console.error('Error al verificar usuario:', err)
      router.push('/login')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
        setError('Todos los campos son requeridos')
        setLoading(false)
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('Las contraseñas nuevas no coinciden')
        setLoading(false)
        return
      }

      if (formData.newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres')
        setLoading(false)
        return
      }

      // Validar que la nueva contraseña no sea la inicial
      if (formData.newPassword === 'colaborador1') {
        setError('La nueva contraseña no puede ser la contraseña inicial. Por favor, elige una contraseña diferente.')
        setLoading(false)
        return
      }

      // Verificar contraseña actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.')
        setLoading(false)
        return
      }

      // Verificar contraseña actual intentando hacer sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: formData.currentPassword,
      })

      if (verifyError) {
        setError('La contraseña actual es incorrecta')
        setLoading(false)
        return
      }

      // Cambiar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (updateError) {
        setError(updateError.message || 'Error al cambiar la contraseña')
        setLoading(false)
        return
      }

      // Actualizar perfil para marcar que ya cambió la contraseña
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) {
        console.error('Error al actualizar perfil:', profileError)
        setError('Error al actualizar el perfil. Por favor, contacta al administrador.')
        setLoading(false)
        return
      }

      // Esperar un momento para asegurar que la actualización se complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Redirigir al portal del trabajador usando window.location para forzar recarga
      window.location.href = '/employee'
    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err)
      setError(err.message || 'Error al cambiar la contraseña')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Verificando...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ marginBottom: '8px' }}>Cambiar Contraseña</h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Por seguridad, debes cambiar tu contraseña inicial antes de continuar.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee2e2',
            border: '1px solid #dc2626',
            borderRadius: '4px',
            marginBottom: '16px',
            color: '#991b1b',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Contraseña Actual *</label>
            <input
              type="password"
              required
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="colaborador1"
              autoComplete="current-password"
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Ingresa la contraseña inicial: "colaborador1"
            </small>
          </div>

          <div className="form-group">
            <label>Nueva Contraseña *</label>
            <input
              type="password"
              required
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Mínimo 6 caracteres. No puede ser "colaborador1"
            </small>
          </div>

          <div className="form-group">
            <label>Confirmar Nueva Contraseña *</label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '12px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

