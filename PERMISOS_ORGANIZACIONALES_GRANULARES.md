# 🏢 Permisos Organizacionales Granulares

**Fecha**: 16 de enero de 2026  
**Versión**: 3.0 - Granularidad Total  
**Estado**: ✅ COMPLETADO

---

## 🎯 Descripción General

Se han expandido los módulos organizacionales de permisos de **"todo o nada"** a permisos **granulares** con control total.

**Antes:**
- ❌ `can_manage_compliance` → Todo o nada
- ❌ `can_manage_raat` → Todo o nada
- ❌ `can_manage_documents` → Todo o nada
- ❌ `can_manage_departments` → Todo o nada
- ❌ `can_manage_cost_centers` → Todo o nada
- ❌ `can_manage_org_chart` → Todo o nada

**Ahora:**
- ✅ **28 permisos granulares** con control de Ver/Crear/Editar/Eliminar/Descargar

---

## 📊 Nuevos Permisos Agregados

### **✅ CUMPLIMIENTO (5 permisos)**

| Permiso | Acción | Caso de Uso |
|---------|--------|-------------|
| `can_view_compliance` | Ver cumplimientos | Consultar estado de cumplimientos |
| `can_create_compliance` | Crear cumplimientos | Registrar nuevos cumplimientos |
| `can_edit_compliance` | Editar cumplimientos | Modificar cumplimientos existentes |
| `can_delete_compliance` | Eliminar cumplimientos | Eliminar registros de cumplimiento |
| `can_download_compliance_reports` | Descargar reportes | Exportar reportes de cumplimiento |

---

### **🔍 RAAT - Registro de Accidentes (5 permisos)**

| Permiso | Acción | Caso de Uso |
|---------|--------|-------------|
| `can_view_raat` | Ver RAAT | Consultar registros de accidentes |
| `can_create_raat` | Crear registros RAAT | Registrar nuevos accidentes |
| `can_edit_raat` | Editar registros RAAT | Actualizar información de accidentes |
| `can_delete_raat` | Eliminar registros RAAT | Eliminar registros de accidentes |
| `can_download_raat_reports` | Descargar reportes RAAT | Exportar estadísticas de accidentes |

---

### **📁 BANCO DE DOCUMENTOS (6 permisos)**

| Permiso | Acción | Caso de Uso |
|---------|--------|-------------|
| `can_view_documents` | Ver banco de documentos | Navegar y buscar documentos |
| `can_upload_documents` | Subir documentos | Agregar nuevos archivos |
| `can_download_documents` | Descargar documentos | Descargar archivos del banco |
| `can_edit_documents` | Editar metadatos | Cambiar nombre, descripción, categoría |
| `can_delete_documents` | Eliminar documentos | Eliminar archivos del banco |
| `can_manage_document_categories` | Gestionar categorías | Crear/editar/eliminar categorías |

---

### **🏢 DEPARTAMENTOS (4 permisos)**

| Permiso | Acción | Caso de Uso |
|---------|--------|-------------|
| `can_view_departments` | Ver departamentos | Consultar estructura departamental |
| `can_create_departments` | Crear departamentos | Agregar nuevos departamentos |
| `can_edit_departments` | Editar departamentos | Modificar información de departamentos |
| `can_delete_departments` | Eliminar departamentos | Eliminar departamentos |

---

### **💰 CENTROS DE COSTO (5 permisos)**

| Permiso | Acción | Caso de Uso |
|---------|--------|-------------|
| `can_view_cost_centers` | Ver centros de costo | Consultar centros de costo |
| `can_create_cost_centers` | Crear centros de costo | Agregar nuevos centros |
| `can_edit_cost_centers` | Editar centros de costo | Modificar información de centros |
| `can_delete_cost_centers` | Eliminar centros de costo | Eliminar centros de costo |
| `can_assign_cost_centers` | Asignar trabajadores | Asignar empleados a centros de costo |

---

### **🌳 ORGANIGRAMA (3 permisos)**

| Permiso | Acción | Caso de Uso |
|---------|--------|-------------|
| `can_view_org_chart` | Ver organigrama | Visualizar estructura organizacional |
| `can_edit_org_chart` | Editar organigrama | Modificar jerarquía y relaciones |
| `can_download_org_chart` | Descargar organigrama | Exportar organigrama (PDF/imagen) |

---

## 👥 Permisos por Rol (Actualizados)

### **🔴 Super Admin**
✅ **ACCESO TOTAL** a todos los 28 nuevos permisos

```
Cumplimiento:     ✅ Ver, Crear, Editar, Eliminar, Descargar
RAAT:             ✅ Ver, Crear, Editar, Eliminar, Descargar
Banco Docs:       ✅ Ver, Subir, Descargar, Editar, Eliminar, Categorías
Departamentos:    ✅ Ver, Crear, Editar, Eliminar
Centros Costo:    ✅ Ver, Crear, Editar, Eliminar, Asignar
Organigrama:      ✅ Ver, Editar, Descargar
```

---

### **🔵 Admin**
✅ **ACCESO TOTAL** (igual que Super Admin en estos módulos)

```
Cumplimiento:     ✅ Ver, Crear, Editar, Eliminar, Descargar
RAAT:             ✅ Ver, Crear, Editar, Eliminar, Descargar
Banco Docs:       ✅ Ver, Subir, Descargar, Editar, Eliminar, Categorías
Departamentos:    ✅ Ver, Crear, Editar, Eliminar
Centros Costo:    ✅ Ver, Crear, Editar, Eliminar, Asignar
Organigrama:      ✅ Ver, Editar, Descargar
```

---

### **🟢 Executive (PERSONALIZABLE)**

**Por defecto:**

```
Cumplimiento:
  ✅ Ver cumplimientos
  ✅ Crear cumplimientos
  ❌ NO editar cumplimientos
  ❌ NO eliminar cumplimientos
  ✅ Descargar reportes

RAAT:
  ✅ Ver RAAT
  ✅ Crear registros
  ❌ NO editar registros
  ❌ NO eliminar registros
  ✅ Descargar reportes

Banco de Documentos:
  ✅ Ver documentos
  ✅ Subir documentos
  ✅ Descargar documentos
  ❌ NO editar metadatos
  ❌ NO eliminar documentos
  ❌ NO gestionar categorías

Departamentos:
  ✅ Ver departamentos
  ❌ NO crear departamentos
  ❌ NO editar departamentos
  ❌ NO eliminar departamentos

Centros de Costo:
  ✅ Ver centros de costo
  ❌ NO crear centros
  ❌ NO editar centros
  ❌ NO eliminar centros
  ❌ NO asignar trabajadores

Organigrama:
  ✅ Ver organigrama
  ❌ NO editar organigrama
  ✅ Descargar organigrama
```

**💡 Todos estos permisos son 100% personalizables desde el UI.**

---

### **🟡 User (Trabajador)**

```
Cumplimiento:     ❌ SIN ACCESO
RAAT:             ❌ SIN ACCESO
Banco Docs:       ❌ SIN ACCESO
Departamentos:    ❌ SIN ACCESO
Centros Costo:    ❌ SIN ACCESO
Organigrama:      ❌ SIN ACCESO
```

---

## 🎨 Interfaz Actualizada

### **Modal de Permisos - Nuevas Secciones**

```
┌─────────────────────────────────────────────────┐
│ Permisos de María Ejecutiva              [✕]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ✅ Cumplimientos y Vencimientos                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Ver Cumplimientos         🟢 ON             │ │
│ │ Crear Cumplimientos       🟢 ON             │ │
│ │ Editar Cumplimientos      ⚪ OFF            │ │
│ │ Eliminar Cumplimientos    ⚪ OFF            │ │
│ │ Descargar Reportes        🟢 ON             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 🔍 RAAT (Registro de Accidentes)                │
│ ┌─────────────────────────────────────────────┐ │
│ │ Ver RAAT                  🟢 ON             │ │
│ │ Crear Registros RAAT      🟢 ON             │ │
│ │ Editar Registros RAAT     ⚪ OFF            │ │
│ │ Eliminar Registros RAAT   ⚪ OFF            │ │
│ │ Descargar Reportes RAAT   🟢 ON             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 📁 Banco de Documentos                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ Ver Banco de Documentos   🟢 ON             │ │
│ │ Subir Documentos          🟢 ON             │ │
│ │ Descargar Documentos      🟢 ON             │ │
│ │ Editar Metadatos          ⚪ OFF            │ │
│ │ Eliminar Documentos       ⚪ OFF            │ │
│ │ Gestionar Categorías      ⚪ OFF            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 🏢 Departamentos                                │
│ ┌─────────────────────────────────────────────┐ │
│ │ Ver Departamentos         🟢 ON             │ │
│ │ Crear Departamentos       ⚪ OFF            │ │
│ │ Editar Departamentos      ⚪ OFF            │ │
│ │ Eliminar Departamentos    ⚪ OFF            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 💰 Centros de Costo                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ Ver Centros de Costo      🟢 ON             │ │
│ │ Crear Centros de Costo    ⚪ OFF            │ │
│ │ Editar Centros de Costo   ⚪ OFF            │ │
│ │ Eliminar Centros de Costo ⚪ OFF            │ │
│ │ Asignar Trabajadores      ⚪ OFF            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 🌳 Organigrama                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Ver Organigrama           🟢 ON             │ │
│ │ Editar Estructura         ⚪ OFF            │ │
│ │ Descargar Organigrama     🟢 ON             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│                   [Cancelar] [Guardar Permisos] │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Ejemplos de Casos de Uso

### **Caso 1: Ejecutivo de Cumplimiento**

**Necesidad**: Solo gestionar cumplimientos y RAAT.

**Configuración:**
```
✅ Cumplimiento: Ver, Crear, Editar, Eliminar, Descargar
✅ RAAT: Ver, Crear, Editar, Eliminar, Descargar
❌ Banco Docs: SIN ACCESO
❌ Departamentos: SIN ACCESO
❌ Centros Costo: SIN ACCESO
❌ Organigrama: Solo ver
❌ Finanzas: SIN ACCESO
```

---

### **Caso 2: Ejecutivo de Documentación**

**Necesidad**: Solo gestionar banco de documentos.

**Configuración:**
```
❌ Cumplimiento: SIN ACCESO
❌ RAAT: SIN ACCESO
✅ Banco Docs: Ver, Subir, Descargar, Editar, Eliminar, Categorías
✅ Departamentos: Solo ver
✅ Organigrama: Ver y descargar
❌ Finanzas: SIN ACCESO
```

---

### **Caso 3: Ejecutivo de Organización**

**Necesidad**: Gestionar estructura organizacional.

**Configuración:**
```
❌ Cumplimiento: Solo ver
❌ RAAT: Solo ver
❌ Banco Docs: Solo ver
✅ Departamentos: Ver, Crear, Editar, Eliminar
✅ Centros Costo: Ver, Crear, Editar, Eliminar, Asignar
✅ Organigrama: Ver, Editar, Descargar
❌ Finanzas: SIN ACCESO
```

---

### **Caso 4: Ejecutivo "Solo Consulta Organizacional"**

**Necesidad**: Ver todo pero no modificar nada.

**Configuración:**
```
✅ Cumplimiento: Solo ver y descargar
✅ RAAT: Solo ver y descargar
✅ Banco Docs: Solo ver y descargar
✅ Departamentos: Solo ver
✅ Centros Costo: Solo ver
✅ Organigrama: Solo ver y descargar
❌ Crear/Editar/Eliminar: NADA
```

---

### **Caso 5: Ejecutivo Híbrido (RAAT + Documentos)**

**Necesidad**: RAAT completo + Banco de documentos completo.

**Configuración:**
```
❌ Cumplimiento: SIN ACCESO
✅ RAAT: ACCESO COMPLETO (Ver, Crear, Editar, Eliminar, Descargar)
✅ Banco Docs: ACCESO COMPLETO (Ver, Subir, Descargar, Editar, Eliminar, Categorías)
✅ Departamentos: Solo ver
✅ Organigrama: Solo ver
❌ Finanzas: SIN ACCESO
```

---

## 📝 Migración SQL

**Archivo**: `099_expand_organizational_permissions.sql`

**Cambios:**
1. ✅ Agregadas 28 nuevas columnas a `user_permissions`
2. ✅ Migrados permisos antiguos (`can_manage_*`) a nuevos permisos granulares
3. ✅ Actualizados permisos por defecto para todos los roles
4. ✅ Actualizada función `create_default_executive_permissions()`
5. ⚠️ Columnas antiguas NO eliminadas (para compatibilidad)

**Ejecutar:**
```sql
-- En Supabase Dashboard → SQL Editor
-- Copiar y ejecutar: supabase/migrations/099_expand_organizational_permissions.sql
```

**IMPORTANTE:**
- Las columnas antiguas (`can_manage_compliance`, etc.) NO se eliminan automáticamente
- Están comentadas al final de la migración
- Elimínalas manualmente después de verificar que todo funciona

---

## 🚀 Cómo Usar los Nuevos Permisos

### **1. Desde el UI (Admin/Owner)**

```
1. Ir a: Configuración → Usuarios y Roles
2. Seleccionar un usuario ejecutivo
3. Click en "Permisos"
4. Verás las nuevas secciones:
   ✅ Cumplimientos y Vencimientos
   🔍 RAAT
   📁 Banco de Documentos
   🏢 Departamentos
   💰 Centros de Costo
   🌳 Organigrama
5. Activar/Desactivar según necesidad
6. Click "Guardar Permisos"
```

### **2. Desde el Código (Validar Permisos)**

```typescript
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'

function ComplianceModule() {
  const { permissions } = useUserPermissions()
  
  // Verificar acceso a cumplimientos
  if (!permissions.can_view_compliance) {
    return <div>No tienes acceso a este módulo</div>
  }
  
  return (
    <div>
      <h1>Cumplimientos</h1>
      
      {/* Mostrar botón crear solo si tiene permiso */}
      {permissions.can_create_compliance && (
        <button>Crear Cumplimiento</button>
      )}
      
      {/* Mostrar botón editar solo si tiene permiso */}
      {permissions.can_edit_compliance && (
        <button>Editar</button>
      )}
      
      {/* Mostrar botón eliminar solo si tiene permiso */}
      {permissions.can_delete_compliance && (
        <button>Eliminar</button>
      )}
      
      {/* Mostrar botón descargar solo si tiene permiso */}
      {permissions.can_download_compliance_reports && (
        <button>Descargar Reporte</button>
      )}
    </div>
  )
}
```

---

## 📊 Resumen de Implementación

### **Total de Permisos Granulares:**
- ✅ **11 permisos** de Vista y Descarga (migración 098)
- ✅ **28 permisos** organizacionales (migración 099)
- **TOTAL: 67 permisos granulares en el sistema**

### **Módulos con Granularidad Completa:**
1. ✅ Vista de Trabajadores
2. ✅ Descargas de Documentos
3. ✅ Contratos
4. ✅ Documentos de Trabajadores
5. ✅ Finanzas
6. ✅ Cumplimiento ⭐ (NUEVO)
7. ✅ RAAT ⭐ (NUEVO)
8. ✅ Banco de Documentos ⭐ (NUEVO)
9. ✅ Departamentos ⭐ (NUEVO)
10. ✅ Centros de Costo ⭐ (NUEVO)
11. ✅ Organigrama ⭐ (NUEVO)

---

## ✅ Checklist de Implementación

- [x] Tipos TypeScript actualizados (`types/index.ts`)
- [x] Interfaz `UserPermissions` con 28 nuevos campos
- [x] `DEFAULT_PERMISSIONS` actualizado para todos los roles
- [x] Migración SQL creada (`099_expand_organizational_permissions.sql`)
- [x] UI actualizada con 6 nuevas secciones de permisos
- [x] Documentación completa
- [x] Permisos migrados desde columnas antiguas
- [x] Función de permisos por defecto actualizada

---

## 🎉 Resumen de Mejoras

### **Antes:**
- ❌ Cumplimiento: Todo o nada
- ❌ RAAT: Todo o nada
- ❌ Banco Docs: Todo o nada
- ❌ Departamentos: Todo o nada
- ❌ Centros Costo: Todo o nada
- ❌ Organigrama: Todo o nada

### **Ahora:**
- ✅ **Cumplimiento**: Ver, Crear, Editar, Eliminar, Descargar (5 permisos)
- ✅ **RAAT**: Ver, Crear, Editar, Eliminar, Descargar (5 permisos)
- ✅ **Banco Docs**: Ver, Subir, Descargar, Editar, Eliminar, Categorías (6 permisos)
- ✅ **Departamentos**: Ver, Crear, Editar, Eliminar (4 permisos)
- ✅ **Centros Costo**: Ver, Crear, Editar, Eliminar, Asignar (5 permisos)
- ✅ **Organigrama**: Ver, Editar, Descargar (3 permisos)
- ✅ **Control granular total** con 28 nuevos permisos
- ✅ **Interfaz visual** con toggles para cada permiso

---

## 📚 Archivos Modificados

1. **`types/index.ts`**
   - Interfaz `UserPermissions` (28 nuevos campos)
   - Reemplazadas 6 columnas `can_manage_*` por 28 columnas granulares
   - `DEFAULT_PERMISSIONS` actualizado para todos los roles

2. **`supabase/migrations/099_expand_organizational_permissions.sql`**
   - 28 nuevas columnas en `user_permissions`
   - Migración automática desde columnas antiguas
   - Actualización de permisos existentes
   - Función `create_default_executive_permissions()` actualizada

3. **`app/settings/usuarios-roles/page.tsx`**
   - 6 nuevas secciones en modal de permisos:
     - ✅ Cumplimientos y Vencimientos
     - 🔍 RAAT
     - 📁 Banco de Documentos
     - 🏢 Departamentos
     - 💰 Centros de Costo
     - 🌳 Organigrama

---

**¡Control granular completo en todos los módulos!** 🚀
