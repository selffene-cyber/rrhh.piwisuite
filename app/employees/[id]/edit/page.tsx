'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { AVAILABLE_AFPS, AVAILABLE_HEALTH_SYSTEMS } from '@/lib/services/previredAPI'

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    rut: '',
    birth_date: '',
    address: '',
    phone: '',
    email: '',
    hire_date: '',
    position: '',
    cost_center: '',
    afp: 'PROVIDA',
    health_system: 'FONASA',
    health_plan: '',
    health_plan_percentage: '',
    base_salary: '',
    transportation: '',
    meal_allowance: '',
    requests_advance: false,
    advance_amount: '',
    status: 'active',
    contract_type: 'indefinido',
    contract_end_date: '',
    contract_other: '',
  })

  useEffect(() => {
    loadEmployee()
  }, [])

  const loadEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          full_name: data.full_name,
          rut: data.rut,
          birth_date: data.birth_date || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          hire_date: data.hire_date,
          position: data.position,
          cost_center: data.cost_center || '',
          afp: data.afp,
          health_system: data.health_system,
          health_plan: data.health_plan || '',
          health_plan_percentage: (data.health_plan_percentage || 0).toString(),
          base_salary: data.base_salary.toString(),
          transportation: (data.transportation || 0).toString(),
          meal_allowance: (data.meal_allowance || 0).toString(),
          requests_advance: data.requests_advance || false,
          advance_amount: (data.advance_amount || 0).toString(),
          status: data.status,
          contract_type: data.contract_type || 'indefinido',
          contract_end_date: data.contract_end_date || '',
          contract_other: data.contract_other || '',
        })
      }
    } catch (error: any) {
      alert('Error al cargar trabajador: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validar porcentaje del plan ISAPRE
      if (formData.health_system === 'ISAPRE') {
        const planPercentage = parseFloat(formData.health_plan_percentage)
        if (isNaN(planPercentage) || planPercentage < 0) {
          alert('El porcentaje del plan ISAPRE debe ser un número mayor o igual a 0')
          setSaving(false)
          return
        }
      }

      // Validar anticipo
      const baseSalary = parseFloat(formData.base_salary)
      const maxAdvance = baseSalary * 0.5
      let advanceAmount = 0
      
      if (formData.requests_advance) {
        advanceAmount = parseFloat(formData.advance_amount) || 0
        if (advanceAmount > maxAdvance) {
          alert(`El anticipo no puede ser mayor al 50% del sueldo base (máximo: $${maxAdvance.toLocaleString('es-CL')})`)
          setSaving(false)
          return
        }
        if (advanceAmount < 0) {
          alert('El anticipo no puede ser negativo')
          setSaving(false)
          return
        }
      }

      const updateData: any = {
        ...formData,
        base_salary: baseSalary,
        transportation: parseFloat(formData.transportation) || 0,
        meal_allowance: parseFloat(formData.meal_allowance) || 0,
        requests_advance: formData.requests_advance,
        advance_amount: formData.requests_advance ? advanceAmount : 0,
        contract_type: formData.contract_type,
        contract_end_date: formData.contract_type === 'plazo_fijo' ? formData.contract_end_date : null,
        contract_other: formData.contract_type === 'otro' ? formData.contract_other : null,
      }

      // Porcentaje del plan ISAPRE
      if (formData.health_system === 'ISAPRE') {
        updateData.health_plan_percentage = parseFloat(formData.health_plan_percentage) || 0
      } else {
        updateData.health_plan_percentage = 0
      }

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      router.push(`/employees/${params.id}`)
    } catch (error: any) {
      alert('Error al actualizar trabajador: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      <h1>Editar Trabajador</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <h2>Datos Personales</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre Completo *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>RUT *</label>
              <input
                type="text"
                required
                value={formData.rut}
                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Nacimiento</label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <h2 style={{ marginTop: '32px' }}>Datos Laborales</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Ingreso *</label>
              <input
                type="date"
                required
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Cargo *</label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Centro de Costo</label>
              <input
                type="text"
                value={formData.cost_center}
                onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Sueldo Base *</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Movilización</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.transportation}
                onChange={(e) => setFormData({ ...formData, transportation: e.target.value })}
                placeholder="0"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Este valor aparecerá precargado en las liquidaciones
              </small>
            </div>
            <div className="form-group">
              <label>Colación</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.meal_allowance}
                onChange={(e) => setFormData({ ...formData, meal_allowance: e.target.value })}
                placeholder="0"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Este valor aparecerá precargado en las liquidaciones
              </small>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Solicita Anticipo?</label>
              <select
                value={formData.requests_advance ? 'yes' : 'no'}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  requests_advance: e.target.value === 'yes',
                  advance_amount: e.target.value === 'no' ? '0' : formData.advance_amount
                })}
              >
                <option value="no">No</option>
                <option value="yes">Sí</option>
              </select>
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Este valor aparecerá precargado en las liquidaciones
              </small>
            </div>
            {formData.requests_advance && (
              <div className="form-group">
                <label>Monto del Anticipo *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  max={formData.base_salary ? (parseFloat(formData.base_salary) * 0.5).toString() : ''}
                  value={formData.advance_amount}
                  onChange={(e) => {
                    const value = e.target.value
                    const maxAdvance = formData.base_salary ? parseFloat(formData.base_salary) * 0.5 : 0
                    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= maxAdvance)) {
                      setFormData({ ...formData, advance_amount: value })
                    }
                  }}
                  placeholder="0"
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Máximo: ${formData.base_salary ? (parseFloat(formData.base_salary) * 0.5).toLocaleString('es-CL') : '0'} (50% del sueldo base)
                </small>
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>AFP *</label>
              <select
                required
                value={formData.afp}
                onChange={(e) => setFormData({ ...formData, afp: e.target.value })}
              >
                {AVAILABLE_AFPS.map((afp) => (
                  <option key={afp.value} value={afp.value}>
                    {afp.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Sistema de Salud *</label>
              <select
                required
                value={formData.health_system}
                onChange={(e) => setFormData({ ...formData, health_system: e.target.value })}
              >
                {AVAILABLE_HEALTH_SYSTEMS.map((system) => (
                  <option key={system.value} value={system.value}>
                    {system.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Plan de Salud</label>
            <input
              type="text"
              value={formData.health_plan}
              onChange={(e) => setFormData({ ...formData, health_plan: e.target.value })}
              placeholder="Nombre del plan (solo si es ISAPRE)"
            />
          </div>
          {formData.health_system === 'ISAPRE' && (
            <div className="form-group">
              <label>Porcentaje del Plan ISAPRE *</label>
              <input
                type="number"
                required
                min="0"
                max="20"
                step="0.1"
                value={formData.health_plan_percentage}
                onChange={(e) => setFormData({ ...formData, health_plan_percentage: e.target.value })}
                placeholder="Ej: 2.5 (para 2.5% adicional)"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Porcentaje adicional del plan ISAPRE. Se sumará al 7% base. Ejemplo: si el plan es 2.5%, ingresa 2.5
              </small>
            </div>
          )}
          <div className="form-group">
            <label>Tipo de Contrato *</label>
            <select
              required
              value={formData.contract_type}
              onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as 'plazo_fijo' | 'indefinido' | 'otro' })}
            >
              <option value="indefinido">Indefinido</option>
              <option value="plazo_fijo">Plazo Fijo</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {formData.contract_type === 'plazo_fijo' && (
            <div className="form-group">
              <label>Fecha de Término del Contrato *</label>
              <input
                type="date"
                required
                value={formData.contract_end_date}
                onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                El sistema te alertará cuando el contrato esté próximo a vencer
              </small>
            </div>
          )}

          {formData.contract_type === 'otro' && (
            <div className="form-group">
              <label>Especificar Tipo de Contrato *</label>
              <input
                type="text"
                required
                value={formData.contract_other}
                onChange={(e) => setFormData({ ...formData, contract_other: e.target.value })}
                placeholder="Ej: Por obra, Honorarios, etc."
              />
            </div>
          )}

          <div className="form-group">
            <label>Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'licencia_medica' | 'renuncia' | 'despido' })}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="licencia_medica">Licencia Médica</option>
              <option value="renuncia">Renuncia</option>
              <option value="despido">Despido</option>
            </select>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => router.back()}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

