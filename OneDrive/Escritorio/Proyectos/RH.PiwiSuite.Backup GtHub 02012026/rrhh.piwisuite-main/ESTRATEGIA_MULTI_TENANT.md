# Estrategia de Implementación: Multi-Tenancy y Administración de Empresas

## 📋 Resumen Ejecutivo

Esta estrategia propone transformar la aplicación de un sistema mono-empresa a un sistema multi-tenant donde:
- Múltiples empresas pueden usar la misma instancia de la aplicación
- Cada empresa tiene sus propios usuarios, trabajadores, contratos y liquidaciones
- Un Super Administrador puede gestionar todas las empresas y usuarios desde un panel centralizado
- Los usuarios regulares solo ven y gestionan datos de su(s) empresa(s) asignada(s)

---

## 🎯 Objetivos

1. **Multi-tenancy**: Permitir múltiples empresas independientes en la misma base de datos
2. **Asignación de usuarios a empresas**: Relación muchos-a-muchos entre usuarios y empresas
3. **Aislamiento de datos**: Garantizar que cada empresa solo vea sus propios datos
4. **Panel de administración centralizado**: Interfaz exclusiva para Super Admin
5. **Migración sin pérdida de datos**: Compatibilidad con la estructura actual

---

## 🏗️ Arquitectura de Base de Datos

### 1. Nueva Tabla: `company_users` (Relación Usuario-Empresa)

**Propósito**: Establecer relación muchos-a-muchos entre usuarios y empresas, con roles específicos por empresa.

```sql
CREATE TABLE company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX idx_company_users_user ON company_users(user_id);
CREATE INDEX idx_company_users_company ON company_users(company_id);
CREATE INDEX idx_company_users_status ON company_users(status);
```

**Campos importantes**:
- `user_id`: Usuario de Supabase Auth
- `company_id`: Empresa a la que pertenece
- `role`: Rol del usuario EN ESA EMPRESA (owner, admin, user)
- `status`: Estado de la relación (active, inactive, pending)
- `invited_by`: Usuario que invitó (para auditoría)
- `joined_at`: Fecha en que aceptó la invitación

### 2. Modificaciones a `user_profiles`

**Agregar campos** (opcional, pero recomendado):
```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS default_company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'es';
```

**Nota**: El campo `role` en `user_profiles` se mantiene para roles del sistema (super_admin, admin, user), mientras que `company_users.role` es el rol dentro de cada empresa.

### 3. Modificaciones a `companies`

**Agregar campos**:
```sql
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT 100;
```

**Campos importantes**:
- `owner_id`: Usuario propietario/creador de la empresa
- `status`: Estado de la empresa (para suspender si es necesario)
- `subscription_tier`: Nivel de suscripción (para futuras funcionalidades de facturación)
- `max_users` / `max_employees`: Límites por plan

---

## 🔐 Modelo de Roles y Permisos

### Roles del Sistema (en `user_profiles.role`)
- **`super_admin`**: Acceso completo al sistema, puede gestionar todas las empresas
- **`admin`**: Usuario administrativo del sistema (si se necesita)
- **`user`**: Usuario normal del sistema

### Roles por Empresa (en `company_users.role`)
- **`owner`**: Propietario de la empresa, puede gestionar usuarios y configuraciones
- **`admin`**: Administrador de la empresa, puede gestionar trabajadores y liquidaciones
- **`user`**: Usuario regular, puede ver y crear datos según permisos

### Matriz de Permisos

| Acción | Super Admin | Owner | Admin | User |
|--------|------------|-------|-------|------|
| Ver panel de administración global | ✅ | ❌ | ❌ | ❌ |
| Crear/Eliminar empresas | ✅ | ❌ | ❌ | ❌ |
| Asignar usuarios a empresas | ✅ | ✅ (solo su empresa) | ❌ | ❌ |
| Ver todas las empresas | ✅ | ❌ | ❌ | ❌ |
| Gestionar trabajadores | ✅ (todas) | ✅ (solo su empresa) | ✅ (solo su empresa) | ⚠️ (limitado) |
| Crear liquidaciones | ✅ (todas) | ✅ (solo su empresa) | ✅ (solo su empresa) | ⚠️ (según config) |
| Configurar empresa | ✅ (todas) | ✅ (solo su empresa) | ⚠️ (limitado) | ❌ |

---

## 🛡️ Row Level Security (RLS) Policies

### Objetivo
Garantizar que los usuarios solo puedan ver/modificar datos de las empresas a las que pertenecen.

### Funciones auxiliares necesarias

```sql
-- Función: Verificar si un usuario pertenece a una empresa
CREATE OR REPLACE FUNCTION user_belongs_to_company(
  p_user_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener empresas del usuario actual
CREATE OR REPLACE FUNCTION user_companies()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT company_id
  FROM company_users
  WHERE user_id = auth.uid()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Políticas RLS

#### Para `companies`
```sql
-- Super admin ve todas las empresas
CREATE POLICY "Super admins see all companies"
ON companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Usuarios ven solo sus empresas asignadas
CREATE POLICY "Users see their companies"
ON companies FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), id)
);
```

#### Para `employees`
```sql
-- Super admin ve todos los empleados
CREATE POLICY "Super admins see all employees"
ON employees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Usuarios ven empleados de sus empresas
CREATE POLICY "Users see employees of their companies"
ON employees FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
);
```

**Similar para**: `payroll_periods`, `payroll_slips`, `payroll_items`, `contracts`, `loans`, `advances`, `vacations`, etc.

---

## 🎨 Cambios en el Frontend

### 1. Nuevo Componente: Selector de Empresa

**Ubicación**: `components/CompanySelector.tsx`

**Funcionalidad**:
- Dropdown en el header/layout que muestra la empresa actual
- Si el usuario tiene múltiples empresas, permite cambiar entre ellas
- Guarda la selección en localStorage y contexto
- Solo visible si el usuario tiene acceso a más de una empresa (excepto Super Admin)

### 2. Context de Empresa Actual

**Ubicación**: `lib/contexts/CompanyContext.tsx`

**Funcionalidad**:
- React Context que almacena la empresa actualmente seleccionada
- Provee funciones para cambiar de empresa
- Se inicializa con la empresa por defecto del usuario o la primera disponible
- Persiste la selección en localStorage

### 3. Hook Personalizado: `useCurrentCompany`

**Ubicación**: `lib/hooks/useCurrentCompany.ts`

**Funcionalidad**:
- Hook que devuelve la empresa actual del contexto
- Maneja la carga de datos de la empresa
- Proporciona funciones helper para verificar permisos

### 4. Modificaciones a Queries Existentes

**Patrón a seguir**:
Todas las consultas que actualmente usan `company_id` deben filtrar por la empresa actual del usuario:

```typescript
// ANTES
const { data } = await supabase
  .from('employees')
  .select('*')

// DESPUÉS
const { companyId } = useCurrentCompany()
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('company_id', companyId)
```

**O mejor aún**, confiar en RLS y solo seleccionar, dejando que las políticas filtren automáticamente.

### 5. Página de Administración: `/admin/companies`

**Ruta**: `app/admin/companies/page.tsx`

**Funcionalidades**:
- **Lista de empresas**: Tabla con todas las empresas del sistema
- **Crear empresa**: Formulario para crear nueva empresa
- **Editar empresa**: Modificar datos de empresa existente
- **Eliminar empresa**: Eliminar empresa (con confirmación)
- **Gestión de usuarios**: Asignar/remover usuarios a empresas
- **Ver estadísticas**: Número de usuarios, empleados, liquidaciones por empresa
- **Filtros y búsqueda**: Buscar empresas por nombre, RUT, etc.
- **Acciones en lote**: Activar/desactivar múltiples empresas

### 6. Página de Gestión de Usuarios por Empresa: `/admin/companies/[id]/users`

**Ruta**: `app/admin/companies/[id]/users/page.tsx`

**Funcionalidades**:
- Lista de usuarios asignados a la empresa
- Invitar nuevo usuario (por email)
- Asignar usuario existente
- Cambiar rol del usuario en la empresa
- Remover usuario de la empresa
- Ver historial de actividad del usuario en la empresa

### 7. Modificaciones a `/app/settings/page.tsx`

**Cambios necesarios**:
- Eliminar `.limit(1).single()` 
- Filtrar por `company_id` de la empresa actual
- Si el usuario tiene múltiples empresas, mostrar selector
- Agregar validación de permisos (solo owner/admin puede editar)

### 8. Modificaciones a todas las páginas existentes

**Patrón general**:
- Agregar `useCurrentCompany()` al inicio del componente
- Filtrar queries por `company_id`
- Agregar validación de permisos cuando corresponda
- Mostrar error si el usuario no tiene acceso a ninguna empresa

---

## 🔄 Flujo de Usuario

### Flujo 1: Super Admin crea nueva empresa

1. Super Admin accede a `/admin/companies`
2. Click en "Nueva Empresa"
3. Completa formulario (nombre, RUT, dirección, etc.)
4. Selecciona usuario propietario (o se asigna automáticamente)
5. Sistema crea:
   - Registro en `companies`
   - Registro en `company_users` (owner)
   - Empresa aparece en lista

### Flujo 2: Owner invita usuario a su empresa

1. Owner accede a `/admin/companies/[id]/users` (o desde settings)
2. Click en "Invitar Usuario"
3. Ingresa email del usuario
4. Selecciona rol (admin, user)
5. Sistema:
   - Si el usuario existe: Crea registro en `company_users` con status='active'
   - Si no existe: Crea registro con status='pending' y envía email de invitación
6. Usuario recibe email y acepta invitación
7. Usuario puede acceder a la empresa

### Flujo 3: Usuario con múltiples empresas cambia de empresa

1. Usuario ve dropdown de empresa en header
2. Selecciona otra empresa
3. Sistema:
   - Actualiza contexto
   - Guarda selección en localStorage
   - Recarga datos filtrados por nueva empresa
   - Redirige a página principal o dashboard

### Flujo 4: Usuario regular accede al sistema

1. Usuario inicia sesión
2. Sistema:
   - Verifica empresas asignadas
   - Si tiene solo una: Establece como empresa actual automáticamente
   - Si tiene múltiples: Muestra selector
   - Si no tiene ninguna: Muestra mensaje de error
3. Usuario ve datos filtrados por empresa actual

---

## 📁 Estructura de Archivos Propuesta

```
app/
├── admin/
│   ├── companies/
│   │   ├── page.tsx                    # Lista de empresas
│   │   ├── new/
│   │   │   └── page.tsx                # Crear empresa
│   │   └── [id]/
│   │       ├── page.tsx                # Detalles/Editar empresa
│   │       └── users/
│   │           └── page.tsx            # Gestionar usuarios
│   └── users/
│       └── page.tsx                    # Gestión global de usuarios (ya existe)
│
lib/
├── contexts/
│   └── CompanyContext.tsx              # Context de empresa actual
├── hooks/
│   ├── useCurrentCompany.ts            # Hook para empresa actual
│   ├── useUserCompanies.ts             # Hook para empresas del usuario
│   └── useCompanyPermissions.ts        # Hook para verificar permisos
├── services/
│   ├── companyService.ts               # Servicios de empresas
│   └── companyUserService.ts           # Servicios de relación usuario-empresa
└── utils/
    └── rls.ts                          # Utilidades para RLS (si necesario)

components/
├── CompanySelector.tsx                 # Selector de empresa
├── CompanySwitcher.tsx                 # Componente para cambiar empresa
└── ProtectedRoute.tsx                  # Componente para rutas protegidas (mejora)

supabase/
├── migrations/
│   ├── 001_create_company_users.sql    # Crear tabla company_users
│   ├── 002_modify_companies.sql        # Modificar tabla companies
│   ├── 003_modify_user_profiles.sql    # Modificar user_profiles (opcional)
│   ├── 004_create_rls_functions.sql    # Funciones auxiliares RLS
│   └── 005_create_rls_policies.sql     # Políticas RLS
└── seed/
    └── migrate_existing_data.sql       # Script para migrar datos existentes
```

---

## 🔄 Migración de Datos Existentes

### Script de Migración

**Objetivo**: Migrar la aplicación actual (mono-empresa) a multi-tenant sin perder datos.

```sql
-- 1. Crear tabla company_users si no existe
-- (Ya definida arriba)

-- 2. Asignar empresa existente a todos los usuarios actuales
-- Esto asume que hay una empresa en la tabla companies
INSERT INTO company_users (user_id, company_id, role, status, joined_at)
SELECT 
  up.id as user_id,
  c.id as company_id,
  CASE 
    WHEN up.role = 'super_admin' THEN 'owner'
    WHEN up.role = 'admin' THEN 'admin'
    ELSE 'user'
  END as role,
  'active' as status,
  NOW() as joined_at
FROM user_profiles up
CROSS JOIN companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_users cu
  WHERE cu.user_id = up.id AND cu.company_id = c.id
);

-- 3. Establecer owner_id en companies si no está definido
UPDATE companies c
SET owner_id = (
  SELECT user_id 
  FROM company_users cu
  WHERE cu.company_id = c.id
    AND cu.role = 'owner'
  LIMIT 1
)
WHERE owner_id IS NULL;

-- 4. Establecer default_company_id en user_profiles
UPDATE user_profiles up
SET default_company_id = (
  SELECT company_id
  FROM company_users cu
  WHERE cu.user_id = up.id
    AND cu.status = 'active'
  ORDER BY cu.created_at ASC
  LIMIT 1
)
WHERE default_company_id IS NULL;
```

---

## ✅ Lista de Verificación de Implementación

### Fase 1: Base de Datos
- [ ] Crear tabla `company_users`
- [ ] Modificar tabla `companies` (agregar campos)
- [ ] Modificar tabla `user_profiles` (opcional)
- [ ] Crear funciones auxiliares RLS
- [ ] Crear políticas RLS para todas las tablas relevantes
- [ ] Ejecutar script de migración de datos

### Fase 2: Backend/Servicios
- [ ] Crear `companyService.ts`
- [ ] Crear `companyUserService.ts`
- [ ] Crear API routes:
  - [ ] `POST /api/admin/companies` (crear empresa)
  - [ ] `GET /api/admin/companies` (listar empresas)
  - [ ] `PUT /api/admin/companies/[id]` (editar empresa)
  - [ ] `DELETE /api/admin/companies/[id]` (eliminar empresa)
  - [ ] `POST /api/admin/companies/[id]/users` (invitar usuario)
  - [ ] `DELETE /api/admin/companies/[id]/users/[userId]` (remover usuario)
  - [ ] `PUT /api/admin/companies/[id]/users/[userId]` (actualizar rol)

### Fase 3: Frontend - Context y Hooks
- [ ] Crear `CompanyContext.tsx`
- [ ] Crear `useCurrentCompany.ts`
- [ ] Crear `useUserCompanies.ts`
- [ ] Crear `useCompanyPermissions.ts`

### Fase 4: Frontend - Componentes
- [ ] Crear `CompanySelector.tsx`
- [ ] Crear `CompanySwitcher.tsx`
- [ ] Modificar `Layout.tsx` para incluir selector de empresa

### Fase 5: Frontend - Páginas Admin
- [ ] Crear `/admin/companies/page.tsx` (lista)
- [ ] Crear `/admin/companies/new/page.tsx` (crear)
- [ ] Crear `/admin/companies/[id]/page.tsx` (editar)
- [ ] Crear `/admin/companies/[id]/users/page.tsx` (gestionar usuarios)

### Fase 6: Frontend - Modificar Páginas Existentes
- [ ] Modificar `/app/settings/page.tsx`
- [ ] Modificar `/app/employees/page.tsx`
- [ ] Modificar `/app/payroll/page.tsx`
- [ ] Modificar todas las páginas que consultan datos por empresa
- [ ] Agregar validación de permisos donde corresponda

### Fase 7: Testing y Validación
- [ ] Probar creación de empresa
- [ ] Probar asignación de usuarios
- [ ] Probar cambio de empresa
- [ ] Probar RLS (usuarios solo ven sus datos)
- [ ] Probar permisos (owner/admin/user)
- [ ] Probar migración de datos existentes
- [ ] Probar casos edge (usuario sin empresas, empresa sin usuarios, etc.)

---

## 🚨 Consideraciones Importantes

### Seguridad
1. **RLS es crítico**: Sin RLS correcto, los usuarios podrían ver datos de otras empresas
2. **Validación en frontend y backend**: Nunca confiar solo en frontend para seguridad
3. **Auditoría**: Considerar agregar tabla de logs para cambios importantes
4. **Rate limiting**: Implementar en APIs de administración

### Performance
1. **Índices**: Asegurar índices en `company_users.user_id` y `company_users.company_id`
2. **Caché**: Considerar caché de empresa actual en cliente
3. **Paginación**: Implementar en listados grandes (empresas, usuarios)

### UX
1. **Feedback claro**: Usuario debe saber siempre en qué empresa está trabajando
2. **Transiciones suaves**: Cambio de empresa no debe causar "flickering"
3. **Persistencia**: Recordar última empresa seleccionada
4. **Permisos claros**: Mostrar mensajes claros cuando usuario no tiene permisos

### Escalabilidad Futura
1. **Subdominios**: Considerar subdominios por empresa en el futuro (empresa1.app.com)
2. **Facturación**: La estructura de `subscription_tier` permite agregar planes
3. **Multi-idioma**: Campo `preferred_language` preparado para i18n
4. **Webhooks**: Considerar webhooks para eventos importantes (nuevo usuario, nueva empresa)

---

## 📊 Métricas de Éxito

- ✅ Usuarios pueden crear y gestionar múltiples empresas
- ✅ Datos están completamente aislados entre empresas
- ✅ Super Admin puede ver y gestionar todas las empresas
- ✅ Migración de datos existentes sin pérdida
- ✅ Performance no se degrada significativamente
- ✅ UX es clara y fácil de usar

---

## 🎓 Conclusión

Esta estrategia proporciona una base sólida para convertir la aplicación en un sistema multi-tenant completo. La implementación debe hacerse en fases, comenzando por la base de datos y RLS, luego servicios y finalmente el frontend.

El diseño es escalable y permite futuras mejoras como facturación, subdominios, y funcionalidades más avanzadas de gestión de usuarios.

