'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { Department } from '@/lib/services/departmentService'

interface DepartmentSelectorProps {
  companyId: string
  value?: string | null
  onChange: (departmentId: string | null) => void
  disabled?: boolean
  placeholder?: string
  showHierarchy?: boolean // Mostrar ruta jerárquica en el dropdown
  showLabel?: boolean // Mostrar el label (por defecto false para usar el del formulario)
}

export default function DepartmentSelector({
  companyId,
  value,
  onChange,
  disabled = false,
  placeholder = 'Seleccionar departamento',
  showHierarchy = true,
  showLabel = false,
}: DepartmentSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [departmentMap, setDepartmentMap] = useState<Map<string, Department>>(new Map())

  useEffect(() => {
    if (companyId) {
      loadDepartments()
    }
  }, [companyId])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/departments?company_id=${companyId}&status=active`)
      if (!response.ok) throw new Error('Error al cargar departamentos')
      
      const data = await response.json()
      setDepartments(data || [])
      
      // Construir mapa para facilitar búsqueda de rutas
      const map = new Map<string, Department>()
      data.forEach((dept: Department) => {
        map.set(dept.id, dept)
      })
      setDepartmentMap(map)
    } catch (error) {
      console.error('Error al cargar departamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener ruta jerárquica completa
  const getDepartmentPath = (dept: Department): string => {
    if (!showHierarchy) return dept.name
    
    const path: string[] = []
    let current: Department | undefined = dept
    const visited = new Set<string>()

    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      path.unshift(current.name)
      if (current.parent_department_id) {
        current = departmentMap.get(current.parent_department_id)
      } else {
        break
      }
    }

    return path.join(' / ')
  }

  const selectedDepartment = departments.find(d => d.id === value)

  return (
    <>
      {showLabel && <label>Departamento</label>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled || loading}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '14px',
        }}
      >
        <option value="">{placeholder}</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {getDepartmentPath(dept)}
          </option>
        ))}
      </select>
      {loading && (
        <small style={{ color: '#6b7280', fontSize: '12px' }}>
          Cargando departamentos...
        </small>
      )}
    </>
  )
}

