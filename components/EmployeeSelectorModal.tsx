'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaTimes, FaSearch } from 'react-icons/fa'

interface Employee {
  id: string
  full_name: string
  rut: string
  position: string | null
}

interface EmployeeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (employeeId: string) => void
  excludeEmployeeId?: string | null
  title?: string
  type?: 'superior' | 'subordinado'
}

export default function EmployeeSelectorModal({
  isOpen,
  onClose,
  onSelect,
  excludeEmployeeId,
  title = 'Seleccionar Trabajador',
  type = 'superior',
}: EmployeeSelectorModalProps) {
  const { companyId } = useCurrentCompany()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen && companyId) {
      loadEmployees()
    }
  }, [isOpen, companyId])

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(
        (emp) =>
          emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredEmployees(filtered)
    } else {
      setFilteredEmployees(employees)
    }
  }, [searchTerm, employees])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('employees')
        .select('id, full_name, rut, position')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name')

      // Excluir al empleado actual
      if (excludeEmployeeId) {
        query = query.neq('id', excludeEmployeeId)
      }

      const { data, error } = await query

      if (error) throw error
      setEmployees(data || [])
      setFilteredEmployees(data || [])
    } catch (error) {
      console.error('Error al cargar empleados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (employeeId: string) => {
    onSelect(employeeId)
    onClose()
    setSearchTerm('')
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FaSearch
              style={{
                position: 'absolute',
                left: '12px',
                color: '#9ca3af',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Cargando...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              {searchTerm ? 'No se encontraron trabajadores' : 'No hay trabajadores disponibles'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => handleSelect(employee.id)}
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
                      <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#6b7280' }}>
                        <span>RUT: {employee.rut}</span>
                        {employee.position && <span>Cargo: {employee.position}</span>}
                      </div>
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
                        fontSize: '14px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(employee.id)
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
    </div>
  )
}

