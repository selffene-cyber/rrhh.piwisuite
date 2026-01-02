'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/date'
import { supabase } from '@/lib/supabase/client'
import { CostCenter } from '@/types'
import { getCostCenters, getUserCostCenters, assignCostCentersToUser } from '@/lib/services/costCenterService'
import { FaBuilding, FaTimes } from 'react-icons/fa'

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
  const [showCCModal, setShowCCModal] = useState<string | null>(null)
  const [allCostCenters, setAllCostCenters] = useState<CostCenter[]>([])
  const [userCostCenters, setUserCostCenters] = useState<{ [userId: string]: CostCenter[] }>({})
  const [selectedCostCenterIds, setSelectedCostCenterIds] = useState<string[]>([])
  const [savingCC, setSavingCC] = useState(false)

  useEffect(() => {
    loadUsers()
    loadCostCenters()
  }, [companyId])

  const loadCostCenters = async () => {
    if (!companyId) return

    try {
      const data = await getCostCenters(companyId, supabase, false)
      setAllCostCenters(data)
    } catch (error) {
      console.error('Error al cargar centros de costo:', error)
    }
  }

  const loadUserCostCenters = async (userId: string) => {
    if (!companyId || !userId) return

    try {
      const userCC = await getUserCostCenters(userId, companyId, supabase)
      setUserCostCenters(prev => ({ ...prev, [userId]: userCC }))
      return userCC
    } catch (error) {
      console.error('Error al cargar CC del usuario:', error)
      return []
    }
  }

  const handleOpenCCModal = async (userId: string) => {
    setShowCCModal(userId)
    const userCC = await loadUserCostCenters(userId)
    setSelectedCostCenterIds(userCC.map(cc => cc.id))
  }

  const handleCloseCCModal = () => {
    setShowCCModal(null)
    setSelectedCostCenterIds([])
  }

  const handleToggleCostCenter = (costCenterId: string) => {
    setSelectedCostCenterIds(prev => {
      if (prev.includes(costCenterId)) {
        return prev.filter(id => id !== costCenterId)
      } else {
        return [...prev, costCenterId]
      }
    })
  }

  const handleSaveCostCenters = async () => {
    if (!showCCModal || !companyId) return

    setSavingCC(true)
    try {
      await assignCostCentersToUser(showCCModal, companyId, selectedCostCenterIds, supabase)
      alert('Centros de costo asignados correctamente')
      await loadUserCostCenters(showCCModal)
      handleCloseCCModal()
    } catch (error: any) {
      alert('Error al guardar: ' + error.message)
    } finally {
      setSavingCC(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/users`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar usuarios')
      }

      setUsers(data.users || [])
      
      // Cargar CC asignados para cada usuario
      if (data.users && data.users.length > 0) {
        const ccPromises = data.users.map((user: CompanyUser) => 
          loadUserCostCenters(user.user_id)
        )
        await Promise.all(ccPromises)
      }
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
                <th>Centros de Costo</th>
                <th>Estado</th>
                <th>Fecha Asignación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const userCC = userCostCenters[user.user_id] || []
                const isAdminOrOwner = user.role === 'admin' || user.role === 'owner'
                
                return (
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
                      {isAdminOrOwner ? (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Todos (Admin/Owner)</span>
                      ) : userCC.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                          {userCC.slice(0, 2).map((cc) => (
                            <span
                              key={cc.id}
                              className="badge"
                              style={{
                                backgroundColor: '#3b82f620',
                                color: '#3b82f6',
                                fontSize: '11px',
                                padding: '2px 6px',
                              }}
                            >
                              {cc.code}
                            </span>
                          ))}
                          {userCC.length > 2 && (
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              +{userCC.length - 2} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Sin asignar</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${user.status === 'active' ? 'success' : 'warning'}`}>
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {!isAdminOrOwner && (
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            className="secondary"
                            onClick={() => handleOpenCCModal(user.user_id)}
                            title="Gestionar Centros de Costo"
                          >
                            <FaBuilding style={{ fontSize: '12px' }} />
                          </button>
                        )}
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          className="danger"
                          onClick={() => handleRemoveUser(user.user_id, user.user?.email || 'usuario')}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p>No hay usuarios asignados a esta empresa.</p>
        )}
      </div>

      {/* Modal para gestionar Centros de Costo */}
      {showCCModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Gestionar Centros de Costo</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  {users.find(u => u.user_id === showCCModal)?.user?.email || 'Usuario'}
                </p>
              </div>
              <button
                onClick={handleCloseCCModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280'
                }}
              >
                <FaTimes size={20} />
              </button>
            </div>

            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
              Selecciona los centros de costo que este usuario podrá gestionar. Los usuarios con rol "admin" o "owner" tienen acceso a todos los centros de costo automáticamente.
            </p>

            {allCostCenters.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                No hay centros de costo disponibles. Crea algunos en el catálogo primero.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {allCostCenters.map((cc) => (
                  <label
                    key={cc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      border: selectedCostCenterIds.includes(cc.id) ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedCostCenterIds.includes(cc.id) ? '#eff6ff' : 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCostCenterIds.includes(cc.id)}
                      onChange={() => handleToggleCostCenter(cc.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>{cc.code}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{cc.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={handleCloseCCModal}
                className="secondary"
                disabled={savingCC}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCostCenters}
                disabled={savingCC}
              >
                {savingCC ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

