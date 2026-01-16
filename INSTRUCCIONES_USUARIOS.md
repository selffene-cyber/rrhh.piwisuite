# Instrucciones para Crear Usuarios en Supabase

## Paso 1: Ejecutar Script SQL

Ejecuta el script `supabase/create_users.sql` en el SQL Editor de Supabase para crear la tabla `user_profiles` y las políticas RLS.

## Paso 2: Crear Usuarios en Supabase Dashboard

### Opción A: Desde el Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en Supabase
2. Navega a **Authentication** > **Users**
3. Click en **"Add user"** > **"Create new user"**
4. Ingresa los datos del usuario:
   - **Email**: El correo del usuario
   - **Password**: La contraseña
   - **Auto Confirm User**: ✅ Marca esta opción para que no necesite verificar email
5. Click en **"Create user"**

### Usuarios a Crear:

#### 1. Super Usuario (Administrador)
- **Email**: `jeans.selfene@outlook.com`
- **Password**: `selfene1994AS#`
- **Rol**: `super_admin` (debes actualizarlo después en la tabla `user_profiles`)

#### 2. Usuario Normal
- **Email**: `hmartinez@hlms.cl`
- **Password**: `hlms2026`
- **Rol**: `user` (por defecto)

## Paso 3: Actualizar Roles en la Base de Datos

Después de crear los usuarios, ejecuta este SQL para asignar el rol de super_admin:

```sql
-- Asignar rol de super_admin al usuario principal
UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'jeans.selfene@outlook.com';

-- Verificar que se actualizó correctamente
SELECT id, email, role FROM user_profiles;
```

## Paso 4: Configurar Service Role Key (Opcional)

Para que la creación de usuarios desde la aplicación funcione completamente, necesitas:

1. Ve a **Settings** > **API** en Supabase
2. Copia la **service_role key** (manténla segura, es muy sensible)
3. Agrega esta variable a tu `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**⚠️ IMPORTANTE**: Nunca expongas la service_role key en el código del cliente. Solo úsala en API routes del servidor.

## Notas

- Los usuarios se pueden crear manualmente desde el Dashboard o desde la aplicación (si tienes service_role key configurada)
- El rol por defecto es `user`
- Solo los usuarios con rol `super_admin` pueden acceder a `/admin/users`
- El middleware protege automáticamente las rutas que requieren autenticación


