'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaShieldAlt, FaSave, FaTimes, FaTrash, FaEdit } from 'react-icons/fa'

// Componente ToggleSwitch
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ display: 'none' }}
        />
        <div
          style={{
            width: '48px',
            height: '24px',
            borderRadius: '12px',
            background: checked ? '#3b82f6' : '#d1d5db',
            position: 'relative',
            transition: 'background 0.2s',
            cursor: 'pointer',
          }}
          onClick={() => onChange(!checked)}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '2px',
              left: checked ? '26px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        </div>
        {label && <span style={{ marginLeft: '8px', fontSize: '14px' }}>{label}</span>}
      </label>
    </div>
  )
}

const TIPO_OPTIONS = [
  { value: 'CERTIFICADO', label: 'Certificado' },
  { value: 'LICENCIA', label: 'Licencia' },
  { value: 'CURSO', label: 'Curso' },
  { value: 'EXAMEN', label: 'Examen' },
  { value: 'OTRO', label: 'Otro' },
]

const CRITICIDAD_OPTIONS = [
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
]

export default function ComplianceItemsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company: currentCompany, companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'CERTIFICADO',
    vigencia_dias: 365,
    requiere_evidencia: true,
    criticidad: 'MEDIA',
    aplica_a_cargo: false,
    aplica_a_cc: false,
    aplica_a_condicion: '',
    descripcion: '',
  })

  useEffect(() => {
    if (companyId) {
      loadItems()
    }
  }, [companyId])

  useEffect(() => {
    // Si hay parámetro create=true, mostrar el formulario
    if (searchParams.get('create') === 'true') {
      setShowForm(true)
      // Limpiar el parámetro de la URL
      router.replace('/compliance/items', { scroll: false })
    }
  }, [searchParams, router])

  const loadItems = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/compliance/items?company_id=${companyId}`)
      if (!response.ok) throw new Error('Error al cargar ítems')
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error cargando ítems:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    try {
      const url = editingItem
        ? `/api/compliance/items/${editingItem.id}`
        : '/api/compliance/items'
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al guardar ítem')
        return
      }

      setShowForm(false)
      setEditingItem(null)
      setFormData({
        nombre: '',
        tipo: 'CERTIFICADO',
        vigencia_dias: 365,
        requiere_evidencia: true,
        criticidad: 'MEDIA',
        aplica_a_cargo: false,
        aplica_a_cc: false,
        aplica_a_condicion: '',
        descripcion: '',
      })
      loadItems()
    } catch (error) {
      console.error('Error guardando ítem:', error)
      alert('Error al guardar ítem')
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      nombre: item.nombre,
      tipo: item.tipo,
      vigencia_dias: item.vigencia_dias,
      requiere_evidencia: item.requiere_evidencia,
      criticidad: item.criticidad,
      aplica_a_cargo: item.aplica_a_cargo,
      aplica_a_cc: item.aplica_a_cc,
      aplica_a_condicion: item.aplica_a_condicion || '',
      descripcion: item.descripcion || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ítem?')) return

    try {
      const response = await fetch(`/api/compliance/items/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al eliminar ítem')
        return
      }

      loadItems()
    } catch (error) {
      console.error('Error eliminando ítem:', error)
      alert('Error al eliminar ítem')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Cargando ítems...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
            <FaShieldAlt size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Ítems de Cumplimiento</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Catálogo de certificados, licencias y cursos obligatorios
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingItem(null)
            setFormData({
              nombre: '',
              tipo: 'CERTIFICADO',
              vigencia_dias: 365,
              requiere_evidencia: true,
              criticidad: 'MEDIA',
              aplica_a_cargo: false,
              aplica_a_cc: false,
              aplica_a_condicion: '',
              descripcion: '',
            })
            setShowForm(true)
          }}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          + Crear Ítem
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              {editingItem ? 'Editar Ítem' : 'Nuevo Ítem'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingItem(null)
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '20px',
              }}
            >
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  {TIPO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Vigencia (días) *
                </label>
                <input
                  type="number"
                  value={formData.vigencia_dias}
                  onChange={(e) => setFormData({ ...formData, vigencia_dias: parseInt(e.target.value) || 365 })}
                  required
                  min="1"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Criticidad *
                </label>
                <select
                  value={formData.criticidad}
                  onChange={(e) => setFormData({ ...formData, criticidad: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  {CRITICIDAD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <ToggleSwitch
                checked={formData.requiere_evidencia}
                onChange={(checked) => setFormData({ ...formData, requiere_evidencia: checked })}
                label="Requiere evidencia"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingItem(null)
                }}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FaSave size={16} />
                {editingItem ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de ítems */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Nombre</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Vigencia</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Criticidad</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Requiere Evidencia</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  No hay ítems registrados
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{item.nombre}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#f3f4f6', fontSize: '12px' }}>
                      {TIPO_OPTIONS.find((opt) => opt.value === item.tipo)?.label || item.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{item.vigencia_dias} días</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: item.criticidad === 'ALTA' ? '#fee2e2' : item.criticidad === 'MEDIA' ? '#fef3c7' : '#d1fae5',
                        color: item.criticidad === 'ALTA' ? '#991b1b' : item.criticidad === 'MEDIA' ? '#92400e' : '#065f46',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {item.criticidad}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {item.requiere_evidencia ? (
                      <span style={{ color: '#10b981', fontWeight: '500' }}>Sí</span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>No</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEdit(item)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                        title="Editar"
                      >
                        <FaEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        title="Eliminar"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

