# 🔧 Solución Opción 1: Crear Usuario desde el Portal Admin

**Fecha**: 15 de enero de 2026  
**Recomendación**: ⭐ **Más Fácil y Segura**

---

## 📋 Por Qué el Script SQL Falló

El error que viste:
```
ERROR: 23503: insert or update on table "user_profiles" violates foreign key constraint "user_profiles_id_fkey"
DETAIL: Key (id)=(xxx) is not present in table "users".
```

**Causa**: 
- `user_profiles.id` es una foreign key a `auth.users.id`
- No puedes crear un perfil sin antes crear el usuario en el sistema de autenticación
- Supabase Auth requiere un proceso especial para crear usuarios

---

## ✅ SOLUCIÓN: Usar el Portal de Admin

### Paso 1: Crear el Usuario desde el Portal

1. **Accede al portal** como super admin:
   ```
   http://localhost:3007/admin/users
   ```

2. **Haz clic en "Crear Nuevo Usuario"**

3. **Completa el formulario**:
   ```
   Email: hmarti2104@gmail.com
   Contraseña: [temporal, ej: Temporal2026!]
   Nombre Completo: Héctor Leandro Martínez Solar
   Rol: user (Portal de Trabajador)
   ```

4. **Guarda** el usuario

5. **Copia el ID del usuario** que aparecerá en la tabla
   - Busca `hmarti2104@gmail.com` en la lista
   - Anota el ID (algo como: `abc123de-f456-7890-abcd-ef1234567890`)

---

### Paso 2: Vincular el Empleado con el Usuario

Una vez creado el usuario, ejecuta este SQL en Supabase:

```sql
-- Actualizar el empleado Héctor para vincularlo con el nuevo usuario
-- ⚠️ IMPORTANTE: Reemplaza 'NUEVO_USER_ID_AQUI' con el ID que copiaste

UPDATE "public"."employees"
SET 
  "user_id" = 'NUEVO_USER_ID_AQUI', -- 👈 PEGA AQUÍ EL ID DEL PASO 1
  "updated_at" = NOW()
WHERE "id" = 'b8cf133a-a6a9-4edf-afec-17fdf4e3e4d9';

-- Verificar que se actualizó correctamente
SELECT 
  full_name,
  email,
  user_id
FROM employees
WHERE id = 'b8cf133a-a6a9-4edf-afec-17fdf4e3e4d9';
```

---

## 🎯 Resultado Esperado

Después de ejecutar ambos pasos:

```sql
-- Verificación completa
SELECT 
  e.full_name AS empleado,
  e.email AS email_empleado,
  up.email AS email_usuario,
  up.role AS rol_usuario,
  e.user_id
FROM employees e
LEFT JOIN user_profiles up ON e.user_id = up.id
WHERE e.id = 'b8cf133a-a6a9-4edf-afec-17fdf4e3e4d9';
```

**Debe mostrar**:
```
┌─────────────────────────┬─────────────────────┬─────────────────────┬──────┬──────────┐
│ empleado                │ email_empleado      │ email_usuario       │ rol  │ user_id  │
├─────────────────────────┼─────────────────────┼─────────────────────┼──────┼──────────┤
│ Héctor Leandro Martínez │ hmarti2104@gmail... │ hmarti2104@gmail... │ user │ [UUID]   │
└─────────────────────────┴─────────────────────┴─────────────────────┴──────┴──────────┘
```

---

## ✅ Ventajas de Este Método

1. ✅ **Seguro**: Usa el flujo oficial de Supabase Auth
2. ✅ **Completo**: Crea usuario + perfil automáticamente
3. ✅ **Verificable**: Puedes ver el usuario inmediatamente en el admin
4. ✅ **Sin errores**: No hay problemas de foreign keys

---

## 🔐 Nota sobre la Contraseña

- Usa una contraseña temporal fuerte (ej: `Temporal2026!`)
- Marca "Debe cambiar contraseña" en el formulario
- Héctor la cambiará en su primer acceso
- Alternativamente, usa la función "Reset Password" después de crear el usuario

---

## 📝 Checklist

- [ ] Acceder a `/admin/users` como super admin
- [ ] Crear nuevo usuario con email `hmarti2104@gmail.com`
- [ ] Copiar el UUID del nuevo usuario
- [ ] Ejecutar SQL para actualizar `employees.user_id`
- [ ] Verificar con la query de verificación
- [ ] Probar acceso con `hmarti2104@gmail.com`

---

**Esta es la forma más sencilla y segura de hacerlo.** 🎯
