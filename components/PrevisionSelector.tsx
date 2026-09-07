'use client'

import { useState, useEffect } from 'react'
import { AVAILABLE_AFPS, AVAILABLE_HEALTH_SYSTEMS } from '@/lib/services/previredAPI'
import { FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa'

// Tipos de regímenes especiales
export const OTHER_REGIMES = [
  { value: 'DIPRECA', label: 'DIPRECA - Dir. Previsión Carabineros de Chile' },
  { value: 'CAPREDENA', label: 'CAPREDENA - Caja Prev. Defensa Nacional' },
  { value: 'SIN_PREVISION', label: 'Sin Previsión (Art. 24 DL 3500)' },
  { value: 'OTRO', label: 'Otro Régimen Especial' }
]

export interface PrevisionFormData {
  // Régimen
  previsional_regime?: 'AFP' | 'OTRO_REGIMEN'
  
  // Tipo de trabajador
  worker_type?: 'REGULAR' | 'DOMESTIC_WORKER'
  domestic_worker_mode?: 'LIVE_IN' | 'LIVE_OUT'
  gratification_type?: 'NONE' | 'LEGAL_ARTICLE_47' | 'LEGAL_ARTICLE_50' | 'CONTRACTUAL'
  weekly_hours?: string
  law16744_organism?: 'MUTUAL' | 'ISL'
  law16744_rate?: string
  afc_applicable?: boolean
  
  // Campos AFP
  afp?: string
  health_system?: string
  health_plan?: string
  health_plan_percentage?: string
  
  // Campos Otro Régimen
  other_regime_type?: string
  manual_regime_label?: string
  manual_pension_rate?: string
  manual_health_rate?: string
  manual_base_type?: 'base' | 'imponible'
  manual_employer_rate?: string
}

interface PrevisionSelectorProps {
  value: PrevisionFormData
  onChange: (data: PrevisionFormData) => void
  required?: boolean
}

export default function PrevisionSelector({ 
  value, 
  onChange, 
  required = true 
}: PrevisionSelectorProps) {
  
  // Estado local para controlar el régimen seleccionado
  const regime = value.previsional_regime || 'AFP'
  
  const handleRegimeChange = (newRegime: 'AFP' | 'OTRO_REGIMEN') => {
    if (newRegime === 'AFP') {
      // Limpiar campos de otro régimen y establecer valores AFP por defecto
      onChange({
        previsional_regime: 'AFP',
        afp: value.afp || 'PROVIDA',
        health_system: value.health_system || 'FONASA',
        health_plan: '',
        health_plan_percentage: '',
        other_regime_type: '',
        manual_regime_label: '',
        manual_pension_rate: '',
        manual_health_rate: '',
        manual_base_type: undefined,
        manual_employer_rate: ''
      })
    } else {
      // Limpiar campos AFP y establecer valores de otro régimen
      onChange({
        previsional_regime: 'OTRO_REGIMEN',
        afp: '',
        health_system: '',
        health_plan: '',
        health_plan_percentage: '',
        other_regime_type: value.other_regime_type || 'DIPRECA',
        manual_regime_label: value.manual_regime_label || '',
        manual_pension_rate: value.manual_pension_rate || '',
        manual_health_rate: value.manual_health_rate || '7',
        manual_base_type: value.manual_base_type || 'imponible',
        manual_employer_rate: value.manual_employer_rate || ''
      })
    }
  }
  
  const handleOtherRegimeTypeChange = (newType: string) => {
    // Si cambia el tipo, actualizar la etiqueta por defecto
    const defaultLabels: Record<string, string> = {
      'DIPRECA': 'Cotización DIPRECA',
      'CAPREDENA': 'Cotización CAPREDENA',
      'SIN_PREVISION': 'Sin Previsión',
      'OTRO': 'Cotización Previsional'
    }
    
    onChange({
      ...value,
      other_regime_type: newType,
      manual_regime_label: defaultLabels[newType] || 'Cotización Previsional'
    })
  }
  
  return (
    <div style={{ marginTop: '32px' }}>
      <h2>Régimen Previsional</h2>
      
      {/* Selector de Tipo de Trabajador */}
      <div className="form-row">
        <div className="form-group">
          <label>Tipo de Trabajador *</label>
          <select
            required={required}
            value={value.worker_type || 'REGULAR'}
            onChange={(e) => {
              const workerType = e.target.value as 'REGULAR' | 'DOMESTIC_WORKER'
              if (workerType === 'DOMESTIC_WORKER') {
                onChange({
                  ...value,
                  worker_type: 'DOMESTIC_WORKER',
                  domestic_worker_mode: value.domestic_worker_mode || 'LIVE_OUT',
                  gratification_type: 'NONE',
                  law16744_organism: value.law16744_organism || 'ISL',
                  law16744_rate: value.law16744_rate || '0.93',
                  previsional_regime: 'AFP',
                  afc_applicable: false as any,
                })
              } else {
                onChange({
                  ...value,
                  worker_type: 'REGULAR',
                  domestic_worker_mode: undefined,
                  gratification_type: value.gratification_type || 'LEGAL_ARTICLE_50',
                  law16744_organism: undefined,
                  law16744_rate: undefined,
                  weekly_hours: undefined,
                  afc_applicable: undefined as any,
                })
              }
            }}
            style={{
              padding: '10px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="REGULAR">Trabajador Dependiente Regular</option>
            <option value="DOMESTIC_WORKER">Trabajadora de Casa Particular</option>
          </select>
          <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {value.worker_type === 'DOMESTIC_WORKER' 
              ? 'Persona natural que contrata asesora de hogar. Sin gratificación, sin AFC trabajador, con reglas especiales.' 
              : 'Trabajador dependiente regular con gratificación legal y AFC.'}
          </small>
        </div>
      </div>
      
      {/* Campos de Casa Particular */}
      {value.worker_type === 'DOMESTIC_WORKER' && (
        <>
          <div className="form-row" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label>Modalidad *</label>
              <select
                required={required}
                value={value.domestic_worker_mode || 'LIVE_OUT'}
                onChange={(e) => onChange({ ...value, domestic_worker_mode: e.target.value as 'LIVE_IN' | 'LIVE_OUT' })}
                style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="LIVE_OUT">Puertas Afuera</option>
                <option value="LIVE_IN">Puertas Adentro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Horas Semanales Efectivas</label>
              <input
                type="number"
                min="1"
                max="45"
                step="0.25"
                value={value.weekly_hours || ''}
                onChange={(e) => onChange({ ...value, weekly_hours: e.target.value })}
                placeholder="Ej: 26.25"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Horas efectivas (sin colación). Para calcular salario mínimo proporcional.
              </small>
            </div>
            <div className="form-group">
              <label>Gratificación</label>
              <select
                value={value.gratification_type || 'NONE'}
                onChange={(e) => onChange({ ...value, gratification_type: e.target.value as any })}
                style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="NONE">Sin Gratificación (recomendado)</option>
                <option value="LEGAL_ARTICLE_47">Art. 47 (25% sin tope)</option>
                <option value="LEGAL_ARTICLE_50">Art. 50 (25% con tope)</option>
                <option value="CONTRACTUAL">Contractual (monto pactado)</option>
              </select>
              <small style={{ color: '#dc2626', fontSize: '12px' }}>
                Casa particular: normalmente SIN gratificación.
              </small>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Organismo Ley 16.744</label>
              <select
                value={value.law16744_organism || 'ISL'}
                onChange={(e) => onChange({ ...value, law16744_organism: e.target.value as 'MUTUAL' | 'ISL' })}
                style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="ISL">ISL - Instituto de Seguridad Laboral (0.93%)</option>
                <option value="MUTUAL">Mutual de Seguridad</option>
              </select>
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Cargo del empleador. Casa particular suele usar ISL.
              </small>
            </div>
            <div className="form-group">
              <label>Tasa Ley 16.744 (%)</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.01"
                value={value.law16744_rate || '0.93'}
                onChange={(e) => onChange({ ...value, law16744_rate: e.target.value })}
                placeholder="0.93"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Tasa base + adicional si corresponde. ISL: 0.93%
              </small>
            </div>
          </div>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '12px',
            marginTop: '12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <FaExclamationTriangle style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#92400e' }}>
              <strong>Casa Particular:</strong> No se aplica AFC al trabajador (0%). AFC empleador: 3%. Indemnización a todo evento: 1.11%. Gratificación: deshabilitada por defecto. Ley 16.744: cargo empleador.
            </div>
          </div>
        </>
      )}

      {/* Selector de Régimen */}
      <div className="form-row" style={{ marginTop: '16px' }}>
        <div className="form-group">
          <label>Tipo de Régimen Previsional *</label>
          <select
            required={required}
            value={regime}
            onChange={(e) => handleRegimeChange(e.target.value as 'AFP' | 'OTRO_REGIMEN')}
            style={{
              padding: '10px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="AFP">AFP (Sistema Previred)</option>
            <option value="OTRO_REGIMEN">Régimen Especial (DIPRECA, CAPREDENA, etc.)</option>
          </select>
          <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {regime === 'AFP' 
              ? 'Sistema previsional estándar con AFP, salud y seguro de cesantía' 
              : 'Régimen especial para personal uniformado o sin previsión'}
          </small>
        </div>
      </div>
      
      {/* FLUJO AFP */}
      {regime === 'AFP' && (
        <>
          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>AFP *</label>
              <select
                required={required}
                value={value.afp || 'PROVIDA'}
                onChange={(e) => onChange({ ...value, afp: e.target.value })}
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
                required={required}
                value={value.health_system || 'FONASA'}
                onChange={(e) => onChange({ ...value, health_system: e.target.value })}
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
                value={value.health_plan || ''}
                onChange={(e) => onChange({ ...value, health_plan: e.target.value })}
                placeholder="Nombre del plan (solo si es ISAPRE)"
              />
            </div>
          </div>
          
          {value.health_system === 'ISAPRE' && (
            <div className="form-group">
              <label>Monto del Plan ISAPRE (UF) *</label>
              <input
                type="number"
                required={required}
                min="0"
                max="20"
                step="0.01"
                value={value.health_plan_percentage || ''}
                onChange={(e) => onChange({ ...value, health_plan_percentage: e.target.value })}
                placeholder="Ej: 2.4 (para 2.4 UF)"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Monto del plan ISAPRE en Unidades de Fomento (UF). Se calculará automáticamente al momento de la liquidación multiplicando este valor por el valor de UF del día.
              </small>
            </div>
          )}
          
          <div style={{
            background: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            padding: '12px',
            marginTop: '16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <FaInfoCircle style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#1e3a8a' }}>
              <strong>Cálculo Automático:</strong> Las tasas de AFP, SIS y AFC se obtienen automáticamente de Previred según el período de la liquidación.
            </div>
          </div>
        </>
      )}
      
      {/* FLUJO OTRO RÉGIMEN */}
      {regime === 'OTRO_REGIMEN' && (
        <>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '12px',
            marginTop: '16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <FaExclamationTriangle style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#92400e' }}>
              <strong>Régimen Especial:</strong> Los porcentajes de descuento deben ingresarse manualmente. No se aplica SIS ni AFC. Asegúrate de tener las tasas correctas antes de proceder.
            </div>
          </div>
          
          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Tipo de Régimen Especial *</label>
              <select
                required={required}
                value={value.other_regime_type || 'DIPRECA'}
                onChange={(e) => handleOtherRegimeTypeChange(e.target.value)}
              >
                {OTHER_REGIMES.map((regime) => (
                  <option key={regime.value} value={regime.value}>
                    {regime.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Etiqueta para Liquidación</label>
              <input
                type="text"
                value={value.manual_regime_label || ''}
                onChange={(e) => onChange({ ...value, manual_regime_label: e.target.value })}
                placeholder="Ej: Cotización DIPRECA"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Cómo aparecerá en las liquidaciones
              </small>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Porcentaje Previsión Trabajador (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={value.manual_pension_rate || ''}
                onChange={(e) => onChange({ ...value, manual_pension_rate: e.target.value })}
                placeholder="Ej: 10.75"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Porcentaje que se descuenta al trabajador. Ej: DIPRECA ~6-10%
              </small>
            </div>
            <div className="form-group">
              <label>Porcentaje Salud Trabajador (%) *</label>
              <input
                type="number"
                required={required}
                min="0"
                max="100"
                step="0.01"
                value={value.manual_health_rate || '7'}
                onChange={(e) => onChange({ ...value, manual_health_rate: e.target.value })}
                placeholder="7.00"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Generalmente 7% (FONASA)
              </small>
            </div>
            <div className="form-group">
              <label>Base de Cálculo *</label>
              <select
                required={required}
                value={value.manual_base_type || 'imponible'}
                onChange={(e) => onChange({ ...value, manual_base_type: e.target.value as 'base' | 'imponible' })}
              >
                <option value="imponible">Total Imponible (sueldo + bonos + gratificación)</option>
                <option value="base">Solo Sueldo Base</option>
              </select>
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Base sobre la que se calculan los descuentos
              </small>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Porcentaje Empleador (opcional)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={value.manual_employer_rate || ''}
                onChange={(e) => onChange({ ...value, manual_employer_rate: e.target.value })}
                placeholder="Ej: 16.0"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Solo para reportes y cálculos de costos empresariales. Ej: DIPRECA empleador ~16%
              </small>
            </div>
          </div>
          
          <div style={{
            background: '#e0f2fe',
            border: '1px solid #0284c7',
            borderRadius: '6px',
            padding: '12px',
            marginTop: '16px',
            fontSize: '13px',
            color: '#0c4a6e'
          }}>
            <strong>Nota sobre AFC:</strong> Los regímenes especiales (DIPRECA, CAPREDENA) y trabajadores del sector público NO cotizan AFC (Seguro de Cesantía) según normativa DT.
          </div>
        </>
      )}
    </div>
  )
}


