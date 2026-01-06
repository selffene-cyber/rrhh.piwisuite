'use client'

import { useState, useEffect, useRef } from 'react'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import EnhancedOrgChart from '@/components/EnhancedOrgChart'
import EmployeeSelectorModal from '@/components/EmployeeSelectorModal'
import EmployeeDetailSlide from '@/components/EmployeeDetailSlide'
import { FaEdit, FaTimes, FaPlus, FaSearch, FaCompress, FaExpand, FaEye, FaMobile, FaPlus as FaPlusIcon, FaMinus } from 'react-icons/fa'

interface OrgNode {
  id: string
  name: string
  position: string
  status?: string
  contractType?: string
  costCenter?: string
  costCenterName?: string
  departmentId?: string
  departmentName?: string
  departmentPath?: string
  children?: OrgNode[]
}

export default function OrganigramaPage() {
  const { companyId } = useCurrentCompany()
  const [tree, setTree] = useState<OrgNode | null>(null)
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null)
  const [editType, setEditType] = useState<'superior' | 'subordinado' | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (companyId) {
      loadOrganigrama()
    }
  }, [companyId])

  const loadOrganigrama = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/organigrama/tree?company_id=${companyId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar organigrama')
      }

      const data = await response.json()
      console.log('Datos del organigrama recibidos:', {
        tree: data.tree,
        hasChildren: data.tree?.children?.length || 0,
        children: data.tree?.children?.map((c: any) => c.name) || []
      })
      setTree(data.tree)
      setAllEmployees(data.employees || [])
    } catch (error) {
      console.error('Error al cargar organigrama:', error)
      alert('Error al cargar el organigrama')
    } finally {
      setLoading(false)
    }
  }

  const handleNodeClick = (node: OrgNode) => {
    if (editMode) {
      setSelectedNode(node)
    } else {
      // En modo ver, abrir drawer
      setSelectedEmployeeId(node.id)
    }
  }

  const handleNodeView = (node: OrgNode) => {
    setSelectedEmployeeId(node.id)
  }

  const handleNodeAssignSuperior = (node: OrgNode) => {
    setSelectedNode(node)
    setEditType('superior')
    setShowEditModal(true)
  }

  const handleSaveRelationship = async (employeeId: string) => {
    if (!selectedNode || !editType) return

    try {
      let response
      
      if (editType === 'superior') {
        response = await fetch('/api/organigrama/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: selectedNode.id,
            superior_id: employeeId,
          }),
        })
      } else {
        response = await fetch('/api/organigrama/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: employeeId,
            superior_id: selectedNode.id,
          }),
        })
      }

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al guardar relación')
        return
      }

      await loadOrganigrama()
      setShowEditModal(false)
      setSelectedNode(null)
      setEditType(null)
    } catch (error) {
      console.error('Error al guardar relación:', error)
      alert('Error al guardar relación')
    }
  }

  const handleSearch = () => {
    if (!searchTerm.trim() || !tree) return

    // Buscar en el árbol
    const findNode = (node: OrgNode, term: string): OrgNode | null => {
      if (node.name.toLowerCase().includes(term.toLowerCase()) || 
          node.position?.toLowerCase().includes(term.toLowerCase())) {
        return node
      }
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, term)
          if (found) return found
        }
      }
      return null
    }

    const found = findNode(tree, searchTerm)
    if (found) {
      // Centrar en el nodo encontrado (esto requeriría calcular la posición)
      // Por ahora, solo mostramos un mensaje
      alert(`Encontrado: ${found.name}`)
      setSelectedEmployeeId(found.id)
    } else {
      alert('No se encontró ningún trabajador con ese nombre')
    }
  }

  const handleZoomIn = () => {
    if (chartRef.current && (chartRef.current as any).zoomIn) {
      ;(chartRef.current as any).zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (chartRef.current && (chartRef.current as any).zoomOut) {
      ;(chartRef.current as any).zoomOut()
    }
  }

  const handleResetView = () => {
    if (chartRef.current && (chartRef.current as any).resetView) {
      ;(chartRef.current as any).resetView()
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Cargando organigrama...</p>
      </div>
    )
  }

  if (!tree) {
    return (
      <div>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Organigrama</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            No hay datos de organigrama disponibles. 
            <br />
            Comienza agregando relaciones jerárquicas desde la ficha de los trabajadores.
          </p>
        </div>
      </div>
    )
  }

  // Vista móvil: cadena jerárquica
  if (isMobile && !editMode) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h1>Organigrama</h1>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FaEdit size={14} />
              Editar
            </button>
            <button
              onClick={() => setCompactMode(!compactMode)}
              style={{
                padding: '8px 16px',
                background: compactMode ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {compactMode ? 'Comfortable' : 'Compact'}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Vista móvil: Navega por la cadena jerárquica
          </p>
          {/* Aquí iría la vista de cadena móvil */}
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            Vista de cadena móvil (en desarrollo)
            <br />
            <small>Usa el modo escritorio para ver el organigrama completo</small>
          </div>
        </div>

        <EmployeeDetailSlide
          employeeId={selectedEmployeeId}
          isOpen={!!selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Header con controles */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1>Organigrama</h1>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Modo Ver/Editar */}
            <div
              style={{
                display: 'flex',
                background: '#f3f4f6',
                borderRadius: '8px',
                padding: '4px',
                gap: '4px',
              }}
            >
              <button
                onClick={() => setEditMode(false)}
                style={{
                  padding: '8px 16px',
                  background: !editMode ? '#3b82f6' : 'transparent',
                  color: !editMode ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                Ver
              </button>
              <button
                onClick={() => setEditMode(true)}
                style={{
                  padding: '8px 16px',
                  background: editMode ? '#3b82f6' : 'transparent',
                  color: editMode ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                Editar
              </button>
            </div>

            {/* Compact/Comfortable */}
            <button
              onClick={() => setCompactMode(!compactMode)}
              style={{
                padding: '8px 16px',
                background: compactMode ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {compactMode ? <FaCompress size={14} /> : <FaExpand size={14} />}
              {compactMode ? 'Comfortable' : 'Compact'}
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div style={{ display: 'flex', gap: '8px', maxWidth: '500px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FaSearch
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Buscar trabajador por nombre o cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Controles de Zoom (fijos arriba a la derecha) */}
      <div
        style={{
          position: 'fixed',
          top: '140px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 100,
          background: '#ffffff',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e5e7eb',
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            width: '44px',
            height: '44px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            transition: 'all 0.2s',
            fontWeight: '600',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="Acercar (+)"
        >
          <FaPlusIcon size={28} style={{ strokeWidth: 3, stroke: 'currentColor', fill: 'currentColor' }} />
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            width: '44px',
            height: '44px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            transition: 'all 0.2s',
            fontWeight: '600',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="Alejar (-)"
        >
          <FaMinus size={28} style={{ strokeWidth: 3, stroke: 'currentColor', fill: 'currentColor' }} />
        </button>
        <button
          onClick={handleResetView}
          style={{
            width: '44px',
            height: '44px',
            background: '#6b7280',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            transition: 'all 0.2s',
            fontWeight: '600',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4b5563'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#6b7280'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="Resetear vista"
        >
          <FaCompress size={28} style={{ strokeWidth: 3, stroke: 'currentColor', fill: 'currentColor' }} />
        </button>
      </div>

      {/* Organigrama */}
      <div
        className="card"
        style={{
          padding: '20px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'auto',
          minHeight: '600px',
          position: 'relative',
        }}
      >
        <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: '600px' }}>
          <EnhancedOrgChart
            data={tree}
            onNodeClick={handleNodeClick}
            onNodeView={handleNodeView}
            onNodeAssignSuperior={handleNodeAssignSuperior}
            editMode={editMode}
            compact={compactMode}
            nodeSpacing={compactMode ? 240 : 300}
            levelSpacing={compactMode ? 225 : 250}
          />
        </div>
      </div>

      {/* Indicador de modo */}
      {editMode && (
        <div
          className="card"
          style={{
            marginTop: '20px',
            padding: '16px',
            background: '#f0f9ff',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
            <strong>Modo Edición:</strong> Haz clic en los botones de cada nodo para ver la ficha o asignar un superior.
          </p>
        </div>
      )}

      {/* Modales */}
      <EmployeeSelectorModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedNode(null)
          setEditType(null)
        }}
        onSelect={handleSaveRelationship}
        excludeEmployeeId={selectedNode?.id}
        title={
          editType === 'superior'
            ? `Seleccionar Superior para ${selectedNode?.name}`
            : `Seleccionar Subordinado para ${selectedNode?.name}`
        }
        type={editType || 'superior'}
      />

      {/* Drawer de detalles del empleado */}
      <EmployeeDetailSlide
        employeeId={selectedEmployeeId}
        isOpen={!!selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
      />
    </div>
  )
}
