'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Employee } from '@/types'
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .order('full_name')

      if (fetchError) {
        console.error('Error al cargar trabajadores:', fetchError)
        setError(fetchError.message)
        return
      }

      setEmployees(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error inesperado:', err)
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${employee.full_name}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id)

      if (deleteError) {
        console.error('Error al eliminar trabajador:', deleteError)
        alert('Error al eliminar trabajador: ' + deleteError.message)
        return
      }

      // Recargar la lista
      loadEmployees()
    } catch (err: any) {
      console.error('Error inesperado:', err)
      alert('Error al eliminar trabajador: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Trabajadores</h1>
        <div className="card">
          <p>Cargando trabajadores...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1>Trabajadores</h1>
        <div className="card" style={{ background: '#fee2e2', borderColor: '#dc2626' }}>
          <h2 style={{ color: '#991b1b' }}>Error al cargar trabajadores</h2>
          <p style={{ color: '#991b1b' }}>{error}</p>
          <button onClick={loadEmployees} style={{ marginTop: '16px' }}>Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Trabajadores</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadEmployees} className="secondary" style={{ padding: '8px 16px' }}>
            Actualizar
          </button>
          <button 
            style={{ 
              background: '#fbbf24', 
              color: '#000',
              fontWeight: '600',
              padding: '8px 16px'
            }}
          >
            Generar Contrato/Anexo
          </button>
          <Link href="/employees/new">
            <button>Nuevo Trabajador</button>
          </Link>
        </div>
      </div>

      <div className="card">
        {employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p>No hay trabajadores registrados.</p>
            <Link href="/employees/new">
              <button style={{ marginTop: '16px' }}>Crear Primer Trabajador</button>
            </Link>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '16px', color: '#6b7280' }}>
              Total: {employees.length} trabajador{employees.length !== 1 ? 'es' : ''}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>RUT</th>
                  <th>Cargo</th>
                  <th>AFP</th>
                  <th>Sistema de Salud</th>
                  <th>Sueldo Base</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee: Employee) => (
                  <tr key={employee.id}>
                    <td>{employee.full_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{employee.rut}</td>
                    <td>{employee.position}</td>
                    <td>{employee.afp}</td>
                    <td>{employee.health_system}</td>
                    <td>${employee.base_salary.toLocaleString('es-CL')}</td>
                    <td>
                      <span className={`badge ${employee.status}`}>
                        {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Link href={`/employees/${employee.id}`}>
                          <button 
                            style={{ 
                              padding: '6px 10px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              cursor: 'pointer',
                              border: '1px solid #d1d5db',
                              background: '#fff',
                              borderRadius: '4px'
                            }}
                            title="Ver"
                          >
                            <FaEye style={{ fontSize: '14px', color: '#3b82f6' }} />
                          </button>
                        </Link>
                        <Link href={`/employees/${employee.id}/edit`}>
                          <button 
                            style={{ 
                              padding: '6px 10px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              cursor: 'pointer',
                              border: '1px solid #d1d5db',
                              background: '#fff',
                              borderRadius: '4px'
                            }}
                            title="Editar"
                          >
                            <FaPencilAlt style={{ fontSize: '14px', color: '#f59e0b' }} />
                          </button>
                        </Link>
                        <button 
                          onClick={() => handleDelete(employee)}
                          style={{ 
                            padding: '6px 10px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            borderRadius: '4px'
                          }}
                          title="Eliminar"
                        >
                          <FaTrash style={{ fontSize: '14px', color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}

