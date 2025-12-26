'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'

export default function EditAnnexPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [annex, setAnnex] = useState<any>(null)

  const [formData, setFormData] = useState({
    annex_type: 'modificacion_sueldo',
    start_date: '',
    end_date: '',
    content: '',
    modifications_summary: '',
  })

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      const { data: annexData, error: annexError } = await supabase
        .from('contract_annexes')
        .select('*')
        .eq('id', params.id)
        .single()

      if (annexError) throw annexError

      setAnnex(annexData)
      setFormData({
        annex_type: annexData.annex_type || 'modificacion_sueldo',
        start_date: annexData.start_date || '',
        end_date: annexData.end_date || '',
        content: annexData.content || '',
        modifications_summary: annexData.modifications_summary || '',
      })
    } catch (error: any) {
      alert('Error al cargar anexo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.content) {
        alert('Por favor completa el contenido del anexo')
        return
      }

      const updateData: any = {
        annex_type: formData.annex_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        content: formData.content,
        modifications_summary: formData.modifications_summary || null,
      }

      const { error } = await supabase
        .from('contract_annexes')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      alert('Anexo actualizado correctamente')
      router.push(`/contracts/annex/${params.id}`)
    } catch (error: any) {
      console.error('Error al actualizar anexo:', error)
      alert('Error al actualizar anexo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Editar Anexo</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!annex) {
    return (
      <div>
        <h1>Anexo no encontrado</h1>
        <div className="card">
          <p>El anexo solicitado no existe.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Editar Anexo {annex.annex_number}</h1>
        <button className="secondary" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Tipo de Anexo y Fechas</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Anexo *</label>
              <select
                value={formData.annex_type}
                onChange={(e) => setFormData({ ...formData, annex_type: e.target.value })}
                required
              >
                <option value="modificacion_sueldo">Modificación de Sueldo</option>
                <option value="cambio_cargo">Cambio de Cargo</option>
                <option value="cambio_jornada">Cambio de Jornada</option>
                <option value="prorroga">Prórroga</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de Inicio *</label>
              <DateInput
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha de Término (opcional)</label>
              <DateInput
                value={formData.end_date}
                onChange={(value) => setFormData({ ...formData, end_date: value })}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Contenido del Anexo</h2>
          <div className="form-group">
            <label>Resumen de Modificaciones</label>
            <textarea
              value={formData.modifications_summary}
              onChange={(e) => setFormData({ ...formData, modifications_summary: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Contenido Completo del Anexo *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button" className="secondary" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}


