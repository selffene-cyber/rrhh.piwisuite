'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    employer_name: '',
    rut: '',
    address: '',
    city: '',
  })

  useEffect(() => {
    loadCompany()
  }, [])

  const loadCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setFormData({
          name: data.name || '',
          employer_name: data.employer_name || '',
          rut: data.rut || '',
          address: data.address || '',
          city: data.city || '',
        })
      }
    } catch (error: any) {
      alert('Error al cargar configuración: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Intentar actualizar primero
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single()

      if (existing) {
        const { error } = await supabase
          .from('companies')
          .update(formData)
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Si no existe, crear
        const { error } = await supabase
          .from('companies')
          .insert(formData)

        if (error) throw error
      }

      alert('Configuración guardada correctamente')
    } catch (error: any) {
      alert('Error al guardar configuración: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Configuración</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/settings/indicators">
            <button>Indicadores Previsionales</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Configuración de Empresa</h2>
        <p style={{ marginBottom: '24px', color: '#6b7280' }}>
          Estos datos aparecerán automáticamente en el encabezado de cada liquidación de sueldo.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Razón Social *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre de la empresa"
            />
          </div>
          <div className="form-group">
            <label>Nombre del Empleador *</label>
            <input
              type="text"
              required
              value={formData.employer_name}
              onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
              placeholder="Nombre completo del empleador"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>RUT Empresa/Empleador *</label>
              <input
                type="text"
                required
                value={formData.rut}
                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                placeholder="12.345.678-9"
              />
            </div>
            <div className="form-group">
              <label>Ciudad / Sucursal</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ciudad o sucursal"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Dirección completa"
            />
          </div>

          <div style={{ marginTop: '32px' }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

