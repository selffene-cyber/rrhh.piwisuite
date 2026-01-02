'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewCompanyPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    employer_name: '',
    rut: '',
    address: '',
    city: '',
    owner_email: '', // Email del usuario que será owner
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          employer_name: formData.employer_name,
          rut: formData.rut,
          address: formData.address || null,
          city: formData.city || null,
          // owner_id se manejará en el backend si se proporciona owner_email
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear empresa')
      }

      // Si se proporcionó owner_email, asignarlo como owner
      if (formData.owner_email) {
        // Buscar usuario por email y asignarlo
        // Esto se puede mejorar con una API específica
        // Por ahora, el backend asignará el usuario actual como owner si no se proporciona owner_id
      }

      alert('Empresa creada exitosamente')
      router.push('/admin/companies')
    } catch (error: any) {
      alert('Error al crear empresa: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/companies">← Volver a Empresas</Link>
      </div>

      <div className="card">
        <h1>Nueva Empresa</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre de la Empresa *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Mi Empresa S.A."
              />
            </div>
            <div className="form-group">
              <label>RUT *</label>
              <input
                type="text"
                required
                value={formData.rut}
                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                placeholder="Ej: 76.123.456-7"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nombre del Empleador *</label>
              <input
                type="text"
                required
                value={formData.employer_name}
                onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div className="form-group">
              <label>Ciudad</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ej: Santiago"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej: Av. Principal 123"
            />
          </div>

          <div className="form-group">
            <label>Email del Propietario (opcional)</label>
            <input
              type="email"
              value={formData.owner_email}
              onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
              placeholder="usuario@ejemplo.com"
            />
            <small style={{ color: '#6b7280', fontSize: '12px' }}>
              Si no se especifica, el usuario actual será el propietario
            </small>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Empresa'}
            </button>
            <Link href="/admin/companies">
              <button type="button" className="secondary">
                Cancelar
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

