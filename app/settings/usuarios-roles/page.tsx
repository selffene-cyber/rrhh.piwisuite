'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { UserRole, UserPermissions, DEFAULT_PERMISSIONS } from '@/types'
import { FaUser, FaEdit, FaTrash, FaPlus, FaTimes, FaToggleOn, FaToggleOff } from 'react-icons/fa'

interface CompanyUser {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'executive' | 'user'
  status: string
  user_profiles?: {
    email: string
    full_name: string | null
    role: UserRole
  }
  permissions?: UserPermissions
}

export default function UsuariosRolesPage() {
  const { companyId } = useCurrentCompany()
  
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  
  const [createFormData, setCreateFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'owner' | 'admin' | 'executive' | 'user',
  })

  const [permissionsFormData, setPermissionsFormData] = useState<Partial<UserPermissions>>({})

  useEffect(() => {
    if (companyId) {
      loadUsers()
    }
  }, [companyId])

  const loadUsers = async () => {
    if (!companyId) return

    try {
      setLoading(true)

      // Paso 1: Obtener usuarios de la empresa
      const { data: companyUsers, error: cuError } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')

      if (cuError) throw cuError

      // Paso 2: Para cada usuario, obtener su perfil y permisos
      const usersWithDetails = await Promise.all(
        (companyUsers || []).map(async (cu: any) => {
          // Obtener perfil del usuario
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('email, full_name, role')
            .eq('id', cu.user_id)
            .single()

          // Obtener permisos personalizados
          const { data: permissions } = await supabase
            .from('user_permissions')
            .select('*')
            .eq('user_id', cu.user_id)
            .eq('company_id', companyId)
            .single()

          return {
            ...cu,
            user_profiles: userProfile || null,
            permissions: permissions || DEFAULT_PERMISSIONS[userProfile?.role as UserRole] || {}
          }
        })
      )

      setUsers(usersWithDetails)
    } catch (error: any) {
      console.error('Error al cargar usuarios:', error)
      alert('Error al cargar usuarios: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyId) {
      alert('No se pudo obtener la empresa actual')
      return
    }

    try {
      // Crear usuario usando API
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createFormData.email,
          password: createFormData.password,
          full_name: createFormData.full_name,
          role: createFormData.role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario')
      }

      // Asignar a la empresa
      const { error: assignError } = await supabase
        .from('company_users')
        .insert({
          user_id: data.user.id,
          company_id: companyId,
          role: createFormData.role,
          status: 'active',
        })

      if (assignError) throw assignError

      alert('Usuario creado y asignado exitosamente')
      setShowCreateForm(false)
      setCreateFormData({ email: '', password: '', full_name: '', role: 'user' })
      loadUsers()
    } catch (error: any) {
      alert('Error al crear usuario: ' + error.message)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Eliminar a ${userEmail} de esta empresa?\n\nNOTA: Solo se eliminará de esta empresa, no del sistema.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('company_users')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId)

      if (error) throw error

      alert('Usuario eliminado de la empresa')
      loadUsers()
    } catch (error: any) {
      alert('Error al eliminar usuario: ' + error.message)
    }
  }

  const handleOpenPermissions = (user: CompanyUser) => {
    setEditingUser(user)
    setPermissionsFormData(user.permissions || {})
    setShowPermissionsModal(true)
  }

  const handleSavePermissions = async () => {
    if (!editingUser || !companyId) return

    try {
      // Verificar si ya existen permisos
      const { data: existing } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', editingUser.user_id)
        .eq('company_id', companyId)
        .single()

      if (existing) {
        // Actualizar
        const { error } = await supabase
          .from('user_permissions')
          .update(permissionsFormData)
          .eq('user_id', editingUser.user_id)
          .eq('company_id', companyId)

        if (error) throw error
      } else {
        // Insertar
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: editingUser.user_id,
            company_id: companyId,
            ...permissionsFormData,
          })

        if (error) throw error
      }

      alert('Permisos actualizados exitosamente')
      setShowPermissionsModal(false)
      setEditingUser(null)
      loadUsers()
    } catch (error: any) {
      alert('Error al guardar permisos: ' + error.message)
    }
  }

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissionsFormData(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  if (loading) {
    return <div className="card">Cargando usuarios...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Usuarios y Roles</h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Gestiona los usuarios de tu empresa y sus permisos
          </p>
        </div>
        <button onClick={() => setShowCreateForm(true)}>
          <FaPlus style={{ marginRight: '8px' }} />
          Crear Usuario
        </button>
      </div>

      {/* Formulario de creación */}
      {showCreateForm && (
        <div className="card" style={{ marginBottom: '24px', background: '#f0f9ff', border: '2px solid #3b82f6' }}>
          <h2>Crear Nuevo Usuario</h2>
          <form onSubmit={handleCreateUser}>
            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="usuario@empresa.cl"
                />
              </div>
              <div className="form-group">
                <label>Contraseña *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={createFormData.full_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, full_name: e.target.value })}
                  placeholder="Nombre del usuario"
                />
              </div>
              <div className="form-group">
                <label>Rol *</label>
                <select
                  required
                  value={createFormData.role}
                  onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value as any })}
                >
                  <option value="user">Usuario</option>
                  <option value="executive">Ejecutivo</option>
                  <option value="admin">Administrador</option>
                  <option value="owner">Propietario</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button type="submit">Crear Usuario</button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowCreateForm(false)
                  setCreateFormData({ email: '', password: '', full_name: '', role: 'user' })
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="card">
        <h2>Usuarios de la Empresa ({users.length})</h2>
        {users.length > 0 ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <FaUser style={{ color: '#6b7280' }} />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>
                          {user.user_profiles?.full_name || user.user_profiles?.email}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          {user.user_profiles?.email}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: user.role === 'owner' ? '#fef3c7' :
                                    user.role === 'admin' ? '#dbeafe' :
                                    user.role === 'executive' ? '#e0e7ff' : '#f3f4f6',
                          color: user.role === 'owner' ? '#92400e' :
                                user.role === 'admin' ? '#1e40af' :
                                user.role === 'executive' ? '#4338ca' : '#374151',
                        }}
                      >
                        {user.role === 'owner' ? 'Propietario' :
                         user.role === 'admin' ? 'Administrador' :
                         user.role === 'executive' ? 'Ejecutivo' : 'Usuario'}
                      </span>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: '#f0fdf4',
                          color: '#166534',
                        }}
                      >
                        Sistema: {user.user_profiles?.role === 'super_admin' ? 'Super Admin' :
                                user.user_profiles?.role === 'admin' ? 'Admin' :
                                user.user_profiles?.role === 'executive' ? 'Ejecutivo' : 'Usuario'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="secondary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                      onClick={() => handleOpenPermissions(user)}
                    >
                      <FaEdit style={{ marginRight: '6px' }} />
                      Permisos
                    </button>
                    {user.role !== 'owner' && (
                      <button
                        className="danger"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => handleDeleteUser(user.user_id, user.user_profiles?.email || 'usuario')}
                      >
                        <FaTrash style={{ marginRight: '6px' }} />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>
            No hay usuarios asignados a esta empresa
          </p>
        )}
      </div>

      {/* Modal de permisos */}
      {showPermissionsModal && editingUser && (
        <div
          style={{
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
            padding: '20px',
          }}
          onClick={() => setShowPermissionsModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  Permisos de {editingUser.user_profiles?.full_name || editingUser.user_profiles?.email}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Personaliza qué puede hacer este usuario en la empresa
                </p>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280',
                }}
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Secciones de permisos */}
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Vista y Acceso */}
              <PermissionSection
                title="👁️ Vista y Acceso"
                permissions={[
                  { key: 'can_view_employees', label: 'Ver Lista de Trabajadores' },
                  { key: 'can_view_employee_details', label: 'Ver Detalles de Trabajadores' },
                  { key: 'can_view_employee_salary', label: 'Ver Información Salarial' },
                  { key: 'can_view_contracts', label: 'Ver Contratos' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Descargas */}
              <PermissionSection
                title="💾 Descargas de Documentos"
                permissions={[
                  { key: 'can_download_contracts', label: 'Descargar Contratos' },
                  { key: 'can_download_payroll', label: 'Descargar Liquidaciones' },
                  { key: 'can_download_certificates', label: 'Descargar Certificados' },
                  { key: 'can_download_settlements', label: 'Descargar Finiquitos' },
                  { key: 'can_download_employee_documents', label: 'Descargar Documentos de Trabajadores' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Contratos */}
              <PermissionSection
                title="📝 Gestión de Contratos"
                permissions={[
                  { key: 'can_create_contracts', label: 'Crear Contratos' },
                  { key: 'can_approve_contracts', label: 'Aprobar Contratos' },
                  { key: 'can_edit_contracts', label: 'Editar Contratos' },
                  { key: 'can_delete_contracts', label: 'Eliminar Contratos' },
                  { key: 'can_create_amendments', label: 'Crear Anexos' },
                  { key: 'can_approve_amendments', label: 'Aprobar Anexos' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Documentos de Trabajadores */}
              <PermissionSection
                title="📄 Documentos de Trabajadores"
                permissions={[
                  { key: 'can_create_permissions', label: 'Crear Permisos' },
                  { key: 'can_approve_permissions', label: 'Aprobar Permisos' },
                  { key: 'can_create_vacations', label: 'Crear Vacaciones' },
                  { key: 'can_approve_vacations', label: 'Aprobar Vacaciones' },
                  { key: 'can_create_certificates', label: 'Crear Certificados' },
                  { key: 'can_approve_certificates', label: 'Aprobar Certificados' },
                  { key: 'can_create_disciplinary', label: 'Crear Amonestaciones' },
                  { key: 'can_approve_disciplinary', label: 'Aprobar Amonestaciones' },
                  { key: 'can_create_overtime_pacts', label: 'Crear Pactos Horas Extra' },
                  { key: 'can_approve_overtime_pacts', label: 'Aprobar Pactos Horas Extra' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Finanzas */}
              <PermissionSection
                title="💰 Finanzas"
                permissions={[
                  { key: 'can_create_payroll', label: 'Crear Liquidaciones' },
                  { key: 'can_approve_payroll', label: 'Aprobar Liquidaciones' },
                  { key: 'can_create_settlements', label: 'Crear Finiquitos' },
                  { key: 'can_approve_settlements', label: 'Aprobar Finiquitos' },
                  { key: 'can_create_advances', label: 'Crear Anticipos' },
                  { key: 'can_approve_advances', label: 'Aprobar Anticipos' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Préstamos */}
              <PermissionSection
                title="💵 Préstamos"
                permissions={[
                  { key: 'can_view_loans', label: 'Ver Lista de Préstamos' },
                  { key: 'can_create_loans', label: 'Crear Nuevos Préstamos' },
                  { key: 'can_edit_loans', label: 'Editar Préstamos Existentes' },
                  { key: 'can_delete_loans', label: 'Eliminar Préstamos' },
                  { key: 'can_download_loans', label: 'Descargar PDF de Préstamos' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Cumplimiento */}
              <PermissionSection
                title="✅ Cumplimientos y Vencimientos"
                permissions={[
                  { key: 'can_view_compliance', label: 'Ver Cumplimientos' },
                  { key: 'can_create_compliance', label: 'Crear Cumplimientos' },
                  { key: 'can_edit_compliance', label: 'Editar Cumplimientos' },
                  { key: 'can_delete_compliance', label: 'Eliminar Cumplimientos' },
                  { key: 'can_download_compliance_reports', label: 'Descargar Reportes' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* RAAT */}
              <PermissionSection
                title="🔍 RAAT (Registro de Accidentes)"
                permissions={[
                  { key: 'can_view_raat', label: 'Ver RAAT' },
                  { key: 'can_create_raat', label: 'Crear Registros RAAT' },
                  { key: 'can_edit_raat', label: 'Editar Registros RAAT' },
                  { key: 'can_delete_raat', label: 'Eliminar Registros RAAT' },
                  { key: 'can_download_raat_reports', label: 'Descargar Reportes RAAT' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Banco de Documentos */}
              <PermissionSection
                title="📁 Banco de Documentos"
                permissions={[
                  { key: 'can_view_documents', label: 'Ver Banco de Documentos' },
                  { key: 'can_upload_documents', label: 'Subir Documentos' },
                  { key: 'can_download_documents', label: 'Descargar Documentos' },
                  { key: 'can_edit_documents', label: 'Editar Metadatos' },
                  { key: 'can_delete_documents', label: 'Eliminar Documentos' },
                  { key: 'can_manage_document_categories', label: 'Gestionar Categorías' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Departamentos */}
              <PermissionSection
                title="🏢 Departamentos"
                permissions={[
                  { key: 'can_view_departments', label: 'Ver Departamentos' },
                  { key: 'can_create_departments', label: 'Crear Departamentos' },
                  { key: 'can_edit_departments', label: 'Editar Departamentos' },
                  { key: 'can_delete_departments', label: 'Eliminar Departamentos' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Centros de Costo */}
              <PermissionSection
                title="💰 Centros de Costo"
                permissions={[
                  { key: 'can_view_cost_centers', label: 'Ver Centros de Costo' },
                  { key: 'can_create_cost_centers', label: 'Crear Centros de Costo' },
                  { key: 'can_edit_cost_centers', label: 'Editar Centros de Costo' },
                  { key: 'can_delete_cost_centers', label: 'Eliminar Centros de Costo' },
                  { key: 'can_assign_cost_centers', label: 'Asignar Trabajadores' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Organigrama */}
              <PermissionSection
                title="🌳 Organigrama"
                permissions={[
                  { key: 'can_view_org_chart', label: 'Ver Organigrama' },
                  { key: 'can_edit_org_chart', label: 'Editar Estructura Jerárquica' },
                  { key: 'can_download_org_chart', label: 'Descargar Organigrama' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />

              {/* Configuración */}
              <PermissionSection
                title="⚙️ Configuración del Sistema"
                permissions={[
                  { key: 'can_edit_company_settings', label: 'Editar Datos de Empresa (RUT, Razón Social, etc.)' },
                  { key: 'can_manage_indicators', label: 'Gestionar Indicadores Económicos (UF, UTM, etc.)' },
                  { key: 'can_manage_signatures', label: 'Gestionar Firmas Digitales' },
                  { key: 'can_manage_tax_brackets', label: 'Gestionar Tramos Tributarios' },
                  { key: 'can_manage_users_roles', label: 'Gestionar Usuarios y Roles' },
                ]}
                formData={permissionsFormData}
                onToggle={togglePermission}
              />
            </div>

            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => setShowPermissionsModal(false)}
              >
                Cancelar
              </button>
              <button onClick={handleSavePermissions}>
                Guardar Permisos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente auxiliar para secciones de permisos
function PermissionSection({
  title,
  permissions,
  formData,
  onToggle,
}: {
  title: string
  permissions: Array<{ key: keyof UserPermissions; label: string }>
  formData: Partial<UserPermissions>
  onToggle: (key: keyof UserPermissions) => void
}) {
  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        background: '#f9fafb',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
        {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
        {permissions.map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            onClick={() => onToggle(key)}
          >
            <span style={{ fontSize: '14px', color: '#374151' }}>{label}</span>
            {formData[key] ? (
              <FaToggleOn size={24} style={{ color: '#10b981' }} />
            ) : (
              <FaToggleOff size={24} style={{ color: '#9ca3af' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
