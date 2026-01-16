# Instrucciones de Implementación - Multi-Tenancy

## 📋 Pasos para Implementar

### 1. Ejecutar Migraciones SQL en Supabase

Ejecuta las migraciones en orden en el SQL Editor de Supabase:

1. **001_create_company_users.sql** - Crea la tabla `company_users`
2. **002_modify_companies.sql** - Agrega campos a `companies`
3. **003_modify_user_profiles.sql** - Agrega campos a `user_profiles`
4. **004_create_rls_functions.sql** - Crea funciones auxiliares RLS
5. **005_create_rls_policies.sql** - Crea políticas RLS para todas las tablas
6. **006_migrate_existing_data.sql** - Migra datos existentes

⚠️ **IMPORTANTE**: Ejecuta las migraciones en orden y verifica que cada una se ejecute correctamente antes de continuar.

### 2. Actualizar Types de TypeScript

Necesitas actualizar `types/database.ts` para incluir las nuevas tablas. Puedes hacerlo manualmente o usar el generador de tipos de Supabase:

```bash
npx supabase gen types typescript --project-id tu-project-id > types/database.ts
```

O agrega manualmente las definiciones de `company_users` basándote en la estructura SQL.

### 3. Probar la Implementación

1. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

2. **Inicia sesión como super admin** (jeans.selfene@outlook.com)

3. **Accede a /admin/companies** para:
   - Ver todas las empresas
   - Crear nueva empresa
   - Gestionar usuarios de empresas

4. **Verifica que**:
   - El selector de empresa aparece en el header (si tienes múltiples empresas)
   - Los datos se filtran por empresa
   - Las políticas RLS funcionan correctamente

### 4. Usuarios Existentes

Los usuarios existentes deberían estar configurados automáticamente después de ejecutar la migración 006:

- **jeans.selfene@outlook.com**: Super Admin + Owner de la empresa existente
- **hmartinez@hlms.cl**: Owner de la empresa existente

### 5. Próximos Pasos (Fase 7 - Pendiente)

Necesitas modificar las páginas existentes para usar `useCurrentCompany()` y filtrar por `company_id`. Las páginas principales a modificar son:

- `/app/settings/page.tsx` - Eliminar `.limit(1).single()` y filtrar por company_id
- `/app/employees/page.tsx` - Agregar filtro por company_id
- `/app/payroll/page.tsx` - Agregar filtro por company_id
- Todas las páginas que consultan datos relacionados con empresas

### 6. Verificación de RLS

Para verificar que RLS funciona correctamente:

1. Inicia sesión con un usuario regular (no super admin)
2. Intenta acceder directamente a datos de otra empresa (por ID)
3. Deberías recibir un error o no ver datos

## 🔍 Troubleshooting

### Error: "No hay empresas en la base de datos"
- Asegúrate de que existe al menos una empresa en la tabla `companies`
- Si no existe, créala manualmente desde Supabase o desde `/admin/companies` como super admin

### Error: "Usuario no tiene empresas asignadas"
- Verifica que existe un registro en `company_users` para el usuario
- Ejecuta nuevamente la migración 006

### El selector de empresa no aparece
- Verifica que el usuario tenga más de una empresa asignada
- Revisa la consola del navegador para errores
- Verifica que `CompanyProvider` esté en `app/layout.tsx`

### Las políticas RLS bloquean todo
- Verifica que las funciones RLS estén creadas correctamente
- Revisa que los usuarios tengan registros en `company_users` con `status = 'active'`

## 📝 Notas Importantes

1. **Backup**: Antes de ejecutar las migraciones, haz un backup de tu base de datos
2. **Testing**: Prueba en un entorno de desarrollo antes de producción
3. **RLS**: Las políticas RLS son críticas para la seguridad - verifica que funcionen correctamente
4. **Performance**: Las consultas pueden ser más lentas con RLS activo - considera agregar índices adicionales si es necesario

## 🎯 Estado Actual

✅ **Completado**:
- Migraciones SQL (estructura de base de datos)
- Servicios backend (companyService, companyUserService)
- API routes para administración
- Context y hooks (CompanyContext, useCurrentCompany, etc)
- Componentes UI (CompanySelector)
- Páginas de administración (/admin/companies)

⏳ **Pendiente**:
- Modificar páginas existentes para usar multi-tenancy
- Actualizar types/database.ts
- Testing completo
- Actualizar documentación

