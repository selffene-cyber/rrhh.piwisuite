'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaHandHoldingUsd, FaChartLine, FaFileInvoiceDollar, FaTrash, FaPlus } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function LoansManagementPage() {
  const { companyId } = useCurrentCompany()
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPending: 0,
    totalThisMonth: 0,
    activeLoansCount: 0
  })

  useEffect(() => {
    if (companyId) {
      loadData()
    } else {
      setLoans([])
      setLoading(false)
    }
  }, [companyId])

  const loadData = async () => {
    try {
      setLoading(true)

      if (!companyId) {
        setLoans([])
        setLoading(false)
        return
      }

      // Primero obtener los IDs de los empleados de la empresa
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)

      if (employeesError) throw employeesError

      const employeeIds = employeesData?.map((emp: { id: string }) => emp.id) || []

      if (employeeIds.length === 0) {
        setLoans([])
        setLoading(false)
        return
      }

      // Cargar todos los préstamos activos y cancelados con información del empleado
      const { data: loansData, error } = await supabase
        .from('loans')
        .select(`
          id,
          employee_id,
          loan_number,
          amount,
          total_amount,
          remaining_amount,
          installment_amount,
          installments,
          paid_installments,
          interest_rate,
          loan_date,
          status,
          created_at,
          employees (
            id,
            full_name,
            rut
          )
        `)
        .in('employee_id', employeeIds)
        .in('status', ['active', 'cancelled'])
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setLoans(loansData || [])

      // Calcular estadísticas
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const currentMonthStart = new Date(currentYear, currentMonth - 1, 1)
      const currentMonthEnd = new Date(currentYear, currentMonth, 0)

      let totalPending = 0
      let totalThisMonth = 0
      let activeLoansCount = 0

      if (loansData) {
        for (const loan of loansData) {
          totalPending += Number(loan.remaining_amount || 0)
          activeLoansCount++

          // Préstamos creados en el mes actual
          const loanDate = new Date(loan.loan_date)
          if (loanDate >= currentMonthStart && loanDate <= currentMonthEnd) {
            totalThisMonth += Number(loan.amount || 0)
          }
        }
      }

      setStats({
        totalPending,
        totalThisMonth,
        activeLoansCount
      })
    } catch (error: any) {
      console.error('Error al cargar préstamos:', error)
      alert('Error al cargar préstamos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (loanId: string, loanNumber: string, employeeName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el préstamo ${loanNumber} de ${employeeName}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId)

      if (error) throw error

      alert('Préstamo eliminado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al eliminar préstamo: ' + error.message)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Gestión de Préstamos</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/loans/new">
            <button>
              <FaPlus style={{ marginRight: '8px' }} />
              Nuevo Préstamo
            </button>
          </Link>
          <Link href="/">
            <button className="secondary">Volver al Dashboard</button>
          </Link>
        </div>
      </div>

      {/* Cards de Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Monto Pendiente a Pago */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px',
          border: '2px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaHandHoldingUsd size={24} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#92400e', fontWeight: '600' }}>
              Monto Pendiente a Pago
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#92400e', margin: '8px 0' }}>
            ${stats.totalPending.toLocaleString('es-CL')}
          </p>
          <p style={{ fontSize: '11px', color: '#92400e', margin: 0, opacity: 0.8 }}>
            Total de préstamos activos pendientes
          </p>
        </div>

        {/* Card 2: Monto Prestado en el Mes */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          borderRadius: '12px',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaChartLine size={24} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
              Monto Prestado (Mes Actual)
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: '8px 0' }}>
            ${stats.totalThisMonth.toLocaleString('es-CL')}
          </p>
          <p style={{ fontSize: '11px', color: '#1e40af', margin: 0, opacity: 0.8 }}>
            Préstamos otorgados este mes
          </p>
        </div>

        {/* Card 3: Total de Préstamos Activos */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
          borderRadius: '12px',
          border: '2px solid #ec4899'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <FaFileInvoiceDollar size={24} color="#ec4899" />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#9f1239', fontWeight: '600' }}>
              Préstamos Activos
            </h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#9f1239', margin: '8px 0' }}>
            {stats.activeLoansCount}
          </p>
          <p style={{ fontSize: '11px', color: '#9f1239', margin: 0, opacity: 0.8 }}>
            Total de préstamos en curso
          </p>
        </div>
      </div>

      {/* Tabla de Préstamos */}
      <div className="card">
        <h2>Trabajadores con Préstamos</h2>
        {loans.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID Préstamo</th>
                <th>Trabajador</th>
                <th>RUT</th>
                <th>Fecha</th>
                <th>Monto Solicitado</th>
                <th>Total a Pagar</th>
                <th>Cuotas</th>
                <th>Cuotas Pagadas</th>
                <th>Monto Pendiente</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan: any) => (
                <tr key={loan.id}>
                  <td style={{ fontWeight: '600' }}>{loan.loan_number || 'N/A'}</td>
                  <td>{loan.employees?.full_name || 'N/A'}</td>
                  <td>{loan.employees?.rut || 'N/A'}</td>
                  <td>{formatDate(loan.loan_date)}</td>
                  <td>${Number(loan.amount || 0).toLocaleString('es-CL')}</td>
                  <td>${Number(loan.total_amount || 0).toLocaleString('es-CL')}</td>
                  <td>{loan.installments}</td>
                  <td>
                    <span style={{ fontWeight: '600' }}>
                      {loan.paid_installments} / {loan.installments}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600', color: '#dc2626' }}>
                    ${Number(loan.remaining_amount).toLocaleString('es-CL')}
                  </td>
                  <td>
                    <span className={`badge ${loan.status}`}>
                      {loan.status === 'active' ? 'Activo' : loan.status === 'paid' ? 'Pagado' : 'Cancelado'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <Link href={`/employees/${loan.employee_id}/loans/${loan.id}`}>
                        <button style={{ padding: '4px 8px', fontSize: '12px' }}>Ver</button>
                      </Link>
                      <Link href={`/employees/${loan.employee_id}/loans/${loan.id}/pdf`} target="_blank">
                        <button style={{ padding: '4px 8px', fontSize: '12px' }} className="secondary">PDF</button>
                      </Link>
                      <Link href={`/employees/${loan.employee_id}`}>
                        <button style={{ padding: '4px 8px', fontSize: '12px' }} className="secondary">Trabajador</button>
                      </Link>
                      {(loan.status === 'cancelled' || loan.status === 'canceled') && (
                        <button
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          className="danger"
                          onClick={() => handleDelete(loan.id, loan.loan_number || 'N/A', loan.employees?.full_name || 'N/A')}
                          title="Eliminar préstamo cancelado"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No hay préstamos activos registrados.
          </p>
        )}
      </div>
    </div>
  )
}

