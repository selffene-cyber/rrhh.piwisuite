# 🔧 Solución: Rol "Ejecutivo" y Recuperación de Usuarios Huérfanos

## 📋 Resumen del Problema

### Problema 1: Rol "Ejecutivo" no existía
- ❌ El sistema solo tenía roles: `owner`, `admin`, `user`
- ❌ Faltaba el rol `ejecutivo` (HR/Recursos Humanos)
- ❌ Las políticas RLS usaban `'hr'` pero no estaba en el constraint

### Problema 2: Usuario cristian.cofre@hlms.cl
- ❌ Error: "A user with this email address has already been registered"
- ❌ Usuario existe en `auth.users` pero no aparece en la lista
- ❌ Probablemente sin perfil en `user_profiles` o sin asignación a empresa

---

## ✅ Soluciones Implementadas

### 1. **Agregado Rol "Ejecutivo"**

#### Archivos Modificados:
- ✅ `types/database.ts` - Tipos TypeScript actualizados
- ✅ `app/admin/companies/[id]/users/page.tsx` - Dropdown con opción "Ejecutivo"
- ✅ `app/api/admin/companies/[id]/users/route.ts` - API acepta 'ejecutivo'
- ✅ `supabase/migrations/095_add_ejecutivo_role.sql` - Migración DB

#### Archivos Creados:
- 📄 `supabase/fix_roles_and_orphan_users.sql` - Script de corrección completo
- 📄 `supabase/verify_user_cristian_cofre.sql` - Script de verificación específico

---

## 🚀 Pasos para Implementar

### **PASO 1: Ejecutar Migración en Supabase**

1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Ejecuta este archivo:

```sql
-- Ejecutar: supabase/migrations/095_add_ejecutivo_role.sql
```

Esto hará:
- ✅ Agregar 'ejecutivo' al CHECK constraint de `company_users`
- ✅ Actualizar todas las políticas RLS para soportar 'ejecutivo'
- ✅ Crear índices para optimización

---

### **PASO 2: Recuperar Usuarios Huérfanos**

Ejecuta en el SQL Editor:

```sql
-- Ejecutar: supabase/fix_roles_and_orphan_users.sql
```

Este script:
1. ✅ Verifica usuarios en `auth.users` sin perfil
2. ✅ Crea perfiles faltantes automáticamente
3. ✅ Muestra el estado de **cristian.cofre@hlms.cl**
4. ✅ Genera reporte completo

**Salida esperada:**
```
USUARIOS HUÉRFANOS: (lista de usuarios sin perfil)
ESTADO DE cristian.cofre@hlms.cl: (datos completos)
Perfiles creados: X cantidad
RESUMEN FINAL: estadísticas
```

---

### **PASO 3: Asignar cristian.cofre@hlms.cl a tu Empresa**

#### 3.1 Obtener tu Company ID

Ejecuta:
```sql
SELECT id, name, rut FROM companies;
```

Copia el `id` de tu empresa.

#### 3.2 Ejecutar Script de Verificación

```sql
-- Ejecutar: supabase/verify_user_cristian_cofre.sql
```

Este script:
1. Verifica si el usuario existe
2. Crea el perfil si no existe
3. Te muestra todas las empresas disponibles

#### 3.3 Asignar Usuario a Empresa

**Opción A:** Usando el script (recomendado)

1. Edita `supabase/verify_user_cristian_cofre.sql`
2. Busca la línea:
   ```sql
   v_company_id UUID := 'TU_COMPANY_ID_AQUI'::UUID;
   ```
3. Reemplaza `'TU_COMPANY_ID_AQUI'` con tu company ID real
4. Ejecuta la **SOLUCIÓN B** del script

**Opción B:** Manual (rápido)

```sql
INSERT INTO company_users (user_id, company_id, role, status, joined_at)
VALUES (
  (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl'),
  'PEGA_AQUI_TU_COMPANY_ID', -- ⚠️ Cambia esto
  'ejecutivo',
  'active',
  NOW()
)
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = 'ejecutivo', status = 'active', updated_at = NOW();
```

---

### **PASO 4: Verificar en la Aplicación**

1. **Reinicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. **Ve a la página de usuarios:**
   - `/admin/companies/[tu-company-id]/users`

3. **Verifica:**
   - ✅ El dropdown ahora tiene: Usuario, **Ejecutivo**, Administrador, Propietario
   - ✅ cristian.cofre@hlms.cl aparece en la lista
   - ✅ Puedes asignarle rol "Ejecutivo"

---

## 🎯 Roles y Permisos Actualizados

### **Roles por Empresa** (`company_users.role`)

| Rol | Nombre en UI | Descripción | Permisos |
|-----|--------------|-------------|----------|
| `owner` | Propietario | Dueño de la empresa | ✅ Gestionar usuarios<br>✅ Configuración<br>✅ Acceso total |
| `admin` | Administrador | Administrador general | ✅ Gestionar trabajadores<br>✅ Liquidaciones<br>✅ Contratos |
| `ejecutivo` | Ejecutivo | Recursos Humanos (HR) | ✅ Horas extras<br>✅ Certificados<br>✅ Vacaciones<br>✅ Permisos |
| `user` | Usuario | Usuario regular | ⚠️ Acceso limitado |

### **Diferencias: Admin vs Ejecutivo**

| Característica | Admin | Ejecutivo |
|----------------|-------|-----------|
| Gestionar trabajadores | ✅ | ✅ |
| Crear liquidaciones | ✅ | ✅ |
| Gestionar contratos | ✅ | ✅ |
| **Gestionar horas extras** | ✅ | ✅ |
| **Crear certificados** | ✅ | ✅ |
| **Gestionar vacaciones** | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ |
| Configuración empresa | ⚠️ Limitado | ❌ |

---

## 🔍 Comandos Útiles de Verificación

### Ver todos los usuarios con sus empresas:
```sql
SELECT 
  up.email,
  up.full_name,
  up.role as perfil_sistema,
  c.name as empresa,
  cu.role as rol_empresa,
  cu.status
FROM user_profiles up
LEFT JOIN company_users cu ON cu.user_id = up.id
LEFT JOIN companies c ON c.id = cu.company_id
ORDER BY up.email;
```

### Ver usuarios sin empresa asignada:
```sql
SELECT 
  up.email,
  up.full_name,
  up.role
FROM user_profiles up
LEFT JOIN company_users cu ON cu.user_id = up.id
WHERE cu.id IS NULL;
```

### Ver usuarios "ejecutivos":
```sql
SELECT 
  up.email,
  up.full_name,
  c.name as empresa,
  cu.status
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
JOIN companies c ON c.id = cu.company_id
WHERE cu.role = 'ejecutivo';
```

---

## 🐛 Solución de Problemas

### Problema: "A user with this email address has already been registered"

**Causa:** Usuario existe en `auth.users` pero no en `user_profiles` o no asignado a empresa.

**Solución:**
1. Ejecuta `supabase/fix_roles_and_orphan_users.sql`
2. Ejecuta `supabase/verify_user_cristian_cofre.sql`
3. Asigna manualmente si es necesario

---

### Problema: Dropdown no muestra "Ejecutivo"

**Causa:** No ejecutaste la migración o el código no está actualizado.

**Solución:**
1. Ejecuta `supabase/migrations/095_add_ejecutivo_role.sql`
2. Reinicia el servidor: `npm run dev`
3. Limpia caché del navegador (Ctrl+Shift+R)

---

### Problema: "Rol inválido" al asignar ejecutivo

**Causa:** API no actualizada o migración no ejecutada.

**Solución:**
1. Verifica que ejecutaste la migración
2. Verifica que los cambios en `app/api/admin/companies/[id]/users/route.ts` están guardados
3. Reinicia el servidor

---

## 📊 Verificación Final

Después de completar todos los pasos, ejecuta:

```sql
-- Verificación completa del sistema
SELECT 
  '✅ VERIFICACIÓN FINAL' as estado,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM user_profiles) as total_con_perfil,
  (SELECT COUNT(*) FROM auth.users au 
   LEFT JOIN user_profiles up ON au.id = up.id 
   WHERE up.id IS NULL) as sin_perfil,
  (SELECT COUNT(*) FROM company_users WHERE role = 'ejecutivo') as total_ejecutivos;
```

**Resultado esperado:**
- ✅ `sin_perfil` = 0
- ✅ `total_ejecutivos` >= 1 (si asignaste a cristian como ejecutivo)

---

## 📝 Resumen de Cambios

### Base de Datos:
- ✅ Constraint actualizado: `company_users.role` ahora acepta 'ejecutivo'
- ✅ Políticas RLS actualizadas para soportar 'ejecutivo'
- ✅ Índices optimizados

### Frontend:
- ✅ Dropdown con opción "Ejecutivo"
- ✅ Tipos TypeScript actualizados
- ✅ Validaciones en API

### Scripts de Mantenimiento:
- ✅ Script de recuperación de usuarios huérfanos
- ✅ Script de verificación de usuario específico
- ✅ Script de asignación masiva

---

## 🎉 ¡Listo!

Ahora tu sistema soporta el rol "Ejecutivo" correctamente y puedes:
- ✅ Asignar usuarios como Ejecutivos
- ✅ Recuperar usuarios huérfanos
- ✅ Gestionar permisos de HR/RRHH de forma específica

---

## 📞 Si necesitas ayuda:

1. Ejecuta los scripts de verificación
2. Revisa los mensajes de error en SQL
3. Verifica que el servidor esté reiniciado
4. Limpia caché del navegador

---

**Fecha de actualización:** 2026-02-05  
**Versión:** 1.0.0
