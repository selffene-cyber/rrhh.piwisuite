'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { AVAILABLE_AFPS, AVAILABLE_HEALTH_SYSTEMS } from '@/lib/services/previredAPI'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { CostCenter } from '@/types'
import { getCostCenters, createCostCenter, isCompanyAdmin } from '@/lib/services/costCenterService'
import { isSuperAdmin } from '@/lib/services/auth'
import { FaPlus, FaTimes } from 'react-icons/fa'

export default function NewEmployeePage() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(false)
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
  })

  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validar que haya una empresa seleccionada
      if (!companyId) {
        alert('Debe seleccionar una empresa antes de crear un trabajador')
        setLoading(false)
        return
      }

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
        company_id: companyId, // Asignar la empresa actual
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
      if (formData.bank_name?.trim()) employeeData.bank_name = formData.bank_name.trim()
      if (formData.account_type?.trim()) employeeData.account_type = formData.account_type.trim()
      if (formData.account_number?.trim()) employeeData.account_number = formData.account_number.trim()
      if (formData.cost_center_id) employeeData.cost_center_id = formData.cost_center_id
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nuevo Trabajador</h1>
        <Link href="/employees/form-pdf">
          <button style={{ 
            background: '#10b981',
            color: 'white'
          }}>
            Descargar Formulario PDF
          </button>
        </Link>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <h2>Datos Personales</h2>
          {/* Fila 1: Nombre completo, RUT, Fecha de nacimiento */}
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
            </div>
          </div>
          <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '-12px', marginBottom: '16px' }}>
            Esta información aparecerá en los contratos y liquidaciones
          </small>

          <h2 style={{ marginTop: '32px' }}>Datos Laborales</h2>
          {/* Fila 4: Fecha de ingreso, Cargo, Centro de costo */}
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
          <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '-12px', marginBottom: '16px' }}>
            Movilización y Colación aparecerán precargados en las liquidaciones
          </small>
          {/* Fila 6: AFP, Sistema de salud, Plan de salud */}
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

