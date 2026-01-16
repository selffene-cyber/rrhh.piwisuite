# Plan de Implementación: Módulo de Organigrama Jerárquico

## 📋 Resumen
Implementación de un sistema de organigrama jerárquico que permite definir relaciones supervisor-subordinado entre trabajadores, con visualización interactiva y gestión desde la ficha del trabajador y desde la página de organigrama.

## 🎯 Objetivos
1. Permitir definir relaciones jerárquicas (superior/subordinados) en la ficha del trabajador
2. Visualizar el organigrama completo en una página dedicada
3. Editar relaciones desde ambas ubicaciones
4. Filtrar por company_id en todas las operaciones

## 🏗️ Arquitectura

### 1. Base de Datos
**Migración SQL**: Agregar campo `superior_id` a la tabla `employees`
```sql
ALTER TABLE employees 
ADD COLUMN superior_id UUID REFERENCES employees(id) ON DELETE SET NULL;
```

**Consideraciones**:
- Auto-referencia: un empleado puede tener un superior (otro empleado)
- ON DELETE SET NULL: si se elimina el superior, el campo se pone en NULL
- Índice para mejorar performance en consultas jerárquicas

### 2. API Endpoints

#### `POST /api/organigrama/relationships`
- Crear/actualizar relación superior-subordinado
- Body: `{ employee_id, superior_id }`
- Validaciones: evitar ciclos, mismo company_id

#### `GET /api/organigrama/tree?company_id=xxx`
- Obtener árbol jerárquico completo de la empresa
- Retorna estructura tree para react-org-chart
- Filtra por company_id

#### `DELETE /api/organigrama/relationships`
- Eliminar relación (quitar superior de un empleado)
- Body: `{ employee_id }`

### 3. Componentes

#### `components/OrganigramaCard.tsx`
- Card para mostrar/editar relaciones en ficha del trabajador
- Muestra superior actual y lista de subordinados
- Botón "+ Agregar" para abrir modal de selección
- Permite eliminar relaciones

#### `components/EmployeeSelectorModal.tsx`
- Modal reutilizable para seleccionar trabajadores
- Filtra por company_id y status='active'
- Excluye al trabajador actual (no puede ser su propio superior)
- Búsqueda y filtros

#### `app/organigrama/page.tsx`
- Página principal del organigrama
- Visualización con @ctrl/react-org-chart
- Modo edición: drag & drop o selección para cambiar relaciones
- Filtros: por centro de costo, cargo, etc.

### 4. Librerías
- `@ctrl/react-org-chart`: Visualización del organigrama
- `d3`: Dependencia peer de react-org-chart

## 📝 Flujo de Implementación

### Fase 1: Base de Datos y API
1. ✅ Crear migración SQL para `superior_id`
2. ✅ Crear endpoints API
3. ✅ Validaciones y manejo de errores

### Fase 2: Componentes de Gestión
1. ✅ Crear `EmployeeSelectorModal`
2. ✅ Crear `OrganigramaCard`
3. ✅ Integrar en `EmployeeDetailSlide`

### Fase 3: Visualización
1. ✅ Instalar dependencias
2. ✅ Crear página de organigrama
3. ✅ Implementar transformación de datos a formato tree
4. ✅ Agregar funcionalidad de edición

### Fase 4: Testing y Refinamiento
1. ✅ Probar creación de relaciones
2. ✅ Validar visualización jerárquica
3. ✅ Verificar filtrado por company_id
4. ✅ Ajustes de UI/UX

## 🔒 Seguridad
- Todas las consultas filtran por `company_id`
- Validar que no se creen ciclos en la jerarquía
- RLS policies en Supabase para acceso a datos

## 📊 Estructura de Datos Tree
```typescript
interface OrgNode {
  id: string
  name: string
  position: string
  children?: OrgNode[]
}
```

## 🎨 UI/UX
- Card "Organigrama" similar a otras cards (Datos Bancarios, Remuneración, etc.)
- Modal con búsqueda y lista de trabajadores
- Organigrama interactivo con zoom y pan
- Indicadores visuales para edición

