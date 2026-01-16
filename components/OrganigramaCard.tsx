'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import EmployeeSelectorModal from './EmployeeSelectorModal'
import { FaPlus, FaTimes, FaUser, FaSitemap } from 'react-icons/fa'

interface OrganigramaCardProps {
  employeeId: string
  employeeName: string
  onUpdate?: () => void
}

export default function OrganigramaCard({
  employeeId,
  employeeName,
  onUpdate,
}: OrganigramaCardProps) {
  const { companyId } = useCurrentCompany()
  const [superior, setSuperior] = useState<any>(null)
  const [subordinados, setSubordinados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuperiorModal, setShowSuperiorModal] = useState(false)
  const [showSubordinadoModal, setShowSubordinadoModal] = useState(false)

  useEffect(() => {
    if (employeeId && companyId) {
      loadOrganigramaData()
    }
  }, [employeeId, companyId])

  const loadOrganigramaData = async () => {
    try {
      setLoading(true)

      // Cargar superior
      const { data: employeeData } = await supabase
        .from('employees')
        .select('superior_id')
        .eq('id', employeeId)
        .single()

      if (employeeData?.superior_id) {
        const { data: superiorData } = await supabase
          .from('employees')
          .select('id, full_name, rut, position')
          .eq('id', employeeData.superior_id)
          .single()

        setSuperior(superiorData)
      } else {
        setSuperior(null)
      }

      // Cargar subordinados
      const { data: subordinadosData } = await supabase
        .from('employees')
        .select('id, full_name, rut, position')
        .eq('superior_id', employeeId)
        .eq('status', 'active')
        .order('full_name')

      setSubordinados(subordinadosData || [])
    } catch (error) {
      console.error('Error al cargar datos de organigrama:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetSuperior = async (superiorId: string) => {
    try {
      const response = await fetch('/api/organigrama/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          superior_id: superiorId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al establecer superior')
        return
      }

      await loadOrganigramaData()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error al establecer superior:', error)
      alert('Error al establecer superior')
    }
  }

  const handleRemoveSuperior = async () => {
    if (!confirm('¿Está seguro de que desea eliminar la relación con el superior?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/organigrama/relationships?employee_id=${employeeId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al eliminar relación')
        return
      }

      await loadOrganigramaData()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error al eliminar superior:', error)
      alert('Error al eliminar superior')
    }
  }

  const handleAddSubordinado = async (subordinadoId: string) => {
    try {
      const response = await fetch('/api/organigrama/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: subordinadoId,
          superior_id: employeeId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al agregar subordinado')
        return
      }

      await loadOrganigramaData()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error al agregar subordinado:', error)
      alert('Error al agregar subordinado')
    }
  }

  const handleRemoveSubordinado = async (subordinadoId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar la relación con este subordinado?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/organigrama/relationships?employee_id=${subordinadoId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al eliminar relación')
        return
      }

      await loadOrganigramaData()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error al eliminar subordinado:', error)
      alert('Error al eliminar subordinado')
    }
  }

  return (
    <>
      <div
        className="card"
        style={{
          marginBottom: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FaSitemap size={16} style={{ color: '#3b82f6' }} />
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
            Organigrama
          </h2>
        </div>
        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              Cargando...
            </div>
          ) : (
            <>
              {/* Superior */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '8px',
                    display: 'block',
                  }}
                >
                  Superior / Jefe
                </label>
                {superior ? (
                  <div
                    style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        {superior.full_name}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                        {superior.position || 'Sin cargo'} • RUT: {superior.rut}
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveSuperior}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FaTimes size={12} />
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px dashed #d1d5db',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      Sin superior asignado
                    </p>
                    <button
                      onClick={() => setShowSuperiorModal(true)}
                      style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FaPlus size={14} />
                      Agregar Superior
                    </button>
                  </div>
                )}
              </div>

              {/* Subordinados */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      display: 'block',
                    }}
                  >
                    Subordinados ({subordinados.length})
                  </label>
                  <button
                    onClick={() => setShowSubordinadoModal(true)}
                    style={{
                      padding: '6px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <FaPlus size={12} />
                    Agregar
                  </button>
                </div>
                {subordinados.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {subordinados.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          padding: '12px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                            {sub.full_name}
                          </p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            {sub.position || 'Sin cargo'} • RUT: {sub.rut}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveSubordinado(sub.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <FaTimes size={12} />
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px dashed #d1d5db',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                      Sin subordinados asignados
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      <EmployeeSelectorModal
        isOpen={showSuperiorModal}
        onClose={() => setShowSuperiorModal(false)}
        onSelect={handleSetSuperior}
        excludeEmployeeId={employeeId}
        title="Seleccionar Superior"
        type="superior"
      />

      <EmployeeSelectorModal
        isOpen={showSubordinadoModal}
        onClose={() => setShowSubordinadoModal(false)}
        onSelect={handleAddSubordinado}
        excludeEmployeeId={employeeId}
        title="Seleccionar Subordinado"
        type="subordinado"
      />
    </>
  )
}

