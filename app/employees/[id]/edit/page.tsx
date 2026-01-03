'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { AVAILABLE_AFPS, AVAILABLE_HEALTH_SYSTEMS } from '@/lib/services/previredAPI'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { CostCenter } from '@/types'
import { getCostCenters, createCostCenter, isCompanyAdmin } from '@/lib/services/costCenterService'
import { isSuperAdmin } from '@/lib/services/auth'
import { FaPlus, FaTimes } from 'react-icons/fa'

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreateCCModal, setShowCreateCCModal] = useState(false)
  const [newCCData, setNewCCData] = useState({ code: '', name: '', description: '' })
  const [creatingCC, setCreatingCC] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    rut: '',
    birth_date: '',
    address: '',
    phone: '',
    email: '',
    bank_name: '',
    account_type: '',
    account_number: '',
    hire_date: '',
    position: '',
    cost_center_id: '',
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
    termination_date: '',
    inactive_note: '',
  })

  useEffect(() => {
    loadEmployee()
    if (companyId) {
      loadCostCenters()
      checkAdminStatus()
    }
  }, [companyId])

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const superAdmin = await isSuperAdmin()
      if (superAdmin) {
        setIsAdmin(true)
        return
      }

      if (companyId) {
        const admin = await isCompanyAdmin(user.id, companyId, supabase)
        setIsAdmin(admin)
      }
    } catch (error) {
      console.error('Error verificando permisos:', error)
    }
  }

  const loadCostCenters = async () => {
    if (!companyId) return

    try {
      const data = await getCostCenters(companyId, supabase, false)
      setCostCenters(data)
    } catch (error) {
      console.error('Error al cargar centros de costo:', error)
    }
  }

  const handleCreateCostCenter = async () => {
    if (!companyId) return
    if (!newCCData.code.trim() || !newCCData.name.trim()) {
      alert('El código y nombre son obligatorios')
      return
    }

    setCreatingCC(true)
    try {
      const newCC = await createCostCenter(companyId, {
        code: newCCData.code.toUpperCase(),
        name: newCCData.name,
        description: newCCData.description || undefined,
        status: 'active',
      }, supabase)

      // Agregar el nuevo CC a la lista y seleccionarlo
      setCostCenters([...costCenters, newCC])
      setFormData({ ...formData, cost_center_id: newCC.id })
      setShowCreateCCModal(false)
      setNewCCData({ code: '', name: '', description: '' })
      alert('Centro de costo creado correctamente')
    } catch (error: any) {
      alert('Error al crear centro de costo: ' + error.message)
    } finally {
      setCreatingCC(false)
    }
  }

  // Funciones para formatear números con separador de miles
  const formatNumber = (value: string | number): string => {
    if (!value && value !== 0) return ''
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value
    if (isNaN(numValue)) return ''
    return numValue.toLocaleString('es-CL')
  }

  const parseFormattedNumber = (value: string): string => {
    // Remover puntos (separadores de miles) y dejar solo números
    return value.replace(/\./g, '')
  }

  const handleNumberChange = (field: 'base_salary' | 'transportation' | 'meal_allowance', value: string) => {
    // Permitir solo números y puntos
    const cleaned = value.replace(/[^\d.]/g, '')
    // Remover puntos para obtener el número puro
    const numericValue = parseFormattedNumber(cleaned)
    setFormData({ ...formData, [field]: numericValue })
  }

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
          bank_name: data.bank_name || '',
          account_type: data.account_type || '',
          account_number: data.account_number || '',
          hire_date: data.hire_date,
          position: data.position,
          cost_center_id: data.cost_center_id || '',
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
          termination_date: data.termination_date || '',
          inactive_note: data.inactive_note || '',
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

      // Validar campos según estado
      if (formData.status === 'renuncia' || formData.status === 'despido') {
        if (!formData.termination_date) {
          alert(`Debe ingresar la fecha de ${formData.status === 'renuncia' ? 'renuncia' : 'despido'}`)
          setSaving(false)
          return
        }
      }

      if (formData.status === 'inactive' && !formData.inactive_note?.trim()) {
        if (!confirm('No ha ingresado una nota para el estado inactivo. ¿Desea continuar sin nota?')) {
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

      // Obtener datos actuales del trabajador para detectar cambios de estado
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('status, termination_date')
        .eq('id', params.id)
        .single()

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
        termination_date: (formData.status === 'renuncia' || formData.status === 'despido') ? formData.termination_date : null,
        inactive_note: formData.status === 'inactive' ? formData.inactive_note : null,
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

      // Si cambió a renuncia o despido, crear pre-finiquito
      if (currentEmployee && 
          currentEmployee.status !== formData.status && 
          (formData.status === 'renuncia' || formData.status === 'despido')) {
        try {
          // Obtener usuario actual
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('Usuario no autenticado')

          // Obtener company_id del trabajador
          const { data: empData } = await supabase
            .from('employees')
            .select('company_id')
            .eq('id', params.id)
            .single()

          if (empData?.company_id) {
            // Crear pre-finiquito
            const causeCode = formData.status === 'renuncia' ? '159_2' : '160'
            
            const response = await fetch('/api/settlements', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                employee_id: params.id,
                termination_date: formData.termination_date,
                cause_code: causeCode,
                notice_given: false,
                notes: `Pre-finiquito creado automáticamente al cambiar estado a ${formData.status === 'renuncia' ? 'renuncia' : 'despido'}`,
              }),
            })

            if (response.ok) {
              const settlement = await response.json()
              alert(`Trabajador actualizado. Se ha creado un pre-finiquito (${settlement.settlement_number || 'ID: ' + settlement.id}). Puede completarlo en el módulo de Finiquitos.`)
            } else {
              const errorData = await response.json()
              console.error('Error al crear pre-finiquito:', errorData)
              alert(`Trabajador actualizado, pero hubo un error al crear el pre-finiquito: ${errorData.error || 'Error desconocido'}`)
            }
          }
        } catch (settlementError: any) {
          console.error('Error al crear pre-finiquito:', settlementError)
          alert(`Trabajador actualizado, pero hubo un error al crear el pre-finiquito: ${settlementError.message}`)
        }
      }

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
          {/* Fila 1: Nombre, RUT, Fecha de nacimiento */}
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
            <div className="form-group">
              <label>Fecha de Nacimiento</label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>
          </div>
          {/* Fila 2: Dirección, Teléfono, Correo electrónico */}
          <div className="form-row">
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <h2 style={{ marginTop: '32px' }}>Datos Bancarios</h2>
          {/* Fila 3: Banco, Tipo de cuenta, Número de cuenta */}
          <div className="form-row">
            <div className="form-group">
              <label>Banco</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Ej: Banco de Chile"
              />
            </div>
            <div className="form-group">
              <label>Tipo de Cuenta</label>
              <select
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
              >
                <option value="">Selecciona...</option>
                <option value="corriente">Cuenta Corriente</option>
                <option value="ahorro">Cuenta de Ahorro</option>
                <option value="vista">Cuenta Vista</option>
              </select>
            </div>
            <div className="form-group">
              <label>Número de Cuenta</label>
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Ej: 12345678-9"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Esta información aparecerá en los contratos y liquidaciones
              </small>
            </div>
          </div>

          <h2 style={{ marginTop: '32px' }}>Datos Laborales</h2>
          {/* Fila 4: Fecha de ingreso, Cargo, Centro de costos */}
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
            <div className="form-group">
              <label>Centro de Costo</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <select
                  value={formData.cost_center_id}
                  onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Seleccione un centro de costo</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowCreateCCModal(true)}
                    style={{
                      padding: '10px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      whiteSpace: 'nowrap'
                    }}
                    title="Crear nuevo centro de costo"
                  >
                    <FaPlus size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Fila 5: Sueldo base, Movilización, Colación, Solicita Anticipo, Monto del Anticipo */}
          <div className="form-row">
            <div className="form-group" style={{ flex: '0 0 18%' }}>
              <label>Sueldo Base *</label>
              <input
                type="text"
                required
                value={formatNumber(formData.base_salary)}
                onChange={(e) => handleNumberChange('base_salary', e.target.value)}
                placeholder="0"
                style={{ textAlign: 'right' }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                Remuneración fija mensual del trabajador antes de descuentos legales y otros conceptos
              </small>
            </div>
            <div className="form-group" style={{ flex: '0 0 15%' }}>
              <label>Movilización</label>
              <input
                type="text"
                value={formatNumber(formData.transportation)}
                onChange={(e) => handleNumberChange('transportation', e.target.value)}
                placeholder="0"
                style={{ textAlign: 'right' }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Este valor aparecerá precargado en las liquidaciones
              </small>
            </div>
            <div className="form-group" style={{ flex: '0 0 15%' }}>
              <label>Colación</label>
              <input
                type="text"
                value={formatNumber(formData.meal_allowance)}
                onChange={(e) => handleNumberChange('meal_allowance', e.target.value)}
                placeholder="0"
                style={{ textAlign: 'right' }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Este valor aparecerá precargado en las liquidaciones
              </small>
            </div>
            <div className="form-group" style={{ flex: '0 0 20%' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>¿Solicita Anticipo?</label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                fontSize: '14px', 
                fontWeight: '500',
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <div style={{
                  position: 'relative',
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: formData.requests_advance ? '#3b82f6' : '#d1d5db',
                  transition: 'background-color 0.2s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: formData.requests_advance ? '26px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                </div>
                <span>{formData.requests_advance ? 'Sí' : 'No'}</span>
                <input
                  type="checkbox"
                  checked={formData.requests_advance}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    requests_advance: e.target.checked,
                    advance_amount: !e.target.checked ? '0' : formData.advance_amount
                  })}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
              </label>
              <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                Este valor aparecerá precargado en las liquidaciones
              </small>
            </div>
            {formData.requests_advance && (
              <div className="form-group" style={{ flex: '0 0 18%' }}>
                <label>Monto del Anticipo *</label>
                <input
                  type="text"
                  required
                  value={formatNumber(formData.advance_amount)}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^\d.]/g, '')
                    const numericValue = parseFormattedNumber(cleaned)
                    const maxAdvance = formData.base_salary ? parseFloat(formData.base_salary) * 0.5 : 0
                    const numValue = parseFloat(numericValue) || 0
                    if (numericValue === '' || (numValue >= 0 && numValue <= maxAdvance)) {
                      setFormData({ ...formData, advance_amount: numericValue })
                    }
                  }}
                  placeholder="0"
                  style={{ textAlign: 'right' }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Máximo: ${formData.base_salary ? (parseFloat(formData.base_salary) * 0.5).toLocaleString('es-CL') : '0'} (50% del sueldo base)
                </small>
              </div>
            )}
          </div>
          {/* Fila 7: AFP, Sistema de salud, Plan de salud */}
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
            <div className="form-group">
              <label>Plan de Salud</label>
              <input
                type="text"
                value={formData.health_plan}
                onChange={(e) => setFormData({ ...formData, health_plan: e.target.value })}
                placeholder="Nombre del plan (solo si es ISAPRE)"
              />
            </div>
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
          {/* Fila 8: Tipo de contrato, Estado */}
          <div className="form-row">
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

          {/* Campo condicional para fecha de renuncia/despido */}
          {(formData.status === 'renuncia' || formData.status === 'despido') && (
            <div className="form-group">
              <label>Fecha de {formData.status === 'renuncia' ? 'Renuncia' : 'Despido'} *</label>
              <input
                type="date"
                required
                value={formData.termination_date}
                onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Se creará automáticamente un pre-finiquito al guardar
              </small>
            </div>
          )}

          {/* Campo condicional para nota de inactivo */}
          {formData.status === 'inactive' && (
            <div className="form-group">
              <label>Motivo de Inactividad</label>
              <textarea
                value={formData.inactive_note}
                onChange={(e) => setFormData({ ...formData, inactive_note: e.target.value })}
                rows={3}
                placeholder="Ingrese el motivo por el cual el trabajador está inactivo..."
              />
            </div>
          )}

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

      {/* Modal para crear nuevo Centro de Costo */}
      {showCreateCCModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Crear Nuevo Centro de Costo</h2>
              <button
                onClick={() => {
                  setShowCreateCCModal(false)
                  setNewCCData({ code: '', name: '', description: '' })
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280'
                }}
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Código *
              </label>
              <input
                type="text"
                value={newCCData.code}
                onChange={(e) => setNewCCData({ ...newCCData, code: e.target.value.toUpperCase() })}
                placeholder="CC-001"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={newCCData.name}
                onChange={(e) => setNewCCData({ ...newCCData, name: e.target.value })}
                placeholder="Planta Coquimbo"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Descripción
              </label>
              <textarea
                value={newCCData.description}
                onChange={(e) => setNewCCData({ ...newCCData, description: e.target.value })}
                placeholder="Descripción del centro de costo"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowCreateCCModal(false)
                  setNewCCData({ code: '', name: '', description: '' })
                }}
                className="secondary"
                disabled={creatingCC}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateCostCenter}
                disabled={creatingCC || !newCCData.code.trim() || !newCCData.name.trim()}
              >
                {creatingCC ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


