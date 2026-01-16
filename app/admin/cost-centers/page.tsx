'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { CostCenter } from '@/types'
import {
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  isCompanyAdmin,
} from '@/lib/services/costCenterService'
import { FaBuilding, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa'

export default function CostCentersPage() {
  const { companyId, company } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  })
  const [saving, setSaving] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)

  useEffect(() => {
    if (companyId) {
      checkPermissions()
      loadCostCenters()
    }
  }, [companyId, includeInactive])

  const checkPermissions = async () => {
    if (!companyId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const admin = await isCompanyAdmin(user.id, companyId, supabase)
      setIsAdmin(admin)
    } catch (error) {
      console.error('Error verificando permisos:', error)
    }
  }

  const loadCostCenters = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const data = await getCostCenters(companyId, supabase, includeInactive)
      setCostCenters(data)
    } catch (error: any) {
      alert('Error al cargar centros de costo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      status: 'active',
    })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (cc: CostCenter) => {
    setFormData({
      code: cc.code,
      name: cc.name,
      description: cc.description || '',
      status: cc.status as 'active' | 'inactive',
    })
    setEditingId(cc.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!companyId) return
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('El código y nombre son obligatorios')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateCostCenter(editingId, formData, supabase)
      } else {
        await createCostCenter(companyId, formData, supabase)
      }
      setShowForm(false)
      setEditingId(null)
      loadCostCenters()
      alert(editingId ? 'Centro de costo actualizado' : 'Centro de costo creado')
    } catch (error: any) {
      alert('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este centro de costo?')) {
      return
    }

    try {
      await deleteCostCenter(id, supabase)
      loadCostCenters()
      alert('Centro de costo eliminado')
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message)
    }
  }

  const handleToggleStatus = async (cc: CostCenter) => {
    try {
      await updateCostCenter(cc.id, {
        status: cc.status === 'active' ? 'inactive' : 'active',
      }, supabase)
      loadCostCenters()
    } catch (error: any) {
      alert('Error al cambiar estado: ' + error.message)
    }
  }

  if (!company) {
    return (
      <div>
        <h1>Centros de Costo</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para gestionar centros de costo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}>
            <FaBuilding size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Centros de Costo</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Catálogo de centros de costo de {company.name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button onClick={handleNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus /> Nuevo Centro de Costo
            </button>
          )}
          <Link href="/organigrama">
            <button className="secondary">Volver a Organización</button>
          </Link>
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            userSelect: 'none'
          }}>
            <div style={{
              position: 'relative',
              width: '48px',
              height: '24px',
              borderRadius: '12px',
              background: includeInactive ? '#3b82f6' : '#d1d5db',
              transition: 'background-color 0.2s ease',
              cursor: 'pointer'
            }}>
              <div style={{
                position: 'absolute',
                top: '2px',
                left: includeInactive ? '26px' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Incluir centros de costo inactivos
            </span>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
          </label>
        </div>
      )}

      {showForm && isAdmin && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>{editingId ? 'Editar' : 'Nuevo'} Centro de Costo</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Código *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="CC-001"
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Planta Coquimbo"
                disabled={saving}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del centro de costo"
                rows={3}
                disabled={saving}
              />
            </div>
          </div>
          {editingId && (
            <div className="form-row">
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  disabled={saving}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p>Cargando centros de costo...</p>
        </div>
      ) : costCenters.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            {isAdmin
              ? 'No hay centros de costo registrados. Crea uno nuevo para comenzar.'
              : 'No tienes centros de costo asignados.'}
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Lista de Centros de Costo ({costCenters.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  {isAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {costCenters.map((cc) => (
                  <tr key={cc.id}>
                    <td style={{ fontWeight: '600' }}>{cc.code}</td>
                    <td>{cc.name}</td>
                    <td style={{ color: '#6b7280' }}>{cc.description || '-'}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: cc.status === 'active' ? '#10b98120' : '#6b728020',
                          color: cc.status === 'active' ? '#10b981' : '#6b7280',
                          border: `1px solid ${cc.status === 'active' ? '#10b981' : '#6b7280'}`,
                        }}
                      >
                        {cc.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="secondary"
                            onClick={() => handleEdit(cc)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Editar"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(cc)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              background: cc.status === 'active' ? '#6b7280' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            title={cc.status === 'active' ? 'Desactivar' : 'Activar'}
                          >
                            {cc.status === 'active' ? <FaTimes size={12} /> : <FaCheck size={12} />}
                          </button>
                          <button
                            className="danger"
                            onClick={() => handleDelete(cc.id)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Eliminar"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}





