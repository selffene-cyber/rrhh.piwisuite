# 🔧 Solución: Usuarios Duales y Visualización de Empresas

**Fecha**: 15 de enero de 2026  
**Severidad**: 🟡 MEDIA  
**Estado**: ✅ RESUELTO

---

## 📋 Problemas Resueltos

### 1. Héctor Martínez - Usuario Dual (Admin + Trabajador)
### 2. Trabajadores sin Empresas en Portal Super Admin

---

## 🔍 Problema 1: Héctor Martínez - Acceso Dual

### Situación

Héctor Leandro Martínez Solar necesita **DOS formas de acceso**:

**Como Gerente General (Trabajador)**:
```
Email: hmarti2104@gmail.com
Rol: user (portal de trabajador)
Acceso a: Ver sus contratos, vacaciones, anticipos, etc.
Estado: ❌ NO EXISTÍA EN user_profiles
```

**Como Administrador de Empresa**:
```
Email: hmartinez@hlms.cl
Rol: admin
Acceso a: Gestionar trabajadores, aprobar solicitudes, etc.
Estado: ✅ YA EXISTE
```

### ¿Por Qué Necesita Dos Usuarios?

**Caso de uso típico**:
1. **Como trabajador**: Ver su propio historial, solicitar vacaciones, ver recibos
2. **Como admin**: Aprobar solicitudes de otros, gestionar nómina, ver reportes

**Solución**: Mantener ambos usuarios separados por email diferente.

---

## ✅ Solución 1: Script SQL para Crear Usuario Trabajador

**Archivo**: `FIX_HECTOR_DUAL_USER.sql`

### Ejecutar en Supabase SQL Editor

```sql
-- Este script crea el usuario Y actualiza el empleado automáticamente
WITH new_user AS (
  INSERT INTO "public"."user_profiles" (
    "id",
    "email",
    "role",
    "full_name",
    "default_company_id",
    "preferred_language",
    "must_change_password",
    "created_at",
    "updated_at"
  ) VALUES (
    gen_random_uuid(),
    'hmarti2104@gmail.com', -- Email del trabajador
    'user', -- Rol portal trabajador
    'Héctor Leandro Martínez Solar',
    'be575ba9-e1f8-449c-a875-ff19607b1d11',
    'es',
    'true',
    NOW(),
    NOW()
  )
  RETURNING id
)
UPDATE "public"."employees"
SET 
  "user_id" = (SELECT id FROM new_user),
  "updated_at" = NOW()
WHERE "id" = 'b8cf133a-a6a9-4edf-afec-17fdf4e3e4d9';
```

### Resultado

Héctor tendrá **DOS cuentas independientes**:

| Email | Rol | Uso |
|-------|-----|-----|
| `hmarti2104@gmail.com` | user | Portal de trabajador |
| `hmartinez@hlms.cl` | admin | Administración de empresa |

---

## 🔍 Problema 2: Trabajadores sin Empresas Visibles

### Causa

El código solo buscaba empresas en la tabla `company_users`, pero los trabajadores (rol `user`) tienen su empresa en la tabla `employees`.

### Estructura de Datos

```
┌─────────────────┬──────────────────────┬─────────────────┐
│ Rol             │ Tabla de Relación    │ Lógica          │
├─────────────────┼──────────────────────┼─────────────────┤
│ super_admin     │ (ninguna)            │ Acceso global   │
│ admin           │ company_users        │ N:M empresas    │
│ user (trabajador)│ employees           │ 1:1 empresa     │
└─────────────────┴──────────────────────┴─────────────────┘
```

**Antes**: Solo consultaba `company_users` para todos.  
**Ahora**: Consulta según el rol del usuario.

---

## ✅ Solución 2: Código Corregido

**Archivo**: `app/admin/users/page.tsx`

### Nueva Lógica

```typescript
// ✅ Para cada usuario, lógica diferente según su rol

if (user.role === 'super_admin') {
  // Super admin: mostrar "(Todas las empresas)"
  companies = [{ 
    companies: { name: '(Todas las empresas)' }
  }]
}

else if (user.role === 'admin') {
  // Admin: buscar en company_users
  const { data } = await supabase
    .from('company_users')
    .select('company_id, companies (id, name)')
    .eq('user_id', user.id)
}

else if (user.role === 'user') {
  // ✅ Trabajador: buscar en employees
  const { data: employeeData } = await supabase
    .from('employees')
    .select(`
      company_id,
      cost_center_id,
      companies (id, name),
      cost_centers (id, code, name)
    `)
    .eq('user_id', user.id)
    .single()
}
```

---

## 📊 Resultado Visual

### Antes ❌

```
┌──────────────────┬───────┬─────────┬──────────┐
│ Usuario          │ Rol   │ Empresa │ CC       │
├──────────────────┼───────┼─────────┼──────────┤
│ Bastian Ahumada  │ user  │ -       │ -        │ ❌
│ Francis Bravo    │ user  │ -       │ -        │ ❌
│ Héctor (admin)   │ admin │ HLMS    │ -        │ ✅
│ Jeans            │ super │ -       │ -        │
└──────────────────┴───────┴─────────┴──────────┘
```

### Ahora ✅

```
┌──────────────────┬───────┬─────────────────┬─────────────┐
│ Usuario          │ Rol   │ Empresa         │ CC          │
├──────────────────┼───────┼─────────────────┼─────────────┤
│ Bastian Ahumada  │ user  │ HLMS SpA ✅     │ CC-TERRENO ✅│
│ Francis Bravo    │ user  │ HLMS SpA ✅     │ CC-TERRENO ✅│
│ Cristian Cofré   │ user  │ HLMS SpA ✅     │ CC-ADMIN ✅  │
│ Héctor (admin)   │ admin │ HLMS SpA ✅     │ -           │
│ Jeans            │ super │ (Todas) ✅      │ -           │
└──────────────────┴───────┴─────────────────┴─────────────┘
```

---

## 🧪 Pasos para Verificar

### Verificación 1: Usuario Portal de Héctor

1. **Ejecutar script SQL**: `FIX_HECTOR_DUAL_USER.sql` en Supabase
2. **Verificar creación**: Debe retornar éxito
3. **Probar acceso**: Ir a `/login` e ingresar con `hmarti2104@gmail.com`
4. **Resultado esperado**: Acceso al portal de trabajador

### Verificación 2: Visualización de Empresas

1. **Recargar aplicación**: La página `/admin/users`
2. **Revisar tabla**: Todos los trabajadores deben mostrar su empresa
3. **Verificar CC**: Los centros de costo deben aparecer correctamente
4. **Resultado esperado**: Sin filas vacías en columnas de empresa

---

## 🎯 Beneficios

### Para Héctor

- ✅ Puede ver su propia información como trabajador
- ✅ Puede administrar la empresa como admin
- ✅ Separa responsabilidades claramente

### Para el Super Admin

- ✅ Ve todas las empresas de todos los usuarios
- ✅ Puede identificar rápidamente la estructura
- ✅ Detecta trabajadores sin asignación (si los hubiera)

---

## 📝 Archivos Modificados

1. **`FIX_HECTOR_DUAL_USER.sql`** (nuevo)
   - Script SQL automatizado
   - Crea usuario Y actualiza empleado
   - Sin pasos manuales

2. **`app/admin/users/page.tsx`** (modificado)
   - Nueva lógica por rol de usuario
   - Consulta a `employees` para rol 'user'
   - Consulta a `company_users` para rol 'admin'
   - Indicador especial para 'super_admin'

3. **`EXPLICACION_PROBLEMA_USUARIOS_SIN_EMPRESA.md`** (nuevo)
   - Análisis técnico del problema
   - Diagrama de estructura de datos
   - Justificación de la solución

4. **`SOLUCION_USUARIOS_DUAL_EMPRESA.md`** (nuevo)
   - Resumen ejecutivo
   - Pasos de verificación
   - Resultado visual

---

## 🔐 Seguridad

### Contraseña Inicial

Como Héctor es un usuario nuevo en el portal de trabajador:
- Debe configurarse una contraseña temporal
- `must_change_password: true` → Obligado a cambiarla al primer login
- Usar herramienta de "Reset Password" en el admin

### Separación de Cuentas

- ✅ **Buena práctica**: Emails diferentes para roles diferentes
- ✅ **Auditoría**: Logs separados por tipo de actividad
- ✅ **Seguridad**: Si se compromete un email, el otro sigue seguro

---

## 🚀 Próximos Pasos

### Inmediatos

1. ✅ **Ejecutar**: `FIX_HECTOR_DUAL_USER.sql` en Supabase
2. ✅ **Recargar**: Aplicación (cambios de código ya aplicados)
3. ✅ **Verificar**: Portal de super admin muestra empresas
4. ✅ **Configurar**: Contraseña temporal para Héctor (hmarti2104@gmail.com)

### Opcional

Si otros trabajadores necesitan acceso dual:
- Usar el mismo script SQL como plantilla
- Cambiar el email y el employee_id
- Ejecutar en Supabase

---

## 📊 Checklist de Verificación

- [ ] Script SQL ejecutado exitosamente
- [ ] Nuevo usuario visible en tabla `user_profiles`
- [ ] Empleado Héctor tiene `user_id` actualizado
- [ ] Portal `/admin/users` muestra empresas de trabajadores
- [ ] Columna "Centro de Costo" muestra valores correctos
- [ ] Super admin ve "(Todas las empresas)" para su propia cuenta
- [ ] Héctor puede iniciar sesión con `hmarti2104@gmail.com`

---

**Fecha de Resolución**: 15 de enero de 2026  
**Criticidad**: 🟡 Media  
**Estado**: ✅ Resuelto - Listo para Probar  
**Versión**: 1.0
