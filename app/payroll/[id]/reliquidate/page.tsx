'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatMonthYear } from '@/lib/utils/date'
import { FaArrowLeft, FaRedo, FaCalculator, FaPlus, FaTrash } from 'react-icons/fa'
import { PayrollSlipWithDetails, RELIQUIDATION_REASON_CATEGORIES } from '@/types'
import { ReliquidationModifications } from '@/lib/services/reliquidationCalculator'

const BONUS_OPTIONS = [
  'Bono de Producción',
  'Bono de Cumplimiento de Metas / KPI',
  'Bono de Desempeño',
  'Bono de Asistencia',
  'Bono de Puntualidad',
  'Bono de Responsabilidad',
  'Bono por Turno',
  'Bono por Trabajo en Altura',
  'Bono por Trabajo en Faena',
  'Bono de Disponibilidad',
  'Bono por Zona / Zona Extrema',
  'Bono de Permanencia',
  'Bono de Retención',
  'Bono de Riesgo',
  'Bono Vacaciones',
  'Otro Bono Imponible',
]

const NON_TAXABLE_OPTIONS = [
  'Viáticos',
  'Asignación de Pérdida de Caja',
  'Asignación de Herramientas',
  'Asignación de Desgaste de Herramientas',
  'Asignación de Traslado',
  'Asignación de Alojamiento',
  'Asignación de Alimentación en Faena',
  'Reembolso de Gastos',
  'Otro Haber No Imponible',
]

type ItemEntry = {
  id: string
  name: string
  amount: number
  type: 'taxable_earning' | 'non_taxable_earning'
  category: string
  originalAmount: number
  originalItemId: string | null
}

export default function CreateReliquidationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [originalSlip, setOriginalSlip] = useState<PayrollSlipWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calculationResult, setCalculationResult] = useState<any>(null)

  const [type, setType] = useState<'rectificatoria' | 'complementaria'>('rectificatoria')
  const [reasonCategory, setReasonCategory] = useState<keyof typeof RELIQUIDATION_REASON_CATEGORIES>('otro')
  const [reasonText, setReasonText] = useState('')

  const [modifications, setModifications] = useState<ReliquidationModifications>({})

  const [bonusItems, setBonusItems] = useState<ItemEntry[]>([])
  const [nonTaxableItems, setNonTaxableItems] = useState<ItemEntry[]>([])

  useEffect(() => {
    loadOriginalSlip()
  }, [params.id])

  const loadOriginalSlip = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payroll_slips')
        .select(`
          *,
          employees (*),
          payroll_periods (*),
          payroll_items (*)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error

      if (!data) {
        alert('Liquidación no encontrada')
        router.push('/payroll')
        return
      }

      if (data.status !== 'issued' && data.status !== 'sent') {
        alert('Solo se pueden crear reliquidaciones de liquidaciones emitidas o enviadas')
        router.push(`/payroll/${params.id}`)
        return
      }

      setOriginalSlip(data as PayrollSlipWithDetails)

      const items = data.payroll_items || []
      const initialMods: ReliquidationModifications = {}
      const initialBonusItems: ItemEntry[] = []
      const initialNonTaxableItems: ItemEntry[] = []

      for (const item of items) {
        if (item.type === 'taxable_earning') {
          if (item.category === 'bono' || item.category === 'bonos' || item.category === 'bono_asistencia' || item.category === 'bono_puntualidad') {
            initialBonusItems.push({
              id: `orig-${item.id}`,
              name: item.description || 'Bono',
              amount: Number(item.amount) || 0,
              type: 'taxable_earning',
              category: item.category,
              originalAmount: Number(item.amount) || 0,
              originalItemId: item.id,
            })
            initialMods.bonuses = (initialMods.bonuses || 0) + (Number(item.amount) || 0)
          } else if (item.category === 'horas_extras') {
            initialMods.overtime = (initialMods.overtime || 0) + (Number(item.amount) || 0)
          } else if (item.category === 'vacaciones') {
            initialMods.vacation = (initialMods.vacation || 0) + (Number(item.amount) || 0)
          } else if (item.category !== 'sueldo_base' && item.category !== 'gratificacion') {
            initialMods.other_taxable_earnings = (initialMods.other_taxable_earnings || 0) + (Number(item.amount) || 0)
          }
        } else if (item.type === 'non_taxable_earning') {
          if (item.category === 'movilizacion') {
            initialMods.transportation = (initialMods.transportation || 0) + (Number(item.amount) || 0)
          } else if (item.category === 'colacion') {
            initialMods.meal_allowance = (initialMods.meal_allowance || 0) + (Number(item.amount) || 0)
          } else if (item.category === 'aguinaldo') {
            initialMods.aguinaldo = (initialMods.aguinaldo || 0) + (Number(item.amount) || 0)
          } else if (item.category !== 'movilizacion' && item.category !== 'colacion' && item.category !== 'aguinaldo') {
            initialNonTaxableItems.push({
              id: `orig-${item.id}`,
              name: item.description || 'Haber No Imponible',
              amount: Number(item.amount) || 0,
              type: 'non_taxable_earning',
              category: item.category,
              originalAmount: Number(item.amount) || 0,
              originalItemId: item.id,
            })
          }
        } else if (item.type === 'other_deduction') {
          if (item.category === 'prestamos' || item.category === 'otros_prestamos') {
            initialMods.loans = (initialMods.loans || 0) + (Number(item.amount) || 0)
          } else if (item.category === 'anticipos' || item.category === 'anticipo') {
            initialMods.advances = (initialMods.advances || 0) + (Number(item.amount) || 0)
          }
        }
      }

      setBonusItems(initialBonusItems)
      setNonTaxableItems(initialNonTaxableItems)
      setModifications(initialMods)
    } catch (error: any) {
      console.error('Error al cargar liquidación:', error)
      alert('Error al cargar liquidación: ' + error.message)
      router.push('/payroll')
    } finally {
      setLoading(false)
    }
  }

  const recalcBonusesFromItems = (items: ItemEntry[]): number => {
    return items.reduce((sum, i) => sum + i.amount, 0)
  }

  const updateBonusItem = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...bonusItems]
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value as string }
    } else {
      updated[index] = { ...updated[index], amount: Number(value) || 0 }
    }
    setBonusItems(updated)
    setModifications(prev => ({ ...prev, bonuses: recalcBonusesFromItems(updated) }))
  }

  const addBonusItem = () => {
    const newItem: ItemEntry = {
      id: `new-${Date.now()}`,
      name: BONUS_OPTIONS[0],
      amount: 0,
      type: 'taxable_earning',
      category: 'bono',
      originalAmount: 0,
      originalItemId: null,
    }
    const updated = [...bonusItems, newItem]
    setBonusItems(updated)
  }

  const removeBonusItem = (index: number) => {
    const updated = bonusItems.filter((_, i) => i !== index)
    setBonusItems(updated)
    setModifications(prev => ({ ...prev, bonuses: recalcBonusesFromItems(updated) }))
  }

  const updateNonTaxableItem = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...nonTaxableItems]
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value as string }
    } else {
      updated[index] = { ...updated[index], amount: Number(value) || 0 }
    }
    setNonTaxableItems(updated)
  }

  const addNonTaxableItem = () => {
    const newItem: ItemEntry = {
      id: `new-${Date.now()}`,
      name: NON_TAXABLE_OPTIONS[0],
      amount: 0,
      type: 'non_taxable_earning',
      category: 'otro_no_imponible',
      originalAmount: 0,
      originalItemId: null,
    }
    setNonTaxableItems([...nonTaxableItems, newItem])
  }

  const removeNonTaxableItem = (index: number) => {
    setNonTaxableItems(nonTaxableItems.filter((_, i) => i !== index))
  }

  const handleCalculate = async () => {
    if (!originalSlip) return

    try {
      setCalculating(true)

      const modsToSend = { ...modifications, bonuses: recalcBonusesFromItems(bonusItems) }

      const response = await fetch('/api/payroll/reliquidations/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_payroll_slip_id: originalSlip.id,
          modifications: modsToSend,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al calcular reliquidación')
      }

      const result = await response.json()
      setCalculationResult(result)
    } catch (error: any) {
      console.error('Error al calcular:', error)
      alert('Error al calcular reliquidación: ' + error.message)
    } finally {
      setCalculating(false)
    }
  }

  const handleSave = async () => {
    if (!originalSlip || !calculationResult) {
      alert('Debe calcular la reliquidación antes de guardar')
      return
    }

    if (!reasonText.trim() && reasonCategory === 'otro') {
      alert('Debe especificar el motivo de la reliquidación')
      return
    }

    try {
      setSaving(true)

      const modsToSend = { ...modifications, bonuses: recalcBonusesFromItems(bonusItems) }

      const response = await fetch('/api/payroll/reliquidations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_payroll_slip_id: originalSlip.id,
          type,
          reason_category: reasonCategory,
          reason_text: reasonText,
          modifications: modsToSend,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar reliquidación')
      }

      const reliquidation = await response.json()
      alert('Reliquidación creada correctamente')
      router.push(`/payroll/reliquidations/${reliquidation.id}`)
    } catch (error: any) {
      console.error('Error al guardar:', error)
      alert('Error al guardar reliquidación: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const formatNumberForInput = (num: number) => {
    return num.toString()
  }

  const parseFormattedNumber = (str: string): number => {
    return Number(str.replace(/\./g, '').replace(',', '.')) || 0
  }

  if (loading) {
    return (
      <div>
        <div className="card">
          <p>Cargando liquidación...</p>
        </div>
      </div>
    )
  }

  if (!originalSlip) {
    return (
      <div>
        <div className="card">
          <p>Liquidación no encontrada</p>
        </div>
      </div>
    )
  }

  const originalItems = originalSlip.payroll_items || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href={`/payroll/${originalSlip.id}`}>
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaArrowLeft size={14} />
              Volver
            </button>
          </Link>
          <h1>Crear Reliquidación</h1>
        </div>
      </div>

      {/* Información de la liquidación original */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Liquidación Original</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Trabajador</label>
            <p>{originalSlip.employees?.full_name} - {originalSlip.employees?.rut}</p>
          </div>
          <div className="form-group">
            <label>Período</label>
            <p>
              {originalSlip.payroll_periods ?
                formatMonthYear(originalSlip.payroll_periods.year, originalSlip.payroll_periods.month) :
                '-'
              }
            </p>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <p>
              <span className={`badge ${originalSlip.status}`}>
                {originalSlip.status === 'issued' ? 'Emitida' : 'Enviada'}
              </span>
            </p>
          </div>
        </div>

        {/* Detalle de items originales */}
        <h3 style={{ marginTop: '20px', marginBottom: '12px' }}>Detalle de Conceptos Originales</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {originalItems.filter(i => i.type !== 'legal_deduction').map((item, idx) => {
                const typeLabel: Record<string, string> = {
                  'taxable_earning': 'Imponible',
                  'non_taxable_earning': 'No Imponible',
                  'other_deduction': 'Descuento',
                }
                return (
                  <tr key={idx}>
                    <td>{item.description || item.category}</td>
                    <td><span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: item.type === 'taxable_earning' ? '#dbeafe' : item.type === 'non_taxable_earning' ? '#dcfce7' : '#fef3c7' }}>{typeLabel[item.type] || item.type}</span></td>
                    <td style={{ textAlign: 'right' }}>${Number(item.amount).toLocaleString('es-CL')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulario de reliquidación */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Datos de la Reliquidación</h2>

        <div className="form-row">
          <div className="form-group">
            <label>Tipo de Reliquidación *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'rectificatoria' | 'complementaria')}
            >
              <option value="rectificatoria">Rectificatoria (corrige montos del mismo período)</option>
              <option value="complementaria">Complementaria (agrega diferencias que se pagan después)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Motivo *</label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value as keyof typeof RELIQUIDATION_REASON_CATEGORIES)}
            >
              {Object.entries(RELIQUIDATION_REASON_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Descripción del Motivo *</label>
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={3}
            placeholder="Explique detalladamente el motivo de la reliquidación..."
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
        </div>
      </div>

      {/* Modificaciones */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Modificaciones a Aplicar</h2>
        <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
          Modifique los valores que desea corregir. Los items originales se muestran con su monto original — edite el monto o agregue nuevos items.
        </p>

        {/* Campos base */}
        <div className="form-row">
          <div className="form-group">
            <label>Días Trabajados</label>
            <input
              type="number"
              value={modifications.days_worked ?? originalSlip.days_worked}
              onChange={(e) => setModifications({
                ...modifications,
                days_worked: e.target.value ? parseInt(e.target.value) : undefined
              })}
              min={0}
              max={31}
            />
            <small style={{ color: '#6b7280' }}>
              Original: {originalSlip.days_worked} días
            </small>
          </div>
          <div className="form-group">
            <label>Días de Licencia</label>
            <input
              type="number"
              value={modifications.days_leave ?? originalSlip.days_leave ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                days_leave: e.target.value ? parseInt(e.target.value) : undefined
              })}
              min={0}
            />
            <small style={{ color: '#6b7280' }}>
              Original: {originalSlip.days_leave || 0} días
            </small>
          </div>
          <div className="form-group">
            <label>Sueldo Base</label>
            <input
              type="number"
              value={modifications.base_salary ?? originalSlip.base_salary}
              onChange={(e) => setModifications({
                ...modifications,
                base_salary: e.target.value ? parseFloat(e.target.value) : undefined
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalSlip.base_salary.toLocaleString('es-CL')}
            </small>
          </div>
        </div>

        {/* Bonos - items individuales */}
        <h3 style={{ marginTop: '24px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Bonos Imponibles</span>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Total: ${recalcBonusesFromItems(bonusItems).toLocaleString('es-CL')}
          </span>
        </h3>

        {bonusItems.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '12px' }}>No hay bonos en la liquidación original.</p>
        )}

        {bonusItems.map((item, index) => (
          <div key={item.id} className="form-row" style={{ marginBottom: '8px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '2' }}>
              <label>{index === 0 ? 'Tipo de Bono' : ''}</label>
              <select
                value={item.name}
                onChange={(e) => updateBonusItem(index, 'name', e.target.value)}
                style={{ width: '100%' }}
              >
                {BONUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1' }}>
              <label>{index === 0 ? 'Monto' : ''}</label>
              <input
                type="text"
                value={formatNumberForInput(item.amount)}
                onChange={(e) => updateBonusItem(index, 'amount', e.target.value)}
                placeholder="Monto"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', minWidth: '80px' }}>
              {item.originalAmount > 0 && (
                <small style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                  Orig: ${item.originalAmount.toLocaleString('es-CL')}
                </small>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
              <button
                type="button"
                onClick={() => removeBonusItem(index)}
                style={{
                  padding: '6px 10px',
                  background: '#fff',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#dc2626',
                }}
                title="Eliminar"
              >
                <FaTrash size={12} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addBonusItem}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: '#eff6ff', border: '1px solid #93c5fd',
            borderRadius: '4px', cursor: 'pointer', color: '#3b82f6', fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          <FaPlus size={12} /> Agregar Bono
        </button>

        {/* Horas Extras y Vacaciones */}
        <div className="form-row">
          <div className="form-group">
            <label>Horas Extras</label>
            <input
              type="number"
              value={modifications.overtime ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                overtime: e.target.value ? parseFloat(e.target.value) : 0
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalItems
                .filter(i => i.type === 'taxable_earning' && i.category === 'horas_extras')
                .reduce((sum, i) => sum + Number(i.amount), 0)
                .toLocaleString('es-CL')}
            </small>
          </div>
          <div className="form-group">
            <label>Vacaciones</label>
            <input
              type="number"
              value={modifications.vacation ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                vacation: e.target.value ? parseFloat(e.target.value) : 0
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalItems
                .filter(i => i.type === 'taxable_earning' && i.category === 'vacaciones')
                .reduce((sum, i) => sum + Number(i.amount), 0)
                .toLocaleString('es-CL')}
            </small>
          </div>
        </div>

        <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>Haberes No Imponibles</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Movilización</label>
            <input
              type="number"
              value={modifications.transportation ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                transportation: e.target.value ? parseFloat(e.target.value) : 0
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalItems
                .filter(i => i.type === 'non_taxable_earning' && i.category === 'movilizacion')
                .reduce((sum, i) => sum + Number(i.amount), 0)
                .toLocaleString('es-CL')}
            </small>
          </div>
          <div className="form-group">
            <label>Colación</label>
            <input
              type="number"
              value={modifications.meal_allowance ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                meal_allowance: e.target.value ? parseFloat(e.target.value) : 0
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalItems
                .filter(i => i.type === 'non_taxable_earning' && i.category === 'colacion')
                .reduce((sum, i) => sum + Number(i.amount), 0)
                .toLocaleString('es-CL')}
            </small>
          </div>
          <div className="form-group">
            <label>Aguinaldo</label>
            <input
              type="number"
              value={modifications.aguinaldo ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                aguinaldo: e.target.value ? parseFloat(e.target.value) : 0
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalItems
                .filter(i => i.type === 'non_taxable_earning' && i.category === 'aguinaldo')
                .reduce((sum, i) => sum + Number(i.amount), 0)
                .toLocaleString('es-CL')}
            </small>
          </div>
        </div>

        {/* Haberes No Imponibles adicionales - items individuales */}
        {nonTaxableItems.length > 0 && (
          <h4 style={{ marginTop: '16px', marginBottom: '8px', color: '#4b5563' }}>Haberes No Imponibles Adicionales</h4>
        )}

        {nonTaxableItems.map((item, index) => (
          <div key={item.id} className="form-row" style={{ marginBottom: '8px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '2' }}>
              <label>{index === 0 ? 'Tipo de Haber' : ''}</label>
              <select
                value={item.name}
                onChange={(e) => updateNonTaxableItem(index, 'name', e.target.value)}
                style={{ width: '100%' }}
              >
                {NON_TAXABLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1' }}>
              <label>{index === 0 ? 'Monto' : ''}</label>
              <input
                type="text"
                value={formatNumberForInput(item.amount)}
                onChange={(e) => updateNonTaxableItem(index, 'amount', e.target.value)}
                placeholder="Monto"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', minWidth: '80px' }}>
              {item.originalAmount > 0 && (
                <small style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                  Orig: ${item.originalAmount.toLocaleString('es-CL')}
                </small>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
              <button
                type="button"
                onClick={() => removeNonTaxableItem(index)}
                style={{
                  padding: '6px 10px', background: '#fff', border: '1px solid #fecaca',
                  borderRadius: '4px', cursor: 'pointer', color: '#dc2626',
                }}
                title="Eliminar"
              >
                <FaTrash size={12} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addNonTaxableItem}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: '4px', cursor: 'pointer', color: '#059669', fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          <FaPlus size={12} /> Agregar Haber No Imponible
        </button>

        <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Descuentos</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Préstamos</label>
            <input
              type="number"
              value={modifications.loans ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                loans: e.target.value ? parseFloat(e.target.value) : 0
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalItems
                .filter(i => i.type === 'other_deduction' && (i.category === 'prestamos' || i.category === 'otros_prestamos'))
                .reduce((sum, i) => sum + Number(i.amount), 0)
                .toLocaleString('es-CL')}
            </small>
          </div>
          <div className="form-group">
            <label>Anticipos</label>
            <input
              type="number"
              value={modifications.advances ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                advances: e.target.value ? parseFloat(e.target.value) : 0
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalItems
                .filter(i => i.type === 'other_deduction' && (i.category === 'anticipos' || i.category === 'anticipo'))
                .reduce((sum, i) => sum + Number(i.amount), 0)
                .toLocaleString('es-CL')}
            </small>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            style={{
              background: '#3b82f6',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaCalculator size={14} />
            {calculating ? 'Calculando...' : 'Calcular Reliquidación'}
          </button>
        </div>
      </div>

      {/* Resultado del cálculo */}
      {calculationResult && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Comparación: Antes / Después</h2>

          <div style={{ marginBottom: '24px' }}>
            <h3>Resumen de Diferencias</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Diferencia Haberes</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>
                  +${calculationResult.delta.diff_total_earnings.toLocaleString('es-CL')}
                </div>
              </div>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Diferencia Descuentos</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
                  ${calculationResult.delta.diff_total_deductions.toLocaleString('es-CL')}
                </div>
              </div>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Diferencia Líquido</div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: calculationResult.delta.diff_net_pay >= 0 ? '#059669' : '#dc2626'
                }}>
                  {calculationResult.delta.diff_net_pay >= 0 ? '+' : ''}${calculationResult.delta.diff_net_pay.toLocaleString('es-CL')}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla comparativa */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Monto Original</th>
                  <th>Monto Corregido</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {calculationResult.items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td>{item.description}</td>
                    <td>${item.original_amount.toLocaleString('es-CL')}</td>
                    <td>${item.corrected_amount.toLocaleString('es-CL')}</td>
                    <td style={{
                      color: item.difference >= 0 ? '#059669' : '#dc2626',
                      fontWeight: '600'
                    }}>
                      {item.difference >= 0 ? '+' : ''}${item.difference.toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: '#059669',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaRedo size={14} />
              {saving ? 'Guardando...' : 'Guardar Reliquidación'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}