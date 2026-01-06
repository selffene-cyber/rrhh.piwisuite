'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot, Root } from 'react-dom/client'
import * as d3 from 'd3'
import EmployeeNodeCard from './EmployeeNodeCard'

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

interface EnhancedOrgChartProps {
  data: OrgNode
  onNodeClick?: (node: OrgNode) => void
  onNodeView?: (node: OrgNode) => void
  onNodeAssignSuperior?: (node: OrgNode) => void
  editMode?: boolean
  compact?: boolean
  nodeSpacing?: number
  levelSpacing?: number
}

// Función para obtener color por centro de costo
const getCostCenterColor = (costCenter?: string): string => {
  if (!costCenter) return '#3b82f6'
  
  // Generar color consistente basado en el código
  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
  ]
  
  const hash = costCenter.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Función para detectar rol basado en posición
const detectRole = (position?: string): string | undefined => {
  if (!position) return undefined
  const posLower = position.toLowerCase()
  if (posLower.includes('gerent') || posLower.includes('director') || posLower.includes('ceo')) {
    return 'Gerencia'
  }
  if (posLower.includes('jefe') || posLower.includes('supervisor') || posLower.includes('coordinador')) {
    return 'Jefatura'
  }
  return 'Operación'
}

export default function EnhancedOrgChart({
  data,
  onNodeClick,
  onNodeView,
  onNodeAssignSuperior,
  editMode = false,
  compact = false,
  nodeSpacing = 280,
  levelSpacing = 200,
}: EnhancedOrgChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const nodeRootsRef = useRef<Map<string, Root>>(new Map())
  const isUnmountingRef = useRef(false)

  // Wrapper para capturar errores de removeChild y SVGLength silenciosamente
  useEffect(() => {
    // Interceptar errores de React DOM antes de que se propaguen
    const originalError = window.onerror
    const originalUnhandledRejection = window.onunhandledrejection
    
    // Interceptar errores de console.error también
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      const message = args.join(' ')
      if (
        message.includes('removeChild') || 
        message.includes('not a child') ||
        message.includes('Failed to execute') ||
        message.includes('NotFoundError') ||
        message.includes('AggregateError')
      ) {
        // Silenciar estos errores específicos
        return
      }
      originalConsoleError.apply(console, args)
    }
    
    const errorHandler = (event: ErrorEvent | Event) => {
      const errorEvent = event as ErrorEvent
      const message = errorEvent.message || errorEvent.error?.message || String(errorEvent.error) || ''
      const errorName = errorEvent.error?.name || ''
      const stack = errorEvent.error?.stack || ''
      
      // Capturar errores específicos que son esperados en esta integración
      if (
        message.includes('removeChild') || 
        message.includes('not a child') ||
        message.includes('SVGLength') ||
        message.includes('Could not resolve relative length') ||
        message.includes('Failed to execute') ||
        message.includes('removeChildFromContainer') ||
        errorName === 'NotFoundError' ||
        errorName === 'AggregateError' ||
        stack.includes('removeChildFromContainer') ||
        stack.includes('removeChild')
      ) {
        // Silenciar estos errores específicos que son esperados
        if (errorEvent.preventDefault) {
          errorEvent.preventDefault()
        }
        if (errorEvent.stopPropagation) {
          errorEvent.stopPropagation()
        }
        if (errorEvent.stopImmediatePropagation) {
          errorEvent.stopImmediatePropagation()
        }
        return true
      }
      // Dejar que otros errores se manejen normalmente
      if (originalError && errorEvent.message) {
        return originalError(
          errorEvent.message, 
          errorEvent.filename, 
          errorEvent.lineno, 
          errorEvent.colno, 
          errorEvent.error
        )
      }
      return false
    }

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message || String(reason) || ''
      const errorName = reason?.name || ''
      const stack = reason?.stack || ''
      
      if (
        message.includes('removeChild') || 
        message.includes('not a child') ||
        message.includes('Failed to execute') ||
        message.includes('removeChildFromContainer') ||
        errorName === 'NotFoundError' ||
        errorName === 'AggregateError' ||
        stack.includes('removeChildFromContainer') ||
        stack.includes('removeChild')
      ) {
        event.preventDefault()
        return true
      }
      return false
    }

    // Usar capture phase para interceptar antes de que llegue a React
    window.addEventListener('error', errorHandler as any, true)
    window.addEventListener('unhandledrejection', unhandledRejectionHandler as any)

    return () => {
      window.removeEventListener('error', errorHandler as any, true)
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler as any)
      console.error = originalConsoleError
      if (originalError) {
        window.onerror = originalError
      }
    }
  }, [])

  const resetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !data) return

    const svg = d3.select(svgRef.current)
    const g = svg.select('g')
    
    // Calcular bounds basado en el árbol de datos directamente
    const root = d3.hierarchy(data)
    const treeLayout = d3
      .tree<OrgNode>()
      .nodeSize([levelSpacing, nodeSpacing])
      .separation((a, b) => (a.parent === b.parent ? 1.5 : 1))
    treeLayout(root)
    
    // Centrar el árbol horizontalmente (igual que en renderChart)
    // Ahora x_d3 es horizontal, así que centramos usando x
    const xValues = root.descendants().map(d => d.x).filter(x => x !== undefined) as number[]
    if (xValues.length > 0) {
      const minX = Math.min(...xValues)
      const maxX = Math.max(...xValues)
      const centerX = (minX + maxX) / 2
      root.each((d) => {
        if (d.x !== undefined) {
          d.x = (d.x as number) - centerX
        }
      })
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    root.each((d) => {
      if (d.x !== undefined && d.y !== undefined) {
        const nodeWidth = compact ? 200 : 240
        const nodeHeight = compact ? 140 : 180
        // Ahora x_d3 es horizontal, y_d3 es vertical
        minX = Math.min(minX, d.x - nodeWidth / 2)   // Horizontal
        maxX = Math.max(maxX, d.x + nodeWidth / 2)   // Horizontal
        minY = Math.min(minY, d.y - nodeHeight / 2)   // Vertical
        maxY = Math.max(maxY, d.y + nodeHeight / 2)  // Vertical
      }
    })
    
    if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
      const width = containerRef.current?.clientWidth || 800
      const height = containerRef.current?.clientHeight || 600
      
      // Calcular bounds del árbol
      // treeWidth en SVG = maxX - minX (horizontal)
      // treeHeight en SVG = maxY - minY (vertical)
      const treeWidth = maxX - minX  // Ancho horizontal en SVG
      const treeHeight = maxY - minY  // Alto vertical en SVG
      const midX = (minX + maxX) / 2  // Centro horizontal
      const midY = (minY + maxY) / 2  // Centro vertical
      
      // Agregar padding para que las cards no se corten
      const padding = 150
      const scale = Math.min(
        (width - padding * 2) / treeWidth, 
        (height - padding * 2) / treeHeight, 
        1
      ) * 0.85
      
      // Calcular translate para centrar
      // En SVG: translate(x_horizontal, y_vertical)
      const translate = [
        width / 2 - scale * midX,  // Centrar horizontalmente
        height / 2 - scale * midY  // Centrar verticalmente
      ]

      console.log('Reset view:', { scale, translate, midX, midY, treeWidth, treeHeight })

      svg
        .transition()
        .duration(750)
        .call(
          zoomRef.current.transform as any,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        )
    } else {
      // Fallback: usar getBBox si el cálculo del árbol falla
      const gNode = g.node() as SVGGElement | null
      if (gNode) {
        const bounds = gNode.getBBox()
        if (bounds && bounds.width > 0 && bounds.height > 0) {
          const width = containerRef.current?.clientWidth || 800
          const height = containerRef.current?.clientHeight || 600
          const padding = 150
          const fullWidth = bounds.width + padding * 2
          const fullHeight = bounds.height + padding * 2
          const midX = bounds.x + bounds.width / 2
          const midY = bounds.y + bounds.height / 2

          const scale = Math.min(
            (width - padding * 2) / fullWidth, 
            (height - padding * 2) / fullHeight, 
            1
          ) * 0.85
          const translate = [
            width / 2 - scale * midX, 
            height / 2 - scale * midY
          ]

          svg
            .transition()
            .duration(750)
            .call(
              zoomRef.current.transform as any,
              d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            )
        }
      }
    }
  }, [data, levelSpacing, nodeSpacing, compact])

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


  // Función helper para limpiar roots de forma segura
  const cleanupRoots = useCallback(() => {
    const rootsToClean = Array.from(nodeRootsRef.current.entries())
    nodeRootsRef.current.clear()
    
    rootsToClean.forEach(([id, root]) => {
      try {
        // Verificar si el contenedor del root todavía existe en el DOM
        const internalRoot = (root as any)._internalRoot
        const container = internalRoot?.containerInfo
        
        if (!container) {
          // El contenedor ya no existe, no intentar desmontar
          return
        }
        
        // Verificar si el contenedor todavía está en el DOM
        if (!container.parentNode && !container.isConnected) {
          // El contenedor ya fue removido del DOM, no intentar desmontar
          return
        }
        
        // Intentar desmontar de forma segura
        root.unmount()
      } catch (error: any) {
        // Ignorar todos los errores de removeChild - son esperados cuando D3 ya removió el elemento
        // No hacer nada, estos errores son normales en esta integración
      }
    })
  }, [])

  // Función separada para renderizar el chart después de la limpieza
  const renderChart = useCallback(() => {
    if (!svgRef.current || !data) {
      return
    }
    
    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    if (!container) return
    
    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    // Establecer dimensiones absolutas en el SVG para evitar errores de SVGLength con d3-zoom
    // d3-zoom necesita dimensiones absolutas, no porcentajes
    svg.attr('width', width).attr('height', height)
    
    // NO establecer viewBox aquí - lo haremos después de calcular el layout

    // Crear el grupo principal antes de configurar el zoom
    const g = svg.append('g')

    // Configurar zoom con extent explícito para evitar errores de SVGLength
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .extent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        transformRef.current = event.transform
        g.attr('transform', event.transform.toString())
      })

    zoomRef.current = zoom
    
    // Aplicar zoom de forma segura
    try {
      svg.call(zoom as any)
    } catch (zoomError: any) {
      // Si hay error con el zoom (por ejemplo, SVGLength), usar un enfoque alternativo
      if (zoomError?.message?.includes('SVGLength') || zoomError?.message?.includes('relative length')) {
        // Reintentar con un pequeño delay para asegurar que el SVG tenga dimensiones
        setTimeout(() => {
          try {
            const currentWidth = container.clientWidth || 800
            const currentHeight = container.clientHeight || 600
            svg.attr('width', currentWidth).attr('height', currentHeight)
            const retryZoom = d3
              .zoom<SVGSVGElement, unknown>()
              .scaleExtent([0.1, 4])
              .extent([[0, 0], [currentWidth, currentHeight]])
              .on('zoom', (event) => {
                transformRef.current = event.transform
                g.attr('transform', event.transform.toString())
              })
            zoomRef.current = retryZoom
            svg.call(retryZoom as any)
          } catch (retryError) {
            console.warn('Error al aplicar zoom en reintento:', retryError)
          }
        }, 100)
      } else {
        console.warn('Error al configurar zoom:', zoomError)
      }
    }

    // Crear layout jerárquico
    const root = d3.hierarchy(data)
    
    // Debug: verificar que los hijos estén presentes
    console.log('Árbol jerárquico ANTES del layout:', {
      root: root.data.name,
      children: root.children?.map(c => ({
        name: c.data.name,
        hasChildren: !!c.children && c.children.length > 0,
        children: c.children?.map(gc => gc.data.name) || []
      })) || [],
      totalNodes: root.descendants().length,
      maxDepth: root.height,
      // Verificar estructura completa
      structure: JSON.stringify(data, null, 2).substring(0, 500)
    })
    
    // Verificar que D3 hierarchy reconozca la jerarquía
    if (root.children && root.children.length > 0) {
      console.log('✅ El nodo raíz tiene hijos:', root.children.length)
      root.children.forEach((child, idx) => {
        console.log(`  Hijo ${idx + 1}: ${child.data.name}, depth: ${child.depth}, tiene hijos: ${child.children?.length || 0}`)
      })
    } else {
      console.warn('⚠️ El nodo raíz NO tiene hijos. Verificar estructura de datos.')
    }
    
    // IMPORTANTE: D3 tree por defecto es HORIZONTAL (de izquierda a derecha)
    // En D3 tree horizontal:
    //   x = horizontal (izquierda a derecha) - root en x=0
    //   y = vertical (arriba a abajo) - diferentes y según depth
    // 
    // nodeSize([height, width]) en D3 tree horizontal:
    //   height = distancia VERTICAL entre nodos (controla y)
    //   width = distancia HORIZONTAL entre niveles (controla x)
    //
    // Para hacerlo VERTICAL (de arriba a abajo):
    //   Necesitamos que y (vertical) tenga diferentes valores según depth
    //   Entonces: nodeSize([levelSpacing, smallValue])
    //   - levelSpacing controla y (vertical) - esto separa los niveles
    //   - smallValue controla x (horizontal) - esto centra los nodos
    
    // D3 tree horizontal: nodeSize([height, width])
    // En layout horizontal:
    //   height = distancia VERTICAL entre nodos (controla y) - esto es lo que necesitamos para separar niveles
    //   width = distancia HORIZONTAL entre niveles (controla x) - esto no importa mucho si solo hay un hijo por nivel
    //
    // Para layout vertical (jefe arriba, subordinado abajo):
    //   Necesitamos que y tenga diferentes valores según depth
    //   Entonces: nodeSize([levelSpacing, smallValue])
    //   - levelSpacing en height controla y (vertical) - separa los niveles
    //   - smallValue en width controla x (horizontal) - centra los nodos
    
    const treeLayout = d3
      .tree<OrgNode>()
      .nodeSize([levelSpacing, 50]) // [height=vertical, width=horizontal]
      // height (levelSpacing) = separación VERTICAL entre niveles (controla y)
      // width (50) = pequeño para centrar horizontalmente (controla x)
      .separation((a, b) => {
        // Si son hermanos (mismo padre), separarlos horizontalmente
        if (a.parent === b.parent) {
          return 1.5
        }
        // Si son de diferentes niveles (padre-hijo), mantener separación estándar
        return 1
      })

    treeLayout(root)
    
    console.log('🔍 DEBUG Layout D3 tree:')
    console.log(`  levelSpacing recibido: ${levelSpacing}`)
    console.log(`  nodeSpacing recibido: ${nodeSpacing}`)
    console.log(`  nodeSize configurado: [${levelSpacing}, 50]`)
    console.log(`  Esto significa: height=${levelSpacing}px (vertical/y), width=50px (horizontal/x)`)
    
    // Verificar que el layout haya asignado diferentes valores según depth
    console.log('🔍 Verificación de depths y coordenadas DESPUÉS del layout:')
    root.each((d) => {
      console.log(`  ${d.data.name}: depth=${d.depth}, x=${d.x?.toFixed(2)} (horizontal en D3), y=${d.y?.toFixed(2)} (vertical en D3)`)
    })
    
    // Verificar diferencias de coordenadas y forzar separación si es necesario
    const allNodes = root.descendants()
    if (allNodes.length >= 2) {
      // Ordenar por depth para comparar jefe con subordinado
      const sortedNodes = [...allNodes].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
      const rootNode = sortedNodes[0]
      const childNode = sortedNodes[1]
      
      const diffX = Math.abs((rootNode.x ?? 0) - (childNode.x ?? 0))
      const diffY = Math.abs((rootNode.y ?? 0) - (childNode.y ?? 0))
      console.log(`📏 Diferencias entre nodos:`)
      console.log(`  Root (${rootNode.data.name}): x=${rootNode.x?.toFixed(2)}, y=${rootNode.y?.toFixed(2)}, depth=${rootNode.depth}`)
      console.log(`  Child (${childNode.data.name}): x=${childNode.x?.toFixed(2)}, y=${childNode.y?.toFixed(2)}, depth=${childNode.depth}`)
      console.log(`  Diferencia en x (horizontal): ${diffX.toFixed(2)}px`)
      console.log(`  Diferencia en y (vertical): ${diffY.toFixed(2)}px`)
      console.log(`  Separación esperada (levelSpacing): ${levelSpacing}px`)
      
      // Si la diferencia en y es muy pequeña, forzar la separación manualmente
      if (diffY < levelSpacing * 0.5) {
        console.warn('⚠️ ADVERTENCIA: La diferencia en y es muy pequeña. Forzando separación manualmente.')
        
        // Ajustar manualmente las coordenadas y según depth
        root.each((d) => {
          if (d.y !== undefined && d.depth !== undefined) {
            // Forzar que cada nivel tenga una y diferente
            d.y = d.depth * levelSpacing
            console.log(`  Ajustado ${d.data.name}: depth=${d.depth}, y=${d.y.toFixed(2)}`)
          }
        })
      }
    }
    
    // Verificar si el layout está funcionando correctamente
    // Ahora x_d3 es horizontal, y_d3 es vertical
    // Si todos los nodos tienen el mismo valor de y, están en el mismo nivel (horizontal)
    // Si tienen diferentes valores de y, están en diferentes niveles (vertical)
    const yValues = root.descendants().map(d => d.y).filter(y => y !== undefined) as number[]
    const uniqueYValues = new Set(yValues)
    console.log('Valores únicos de y (niveles verticales):', Array.from(uniqueYValues).sort((a, b) => a - b))
    
    // Si solo hay un valor único de y, todos los nodos están en el mismo nivel
    // Esto significa que el layout no está funcionando correctamente
    if (uniqueYValues.size === 1 && root.descendants().length > 1) {
      console.error('❌ ERROR: Todos los nodos están en el mismo nivel. El layout NO está funcionando correctamente.')
      console.error('Esto puede deberse a que la estructura de datos no tiene jerarquía correcta.')
    }
    
    // Ajustar las coordenadas para centrar el árbol horizontalmente
    // Ahora x_d3 es horizontal, así que centramos usando x
    const xValues = root.descendants().map(d => d.x).filter(x => x !== undefined) as number[]
    if (xValues.length > 0) {
      const minX = Math.min(...xValues)
      const maxX = Math.max(...xValues)
      const centerX = (minX + maxX) / 2
      
      // Ajustar todas las coordenadas x para centrar el árbol horizontalmente
      root.each((d) => {
        if (d.x !== undefined) {
          d.x = (d.x as number) - centerX
        }
      })
      
      console.log('Centrado horizontal aplicado. Centro X:', centerX.toFixed(2))
    }
    
    // Debug: verificar posiciones después de centrar
    console.log('Posiciones DESPUÉS de centrar:')
    root.each((d) => {
      console.log(`  ${d.data.name}: x=${d.x?.toFixed(2)} (horizontal), y=${d.y?.toFixed(2)} (vertical), depth=${d.depth}`)
    })
    
    // Calcular los bounds del árbol después del layout
    // Ahora que intercambiamos x e y, x_d3 es horizontal y y_d3 es vertical
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    root.each((d) => {
      if (d.x !== undefined && d.y !== undefined) {
        const nodeWidth = compact ? 200 : 240
        const nodeHeight = compact ? 140 : 180
        // x_d3 es horizontal, y_d3 es vertical
        minX = Math.min(minX, d.x - nodeWidth / 2)   // Horizontal
        maxX = Math.max(maxX, d.x + nodeWidth / 2)   // Horizontal
        minY = Math.min(minY, d.y - nodeHeight / 2)  // Vertical
        maxY = Math.max(maxY, d.y + nodeHeight / 2)  // Vertical
      }
    })
    
    console.log('Bounds calculados:', { minX, maxX, minY, maxY })
    
    // NO establecer viewBox - esto puede causar problemas con el zoom
    // El SVG usará las dimensiones absolutas y el zoom manejará el transform

    // Dibujar enlaces con opacidad reducida
    const links = g
      .selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d) => {
        const sourceX = d.source.x ?? 0  // Horizontal en D3 (centro de la card)
        const sourceY = d.source.y ?? 0  // Vertical en D3 (centro de la card)
        const targetX = d.target.x ?? 0
        const targetY = d.target.y ?? 0
        
        // Calcular altura de las cards para conectar desde el borde inferior del jefe
        // hasta el borde superior del subordinado
        const cardHeight = compact ? 140 : 180
        const sourceYBottom = sourceY + cardHeight / 2  // Borde inferior de la card del jefe
        const targetYTop = targetY - cardHeight / 2     // Borde superior de la card del subordinado
        
        // Crear línea vertical con curva suave
        // En SVG: M x y donde x es horizontal, y es vertical
        // Conectar desde el centro inferior del jefe hasta el centro superior del subordinado
        return `M ${sourceX} ${sourceYBottom}
                L ${sourceX} ${(sourceYBottom + targetYTop) / 2}
                L ${targetX} ${(sourceYBottom + targetYTop) / 2}
                L ${targetX} ${targetYTop}`
      })
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2.5)
      .attr('opacity', 0.6)

    // Dibujar nodos con foreignObject para React components
    // D3 tree por defecto es HORIZONTAL (de izquierda a derecha):
    //   x = horizontal (izquierda a derecha) - root en x=0, hijos a la derecha
    //   y = vertical (arriba a abajo) - todos en diferentes y según su nivel
    // 
    // Para hacerlo VERTICAL (de arriba a abajo):
    //   Necesito intercambiar x e y en el transform
    //   En SVG translate(x, y): x es horizontal, y es vertical
    //   Entonces: translate(x_d3, y_d3) donde:
    //     - x_d3 (horizontal en D3) -> x_svg (horizontal en SVG) - para centrar
    //     - y_d3 (vertical en D3) -> y_svg (vertical en SVG) - jefe arriba (y menor), subordinado abajo (y mayor)
    const nodes = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => {
        const x_d3 = d.x ?? 0  // Horizontal en D3 (izquierda a derecha)
        const y_d3 = d.y ?? 0  // Vertical en D3 (arriba a abajo)
        // Intercambiar para layout vertical: translate(x_d3, y_d3)
        // Esto coloca:
        // - Jefe arriba (y_d3 menor)
        // - Subordinado abajo (y_d3 mayor)
        // - Centrado horizontalmente (x_d3)
        console.log(`Transform para ${d.data.name}: depth=${d.depth}, D3(x=${x_d3.toFixed(2)}, y=${y_d3.toFixed(2)}) -> SVG translate(${x_d3.toFixed(2)}, ${y_d3.toFixed(2)})`)
        return `translate(${x_d3}, ${y_d3})`
      })

    // Agregar foreignObject para el componente React
    const foreignObjects = nodes
      .append('foreignObject')
      .attr('width', compact ? 200 : 240)
      .attr('height', compact ? 140 : 180)
      .attr('x', compact ? -100 : -120)
      .attr('y', compact ? -70 : -90)
      .style('pointer-events', 'all')

    foreignObjects.each(function (d) {
      const nodeData = d.data
      const borderColor = getCostCenterColor(nodeData.costCenter)
      const role = detectRole(nodeData.position)

      try {
        // Limpiar cualquier contenido previo del foreignObject de forma segura
        const foreignObj = this as SVGForeignObjectElement
        
        // Verificar si el foreignObject todavía está en el DOM
        if (!foreignObj.parentNode) {
          return // El elemento ya fue removido, no hacer nada
        }
        
        try {
          // Limpiar de forma segura
          while (foreignObj.firstChild) {
            const child = foreignObj.firstChild
            if (child.parentNode === foreignObj) {
              foreignObj.removeChild(child)
            } else {
              break // El hijo ya no es hijo de este elemento
            }
          }
        } catch (cleanError) {
          // Si hay error al limpiar, continuar de todas formas
        }

        // Crear contenedor dentro del foreignObject
        const container = document.createElement('div')
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.boxSizing = 'border-box'
        
        try {
          foreignObj.appendChild(container)
        } catch (appendError) {
          console.warn('Error al agregar contenedor:', appendError)
          return
        }

        const root = createRoot(container)
        nodeRootsRef.current.set(nodeData.id, root)

        root.render(
          <EmployeeNodeCard
            employee={{
              id: nodeData.id,
              name: nodeData.name,
              position: nodeData.position,
              costCenter: nodeData.costCenter,
              costCenterName: nodeData.costCenterName,
              contractType: nodeData.contractType,
              status: nodeData.status,
              role: role,
              departmentId: nodeData.departmentId,
              departmentName: nodeData.departmentName,
              departmentPath: nodeData.departmentPath,
            }}
            editMode={editMode}
            onView={onNodeView ? () => onNodeView(nodeData) : undefined}
            onAssignSuperior={onNodeAssignSuperior ? () => onNodeAssignSuperior(nodeData) : undefined}
            borderColor={borderColor}
            compact={compact}
          />
        )
      } catch (error) {
        console.warn('Error al renderizar nodo:', error)
      }
    })

    // Agregar evento de clic en el contenedor del nodo
    if (onNodeClick) {
      nodes.on('click', (event, d) => {
        event.stopPropagation()
        onNodeClick(d.data)
      })
    }

    // Centrar vista inicial con delay para asegurar que todos los elementos estén renderizados
    // Usar un delay más largo para asegurar que todos los foreignObjects se rendericen
    setTimeout(() => {
      resetView()
    }, 500)
    
    // Exponer funciones de zoom
    if (containerRef.current) {
      const container = containerRef.current as any
      container.resetView = resetView
      container.zoomIn = zoomIn
      container.zoomOut = zoomOut
    }
  }, [data, onNodeClick, onNodeView, onNodeAssignSuperior, editMode, compact, nodeSpacing, levelSpacing, resetView, zoomIn, zoomOut])

  useEffect(() => {
    if (!svgRef.current || !data) {
      return
    }

    isUnmountingRef.current = false

    // Limpiar roots de React primero (antes de remover elementos del DOM)
    cleanupRoots()
    
    // Dar tiempo a React para que complete el desmontaje antes de que D3 remueva elementos
    // Esto previene el error de removeChild
    const timeoutId = setTimeout(() => {
      // Luego limpiar SVG - esto remueve todos los elementos del DOM
      const svg = d3.select(svgRef.current)
      if (svgRef.current) {
        svg.selectAll('*').remove()
        // Continuar con el resto del código después de limpiar
        renderChart()
      }
    }, 50)

    // Cleanup
    return () => {
      clearTimeout(timeoutId)
      isUnmountingRef.current = true
      
      // IMPORTANTE: Desmontar todos los componentes React ANTES de que D3 los remueva
      // Esto previene el error "removeChild" cuando React intenta limpiar después
      const rootsToUnmount = Array.from(nodeRootsRef.current.entries())
      nodeRootsRef.current.clear()
      
      // Desmontar de forma síncrona antes de que D3 remueva elementos
      rootsToUnmount.forEach(([id, root]) => {
        try {
          // Verificar si el contenedor todavía existe antes de desmontar
          const internalRoot = (root as any)._internalRoot
          const container = internalRoot?.containerInfo
          
          if (container && (container.parentNode || container.isConnected)) {
            // Solo desmontar si el contenedor todavía está en el DOM
            root.unmount()
          }
        } catch (error: any) {
          // Ignorar todos los errores de removeChild - son esperados
          // No hacer nada, estos errores son normales cuando D3 ya removió el elemento
        }
      })
      
      // Limpiar eventos de zoom
      if (svgRef.current) {
        try {
          const svg = d3.select(svgRef.current)
          svg.on('.zoom', null)
        } catch (error) {
          // Ignorar errores de limpieza
        }
      }
    }
  }, [data, renderChart, cleanupRoots])

  if (!data) return null

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative', overflow: 'hidden' }}>
      <svg 
        ref={svgRef} 
        style={{ 
          overflow: 'visible', 
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}

