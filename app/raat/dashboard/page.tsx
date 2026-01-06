'use client'

import { useState, useEffect } from 'react'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaExclamationCircle, FaChartBar, FaChartLine, FaChartPie, FaUsers } from 'react-icons/fa'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6']

export default function RAATDashboardPage() {
  const { companyId, company } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [typeData, setTypeData] = useState<any[]>([])
  const [recurrenceData, setRecurrenceData] = useState<any[]>([])
  const [bodyPartsData, setBodyPartsData] = useState<any[]>([])
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (companyId) {
      loadDashboardData()
    }
  }, [companyId, dateRange])

  const loadDashboardData = async () => {
    if (!companyId) return

    try {
      setLoading(true)

      // Cargar estadísticas generales
      const statsParams = new URLSearchParams({
        company_id: companyId,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      })
      const statsResponse = await fetch(`/api/raat/stats?${statsParams.toString()}`)
      const statsData = await statsResponse.json()
      setStats(statsData)

      // Cargar datos de accidentes para análisis
      const accidentsParams = new URLSearchParams({
        company_id: companyId,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      })
      const accidentsResponse = await fetch(`/api/raat?${accidentsParams.toString()}`)
      const accidents = await accidentsResponse.json()

      // Procesar datos mensuales
      const monthlyMap = new Map<string, number>()
      accidents.forEach((accident: any) => {
        const date = new Date(accident.event_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1)
      })
      const monthly = Array.from(monthlyMap.entries())
        .map(([month, count]) => ({
          month: month.split('-')[1] + '/' + month.split('-')[0],
          count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
      setMonthlyData(monthly)

      // Procesar datos por tipo
      const typeMap = new Map<string, number>()
      accidents.forEach((accident: any) => {
        const type = accident.event_type
        typeMap.set(type, (typeMap.get(type) || 0) + 1)
      })
      const typeChart = Array.from(typeMap.entries()).map(([type, count]) => ({
        name: type === 'accidente_trabajo' ? 'Accidente Trabajo' : 
              type === 'accidente_trayecto' ? 'Accidente Trayecto' : 
              'Enfermedad Profesional',
        value: count,
      }))
      setTypeData(typeChart)

      // Procesar datos de recurrencia
      const rutCounts = new Map<string, number>()
      accidents.forEach((accident: any) => {
        const rut = accident.employee_rut
        rutCounts.set(rut, (rutCounts.get(rut) || 0) + 1)
      })
      const recurrence = Array.from(rutCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([rut, count]) => ({ rut, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      setRecurrenceData(recurrence)

      // Procesar datos de partes del cuerpo afectadas
      const bodyPartsMap = new Map<string, number>()
      accidents.forEach((accident: any) => {
        if (accident.body_part_affected) {
          const part = accident.body_part_affected
          bodyPartsMap.set(part, (bodyPartsMap.get(part) || 0) + 1)
        }
      })
      const bodyParts = Array.from(bodyPartsMap.entries())
        .map(([part, count]) => ({ name: part, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      setBodyPartsData(bodyParts)
    } catch (error: any) {
      console.error('Error al cargar datos del dashboard:', error)
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!company) {
    return (
      <div>
        <h1>Dashboard RAAT</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver el dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}>
            <FaChartBar size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Dashboard RAAT</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Indicadores de Seguridad y Salud Ocupacional
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
          />
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px' }}>Cargando dashboard...</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
                {stats?.total || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Accidentes</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                {stats?.by_diat_status?.overdue || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>DIAT Fuera de Plazo</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                {stats?.by_diat_status?.pending || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>DIAT Pendientes</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                {stats?.frequency_rate?.toFixed(2) || '0.00'}%
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Tasa de Frecuencia</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#8b5cf6', marginBottom: '8px' }}>
                {stats?.recurrence_count || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Trabajadores Recurrentes</div>
            </div>
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* Gráfico de Accidentes por Mes */}
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Accidentes por Mes</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>No hay datos para el período seleccionado</p>
              )}
            </div>

            {/* Gráfico de Accidentes por Tipo */}
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Distribución por Tipo de Evento</h3>
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>No hay datos para el período seleccionado</p>
              )}
            </div>
          </div>

          {/* Gráficos de Análisis Detallado */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* Gráfico de Recurrencia */}
            {recurrenceData.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Trabajadores con Múltiples Accidentes</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={recurrenceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis dataKey="rut" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráfico de Partes del Cuerpo Afectadas */}
            {bodyPartsData.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Partes del Cuerpo Más Afectadas</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bodyPartsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} width={150} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tabla de Resumen por Estado */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Resumen por Estado</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6', marginBottom: '4px' }}>
                  {stats?.by_status?.open || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Abiertos</div>
              </div>
              <div style={{ padding: '16px', background: '#d1fae5', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginBottom: '4px' }}>
                  {stats?.by_status?.closed || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Cerrados</div>
              </div>
              <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', marginBottom: '4px' }}>
                  {stats?.by_status?.with_sequelae || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Con Secuelas</div>
              </div>
              <div style={{ padding: '16px', background: '#f3f4f6', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6b7280', marginBottom: '4px' }}>
                  {stats?.by_status?.consolidated || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Consolidados</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

