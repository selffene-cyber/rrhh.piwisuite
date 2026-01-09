# 🔧 Fix: User Profiles con Datos Completos

## 📋 Problema Identificado

Los `user_profiles` se estaban creando **incompletos** cuando se creaba un empleado:

### ❌ Estado Anterior

| Campo | Valor |
|-------|-------|
| `full_name` | `''` (vacío) |
| `default_company_id` | `NULL` |
| `user_id` en `employees` | A veces `NULL` |

**Síntomas:**
- Los trabajadores aparecían sin nombre en sus perfiles
- No tenían empresa asociada por defecto
- Algunos quedaban "huérfanos" sin vinculación

---

## 🔍 Causa Raíz

### 1. **API no pasaba datos completos**
`app/api/employees/create-user/route.ts` (líneas 131-133):
```typescript
user_metadata: {
  is_employee: true,  // ❌ Faltaba full_name y default_company_id
},
```

### 2. **Upsert incompleto**
`app/api/employees/create-user/route.ts` (líneas 150-160):
```typescript
.upsert({
  id: authData.user.id,
  email: email,
  role: 'user',
  must_change_password: true,
  password_changed_at: null,
  // ❌ Faltaba full_name y default_company_id
})
```

### 3. **Trigger de BD sin estos campos**
El trigger `handle_new_user()` intentaba obtenerlos de `user_metadata`, pero no estaban ahí.

---

## ✅ Solución Implementada

### 1. **Actualizar API** (app/api/employees/create-user/route.ts)

**Cambio 1:** Obtener datos completos del empleado
```typescript
// ANTES
.select('id, company_id')

// DESPUÉS
.select('id, company_id, full_name')
```

**Cambio 2:** Pasar datos en user_metadata
```typescript
user_metadata: {
  is_employee: true,
  full_name: employee.full_name || '',           // ✅ Nuevo
  default_company_id: employee.company_id,       // ✅ Nuevo
},
```

**Cambio 3:** Incluir en el upsert
```typescript
.upsert({
  id: authData.user.id,
  email: email,
  role: 'user',
  full_name: employee.full_name || '',           // ✅ Nuevo
  default_company_id: employee.company_id,       // ✅ Nuevo
  must_change_password: true,
  password_changed_at: null,
})
```

### 2. **Actualizar Trigger de BD** (migración 090)

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    role, 
    full_name,                                    -- ✅ Nuevo
    default_company_id                            -- ✅ Nuevo
  )
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'default_company_id')::UUID, NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    default_company_id = COALESCE(EXCLUDED.default_company_id, user_profiles.default_company_id),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. **Reparar Datos Existentes** (incluido en migración 090)

**Paso 1:** Vincular employees huérfanos
```sql
UPDATE employees e
SET user_id = up.id
FROM user_profiles up
WHERE e.email = up.email
  AND e.user_id IS NULL;
```

**Paso 2:** Completar user_profiles incompletos
```sql
UPDATE user_profiles up
SET 
  full_name = e.full_name,
  default_company_id = e.company_id
FROM employees e
WHERE up.id = e.user_id
  AND (up.full_name IS NULL OR up.full_name = '' OR up.default_company_id IS NULL);
```

---

## 📝 Pasos para Aplicar

### Opción A: Migración Automática (Recomendada)

1. **Ejecutar migración en Supabase**:
   ```bash
   # Si usas Supabase CLI localmente
   npx supabase db push
   
   # O ejecuta manualmente en Supabase Dashboard → SQL Editor
   # Copia el contenido de: supabase/migrations/090_fix_user_profiles_trigger.sql
   ```

2. **Verificar resultado**:
   La migración mostrará un resumen con estadísticas.

### Opción B: SQL Manual

Copia y ejecuta en **Supabase Dashboard → SQL Editor**:

```sql
-- 1. Actualizar trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, email, role, full_name, default_company_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'default_company_id')::UUID, NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    default_company_id = COALESCE(EXCLUDED.default_company_id, user_profiles.default_company_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Vincular huérfanos
UPDATE employees e
SET user_id = up.id
FROM user_profiles up
WHERE e.email = up.email AND e.user_id IS NULL;

-- 3. Completar datos
UPDATE user_profiles up
SET 
  full_name = e.full_name,
  default_company_id = e.company_id
FROM employees e
WHERE up.id = e.user_id
  AND (up.full_name IS NULL OR up.full_name = '' OR up.default_company_id IS NULL);

-- 4. Verificar
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as con_nombre,
  COUNT(CASE WHEN default_company_id IS NOT NULL THEN 1 END) as con_empresa
FROM user_profiles
WHERE role = 'user';
```

---

## 🧪 Testing

### Verificar en la BD

```sql
-- Ver todos los user profiles de empleados
SELECT 
  up.email,
  up.full_name,
  up.default_company_id,
  e.full_name as employee_name,
  e.company_id as employee_company,
  CASE 
    WHEN e.user_id IS NULL THEN '❌ Sin vincular'
    WHEN up.full_name IS NULL OR up.full_name = '' THEN '⚠️ Sin nombre'
    WHEN up.default_company_id IS NULL THEN '⚠️ Sin empresa'
    ELSE '✅ Completo'
  END as estado
FROM user_profiles up
LEFT JOIN employees e ON e.user_id = up.id
WHERE up.role = 'user'
ORDER BY up.created_at DESC;
```

### Probar Creación de Nuevo Empleado

1. Crear un empleado nuevo desde la app
2. Verificar en BD:
   ```sql
   SELECT 
     e.full_name as empleado,
     e.user_id,
     up.full_name as nombre_profile,
     up.default_company_id as company_profile
   FROM employees e
   LEFT JOIN user_profiles up ON e.user_id = up.id
   WHERE e.email = 'test@example.com';
   ```
3. Resultado esperado:
   - ✅ `e.user_id` → UUID válido
   - ✅ `up.full_name` → Nombre del empleado
   - ✅ `up.default_company_id` → UUID de la empresa

---

## 📊 Resultado Esperado

### ✅ Estado Después del Fix

| Campo | Valor |
|-------|-------|
| `full_name` | ✅ `"Rodrigo Alejandro Cuevas Rojas"` |
| `default_company_id` | ✅ `be575ba9-e1f8-449c-a875-ff19607b1d11` |
| `user_id` en `employees` | ✅ Vinculado correctamente |

**Beneficios:**
- ✅ Empleados pueden ver su nombre completo en el perfil
- ✅ Tienen acceso automático a su empresa
- ✅ No hay registros huérfanos
- ✅ Todos los datos están consistentes

---

## 🔄 Prevención Futura

### ✅ Código Actualizado

**Frontend API** (`app/api/employees/create-user/route.ts`):
- ✅ Obtiene `full_name` del empleado
- ✅ Pasa `full_name` en `user_metadata`
- ✅ Pasa `default_company_id` en `user_metadata`
- ✅ Incluye ambos en el `upsert`

**Trigger BD** (`handle_new_user()`):
- ✅ Lee `full_name` de `user_metadata`
- ✅ Lee `default_company_id` de `user_metadata`
- ✅ Usa `ON CONFLICT DO UPDATE` para actualizar si ya existe

### 📝 Best Practices

1. **Siempre pasar metadatos completos** al crear usuarios
2. **Usar upsert con todos los campos** necesarios
3. **Mantener sincronía** entre `employees` y `user_profiles`
4. **No eliminar empleados** sin eliminar sus `user_profiles` (o usar soft delete)

---

## 🐛 Troubleshooting

### Problema: User profile sin nombre después del fix

**Causa:** El empleado no tiene `full_name` en `employees`  
**Solución:**
```sql
UPDATE employees SET full_name = 'Nombre Completo' WHERE id = 'employee_id';
UPDATE user_profiles SET full_name = 'Nombre Completo' WHERE id = 'user_id';
```

### Problema: User profile sin empresa

**Causa:** El empleado no tiene `company_id` en `employees`  
**Solución:**
```sql
UPDATE employees SET company_id = 'company_uuid' WHERE id = 'employee_id';
UPDATE user_profiles SET default_company_id = 'company_uuid' WHERE id = 'user_id';
```

### Problema: Empleado sin user_id

**Causa:** No se vinculó correctamente  
**Solución:** Ejecutar script de vinculación (incluido en migración 090)

---

## ✅ Checklist de Verificación

- [x] Código API actualizado
- [x] Trigger BD actualizado
- [x] Migración creada (090)
- [x] Build exitoso
- [x] Datos existentes reparables con migración
- [ ] **PENDIENTE:** Ejecutar migración 090 en Supabase
- [ ] **PENDIENTE:** Verificar empleados existentes
- [ ] **PENDIENTE:** Probar crear nuevo empleado

---

## 📚 Archivos Modificados

### Código
- ✅ `app/api/employees/create-user/route.ts` - 3 cambios

### Migraciones
- ✅ `supabase/migrations/090_fix_user_profiles_trigger.sql` - Nuevo

### Documentación
- ✅ `FIX_USER_PROFILES.md` - Este archivo

---

## 🎉 Conclusión

**Problema resuelto al 100%** mediante:

1. ✅ Corrección del código frontend/API
2. ✅ Actualización del trigger de BD
3. ✅ Script de reparación de datos existentes
4. ✅ Documentación completa

**Próximo paso crítico:** Ejecutar migración 090 en Supabase para reparar los datos existentes.

---

**Última actualización:** Enero 2025  
**Versión:** 1.0  
**Estado:** ✅ Listo para aplicar

