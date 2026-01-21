# 📋 Permisos Granulares Detallados

**Fecha**: 16 de enero de 2026  
**Versión**: 2.0 - Permisos Granulares  
**Estado**: ✅ COMPLETADO

---

## 🎯 Descripción General

Se han agregado **11 nuevos permisos** más granulares al sistema para dar control total sobre:

✅ **Vista de trabajadores** (quién puede ver la lista y qué nivel de detalle)  
✅ **Descargas de documentos** (por tipo de documento)  
✅ **Gestión completa de contratos** (crear, editar, eliminar, aprobar)  

---

## 📊 Nuevos Permisos Agregados

### **1. Permisos de VISTA (4 nuevos)**

| Permiso | Descripción | Caso de Uso |
|---------|-------------|-------------|
| `can_view_employees` | Ver lista de trabajadores | Necesario para acceder a `/employees` y seleccionar trabajadores en formularios |
| `can_view_employee_details` | Ver detalles completos de trabajadores | Datos personales, dirección, contacto, etc. |
| `can_view_employee_salary` | Ver información salarial | Sueldos, liquidaciones, finiquitos |
| `can_view_contracts` | Ver contratos de trabajadores | Acceso a módulo de contratos |

### **2. Permisos de DESCARGA (5 nuevos)**

| Permiso | Descripción | Formato |
|---------|-------------|---------|
| `can_download_contracts` | Descargar contratos | PDF |
| `can_download_payroll` | Descargar liquidaciones | PDF |
| `can_download_certificates` | Descargar certificados laborales | PDF |
| `can_download_settlements` | Descargar finiquitos | PDF |
| `can_download_employee_documents` | Descargar documentos adjuntos | Cualquier formato |

### **3. Permisos de CONTRATOS (2 nuevos)**

| Permiso | Descripción | Impacto |
|---------|-------------|---------|
| `can_edit_contracts` | Editar contratos existentes | Modificar datos de contratos ya creados |
| `can_delete_contracts` | Eliminar contratos | Eliminar contratos (soft delete) |

**Nota**: Los permisos `can_create_contracts` y `can_approve_contracts` ya existían.

---

## 👥 Permisos por Rol

### **🔴 Super Admin**
✅ **ACCESO TOTAL** a todos los permisos

```
Vista:              ✅ Todo
Descarga:           ✅ Todo
Contratos:          ✅ Crear, Aprobar, Editar, Eliminar
Documentos:         ✅ Todo
Finanzas:           ✅ Todo
Organización:       ✅ Todo
Cumplimiento:       ✅ Todo
Configuración:      ✅ Todo
```

---

### **🔵 Admin**
✅ **ACCESO CASI TOTAL** (excepto configuración global)

```
Vista:              ✅ Todo
Descarga:           ✅ Todo
Contratos:          ✅ Crear, Aprobar, Editar, Eliminar
Documentos:         ✅ Todo
Finanzas:           ✅ Todo
Organización:       ✅ Todo
Cumplimiento:       ✅ Todo
Configuración:      ❌ Solo super_admin
```

---

### **🟢 Executive (ROL PERSONALIZABLE)**

**Por defecto:**

```
Vista:
  ✅ Ver lista de trabajadores
  ✅ Ver detalles de trabajadores
  ❌ NO ver información salarial
  ✅ Ver contratos

Descarga:
  ✅ Descargar contratos
  ❌ NO descargar liquidaciones
  ✅ Descargar certificados
  ❌ NO descargar finiquitos
  ✅ Descargar documentos de trabajadores

Contratos:
  ✅ Crear contratos
  ❌ NO aprobar contratos
  ❌ NO editar contratos
  ❌ NO eliminar contratos
  ✅ Crear anexos
  ❌ NO aprobar anexos

Documentos:
  ✅ Crear permisos, vacaciones, certificados, amonestaciones
  ❌ NO aprobar ningún documento

Finanzas:
  ❌ SIN ACCESO (ni crear ni aprobar)

Organización:
  ❌ SIN ACCESO

Cumplimiento:
  ✅ ACCESO COMPLETO (RAAT, Cumplimientos, Documentos)

Configuración:
  ❌ SIN ACCESO
```

**💡 Los permisos de Executive son 100% personalizables desde el UI.**

---

### **🟡 User (Trabajador)**

```
Vista:              ❌ No puede ver a otros trabajadores
Descarga:           ❌ Solo sus propios documentos (desde portal trabajador)
Contratos:          ❌ SIN ACCESO
Documentos:         ❌ SIN ACCESO
Finanzas:           ❌ SIN ACCESO
Organización:       ❌ SIN ACCESO
Cumplimiento:       ❌ SIN ACCESO
Configuración:      ❌ SIN ACCESO
```

---

## 🎨 Interfaz de Permisos

### **Secciones en el Modal de Permisos**

```
┌─────────────────────────────────────────────────┐
│ Permisos de Juan Ejecutivo                [✕] │
├─────────────────────────────────────────────────┤
│                                                 │
│ 👁️ Vista y Acceso                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ Ver Lista de Trabajadores     🟢 ON        │ │
│ │ Ver Detalles de Trabajadores  🟢 ON        │ │
│ │ Ver Información Salarial      ⚪ OFF       │ │
│ │ Ver Contratos                 🟢 ON        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 💾 Descargas de Documentos                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ Descargar Contratos           🟢 ON        │ │
│ │ Descargar Liquidaciones       ⚪ OFF       │ │
│ │ Descargar Certificados        🟢 ON        │ │
│ │ Descargar Finiquitos          ⚪ OFF       │ │
│ │ Descargar Documentos          🟢 ON        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 📝 Gestión de Contratos                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Crear Contratos               🟢 ON        │ │
│ │ Aprobar Contratos             ⚪ OFF       │ │
│ │ Editar Contratos              ⚪ OFF       │ │
│ │ Eliminar Contratos            ⚪ OFF       │ │
│ │ Crear Anexos                  🟢 ON        │ │
│ │ Aprobar Anexos                ⚪ OFF       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 📄 Documentos de Trabajadores                   │
│ 💰 Finanzas                                     │
│ 🏢 Organización                                 │
│ ✅ Cumplimiento                                 │
│                                                 │
│                   [Cancelar] [Guardar Permisos] │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Ejemplos de Casos de Uso

### **Caso 1: Ejecutivo de RRHH**

**Necesidad**: Crear documentos de trabajadores pero NO aprobarlos. NO ver salarios.

**Configuración:**
```
✅ Ver lista de trabajadores
✅ Ver detalles de trabajadores
❌ NO ver salarios
✅ Crear permisos, vacaciones, certificados
❌ NO aprobar nada
❌ NO acceso a finanzas
```

---

### **Caso 2: Ejecutivo de Contratos**

**Necesidad**: Gestionar contratos completos pero NO finanzas.

**Configuración:**
```
✅ Ver lista de trabajadores
✅ Ver contratos
✅ Crear contratos
✅ Editar contratos  ⭐ (si Admin lo autoriza)
✅ Descargar contratos
❌ NO aprobar contratos
❌ NO acceso a finanzas
```

---

### **Caso 3: Ejecutivo de Finanzas**

**Necesidad**: Crear liquidaciones y finiquitos pero NO aprobarlos.

**Configuración:**
```
✅ Ver lista de trabajadores
✅ Ver información salarial  ⭐
✅ Crear liquidaciones
✅ Crear finiquitos
✅ Descargar liquidaciones
✅ Descargar finiquitos
❌ NO aprobar liquidaciones
❌ NO aprobar finiquitos
```

---

### **Caso 4: Ejecutivo de Cumplimiento**

**Necesidad**: Solo RAAT y cumplimientos.

**Configuración:**
```
✅ Ver lista de trabajadores
✅ Ver detalles de trabajadores
❌ NO ver salarios
✅ Gestionar RAAT
✅ Gestionar Cumplimientos
✅ Gestionar Banco de Documentos
❌ NO crear contratos
❌ NO acceso a finanzas
```

---

### **Caso 5: Ejecutivo "Ver Todo, Sin Crear Nada"**

**Necesidad**: Solo consultar información, no modificar.

**Configuración:**
```
✅ Ver lista de trabajadores
✅ Ver detalles de trabajadores
✅ Ver contratos
✅ Descargar documentos
❌ NO crear nada
❌ NO aprobar nada
❌ NO editar nada
❌ NO eliminar nada
```

---

## 📝 Migración SQL

**Archivo**: `098_add_granular_permissions.sql`

**Cambios:**
1. ✅ Agregadas 11 nuevas columnas a `user_permissions`
2. ✅ Actualizados permisos por defecto para todos los roles
3. ✅ Actualizada función `create_default_executive_permissions()`
4. ✅ Los usuarios existentes reciben automáticamente los nuevos permisos según su rol

**Ejecutar:**
```sql
-- En Supabase Dashboard → SQL Editor
-- Copiar y ejecutar: supabase/migrations/098_add_granular_permissions.sql
```

---

## 🚀 Cómo Usar los Nuevos Permisos

### **1. Desde el UI (Admin/Owner)**

```
1. Ir a: Configuración → Usuarios y Roles
2. Seleccionar un usuario ejecutivo
3. Click en "Permisos"
4. Activar/Desactivar toggles según necesidad:
   - 👁️ Vista y Acceso
   - 💾 Descargas
   - 📝 Contratos
   - 📄 Documentos
   - 💰 Finanzas
   - 🏢 Organización
   - ✅ Cumplimiento
5. Click "Guardar Permisos"
```

### **2. Desde el Código (Validar Permisos)**

```typescript
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'

function MyComponent() {
  const { permissions, canView, canDownload } = useUserPermissions()
  
  // Verificar si puede ver trabajadores
  if (!permissions.can_view_employees) {
    return <div>No tienes acceso a la lista de trabajadores</div>
  }
  
  // Verificar si puede ver salarios
  const showSalary = permissions.can_view_employee_salary
  
  // Verificar si puede descargar contratos
  const canDownloadContract = permissions.can_download_contracts
  
  return (
    <div>
      {showSalary && <div>Sueldo: ${employee.salary}</div>}
      {canDownloadContract && <button>Descargar Contrato</button>}
    </div>
  )
}
```

---

## ✅ Checklist de Implementación

- [x] Tipos TypeScript actualizados (`types/index.ts`)
- [x] Interfaz `UserPermissions` con 11 nuevos campos
- [x] `DEFAULT_PERMISSIONS` actualizado para todos los roles
- [x] Migración SQL creada (`098_add_granular_permissions.sql`)
- [x] UI actualizada con nuevas secciones de permisos
- [x] Documentación completa

---

## 🎉 Resumen de Mejoras

### **Antes:**
- ❌ No podía controlar quién ve la lista de trabajadores
- ❌ No podía controlar nivel de detalle (¿salarios sí o no?)
- ❌ No podía controlar descargas por tipo de documento
- ❌ Contratos tenía solo "crear" y "aprobar"

### **Ahora:**
- ✅ Control total sobre vista de trabajadores
- ✅ Control granular de nivel de detalle (datos básicos vs salarios)
- ✅ Control de descargas por tipo de documento
- ✅ Gestión completa de contratos (crear, aprobar, editar, eliminar)
- ✅ 5 ejecutivos con permisos completamente diferentes
- ✅ Interfaz visual con toggles para cada permiso

---

## 📚 Archivos Modificados

1. **`types/index.ts`**
   - Interfaz `UserPermissions` (11 nuevos campos)
   - `DEFAULT_PERMISSIONS` (actualizado)

2. **`supabase/migrations/098_add_granular_permissions.sql`**
   - Nuevas columnas en `user_permissions`
   - Actualización de permisos existentes
   - Función `create_default_executive_permissions()` actualizada

3. **`app/settings/usuarios-roles/page.tsx`**
   - Nuevas secciones en modal de permisos:
     - 👁️ Vista y Acceso
     - 💾 Descargas de Documentos
     - 📝 Gestión de Contratos (expandida)

---

**¡Implementación completa y lista para usar!** 🚀
