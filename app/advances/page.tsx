'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatDate, formatMonthYear } from '@/lib/utils/date'
import { FaPlus, FaFilePdf, FaEdit, FaCheck, FaTimes, FaMoneyBillWave, FaTrash, FaChartLine } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function AdvancesPage() {
  const { companyId } = useCurrentCompany()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [advances, setAdvances] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [filterEmployee, setFilterEmployee] = useState<string>('')
  const [filterPeriod, setFilterPeriod] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [stats, setStats] = useState({
    totalPeriodAmount: 0,
    projectedNextMonth: 0,
    pendingCount: 0
  })

  useEffect(() => {
    if (companyId) {
      loadData()
      // Verificar y corregir anticipos huérfanos (descontados sin liquidación válida)
      checkAndFixOrphanedAdvances()
    } else {
      setEmployees([])
      setAdvances([])
      setLoading(false)
    }
  }, [filterEmployee, filterPeriod, filterStatus, companyId])

  const checkAndFixOrphanedAdvances = async () => {
    try {
      // Buscar anticipos descontados que no tienen liquidación válida
      const { data: orphanedAdvances, error } = await supabase
        .from('advances')
        .select('id, payroll_slip_id')
        .eq('status', 'descontado')
        .not('payroll_slip_id', 'is', null)

      if (error) {
        console.error('Error al verificar anticipos huérfanos:', error)
        return
      }

      if (!orphanedAdvances || orphanedAdvances.length === 0) {
        return
      }

      // Verificar cuáles liquidaciones existen
      const payrollIds = orphanedAdvances.map((adv: { id: string; payroll_slip_id: string | null }) => adv.payroll_slip_id).filter(Boolean)
      if (payrollIds.length === 0) return

      const { data: existingPayrolls } = await supabase
        .from('payroll_slips')
        .select('id')
        .in('id', payrollIds)

      const existingPayrollIds = new Set(existingPayrolls?.map((p: { id: string }) => p.id) || [])

      // Encontrar anticipos cuya liquidación no existe
      const toFix = orphanedAdvances.filter((adv: { id: string; payroll_slip_id: string | null }) => 
        adv.payroll_slip_id && !existingPayrollIds.has(adv.payroll_slip_id)
      )

      if (toFix.length > 0) {
        const idsToFix = toFix.map((adv: { id: string; payroll_slip_id: string | null }) => adv.id)
        // Restaurar estos anticipos
        const { error: updateError } = await supabase
          .from('advances')
          .update({
            status: 'pagado',
            payroll_slip_id: null,
            discounted_at: null,
            updated_at: new Date().toISOString()
          })
          .in('id', idsToFix)

        if (updateError) {
          console.error('Error al restaurar anticipos huérfanos:', updateError)
        } else {
          console.log(`${toFix.length} anticipo(s) huérfano(s) restaurado(s) automáticamente`)
          // Recargar datos si se corrigieron
          loadData()
        }
      }
    } catch (error) {
      console.error('Error en verificación de anticipos huérfanos:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)

      if (!companyId) return

      // Cargar empleados de la empresa
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('status', 'active')
        .eq('company_id', companyId)
        .order('full_name')

      if (employeesData) {
        setEmployees(employeesData)
      }

      // Cargar anticipos de empleados de la empresa
      // Primero obtener IDs de empleados de la empresa
      const employeeIds = employeesData?.map((emp: { id: string; full_name: string; rut: string }) => emp.id) || []
      
      let query = supabase
        .from('advances')
        .select(`
          *,
          employees (id, full_name, rut),
          payroll_slips (id, payroll_periods (year, month))
        `)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])
        .order('advance_date', { ascending: false })

      if (filterEmployee) {
        query = query.eq('employee_id', filterEmployee)
      }

      if (filterPeriod) {
        query = query.eq('period', filterPeriod)
      }

      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setAdvances(data || [])

      // Cargar estadísticas
      await loadStats()
    } catch (error: any) {
      console.error('Error al cargar anticipos:', error)
      alert('Error al cargar anticipos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

      // Calcular mes siguiente
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
      const nextPeriod = `${nextYear}-${String(nextMonth).padStart(2, '0')}`

      // 1. Suma total de anticipos a pagar en el período actual (firmados/pagados, no descontados)
      const { data: periodAdvances } = await supabase
        .from('advances')
        .select('amount')
        .eq('period', currentPeriod)
        .in('status', ['firmado', 'pagado'])
        .is('payroll_slip_id', null)

      const totalPeriodAmount = periodAdvances?.reduce((sum: number, adv: { amount: number | null }) => sum + Number(adv.amount || 0), 0) || 0

      // 2. Promedio proyectado del mes siguiente basado en últimos 3 meses
      const last3Months: string[] = []
      for (let i = 1; i <= 3; i++) {
        const date = new Date(currentYear, currentMonth - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        last3Months.push(`${year}-${String(month).padStart(2, '0')}`)
      }

      const { data: last3MonthsAdvances } = await supabase
        .from('advances')
        .select('amount, period')
        .in('period', last3Months)
        .in('status', ['pagado', 'descontado'])

      let totalLast3Months = 0
      if (last3MonthsAdvances) {
        totalLast3Months = last3MonthsAdvances.reduce((sum: number, adv: { amount: number | null; period: string }) => sum + Number(adv.amount || 0), 0)
      }
      const projectedNextMonth = Math.ceil(totalLast3Months / 3)

      // 3. Cantidad de anticipos pendientes (firmados/pagados no descontados)
      const { data: pendingAdvances } = await supabase
        .from('advances')
        .select('id')
        .in('status', ['firmado', 'pagado'])
        .is('payroll_slip_id', null)

      const pendingCount = pendingAdvances?.length || 0

      setStats({
        totalPeriodAmount,
        projectedNextMonth,
        pendingCount
      })
    } catch (error: any) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const handleStatusChange = async (advanceId: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'emitido') {
        updateData.issued_at = new Date().toISOString()
      } else if (newStatus === 'firmado') {
        updateData.signed_at = new Date().toISOString()
      } else if (newStatus === 'pagado') {
        updateData.paid_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('advances')
        .update(updateData)
        .eq('id', advanceId)

      if (error) throw error

      loadData()
    } catch (error: any) {
      alert('Error al actualizar estado: ' + error.message)
    }
  }

  const handleDelete = async (advanceId: string, employeeName: string, amount: number) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el anticipo de ${employeeName} por $${amount.toLocaleString('es-CL')}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('advances')
        .delete()
        .eq('id', advanceId)

      if (error) throw error

      alert('Anticipo eliminado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al eliminar anticipo: ' + error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      borrador: { label: 'Borrador', color: '#6b7280' },
      emitido: { label: 'Emitido', color: '#3b82f6' },
      firmado: { label: 'Firmado', color: '#8b5cf6' },
      pagado: { label: 'Pagado', color: '#10b981' },
      descontado: { label: 'Descontado', color: '#059669' },
    }
    const badge = badges[status] || { label: status, color: '#6b7280' }
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: badge.color + '20',
        color: badge.color,
        border: `1px solid ${badge.color}40`
      }}>
        {badge.label}
      </span>
    )
  }

  // Generar opciones de período (últimos 12 meses)
  const generatePeriodOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const period = `${year}-${month}`
      options.push({ value: period, label: formatMonthYear(year, parseInt(month)) })
    }
    return options
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaMoneyBillWave size={28} color="#f59e0b" />
          Anticipos de Remuneración
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/advances/bulk">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f59e0b', color: 'white' }}>
              <FaPlus size={16} />
              Anticipos Masivos
            </button>
          </Link>
          <Link href="/advances/new">
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus size={16} />
              Nuevo Anticipo
            </button>
          </Link>
        </div>
      </div>

      {/* Cards de Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Total a Pagar en Período */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px',
          border: '2px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaMoneyBillWave size={24} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#92400e', fontWeight: '600' }}>
              Total a Pagar (Período Actual)
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#92400e', margin: '8px 0' }}>
            ${stats.totalPeriodAmount.toLocaleString('es-CL')}
          </p>
          <p style={{ fontSize: '11px', color: '#92400e', margin: 0, opacity: 0.8 }}>
            Anticipos firmados/pagados pendientes de descuento
          </p>
        </div>

        {/* Card 2: Proyección Mes Siguiente */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          borderRadius: '12px',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaChartLine size={24} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
              Proyección Mes Siguiente
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: '8px 0' }}>
            ${stats.projectedNextMonth.toLocaleString('es-CL')}
          </p>
          <p style={{ fontSize: '11px', color: '#1e40af', margin: 0, opacity: 0.8 }}>
            Promedio basado en últimos 3 meses
          </p>
        </div>

        {/* Card 3: Anticipos Pendientes */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
          borderRadius: '12px',
          border: '2px solid #ec4899'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaMoneyBillWave size={24} color="#ec4899" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#9f1239', fontWeight: '600' }}>
              Anticipos Pendientes
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#9f1239', margin: '8px 0' }}>
            {stats.pendingCount}
          </p>
          <p style={{ fontSize: '11px', color: '#9f1239', margin: 0, opacity: 0.8 }}>
            Firmados/pagados sin descontar
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="form-group">
            <label>Trabajador</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
            >
              <option value="">Todos</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Período</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
            >
              <option value="">Todos</option>
              {generatePeriodOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="emitido">Emitido</option>
              <option value="firmado">Firmado</option>
              <option value="pagado">Pagado</option>
              <option value="descontado">Descontado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de anticipos */}
      <div className="card">
        {advances.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Trabajador</th>
                <th>Fecha</th>
                <th>Período</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Liquidación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((advance) => (
                <tr key={advance.id}>
                  <td>
                    <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                      {advance.advance_number || advance.id.substring(0, 8).toUpperCase()}
                    </code>
                  </td>
                  <td>
                    <div>
                      <strong>{advance.employees?.full_name}</strong>
                      <br />
                      <small style={{ color: '#6b7280' }}>{advance.employees?.rut}</small>
                    </div>
                  </td>
                  <td>{formatDate(advance.advance_date)}</td>
                  <td>{formatMonthYear(parseInt(advance.period.split('-')[0]), parseInt(advance.period.split('-')[1]))}</td>
                  <td style={{ fontWeight: 'bold' }}>${Number(advance.amount).toLocaleString('es-CL')}</td>
                  <td>{getStatusBadge(advance.status)}</td>
                  <td>
                    {advance.payroll_slip_id ? (
                      <Link href={`/payroll/${advance.payroll_slip_id}`} style={{ color: '#2563eb' }}>
                        Ver Liquidación
                      </Link>
                    ) : (
                      <span style={{ color: '#6b7280' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link href={`/advances/${advance.id}/pdf`} target="_blank">
                        <button style={{ padding: '6px 12px', fontSize: '12px' }} className="secondary">
                          <FaFilePdf size={14} /> PDF
                        </button>
                      </Link>
                      {(advance.status === 'borrador' || advance.status === 'emitido') && (
                        <Link href={`/advances/${advance.id}/edit`}>
                          <button style={{ padding: '6px 12px', fontSize: '12px' }} className="secondary">
                            <FaEdit size={14} />
                          </button>
                        </Link>
                      )}
                      {advance.status === 'borrador' && (
                        <button
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#3b82f6', color: 'white' }}
                          onClick={() => handleStatusChange(advance.id, 'emitido')}
                        >
                          <FaCheck size={14} /> Emitir
                        </button>
                      )}
                      {advance.status === 'emitido' && (
                        <button
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#8b5cf6', color: 'white' }}
                          onClick={() => handleStatusChange(advance.id, 'firmado')}
                        >
                          <FaCheck size={14} /> Marcar Firmado
                        </button>
                      )}
                      {advance.status === 'firmado' && (
                        <button
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#10b981', color: 'white' }}
                          onClick={() => handleStatusChange(advance.id, 'pagado')}
                        >
                          <FaCheck size={14} /> Marcar Pagado
                        </button>
                      )}
                      {/* Botón restaurar - si está descontado pero la liquidación no existe */}
                      {advance.status === 'descontado' && (
                        <button
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#10b981', color: 'white' }}
                          onClick={async () => {
                            if (advance.payroll_slip_id) {
                              // Verificar si la liquidación existe
                              const { data: payrollExists } = await supabase
                                .from('payroll_slips')
                                .select('id')
                                .eq('id', advance.payroll_slip_id)
                                .single()

                              if (!payrollExists) {
                                // La liquidación no existe, restaurar el anticipo
                                if (confirm('La liquidación vinculada no existe. ¿Restaurar este anticipo?')) {
                                  try {
                                    const { error } = await supabase
                                      .from('advances')
                                      .update({
                                        status: 'pagado',
                                        payroll_slip_id: null,
                                        discounted_at: null,
                                        updated_at: new Date().toISOString()
                                      })
                                      .eq('id', advance.id)

                                    if (error) throw error
                                    alert('Anticipo restaurado correctamente')
                                    loadData()
                                  } catch (error: any) {
                                    alert('Error al restaurar anticipo: ' + error.message)
                                  }
                                }
                              } else {
                                alert('Este anticipo está vinculado a una liquidación existente. No se puede restaurar.')
                              }
                            } else {
                              // No tiene liquidación vinculada, restaurar directamente
                              if (confirm('¿Restaurar este anticipo?')) {
                                try {
                                  const { error } = await supabase
                                    .from('advances')
                                    .update({
                                      status: 'pagado',
                                      updated_at: new Date().toISOString()
                                    })
                                    .eq('id', advance.id)

                                  if (error) throw error
                                  alert('Anticipo restaurado correctamente')
                                  loadData()
                                } catch (error: any) {
                                  alert('Error al restaurar anticipo: ' + error.message)
                                }
                              }
                            }
                          }}
                          title="Restaurar anticipo"
                        >
                          <FaCheck size={14} /> Restaurar
                        </button>
                      )}
                      {/* Botón eliminar - solo si no está descontado */}
                      {advance.status !== 'descontado' && (
                        <button
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                          onClick={() => handleDelete(advance.id, advance.employees?.full_name || 'el trabajador', Number(advance.amount))}
                          title="Eliminar anticipo"
                        >
                          <FaTrash size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            <FaMoneyBillWave size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p>No hay anticipos registrados</p>
            <Link href="/advances/new">
              <button style={{ marginTop: '16px' }}>Crear Primer Anticipo</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

