'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'super_admin' | 'admin' | 'user',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Verificar usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error al obtener perfil:', profileError)
        alert('Error al verificar permisos. Por favor, recarga la página.')
        router.push('/')
        return
      }

      if (profile?.role !== 'super_admin') {
        alert('No tienes permisos para acceder a esta página')
        router.push('/')
        return
      }

      setCurrentUser(profile)

      // Cargar todos los usuarios
      const { data: usersData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(usersData || [])
    } catch (error: any) {
      alert('Error al cargar usuarios: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      alert('Email y contraseña son requeridos')
      return
    }

    try {
      // Crear usuario usando API route
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario')
      }

      alert(data.message || 'Usuario creado exitosamente')
      setShowForm(false)
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'user',
      })
      loadData()
    } catch (error: any) {
      alert('Error al crear usuario: ' + error.message)
      console.error('Error completo:', error)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!confirm(`¿Cambiar rol del usuario a ${newRole}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      alert('Rol actualizado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al actualizar rol: ' + error.message)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${userEmail}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      // Eliminar usuario usando API route
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario')
      }

      alert('Usuario eliminado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al eliminar usuario: ' + error.message)
      console.error('Error completo:', error)
    }
  }

  const handleResetPassword = async (userId: string, userEmail: string) => {
    const newPassword = prompt(`Ingresa la nueva contraseña para ${userEmail}:`)
    if (!newPassword) return

    if (newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      // Usar API route para actualizar contraseña
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar contraseña')
      }

      alert('Contraseña actualizada correctamente')
    } catch (error: any) {
      alert('Error al actualizar contraseña: ' + error.message)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Administración de Usuarios</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Crear Nuevo Usuario</h2>
          <form onSubmit={handleCreateUser}>
            <div className="form-row">
              <div className="form-group">
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
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
                  minLength={6}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Mínimo 6 caracteres
                </small>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nombre del usuario"
                />
              </div>
              <div className="form-group">
                <label>Rol *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'super_admin' | 'admin' | 'user' })}
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                  <option value="super_admin">Super Administrador</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
              <button type="submit">Crear Usuario</button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowForm(false)
                  setFormData({
                    email: '',
                    password: '',
                    full_name: '',
                    role: 'user',
                  })
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Lista de Usuarios ({users.length})</h2>
        {users.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.full_name || '-'}</td>
                  <td>
                    <span className={`badge ${user.role}`}>
                      {user.role === 'super_admin' ? 'Super Admin' : 
                       user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {user.id !== currentUser?.id && (
                        <>
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            className="secondary"
                            onClick={() => handleResetPassword(user.id, user.email)}
                          >
                            Cambiar Pass
                          </button>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            className="danger"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                      {user.id === currentUser?.id && (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>Usuario actual</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay usuarios registrados.</p>
        )}
      </div>
    </div>
  )
}

