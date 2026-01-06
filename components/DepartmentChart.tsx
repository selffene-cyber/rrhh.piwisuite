'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot, Root } from 'react-dom/client'
import * as d3 from 'd3'
import DepartmentNodeCard from './DepartmentNodeCard'

interface DepartmentTreeNode {
  id: string
  name: string
  code?: string
  status: 'active' | 'inactive'
  employee_count: number
  children?: DepartmentTreeNode[]
}

interface DepartmentChartProps {
  data: DepartmentTreeNode
  onNodeClick?: (node: DepartmentTreeNode) => void
  compact?: boolean
  nodeSpacing?: number
  levelSpacing?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetView?: () => void
}

export default function DepartmentChart({
  data,
  onNodeClick,
  compact = false,
  nodeSpacing = 280,
  levelSpacing = 250,
  onZoomIn,
  onZoomOut,
  onResetView,
}: DepartmentChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const nodeRootsRef = useRef<Map<string, Root>>(new Map())
  const isUnmountingRef = useRef(false)

  // Función para obtener color por nivel jerárquico
  const getLevelColor = (depth: number): string => {
    const colors = [
      '#3b82f6', // Blue - Nivel 0
      '#10b981', // Green - Nivel 1
      '#f59e0b', // Amber - Nivel 2
      '#8b5cf6', // Purple - Nivel 3
      '#ec4899', // Pink - Nivel 4
      '#06b6d4', // Cyan - Nivel 5
    ]
    return colors[Math.min(depth, colors.length - 1)]
  }

  // Limpiar roots de React
  const cleanupRoots = useCallback(() => {
    nodeRootsRef.current.forEach((root) => {
      try {
        root.unmount()
      } catch (error) {
        // Ignorar errores de unmount
      }
    })
    nodeRootsRef.current.clear()
  }, [])

  // Renderizar el chart
  const renderChart = useCallback(() => {
    if (!svgRef.current || !data) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = containerRef.current?.clientWidth || 1200
    const height = containerRef.current?.clientHeight || 800

    // Crear jerarquía
    const root = d3.hierarchy(data)
    const treeLayout = d3.tree<DepartmentTreeNode>()
      .nodeSize([levelSpacing, nodeSpacing])
      .separation((a, b) => {
        return a.parent === b.parent ? 1 : 1.2
      })

    treeLayout(root)

    // Calcular bounds
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    root.each((d) => {
      if (d.x !== undefined && d.y !== undefined) {
        minX = Math.min(minX, d.x)
        maxX = Math.max(maxX, d.x)
        minY = Math.min(minY, d.y)
        maxY = Math.max(maxY, d.y)
      }
    })

    // Centrar horizontalmente
    const treeWidth = maxY - minY
    const centerOffset = (treeWidth / 2) - maxY

    // Ajustar coordenadas para centrar
    root.each((d) => {
      if (d.y !== undefined) {
        d.y = d.y + centerOffset
      }
    })

    // Actualizar bounds después del ajuste
    minY = Infinity
    maxY = -Infinity
    root.each((d) => {
      if (d.y !== undefined) {
        minY = Math.min(minY, d.y)
        maxY = Math.max(maxY, d.y)
      }
    })

    const padding = 100
    const bounds = {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    }

    // Configurar zoom
    if (!zoomRef.current) {
      zoomRef.current = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
          transformRef.current = event.transform
          svg.select('g').attr('transform', event.transform.toString())
        })
    }

    svg.call(zoomRef.current)

    // Crear grupo principal
    const g = svg.append('g')
      .attr('transform', transformRef.current.toString())

    // Dibujar links
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(root.links())
      .enter()
      .append('path')
      .attr('d', (d) => {
        const sourceX = d.source.x ?? 0
        const sourceY = d.source.y ?? 0
        const targetX = d.target.x ?? 0
        const targetY = d.target.y ?? 0

        const sourceCardHeight = compact ? 140 : 180
        const targetCardHeight = compact ? 140 : 180

        const adjustedSourceY = sourceY + sourceCardHeight / 2
        const adjustedTargetY = targetY - targetCardHeight / 2

        return `M ${sourceY} ${adjustedSourceY}
                V ${adjustedSourceY + (adjustedTargetY - adjustedSourceY) / 2}
                H ${targetY}
                V ${adjustedTargetY}`
      })
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2)

    // Dibujar nodos
    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', (d) => {
        const x = d.y ?? 0
        const y = d.x ?? 0
        return `translate(${x}, ${y})`
      })

    // Crear contenedores para las cards
    nodes.each(function (d) {
      const nodeData = d.data as DepartmentTreeNode
      const container = d3.select(this)
        .append('foreignObject')
        .attr('width', compact ? 200 : 240)
        .attr('height', compact ? 140 : 180)
        .attr('x', -(compact ? 100 : 120))
        .attr('y', -(compact ? 70 : 90))

      const div = container
        .append('xhtml:div')
        .style('width', '100%')
        .style('height', '100%')

      try {
        const root = createRoot(div.node() as HTMLElement)
        nodeRootsRef.current.set(nodeData.id, root)

        root.render(
          <DepartmentNodeCard
            department={nodeData}
            compact={compact}
            onClick={onNodeClick ? () => onNodeClick(nodeData) : undefined}
          />
        )
      } catch (error) {
        console.warn('Error al renderizar nodo:', error)
      }
    })

    // Resetear vista inicial
    const initialScale = Math.min(
      width / bounds.width,
      height / bounds.height,
      1
    ) * 0.8

    const initialX = (width / 2) - ((bounds.x + bounds.width / 2) * initialScale)
    const initialY = (height / 2) - ((bounds.y + bounds.height / 2) * initialScale)

    const initialTransform = d3.zoomIdentity
      .translate(initialX, initialY)
      .scale(initialScale)

    transformRef.current = initialTransform
    svg.call(zoomRef.current.transform, initialTransform)
  }, [data, compact, nodeSpacing, levelSpacing, onNodeClick])

  // Funciones de zoom
  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(zoomRef.current.scaleBy as any, 1.3)
  }, [])

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(zoomRef.current.scaleBy as any, 1 / 1.3)
  }, [])

  const resetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !data) return
    renderChart()
  }, [data, renderChart])

  // Escuchar eventos de zoom desde el padre
  useEffect(() => {
    const handleZoomIn = () => zoomIn()
    const handleZoomOut = () => zoomOut()
    const handleReset = () => resetView()

    window.addEventListener('department-chart-zoom-in', handleZoomIn)
    window.addEventListener('department-chart-zoom-out', handleZoomOut)
    window.addEventListener('department-chart-reset', handleReset)

    return () => {
      window.removeEventListener('department-chart-zoom-in', handleZoomIn)
      window.removeEventListener('department-chart-zoom-out', handleZoomOut)
      window.removeEventListener('department-chart-reset', handleReset)
    }
  }, [zoomIn, zoomOut, resetView])

  // Efecto principal
  useEffect(() => {
    if (!data) return

    isUnmountingRef.current = false
    renderChart()

    return () => {
      isUnmountingRef.current = true
      // Limpiar con delay para evitar errores de removeChild
      setTimeout(() => {
        if (isUnmountingRef.current) {
          cleanupRoots()
        }
      }, 100)
    }
  }, [data, compact, nodeSpacing, levelSpacing, renderChart, cleanupRoots])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true
      cleanupRoots()
    }
  }, [cleanupRoots])

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        No hay departamentos para mostrar
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#f9fafb',
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'move',
        }}
      />
    </div>
  )
}

