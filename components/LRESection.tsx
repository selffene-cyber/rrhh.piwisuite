'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FaExclamationTriangle, FaCalculator } from 'react-icons/fa'
import { calcularTramoAsignacionFamiliar } from '@/lib/services/lre/lreCalculations'

interface LRECatalogOption {
  code: number | string
  label: string
  name?: string
}

interface LRESectionProps {
  employeeId?: string
  formData: Record<string, any>
  onChange: (field: string, value: any) => void
}

interface Sindicato {
  id?: string
  sindicato_order: number
  rut_sindicato: string
  nombre_sindicato?: string
}

const MANDATORY_FIELDS = [
  'dt_tipo_impuesto_renta', 'dt_tipo_jornada_code', 'dt_discapacidad',
  'dt_pensionado_vejez', 'dt_afp_code', 'dt_isapre_fonasa_code',
  'dt_ccaf_code', 'dt_mutual_code', 'ahorro_previsional_voluntario',
  'ahorro_previsional_colectivo', 'indemnizacion_a_todo_evento',
]

export default function LRESection({ employeeId, formData, onChange }: LRESectionProps) {
  const [catalogs, setCatalogs] = useState<{
    tiposJornada: LRECatalogOption[]
    afps: LRECatalogOption[]
    isapreFonasa: LRECatalogOption[]
    ccaf: LRECatalogOption[]
    mutual: LRECatalogOption[]
    tiposImpuesto: LRECatalogOption[]
    discapacidad: LRECatalogOption[]
    pensionadoVejez: LRECatalogOption[]
    tecnicoExtranjero: LRECatalogOption[]
    afc: LRECatalogOption[]
    causalesTermino: LRECatalogOption[]
    tramosAsignacion: LRECatalogOption[]
    ipsExINP: LRECatalogOption[]
  }>({
    tiposJornada: [], afps: [], isapreFonasa: [], ccaf: [], mutual: [],
    tiposImpuesto: [], discapacidad: [], pensionadoVejez: [],
    tecnicoExtranjero: [], afc: [], causalesTermino: [], tramosAsignacion: [],
    ipsExINP: [],
  })
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCatalogs()
    if (employeeId) loadSindicatos()
  }, [employeeId])

  const loadCatalogs = async () => {
    try {
      const res = await fetch('/api/lre/catalogs')
      if (res.ok) {
        const data = await res.json()
        setCatalogs({
          tiposJornada: data.tiposJornada || [],
          afps: data.afps || [],
          isapreFonasa: data.isapreFonasa || [],
          ccaf: data.ccaf || [],
          mutual: data.mutualLey16744 || [],
          tiposImpuesto: data.tiposImpuestoRenta || [],
          discapacidad: data.discapacidad || [],
          pensionadoVejez: data.pensionadoVejez || [],
          tecnicoExtranjero: data.tecnicoExtranjero || [],
          afc: data.afc || [],
          causalesTermino: data.causalesTermino || [],
          tramosAsignacion: data.tramosAsignacionFamiliar || [],
          ipsExINP: data.ipsExINP || [],
        })
      }
    } catch (e) {
      console.error('Error cargando catálogos LRE:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadSindicatos = async () => {
    try {
      const res = await fetch(`/api/employees/${employeeId}/sindicatos`)
      if (res.ok) {
        const data = await res.json()
        setSindicatos(data || [])
      }
    } catch (e) {
      console.error('Error cargando sindicatos:', e)
    }
  }

  const handleAddSindicato = () => {
    if (sindicatos.length >= 10) return
    const nextOrder = sindicatos.length > 0 ? Math.max(...sindicatos.map(s => s.sindicato_order)) + 1 : 1
    setSindicatos([...sindicatos, { sindicato_order: nextOrder, rut_sindicato: '', nombre_sindicato: '' }])
  }

  const handleSindicatoChange = (index: number, field: 'rut_sindicato' | 'nombre_sindicato', value: string) => {
    const updated = [...sindicatos]
    updated[index] = { ...updated[index], [field]: value }
    setSindicatos(updated)
  }

  const handleRemoveSindicato = (index: number) => {
    setSindicatos(sindicatos.filter((_, i) => i !== index))
  }

  const handleSaveSindicatos = async () => {
    if (!employeeId) {
      alert('Guarde el trabajador primero para poder agregar sindicatos')
      return
    }
    try {
      for (const s of sindicatos) {
        if (s.id) {
          await fetch(`/api/employees/${employeeId}/sindicatos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sindicato_id: s.id, rut_sindicato: s.rut_sindicato, nombre_sindicato: s.nombre_sindicato }),
          })
        } else {
          await fetch(`/api/employees/${employeeId}/sindicatos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sindicato_order: s.sindicato_order, rut_sindicato: s.rut_sindicato, nombre_sindicato: s.nombre_sindicato }),
          })
        }
      }
      loadSindicatos()
      alert('Sindicatos guardados correctamente')
    } catch (e) {
      console.error('Error guardando sindicatos:', e)
      alert('Error al guardar sindicatos')
    }
  }

  const handleCalcularTramo = async () => {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      const { data: indicatorsData } = await supabase
        .from('previred_indicators')
        .select('indicators_json')
        .eq('year', year)
        .eq('month', month)
        .single()

      const indicators = indicatorsData?.indicators_json || null
      const baseSalary = parseFloat(formData.base_salary) || 0

      if (baseSalary <= 0) {
        alert('Ingrese el sueldo base antes de calcular el tramo')
        return
      }

      const tramo = calcularTramoAsignacionFamiliar(baseSalary, year, month, indicators)
      onChange('tramo_asignacion_familiar', tramo)
    } catch (e) {
      console.error('Error al calcular tramo:', e)
      alert('Error al calcular tramo. Verifique que los indicadores del período estén cargados.')
    }
  }

  const missingMandatory = MANDATORY_FIELDS.filter(f => formData[f] === null || formData[f] === undefined || formData[f] === '')

  if (loading) {
    return <div style={{ padding: '16px' }}>Cargando catálogos LRE...</div>
  }

  return (
    <div style={{ borderTop: '2px solid #2563eb', paddingTop: '16px', marginTop: '16px' }}>
      <h3 style={{ color: '#2563eb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Datos Libro de Remuneraciones Electrónico (DT)
        {missingMandatory.length > 0 && (
          <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FaExclamationTriangle size={10} />
            {missingMandatory.length} campo(s) obligatorio(s) pendiente(s)
          </span>
        )}
      </h3>

      {/* Identificación DT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        <div className="form-group">
          <label>Tipo Impuesto Renta <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_tipo_impuesto_renta ?? 1} onChange={e => onChange('dt_tipo_impuesto_renta', parseInt(e.target.value))}>
            {catalogs.tiposImpuesto.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Tipo Jornada <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_tipo_jornada_code ?? ''} onChange={e => onChange('dt_tipo_jornada_code', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Seleccionar...</option>
            {catalogs.tiposJornada.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>AFP (código DT) <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_afp_code ?? ''} onChange={e => onChange('dt_afp_code', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Seleccionar...</option>
            {catalogs.afps.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Fonasa/Isapre (código DT) <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_isapre_fonasa_code ?? ''} onChange={e => onChange('dt_isapre_fonasa_code', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Seleccionar...</option>
            {catalogs.isapreFonasa.map(i => <option key={i.code} value={i.code}>{i.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>IPS Ex-INP (código DT)</label>
          <select value={formData.dt_ips_code ?? ''} onChange={e => onChange('dt_ips_code', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Seleccionar...</option>
            {catalogs.ipsExINP.map(i => <option key={i.code} value={i.code}>{i.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>CCAF <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_ccaf_code ?? 0} onChange={e => onChange('dt_ccaf_code', parseInt(e.target.value))}>
            {catalogs.ccaf.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Org. Ley 16.744 <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_mutual_code ?? 0} onChange={e => onChange('dt_mutual_code', parseInt(e.target.value))}>
            {catalogs.mutual.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Discapacidad <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_discapacidad ?? 0} onChange={e => onChange('dt_discapacidad', parseInt(e.target.value))}>
            {catalogs.discapacidad.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Pensionado por vejez <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_pensionado_vejez ?? 0} onChange={e => onChange('dt_pensionado_vejez', parseInt(e.target.value))}>
            {catalogs.pensionadoVejez.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Técnico extranjero (Ley 18.156) <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_tecnico_extranjero ?? 0} onChange={e => onChange('dt_tecnico_extranjero', parseInt(e.target.value))}>
            {catalogs.tecnicoExtranjero.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>AFC <span style={{color:'red'}}>*</span></label>
          <select value={formData.dt_afc_code ?? (formData.afc_applicable ? 1 : 0)} onChange={e => onChange('dt_afc_code', parseInt(e.target.value))}>
            {catalogs.afc.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Causal de término (si aplica)</label>
          <select value={formData.termination_cause_code ?? ''} onChange={e => onChange('termination_cause_code', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Sin causal</option>
            {catalogs.causalesTermino.map(c => <option key={c.code} value={c.code}>{c.code} - {c.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Cargas familiares legales</label>
          <input type="number" min="0" max="99" value={formData.cargas_familiares_legales ?? 0} onChange={e => onChange('cargas_familiares_legales', parseInt(e.target.value) || 0)} />
        </div>

        <div className="form-group">
          <label>Cargas familiares maternales</label>
          <input type="number" min="0" max="99" value={formData.cargas_familiares_maternales ?? 0} onChange={e => onChange('cargas_familiares_maternales', parseInt(e.target.value) || 0)} />
        </div>

        <div className="form-group">
          <label>Cargas familiares invalidez</label>
          <input type="number" min="0" max="99" value={formData.cargas_familiares_invalidez ?? 0} onChange={e => onChange('cargas_familiares_invalidez', parseInt(e.target.value) || 0)} />
        </div>

        <div className="form-group">
          <label>Tramo asignación familiar</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={formData.tramo_asignacion_familiar ?? 'D'} onChange={e => onChange('tramo_asignacion_familiar', e.target.value)} style={{ flex: 1 }}>
              {catalogs.tramosAsignacion.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
            </select>
            <button
              type="button"
              onClick={handleCalcularTramo}
              title="Calcular tramo automáticamente basándose en los indicadores del período y el sueldo base"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', whiteSpace: 'nowrap', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              <FaCalculator size={12} />
              Auto
            </button>
          </div>
          <small style={{ color: '#6b7280', fontSize: '11px' }}>
            Use "Auto" para calcular según el sueldo base y los indicadores del período
          </small>
        </div>

        <div className="form-group">
          <label>Subsidio trabajador joven</label>
          <select value={formData.subsidio_trabajador_joven ?? 0} onChange={e => onChange('subsidio_trabajador_joven', parseInt(e.target.value))}>
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>

        <div className="form-group">
          <label>Puesto trabajo pesado</label>
          <input type="text" value={formData.puesto_trabajo_pesado ?? ''} onChange={e => onChange('puesto_trabajo_pesado', e.target.value || null)} placeholder="Nombre del puesto (vacío si no aplica)" />
        </div>

        <div className="form-group">
          <label>APV Individual <span style={{color:'red'}}>*</span></label>
          <select value={formData.ahorro_previsional_voluntario ?? 0} onChange={e => onChange('ahorro_previsional_voluntario', parseInt(e.target.value))}>
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>

        <div className="form-group">
          <label>APV Colectivo <span style={{color:'red'}}>*</span></label>
          <select value={formData.ahorro_previsional_colectivo ?? 0} onChange={e => onChange('ahorro_previsional_colectivo', parseInt(e.target.value))}>
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>

        <div className="form-group">
          <label>Indemnización a todo evento <span style={{color:'red'}}>*</span></label>
          <select value={formData.indemnizacion_a_todo_evento ?? 0} onChange={e => onChange('indemnizacion_a_todo_evento', parseInt(e.target.value))}>
            <option value={0}>No</option>
            <option value={1}>Sí</option>
          </select>
        </div>

        {formData.indemnizacion_a_todo_evento === 1 && (
          <div className="form-group">
            <label>Tasa indemnización (%) <span style={{color:'red'}}>*</span></label>
            <input type="number" step="0.01" min="4.11" value={formData.tasa_indemnizacion ?? ''} onChange={e => onChange('tasa_indemnizacion', parseFloat(e.target.value) || null)} placeholder="Mínimo 4.11%" />
            {formData.tasa_indemnizacion && formData.tasa_indemnizacion < 4.11 && (
              <small style={{ color: '#dc2626' }}>La tasa mínima legal es 4.11%</small>
            )}
          </div>
        )}

        <div className="form-group">
          <label>Días licencia médica (mes)</label>
          <input type="number" min="0" max="31" value={formData.dias_licencia_medica_mes ?? 0} onChange={e => onChange('dias_licencia_medica_mes', parseInt(e.target.value) || 0)} />
        </div>

        <div className="form-group">
          <label>Días vacaciones (mes)</label>
          <input type="number" min="0" max="31" value={formData.dias_vacaciones_mes ?? 0} onChange={e => onChange('dias_vacaciones_mes', parseInt(e.target.value) || 0)} />
        </div>
      </div>

      {/* Sindicatos */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ margin: 0 }}>Organizaciones Sindicales (máx. 10)</h4>
          {employeeId && (
            <button type="button" onClick={handleAddSindicato} disabled={sindicatos.length >= 10} style={{ fontSize: '12px', padding: '4px 8px' }}>
              + Agregar Sindicato
            </button>
          )}
        </div>
        {!employeeId ? (
          <p style={{ color: '#f59e0b', fontSize: '13px' }}>Guarde el trabajador primero para poder agregar organizaciones sindicales</p>
        ) : (
          <>
            {sindicatos.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: '13px' }}>No hay organizaciones sindicales registradas</p>
            )}
            {sindicatos.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                <div className="form-group" style={{ flex: '0 0 40px', margin: 0 }}>
                  <label style={{ fontSize: '11px' }}>#{s.sindicato_order}</label>
                  <input type="text" value={s.sindicato_order} readOnly style={{ width: '40px', background: '#f3f4f6' }} />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '11px' }}>RUT Sindicato</label>
                  <input type="text" value={s.rut_sindicato} onChange={e => handleSindicatoChange(idx, 'rut_sindicato', e.target.value)} placeholder="12345678-9" />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '11px' }}>Nombre</label>
                  <input type="text" value={s.nombre_sindicato || ''} onChange={e => handleSindicatoChange(idx, 'nombre_sindicato', e.target.value)} placeholder="Nombre sindicato" />
                </div>
                <button type="button" onClick={() => handleRemoveSindicato(idx)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer' }}>X</button>
              </div>
            ))}
            {sindicatos.length > 0 && (
              <button type="button" onClick={handleSaveSindicatos} style={{ marginTop: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 16px', cursor: 'pointer' }}>
                Guardar Sindicatos
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}