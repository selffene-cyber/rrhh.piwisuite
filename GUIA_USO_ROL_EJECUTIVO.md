# 🎯 Guía de Uso: Rol Ejecutivo

**Fecha**: 16 de enero de 2026  
**Estado**: ✅ Implementado en Base de Datos y Backend

---

## 📋 Resumen de Implementación

### ✅ **Completado:**
1. ✅ Migración SQL ejecutada (`096_add_executive_role_FINAL.sql`)
2. ✅ Tabla `user_permissions` creada con 28 permisos
3. ✅ RLS configurado con 8 políticas
4. ✅ Tipos TypeScript agregados (`types/index.ts`)
5. ✅ Hook `useUserPermissions` creado (`lib/hooks/useUserPermissions.ts`)

### ⏳ **Pendiente:**
- Actualizar UI con permisos condicionales
- Probar con usuario ejecutivo de prueba

---

## 🚀 Cómo Usar el Hook en la UI

### **1. Importar el Hook**

```typescript
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
```

### **2. Usar en un Componente**

```typescript
'use client'

export default function MiComponente() {
  const { companyId } = useCurrentCompany()
  const { 
    permissions, 
    role, 
    loading,
    canCreate,
    canApprove,
    canManage,
    isAdmin,
    isExecutive 
  } = useUserPermissions(companyId)

  if (loading) return <div>Cargando permisos...</div>

  return (
    <div>
      <h1>Mi Módulo</h1>
      
      {/* Mostrar botón solo si puede crear */}
      {canCreate('permissions') && (
        <button>Crear Permiso</button>
      )}
      
      {/* Mostrar botón solo si puede aprobar */}
      {canApprove('permissions') && (
        <button>Aprobar Permiso</button>
      )}
      
      {/* Mostrar módulo solo si puede gestionar */}
      {canManage('compliance') && (
        <div>Módulo de Cumplimientos</div>
      )}
    </div>
  )
}
```

---

## 🎨 Ejemplos de Uso por Módulo

### **Ejemplo 1: Permisos (Crear vs Aprobar)**

```typescript
'use client'

export default function PermissionsPage() {
  const { companyId } = useCurrentCompany()
  const { canCreate, canApprove, isExecutive } = useUserPermissions(companyId)

  return (
    <div>
      <h1>Gestión de Permisos</h1>
      
      {/* Ejecutivos pueden crear */}
      {canCreate('permissions') && (
        <button onClick={handleCreate}>
          ✏️ Crear Nuevo Permiso (Borrador)
        </button>
      )}
      
      {/* Solo admin puede aprobar */}
      {canApprove('permissions') && (
        <button onClick={handleApprove}>
          ✅ Aprobar Permiso
        </button>
      )}
      
      {/* Mensaje para ejecutivos */}
      {isExecutive && (
        <p className="text-yellow-600">
          Puedes crear borradores, pero necesitas que un admin los apruebe.
        </p>
      )}
    </div>
  )
}
```

### **Ejemplo 2: Vacaciones (Crear vs Aprobar)**

```typescript
'use client'

export default function VacationsPage() {
  const { companyId } = useCurrentCompany()
  const { canCreate, canApprove } = useUserPermissions(companyId)

  return (
    <div>
      {canCreate('vacations') && (
        <Link href="/vacations/new">
          + Solicitar Vacaciones
        </Link>
      )}
      
      {canApprove('vacations') && (
        <button onClick={handleApproveAll}>
          Aprobar Todas
        </button>
      )}
    </div>
  )
}
```

### **Ejemplo 3: RAAT (Acceso Completo para Ejecutivos)**

```typescript
'use client'

export default function RaatPage() {
  const { companyId } = useCurrentCompany()
  const { canManage, isExecutive } = useUserPermissions(companyId)

  // Ejecutivos tienen acceso completo a RAAT
  if (!canManage('raat')) {
    return <div>No tienes acceso a este módulo</div>
  }

  return (
    <div>
      <h1>Registro de Accidentes (RAAT)</h1>
      
      {/* Ejecutivos pueden hacer TODO en RAAT */}
      <button onClick={handleCreate}>Crear Registro</button>
      <button onClick={handleEdit}>Editar Registro</button>
      <button onClick={handleDelete}>Eliminar Registro</button>
      
      {isExecutive && (
        <p className="text-green-600">
          ✅ Tienes acceso completo a este módulo
        </p>
      )}
    </div>
  )
}
```

### **Ejemplo 4: Liquidaciones (Sin Acceso para Ejecutivos)**

```typescript
'use client'

export default function PayrollPage() {
  const { companyId } = useCurrentCompany()
  const { canCreate, canApprove, isExecutive } = useUserPermissions(companyId)

  // Ejecutivos NO tienen acceso a liquidaciones
  if (!canCreate('payroll') && !canApprove('payroll')) {
    return (
      <div className="alert alert-warning">
        {isExecutive ? (
          <p>Los ejecutivos no tienen acceso a este módulo.</p>
        ) : (
          <p>No tienes permisos para ver liquidaciones.</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1>Liquidaciones</h1>
      {/* Contenido solo para admin */}
    </div>
  )
}
```

---

## 🔐 Matriz de Permisos por Rol

| Módulo | Super Admin | Admin | Executive | User |
|--------|-------------|-------|-----------|------|
| **Permisos** (crear) | ✅ | ✅ | ✅ | ❌ |
| **Permisos** (aprobar) | ✅ | ✅ | ❌ | ❌ |
| **Vacaciones** (crear) | ✅ | ✅ | ✅ | ❌ |
| **Vacaciones** (aprobar) | ✅ | ✅ | ❌ | ❌ |
| **Certificados** (crear) | ✅ | ✅ | ✅ | ❌ |
| **Certificados** (aprobar) | ✅ | ✅ | ❌ | ❌ |
| **Anexos** (crear) | ✅ | ✅ | ✅ | ❌ |
| **Anexos** (aprobar) | ✅ | ✅ | ❌ | ❌ |
| **RAAT** (gestión) | ✅ | ✅ | ✅ | ❌ |
| **Cumplimientos** (gestión) | ✅ | ✅ | ✅ | ❌ |
| **Documentos** (gestión) | ✅ | ✅ | ✅ | ❌ |
| **Liquidaciones** | ✅ | ✅ | ❌ | ❌ |
| **Finiquitos** | ✅ | ✅ | ❌ | ❌ |
| **Anticipos** | ✅ | ✅ | ❌ | ❌ |
| **Préstamos** | ✅ | ✅ | ❌ | ❌ |
| **Centro de Costos** | ✅ | ✅ | ❌ | ❌ |
| **Departamentos** | ✅ | ✅ | ❌ | ❌ |
| **Configuración** | ✅ | ❌ | ❌ | ❌ |

---

## 🧪 Cómo Crear un Usuario Ejecutivo de Prueba

### **Paso 1: Ir al Panel de Admin**
1. Abre tu aplicación
2. Ve a `/admin/users`

### **Paso 2: Crear Usuario**
1. Click en "Crear Usuario"
2. **Email**: `ejecutivo.prueba@empresa.cl`
3. **Nombre**: `María Ejecutiva`
4. **Rol**: Seleccionar **"executive"**
5. Click en "Crear"

### **Paso 3: Asignar a Empresa**
El usuario automáticamente se asignará a la empresa actual.

### **Paso 4: Verificar Permisos**
Los permisos por defecto se crearán automáticamente gracias al trigger SQL.

---

## 📝 Helpers Disponibles

El hook `useUserPermissions` retorna estos helpers:

```typescript
const {
  // Estado
  permissions,        // Objeto con todos los permisos
  role,              // 'super_admin' | 'admin' | 'executive' | 'user'
  loading,           // boolean
  error,             // string | null
  
  // Funciones
  refresh,           // () => void - Recargar permisos
  
  // Verificadores de permisos
  canCreate,         // (module: string) => boolean
  canApprove,        // (module: string) => boolean
  canManage,         // (module: string) => boolean
  
  // Verificadores de rol
  isAdmin,           // boolean (admin o super_admin)
  isSuperAdmin,      // boolean
  isExecutive,       // boolean
  isUser,            // boolean (solo trabajador)
} = useUserPermissions(companyId)
```

### **Uso de Helpers:**

```typescript
// Verificar si puede crear permisos
if (canCreate('permissions')) {
  // Mostrar botón
}

// Verificar si puede aprobar vacaciones
if (canApprove('vacations')) {
  // Mostrar botón de aprobación
}

// Verificar si puede gestionar RAAT
if (canManage('raat')) {
  // Mostrar módulo completo
}

// Verificar rol
if (isExecutive) {
  // Mostrar mensaje para ejecutivos
}
```

---

## 🎯 Próximos Pasos

1. **Actualizar UI de navegación** - Mostrar/ocultar módulos según permisos
2. **Actualizar formularios** - Mostrar/ocultar botones de aprobación
3. **Probar con usuario ejecutivo** - Crear usuario de prueba
4. **Documentar módulos actualizados** - Listar qué páginas ya usan permisos

---

## 📞 Soporte

Si tienes dudas sobre cómo implementar permisos en un módulo específico, revisa los ejemplos arriba o consulta la implementación del hook en `lib/hooks/useUserPermissions.ts`.

---

**¡Todo listo para usar! 🚀**
