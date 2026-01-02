'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

// Plantillas de contratos según tipo
const contractTemplates = {
  indefinido: {
    confidentiality_clause: `El trabajador se compromete a mantener absoluta confidencialidad sobre toda información, datos, procesos, estrategias comerciales, listas de clientes, proveedores, métodos de trabajo, tecnologías, secretos industriales y cualquier otra información de carácter confidencial a la que tenga acceso en razón de sus funciones, tanto durante la vigencia del contrato como después de su término, sin límite de tiempo.`,
    authorized_deductions: `El empleador queda autorizado para descontar de las remuneraciones del trabajador los siguientes conceptos: cotizaciones previsionales (AFP, salud, seguro de cesantía), impuestos legales, anticipos de remuneraciones otorgados, préstamos otorgados por la empresa, y cualquier otro descuento autorizado por ley o pactado entre las partes.`,
    advances_clause: `El trabajador podrá solicitar anticipos de remuneraciones, los cuales serán descontados íntegramente en la liquidación del período correspondiente, previa autorización del empleador.`,
    internal_regulations: `El trabajador se compromete a cumplir con el reglamento interno de la empresa, así como con todas las políticas, procedimientos y normas establecidas por el empleador, las que forman parte integrante del presente contrato.`,
  },
  plazo_fijo: {
    confidentiality_clause: `El trabajador se compromete a mantener absoluta confidencialidad sobre toda información, datos, procesos, estrategias comerciales, listas de clientes, proveedores, métodos de trabajo, tecnologías, secretos industriales y cualquier otra información de carácter confidencial a la que tenga acceso en razón de sus funciones, tanto durante la vigencia del contrato como después de su término, sin límite de tiempo.`,
    authorized_deductions: `El empleador queda autorizado para descontar de las remuneraciones del trabajador los siguientes conceptos: cotizaciones previsionales (AFP, salud, seguro de cesantía), impuestos legales, anticipos de remuneraciones otorgados, préstamos otorgados por la empresa, y cualquier otro descuento autorizado por ley o pactado entre las partes.`,
    advances_clause: `El trabajador podrá solicitar anticipos de remuneraciones, los cuales serán descontados íntegramente en la liquidación del período correspondiente, previa autorización del empleador.`,
    internal_regulations: `El trabajador se compromete a cumplir con el reglamento interno de la empresa, así como con todas las políticas, procedimientos y normas establecidas por el empleador, las que forman parte integrante del presente contrato.`,
  },
  obra_faena: {
    confidentiality_clause: `El trabajador se compromete a mantener absoluta confidencialidad sobre toda información, datos, procesos, estrategias comerciales, listas de clientes, proveedores, métodos de trabajo, tecnologías, secretos industriales y cualquier otra información de carácter confidencial a la que tenga acceso en razón de sus funciones, tanto durante la vigencia del contrato como después de su término, sin límite de tiempo.`,
    authorized_deductions: `El empleador queda autorizado para descontar de las remuneraciones del trabajador los siguientes conceptos: cotizaciones previsionales (AFP, salud, seguro de cesantía), impuestos legales, anticipos de remuneraciones otorgados, préstamos otorgados por la empresa, y cualquier otro descuento autorizado por ley o pactado entre las partes.`,
    advances_clause: `El trabajador podrá solicitar anticipos de remuneraciones, los cuales serán descontados íntegramente en la liquidación del período correspondiente, previa autorización del empleador.`,
    internal_regulations: `El trabajador se compromete a cumplir con el reglamento interno de la empresa, así como con todas las políticas, procedimientos y normas establecidas por el empleador, las que forman parte integrante del presente contrato.`,
  },
  part_time: {
    confidentiality_clause: `El trabajador se compromete a mantener absoluta confidencialidad sobre toda información, datos, procesos, estrategias comerciales, listas de clientes, proveedores, métodos de trabajo, tecnologías, secretos industriales y cualquier otra información de carácter confidencial a la que tenga acceso en razón de sus funciones, tanto durante la vigencia del contrato como después de su término, sin límite de tiempo.`,
    authorized_deductions: `El empleador queda autorizado para descontar de las remuneraciones del trabajador los siguientes conceptos: cotizaciones previsionales (AFP, salud, seguro de cesantía), impuestos legales, anticipos de remuneraciones otorgados, préstamos otorgados por la empresa, y cualquier otro descuento autorizado por ley o pactado entre las partes.`,
    advances_clause: `El trabajador podrá solicitar anticipos de remuneraciones, los cuales serán descontados íntegramente en la liquidación del período correspondiente, previa autorización del empleador.`,
    internal_regulations: `El trabajador se compromete a cumplir con el reglamento interno de la empresa, así como con todas las políticas, procedimientos y normas establecidas por el empleador, las que forman parte integrante del presente contrato.`,
  },
}

export default function NewContractPage() {
  const { companyId } = useCurrentCompany()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)

  const [formData, setFormData] = useState({
    employee_id: searchParams?.get('employee_id') || '',
    contract_type: 'indefinido' as 'indefinido' | 'plazo_fijo' | 'obra_faena' | 'part_time',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    position: '',
    position_description: '',
    work_schedule_type: 'unified' as 'unified' | 'separated', // unified: lunes a viernes igual, separated: lunes-jueves y viernes separados
    work_schedule: 'Lunes a Viernes, 09:00 a 18:00',
    work_schedule_monday_thursday: 'Lunes a Jueves, 09:00 a 18:00',
    work_schedule_friday: 'Viernes, 09:00 a 18:00',
    lunch_break_duration: '60', // Duración de colación en minutos
    work_location: '',
    base_salary: '',
    gratuity: true,
    gratuity_amount: '',
    other_allowances: '',
    payment_method: 'transferencia',
    payment_periodicity: 'mensual',
    bank_name: '',
    account_type: '',
    account_number: '',
    confidentiality_clause: '',
    authorized_deductions: '',
    advances_clause: '',
    internal_regulations: '',
    additional_clauses: '',
  })

  useEffect(() => {
    if (companyId) {
      loadData()
    } else {
      setEmployees([])
    }
  }, [companyId])

  useEffect(() => {
    if (searchParams?.get('employee_id')) {
      setFormData((prev) => ({ ...prev, employee_id: searchParams.get('employee_id') || '' }))
    }
  }, [searchParams])

  useEffect(() => {
    if (formData.employee_id) {
      loadEmployeeData()
    }
  }, [formData.employee_id])

  useEffect(() => {
    if (formData.contract_type) {
      const template = contractTemplates[formData.contract_type]
      setFormData((prev) => ({
        ...prev,
        confidentiality_clause: template.confidentiality_clause,
        authorized_deductions: template.authorized_deductions,
        advances_clause: template.advances_clause,
        internal_regulations: template.internal_regulations,
      }))
    }
  }, [formData.contract_type])

  const loadData = async () => {
    try {
      // Cargar empleados de la empresa
      if (!companyId) {
        setEmployees([])
        return
      }
      
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .eq('company_id', companyId)
        .order('full_name')

      setEmployees(employeesData || [])

      // Cargar empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single()

      setCompany(companyData)
    } catch (error: any) {
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadEmployeeData = async () => {
    if (!formData.employee_id) return
    
    try {
      // Cargar datos completos del empleado seleccionado (incluyendo datos bancarios)
      const { data: employee, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, base_salary, hire_date, bank_name, account_type, account_number')
        .eq('id', formData.employee_id)
        .single()

      if (error) throw error

      if (employee) {
        setSelectedEmployee(employee)
        // Precargar fecha de ingreso como fecha de inicio del contrato
        const hireDate = employee.hire_date ? employee.hire_date.split('T')[0] : new Date().toISOString().split('T')[0]
        setFormData((prev) => ({
          ...prev,
          position: employee.position || '',
          base_salary: formatNumberForInput(employee.base_salary || 0),
          work_location: company?.address || '',
          start_date: hireDate, // Precargar fecha de ingreso
          bank_name: employee.bank_name || '',
          account_type: employee.account_type || '',
          account_number: employee.account_number || '',
        }))
      }
    } catch (error: any) {
      console.error('Error al cargar datos del empleado:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.employee_id) {
        alert('Por favor selecciona un trabajador')
        return
      }

      if (!formData.position || !formData.work_location) {
        alert('Por favor completa todos los campos obligatorios')
        return
      }

      const baseSalary = parseFormattedNumber(formData.base_salary)
      if (baseSalary <= 0) {
        alert('El sueldo base debe ser mayor a cero')
        return
      }

      const contractData: any = {
        employee_id: formData.employee_id,
        company_id: company?.id,
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.contract_type === 'plazo_fijo' || formData.contract_type === 'obra_faena' 
          ? formData.end_date || null 
          : null,
        position: formData.position,
        position_description: formData.position_description || null,
        work_schedule: formData.work_schedule_type === 'unified' 
          ? formData.work_schedule 
          : `${formData.work_schedule_monday_thursday}; ${formData.work_schedule_friday}`,
        work_location: formData.work_location,
        lunch_break_duration: parseInt(formData.lunch_break_duration) || 60,
        base_salary: baseSalary,
        gratuity: formData.gratuity,
        gratuity_amount: formData.gratuity_amount ? parseFormattedNumber(formData.gratuity_amount) : null,
        other_allowances: formData.other_allowances || null,
        payment_method: formData.payment_method,
        payment_periodicity: formData.payment_periodicity,
        bank_name: formData.bank_name || null,
        account_type: formData.account_type || null,
        account_number: formData.account_number || null,
        confidentiality_clause: formData.confidentiality_clause || null,
        authorized_deductions: formData.authorized_deductions || null,
        advances_clause: formData.advances_clause || null,
        internal_regulations: formData.internal_regulations || null,
        additional_clauses: formData.additional_clauses || null,
        status: 'draft',
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single()

      if (error) throw error

      alert('Contrato creado correctamente')
      router.push(`/contracts/${data.id}`)
    } catch (error: any) {
      console.error('Error al crear contrato:', error)
      alert('Error al crear contrato: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Nuevo Contrato</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nuevo Contrato de Trabajo</h1>
        <button className="secondary" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Selección de Trabajador */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>1. Selección de Trabajador</h2>
          <div className="form-group">
            <label>Trabajador *</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              required
            >
              <option value="">Selecciona un trabajador</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut}
                </option>
              ))}
            </select>
            {selectedEmployee && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ margin: '4px 0' }}><strong>RUT:</strong> {selectedEmployee.rut}</p>
                <p style={{ margin: '4px 0' }}><strong>Dirección:</strong> {selectedEmployee.address || 'No registrada'}</p>
                <p style={{ margin: '4px 0' }}><strong>Teléfono:</strong> {selectedEmployee.phone || 'No registrado'}</p>
                <p style={{ margin: '4px 0' }}><strong>Email:</strong> {selectedEmployee.email || 'No registrado'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tipo de Contrato y Fechas */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>2. Tipo de Contrato y Fechas</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Contrato *</label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as any })}
                required
              >
                <option value="indefinido">Indefinido</option>
                <option value="plazo_fijo">Plazo Fijo</option>
                <option value="obra_faena">Obra o Faena</option>
                <option value="part_time">Part-Time</option>
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
            {(formData.contract_type === 'plazo_fijo' || formData.contract_type === 'obra_faena') && (
              <div className="form-group">
                <label>Fecha de Término *</label>
                <DateInput
                  value={formData.end_date}
                  onChange={(value) => setFormData({ ...formData, end_date: value })}
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* Cargo y Funciones */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>3. Cargo y Funciones</h2>
          <div className="form-group">
            <label>Cargo *</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción de Funciones</label>
            <textarea
              value={formData.position_description}
              onChange={(e) => setFormData({ ...formData, position_description: e.target.value })}
              rows={4}
              placeholder="Describe las funciones principales del cargo..."
            />
          </div>
        </div>

        {/* Jornada y Lugar de Trabajo */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>4. Jornada y Lugar de Trabajo</h2>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#f0f9ff', 
            borderLeft: '4px solid #3b82f6', 
            marginBottom: '16px',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1e40af'
          }}>
            <strong>Nota:</strong> La jornada de trabajo se rige por la Ley 21.561 (Ley de 40 horas), que establece una jornada ordinaria semanal máxima de 40 horas, distribuidas de lunes a viernes. Esta ley entró en vigencia de forma gradual y debe ser respetada en todos los contratos laborales.
          </div>
          <div className="form-group">
            <label>Tipo de Horario *</label>
            <select
              value={formData.work_schedule_type}
              onChange={(e) => setFormData({ 
                ...formData, 
                work_schedule_type: e.target.value as 'unified' | 'separated' 
              })}
              required
            >
              <option value="unified">Lunes a Viernes (mismo horario)</option>
              <option value="separated">Lunes a Jueves y Viernes (horarios diferentes)</option>
            </select>
          </div>
          
          {formData.work_schedule_type === 'unified' ? (
            <div className="form-group">
              <label>Horario de Trabajo *</label>
              <input
                type="text"
                value={formData.work_schedule}
                onChange={(e) => setFormData({ ...formData, work_schedule: e.target.value })}
                placeholder="Ej: Lunes a Viernes, 09:00 a 18:00"
                required
              />
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label>Horario Lunes a Jueves *</label>
                <input
                  type="text"
                  value={formData.work_schedule_monday_thursday}
                  onChange={(e) => setFormData({ ...formData, work_schedule_monday_thursday: e.target.value })}
                  placeholder="Ej: Lunes a Jueves, 09:00 a 18:00"
                  required
                />
              </div>
              <div className="form-group">
                <label>Horario Viernes *</label>
                <input
                  type="text"
                  value={formData.work_schedule_friday}
                  onChange={(e) => setFormData({ ...formData, work_schedule_friday: e.target.value })}
                  placeholder="Ej: Viernes, 09:00 a 13:00"
                  required
                />
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label>Lugar de Prestación de Servicios *</label>
            <input
              type="text"
              value={formData.work_location}
              onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Duración de Colación (minutos) *</label>
            <input
              type="number"
              value={formData.lunch_break_duration}
              onChange={(e) => setFormData({ ...formData, lunch_break_duration: e.target.value })}
              placeholder="Ej: 60"
              min="0"
              max="120"
              required
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Tiempo de descanso para colación (no imputable a la jornada laboral)
            </div>
          </div>

          {/* Análisis de cumplimiento de Ley 21.561 */}
          {(() => {
            const calculateWeeklyHours = () => {
              try {
                const lunchMinutes = parseInt(formData.lunch_break_duration) || 60

                if (formData.work_schedule_type === 'unified' && formData.work_schedule) {
                  // Extraer horarios del texto unificado
                  const timeMatch = formData.work_schedule.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                  if (timeMatch) {
                    const startHour = parseInt(timeMatch[1])
                    const startMin = parseInt(timeMatch[2])
                    const endHour = parseInt(timeMatch[3])
                    const endMin = parseInt(timeMatch[4])
                    
                    const startTotal = startHour * 60 + startMin
                    const endTotal = endHour * 60 + endMin
                    const dailyMinutes = endTotal - startTotal - lunchMinutes
                    const dailyHours = dailyMinutes / 60
                    return dailyHours * 5 // 5 días laborales
                  }
                } else if (formData.work_schedule_type === 'separated') {
                  // Calcular lunes a jueves
                  const mondayThursdayMatch = formData.work_schedule_monday_thursday?.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                  let mondayThursdayHours = 0
                  if (mondayThursdayMatch) {
                    const startHour = parseInt(mondayThursdayMatch[1])
                    const startMin = parseInt(mondayThursdayMatch[2])
                    const endHour = parseInt(mondayThursdayMatch[3])
                    const endMin = parseInt(mondayThursdayMatch[4])
                    
                    const startTotal = startHour * 60 + startMin
                    const endTotal = endHour * 60 + endMin
                    const dailyMinutes = endTotal - startTotal - lunchMinutes
                    mondayThursdayHours = (dailyMinutes / 60) * 4 // 4 días
                  }
                  
                  // Calcular viernes
                  const fridayMatch = formData.work_schedule_friday?.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                  let fridayHours = 0
                  if (fridayMatch) {
                    const startHour = parseInt(fridayMatch[1])
                    const startMin = parseInt(fridayMatch[2])
                    const endHour = parseInt(fridayMatch[3])
                    const endMin = parseInt(fridayMatch[4])
                    
                    const startTotal = startHour * 60 + startMin
                    const endTotal = endHour * 60 + endMin
                    const dailyMinutes = endTotal - startTotal - lunchMinutes
                    fridayHours = dailyMinutes / 60 // 1 día
                  }
                  
                  return mondayThursdayHours + fridayHours
                }
              } catch (error) {
                return null
              }
              return null
            }

            const weeklyHours = calculateWeeklyHours()
            const currentYear = new Date().getFullYear()
            
            // Determinar límite según año
            let maxHours = 45 // Por defecto (antes de 2024)
            let limitYear = ''
            if (currentYear >= 2028) {
              maxHours = 40
              limitYear = '2028'
            } else if (currentYear >= 2026) {
              maxHours = 42
              limitYear = '2026'
            } else if (currentYear >= 2024) {
              maxHours = 44
              limitYear = '2024'
            }

            if (weeklyHours !== null && weeklyHours > 0) {
              const isCompliant = weeklyHours <= maxHours
              const hoursDiff = weeklyHours - maxHours
              
              return (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: isCompliant ? '#f0fdf4' : '#fef2f2',
                  borderLeft: `4px solid ${isCompliant ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '4px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: isCompliant ? '#166534' : '#991b1b' }}>
                    {isCompliant ? '✓ Cumple con Ley 21.561' : '⚠ Excede límite legal'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                    <strong>Horas semanales calculadas:</strong> {weeklyHours.toFixed(2)} horas
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                    <strong>Límite legal ({currentYear >= 2028 ? 'desde 2028' : currentYear >= 2026 ? 'desde 2026' : 'desde 2024'}):</strong> {maxHours} horas/semana
                  </div>
                  {!isCompliant && (
                    <div style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px', fontWeight: 'bold' }}>
                      ⚠ ADVERTENCIA: Se excede el límite legal en {hoursDiff.toFixed(2)} horas. Esto podría generar responsabilidades legales.
                    </div>
                  )}
                  {isCompliant && weeklyHours < maxHours && (
                    <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                      El horario está dentro del límite legal y es menor al máximo permitido.
                    </div>
                  )}
                </div>
              )
            }
            return null
          })()}
        </div>

        {/* Remuneraciones */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>5. Remuneraciones</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Sueldo Base *</label>
              <input
                type="text"
                value={formData.base_salary}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '')
                  setFormData({ ...formData, base_salary: formatNumberForInput(parseFormattedNumber(value)) })
                }}
                required
              />
            </div>
            <div className="form-group">
              <label>Gratificación</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: formData.gratuity ? '8px' : '0' }}>
                <input
                  type="checkbox"
                  checked={formData.gratuity}
                  onChange={(e) => setFormData({ ...formData, gratuity: e.target.checked })}
                  style={{ marginTop: '4px', flexShrink: 0, width: 'auto' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '14px' }}>Incluir Gratificación Legal</span>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px', lineHeight: '1.4' }}>
                    (25% del sueldo base, con tope legal)
                  </div>
                </div>
              </div>
              {formData.gratuity && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 0 auto', minWidth: '150px', maxWidth: '200px' }}>
                    <input
                      type="text"
                      value={formData.gratuity_amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '')
                        setFormData({ ...formData, gratuity_amount: formatNumberForInput(parseFormattedNumber(value)) })
                      }}
                      placeholder="Monto fijo (opcional)"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', paddingTop: '8px', flex: '1 1 auto', minWidth: '120px' }}>
                    Si se deja vacío, se aplicará gratificación legal
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Otros Bonos o Asignaciones</label>
              <textarea
                value={formData.other_allowances}
                onChange={(e) => setFormData({ ...formData, other_allowances: e.target.value })}
                rows={3}
                placeholder="Ej: Bono de producción, Asignación de transporte, etc."
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Forma de Pago *</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                required
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group">
              <label>Periodicidad de Pago *</label>
              <select
                value={formData.payment_periodicity}
                onChange={(e) => setFormData({ ...formData, payment_periodicity: e.target.value })}
                required
              >
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>
          </div>
          {formData.payment_method === 'transferencia' && (
            <>
              <h3 style={{ marginTop: '16px', marginBottom: '12px', fontSize: '16px' }}>Datos Bancarios</h3>
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
                  Estos datos se precargan desde la ficha del trabajador, pero puedes editarlos si es necesario
                </small>
              </div>
            </>
          )}
        </div>

        {/* Cláusulas */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>6. Cláusulas del Contrato</h2>
          <div className="form-group">
            <label>Cláusula de Confidencialidad</label>
            <textarea
              value={formData.confidentiality_clause}
              onChange={(e) => setFormData({ ...formData, confidentiality_clause: e.target.value })}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Descuentos Autorizados</label>
            <textarea
              value={formData.authorized_deductions}
              onChange={(e) => setFormData({ ...formData, authorized_deductions: e.target.value })}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Cláusula de Anticipos</label>
            <textarea
              value={formData.advances_clause}
              onChange={(e) => setFormData({ ...formData, advances_clause: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Reglamento Interno</label>
            <textarea
              value={formData.internal_regulations}
              onChange={(e) => setFormData({ ...formData, internal_regulations: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Cláusulas Adicionales</label>
            <textarea
              value={formData.additional_clauses}
              onChange={(e) => setFormData({ ...formData, additional_clauses: e.target.value })}
              rows={4}
              placeholder="Otras cláusulas que desees agregar..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Contrato'}
          </button>
          <button type="button" className="secondary" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

