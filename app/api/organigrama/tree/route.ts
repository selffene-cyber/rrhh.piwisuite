import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

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

// GET: Obtener árbol jerárquico completo de la empresa
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')

    if (!company_id) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener todos los empleados activos de la empresa con información completa
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        full_name,
        position,
        superior_id,
        status,
        contract_type,
        department_id,
        cost_centers (
          id,
          code,
          name
        )
      `)
      .eq('company_id', company_id)
      .order('full_name')

    if (error) throw error

    if (!employees || employees.length === 0) {
      return NextResponse.json({ tree: null, employees: [] }, { status: 200 })
    }

    // Obtener todos los departamentos para construir el mapa
    const { data: allDepartments } = await supabase
      .from('departments')
      .select('id, name, parent_department_id')
      .eq('company_id', company_id)

    const departmentMap = new Map<string, any>()
    allDepartments?.forEach((dept: any) => {
      departmentMap.set(dept.id, dept)
    })
    
    // Debug: Log de departamentos cargados
    console.log('📋 Departamentos cargados:', allDepartments?.map(d => ({ id: d.id, name: d.name })))

    // Función helper para obtener ruta jerárquica del departamento (síncrona)
    const getDepartmentPath = (deptId: string | null, deptMap: Map<string, any>): string[] => {
      if (!deptId) return []
      const path: string[] = []
      let currentId: string | null = deptId
      const visited = new Set<string>()

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const dept = deptMap.get(currentId)
        if (!dept) break
        path.unshift(dept.name)
        currentId = dept.parent_department_id || null
      }
      return path
    }

    // Construir mapa de empleados por ID
    const employeeMap = new Map<string, any>()
    employees.forEach((emp: any) => {
      const departmentPath = emp.department_id 
        ? getDepartmentPath(emp.department_id, departmentMap)
        : []
      
      // Obtener el departamento del mapa si existe department_id
      const department = emp.department_id ? departmentMap.get(emp.department_id) : null
      
      // Debug: Log para verificar datos del departamento
      if (emp.full_name?.includes('Meybol') || emp.full_name?.includes('Prevención')) {
        console.log('🔍 Debug departamento para:', emp.full_name, {
          department_id: emp.department_id,
          department: department,
          departmentName: department?.name,
          departmentPath: departmentPath,
          allDepartmentsCount: allDepartments?.length,
        })
      }
      
      employeeMap.set(emp.id, {
        id: emp.id,
        name: emp.full_name,
        position: emp.position,
        superior_id: emp.superior_id,
        status: emp.status,
        contractType: emp.contract_type,
        costCenter: emp.cost_centers?.code,
        costCenterName: emp.cost_centers?.name,
        departmentId: emp.department_id,
        departmentName: department?.name || null,
        departmentPath: departmentPath,
        children: [],
      })
    })

    // Construir árbol jerárquico
    const roots: OrgNode[] = []
    const processed = new Set<string>()

    employees.forEach((emp: any) => {
      const node = employeeMap.get(emp.id)!
      
      if (!emp.superior_id || !employeeMap.has(emp.superior_id)) {
        // Es un nodo raíz (sin superior o superior no encontrado)
        // NO evaluar children aquí - se hará después cuando todos los nodos estén procesados
        roots.push(node)
      } else {
        // Tiene superior, agregarlo como hijo
        const parent = employeeMap.get(emp.superior_id)!
        parent.children.push(node)
      }
    })
    
    // Función helper para convertir el mapa a estructura de árbol
    const mapToTree = (node: any): OrgNode => {
      return {
        id: node.id,
        name: node.name,
        position: node.position,
        status: node.status,
        contractType: node.contractType,
        costCenter: node.costCenter,
        costCenterName: node.costCenterName,
        departmentId: node.departmentId,
        departmentName: node.departmentName,
        departmentPath: node.departmentPath && node.departmentPath.length > 0 
          ? node.departmentPath.join(' / ') 
          : undefined,
        children: node.children && node.children.length > 0 
          ? node.children.map(mapToTree) 
          : undefined,
      }
    }
    
    // Convertir los roots a la estructura final
    const treeRoots = roots.map(mapToTree)

    // Si hay un solo nodo raíz, retornarlo directamente
    // Si hay múltiples raíces, crear un nodo raíz virtual
    const tree = treeRoots.length === 1 
      ? treeRoots[0]
      : treeRoots.length > 1
      ? {
          id: 'root',
          name: 'Organización',
          position: 'Raíz',
          children: treeRoots,
        }
      : null

    // Debug: verificar estructura del árbol antes de retornar
    if (tree) {
      console.log('Árbol construido:', {
        root: tree.name,
        hasChildren: !!tree.children && tree.children.length > 0,
        childrenCount: tree.children?.length || 0,
        children: tree.children?.map(c => ({
          name: c.name,
          hasChildren: !!c.children && c.children.length > 0,
          childrenCount: c.children?.length || 0
        })) || []
      })
    }

    return NextResponse.json({ tree, employees }, { status: 200 })
  } catch (error: any) {
    console.error('Error al obtener árbol jerárquico:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener árbol jerárquico' },
      { status: 500 }
    )
  }
}

