# 🎯 Implementación: Rol Ejecutivo

**Fecha**: 16 de enero de 2026  
**Objetivo**: Crear rol intermedio "executive" para personal de secretariado/apoyo administrativo  
**Complejidad**: 🟡 MEDIA

---

## 📋 Requisitos del Rol "Ejecutivo"

### Perfil de Usuario

- **Nombre del rol**: `executive` (en la base de datos)
- **Etiqueta**: "Ejecutivo" / "Secretaría" (en la UI)
- **Caso de uso**: Personal de apoyo administrativo que prepara documentación sin aprobar
- **Estructura dual**: Es trabajador (employees) + tiene usuario ejecutivo (user_profiles)
- **Correos**:
  - Email personal → Portal trabajador (rol `user`)
  - Email empresarial → Portal ejecutivo (rol `executive`)

---

## 🚫 Módulos SIN Acceso

| Módulo | Razón |
|--------|-------|
| Centro de Costos | Solo admin |
| Departamentos | Solo admin |
| Organigrama | Solo admin |
| Liquidaciones (crear/aprobar/descargar) | Solo admin |
| Finiquitos (crear/aprobar/descargar) | Solo admin |
| Anticipos (crear/aprobar/descargar) | Solo admin |
| Aprobar: permisos, certificados, vacaciones | Solo admin |
| Préstamos (módulo completo) | Solo admin |
| Configuración de empresa | Solo admin/owner |

---

## ✅ Módulos CON Acceso

### Acceso Completo (100%)

| Módulo | Permisos |
|--------|----------|
| **Cumplimientos y Vencimientos** | Ver, crear, editar, eliminar alertas |
| **RAAT** | Gestión completa de registros de asistencia |
| **Banco de Documentos** | Ver, subir, descargar, eliminar documentos |

### Acceso de Solo Lectura

| Módulo | Permisos |
|--------|----------|
| **Dashboard de Contratos** | Ver listado, NO crear/aprobar/descargar |

### Acceso de Creación (Sin Aprobar)

| Módulo | Permisos |
|--------|----------|
| **Permisos** | Crear borradores, NO aprobar |
| **Vacaciones** | Crear solicitudes, NO aprobar |
| **Anexos de Contrato** | Crear borradores, NO aprobar |
| **Cartas de Amonestación** | Crear borradores, NO emitir |
| **Certificados Laborales** | Crear borradores, NO firmar |
| **Pactos de Horas Extras** | Gestionar, NO aprobar |

---

## 🏗️ Arquitectura de la Solución

### 1. Base de Datos

#### Migración: Agregar rol "executive"

```sql
-- 1. Actualizar enum de roles en user_profiles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'executive';

-- 2. Verificar que se agregó correctamente
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype 
ORDER BY enumsortorder;

-- Resultado esperado:
-- super_admin
-- admin
-- executive  ← NUEVO
-- user
```

#### Tabla de Permisos Granulares (Nueva)

```sql
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Módulos de documentos (crear sin aprobar)
  can_create_permissions BOOLEAN DEFAULT false,
  can_approve_permissions BOOLEAN DEFAULT false,
  can_create_vacations BOOLEAN DEFAULT false,
  can_approve_vacations BOOLEAN DEFAULT false,
  can_create_contracts BOOLEAN DEFAULT false,
  can_approve_contracts BOOLEAN DEFAULT false,
  can_create_amendments BOOLEAN DEFAULT false,
  can_approve_amendments BOOLEAN DEFAULT false,
  can_create_certificates BOOLEAN DEFAULT false,
  can_approve_certificates BOOLEAN DEFAULT false,
  can_create_disciplinary BOOLEAN DEFAULT false,
  can_approve_disciplinary BOOLEAN DEFAULT false,
  can_create_overtime_pacts BOOLEAN DEFAULT false,
  can_approve_overtime_pacts BOOLEAN DEFAULT false,
  
  -- Módulos financieros
  can_create_payroll BOOLEAN DEFAULT false,
  can_approve_payroll BOOLEAN DEFAULT false,
  can_create_settlements BOOLEAN DEFAULT false,
  can_approve_settlements BOOLEAN DEFAULT false,
  can_create_advances BOOLEAN DEFAULT false,
  can_approve_advances BOOLEAN DEFAULT false,
  can_manage_loans BOOLEAN DEFAULT false,
  
  -- Módulos organizacionales
  can_manage_departments BOOLEAN DEFAULT false,
  can_manage_cost_centers BOOLEAN DEFAULT false,
  can_manage_org_chart BOOLEAN DEFAULT false,
  
  -- Módulos de cumplimiento
  can_manage_compliance BOOLEAN DEFAULT false,
  can_manage_raat BOOLEAN DEFAULT false,
  
  -- Módulos de documentos
  can_manage_documents BOOLEAN DEFAULT false,
  
  -- Configuración
  can_manage_company_settings BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, company_id)
);

-- RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permissions"
  ON user_permissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all permissions"
  ON user_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Company admins can manage permissions in their company"
  ON user_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_users cu
      JOIN user_profiles up ON cu.user_id = up.id
      WHERE cu.user_id = auth.uid() 
        AND cu.company_id = user_permissions.company_id
        AND cu.role = 'admin'
        AND cu.status = 'active'
    )
  );
```

---

## 💻 Código TypeScript

### 1. Tipos (`types/index.ts`)

```typescript
// Agregar a los tipos existentes
export type UserRole = 'super_admin' | 'admin' | 'executive' | 'user'

export interface UserPermissions {
  // Documentos (crear sin aprobar)
  can_create_permissions: boolean
  can_approve_permissions: boolean
  can_create_vacations: boolean
  can_approve_vacations: boolean
  can_create_contracts: boolean
  can_approve_contracts: boolean
  can_create_amendments: boolean
  can_approve_amendments: boolean
  can_create_certificates: boolean
  can_approve_certificates: boolean
  can_create_disciplinary: boolean
  can_approve_disciplinary: boolean
  can_create_overtime_pacts: boolean
  can_approve_overtime_pacts: boolean
  
  // Financieros
  can_create_payroll: boolean
  can_approve_payroll: boolean
  can_create_settlements: boolean
  can_approve_settlements: boolean
  can_create_advances: boolean
  can_approve_advances: boolean
  can_manage_loans: boolean
  
  // Organizacionales
  can_manage_departments: boolean
  can_manage_cost_centers: boolean
  can_manage_org_chart: boolean
  
  // Cumplimiento
  can_manage_compliance: boolean
  can_manage_raat: boolean
  
  // Documentos
  can_manage_documents: boolean
  
  // Configuración
  can_manage_company_settings: boolean
}

// Permisos por defecto para cada rol
export const DEFAULT_PERMISSIONS: Record<UserRole, Partial<UserPermissions>> = {
  super_admin: {
    // Todos en true
  },
  admin: {
    // Todos en true excepto company_settings (depende)
  },
  executive: {
    // Crear sin aprobar
    can_create_permissions: true,
    can_approve_permissions: false,
    can_create_vacations: true,
    can_approve_vacations: false,
    can_create_contracts: false, // NO puede crear contratos
    can_approve_contracts: false,
    can_create_amendments: true,
    can_approve_amendments: false,
    can_create_certificates: true,
    can_approve_certificates: false,
    can_create_disciplinary: true,
    can_approve_disciplinary: false,
    can_create_overtime_pacts: true,
    can_approve_overtime_pacts: false,
    
    // Sin acceso financiero
    can_create_payroll: false,
    can_approve_payroll: false,
    can_create_settlements: false,
    can_approve_settlements: false,
    can_create_advances: false,
    can_approve_advances: false,
    can_manage_loans: false,
    
    // Sin acceso organizacional
    can_manage_departments: false,
    can_manage_cost_centers: false,
    can_manage_org_chart: false,
    
    // Acceso completo a cumplimiento
    can_manage_compliance: true,
    can_manage_raat: true,
    can_manage_documents: true,
    
    // Sin acceso a configuración
    can_manage_company_settings: false,
  },
  user: {
    // Todos en false (solo portal trabajador)
  },
}
```

### 2. Hook de Permisos (`lib/hooks/useUserPermissions.ts`)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from './useCurrentCompany'
import { UserRole, UserPermissions, DEFAULT_PERMISSIONS } from '@/types'

export function useUserPermissions() {
  const { companyId } = useCurrentCompany()
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPermissions()
  }, [companyId])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !companyId) {
        setPermissions(null)
        setRole(null)
        setLoading(false)
        return
      }

      // Obtener rol del usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role as UserRole

      // Si es super_admin, tiene todos los permisos
      if (userRole === 'super_admin') {
        setRole('super_admin')
        setPermissions(DEFAULT_PERMISSIONS.super_admin as UserPermissions)
        setLoading(false)
        return
      }

      // Cargar permisos personalizados de la BD
      const { data: customPermissions } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single()

      if (customPermissions) {
        setPermissions(customPermissions)
      } else {
        // Usar permisos por defecto del rol
        setPermissions(DEFAULT_PERMISSIONS[userRole] as UserPermissions)
      }

      setRole(userRole)
    } catch (error) {
      console.error('Error al cargar permisos:', error)
      setPermissions(null)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  return {
    permissions,
    role,
    loading,
    refresh: loadPermissions,
    
    // Helpers
    canCreate: (module: string) => permissions?.[`can_create_${module}` as keyof UserPermissions] || false,
    canApprove: (module: string) => permissions?.[`can_approve_${module}` as keyof UserPermissions] || false,
    canManage: (module: string) => permissions?.[`can_manage_${module}` as keyof UserPermissions] || false,
  }
}
```

---

## 🎨 Interfaz de Usuario

### Menú de Navegación Condicional

```typescript
// En el componente de navegación
const { permissions, role } = useUserPermissions()

// Ejemplo de uso
{role === 'executive' || role === 'admin' || role === 'super_admin' ? (
  <NavItem href="/documents">Documentos</NavItem>
) : null}

{permissions?.can_manage_compliance && (
  <NavItem href="/compliance">Cumplimientos</NavItem>
)}

{permissions?.can_manage_raat && (
  <NavItem href="/raat">RAAT</NavItem>
)}
```

### Botones Condicionales

```typescript
// En formularios de creación
const { canCreate, canApprove } = useUserPermissions()

{canCreate('permissions') && (
  <button onClick={handleCreate}>Crear Solicitud</button>
)}

{canApprove('permissions') && (
  <button onClick={handleApprove}>Aprobar</button>
)}
```

---

## 📝 Proceso de Implementación

### Fase 1: Base de Datos (30 min)

1. ✅ Crear migración `096_add_executive_role.sql`
2. ✅ Ejecutar en Supabase
3. ✅ Verificar que el rol existe
4. ✅ Crear tabla `user_permissions`
5. ✅ Configurar RLS

### Fase 2: Backend (45 min)

1. ✅ Actualizar `types/index.ts` con nuevo rol
2. ✅ Crear hook `useUserPermissions.ts`
3. ✅ Actualizar `useCompanyPermissions.ts` para incluir executive
4. ✅ Crear servicio `permissionsService.ts` para CRUD de permisos

### Fase 3: Frontend (60 min)

1. ✅ Actualizar menú de navegación con permisos condicionales
2. ✅ Actualizar formularios con botones condicionales
3. ✅ Agregar "executive" al selector de roles en `/admin/users`
4. ✅ Crear página de gestión de permisos personalizados

### Fase 4: Testing (30 min)

1. ✅ Crear usuario ejecutivo de prueba
2. ✅ Verificar acceso a módulos permitidos
3. ✅ Verificar bloqueo de módulos restringidos
4. ✅ Probar creación sin aprobación

---

## 🔐 Caso de Uso: Doble Usuario

### Ejemplo: María Secretaria

**Como trabajadora**:
```
Email: maria.gonzalez@personal.com
Rol: user
Acceso: Portal trabajador (ver su info personal)
```

**Como ejecutiva**:
```
Email: maria.gonzalez@empresa.cl
Rol: executive
Acceso: Módulos de secretaría (crear documentos, gestionar cumplimientos)
```

### Cómo Crear

1. **Crear trabajador en `employees`** con email personal
2. **Crear usuario `user`** con email personal → Vincular con employee
3. **Crear usuario `executive`** con email empresarial → NO vincular con employee
4. **Asignar a empresa** en `company_users` con rol `executive`

```sql
-- Paso 1: Ya existe en employees
-- Paso 2: Ya existe el user con email personal

-- Paso 3: Crear usuario ejecutivo (desde portal admin)
-- Email: maria.gonzalez@empresa.cl
-- Rol: executive

-- Paso 4: Se asigna automáticamente a la empresa
```

---

## 📊 Diagrama de Estructura

```
┌─────────────────────────────────────────────┐
│ María González                              │
├─────────────────────────────────────────────┤
│                                             │
│  COMO TRABAJADORA (Portal Trabajador)      │
│  ┌──────────────────────────────────────┐  │
│  │ Email: maria@personal.com            │  │
│  │ Rol: user                            │  │
│  │ employees.user_id → user_profiles.id │  │
│  │ Ve: Contratos, vacaciones, anticipos │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  COMO EJECUTIVA (Portal Administrativo)    │
│  ┌──────────────────────────────────────┐  │
│  │ Email: maria@empresa.cl              │  │
│  │ Rol: executive                       │  │
│  │ company_users → user_profiles.id     │  │
│  │ Crea: Documentos, permisos (borrador)│  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🚀 Ventajas de Este Diseño

1. ✅ **Granularidad**: Permisos específicos por módulo y acción
2. ✅ **Escalabilidad**: Fácil agregar nuevos permisos sin cambiar código
3. ✅ **Flexibilidad**: Se pueden personalizar permisos por usuario
4. ✅ **Auditoría**: Se puede rastrear quién tiene qué permisos
5. ✅ **Separación**: Rol de trabajador y rol ejecutivo independientes

---

## 📋 Próximos Pasos

1. **Revisar y aprobar** este diseño
2. **Crear migración** SQL
3. **Implementar tipos** y hooks
4. **Actualizar UI** con permisos condicionales
5. **Probar** con usuario de prueba

---

**¿Aprobamos este diseño y procedemos con la implementación?** 🎯
