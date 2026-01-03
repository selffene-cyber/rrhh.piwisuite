'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getPreviredIndicators } from '@/lib/services/previredAPI'
import { formatMonthYear, MONTHS } from '@/lib/utils/date'
import Link from 'next/link'

interface IndicatorRecord {
  id: string
  year: number
  month: number
  uf_value: number | null
  utm_value: number | null
  uta_value: number | null
  rti_afp_pesos: number | null
  rti_ips_pesos: number | null
  rti_seg_ces_pesos: number | null
  rmi_trab_depe_ind: number | null
  source: string
  created_at: string
  indicators_json: any
}

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<IndicatorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingNew, setLoadingNew] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadIndicators()
  }, [])

  const loadIndicators = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('previred_indicators')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (error) throw error

      setIndicators(data || [])
    } catch (error: any) {
      console.error('Error al cargar indicadores:', error)
      setMessage({ type: 'error', text: 'Error al cargar indicadores: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  const loadIndicatorsFromAPI = async () => {
    try {
      setLoadingNew(true)
      setMessage(null)

      const indicatorsData = await getPreviredIndicators(selectedMonth, selectedYear)

      if (!indicatorsData) {
        setMessage({ type: 'error', text: 'No se pudieron obtener los indicadores de la API' })
        return
      }

      // Función helper para parsear números chilenos (puntos para miles, coma para decimales)
      const parseChileanNumber = (str: string): number => {
        if (!str) return 0
        // Remover puntos (miles) y reemplazar coma por punto (decimal)
        return parseFloat(str.replace(/\./g, '').replace(',', '.'))
      }

      // Guardar en la base de datos
      const { error } = await supabase
        .from('previred_indicators')
        .upsert({
          year: selectedYear,
          month: selectedMonth,
          uf_value: parseChileanNumber(indicatorsData.UFValPeriodo),
          utm_value: parseChileanNumber(indicatorsData.UTMVal),
          uta_value: parseChileanNumber(indicatorsData.UTAVal),
          rti_afp_pesos: parseChileanNumber(indicatorsData.RTIAfpPesos),
          rti_ips_pesos: parseChileanNumber(indicatorsData.RTIIpsPesos),
          rti_seg_ces_pesos: parseChileanNumber(indicatorsData.RTISegCesPesos),
          rmi_trab_depe_ind: parseChileanNumber(indicatorsData.RMITrabDepeInd),
          rmi_men18_may65: parseChileanNumber(indicatorsData.RMIMen18May65),
          rmi_trab_casa_part: parseChileanNumber(indicatorsData.RMITrabCasaPart),
          rmi_no_remu: parseChileanNumber(indicatorsData.RMINoRemu),
          indicators_json: indicatorsData,
          source: 'gael_cloud',
        }, {
          onConflict: 'year,month'
        })

      if (error) throw error

      setMessage({ type: 'success', text: `Indicadores de ${formatMonthYear(selectedYear, selectedMonth)} cargados exitosamente` })
      loadIndicators()
    } catch (error: any) {
      console.error('Error al cargar indicadores desde API:', error)
      setMessage({ type: 'error', text: 'Error al cargar indicadores: ' + error.message })
    } finally {
      setLoadingNew(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div>
        <h1>Indicadores Previsionales</h1>
        <div className="card">
          <p>Cargando indicadores...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Indicadores Previsionales</h1>
        <Link href="/settings">
          <button className="secondary">Volver a Configuración</button>
        </Link>
      </div>

      {message && (
        <div
          className="card"
          style={{
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            borderColor: message.type === 'success' ? '#065f46' : '#dc2626',
            marginBottom: '24px',
          }}
        >
          <p style={{ color: message.type === 'success' ? '#065f46' : '#991b1b', margin: 0 }}>
            {message.text}
          </p>
        </div>
      )}

      <div className="card">
        <h2>Cargar Nuevos Indicadores</h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          Obtiene los indicadores previsionales de Previred desde la API de Gael Cloud para un mes/año específico.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label>Año</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mes</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={loadIndicatorsFromAPI} disabled={loadingNew} style={{ marginTop: '16px' }}>
          {loadingNew ? 'Cargando...' : 'Cargar Indicadores desde API'}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Histórico de Indicadores</h2>
          <button onClick={loadIndicators} className="secondary" style={{ padding: '8px 16px' }}>
            Actualizar
          </button>
        </div>

        {indicators.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay indicadores cargados. Usa el formulario de arriba para cargar indicadores desde la API.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>UF</th>
                  <th>UTM</th>
                  <th>UTA</th>
                  <th>Tope AFP</th>
                  <th>Tope IPS</th>
                  <th>Tope Seg. Ces.</th>
                  <th>RMI Trab. Dep.</th>
                  <th>Fuente</th>
                  <th>Cargado</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((ind) => (
                  <tr key={ind.id}>
                    <td>
                      <strong>{formatMonthYear(ind.year, ind.month)}</strong>
                    </td>
                    <td>{formatCurrency(ind.uf_value)}</td>
                    <td>{formatCurrency(ind.utm_value)}</td>
                    <td>{formatCurrency(ind.uta_value)}</td>
                    <td>{formatCurrency(ind.rti_afp_pesos)}</td>
                    <td>{formatCurrency(ind.rti_ips_pesos)}</td>
                    <td>{formatCurrency(ind.rti_seg_ces_pesos)}</td>
                    <td>{formatCurrency(ind.rmi_trab_depe_ind)}</td>
                    <td>
                      <span className="badge" style={{ background: ind.source === 'gael_cloud' ? '#dbeafe' : '#f3f4f6' }}>
                        {ind.source === 'gael_cloud' ? 'API' : ind.source}
                      </span>
                    </td>
                    <td>{new Date(ind.created_at).toLocaleDateString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {indicators.length > 0 && (
        <div className="card">
          <h2>Detalle de Indicadores</h2>
          <p style={{ marginBottom: '16px', color: '#6b7280' }}>
            Haz clic en un período para ver todos los detalles del indicador.
          </p>
          <div style={{ display: 'grid', gap: '16px' }}>
            {indicators.slice(0, 5).map((ind) => (
              <details key={ind.id} style={{ border: '1px solid #e5e7eb', padding: '16px', background: '#f9fafb' }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
                  {formatMonthYear(ind.year, ind.month)} - Ver Detalles
                </summary>
                {ind.indicators_json && (
                  <div style={{ marginTop: '12px', fontSize: '12px' }}>
                    <pre style={{ background: 'white', padding: '12px', overflow: 'auto', maxHeight: '300px' }}>
                      {JSON.stringify(ind.indicators_json, null, 2)}
                    </pre>
                  </div>
                )}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

