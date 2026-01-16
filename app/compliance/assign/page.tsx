'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaFileUpload, FaUsers, FaSave, FaArrowLeft } from 'react-icons/fa'

// Componente ToggleSwitch
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => {
  return (
    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: 'none' }}
      />
      <div
        style={{
          width: '48px',
          height: '24px',
          borderRadius: '12px',
          background: checked ? '#3b82f6' : '#d1d5db',
          position: 'relative',
          transition: 'background 0.2s',
          cursor: 'pointer',
        }}
        onClick={() => onChange(!checked)}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '2px',
            left: checked ? '26px' : '2px',
            transition: 'left 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </label>
  )
}

export default function ComplianceAssignPage() {
  const router = useRouter()
  const { company: currentCompany, companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [positions, setPositions] = useState<string[]>([])
  const [formData, setFormData] = useState({
    compliance_item_id: '',
    assignment_type: 'employee_list',
    target_value: '',
    fecha_emision: new Date().toISOString().split('T')[0],
  })
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  useEffect(() => {
    if (companyId) {
      loadData()
    }
  }, [companyId])

  const loadData = async () => {
    if (!companyId) return

    try {
      // Cargar ítems
      const itemsResponse = await fetch(`/api/compliance/items?company_id=${companyId}`)
      const itemsData = itemsResponse.ok ? await itemsResponse.json() : []
      setItems(itemsData)

      // Cargar trabajadores
      const { data: employeesData } = await supabase
        .from('employees')
        .select(`
          id, 
          full_name, 
          rut, 
          position, 
          cost_center_id,
          superior_id,
          cost_centers(id, name, code)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name')

      // Cargar información de superiores por separado
      if (employeesData) {
        const superiorIds = employeesData
          .map((e: any) => e.superior_id)
          .filter((id: string | null) => id !== null)
        
        if (superiorIds.length > 0) {
          const { data: superiorsData } = await supabase
            .from('employees')
            .select('id, full_name')
            .in('id', superiorIds)
          
          // Mapear superiores a empleados
          const superiorsMap = new Map(superiorsData?.map((s: any) => [s.id, s.full_name]) || [])
          employeesData.forEach((emp: any) => {
            if (emp.superior_id) {
              emp.superior = { full_name: superiorsMap.get(emp.superior_id) || 'Desconocido' }
            }
          })
        }
      }

      setEmployees(employeesData || [])

      // Cargar centros de costo
      const { data: ccData, error: ccError } = await supabase
        .from('cost_centers')
        .select('id, code, name, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('code')

      if (ccError) {
        console.error('Error cargando centros de costo:', ccError)
      }
      setCostCenters(ccData || [])

      // Cargar cargos únicos
      const uniquePositions = Array.from(
        new Set(employeesData?.map((e: any) => e.position).filter(Boolean) || [])
      ).sort() as string[]
      setPositions(uniquePositions)
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !formData.compliance_item_id) {
      alert('Selecciona un ítem de cumplimiento')
      return
    }

    try {
      setLoading(true)

      // Obtener el ítem para calcular fecha de vencimiento
      const item = items.find((i) => i.id === formData.compliance_item_id)
      if (!item) {
        alert('Ítem no encontrado')
        return
      }

      const fechaEmision = new Date(formData.fecha_emision)
      const fechaVencimiento = new Date(fechaEmision)
      fechaVencimiento.setDate(fechaVencimiento.getDate() + item.vigencia_dias)

      // Determinar trabajadores objetivo
      let targetEmployees: any[] = []

      if (formData.assignment_type === 'all') {
        targetEmployees = employees
      } else if (formData.assignment_type === 'employee_list') {
        targetEmployees = employees.filter((e) => selectedEmployees.includes(e.id))
      } else if (formData.assignment_type === 'cargo') {
        targetEmployees = employees.filter((e) => e.position === formData.target_value)
      } else if (formData.assignment_type === 'cost_center') {
        targetEmployees = employees.filter((e) => e.cost_center_id === formData.target_value)
      }

      if (targetEmployees.length === 0) {
        alert('No hay trabajadores seleccionados')
        return
      }

      // Crear cumplimientos
      const complianceData = targetEmployees.map((emp) => ({
        company_id: companyId,
        employee_id: emp.id,
        compliance_item_id: formData.compliance_item_id,
        fecha_emision: formData.fecha_emision,
        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
        source: 'perfil_cargo',
      }))

      // Insertar en lotes
      const batchSize = 50
      for (let i = 0; i < complianceData.length; i += batchSize) {
        const batch = complianceData.slice(i, i + batchSize)
        const response = await fetch('/api/compliance/worker/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: batch }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error al asignar cumplimientos')
        }
      }

      alert(`Se asignaron ${targetEmployees.length} cumplimientos correctamente`)
      router.push('/compliance')
    } catch (error: any) {
      console.error('Error asignando cumplimientos:', error)
      alert(error.message || 'Error al asignar cumplimientos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '20px',
            }}
          >
            <FaArrowLeft />
          </button>
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
              <FaFileUpload size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Asignación Masiva</h1>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                Asignar ítems de cumplimiento a múltiples trabajadores
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="card" style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Cabecera en una sola fila: Ítem, Fecha y Tipo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Ítem de Cumplimiento *
                </label>
                <select
                  value={formData.compliance_item_id}
                  onChange={(e) => setFormData({ ...formData, compliance_item_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Selecciona un ítem</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} ({item.vigencia_dias} días)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Fecha de Emisión *
                </label>
                <input
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Tipo de Asignación *
                </label>
                <select
                  value={formData.assignment_type}
                  onChange={(e) => {
                    setFormData({ ...formData, assignment_type: e.target.value, target_value: '' })
                    setSelectedEmployees([])
                  }}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="all">Todos los trabajadores</option>
                  <option value="employee_list">Lista de trabajadores</option>
                  <option value="cargo">Por cargo</option>
                  <option value="cost_center">Por centro de costo</option>
                </select>
              </div>
            </div>

            {/* Selector según tipo */}
            {formData.assignment_type === 'employee_list' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Seleccionar Trabajadores * ({selectedEmployees.length} seleccionado(s))
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Total: {employees.length}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = employees.map((e: any) => e.id)
                      const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEmployees.includes(id))
                      setSelectedEmployees(allSelected ? [] : allIds)
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'white',
                      color: '#111827',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px',
                    }}
                  >
                    {employees.length > 0 && employees.every((e: any) => selectedEmployees.includes(e.id))
                      ? 'Quitar selección'
                      : 'Seleccionar todos'}
                  </button>
                </div>
                <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Seleccionar</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Nombre</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>RUT</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Cargo</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Centro de Costo</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Superior</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => {
                        const isSelected = selectedEmployees.includes(emp.id)
                        return (
                          <tr
                            key={emp.id}
                            style={{
                              background: isSelected ? '#d1fae5' : 'white',
                              borderBottom: '1px solid #e5e7eb',
                              transition: 'background 0.2s',
                            }}
                          >
                            <td style={{ padding: '12px' }}>
                              <ToggleSwitch
                                checked={isSelected}
                                onChange={(checked) => {
                                  if (checked) {
                                    setSelectedEmployees([...selectedEmployees, emp.id])
                                  } else {
                                    setSelectedEmployees(selectedEmployees.filter((id) => id !== emp.id))
                                  }
                                }}
                              />
                            </td>
                            <td style={{ padding: '12px', fontWeight: '500', color: '#111827' }}>{emp.full_name}</td>
                            <td style={{ padding: '12px', color: '#6b7280' }}>{emp.rut}</td>
                            <td style={{ padding: '12px', color: '#6b7280' }}>{emp.position || '-'}</td>
                            <td style={{ padding: '12px', color: '#6b7280' }}>
                              {emp.cost_centers 
                                ? [emp.cost_centers.code, emp.cost_centers.name].filter(Boolean).join(' - ') || '-'
                                : '-'}
                            </td>
                            <td style={{ padding: '12px', color: '#6b7280' }}>
                              {emp.superior ? emp.superior.full_name : 'Sin jefatura directa'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {formData.assignment_type === 'cargo' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Cargo *
                </label>
                <select
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Selecciona un cargo</option>
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                {formData.target_value && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                    {employees.filter((e) => e.position === formData.target_value).length} trabajador(es) con este cargo
                  </div>
                )}
              </div>
            )}

            {formData.assignment_type === 'cost_center' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Centro de Costo *
                </label>
                <select
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Selecciona un centro de costo</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {[cc.code, cc.name].filter(Boolean).join(' - ') || cc.name}
                    </option>
                  ))}
                </select>
                {formData.target_value && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                    {employees.filter((e) => e.cost_center_id === formData.target_value).length} trabajador(es) en este centro de costo
                  </div>
                )}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  background: loading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FaSave size={16} />
                {loading ? 'Asignando...' : 'Asignar Cumplimientos'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

