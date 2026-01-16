'use client'

import { useState, useEffect, useRef } from 'react'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import DepartmentChart from '@/components/DepartmentChart'
import { FaCompress, FaExpand, FaPlus, FaMinus, FaBuilding } from 'react-icons/fa'
import Link from 'next/link'

interface DepartmentTreeNode {
  id: string
  name: string
  code?: string
  status: 'active' | 'inactive'
  employee_count: number
  children?: DepartmentTreeNode[]
}

export default function DepartmentChartPage() {
  const { companyId, company } = useCurrentCompany()
  const [tree, setTree] = useState<DepartmentTreeNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active')
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
      loadDepartmentTree()
    }
  }, [companyId, statusFilter])

  const loadDepartmentTree = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/departments/chart?company_id=${companyId}&status=${statusFilter}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar organigrama de departamentos')
      }

      const data = await response.json()
      setTree(data.tree)
    } catch (error) {
      console.error('Error al cargar organigrama de departamentos:', error)
      alert('Error al cargar el organigrama de departamentos')
    } finally {
      setLoading(false)
    }
  }

  const handleNodeClick = (node: DepartmentTreeNode) => {
    // Opcional: navegar a la página de gestión de departamentos o mostrar detalles
    console.log('Departamento clickeado:', node)
  }

  const handleZoomIn = () => {
    window.dispatchEvent(new Event('department-chart-zoom-in'))
  }

  const handleZoomOut = () => {
    window.dispatchEvent(new Event('department-chart-zoom-out'))
  }

  const handleResetView = () => {
    window.dispatchEvent(new Event('department-chart-reset'))
  }

  if (!company) {
    return (
      <div>
        <h1>Organigrama de Departamentos</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver el organigrama de departamentos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
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
            <FaBuilding size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Organigrama de Departamentos</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Estructura organizacional de {company.name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/admin/departments">
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaBuilding /> Gestionar Departamentos
            </button>
          </Link>
          <Link href="/organigrama">
            <button className="secondary">Ver Organigrama de Trabajadores</button>
          </Link>
        </div>
      </div>

      {/* Controles */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={statusFilter === 'active'}
                onChange={() => setStatusFilter('active')}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px' }}>Solo Activos</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={statusFilter === 'all'}
                onChange={() => setStatusFilter('all')}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px' }}>Todos</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px' }}>Modo Compacto</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleResetView}
              className="secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '14px',
              }}
              title="Restablecer vista"
            >
              <FaCompress size={16} />
              {!isMobile && <span>Restablecer Vista</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor del organigrama */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: isMobile ? '500px' : '700px',
            minHeight: isMobile ? '500px' : '700px',
            position: 'relative',
          }}
        >
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280',
            }}>
              Cargando organigrama...
            </div>
          ) : tree ? (
            <DepartmentChart
              data={tree}
              onNodeClick={handleNodeClick}
              compact={compactMode}
              nodeSpacing={compactMode ? 240 : 300}
              levelSpacing={compactMode ? 225 : 250}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <FaBuilding size={48} style={{ opacity: 0.3 }} />
              <p>No hay departamentos para mostrar.</p>
              <Link href="/admin/departments">
                <button>Crear Primer Departamento</button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Botones de zoom flotantes */}
      {tree && (
        <div style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 1000,
        }}>
          <button
            onClick={handleZoomIn}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              fontSize: '20px',
            }}
            title="Acercar"
          >
            <FaPlus size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              fontSize: '20px',
            }}
            title="Alejar"
          >
            <FaMinus size={20} />
          </button>
        </div>
      )}
    </div>
  )
}

