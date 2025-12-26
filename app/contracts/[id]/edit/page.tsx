'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'

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

export default function EditContractPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contract, setContract] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)

  const [formData, setFormData] = useState({
    contract_type: 'indefinido' as 'indefinido' | 'plazo_fijo' | 'obra_faena' | 'part_time',
    start_date: '',
    end_date: '',
    position: '',
    position_description: '',
    work_schedule: '',
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
    loadData()
  }, [params.id])

  useEffect(() => {
    if (formData.contract_type && contract) {
      const template = contractTemplates[formData.contract_type]
      if (!contract.confidentiality_clause) {
        setFormData((prev) => ({
          ...prev,
          confidentiality_clause: template.confidentiality_clause,
          authorized_deductions: template.authorized_deductions,
          advances_clause: template.advances_clause,
          internal_regulations: template.internal_regulations,
        }))
      }
    }
  }, [formData.contract_type])

  const loadData = async () => {
    try {
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          *,
          employees (*),
          companies (*)
        `)
        .eq('id', params.id)
        .single()

      if (contractError) throw contractError

      setContract(contractData)
      setEmployee(contractData.employees)
      setCompany(contractData.companies)

      setFormData({
        contract_type: contractData.contract_type,
        start_date: contractData.start_date,
        end_date: contractData.end_date || '',
        position: contractData.position || '',
        position_description: contractData.position_description || '',
        work_schedule: contractData.work_schedule || '',
        work_location: contractData.work_location || '',
        base_salary: formatNumberForInput(contractData.base_salary || 0),
        gratuity: contractData.gratuity ?? true,
        gratuity_amount: contractData.gratuity_amount ? formatNumberForInput(contractData.gratuity_amount) : '',
        other_allowances: contractData.other_allowances || '',
        payment_method: contractData.payment_method || 'transferencia',
        payment_periodicity: contractData.payment_periodicity || 'mensual',
        bank_name: contractData.bank_name || '',
        account_type: contractData.account_type || '',
        account_number: contractData.account_number || '',
        confidentiality_clause: contractData.confidentiality_clause || '',
        authorized_deductions: contractData.authorized_deductions || '',
        advances_clause: contractData.advances_clause || '',
        internal_regulations: contractData.internal_regulations || '',
        additional_clauses: contractData.additional_clauses || '',
      })
    } catch (error: any) {
      alert('Error al cargar contrato: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const baseSalary = parseFormattedNumber(formData.base_salary)
      if (baseSalary <= 0) {
        alert('El sueldo base debe ser mayor a cero')
        return
      }

      const updateData: any = {
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.contract_type === 'plazo_fijo' || formData.contract_type === 'obra_faena' 
          ? formData.end_date || null 
          : null,
        position: formData.position,
        position_description: formData.position_description || null,
        work_schedule: formData.work_schedule,
        work_location: formData.work_location,
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
      }

      const { error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      alert('Contrato actualizado correctamente')
      router.push(`/contracts/${params.id}`)
    } catch (error: any) {
      console.error('Error al actualizar contrato:', error)
      alert('Error al actualizar contrato: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Editar Contrato</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div>
        <h1>Contrato no encontrado</h1>
        <div className="card">
          <p>El contrato solicitado no existe.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Editar Contrato {contract.contract_number}</h1>
        <button className="secondary" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tipo de Contrato y Fechas */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Tipo de Contrato y Fechas</h2>
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
          <h2>Cargo y Funciones</h2>
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
            />
          </div>
        </div>

        {/* Jornada y Lugar de Trabajo */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Jornada y Lugar de Trabajo</h2>
          <div className="form-group">
            <label>Horario de Trabajo *</label>
            <input
              type="text"
              value={formData.work_schedule}
              onChange={(e) => setFormData({ ...formData, work_schedule: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Lugar de Prestación de Servicios *</label>
            <input
              type="text"
              value={formData.work_location}
              onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Remuneraciones */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Remuneraciones</h2>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.gratuity}
                  onChange={(e) => setFormData({ ...formData, gratuity: e.target.checked })}
                />
                <span>Incluir Gratificación Legal</span>
              </div>
              {formData.gratuity && (
                <input
                  type="text"
                  value={formData.gratuity_amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '')
                    setFormData({ ...formData, gratuity_amount: formatNumberForInput(parseFormattedNumber(value)) })
                  }}
                  placeholder="Monto fijo (opcional)"
                  style={{ marginTop: '8px' }}
                />
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
          <h2>Cláusulas del Contrato</h2>
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

