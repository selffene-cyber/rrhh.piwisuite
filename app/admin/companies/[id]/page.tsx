'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/date'
import { FaArrowLeft, FaSave, FaUsers, FaBuilding, FaTrash } from 'react-icons/fa'

interface Company {
  id: string
  code: string | null
  name: string
  employer_name: string
  rut: string
  address: string | null
  city: string | null
  status: string
  created_at: string
  updated_at: string
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    employer_name: '',
    rut: '',
    address: '',
    city: '',
    status: 'active',
  })

  useEffect(() => {
    if (companyId) {
      loadCompany()
    }
  }, [companyId])

  const loadCompany = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/companies/${companyId}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          alert('Empresa no encontrada')
          router.push('/admin/companies')
          return
        }
        throw new Error(data.error || 'Error al cargar empresa')
      }

      setCompany(data.company)
      setFormData({
        name: data.company.name || '',
        employer_name: data.company.employer_name || '',
        rut: data.company.rut || '',
        address: data.company.address || '',
        city: data.company.city || '',
        status: data.company.status || 'active',
      })
    } catch (error: any) {
      alert('Error al cargar empresa: ' + error.message)
      router.push('/admin/companies')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.employer_name || !formData.rut) {
      alert('Nombre, Razón Social y RUT son requeridos')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar empresa')
      }

      alert('Empresa actualizada correctamente')
      loadCompany()
    } catch (error: any) {
      alert('Error al actualizar empresa: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar la empresa "${company?.name}"? Esta acción eliminará todos los datos asociados y no se puede deshacer.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar empresa')
      }

      alert('Empresa eliminada correctamente')
      router.push('/admin/companies')
    } catch (error: any) {
      alert('Error al eliminar empresa: ' + error.message)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  if (!company) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Empresa no encontrada</p>
        <Link href="/admin/companies">
          <button className="secondary" style={{ marginTop: '16px' }}>Volver a Empresas</button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/companies" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', textDecoration: 'none', marginBottom: '16px' }}>
          <FaArrowLeft /> Volver a Empresas
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>{company.name}</h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Detalles y configuración de la empresa
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/admin/companies/${companyId}/users`}>
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaUsers /> Usuarios
            </button>
          </Link>
          <button
            onClick={handleDelete}
            className="danger"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaTrash /> Eliminar
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>Información General</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre de la Empresa *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre comercial"
              />
            </div>
            <div className="form-group">
              <label>Razón Social *</label>
              <input
                type="text"
                required
                value={formData.employer_name}
                onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
                placeholder="Razón social legal"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>RUT *</label>
              <input
                type="text"
                required
                value={formData.rut}
                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                placeholder="12.345.678-9"
              />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
                <option value="suspended">Suspendida</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Dirección completa"
              />
            </div>
            <div className="form-group">
              <label>Ciudad</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ciudad"
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
            <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => loadCompany()}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>Información del Sistema</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Código de la Empresa</div>
            <div style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', color: '#3b82f6' }}>
              {company.code || 'Generando...'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>ID (UUID)</div>
            <div style={{ fontSize: '12px', fontWeight: '400', fontFamily: 'monospace', color: '#9ca3af' }}>{company.id}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Fecha de Creación</div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>{formatDate(company.created_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Última Actualización</div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>{formatDate(company.updated_at)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}





