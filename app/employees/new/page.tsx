'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { AVAILABLE_AFPS, AVAILABLE_HEALTH_SYSTEMS } from '@/lib/services/previredAPI'

export default function NewEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validar sueldo base
      const baseSalary = parseFloat(formData.base_salary)
      if (isNaN(baseSalary) || baseSalary <= 0) {
        alert('El sueldo base debe ser un número mayor a 0')
        setLoading(false)
        return
      }

      // Verificar si el RUT ya existe
      const rutTrimmed = formData.rut.trim()
      const { data: existingEmployee, error: checkError } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('rut', rutTrimmed)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar RUT:', checkError)
      }

      if (existingEmployee) {
        alert(`El RUT ${rutTrimmed} ya está registrado para el trabajador: ${existingEmployee.full_name}. Por favor, verifica el RUT o edita el trabajador existente.`)
        setLoading(false)
        return
      }

      // Validar porcentaje del plan ISAPRE
      if (formData.health_system === 'ISAPRE') {
        const planPercentage = parseFloat(formData.health_plan_percentage)
        if (isNaN(planPercentage) || planPercentage < 0) {
          alert('El porcentaje del plan ISAPRE debe ser un número mayor o igual a 0')
          setLoading(false)
          return
        }
      }

      // Limpiar campos vacíos y convertirlos a null
      const employeeData: any = {
        full_name: formData.full_name.trim(),
        rut: formData.rut.trim(),
        hire_date: formData.hire_date,
        position: formData.position.trim(),
        afp: formData.afp,
        health_system: formData.health_system,
        base_salary: baseSalary,
        transportation: parseFloat(formData.transportation) || 0,
        meal_allowance: parseFloat(formData.meal_allowance) || 0,
        status: formData.status,
        contract_type: formData.contract_type,
        contract_end_date: formData.contract_type === 'plazo_fijo' ? formData.contract_end_date : null,
        contract_other: formData.contract_type === 'otro' ? formData.contract_other : null,
      }

      // Agregar campos opcionales solo si tienen valor
      if (formData.birth_date) employeeData.birth_date = formData.birth_date
      if (formData.address?.trim()) employeeData.address = formData.address.trim()
      if (formData.phone?.trim()) employeeData.phone = formData.phone.trim()
      if (formData.email?.trim()) employeeData.email = formData.email.trim()
      if (formData.cost_center?.trim()) employeeData.cost_center = formData.cost_center.trim()
      if (formData.health_plan?.trim()) employeeData.health_plan = formData.health_plan.trim()
      
      // Porcentaje del plan ISAPRE
      if (formData.health_system === 'ISAPRE') {
        employeeData.health_plan_percentage = parseFloat(formData.health_plan_percentage) || 0
      } else {
        employeeData.health_plan_percentage = 0
      }

      console.log('Enviando datos:', employeeData)

      const { data, error } = await supabase
        .from('employees')
        .insert(employeeData)
        .select()

      if (error) {
        console.error('Error de Supabase:', error)
        
        // Manejar errores específicos
        if (error.code === '23505') {
          // Error de clave única duplicada (RUT ya existe)
          alert(`El RUT ${formData.rut} ya está registrado en el sistema. Por favor, verifica el RUT o edita el trabajador existente.`)
        } else if (error.code === '23503') {
          // Error de clave foránea
          alert('Error de referencia: Verifica que los datos relacionados existan.')
        } else if (error.code === '23502') {
          // Error de campo requerido
          alert('Faltan campos requeridos. Por favor, completa todos los campos obligatorios.')
        } else {
          alert('Error al crear trabajador: ' + (error.message || 'Error desconocido'))
        }
        setLoading(false)
        return
      }

      console.log('Trabajador creado exitosamente:', data)
      // Redirigir a la lista de trabajadores
      router.push('/employees')
    } catch (error: any) {
      console.error('Error completo:', error)
      alert('Error al crear trabajador: ' + (error.message || 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Nuevo Trabajador</h1>
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
                placeholder="12.345.678-9"
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
              <label>Monto del Plan ISAPRE (UF) *</label>
              <input
                type="number"
                required
                min="0"
                max="20"
                step="0.01"
                value={formData.health_plan_percentage}
                onChange={(e) => setFormData({ ...formData, health_plan_percentage: e.target.value })}
                placeholder="Ej: 2.4 (para 2.4 UF)"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Monto del plan ISAPRE en Unidades de Fomento (UF). Se calculará automáticamente al momento de la liquidación multiplicando este valor por el valor de UF del día. Ejemplo: si el plan es 2.4 UF, ingresa 2.4
              </small>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>Estado *</label>
              <select
                required
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
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Trabajador'}
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

