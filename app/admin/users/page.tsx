'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaBuilding, FaEdit, FaTimes } from 'react-icons/fa'

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editFormData, setEditFormData] = useState({
    email: '',
    full_name: '',
  })
  const [userCompanies, setUserCompanies] = useState<{ [userId: string]: any[] }>({})
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'super_admin' | 'admin' | 'executive' | 'user',
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
      
      // Cargar empresas y CC asignados para cada usuario
      if (usersData && usersData.length > 0) {
        const companiesPromises = usersData.map(async (user: any) => {
          
          // ✅ DIFERENTE LÓGICA SEGÚN ROL DEL USUARIO
          
          // Para Super Admin: indicar acceso global
          if (user.role === 'super_admin') {
            return { 
              userId: user.id, 
              companies: [{
                company_id: 'global',
                role: 'super_admin',
                companies: { id: 'global', name: '(Todas las empresas)' },
                user_cost_centers: []
              }]
            }
          }
          
          // Para Admin: buscar en company_users
          if (user.role === 'admin') {
            const { data: companiesData } = await supabase
              .from('company_users')
              .select(`
                company_id,
                role,
                companies (id, name)
              `)
              .eq('user_id', user.id)
              .eq('status', 'active')
            
            if (!companiesData || companiesData.length === 0) {
              return { userId: user.id, companies: [] }
            }
            
            // Para cada empresa, cargar los CC asignados
            const companiesWithCC = await Promise.all(
              companiesData.map(async (cu: any) => {
                const { data: costCentersData, error: ccError } = await supabase
                  .from('user_cost_centers')
                  .select(`
                    cost_center_id,
                    cost_centers (id, code, name)
                  `)
                  .eq('user_id', user.id)
                  .eq('company_id', cu.company_id)
                
                if (ccError) {
                  console.error(`Error cargando CC para usuario ${user.id} en empresa ${cu.company_id}:`, ccError)
                }
                
                return {
                  ...cu,
                  user_cost_centers: costCentersData || []
                }
              })
            )
            
            return { userId: user.id, companies: companiesWithCC }
          }
          
          // ✅ Para User (Trabajador): buscar en tabla employees
          if (user.role === 'user') {
            const { data: employeeData } = await supabase
              .from('employees')
              .select(`
                company_id,
                cost_center_id,
                companies (id, name),
                cost_centers (id, code, name)
              `)
              .eq('user_id', user.id)
              .single()
            
            if (!employeeData) {
              return { userId: user.id, companies: [] }
            }
            
            // Formatear para que tenga la misma estructura que company_users
            return {
              userId: user.id,
              companies: [{
                company_id: employeeData.company_id,
                role: 'user',
                companies: employeeData.companies,
                user_cost_centers: employeeData.cost_centers ? [{
                  cost_center_id: employeeData.cost_center_id,
                  cost_centers: employeeData.cost_centers
                }] : []
              }]
            }
          }
          
          return { userId: user.id, companies: [] }
        })
        
        const companiesData = await Promise.all(companiesPromises)
        const companiesMap: { [userId: string]: any[] } = {}
        companiesData.forEach(({ userId, companies }) => {
          companiesMap[userId] = companies
        })
        setUserCompanies(companiesMap)
      }
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
    const roleLabel = newRole === 'super_admin' ? 'Super Admin' : 
                      newRole === 'admin' ? 'Administrador Sistema' : 
                      newRole === 'executive' ? 'Ejecutivo' : 'Usuario Sistema'
    if (!confirm(`¿Cambiar ROL DEL SISTEMA del usuario a "${roleLabel}"?\n\n⚠️ IMPORTANTE:\n- Este es el rol a nivel del sistema completo (user_profiles.role)\n- Solo "Super Admin" puede acceder al panel de administración global\n- "Ejecutivo" puede crear documentos pero NO aprobar\n- Para cambiar el rol dentro de una empresa específica, ve a la página de usuarios de esa empresa\n- Los roles por empresa (owner/admin/executive/user) se gestionan desde cada empresa`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      alert('Rol del sistema actualizado correctamente')
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

  const handleEditUser = (user: any) => {
    setEditingUser(user)
    setEditFormData({
      email: user.email || '',
      full_name: user.full_name || '',
    })
  }

  const handleCloseEditModal = () => {
    setEditingUser(null)
    setEditFormData({
      email: '',
      full_name: '',
    })
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    if (!editFormData.email) {
      alert('El email es requerido')
      return
    }

    try {
      // Actualizar en user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          email: editFormData.email,
          full_name: editFormData.full_name || null,
        })
        .eq('id', editingUser.id)

      if (profileError) throw profileError

      // Si el email cambió, también actualizar en auth.users
      if (editFormData.email !== editingUser.email) {
        const response = await fetch('/api/admin/update-user-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: editingUser.id,
            newEmail: editFormData.email,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al actualizar email en auth')
        }
      }

      alert('Usuario actualizado correctamente')
      handleCloseEditModal()
      loadData()
    } catch (error: any) {
      alert('Error al actualizar usuario: ' + error.message)
      console.error('Error completo:', error)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Administración de Usuarios</h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Gestiona usuarios del sistema. Los roles por empresa se gestionan desde cada empresa específica.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: '24px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1e40af' }}>ℹ️ Información sobre Roles</h3>
        <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Rol del Sistema</strong> (columna "Rol"): Controla el acceso al sistema completo.
          </p>
          <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
            <li><strong>Super Admin</strong>: Acceso completo, puede gestionar todas las empresas</li>
            <li><strong>Admin Sistema</strong>: Usuario administrativo del sistema (rara vez usado)</li>
            <li><strong>Ejecutivo</strong>: Puede crear documentos (permisos, vacaciones, etc.) pero NO aprobar. Acceso completo a RAAT y Cumplimientos</li>
            <li><strong>Usuario Sistema</strong>: Usuario normal del sistema</li>
          </ul>
          <p style={{ margin: '0' }}>
            <strong>Rol por Empresa</strong> (mostrado en "Centros de Costo"): Controla permisos dentro de cada empresa específica. Se gestiona desde <strong>Administración → Empresas → [Empresa] → Usuarios</strong>.
          </p>
        </div>
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
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'super_admin' | 'admin' | 'executive' | 'user' })}
                >
                  <option value="user">Usuario</option>
                  <option value="executive">Ejecutivo</option>
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
                <th>Centros de Costo</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => {
                const companies = userCompanies[user.id] || []
                const hasMultipleCompanies = companies.length > 1
                
                return (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.full_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                          <span className={`badge ${user.role}`} style={{ marginBottom: '4px' }}>
                            {user.role === 'super_admin' ? 'Super Admin' : 
                             user.role === 'admin' ? 'Admin Sistema' :
                             user.role === 'executive' ? 'Ejecutivo' : 'Usuario Sistema'}
                          </span>
                          <small style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginTop: '2px' }}>
                            Rol del Sistema
                          </small>
                        </div>
                        {companies.length > 0 && (
                          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e5e7eb' }}>
                            <small style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                              Roles por Empresa:
                            </small>
                            {companies.map((cu: any) => (
                              <div key={cu.company_id} style={{ marginBottom: '2px' }}>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: cu.role === 'owner' ? '#fef3c7' : cu.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                                  color: cu.role === 'owner' ? '#92400e' : cu.role === 'admin' ? '#1e40af' : '#374151',
                                  fontWeight: '500',
                                  display: 'inline-block',
                                  marginRight: '4px'
                                }}>
                                  {cu.companies?.name || 'Empresa'}: {cu.role === 'owner' ? 'Propietario' : cu.role === 'admin' ? 'Admin' : 'Usuario'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {companies.length === 0 ? (
                        <div style={{ 
                          padding: '12px', 
                          background: '#f9fafb', 
                          borderRadius: '8px',
                          textAlign: 'center',
                          border: '1px dashed #e5e7eb'
                        }}>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>Sin empresas asignadas</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px' }}>
                          {companies.map((companyUser: any) => {
                            const company = companyUser.companies
                            const costCenters = companyUser.user_cost_centers || []
                            const isAdminOrOwner = companyUser.role === 'admin' || companyUser.role === 'owner'
                            
                            return (
                              <div 
                                key={companyUser.company_id} 
                                style={{ 
                                  padding: '12px',
                                  background: '#ffffff',
                                  borderRadius: '8px',
                                  border: '1px solid #e5e7eb',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#3b82f6'
                                  e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(59, 130, 246, 0.1)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#e5e7eb'
                                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}
                              >
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  marginBottom: '8px'
                                }}>
                                  <div style={{ 
                                    fontSize: '13px', 
                                    fontWeight: '600', 
                                    color: '#111827',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <div style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      background: isAdminOrOwner ? '#10b981' : '#3b82f6',
                                      flexShrink: 0
                                    }} />
                                    {company?.name || 'Empresa'}
                                  </div>
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: companyUser.role === 'owner' ? '#fef3c7' : companyUser.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                                    color: companyUser.role === 'owner' ? '#92400e' : companyUser.role === 'admin' ? '#1e40af' : '#374151',
                                    fontWeight: '500',
                                    textTransform: 'capitalize'
                                  }}>
                                    {companyUser.role === 'owner' ? 'Propietario' : companyUser.role === 'admin' ? 'Admin' : 'Usuario'}
                                  </span>
                                </div>
                                
                                {/* Mostrar "Acceso completo" solo si es admin/owner Y no tiene CC específicos asignados */}
                                {isAdminOrOwner && costCenters.length === 0 ? (
                                  <div style={{
                                    padding: '8px',
                                    background: '#ecfdf5',
                                    borderRadius: '6px',
                                    border: '1px solid #d1fae5',
                                    marginBottom: '8px'
                                  }}>
                                    <span style={{ 
                                      fontSize: '11px', 
                                      color: '#065f46',
                                      fontWeight: '500',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <span style={{ fontSize: '14px' }}>✓</span>
                                      Acceso completo a todos los CC
                                    </span>
                                  </div>
                                ) : costCenters.length > 0 ? (
                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{ 
                                      fontSize: '11px', 
                                      color: '#6b7280', 
                                      marginBottom: '6px',
                                      fontWeight: '500'
                                    }}>
                                      Centros asignados ({costCenters.length}):
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {costCenters.slice(0, 3).map((ucc: any) => (
                                        <span
                                          key={ucc.cost_center_id}
                                          style={{
                                            backgroundColor: '#eff6ff',
                                            color: '#1e40af',
                                            fontSize: '11px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #bfdbfe',
                                            fontWeight: '500',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}
                                        >
                                          <FaBuilding style={{ fontSize: '9px' }} />
                                          {ucc.cost_centers?.code || '-'}
                                        </span>
                                      ))}
                                      {costCenters.length > 3 && (
                                        <span style={{ 
                                          fontSize: '11px', 
                                          color: '#6b7280',
                                          padding: '4px 8px',
                                          background: '#f9fafb',
                                          borderRadius: '6px',
                                          border: '1px solid #e5e7eb',
                                          fontWeight: '500'
                                        }}>
                                          +{costCenters.length - 3} más
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{
                                    padding: '8px',
                                    background: '#fef2f2',
                                    borderRadius: '6px',
                                    border: '1px solid #fecaca',
                                    marginBottom: '8px'
                                  }}>
                                    <span style={{ 
                                      fontSize: '11px', 
                                      color: '#991b1b',
                                      fontWeight: '500'
                                    }}>
                                      ⚠ Sin centros asignados
                                    </span>
                                  </div>
                                )}
                                
                                {/* Mostrar botón de gestionar CC para todos excepto super_admin del sistema */}
                                {user.role !== 'super_admin' && (
                                  <Link href={`/admin/users/${user.id}/cost-centers?company_id=${companyUser.company_id}`}>
                                    <button
                                      style={{ 
                                        width: '100%',
                                        padding: '6px 12px', 
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        background: isAdminOrOwner ? '#10b981' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = isAdminOrOwner ? '#059669' : '#2563eb'
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                        e.currentTarget.style.boxShadow = `0 2px 4px ${isAdminOrOwner ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = isAdminOrOwner ? '#10b981' : '#3b82f6'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = 'none'
                                      }}
                                      title={isAdminOrOwner ? 'Gestionar CC (puede asignar/remover CC aunque tenga acceso completo)' : 'Gestionar Centros de Costo'}
                                    >
                                      <FaBuilding style={{ fontSize: '11px' }} />
                                      {isAdminOrOwner ? 'Gestionar CC' : 'Gestionar CC'}
                                    </button>
                                  </Link>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {user.id !== currentUser?.id && (
                          <>
                            <button
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              className="secondary"
                              onClick={() => handleEditUser(user)}
                              title="Editar Usuario"
                            >
                              <FaEdit style={{ fontSize: '12px', marginRight: '4px' }} />
                              Editar
                            </button>
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              <option value="user">Usuario</option>
                              <option value="executive">Ejecutivo</option>
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
                )
              })}
            </tbody>
          </table>
        ) : (
          <p>No hay usuarios registrados.</p>
        )}
      </div>

      {/* Modal para editar usuario */}
      {editingUser && (
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
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Editar Usuario</h2>
              <button
                onClick={handleCloseEditModal}
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

            <form onSubmit={handleUpdateUser}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  placeholder="Nombre del usuario"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="secondary"
                >
                  Cancelar
                </button>
                <button type="submit">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

