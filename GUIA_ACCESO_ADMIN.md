# Guía de Acceso a Páginas de Administración

## 🔐 Requisitos Previos

1. **Debes estar logueado como Super Admin**
   - Usuario: `jeans.selfene@outlook.com`
   - Este usuario debe tener `role = 'super_admin'` en la tabla `user_profiles`

2. **Las migraciones SQL deben estar ejecutadas**
   - Todas las migraciones del 001 al 006 deben haberse ejecutado correctamente

## 📍 Rutas de Administración Disponibles

### 1. Administración de Empresas (Tenants)

**Ruta principal**: `/admin/companies`

**URL completa**: `http://localhost:3000/admin/companies`

**Funcionalidades**:
- Ver lista de todas las empresas
- Crear nueva empresa
- Editar empresa existente
- Eliminar empresa
- Ver estadísticas (número de usuarios, empleados)
- Acceder a gestión de usuarios por empresa

**Cómo acceder**:
1. Inicia sesión con `jeans.selfene@outlook.com`
2. En el menú lateral, busca el ícono de "Empresas" (debería aparecer como segundo item de administración)
3. O navega directamente a: `http://localhost:3000/admin/companies`

### 2. Gestión de Usuarios de una Empresa

**Ruta**: `/admin/companies/[id]/users`

**Ejemplo**: `http://localhost:3000/admin/companies/123e4567-e89b-12d3-a456-426614174000/users`

**Cómo acceder**:
1. Ve a `/admin/companies`
2. En la lista de empresas, haz clic en el botón "Usuarios" de la empresa que quieres gestionar
3. O navega directamente usando el ID de la empresa

**Funcionalidades**:
- Ver usuarios asignados a la empresa
- Asignar nuevo usuario (por email)
- Cambiar rol del usuario en la empresa (owner, admin, user)
- Remover usuario de la empresa

### 3. Administración Global de Usuarios

**Ruta**: `/admin/users`

**URL completa**: `http://localhost:3000/admin/users`

**Funcionalidades** (ya existía, ahora mejorada):
- Ver todos los usuarios del sistema
- Crear nuevos usuarios
- Cambiar roles del sistema (super_admin, admin, user)
- Eliminar usuarios
- Resetear contraseñas

**Cómo acceder**:
1. Inicia sesión como super admin
2. En el menú lateral, busca "Usuarios"
3. O navega directamente a: `http://localhost:3000/admin/users`

## 🎯 Flujo Recomendado para Crear una Nueva Empresa

1. **Inicia sesión como Super Admin**
   ```
   Email: jeans.selfene@outlook.com
   ```

2. **Ve a Administración de Empresas**
   - Menú lateral → "Empresas"
   - O URL: `/admin/companies`

3. **Crea una Nueva Empresa**
   - Haz clic en "Nueva Empresa"
   - Completa el formulario:
     - Nombre de la empresa
     - RUT
     - Nombre del empleador
     - Ciudad (opcional)
     - Dirección (opcional)
     - Email del propietario (opcional - si no se especifica, serás tú)
   - Haz clic en "Crear Empresa"

4. **Asigna Usuarios a la Empresa**
   - En la lista de empresas, haz clic en "Usuarios" de la empresa recién creada
   - Haz clic en "Asignar Usuario"
   - Ingresa el email del usuario
   - Selecciona el rol (owner, admin, user)
   - Haz clic en "Asignar Usuario"

## 🔍 Verificación de Acceso

### Si no puedes acceder a `/admin/companies`:

1. **Verifica que eres Super Admin**:
   ```sql
   SELECT id, email, role 
   FROM user_profiles 
   WHERE email = 'jeans.selfene@outlook.com';
   ```
   Debe mostrar `role = 'super_admin'`

2. **Verifica que las migraciones se ejecutaron**:
   ```sql
   SELECT COUNT(*) FROM company_users;
   SELECT COUNT(*) FROM companies;
   ```

3. **Verifica en la consola del navegador**:
   - Abre las herramientas de desarrollador (F12)
   - Ve a la pestaña "Console"
   - Busca errores relacionados con autenticación o permisos

4. **Verifica que el menú muestra "Empresas"**:
   - Deberías ver "Empresas" y "Usuarios" en el menú lateral si eres super admin

## 🛠️ Si el menú no aparece:

El menú lateral debería mostrar automáticamente "Empresas" si:
- Estás logueado
- Tu usuario tiene `role = 'super_admin'` en `user_profiles`

Si no aparece, puedes:
1. Navegar directamente a `/admin/companies`
2. Verificar el código en `components/Layout.tsx` líneas 159-162

## 📝 Notas Importantes

- **Solo Super Admins** pueden acceder a `/admin/companies`
- Los usuarios regulares NO verán estas opciones en el menú
- Si intentas acceder sin permisos, serás redirigido a la página principal
- Las empresas creadas automáticamente asignan al creador como "owner"

## 🎨 Interfaz

Una vez dentro de `/admin/companies`, verás:
- **Tabla con todas las empresas** mostrando:
  - Nombre, RUT, Empleador
  - Ciudad, Estado
  - Número de usuarios y empleados
  - Email del propietario
  - Fecha de creación
  - Botones de acción (Editar, Usuarios, Eliminar)

- **Botón "Nueva Empresa"** en la parte superior derecha

