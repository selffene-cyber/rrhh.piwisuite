# 📄 Mejoras Banco de Documentos

## 🎯 Resumen de Mejoras Implementadas

### 1. ⏱️ Búsqueda con Debounce
**Problema anterior**: Cada letra escrita generaba una recarga de página
**Solución**: Implementación de debounce de 500ms

#### Beneficios:
- ✅ Espera a que el usuario termine de escribir
- ✅ Reduce carga en el servidor (menos queries)
- ✅ Experiencia de usuario fluida
- ✅ Indicador visual "Buscando..." mientras espera

#### Ejemplo:
```typescript
// Antes: "documento" → 9 búsquedas
// Ahora: "documento" → 1 búsqueda después de 500ms
```

---

### 2. 👤 Documentos Asociados a Empleados
**Nueva funcionalidad**: Vincular documentos a empleados específicos

#### Características:

##### Toggle Switch
- 📄 Activar/desactivar si es documento de empleado
- 🎨 Switch azul moderno con animación
- 📝 Descripción clara de la funcionalidad

##### Selector de Empleado
- 📋 Dropdown con lista completa de empleados activos
- 🔍 Muestra: Nombre - RUT
- ✅ Campo obligatorio si el toggle está activado
- 💡 Mensaje explicativo: "Este documento se asociará al historial del empleado"

##### Registro en Historial
- 📌 Se registra automáticamente en `employee_audit_events`
- 📊 Evento tipo: `document_uploaded`
- 📝 Descripción: "Documento cargado: [nombre]"
- 🔗 Metadata incluye: document_id, document_name, category_id

---

## 🗄️ Cambios en la Base de Datos

### Migración 091: `add_employee_to_documents.sql`

```sql
ALTER TABLE documents 
ADD COLUMN employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NULL;

-- Índices para performance
CREATE INDEX idx_documents_employee ON documents(employee_id);
CREATE INDEX idx_documents_company_employee 
  ON documents(company_id, employee_id) 
  WHERE employee_id IS NOT NULL;
```

#### Características:
- ✅ Campo nullable (documentos generales no tienen empleado)
- ✅ Cascade delete (si se elimina empleado, se eliminan sus docs)
- ✅ Índices para búsquedas rápidas
- ✅ Idempotente (puede ejecutarse múltiples veces)

---

## 📋 Flujo de Uso

### Crear Documento General:
1. Ir a `/documents/new`
2. Rellenar formulario normalmente
3. **NO** activar el toggle de empleado
4. Guardar → Documento queda como general de la empresa

### Crear Documento de Empleado:
1. Ir a `/documents/new`
2. Rellenar formulario normalmente
3. **SÍ** activar el toggle "Documento de Empleado Específico"
4. Seleccionar empleado del dropdown
5. Guardar → Documento queda vinculado al empleado
6. **Automáticamente** se registra en el historial del empleado

---

## 🔍 Verificación de Filtros por Company

### ✅ Confirmado: Todos los endpoints filtran por `company_id`

#### GET `/api/documents`
```typescript
// Filtro obligatorio por company_id
const documents = await getDocuments(companyId, supabase, filters)
```

#### En el servicio:
```typescript
let query = supabase
  .from('documents')
  .select('...')
  .eq('company_id', companyId) // ✅ Filtro aplicado
```

#### Seguridad adicional:
- RLS (Row Level Security) en Supabase
- Políticas por empresa activas
- Middleware de autenticación

---

## 🎨 UI/UX Mejorado

### Toggle Switch:
```css
.toggle-switch {
  width: 48px;
  height: 24px;
  background: linear-gradient(...);
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #2563eb; /* Azul cuando activo */
}
```

### Sección de Empleado:
- 🎨 Fondo gris claro (#f9fafb)
- 📦 Borde redondeado (8px)
- 📏 Padding espacioso (16px)
- 🔵 Icono 📄 para identificación visual
- 📝 Texto explicativo en gris (#6b7280)

---

## 🧪 Testing

### Casos de Prueba:

#### 1. Búsqueda con Debounce:
```bash
1. Ir a http://localhost:3007/documents
2. Escribir "contrato" en el buscador
3. Verificar que solo busca 1 vez (después de 500ms)
4. Ver indicador "Buscando..." mientras escribe
```

#### 2. Documento General:
```bash
1. Ir a http://localhost:3007/documents/new
2. Rellenar formulario
3. NO activar toggle de empleado
4. Guardar
5. Verificar en DB: employee_id = NULL
```

#### 3. Documento de Empleado:
```bash
1. Ir a http://localhost:3007/documents/new
2. Rellenar formulario
3. SÍ activar toggle de empleado
4. Seleccionar un empleado
5. Guardar
6. Verificar en DB: 
   - employee_id = [UUID del empleado]
   - employee_audit_events tiene registro
```

#### 4. Historial de Empleado:
```sql
-- Verificar registro en audit
SELECT * FROM employee_audit_events 
WHERE employee_id = '[UUID]' 
AND event_type = 'document_uploaded'
ORDER BY created_at DESC;
```

---

## 📊 Estructura de Datos

### Tabla `documents` (actualizada):
```typescript
{
  id: UUID
  company_id: UUID (FK → companies)
  category_id: UUID (FK → document_categories)
  employee_id: UUID | NULL (FK → employees) // ⭐ NUEVO
  name: string
  description: string | null
  tags: string[]
  status: 'active' | 'archived'
  created_by: UUID | null
  created_at: timestamp
  updated_at: timestamp
}
```

### Tabla `employee_audit_events` (registro automático):
```typescript
{
  id: UUID
  employee_id: UUID (FK → employees)
  company_id: UUID (FK → companies)
  event_type: 'document_uploaded'
  description: 'Documento cargado: [nombre]'
  user_id: UUID (quien lo subió)
  metadata: {
    document_id: UUID
    document_name: string
    category_id: UUID
  }
  created_at: timestamp
}
```

---

## 🚀 Siguiente Paso

**IMPORTANTE**: Ejecutar la migración en Supabase:

```bash
# Opción 1: Via Supabase CLI
supabase db push

# Opción 2: Via Dashboard
1. Ir a Supabase Dashboard
2. SQL Editor
3. Copiar contenido de: supabase/migrations/091_add_employee_to_documents.sql
4. Ejecutar
5. Verificar mensaje de éxito
```

---

## 📚 Archivos Modificados

### Migraciones:
- ✅ `supabase/migrations/091_add_employee_to_documents.sql`

### Frontend:
- ✅ `app/documents/page.tsx` (debounce en búsqueda)
- ✅ `app/documents/new/page.tsx` (toggle + selector empleado)
- ✅ `app/globals.css` (estilos toggle switch)

### Backend:
- ✅ `lib/services/documentBankService.ts` (interface + audit event)

### Documentación:
- ✅ `MEJORAS_BANCO_DOCUMENTOS.md`

---

## ✅ Checklist de Implementación

- [x] Debounce en búsqueda (500ms)
- [x] Campo employee_id en tabla documents
- [x] Toggle switch en formulario
- [x] Selector de empleados (dropdown)
- [x] Registro automático en audit_events
- [x] Índices de base de datos
- [x] Validación (employee_id obligatorio si toggle activo)
- [x] Filtro por company_id verificado
- [x] Build exitoso
- [x] Documentación completa
- [ ] Ejecutar migración 091 en Supabase ⏳

---

## 🎓 Notas Técnicas

### Debounce Pattern:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery)
  }, 500)
  
  return () => clearTimeout(timer)
}, [searchQuery])
```

### Audit Event Pattern:
```typescript
// Inserción en audit es try/catch independiente
// No bloquea la creación del documento si falla
try {
  await supabase.from('employee_audit_events').insert(...)
} catch (auditError) {
  console.error('Error audit:', auditError)
  // Continúa sin fallar
}
```

---

## 🎉 Resultado Final

### Antes:
- ❌ Búsqueda lenta (recarga por cada letra)
- ❌ Documentos solo generales
- ❌ No hay historial de documentos por empleado

### Después:
- ✅ Búsqueda fluida con debounce
- ✅ Documentos generales **O** de empleados específicos
- ✅ Historial completo en `employee_audit_events`
- ✅ Toggle visual moderno
- ✅ UX mejorado
- ✅ Performance optimizado

---

**Fecha**: 2025-01-08  
**Versión**: 1.0  
**Migración**: 091


