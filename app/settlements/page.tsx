'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/services/payrollCalculator'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  under_review: 'En Revisión',
  approved: 'Aprobado',
  signed: 'Firmado',
  paid: 'Pagado',
  void: 'Anulado'
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  under_review: '#f59e0b',
  approved: '#3b82f6',
  signed: '#10b981',
  paid: '#059669',
  void: '#ef4444'
}

export default function SettlementsPage() {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [settlements, setSettlements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Record<string, any>>({})
  const [filters, setFilters] = useState({
    status: '',
    employee_id: ''
  })

  useEffect(() => {
    if (currentCompany) {
      loadSettlements()
      loadEmployees()
    }
  }, [currentCompany, filters])

  const loadEmployees = async () => {
    if (!currentCompany) return

    const { data } = await supabase
      .from('employees')
      .select('id, full_name, rut')
      .eq('company_id', currentCompany.id)

    if (data) {
      const employeesMap: Record<string, any> = {}
      data.forEach((emp: any) => {
        employeesMap[emp.id] = emp
      })
      setEmployees(employeesMap)
    }
  }

  const loadSettlements = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        company_id: currentCompany.id
      })
      if (filters.status) params.append('status', filters.status)
      if (filters.employee_id) params.append('employee_id', filters.employee_id)

      const response = await fetch(`/api/settlements?${params}`)
      const data = await response.json()

      if (response.ok) {
        setSettlements(data.settlements || [])
      } else {
        alert('Error al cargar finiquitos: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este finiquito?')) return

    try {
      const response = await fetch(`/api/settlements/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadSettlements()
      } else {
        const data = await response.json()
        alert('Error al eliminar: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const handleVoid = async (id: string) => {
    const reason = prompt('Ingrese el motivo de anulación:')
    if (!reason) return

    try {
      const response = await fetch(`/api/settlements/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ void_reason: reason })
      })

      if (response.ok) {
        loadSettlements()
      } else {
        const data = await response.json()
        alert('Error al anular: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  if (!currentCompany) {
    return (
      <div className="card">
        <p>Seleccione una empresa para ver los finiquitos.</p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Finiquitos</h1>
          <button
            onClick={() => router.push('/settlements/new')}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Nuevo Finiquito
          </button>
        </div>

        {/* Filtros */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Estado:</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Trabajador:</label>
              <select
                value={filters.employee_id}
                onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              >
                <option value="">Todos</option>
                {Object.values(employees).map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="card">
            <p>Cargando...</p>
          </div>
        ) : settlements.length === 0 ? (
          <div className="card">
            <p>No hay finiquitos registrados.</p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>N°</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Trabajador</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Fecha Término</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Causal</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>Líquido a Pagar</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => {
                  const employee = employees[settlement.employee_id]
                  return (
                    <tr key={settlement.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{settlement.settlement_number || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {employee?.full_name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {formatDate(settlement.termination_date, 'dd/MM/yyyy')}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {settlement.cause?.label || settlement.cause_code || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(settlement.net_to_pay)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: `${STATUS_COLORS[settlement.status]}20`,
                            color: STATUS_COLORS[settlement.status]
                          }}
                        >
                          {STATUS_LABELS[settlement.status] || settlement.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => router.push(`/settlements/${settlement.id}`)}
                            style={{
                              padding: '4px 12px',
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Ver
                          </button>
                          {['draft', 'void'].includes(settlement.status) && (
                            <button
                              onClick={() => handleDelete(settlement.id)}
                              style={{
                                padding: '4px 12px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Eliminar
                            </button>
                          )}
                          {!['void', 'paid'].includes(settlement.status) && (
                            <button
                              onClick={() => handleVoid(settlement.id)}
                              style={{
                                padding: '4px 12px',
                                background: '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
  )
}

