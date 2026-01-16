'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { Department, DepartmentWithChildren } from '@/lib/services/departmentService'
import { FaBuilding, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa'

export default function DepartmentsPage() {
  const { companyId, company } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<DepartmentWithChildren[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'active' as 'active' | 'inactive',
    parent_department_id: null as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (companyId) {
      loadDepartments()
    }
  }, [companyId, includeInactive])

  const loadDepartments = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const status = includeInactive ? 'all' : 'active'
      const response = await fetch(`/api/departments?company_id=${companyId}&status=${status}`)
      if (!response.ok) throw new Error('Error al cargar departamentos')
      
      const data: DepartmentWithChildren[] = await response.json()
      
      // Construir árbol jerárquico
      const departmentMap = new Map<string, DepartmentWithChildren>()
      const roots: DepartmentWithChildren[] = []

      // Crear mapa
      data.forEach((dept) => {
        departmentMap.set(dept.id, { ...dept, children: [] })
      })

      // Construir jerarquía
      data.forEach((dept) => {
        const node = departmentMap.get(dept.id)!
        if (!dept.parent_department_id || !departmentMap.has(dept.parent_department_id)) {
          roots.push(node)
        } else {
          const parent = departmentMap.get(dept.parent_department_id)!
          if (!parent.children) parent.children = []
          parent.children.push(node)
        }
      })

      setDepartments(roots)
      
      // Expandir todos los nodos por defecto
      const allIds = new Set<string>()
      const collectIds = (nodes: DepartmentWithChildren[]) => {
        nodes.forEach(node => {
          allIds.add(node.id)
          if (node.children && node.children.length > 0) {
            collectIds(node.children)
          }
        })
      }
      collectIds(roots)
      setExpandedNodes(allIds)
    } catch (error: any) {
      alert('Error al cargar departamentos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setFormData({
      name: '',
      code: '',
      status: 'active',
      parent_department_id: null,
    })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (dept: Department) => {
    setFormData({
      name: dept.name,
      code: dept.code || '',
      status: dept.status,
      parent_department_id: dept.parent_department_id || null,
    })
    setEditingId(dept.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!companyId) return
    if (!formData.name.trim()) {
      alert('El nombre es obligatorio')
      return
    }

    setSaving(true)
    try {
      const url = editingId 
        ? `/api/departments/${editingId}`
        : '/api/departments'
      
      const method = editingId ? 'PATCH' : 'POST'
      
      const body = editingId
        ? {
            name: formData.name.trim(),
            code: formData.code.trim() || null,
            status: formData.status,
            parent_department_id: formData.parent_department_id || null,
          }
        : {
            company_id: companyId,
            name: formData.name.trim(),
            code: formData.code.trim() || null,
            status: formData.status,
            parent_department_id: formData.parent_department_id || null,
          }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }

      setShowForm(false)
      setEditingId(null)
      loadDepartments()
      alert(editingId ? 'Departamento actualizado' : 'Departamento creado')
    } catch (error: any) {
      alert('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este departamento?')) {
      return
    }

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar')
      }

      loadDepartments()
      alert('Departamento desactivado')
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message)
    }
  }

  const handleToggleStatus = async (dept: Department) => {
    try {
      const response = await fetch(`/api/departments/${dept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: dept.status === 'active' ? 'inactive' : 'active',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cambiar estado')
      }

      loadDepartments()
    } catch (error: any) {
      alert('Error al cambiar estado: ' + error.message)
    }
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedNodes(newExpanded)
  }

  // Verificar si un departamento es descendiente de otro
  const isDescendant = (potentialParentId: string, childId: string): boolean => {
    const findNode = (nodes: DepartmentWithChildren[], targetId: string): DepartmentWithChildren | null => {
      for (const node of nodes) {
        if (node.id === targetId) return node
        if (node.children && node.children.length > 0) {
          const found = findNode(node.children, targetId)
          if (found) return found
        }
      }
      return null
    }

    const childNode = findNode(departments, childId)
    if (!childNode) return false

    let current: DepartmentWithChildren | null = childNode
    while (current) {
      if (current.parent_department_id === potentialParentId) return true
      if (!current.parent_department_id) break
      current = findNode(departments, current.parent_department_id)
    }
    return false
  }

  // Obtener lista plana de departamentos para el selector de padre
  const getFlatDepartments = (nodes: DepartmentWithChildren[]): Department[] => {
    const result: Department[] = []
    const traverse = (nodeList: DepartmentWithChildren[]) => {
      nodeList.forEach(node => {
        result.push(node)
        if (node.children && node.children.length > 0) {
          traverse(node.children)
        }
      })
    }
    traverse(nodes)
    return result
  }

  const flatDepartments = getFlatDepartments(departments)
  const availableParents = flatDepartments.filter(
    d => !editingId || (d.id !== editingId && !isDescendant(d.id, editingId))
  )

  // Filtrar departamentos por búsqueda
  const filterDepartments = (nodes: DepartmentWithChildren[]): DepartmentWithChildren[] => {
    if (!searchTerm) return nodes

    const filtered: DepartmentWithChildren[] = []
    nodes.forEach(node => {
      const matches = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     (node.code && node.code.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const filteredChildren = node.children ? filterDepartments(node.children) : []
      const hasMatchingChildren = filteredChildren.length > 0

      if (matches || hasMatchingChildren) {
        filtered.push({
          ...node,
          children: hasMatchingChildren ? filteredChildren : node.children,
        })
      }
    })
    return filtered
  }

  const filteredDepartments = filterDepartments(departments)

  // Renderizar árbol
  const renderTree = (nodes: DepartmentWithChildren[], level: number = 0) => {
    return nodes.map((dept) => {
      const hasChildren = dept.children && dept.children.length > 0
      const isExpanded = expandedNodes.has(dept.id)

      return (
        <div key={dept.id}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              paddingLeft: `${16 + level * 24}px`,
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: level % 2 === 0 ? '#ffffff' : '#f9fafb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(dept.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                </button>
              ) : (
                <div style={{ width: '20px' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '600' }}>{dept.name}</span>
                  {dept.code && (
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>({dept.code})</span>
                  )}
                  <span
                    className="badge"
                    style={{
                      backgroundColor: dept.status === 'active' ? '#10b98120' : '#6b728020',
                      color: dept.status === 'active' ? '#10b981' : '#6b7280',
                      border: `1px solid ${dept.status === 'active' ? '#10b981' : '#6b7280'}`,
                      fontSize: '11px',
                    }}
                  >
                    {dept.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {dept.parent_department && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Padre: {dept.parent_department.name}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="secondary"
                  onClick={() => handleEdit(dept)}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  title="Editar"
                >
                  <FaEdit size={12} />
                </button>
                <button
                  onClick={() => handleToggleStatus(dept)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: dept.status === 'active' ? '#6b7280' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title={dept.status === 'active' ? 'Desactivar' : 'Activar'}
                >
                  {dept.status === 'active' ? <FaTimes size={12} /> : <FaCheck size={12} />}
                </button>
                <button
                  className="danger"
                  onClick={() => handleDelete(dept.id)}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  title="Desactivar"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            </div>
          </div>
          {hasChildren && isExpanded && dept.children && (
            <div>
              {renderTree(dept.children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (!company) {
    return (
      <div>
        <h1>Departamentos</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para gestionar departamentos.
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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Departamentos</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Estructura organizacional de {company.name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaPlus /> Nuevo Departamento
          </button>
          <Link href="/settings">
            <button className="secondary">Volver a Configuración</button>
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Buscar departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
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
              Incluir inactivos
            </span>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
          </label>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>{editingId ? 'Editar' : 'Nuevo'} Departamento</h2>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Gerencia"
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label>Código</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="GER"
                disabled={saving}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Departamento Padre</label>
              <select
                value={formData.parent_department_id || ''}
                onChange={(e) => setFormData({ ...formData, parent_department_id: e.target.value || null })}
                disabled={saving}
              >
                <option value="">Sin padre (raíz)</option>
                {availableParents.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} {dept.code && `(${dept.code})`}
                  </option>
                ))}
              </select>
            </div>
            {editingId && (
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
            )}
          </div>
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
          <p>Cargando departamentos...</p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            {searchTerm
              ? 'No se encontraron departamentos que coincidan con la búsqueda.'
              : 'No hay departamentos registrados. Crea uno nuevo para comenzar.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0 }}>Estructura de Departamentos ({flatDepartments.length})</h2>
          </div>
          <div>
            {renderTree(filteredDepartments)}
          </div>
        </div>
      )}
    </div>
  )
}

