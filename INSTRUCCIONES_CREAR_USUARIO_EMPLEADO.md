# Instrucciones para Crear Usuario de Empleado Manualmente

## Problema
El usuario `joaquin.hermoso@techsolutions.cl` no puede iniciar sesión porque no existe en `auth.users` de Supabase.

## Solución: Crear Usuario en Supabase Auth

### Paso 1: Crear Usuario en Supabase Dashboard

1. **Ve a Supabase Dashboard**
   - Abre tu proyecto en [supabase.com](https://supabase.com)
   - Navega a **Authentication** > **Users**

2. **Crear Nuevo Usuario**
   - Haz clic en **"Add user"** (botón en la esquina superior derecha)
   - Selecciona **"Create new user"**

3. **Completar Datos del Usuario**
   - **Email**: `joaquin.hermoso@techsolutions.cl`
   - **Password**: `colaborador1`
   - **✅ Auto Confirm User**: **DEBES MARCAR ESTA OPCIÓN** (muy importante)
   - Haz clic en **"Create user"**

4. **Verificar ID del Usuario**
   - Después de crear, verifica que el ID del usuario sea: `ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca`
   - Si el ID es diferente, actualiza el script SQL con el ID correcto

### Paso 2: Ejecutar Script SQL

Una vez creado el usuario en Auth, ejecuta el script `supabase/fix_user_joaquin.sql` en el SQL Editor de Supabase:

1. Ve a **SQL Editor** en Supabase
2. Abre o pega el contenido de `supabase/fix_user_joaquin.sql`
3. Ejecuta el script completo

El script:
- Creará/actualizará el perfil en `user_profiles`
- Vinculará el usuario al empleado en la tabla `employees`

### Paso 3: Verificar

Después de ejecutar el script, verifica que todo esté correcto:

```sql
SELECT 
  up.id as user_id,
  up.email,
  up.role,
  up.must_change_password,
  e.id as employee_id,
  e.full_name,
  e.user_id as employee_user_id,
  CASE 
    WHEN up.id IS NULL THEN '❌ No tiene perfil'
    WHEN e.id IS NULL THEN '❌ No tiene empleado vinculado'
    WHEN e.user_id IS NULL THEN '❌ Empleado no vinculado'
    WHEN e.user_id != up.id THEN '❌ IDs no coinciden'
    ELSE '✅ Todo correcto'
  END as diagnostico
FROM user_profiles up
LEFT JOIN employees e ON e.user_id = up.id OR e.email = up.email
WHERE up.id = 'ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca'
   OR up.email = 'joaquin.hermoso@techsolutions.cl';
```

### Paso 4: Probar Login

1. Ve a la página de login: `http://localhost:3007/login`
2. Ingresa:
   - **Email**: `joaquin.hermoso@techsolutions.cl`
   - **Password**: `colaborador1`
3. Debería redirigirte a `/employee/change-password` para cambiar la contraseña

## Notas Importantes

- **Auto Confirm User** es crítico: sin esto, el usuario no podrá iniciar sesión aunque exista
- El ID del usuario debe coincidir exactamente con el que está en la base de datos
- Si el empleado no existe, primero debes crearlo en la aplicación antes de crear el usuario

## Si el Usuario Ya Existe pero la Contraseña No Funciona

1. Ve a **Authentication** > **Users**
2. Busca el usuario `joaquin.hermoso@techsolutions.cl`
3. Haz clic en los tres puntos (⋮) junto al usuario
4. Selecciona **"Reset password"** o **"Update user"**
5. Establece la contraseña como `colaborador1`
6. Asegúrate de que **"Email confirmed"** esté marcado

