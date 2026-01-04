'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/date'

interface CompanyUser {
  id: string
  user_id: string
  company_id: string
  role: 'owner' | 'admin' | 'user'
  status: string
  created_at: string
  user?: {
    email: string
    full_name: string | null
    role: string
  }
}

export default function CompanyUsersPage() {
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'user' as 'owner' | 'admin' | 'user',
  })

  useEffect(() => {
    loadUsers()
  }, [companyId])

  const loadUsers = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/users`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar usuarios')
      }

      setUsers(data.users || [])
    } catch (error: any) {
      alert('Error al cargar usuarios: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email) {
      alert('Email es requerido')
      return
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al asignar usuario')
      }

      alert('Usuario asignado exitosamente')
      setShowForm(false)
      setFormData({ email: '', role: 'user' })
      loadUsers()
    } catch (error: any) {
      alert('Error al asignar usuario: ' + error.message)
    }
  }

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Estás seguro de remover a ${userEmail} de esta empresa?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}/users?user_id=${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al remover usuario')
      }

      alert('Usuario removido exitosamente')
      loadUsers()
    } catch (error: any) {
      alert('Error al remover usuario: ' + error.message)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'owner' | 'admin' | 'user') => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          role: newRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar rol')
      }

      alert('Rol actualizado exitosamente')
      loadUsers()
    } catch (error: any) {
      alert('Error al actualizar rol: ' + error.message)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/companies">← Volver a Empresas</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Gestión de Usuarios</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Asignar Usuario'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Asignar Usuario a Empresa</h2>
          <form onSubmit={handleAssignUser}>
            <div className="form-row">
              <div className="form-group">
                <label>Email del Usuario *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div className="form-group">
                <label>Rol *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'owner' | 'admin' | 'user' })}
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                  <option value="owner">Propietario</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
              <button type="submit">Asignar Usuario</button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowForm(false)
                  setFormData({ email: '', role: 'user' })
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Usuarios Asignados ({users.length})</h2>
        {users.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha Asignación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.user?.email || '-'}</td>
                  <td>{user.user?.full_name || '-'}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.user_id, e.target.value as 'owner' | 'admin' | 'user')}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                      <option value="owner">Propietario</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'success' : 'warning'}`}>
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <button
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      className="danger"
                      onClick={() => handleRemoveUser(user.user_id, user.user?.email || 'usuario')}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay usuarios asignados a esta empresa.</p>
        )}
      </div>
    </div>
  )
}

