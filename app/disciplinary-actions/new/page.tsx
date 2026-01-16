'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function NewDisciplinaryActionSelectPage() {
  const router = useRouter()
  const { company: currentCompany, companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    if (currentCompany && companyId) {
      loadEmployees()
    } else {
      setLoading(false)
    }
  }, [currentCompany, companyId])

  const loadEmployees = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error al cargar trabajadores:', error)
      alert('Error al cargar trabajadores: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeSelect = (employeeId: string) => {
    router.push(`/employees/${employeeId}/disciplinary-actions/new`)
  }

  if (!currentCompany) {
    return (
      <div>
        <h1>Nueva Amonestación</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para crear una amonestación.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <h1>Nueva Amonestación</h1>
        <div className="card">
          <p>Cargando trabajadores...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nueva Amonestación</h1>
        <Link href="/disciplinary-actions">
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <h2>Seleccionar Trabajador</h2>
        <p style={{ marginBottom: '24px', color: '#6b7280' }}>
          Selecciona el trabajador para el cual deseas crear una amonestación.
        </p>

        {employees.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay trabajadores activos disponibles.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {employees.map((employee) => (
              <div
                key={employee.id}
                onClick={() => handleEmployeeSelect(employee.id)}
                style={{
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6'
                  e.currentTarget.style.backgroundColor = '#f0f9ff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.backgroundColor = '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '16px', display: 'block', marginBottom: '4px' }}>
                      {employee.full_name}
                    </strong>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>RUT: {employee.rut}</span>
                  </div>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEmployeeSelect(employee.id)
                    }}
                  >
                    Seleccionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}








