'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getCurrentMonthYear } from '@/lib/utils/date'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import DateInput from '@/components/DateInput'
import MonthInput from '@/components/MonthInput'
import { FaMoneyBillWave, FaEdit, FaSave, FaTimes } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

interface AdvanceItem {
  id?: string
  employee_id: string
  employee_name: string
  employee_rut: string
  employee_base_salary: number
  amount: string
  reason: string
  payment_method: 'transferencia' | 'efectivo'
  edited: boolean
}

export default function BulkAdvancesPage() {
  const { companyId } = useCurrentCompany()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [advanceItems, setAdvanceItems] = useState<AdvanceItem[]>([])
  const [formData, setFormData] = useState({
    period: `${getCurrentMonthYear().year}-${String(getCurrentMonthYear().month).padStart(2, '0')}`,
    advance_date: new Date().toISOString().split('T')[0],
    default_amount: '',
    default_reason: '',
    default_payment_method: 'transferencia' as 'transferencia' | 'efectivo',
  })

  useEffect(() => {
    if (companyId) {
      loadData()
    } else {
      setEmployees([])
      setCompany(null)
      setLoading(false)
    }
  }, [companyId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar empleados activos de la empresa
      if (!companyId) {
        setEmployees([])
        setCompany(null)
        setLoading(false)
        return
      }
      
      // Filtro reforzado para asegurar que solo se muestren empleados de la empresa actual
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, rut, base_salary, company_id')
        .eq('status', 'active')
        .eq('company_id', companyId)
        .order('full_name')

      if (employeesError) throw employeesError
      
      // Filtro adicional por si acaso (seguridad adicional)
      const filteredEmployees = (employeesData || []).filter((emp: any) => emp.company_id === companyId)
      setEmployees(filteredEmployees)

      // Cargar empresa usando el companyId del hook
      if (companyId) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, rut, address, employer_name')
          .eq('id', companyId)
          .single()

        if (companyData) {
          setCompany(companyData)
        }
      }
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const initializeAdvanceItems = () => {
    const items: AdvanceItem[] = employees.map(emp => ({
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_rut: emp.rut,
      employee_base_salary: emp.base_salary || 0,
      amount: formData.default_amount,
      reason: formData.default_reason,
      payment_method: formData.default_payment_method,
      edited: false,
    }))
    setAdvanceItems(items)
  }

  const handleGenerate = () => {
    if (employees.length === 0) {
      alert('No hay trabajadores activos')
      return
    }

    if (!formData.default_amount) {
      alert('Por favor ingresa un monto por defecto')
      return
    }

    initializeAdvanceItems()
  }

  const handleItemChange = (index: number, field: keyof AdvanceItem, value: any) => {
    const updated = [...advanceItems]
    updated[index] = {
      ...updated[index],
      [field]: value,
      edited: true,
    }
    setAdvanceItems(updated)
  }

  const handleSave = async () => {
    if (advanceItems.length === 0) {
      alert('No hay anticipos para guardar')
      return
    }

    if (!confirm(`¿Guardar ${advanceItems.length} anticipo(s)?`)) {
      return
    }

    setSaving(true)

    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()

      // Usar el companyId del hook (ya está disponible)
      if (!companyId) {
        throw new Error('No se encontró una empresa seleccionada')
      }

      // Obtener último número de anticipo para generar correlativos (filtrar por company_id)
      const { data: lastAdvance } = await supabase
        .from('advances')
        .select('advance_number')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastAdvance?.advance_number) {
        const lastNumber = parseInt(lastAdvance.advance_number.replace('ANT-', ''))
        nextNumber = lastNumber + 1
      }

      // Preparar datos para insertar con números correlativos
      const advancesToInsert = advanceItems
        .filter(item => item.amount && parseFormattedNumber(item.amount) > 0)
        .map((item, index) => {
          const advanceNumber = `ANT-${String(nextNumber + index).padStart(2, '0')}`
          return {
            employee_id: item.employee_id,
            company_id: companyId,
            period: formData.period,
            advance_date: formData.advance_date,
            amount: Math.ceil(parseFormattedNumber(item.amount)),
            reason: item.reason || null,
            payment_method: item.payment_method,
            status: 'borrador',
            advance_number: advanceNumber,
            created_by: user?.id,
          }
        })

      if (advancesToInsert.length === 0) {
        alert('No hay anticipos válidos para guardar')
        setSaving(false)
        return
      }

      const { data, error } = await supabase
        .from('advances')
        .insert(advancesToInsert)
        .select()

      if (error) throw error

      alert(`${data.length} anticipo(s) creado(s) exitosamente`)
      router.push('/advances')
    } catch (error: any) {
      alert('Error al guardar anticipos: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaMoneyBillWave size={28} color="#f59e0b" />
          Anticipos Masivos
        </h1>
        <Link href="/advances">
          <button className="secondary">Volver</button>
        </Link>
      </div>

      {/* Configuración general */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Configuración General</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Período de Descuento *</label>
            <MonthInput
              value={formData.period}
              onChange={(value) => setFormData({ ...formData, period: value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Fecha del Anticipo *</label>
            <DateInput
              value={formData.advance_date}
              onChange={(value) => setFormData({ ...formData, advance_date: value })}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Monto por Defecto *</label>
            <input
              type="text"
              required
              value={formatNumberForInput(parseFormattedNumber(formData.default_amount))}
              onChange={(e) => setFormData({ ...formData, default_amount: e.target.value })}
              placeholder="0"
            />
            <small style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
              Este monto se aplicará a todos los trabajadores. Podrás editarlo individualmente después.
            </small>
          </div>
          <div className="form-group">
            <label>Medio de Pago por Defecto *</label>
            <select
              required
              value={formData.default_payment_method}
              onChange={(e) => setFormData({ ...formData, default_payment_method: e.target.value as 'transferencia' | 'efectivo' })}
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ width: '100%' }}>
            <label>Motivo / Glosa por Defecto</label>
            <input
              type="text"
              value={formData.default_reason}
              onChange={(e) => setFormData({ ...formData, default_reason: e.target.value })}
              placeholder="Ej: Anticipo de remuneración / Quincena"
            />
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <button onClick={handleGenerate} disabled={!formData.default_amount}>
            Generar Lista de Anticipos
          </button>
        </div>
      </div>

      {/* Lista de anticipos generados */}
      {advanceItems.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Anticipos Generados ({advanceItems.length})</h2>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving ? 'Guardando...' : (
                <>
                  <FaSave size={16} />
                  Guardar Todos
                </>
              )}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>RUT</th>
                  <th>Sueldo Base</th>
                  <th>Monto</th>
                  <th>Motivo</th>
                  <th>Medio de Pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {advanceItems.map((item, index) => {
                  const amount = parseFormattedNumber(item.amount)
                  const maxAdvance = item.employee_base_salary * 0.5
                  const isOverLimit = amount > maxAdvance

                  return (
                    <tr key={item.employee_id} style={{ background: item.edited ? '#fef3c7' : 'transparent' }}>
                      <td>
                        <strong>{item.employee_name}</strong>
                      </td>
                      <td>{item.employee_rut}</td>
                      <td>${item.employee_base_salary.toLocaleString('es-CL')}</td>
                      <td>
                        <input
                          type="text"
                          value={formatNumberForInput(parseFormattedNumber(item.amount))}
                          onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                          style={{
                            width: '120px',
                            border: isOverLimit ? '2px solid #ef4444' : '1px solid #d1d5db',
                            borderRadius: '4px',
                            padding: '4px 8px'
                          }}
                        />
                        {isOverLimit && (
                          <small style={{ display: 'block', color: '#ef4444', fontSize: '10px', marginTop: '2px' }}>
                            ⚠️ Mayor al 50% del sueldo
                          </small>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.reason}
                          onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                          style={{
                            width: '200px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            padding: '4px 8px'
                          }}
                          placeholder="Motivo opcional"
                        />
                      </td>
                      <td>
                        <select
                          value={item.payment_method}
                          onChange={(e) => handleItemChange(index, 'payment_method', e.target.value)}
                          style={{
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            padding: '4px 8px'
                          }}
                        >
                          <option value="transferencia">Transferencia</option>
                          <option value="efectivo">Efectivo</option>
                        </select>
                      </td>
                      <td>
                        {item.edited && (
                          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>
                            ✏️ Editado
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
              💡 <strong>Tip:</strong> Puedes editar individualmente cada anticipo antes de guardar. Los campos editados se marcan en amarillo.
            </p>
          </div>
        </div>
      )}

      {advanceItems.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <FaMoneyBillWave size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p>Completa la configuración general y haz clic en "Generar Lista de Anticipos" para comenzar</p>
        </div>
      )}
    </div>
  )
}

