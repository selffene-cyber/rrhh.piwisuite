'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatMonthYear } from '@/lib/utils/date'
import { FaArrowLeft, FaRedo, FaCalculator } from 'react-icons/fa'
import { PayrollSlipWithDetails, RELIQUIDATION_REASON_CATEGORIES } from '@/types'
import { ReliquidationModifications } from '@/lib/services/reliquidationCalculator'

export default function CreateReliquidationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [originalSlip, setOriginalSlip] = useState<PayrollSlipWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calculationResult, setCalculationResult] = useState<any>(null)

  // Formulario
  const [type, setType] = useState<'rectificatoria' | 'complementaria'>('rectificatoria')
  const [reasonCategory, setReasonCategory] = useState<keyof typeof RELIQUIDATION_REASON_CATEGORIES>('otro')
  const [reasonText, setReasonText] = useState('')
  
  // Modificaciones
  const [modifications, setModifications] = useState<ReliquidationModifications>({})

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

      // Verificar que esté emitida o enviada
      if (data.status !== 'issued' && data.status !== 'sent') {
        alert('Solo se pueden crear reliquidaciones de liquidaciones emitidas o enviadas')
        router.push(`/payroll/${params.id}`)
        return
      }

      setOriginalSlip(data as PayrollSlipWithDetails)

      // Inicializar modificaciones con valores originales
      const items = data.payroll_items || []
      const initialMods: ReliquidationModifications = {}
      
      for (const item of items) {
        if (item.type === 'taxable_earning') {
          if (item.category === 'bonos') {
            initialMods.bonuses = Number(item.amount) || 0
          } else if (item.category === 'horas_extras') {
            initialMods.overtime = Number(item.amount) || 0
          } else if (item.category === 'vacaciones') {
            initialMods.vacation = Number(item.amount) || 0
          }
        } else if (item.type === 'non_taxable_earning') {
          if (item.category === 'movilizacion') {
            initialMods.transportation = Number(item.amount) || 0
          } else if (item.category === 'colacion') {
            initialMods.meal_allowance = Number(item.amount) || 0
          } else if (item.category === 'aguinaldo') {
            initialMods.aguinaldo = Number(item.amount) || 0
          }
        } else if (item.type === 'other_deduction') {
          if (item.category === 'prestamos') {
            initialMods.loans = Number(item.amount) || 0
          } else if (item.category === 'anticipos') {
            initialMods.advances = Number(item.amount) || 0
          }
        }
      }

      setModifications(initialMods)
    } catch (error: any) {
      console.error('Error al cargar liquidación:', error)
      alert('Error al cargar liquidación: ' + error.message)
      router.push('/payroll')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async () => {
    if (!originalSlip) return

    try {
      setCalculating(true)
      
      const response = await fetch('/api/payroll/reliquidations/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_payroll_slip_id: originalSlip.id,
          modifications,
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

      const response = await fetch('/api/payroll/reliquidations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_payroll_slip_id: originalSlip.id,
          type,
          reason_category: reasonCategory,
          reason_text: reasonText,
          modifications,
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
          Modifique solo los valores que desea corregir. Los valores no modificados se mantendrán iguales.
        </p>

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

        <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Haberes Imponibles</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Bonos</label>
            <input
              type="number"
              value={modifications.bonuses ?? 0}
              onChange={(e) => setModifications({
                ...modifications,
                bonuses: e.target.value ? parseFloat(e.target.value) : 0
              })}
              min={0}
              step="1000"
            />
            <small style={{ color: '#6b7280' }}>
              Original: ${originalItems
                .filter(i => i.type === 'taxable_earning' && i.category === 'bonos')
                .reduce((sum, i) => sum + Number(i.amount), 0)
                .toLocaleString('es-CL')}
            </small>
          </div>
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

        <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Haberes No Imponibles</h3>
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
        </div>

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
                .filter(i => i.type === 'other_deduction' && i.category === 'prestamos')
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
                .filter(i => i.type === 'other_deduction' && i.category === 'anticipos')
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
