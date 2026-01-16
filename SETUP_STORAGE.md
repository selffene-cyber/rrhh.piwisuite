# Configuración de Supabase Storage para Logo de Empresa

Para que la funcionalidad de subir logos funcione correctamente, necesitas configurar un bucket en Supabase Storage.

## Pasos para Configurar el Storage

1. **Accede a tu proyecto en Supabase**
   - Ve a [supabase.com](https://supabase.com)
   - Selecciona tu proyecto

2. **Crea el Bucket**
   - Ve a la sección **Storage** en el menú lateral
   - Haz clic en **"New bucket"**
   - Nombre del bucket: `company-assets`
   - Marca la opción **"Public bucket"** (para que las imágenes sean accesibles públicamente)
   - Haz clic en **"Create bucket"**

3. **Configura las Políticas de Seguridad (Recomendado)**
   
   **⚠️ IMPORTANTE: Ejecuta cada política por separado**
   
   **Opción 1: Desde SQL Editor (Recomendado)**
   - Ve a **SQL Editor** en Supabase
   - Abre el archivo `supabase/storage_policies.sql`
   - **Copia y ejecuta UNA política a la vez** (cada bloque entre los separadores)
   - Repite para cada una de las 4 políticas
   
   **Opción 2: Desde la Interfaz de Storage (Más fácil)**
   
   ⚠️ **IMPORTANTE**: En la interfaz, NO escribas `CREATE POLICY` completo, solo la expresión.
   
   Ve a **Storage** → Selecciona el bucket `company-assets` → **Policies** → **New Policy**
   
   Para cada política, completa así:
   
   **1. INSERT (Subir logos)**:
   - Policy name: `Allow authenticated users to upload logos`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression: (vacío o `true`)
   - **WITH CHECK expression**: Solo escribe `bucket_id = 'company-assets'` (sin CREATE POLICY)
   
   **2. SELECT (Leer logos)**:
   - Policy name: `Allow public to read logos`
   - Allowed operation: `SELECT`
   - Target roles: `public`
   - **USING expression**: Solo escribe `bucket_id = 'company-assets'` (sin CREATE POLICY)
   - WITH CHECK expression: (vacío)
   
   **3. DELETE (Eliminar logos)**:
   - Policy name: `Allow authenticated users to delete logos`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated`
   - **USING expression**: Solo escribe `bucket_id = 'company-assets'` (sin CREATE POLICY)
   - WITH CHECK expression: (vacío)
   
   **4. UPDATE (Opcional)**:
   - Policy name: `Allow authenticated users to update logos`
   - Allowed operation: `UPDATE`
   - Target roles: `authenticated`
   - **USING expression**: Solo escribe `bucket_id = 'company-assets'` (sin CREATE POLICY)
   - **WITH CHECK expression**: Solo escribe `bucket_id = 'company-assets'` (sin CREATE POLICY)
   
   📖 **Ver guía detallada**: `SETUP_STORAGE_GUI.md`

4. **Ejecuta la Migración SQL**
   - Ve a **SQL Editor** en Supabase
   - Ejecuta el archivo `supabase/add_logo_to_companies.sql`
   - Esto agregará el campo `logo_url` a la tabla `companies`

## Estructura de Archivos

Los logos se almacenarán en:
```
company-assets/
  └── company-logos/
      └── logo-{timestamp}.{ext}
```

## Notas

- El tamaño máximo de archivo es **5MB**
- Formatos aceptados: **JPG, PNG, GIF**
- Los logos se almacenan con nombres únicos basados en timestamp
- El bucket debe ser público para que las imágenes se muestren en los PDFs

