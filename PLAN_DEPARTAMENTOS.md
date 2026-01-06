# Plan de Implementación: Sistema de Departamentos Jerárquicos

## 📋 Resumen Ejecutivo

Implementar un sistema de Departamentos jerárquicos que permita modelar la estructura organizacional de la empresa de forma independiente a la jerarquía laboral entre trabajadores.

**Duración estimada:** 4-5 días de desarrollo
**Prioridad:** Media-Alta
**Dependencias:** Ninguna (sistema independiente)

---

## 🎯 Objetivos

1. Crear entidad `departments` con estructura jerárquica tipo árbol
2. Implementar CRUD completo de departamentos
3. Integrar departamentos en la ficha del trabajador
4. Mostrar departamentos en el organigrama sin afectar la jerarquía laboral
5. **Visualizar jerarquía de departamentos de forma independiente** (organigrama de departamentos)
6. Mantener independencia entre jerarquía de departamentos y jerarquía de personas

---

## 📦 Fase 1: Base de Datos y Migraciones

### 1.1 Crear tabla `departments`

**Archivo:** `supabase/migrations/XXXXXX_create_departments.sql`

```sql
-- Tabla de departamentos con jerarquía
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT departments_company_name_unique UNIQUE (company_id, name),
  CONSTRAINT departments_no_self_parent CHECK (id != parent_department_id)
);

-- Índices
CREATE INDEX idx_departments_company_id ON departments(company_id);
CREATE INDEX idx_departments_parent_id ON departments(parent_department_id);
CREATE INDEX idx_departments_status ON departments(status);

-- RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view departments of their company"
  ON departments FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Función para prevenir ciclos jerárquicos
CREATE OR REPLACE FUNCTION check_department_cycle()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID := NEW.id;
  parent_id UUID := NEW.parent_department_id;
BEGIN
  -- Si no tiene padre, no hay ciclo
  IF parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verificar que el padre no sea descendiente del nodo actual
  WHILE parent_id IS NOT NULL LOOP
    IF parent_id = current_id THEN
      RAISE EXCEPTION 'Ciclo jerárquico detectado: un departamento no puede ser ancestro de sí mismo';
    END IF;
    
    SELECT d.parent_department_id INTO parent_id
    FROM departments d
    WHERE d.id = parent_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_department_cycle
  BEFORE INSERT OR UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION check_department_cycle();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_timestamp
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_departments_updated_at();
```

### 1.2 Agregar `department_id` a tabla `employees`

**Archivo:** `supabase/migrations/XXXXXX_add_department_to_employees.sql`

```sql
-- Agregar columna department_id a employees
ALTER TABLE employees
ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Índice
CREATE INDEX idx_employees_department_id ON employees(department_id);

-- Comentario
COMMENT ON COLUMN employees.department_id IS 'Departamento organizacional del trabajador. No define jerarquía laboral.';
```

---

## 🔧 Fase 2: Backend - API Routes

### 2.1 API: Listar Departamentos

**Archivo:** `app/api/departments/route.ts`

**Funcionalidades:**
- GET: Listar todos los departamentos de una empresa
- POST: Crear nuevo departamento
- Validar jerarquía y prevenir ciclos
- Filtrar por status (active/inactive)

**Estructura de respuesta GET:**
```json
{
  "departments": [
    {
      "id": "uuid",
      "name": "Gerencia",
      "code": "GER",
      "status": "active",
      "parent_department_id": null,
      "parent_department": null,
      "children": [
        {
          "id": "uuid",
          "name": "Operaciones",
          "code": "OPE",
          "status": "active",
          "parent_department_id": "uuid",
          "children": []
        }
      ]
    }
  ]
}
```

### 2.2 API: CRUD Individual de Departamento

**Archivo:** `app/api/departments/[id]/route.ts`

**Funcionalidades:**
- GET: Obtener un departamento con su jerarquía completa
- PATCH: Actualizar departamento (validar ciclos al cambiar parent)
- DELETE: Eliminar departamento (soft delete cambiando status a inactive)

### 2.3 API: Árbol Jerárquico de Departamentos

**Archivo:** `app/api/departments/tree/route.ts`

**Funcionalidades:**
- GET: Retornar árbol jerárquico completo de departamentos
- Incluir contadores de trabajadores por departamento
- Filtrar por status

**Estructura de respuesta:**
```json
{
  "tree": {
    "id": "uuid",
    "name": "Gerencia",
    "employee_count": 5,
    "children": [
      {
        "id": "uuid",
        "name": "Operaciones",
        "employee_count": 12,
        "children": []
      }
    ]
  }
}
```

### 2.4 API: Árbol de Departamentos para Visualización (D3)

**Archivo:** `app/api/departments/chart/route.ts`

**Funcionalidades:**
- GET: Retornar árbol jerárquico en formato compatible con D3.js
- Estructura similar a `/api/organigrama/tree` pero para departamentos
- Incluir información completa: nombre, código, status, cantidad de empleados
- Retornar solo departamentos activos (o todos según query param)

**Estructura de respuesta (formato D3):**
```json
{
  "tree": {
    "id": "uuid",
    "name": "Gerencia",
    "code": "GER",
    "status": "active",
    "employee_count": 5,
    "children": [
      {
        "id": "uuid",
        "name": "Operaciones",
        "code": "OPE",
        "status": "active",
        "employee_count": 12,
        "children": [
          {
            "id": "uuid",
            "name": "Producción",
            "code": "PRO",
            "status": "active",
            "employee_count": 8,
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Query Parameters:**
- `status`: `'active' | 'all'` (default: `'active'`)
- `include_employees`: `boolean` (default: `false`) - Incluir lista de empleados por departamento

### 2.5 Actualizar API de Trabajadores

**Archivos a modificar:**
- `app/api/employees/route.ts` - Incluir department_id en GET y POST
- `app/api/employees/[id]/route.ts` - Incluir department_id en GET y PATCH

**Cambios:**
- Agregar `department_id` en las queries SELECT
- Validar que `department_id` pertenezca a la misma empresa
- Incluir información del departamento en las respuestas

### 2.6 Actualizar API del Organigrama

**Archivo:** `app/api/organigrama/tree/route.ts`

**Cambios:**
- Incluir `department_id` y datos del departamento en la respuesta
- Agregar `department_name` y `department_path` (ruta jerárquica completa)

---

## 🎨 Fase 3: Frontend - Componentes y Páginas

### 3.1 Página: Gestión de Departamentos

**Archivo:** `app/admin/departments/page.tsx`

**Funcionalidades:**
- Listar departamentos en formato árbol
- Botones: Crear, Editar, Activar/Desactivar
- Búsqueda y filtros (por status, por nombre)
- Vista de árbol jerárquico colapsable

**Componentes necesarios:**
- `DepartmentTreeView.tsx` - Vista de árbol
- `DepartmentFormModal.tsx` - Formulario crear/editar
- `DepartmentCard.tsx` - Card individual de departamento

### 3.2 Componente: Selector de Departamento

**Archivo:** `components/DepartmentSelector.tsx`

**Funcionalidades:**
- Dropdown con departamentos activos
- Mostrar jerarquía en el dropdown (ej: "Gerencia > Operaciones")
- Filtrar por empresa
- Validación: solo departamentos activos

**Props:**
```typescript
interface DepartmentSelectorProps {
  companyId: string
  value?: string
  onChange: (departmentId: string | null) => void
  disabled?: boolean
  placeholder?: string
}
```

### 3.3 Actualizar Ficha del Trabajador

**Archivo:** `app/employees/[id]/page.tsx`

**Cambios:**
- Agregar campo "Departamento" después del campo "Cargo"
- Usar `DepartmentSelector` component
- Guardar `department_id` al actualizar trabajador
- Mostrar departamento actual en modo lectura

### 3.4 Actualizar Formulario de Trabajador

**Archivo:** `app/employees/new/page.tsx` y `app/employees/[id]/edit/page.tsx`

**Cambios:**
- Agregar campo "Departamento" en el formulario
- Validar que el departamento pertenezca a la empresa
- Incluir en el payload al crear/actualizar

### 3.5 Actualizar Organigrama

**Archivo:** `components/EnhancedOrgChart.tsx` y `components/EmployeeNodeCard.tsx`

**Cambios:**
- Mostrar pill con nombre del departamento
- Opcional: Mostrar ruta jerárquica completa (ej: "Gerencia / Operaciones")
- Color de la pill basado en departamento (similar a cost center)
- No afectar la posición en el árbol (solo visual)

**Actualizar `EmployeeNodeCard.tsx`:**
```typescript
// Agregar prop
department?: {
  id: string
  name: string
  path?: string // Ruta jerárquica completa
}

// Mostrar en la card
{department && (
  <span className="department-pill">
    {department.path || department.name}
  </span>
)}
```

### 3.6 Página: Organigrama de Departamentos

**Archivo:** `app/departments/chart/page.tsx`

**Funcionalidades:**
- Visualización jerárquica de departamentos usando D3.js
- Similar al organigrama de trabajadores pero solo muestra departamentos
- Mostrar información de cada departamento: nombre, código, cantidad de empleados
- Zoom y pan
- Botones de control: zoom in, zoom out, reset view
- Filtro por status (activos/todos)

**Componentes necesarios:**
- `DepartmentChart.tsx` - Componente principal del organigrama de departamentos
- `DepartmentNodeCard.tsx` - Card individual de departamento en el organigrama

**Estructura de la página:**
```typescript
export default function DepartmentChartPage() {
  const [tree, setTree] = useState<DepartmentTreeNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active')
  
  // Fetch data from /api/departments/chart
  // Render DepartmentChart component
}
```

### 3.7 Componente: Organigrama de Departamentos

**Archivo:** `components/DepartmentChart.tsx`

**Funcionalidades:**
- Usar D3.js para renderizar árbol jerárquico de departamentos
- Similar a `EnhancedOrgChart.tsx` pero adaptado para departamentos
- Mostrar cards de departamentos con:
  - Nombre del departamento
  - Código (si existe)
  - Cantidad de empleados
  - Status (badge visual)
- Líneas de conexión entre departamentos padre-hijo
- Zoom y pan interactivos
- Botones de control de zoom

**Props:**
```typescript
interface DepartmentChartProps {
  data: DepartmentTreeNode
  onNodeClick?: (department: Department) => void
  compact?: boolean
  nodeSpacing?: number
  levelSpacing?: number
}
```

**Características:**
- Layout vertical (top-down) igual que el organigrama de trabajadores
- Cards más simples que las de trabajadores (solo info de departamento)
- Colores diferentes por nivel de jerarquía (opcional)
- Tooltip con información adicional al hacer hover

### 3.8 Componente: Card de Departamento en Organigrama

**Archivo:** `components/DepartmentNodeCard.tsx`

**Funcionalidades:**
- Renderizar card visual de un departamento en el organigrama
- Mostrar información esencial: nombre, código, cantidad de empleados
- Indicador visual de status (activo/inactivo)
- Estilo consistente con el diseño del sistema

**Props:**
```typescript
interface DepartmentNodeCardProps {
  department: {
    id: string
    name: string
    code?: string
    status: 'active' | 'inactive'
    employee_count: number
  }
  compact?: boolean
  onClick?: () => void
}
```

**Diseño de la card:**
- Header con nombre del departamento (destacado)
- Código del departamento (si existe, más pequeño)
- Badge con cantidad de empleados
- Badge de status (verde para activo, gris para inactivo)
- Borde según nivel jerárquico (opcional)

### 3.9 Actualizar Menú/Navegación

**Archivo:** `components/Layout.tsx`

**Cambios:**
- Agregar opción "Organigrama de Departamentos" en el menú
- Ubicación sugerida: bajo "Organización" o como sub-item de "Departamentos"
- Ruta: `/departments/chart`

**Estructura sugerida:**
```
Organización
  ├── Organigrama (trabajadores)
  ├── Organigrama de Departamentos (nuevo)
  └── Banco de Documentos
```

---

## 🔄 Fase 4: Integración y Actualización de Datos

### 4.1 Script de Migración de Datos Existentes

**Archivo:** `scripts/migrate_departments.ts` o SQL directo

**Funcionalidades:**
- Crear departamentos base basados en datos existentes
- Asignar trabajadores a departamentos según:
  - Campo `position` (detectar "Gerente", "Jefe", etc.)
  - Centro de costo
  - O manualmente

**Estrategia sugerida:**
1. Analizar posiciones únicas en la BD
2. Crear departamentos sugeridos
3. Asignar automáticamente cuando sea posible
4. Dejar pendientes para asignación manual

### 4.2 Actualizar Tipos TypeScript

**Archivo:** `types/index.ts`

**Agregar:**
```typescript
export type Department = {
  id: string
  company_id: string
  name: string
  code?: string
  status: 'active' | 'inactive'
  parent_department_id?: string
  parent_department?: Department
  children?: Department[]
  created_at: string
  updated_at: string
}

export type DepartmentTreeNode = {
  id: string
  name: string
  code?: string
  status: 'active' | 'inactive'
  employee_count: number
  children?: DepartmentTreeNode[]
}

export type Employee = {
  // ... campos existentes
  department_id?: string
  department?: Department
}
```

---

## 🧪 Fase 5: Testing y Validación

### 5.1 Casos de Prueba

**Base de Datos:**
- ✅ Crear departamento sin padre
- ✅ Crear departamento con padre válido
- ✅ Intentar crear ciclo jerárquico (debe fallar)
- ✅ Desactivar departamento con hijos
- ✅ Eliminar departamento (soft delete)

**API:**
- ✅ Listar departamentos por empresa
- ✅ Crear departamento con validaciones
- ✅ Actualizar jerarquía sin crear ciclos
- ✅ Obtener árbol jerárquico completo

**Frontend:**
- ✅ Mostrar departamentos en dropdown
- ✅ Asignar departamento a trabajador
- ✅ Mostrar departamento en organigrama de trabajadores
- ✅ Gestión completa de departamentos
- ✅ Visualizar organigrama de departamentos
- ✅ Interactividad en organigrama de departamentos (zoom, pan, click)
- ✅ Filtros en organigrama de departamentos (activos/todos)

### 5.2 Validaciones Críticas

1. **Prevenir ciclos jerárquicos:**
   - Un departamento no puede ser padre de sí mismo
   - Un departamento no puede ser ancestro de su propio padre

2. **Integridad de datos:**
   - Solo asignar departamentos activos a trabajadores
   - Validar que departamento pertenezca a la empresa del trabajador

3. **RLS:**
   - Usuarios solo ven departamentos de sus empresas
   - Super admins pueden gestionar todos

---

## 📝 Fase 6: Documentación

### 6.1 Documentación Técnica

- Actualizar `MANUAL_COMPLETO.md` con sección de Departamentos
- Documentar estructura de la tabla `departments`
- Explicar diferencia entre jerarquía de departamentos y jerarquía laboral

### 6.2 Guía de Usuario

- Cómo crear y gestionar departamentos
- Cómo asignar departamentos a trabajadores
- Cómo interpretar departamentos en el organigrama

---

## 🚀 Orden de Implementación Recomendado

### Día 1: Base de Datos
1. ✅ Crear migración de tabla `departments`
2. ✅ Crear migración para agregar `department_id` a `employees`
3. ✅ Probar migraciones en desarrollo
4. ✅ Verificar RLS y constraints

### Día 2: Backend
1. ✅ Crear API routes de departamentos (CRUD)
2. ✅ Crear API de árbol jerárquico (`/api/departments/tree`)
3. ✅ Crear API de organigrama de departamentos (`/api/departments/chart`)
4. ✅ Actualizar APIs de trabajadores
5. ✅ Actualizar API del organigrama
6. ✅ Probar todas las APIs

### Día 3: Frontend - Gestión
1. ✅ Crear página de gestión de departamentos
2. ✅ Crear componentes de árbol y formularios
3. ✅ Crear `DepartmentSelector` component
4. ✅ Integrar en ficha del trabajador
5. ✅ Probar flujo completo

### Día 4: Frontend - Visualización en Organigrama de Trabajadores
1. ✅ Actualizar `EmployeeNodeCard` para mostrar departamento
2. ✅ Actualizar organigrama para incluir departamentos
3. ✅ Probar visualización

### Día 5: Frontend - Organigrama de Departamentos
1. ✅ Crear página `/departments/chart`
2. ✅ Crear componente `DepartmentChart.tsx` (usando D3.js)
3. ✅ Crear componente `DepartmentNodeCard.tsx`
4. ✅ Agregar al menú de navegación
5. ✅ Testing completo del organigrama de departamentos
6. ✅ Script de migración de datos (opcional)
7. ✅ Documentación

---

## 📋 Checklist de Implementación

### Base de Datos
- [ ] Migración: tabla `departments`
- [ ] Migración: `department_id` en `employees`
- [ ] RLS policies configuradas
- [ ] Función de prevención de ciclos
- [ ] Índices creados
- [ ] Triggers configurados

### Backend
- [ ] API: GET `/api/departments`
- [ ] API: POST `/api/departments`
- [ ] API: GET `/api/departments/[id]`
- [ ] API: PATCH `/api/departments/[id]`
- [ ] API: DELETE `/api/departments/[id]` (soft delete)
- [ ] API: GET `/api/departments/tree`
- [ ] API: GET `/api/departments/chart` (para organigrama D3)
- [ ] Actualizar API de trabajadores
- [ ] Actualizar API del organigrama

### Frontend - Gestión
- [ ] Página: `/admin/departments`
- [ ] Componente: `DepartmentTreeView`
- [ ] Componente: `DepartmentFormModal`
- [ ] Componente: `DepartmentCard`
- [ ] Componente: `DepartmentSelector`
- [ ] Integrar en ficha del trabajador
- [ ] Integrar en formularios de trabajador

### Frontend - Visualización en Organigrama de Trabajadores
- [ ] Actualizar `EmployeeNodeCard` con departamento
- [ ] Actualizar organigrama para mostrar departamentos
- [ ] Estilos para pills de departamento
- [ ] Mostrar ruta jerárquica (opcional)

### Frontend - Organigrama de Departamentos
- [ ] Página: `/departments/chart`
- [ ] Componente: `DepartmentChart.tsx` (D3.js)
- [ ] Componente: `DepartmentNodeCard.tsx`
- [ ] Funcionalidad de zoom y pan
- [ ] Botones de control de zoom
- [ ] Filtro por status (activos/todos)
- [ ] Agregar al menú de navegación
- [ ] Estilos y diseño consistente

### Testing y Documentación
- [ ] Testing de casos críticos
- [ ] Validación de prevención de ciclos
- [ ] Actualizar documentación técnica
- [ ] Crear guía de usuario

---

## 🔍 Consideraciones Importantes

### Separación de Conceptos
- **Jerarquía de Departamentos:** Estructura organizacional formal
- **Jerarquía Laboral:** Relación superior-subordinado entre personas
- **Estas dos jerarquías son independientes**

### Escalabilidad
- El sistema debe soportar múltiples niveles de jerarquía
- Considerar límite práctico (ej: máximo 10 niveles)
- Optimizar queries para árboles grandes

### Performance
- Usar índices en `parent_department_id`
- Cachear árbol de departamentos si es necesario
- Lazy loading en vista de árbol si hay muchos departamentos

### UX
- Mostrar ruta jerárquica completa en tooltips
- Colores distintos por departamento en organigrama de trabajadores
- **Organigrama de departamentos separado** para visualizar estructura organizacional
- Filtros por departamento en listados de trabajadores (futuro)
- Navegación clara entre organigrama de trabajadores y organigrama de departamentos

---

## 🎯 Resultado Esperado

Al finalizar la implementación:

1. ✅ Existe tabla `departments` con jerarquía funcional
2. ✅ Se pueden crear y gestionar departamentos desde la UI
3. ✅ Los trabajadores tienen campo "Departamento" en su ficha
4. ✅ El organigrama de trabajadores muestra el departamento de cada trabajador
5. ✅ **Existe un organigrama visual de departamentos independiente** (`/departments/chart`)
6. ✅ El organigrama de departamentos muestra la jerarquía organizacional completa
7. ✅ La jerarquía de departamentos es independiente de la jerarquía laboral
8. ✅ El sistema previene ciclos jerárquicos
9. ✅ RLS está configurado correctamente

---

## 📚 Referencias y Notas

- La jerarquía de departamentos es **organizacional**, no de autoridad
- Un trabajador puede tener un superior de otro departamento
- Los departamentos pueden usarse para reporting y filtros futuros
- Considerar permisos por departamento en el futuro

