'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Holiday } from '@/lib/services/holidaysService'
import { FaCalendarAlt } from 'react-icons/fa'

export default function HolidaysPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [stats, setStats] = useState<{
    totalHolidays: number
    yearsCovered: number[]
  } | null>(null)

  // Generar array de años desde 2019 hasta año actual + 2
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from(
    { length: currentYear + 2 - 2019 + 1 },
    (_, i) => 2019 + i
  )

  useEffect(() => {
    loadStats()
    loadHolidays(selectedYear)
  }, [selectedYear])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/holidays/sync')
      if (response.ok) {
        const data = await response.json()
        setStats({
          totalHolidays: data.totalHolidays,
          yearsCovered: data.yearsCovered,
        })
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const loadHolidays = async (year: number) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('year', year)
        .order('date', { ascending: true })

      if (error) throw error

      setHolidays(data || [])
    } catch (error) {
      console.error('Error al cargar feriados:', error)
      alert('Error al cargar feriados')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncYear = async () => {
    if (syncing) return

    const confirmSync = confirm(
      `¿Desea sincronizar los feriados del año ${selectedYear} desde la API del Gobierno de Chile?\n\n` +
      `Esto actualizará los feriados existentes con la información oficial más reciente.`
    )

    if (!confirmSync) return

    setSyncing(true)
    try {
      const response = await fetch('/api/holidays/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year: selectedYear }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al sincronizar')
      }

      alert(`✅ ${data.message}`)
      await loadHolidays(selectedYear)
      await loadStats()
    } catch (error: any) {
      console.error('Error al sincronizar:', error)
      alert(
        `❌ Error al sincronizar feriados:\n\n${error.message}\n\n` +
        `La API del gobierno podría estar temporalmente fuera de servicio o los feriados para este año aún no están disponibles.`
      )
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'nacional':
        return '#0ea5e9'
      case 'religioso':
        return '#8b5cf6'
      case 'regional':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'nacional':
        return 'Nacional'
      case 'religioso':
        return 'Religioso'
      case 'regional':
        return 'Regional'
      default:
        return type
    }
  }

  return (
    <div className="container">
      <div className="card">
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaCalendarAlt size={28} color="#0ea5e9" />
              Feriados Legales de Chile
            </h1>
          </div>

          {stats && (
            <div
              style={{
                display: 'flex',
                gap: '16px',
                padding: '12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <div>
                <strong>Total de feriados:</strong> {stats.totalHolidays}
              </div>
              <div>
                <strong>Años cubiertos:</strong>{' '}
                {stats.yearsCovered.length > 0
                  ? `${Math.min(...stats.yearsCovered)} - ${Math.max(...stats.yearsCovered)}`
                  : 'Ninguno'}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Seleccionar Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
              }}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                  {stats?.yearsCovered.includes(year) ? ' ✓' : ' (sin sincronizar)'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ paddingTop: '28px' }}>
            <button
              onClick={handleSyncYear}
              disabled={syncing}
              className="primary"
              style={{
                padding: '10px 20px',
                backgroundColor: syncing ? '#9ca3af' : '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: syncing ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              {syncing ? '⏳ Sincronizando...' : '🔄 Sincronizar'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#dbeafe',
            borderRadius: '6px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#1e40af',
          }}
        >
          <strong>ℹ️ Información:</strong> Los feriados se obtienen desde la API oficial del
          Gobierno Digital de Chile. El botón "Sincronizar" actualiza los datos para el año
          seleccionado.
        </div>

        {/* Holidays List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Cargando feriados...
          </div>
        ) : holidays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              No hay feriados registrados para el año {selectedYear}
            </p>
            <button
              onClick={handleSyncYear}
              disabled={syncing}
              className="primary"
              style={{
                padding: '10px 20px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Sincronizar Ahora
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                        {holiday.name}
                      </h3>
                      {holiday.is_irrenunciable && (
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          IRRENUNCIABLE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      {formatDate(holiday.date)}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          backgroundColor: getTypeColor(holiday.type),
                          color: 'white',
                          borderRadius: '4px',
                          fontWeight: 500,
                        }}
                      >
                        {getTypeLabel(holiday.type)}
                      </span>
                      {holiday.law_number && (
                        <span style={{ color: '#6b7280' }}>
                          📜 {holiday.law_number}
                        </span>
                      )}
                      {holiday.source === 'manual' && (
                        <span style={{ color: '#6b7280' }}>
                          ✏️ Manual
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      color: '#d1d5db',
                      fontWeight: 600,
                      minWidth: '60px',
                      textAlign: 'right',
                    }}
                  >
                    {new Date(holiday.date + 'T00:00:00').getDate()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '12px',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          Fuente oficial: Gobierno Digital de Chile (apis.digital.gob.cl)
        </div>
      </div>
    </div>
  )
}
