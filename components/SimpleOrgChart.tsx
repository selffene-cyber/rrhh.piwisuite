'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface OrgNode {
  id: string
  name: string
  position: string
  children?: OrgNode[]
}

interface SimpleOrgChartProps {
  data: OrgNode
  onNodeClick?: (node: OrgNode) => void
  NodeComponent?: React.ComponentType<{ node: OrgNode }>
}

export default function SimpleOrgChart({ data, onNodeClick, NodeComponent }: SimpleOrgChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data) return

    // Limpiar SVG anterior
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
    const width = containerRef.current?.clientWidth || 800
    const height = containerRef.current?.clientHeight || 600

    // Configurar zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })

    svg.call(zoom as any)

    const g = svg.append('g')

    // Crear layout jerárquico
    const root = d3.hierarchy(data)
    const treeLayout = d3.tree<OrgNode>().size([height - 100, width - 200])

    treeLayout(root)

    // Dibujar enlaces
    const links = g
      .selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d) => {
        const sourceX = d.source.x ?? 0
        const sourceY = d.source.y ?? 0
        const targetX = d.target.x ?? 0
        const targetY = d.target.y ?? 0
        return `M ${sourceY + 100} ${sourceX + 50}
                C ${(sourceY + targetY) / 2 + 100} ${sourceX + 50},
                  ${(sourceY + targetY) / 2 + 100} ${targetX + 50},
                  ${targetY + 100} ${targetX + 50}`
      })
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)

    // Dibujar nodos
    const nodes = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${(d.y ?? 0) + 100},${(d.x ?? 0) + 50})`)
      .style('cursor', onNodeClick ? 'pointer' : 'default')

    // Agregar rectángulo de fondo para el nodo
    nodes
      .append('rect')
      .attr('x', -100)
      .attr('y', -30)
      .attr('width', 200)
      .attr('height', 60)
      .attr('rx', 8)
      .attr('fill', '#ffffff')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')

    // Agregar contenido del nodo
    const nodeGroups = nodes.append('g').attr('transform', 'translate(0, 0)')

    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -8)
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('fill', '#111827')
      .text((d) => d.data.name)

    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 12)
      .attr('font-size', '12px')
      .attr('fill', '#6b7280')
      .text((d) => d.data.position || 'Sin cargo')

    // Agregar evento de clic
    if (onNodeClick) {
      nodes.on('click', (event, d) => {
        onNodeClick(d.data)
      })
    }

    // Centrar la vista
    const bounds = g.node()?.getBBox()
    if (bounds) {
      const fullWidth = bounds.width
      const fullHeight = bounds.height
      const midX = bounds.x + fullWidth / 2
      const midY = bounds.y + fullHeight / 2

      const scale = Math.min(width / fullWidth, height / fullHeight, 1) * 0.8
      const translate = [width / 2 - scale * midX, height / 2 - scale * midY]

      svg
        .transition()
        .duration(750)
        .call(
          zoom.transform as any,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        )
    }

    // Cleanup
    return () => {
      svg.on('.zoom', null)
    }
  }, [data, onNodeClick])

  if (!data) return null

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <svg ref={svgRef} width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
          </marker>
        </defs>
      </svg>
    </div>
  )
}

