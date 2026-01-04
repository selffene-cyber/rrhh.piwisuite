'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaArrowLeft, FaClock, FaDollarSign } from 'react-icons/fa'

export default function OvertimeHistoryPage() {
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [historyData, setHistoryData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalHours: 0,
    totalAmount: 0,
  })
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: 0, // 0 = todos los meses
    employeeId: 'all',
  })

  useEffect(() => {
    if (companyId) {
      loadEmployees()
      loadHistory()
    }
  }, [companyId, filters])

  const loadEmployees = async () => {
    if (!companyId) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error al cargar trabajadores:', error)
    }
  }

  const loadHistory = async () => {
    if (!companyId) return

    try {
      setLoading(true)

      // Obtener empleados de la empresa
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)

      if (!employeesData || employeesData.length === 0) {
        setHistoryData([])
        setStats({ totalHours: 0, totalAmount: 0 })
        setLoading(false)
        return
      }

      const employeeIds = employeesData.map((emp: { id: string }) => emp.id)

      // Obtener períodos primero para filtrar
      let periodQuery = supabase
        .from('payroll_periods')
        .select('id, year, month')
        .eq('company_id', companyId)

      if (filters.year) {
        periodQuery = periodQuery.eq('year', filters.year)
      }
      if (filters.month > 0) {
        periodQuery = periodQuery.eq('month', filters.month)
      }

      const { data: periods, error: periodsError } = await periodQuery

      if (periodsError) throw periodsError

      if (!periods || periods.length === 0) {
        setHistoryData([])
        setStats({ totalHours: 0, totalAmount: 0 })
        setLoading(false)
        return
      }

      const periodIds = periods.map((p: { id: string }) => p.id)

      // Obtener liquidaciones
      let slipsQuery = supabase
        .from('payroll_slips')
        .select(`
          id,
          employee_id,
          period_id,
          employees (id, full_name, rut),
          payroll_periods (year, month)
        `)
        .in('employee_id', employeeIds)
        .in('period_id', periodIds)
        .in('status', ['draft', 'issued', 'sent'])

      if (filters.employeeId !== 'all') {
        slipsQuery = slipsQuery.eq('employee_id', filters.employeeId)
      }

      const { data: slips, error: slipsError } = await slipsQuery

      if (slipsError) throw slipsError

      if (!slips || slips.length === 0) {
        setHistoryData([])
        setStats({ totalHours: 0, totalAmount: 0 })
        setLoading(false)
        return
      }

      // Obtener items de horas extra para estas liquidaciones
      const slipIds = slips.map((s: { id: string }) => s.id)
      console.log('🔍 Buscando items de horas extras para liquidaciones:', slipIds)
      
      const { data: items, error: itemsError } = await supabase
        .from('payroll_items')
        .select('id, payroll_slip_id, amount, description, type, category')
        .in('payroll_slip_id', slipIds)

      if (itemsError) throw itemsError
      
      console.log('📋 Todos los items encontrados:', items)
      
      // Filtrar items de horas extras manualmente para ver qué hay
      const overtimeItems = items?.filter((item: { type: string; category: string }) => 
        item.type === 'taxable_earning' && item.category === 'horas_extras'
      ) || []
      
      console.log('⏰ Items de horas extras filtrados:', overtimeItems)

      // Crear mapa de items por liquidación (usar solo items de horas extras)
      const itemsBySlip = new Map()
      if (overtimeItems) {
        for (const item of overtimeItems) {
          if (!itemsBySlip.has(item.payroll_slip_id)) {
            itemsBySlip.set(item.payroll_slip_id, [])
          }
          itemsBySlip.get(item.payroll_slip_id).push(item)
        }
      }

      console.log('🗺️ Mapa de items por liquidación:', Array.from(itemsBySlip.entries()))

      const payrollData = slips.map((slip: any) => ({
        ...slip,
        payroll_items: itemsBySlip.get(slip.id) || []
      })).filter((slip: any) => slip.payroll_items.length > 0)
      
      console.log('💼 Liquidaciones con horas extras:', payrollData.length)

      // Procesar datos para agrupar por trabajador
      const employeeMap = new Map()

      if (payrollData) {
        for (const slip of payrollData) {
          const employeeId = slip.employee_id
          const employees = Array.isArray(slip.employees) ? slip.employees : [slip.employees]
          const employee = employees?.[0] as { id: string, full_name: string, rut: string } | undefined
          const periods = Array.isArray(slip.payroll_periods) ? slip.payroll_periods : [slip.payroll_periods]
          const period = periods?.[0] as { year: number, month: number } | undefined
          const items = Array.isArray(slip.payroll_items) ? slip.payroll_items : [slip.payroll_items]

          if (!employee || !period) continue

          // Extraer horas de la descripción (ej: "Horas Extras (4 horas)")
          let hours = 0
          let amount = 0

          for (const item of items) {
            if (item.category === 'horas_extras') {
              amount += Number(item.amount) || 0
              // Extraer número de horas de la descripción
              // Formatos posibles: "Horas Extras (4 horas)", "Horas Extras (4 hora)", "Horas Extras"
              const hoursMatch = item.description?.match(/(\d+(?:\.\d+)?)\s*hora[s]?/i)
              if (hoursMatch) {
                hours += parseFloat(hoursMatch[1]) || 0
              } else {
                // Si no hay número en la descripción, intentar calcular desde el monto
                // Asumiendo que el monto se calculó con la fórmula estándar
                // Esto es un fallback, idealmente siempre debería haber número en la descripción
                const itemAmount = Number(item.amount) || 0
                if (itemAmount > 0) {
                  // Aproximación: si no podemos extraer las horas, las dejamos en 0
                  // y solo contamos el monto
                }
              }
            }
          }

          if (hours > 0 || amount > 0) {
            if (!employeeMap.has(employeeId)) {
              employeeMap.set(employeeId, {
                employeeId,
                employeeName: employee.full_name,
                employeeRut: employee.rut,
                totalHours: 0,
                totalAmount: 0,
                periods: [],
              })
            }

            const employeeData = employeeMap.get(employeeId)
            employeeData.totalHours += hours
            employeeData.totalAmount += amount
            employeeData.periods.push({
              period: `${period.month}/${period.year}`,
              hours,
              amount,
            })
          }
        }
      }

      const historyArray = Array.from(employeeMap.values())
        .sort((a, b) => b.totalHours - a.totalHours)

      // Calcular totales
      const totalHours = historyArray.reduce((sum, emp) => sum + emp.totalHours, 0)
      const totalAmount = historyArray.reduce((sum, emp) => sum + emp.totalAmount, 0)

      setHistoryData(historyArray)
      setStats({ totalHours, totalAmount })
    } catch (error: any) {
      console.error('Error al cargar histórico:', error)
      alert('Error al cargar histórico: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!companyId) {
    return (
      <div>
        <h1>Histórico de Horas Extras</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver el histórico de horas extra.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/overtime">
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaArrowLeft /> Volver
            </button>
          </Link>
          <h1>Histórico de Horas Extras</h1>
        </div>
      </div>

      {/* Cards de estadísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {/* Card 1: Total Horas Extras */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          borderRadius: '12px',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaClock size={24} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
              Total Horas Extras
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: '8px 0' }}>
            {stats.totalHours.toFixed(1)}
          </p>
          <p style={{ fontSize: '11px', color: '#1e40af', margin: 0, opacity: 0.8 }}>
            Suma total de todas las horas extra registradas
          </p>
        </div>

        {/* Card 2: Monto Total Pagado */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
          borderRadius: '12px',
          border: '2px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaDollarSign size={24} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#065f46', fontWeight: '600' }}>
              Monto Total Pagado
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#065f46', margin: '8px 0' }}>
            ${stats.totalAmount.toLocaleString('es-CL')}
          </p>
          <p style={{ fontSize: '11px', color: '#065f46', margin: 0, opacity: 0.8 }}>
            Total pagado en horas extra en el período
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <h2>Filtros</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Año</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="form-group">
            <label>Mes</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
            >
              <option value="0">Todos</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
          <div className="form-group">
            <label>Trabajador</label>
            <select
              value={filters.employeeId}
              onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
            >
              <option value="all">Todos</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de histórico */}
      <div className="card">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>
            Trabajadores con Horas Extras
            {historyData.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                ({historyData.length} {historyData.length === 1 ? 'trabajador' : 'trabajadores'})
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <p>Cargando histórico...</p>
        ) : historyData.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay registros de horas extra que coincidan con los filtros seleccionados.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>RUT</th>
                  <th>Total Horas</th>
                  <th>Total Monto</th>
                  <th>Períodos</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((item: any) => (
                  <tr key={item.employeeId}>
                    <td>{item.employeeName}</td>
                    <td>{item.employeeRut}</td>
                    <td style={{ textAlign: 'right' }}>{item.totalHours.toFixed(1)} hrs</td>
                    <td style={{ textAlign: 'right' }}>${item.totalAmount.toLocaleString('es-CL')}</td>
                    <td>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {item.periods.slice(0, 3).map((p: any, idx: number) => (
                          <div key={idx}>
                            {p.period}: {p.hours.toFixed(1)} hrs (${p.amount.toLocaleString('es-CL')})
                          </div>
                        ))}
                        {item.periods.length > 3 && (
                          <div style={{ fontStyle: 'italic' }}>
                            +{item.periods.length - 3} período(s) más
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

