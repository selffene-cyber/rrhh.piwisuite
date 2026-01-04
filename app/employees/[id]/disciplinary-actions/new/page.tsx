'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function NewDisciplinaryActionPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [loading, setLoading] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [riohsRules, setRiohsRules] = useState<any[]>([])
  const [formData, setFormData] = useState({
    type: 'written' as 'verbal' | 'written',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0, 5),
    location: '',
    site_client: '',
    riohs_rule_id: '',
    facts: '',
    evidence: [] as any[],
    witnesses: [] as any[],
  })
  const [witnessInput, setWitnessInput] = useState({
    name: '',
    position: '',
    contact: '',
  })

  useEffect(() => {
    if (currentCompany && params.id) {
      loadData()
    }
  }, [currentCompany, params.id])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      // Cargar trabajador
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('id', params.id)
        .single()

      setEmployee(empData)

      // Cargar reglas RIOHS
      const response = await fetch(
        `/api/riohs-rules?company_id=${currentCompany.id}`
      )
      const rules = await response.json()
      setRiohsRules(rules)
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCompany) return

    setLoading(true)

    try {
      // Combinar fecha y hora
      const incidentDateTime = `${formData.incident_date}T${formData.incident_time}:00`

      const response = await fetch('/api/disciplinary-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: currentCompany.id,
          employee_id: params.id,
          type: formData.type,
          incident_date: incidentDateTime,
          location: formData.location || null,
          site_client: formData.site_client || null,
          riohs_rule_id: formData.riohs_rule_id || null,
          facts: formData.facts,
          evidence: formData.evidence.length > 0 ? formData.evidence : null,
          witnesses: formData.witnesses.length > 0 ? formData.witnesses : null,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear amonestación')
      }

      const action = await response.json()
      alert('Amonestación creada correctamente')
      router.push(`/employees/${params.id}/disciplinary-actions/${action.id}`)
    } catch (error: any) {
      alert('Error al crear amonestación: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const addWitness = () => {
    if (!witnessInput.name.trim()) {
      alert('El nombre del testigo es requerido')
      return
    }

    setFormData({
      ...formData,
      witnesses: [...formData.witnesses, { ...witnessInput }],
    })
    setWitnessInput({ name: '', position: '', contact: '' })
  }

  const removeWitness = (index: number) => {
    setFormData({
      ...formData,
      witnesses: formData.witnesses.filter((_, i) => i !== index),
    })
  }

  if (!currentCompany) {
    return (
      <div>
        <h1>Nueva Amonestación</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para crear una amonestación.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nueva Amonestación</h1>
        <Link href={`/employees/${params.id}/disciplinary-actions`}>
          <button className="secondary">Volver</button>
        </Link>
      </div>

      {employee && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>Trabajador</h3>
          <p><strong>{employee.full_name}</strong> - {employee.rut}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Datos del Incidente</h2>

          <div className="form-group">
            <label>Tipo de Amonestación *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'verbal' | 'written' })}
              required
            >
              <option value="verbal">Verbal</option>
              <option value="written">Escrita</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha del Incidente *</label>
              <input
                type="date"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Hora del Incidente *</label>
              <input
                type="time"
                value={formData.incident_time}
                onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Lugar</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ej: Faena minera, Oficina central"
            />
          </div>

          <div className="form-group">
            <label>Faena/Cliente</label>
            <input
              type="text"
              value={formData.site_client}
              onChange={(e) => setFormData({ ...formData, site_client: e.target.value })}
              placeholder="Ej: Copiapó, Proyecto XYZ"
            />
          </div>
        </div>

        <div className="card">
          <h2>Norma Interna Infringida (RIOHS)</h2>
          <div className="form-group">
            <label>Regla del Reglamento Interno</label>
            <select
              value={formData.riohs_rule_id}
              onChange={(e) => setFormData({ ...formData, riohs_rule_id: e.target.value })}
            >
              <option value="">Seleccionar regla (opcional)</option>
              {riohsRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.code} - {rule.title}
                </option>
              ))}
            </select>
            {riohsRules.length === 0 && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                No hay reglas RIOHS configuradas. Puedes crear una desde la configuración.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Descripción de los Hechos *</h2>
          <div className="form-group">
            <label>
              Describe objetivamente los hechos ocurridos (sin opiniones ni adjetivos):
            </label>
            <textarea
              value={formData.facts}
              onChange={(e) => setFormData({ ...formData, facts: e.target.value })}
              required
              rows={8}
              placeholder="Ej: El día [fecha] a las [hora], el trabajador ingresó al área restringida sin autorización y sin usar el EPP requerido..."
            />
          </div>
        </div>

        <div className="card">
          <h2>Testigos (Opcional)</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={witnessInput.name}
                onChange={(e) => setWitnessInput({ ...witnessInput, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Cargo</label>
              <input
                type="text"
                value={witnessInput.position}
                onChange={(e) => setWitnessInput({ ...witnessInput, position: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Contacto</label>
              <input
                type="text"
                value={witnessInput.contact}
                onChange={(e) => setWitnessInput({ ...witnessInput, contact: e.target.value })}
                placeholder="Email o teléfono"
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" onClick={addWitness} className="secondary">
                Agregar
              </button>
            </div>
          </div>

          {formData.witnesses.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3>Testigos Agregados</h3>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>Contacto</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.witnesses.map((witness, index) => (
                    <tr key={index}>
                      <td>{witness.name}</td>
                      <td>{witness.position || '-'}</td>
                      <td>{witness.contact || '-'}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeWitness(index)}
                          className="danger"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Crear Amonestación'}
          </button>
          <Link href={`/employees/${params.id}/disciplinary-actions`}>
            <button type="button" className="secondary">
              Cancelar
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}

