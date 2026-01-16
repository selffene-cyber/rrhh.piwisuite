'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatMonthYear } from '@/lib/utils/date'
import { MONTHS } from '@/lib/utils/date'

export default function TaxBracketsPage() {
  const [brackets, setBrackets] = useState<any[]>([])
  const [bracketsHistory, setBracketsHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [expandedHistory, setExpandedHistory] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    loadBrackets()
  }, [selectedYear, selectedMonth])

  const loadBrackets = async () => {
    try {
      setLoading(true)
      console.log('Buscando tramos para:', { year: selectedYear, month: selectedMonth })
      
      // Obtener la versión más reciente
      const { data: latestData, error: latestError } = await supabase
        .from('tax_brackets')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .eq('period_type', 'MENSUAL')
        .order('created_at', { ascending: false })
        .limit(1)

      if (latestError) {
        console.error('Error en consulta:', latestError)
        throw latestError
      }
      
      console.log('Tramos más recientes encontrados:', latestData)
      setBrackets(latestData || [])
      
      // Obtener todo el historial para este mes/año/período
      const { data: historyData, error: historyError } = await supabase
        .from('tax_brackets')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .eq('period_type', 'MENSUAL')
        .order('created_at', { ascending: false })

      if (historyError) {
        console.error('Error al cargar historial:', historyError)
      } else {
        console.log('Historial encontrado:', historyData?.length || 0, 'versiones')
        setBracketsHistory(historyData || [])
      }
    } catch (error: any) {
      console.error('Error al cargar tramos:', error)
      setMessage({ type: 'error', text: 'Error al cargar tramos: ' + error.message })
    } finally {
      setLoading(false)
    }
  }
  
  const toggleHistory = (key: string) => {
    setExpandedHistory(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleScrape = async () => {
    try {
      setScraping(true)
      setMessage(null)

      const response = await fetch('/api/tax-brackets/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener tramos del SII')
      }

      setMessage({ type: 'success', text: result.message || 'Tramos actualizados correctamente' })
      loadBrackets()
    } catch (error: any) {
      console.error('Error al scrapear:', error)
      setMessage({ type: 'error', text: error.message || 'Error al obtener tramos del SII' })
    } finally {
      setScraping(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'Y MÁS'
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ marginBottom: '24px' }}>Tramos del Impuesto Único</h1>
        
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="primary"
              style={{ padding: '10px 20px' }}
            >
              {scraping ? 'Obteniendo...' : 'Actualizar desde SII'}
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
          }}>
            {message.text}
          </div>
        )}

        {loading ? (
          <p>Cargando tramos...</p>
        ) : brackets.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ marginBottom: '16px', color: '#6b7280' }}>
              No hay tramos cargados para {formatMonthYear(selectedYear, selectedMonth)}
            </p>
            <button onClick={handleScrape} className="primary" disabled={scraping}>
              {scraping ? 'Obteniendo...' : 'Obtener tramos del SII'}
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ marginBottom: '16px' }}>
              Tramos para {formatMonthYear(selectedYear, selectedMonth)} - MENSUAL
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Desde</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Hasta</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Factor</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Cantidad a Rebajar</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Tasa Efectiva</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const mensualBracket = brackets.find((b: any) => b.period_type === 'MENSUAL')
                    const bracketsToShow = mensualBracket?.brackets || []
                    
                    if (bracketsToShow.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                            No se encontraron tramos MENSUAL. Datos guardados: {brackets.length} registro(s) con tipos: {brackets.map((b: any) => b.period_type).join(', ')}
                          </td>
                        </tr>
                      )
                    }
                    
                    return bracketsToShow.map((bracket: any, index: number) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px' }}>
                          {bracket.desde === null ? 'Exento' : formatCurrency(bracket.desde)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {bracket.hasta === null ? 'Y MÁS' : formatCurrency(bracket.hasta)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {bracket.factor.toFixed(3)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {formatCurrency(bracket.cantidad_rebajar)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {bracket.tasa_efectiva}
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '6px', fontSize: '12px', color: '#0369a1' }}>
              <strong>Fórmula:</strong> Impuesto = (Renta Líquida Imponible × Factor) - Cantidad a Rebajar
            </div>
            
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
              Última actualización: {brackets[0]?.created_at 
                ? new Date(brackets[0].created_at).toLocaleString('es-CL')
                : 'N/A'}
            </div>
            
            {/* Historial de versiones */}
            {bracketsHistory.length > 1 && (
              <div style={{ marginTop: '24px', borderTop: '2px solid #e5e7eb', paddingTop: '16px' }}>
                <button
                  onClick={() => toggleHistory('MENSUAL')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: '500'
                  }}
                >
                  <span>
                    Historial de Versiones ({bracketsHistory.length} versión{bracketsHistory.length !== 1 ? 'es' : ''})
                  </span>
                  <span style={{ fontSize: '18px' }}>
                    {expandedHistory['MENSUAL'] ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedHistory['MENSUAL'] && (
                  <div style={{ marginTop: '12px' }}>
                    {bracketsHistory.map((version, index) => (
                      <div
                        key={version.id}
                        style={{
                          marginBottom: '12px',
                          padding: '12px',
                          background: index === 0 ? '#eff6ff' : '#f9fafb',
                          border: `1px solid ${index === 0 ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div>
                            <strong style={{ color: index === 0 ? '#1e40af' : '#374151' }}>
                              Versión {bracketsHistory.length - index}
                              {index === 0 && ' (Actual)'}
                            </strong>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {new Date(version.created_at).toLocaleString('es-CL')}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {version.brackets?.length || 0} tramos registrados
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

