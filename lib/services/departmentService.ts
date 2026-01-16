import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export interface Department {
  id: string
  company_id: string
  name: string
  code?: string
  status: 'active' | 'inactive'
  parent_department_id?: string
  created_at: string
  updated_at: string
}

export interface DepartmentWithChildren extends Department {
  parent_department?: Department
  children?: DepartmentWithChildren[]
  employee_count?: number
}

export interface DepartmentTreeNode {
  id: string
  name: string
  code?: string
  status: 'active' | 'inactive'
  employee_count: number
  children?: DepartmentTreeNode[]
}

// Obtener todos los departamentos de una empresa
export async function getDepartments(
  companyId: string,
  supabase: SupabaseClient<Database>,
  filters?: {
    status?: 'active' | 'inactive' | 'all'
    parent_id?: string | null
  }
): Promise<DepartmentWithChildren[]> {
  let query = supabase
    .from('departments')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.parent_id !== undefined) {
    if (filters.parent_id === null) {
      query = query.is('parent_department_id', null)
    } else {
      query = query.eq('parent_department_id', filters.parent_id)
    }
  }

  const { data, error } = await query

  if (error) throw error
  
  // Construir relaciones parent_department manualmente
  const departments = data || []
  const departmentMap = new Map<string, Department>()
  departments.forEach((dept: Department) => {
    departmentMap.set(dept.id, dept)
  })
  
  // Agregar parent_department a cada departamento
  const departmentsWithParent: DepartmentWithChildren[] = departments.map((dept: Department) => ({
    ...dept,
    parent_department: dept.parent_department_id ? departmentMap.get(dept.parent_department_id) : undefined,
  }))
  
  return departmentsWithParent
}

// Obtener un departamento por ID
export async function getDepartment(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<DepartmentWithChildren | null> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No encontrado
    throw error
  }
  
  if (!data) return null
  
  const department = data as Department
  
  // Si tiene parent_department_id, obtener el parent
  let parentDepartment: Department | undefined
  if (department.parent_department_id) {
    const { data: parent } = await supabase
      .from('departments')
      .select('*')
      .eq('id', department.parent_department_id)
      .single()
    parentDepartment = parent ? (parent as Department) : undefined
  }
  
  return {
    ...department,
    parent_department: parentDepartment,
  }
}

// Crear un nuevo departamento
export async function createDepartment(
  department: Omit<Department, 'id' | 'created_at' | 'updated_at'>,
  supabase: SupabaseClient<Database>
): Promise<Department> {
  // Validar que el nombre sea único en la empresa
  const existing = await supabase
    .from('departments')
    .select('id')
    .eq('company_id', department.company_id)
    .eq('name', department.name)
    .single()

  if (existing.data) {
    throw new Error('Ya existe un departamento con ese nombre en la empresa')
  }

  // Validar que el parent_department_id pertenezca a la misma empresa (si existe)
  if (department.parent_department_id) {
    const { data: parentData, error: parentError } = await supabase
      .from('departments')
      .select('company_id')
      .eq('id', department.parent_department_id)
      .single()

    if (parentError || !parentData) {
      throw new Error('El departamento padre no existe')
    }

    const parent = parentData as { company_id: string }
    if (parent.company_id !== department.company_id) {
      throw new Error('El departamento padre debe pertenecer a la misma empresa')
    }
  }

  const { data, error } = await (supabase as any)
    .from('departments')
    .insert(department)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('No se pudo crear el departamento')
  return data as Department
}

// Actualizar un departamento
export async function updateDepartment(
  id: string,
  updates: Partial<Omit<Department, 'id' | 'company_id' | 'created_at' | 'updated_at'>>,
  supabase: SupabaseClient<Database>
): Promise<Department> {
  // Si se está cambiando el nombre, validar que sea único
  if (updates.name) {
    const current = await getDepartment(id, supabase)
    if (!current) {
      throw new Error('Departamento no encontrado')
    }

    const existing = await supabase
      .from('departments')
      .select('id')
      .eq('company_id', current.company_id)
      .eq('name', updates.name)
      .neq('id', id)
      .single()

    if (existing.data) {
      throw new Error('Ya existe un departamento con ese nombre en la empresa')
    }
  }

  // Si se está cambiando el parent_department_id, validar
  if (updates.parent_department_id !== undefined) {
    const current = await getDepartment(id, supabase)
    if (!current) {
      throw new Error('Departamento no encontrado')
    }

    // No puede ser padre de sí mismo (ya está validado en la BD, pero validamos aquí también)
    if (updates.parent_department_id === id) {
      throw new Error('Un departamento no puede ser padre de sí mismo')
    }

    // Si tiene un nuevo padre, validar que pertenezca a la misma empresa
    if (updates.parent_department_id) {
      const { data: parentData, error: parentError } = await supabase
        .from('departments')
        .select('company_id')
        .eq('id', updates.parent_department_id)
        .single()

      if (parentError || !parentData) {
        throw new Error('El departamento padre no existe')
      }

      const parentDept = parentData as { company_id: string }
      if (parentDept.company_id !== current.company_id) {
        throw new Error('El departamento padre debe pertenecer a la misma empresa')
      }
    }
  }

  const { data, error } = await (supabase as any)
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('No se pudo actualizar el departamento')
  return data as Department
}

// Eliminar (desactivar) un departamento
export async function deleteDepartment(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  // Soft delete: cambiar status a inactive
  const { error } = await (supabase as any)
    .from('departments')
    .update({ status: 'inactive' })
    .eq('id', id)

  if (error) throw error
}

// Construir árbol jerárquico de departamentos
export async function getDepartmentTree(
  companyId: string,
  supabase: SupabaseClient<Database>,
  options?: {
    status?: 'active' | 'inactive' | 'all'
    includeEmployeeCount?: boolean
  }
): Promise<DepartmentTreeNode | null> {
  // Obtener todos los departamentos
  const departments = await getDepartments(companyId, supabase, {
    status: options?.status || 'all',
  })

  if (departments.length === 0) {
    return null
  }

  // Obtener conteo de empleados por departamento si se solicita
  let employeeCounts: Record<string, number> = {}
  if (options?.includeEmployeeCount) {
    const { data: employees } = await supabase
      .from('employees')
      .select('department_id')
      .eq('company_id', companyId)
      .not('department_id', 'is', null)

    if (employees) {
      employees.forEach((emp: any) => {
        if (emp.department_id) {
          employeeCounts[emp.department_id] = (employeeCounts[emp.department_id] || 0) + 1
        }
      })
    }
  }

  // Construir mapa de departamentos
  const departmentMap = new Map<string, DepartmentTreeNode>()
  const roots: DepartmentTreeNode[] = []

  // Crear nodos
  departments.forEach((dept) => {
    const node: DepartmentTreeNode = {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      status: dept.status,
      employee_count: employeeCounts[dept.id] || 0,
      children: [],
    }
    departmentMap.set(dept.id, node)
  })

  // Construir jerarquía
  departments.forEach((dept) => {
    const node = departmentMap.get(dept.id)!
    if (!dept.parent_department_id || !departmentMap.has(dept.parent_department_id)) {
      // Es un nodo raíz
      roots.push(node)
    } else {
      // Tiene padre
      const parent = departmentMap.get(dept.parent_department_id)!
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(node)
    }
  })

  // Si hay un solo nodo raíz, retornarlo
  // Si hay múltiples, crear un nodo raíz virtual
  if (roots.length === 1) {
    return roots[0]
  } else if (roots.length > 1) {
    return {
      id: 'root',
      name: 'Organización',
      code: 'ORG',
      status: 'active',
      employee_count: roots.reduce((sum, r) => sum + (r.employee_count || 0), 0),
      children: roots,
    }
  }

  return null
}

// Obtener ruta jerárquica completa de un departamento (ej: "Gerencia / Operaciones / Producción")
export async function getDepartmentPath(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<string[]> {
  const path: string[] = []
  let currentId: string | null = id

  while (currentId) {
    const dept = await getDepartment(currentId, supabase)
    if (!dept) break

    path.unshift(dept.name)
    currentId = dept.parent_department_id || null
  }

  return path
}

