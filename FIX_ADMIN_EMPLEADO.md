# 🔧 Fix: Separar Usuario Admin de Empleado

## 🎯 Problema Identificado

### Situación Actual:
```
Usuario: hmartinez@hlms.cl
├── ✅ Es ADMIN en company_users (correcto)
└── ❌ También está vinculado como EMPLOYEE en tabla employees (problema)
    └── Por eso lo redirige al portal de trabajador
```

### ¿Por qué pasa esto?
El middleware verifica en este orden:
1. ¿Es super_admin? → No
2. ¿Es empleado? → **SÍ** (tiene `user_id` vinculado)
3. ¿Es admin/owner? → **SÍ**, pero ya lo detectó como empleado

**Resultado**: Lo redirige al portal de empleado aunque sea admin.

---

## 🎯 Solución

### Objetivo:
```
hmartinez@hlms.cl    →  SOLO ADMIN (no empleado)
hmarti2104@gmail.com →  Portal de Empleado
```

### Pasos:
1. ✅ **Desvincular** `user_id` del empleado
2. ✅ **Cambiar** email del empleado a `hmarti2104@gmail.com`
3. ⚪ **Opcional**: Crear usuario auth para `hmarti2104@gmail.com`

---

## 📋 Método 1: Migración Automática (Recomendado)

### Ejecutar en Supabase:

```bash
# Via CLI
supabase db push

# O via Dashboard → SQL Editor
# Ejecutar: supabase/migrations/092_fix_admin_employee_separation.sql
```

### ¿Qué hace la migración?
```sql
1. Busca usuario hmartinez@hlms.cl en auth.users
2. Encuentra el empleado vinculado a ese user_id
3. Desvincula el user_id (lo pone en NULL)
4. Cambia el email del empleado a hmarti2104@gmail.com
5. Muestra un resumen completo
```

### Output esperado:
```
✅ Usuario admin encontrado: [UUID]
✅ Empleado encontrado: Héctor Leandro Martínez Solar
✅ user_id desvinculado del empleado
✅ Email del empleado cambiado a: hmarti2104@gmail.com

========================================
RESUMEN DE CAMBIOS:
========================================
Usuario Admin:
  Email: hmartinez@hlms.cl
  Rol: admin (en company_users)

Empleado:
  Nombre: Héctor Leandro Martínez Solar
  Email: hmarti2104@gmail.com (NUEVO)
  User ID: NULL (DESVINCULADO)
========================================
```

---

## 📋 Método 2: SQL Manual (Alternativo)

Si prefieres hacerlo manual, ejecuta esto en el SQL Editor:

```sql
-- 1. Buscar el user_id del admin
SELECT id, email FROM auth.users WHERE email = 'hmartinez@hlms.cl';
-- Copia el UUID que te devuelve

-- 2. Ver el empleado vinculado
SELECT id, full_name, email, user_id, company_id 
FROM employees 
WHERE user_id = '[PEGA EL UUID AQUÍ]';

-- 3. Desvincular y cambiar email (en UNA transacción)
BEGIN;

-- Desvincular user_id
UPDATE employees
SET user_id = NULL
WHERE user_id = '[PEGA EL UUID AQUÍ]';

-- Cambiar email del empleado
UPDATE employees
SET email = 'hmarti2104@gmail.com'
WHERE email = 'hmartinez@hlms.cl';

-- Confirmar cambios
COMMIT;

-- 4. Verificar resultado
SELECT id, full_name, email, user_id 
FROM employees 
WHERE email = 'hmarti2104@gmail.com';
```

---

## 🧪 Verificación Post-Cambio

### 1. Verificar en la base de datos:

```sql
-- Ver usuario admin (debe existir)
SELECT id, email FROM auth.users WHERE email = 'hmartinez@hlms.cl';

-- Ver roles admin (debe tener registros)
SELECT cu.role, c.name as company_name
FROM company_users cu
JOIN companies c ON c.id = cu.company_id
WHERE cu.user_id = (SELECT id FROM auth.users WHERE email = 'hmartinez@hlms.cl');

-- Ver empleado (NO debe tener user_id)
SELECT id, full_name, email, user_id
FROM employees
WHERE email = 'hmarti2104@gmail.com';
```

### 2. Probar en la aplicación:

#### Test 1: Login como Admin
```bash
1. Ir a http://localhost:3007/login
2. Ingresar: hmartinez@hlms.cl + contraseña
3. ✅ Debe ir al Dashboard (NO al portal empleado)
4. ✅ Debe ver todas las opciones de admin
```

#### Test 2: Empleado (si creas usuario)
```bash
1. Crear usuario para hmarti2104@gmail.com desde la ficha del empleado
2. Login con hmarti2104@gmail.com
3. ✅ Debe ir al Portal de Empleado
```

---

## 🔄 Flujo Completo Explicado

### ANTES:
```
┌─────────────────────────────────────────────┐
│ auth.users                                   │
│ ├── email: hmartinez@hlms.cl                │
│ └── id: [UUID-123]                          │
└─────────────────────────────────────────────┘
           │
           ├──────────────────────────────────┐
           │                                   │
           ▼                                   ▼
┌──────────────────────┐       ┌──────────────────────┐
│ company_users        │       │ employees            │
│ ├── user_id: [UUID] │       │ ├── user_id: [UUID]  │ ⚠️ PROBLEMA
│ ├── role: admin      │       │ ├── email: hmartinez │
│ └── status: active   │       │ └── full_name: ...   │
└──────────────────────┘       └──────────────────────┘
                                        │
                                        └──> Middleware detecta
                                             como empleado ❌
```

### DESPUÉS:
```
┌─────────────────────────────────────────────┐
│ auth.users                                   │
│ ├── email: hmartinez@hlms.cl                │
│ └── id: [UUID-123]                          │
└─────────────────────────────────────────────┘
           │
           │
           ▼
┌──────────────────────┐       ┌──────────────────────┐
│ company_users        │       │ employees            │
│ ├── user_id: [UUID] │       │ ├── user_id: NULL    │ ✅ DESVINCULADO
│ ├── role: admin      │       │ ├── email: hmarti... │ ✅ NUEVO EMAIL
│ └── status: active   │       │ └── full_name: ...   │
└──────────────────────┘       └──────────────────────┘
           │
           └──> Solo Admin ✅
```

---

## 📚 Entendiendo la Arquitectura

### Tabla: `auth.users`
- Usuario de autenticación (Supabase Auth)
- Email único para login
- Genera el `user_id` principal

### Tabla: `company_users`
- **Roles administrativos**: owner, admin
- Vincula `user_id` con empresas
- Define permisos de gestión

### Tabla: `employees`
- **Trabajadores** de la empresa
- Puede tener o no tener `user_id` (portal de empleado)
- El campo `email` es independiente de auth.users

### Flujo de Login:
```
1. Login con email + password
   └── Autentica en auth.users

2. Middleware verifica:
   ├── ¿Es super_admin? → Dashboard
   ├── ¿Tiene user_id en employees?
   │   ├── SÍ → ¿Es admin/owner en company_users?
   │   │   ├── SÍ → Dashboard Admin ✅
   │   │   └── NO → Portal Empleado ✅
   │   └── NO → Dashboard Admin ✅
   └── ¿Es admin/owner en company_users?
       └── SÍ → Dashboard Admin ✅
```

---

## ⚠️ Notas Importantes

### 1. **Separación de Roles**:
```
hmartinez@hlms.cl    = Usuario administrativo (company_users)
hmarti2104@gmail.com = Usuario empleado (employees)
```

### 2. **¿Por qué desvincular `user_id`?**
- El middleware detecta empleados por `user_id` en `employees`
- Si `user_id` está NULL, no lo considera empleado
- Así puede ser **solo admin**

### 3. **¿Cómo accede el empleado al portal?**
- Opción A: Crear usuario para `hmarti2104@gmail.com` desde la ficha
- Opción B: Dejarlo sin acceso (solo existe como registro)

### 4. **¿Es seguro?**
- ✅ No afecta otros empleados
- ✅ No afecta roles de admin
- ✅ Migración idempotente (puede ejecutarse múltiples veces)
- ✅ Usa transacciones

---

## 🚀 Próximos Pasos

### Después de ejecutar la migración:

#### ✅ Verificar:
```sql
-- Usuario admin (debe existir y tener rol admin)
SELECT 
  u.email as admin_email,
  cu.role,
  c.name as company
FROM auth.users u
JOIN company_users cu ON cu.user_id = u.id
JOIN companies c ON c.id = cu.company_id
WHERE u.email = 'hmartinez@hlms.cl';

-- Empleado (NO debe tener user_id)
SELECT full_name, email, user_id
FROM employees
WHERE email = 'hmarti2104@gmail.com';
```

#### ⚪ Opcional: Crear acceso al portal para el empleado
```
1. Ir a Ficha del Empleado
2. Click en "Crear Usuario"
3. Se creará auth.users para hmarti2104@gmail.com
4. Se vinculará automáticamente
5. El empleado podrá acceder al portal
```

---

## ❓ FAQs

### ¿Puedo tener el mismo email en admin y empleado?
**No**. Si el email es el mismo, el middleware siempre detectará el vínculo con `employees` y lo considerará empleado (aunque sea admin).

### ¿Qué pasa si elimino el empleado?
Si eliminas el empleado, el usuario admin (`hmartinez@hlms.cl`) no se afecta. Son registros independientes.

### ¿Puedo revertir esto?
Sí, solo necesitas:
```sql
UPDATE employees
SET user_id = '[UUID del admin]',
    email = 'hmartinez@hlms.cl'
WHERE email = 'hmarti2104@gmail.com';
```

### ¿Esto afecta a otros usuarios?
No, solo afecta al empleado que tenga el `user_id` del admin.

---

## 📊 Resumen Visual

### Estado Final:

| Email                  | Rol en Sistema | Tabla          | Acceso                |
|------------------------|---------------|----------------|-----------------------|
| hmartinez@hlms.cl      | Admin/Owner   | company_users  | Dashboard Admin ✅    |
| hmarti2104@gmail.com   | Empleado      | employees      | Portal Empleado* ⚪   |

\* Requiere crear usuario auth si quieres que acceda al portal

---

**Fecha**: 2025-01-08  
**Migración**: 092  
**Estado**: ✅ Listo para ejecutar

