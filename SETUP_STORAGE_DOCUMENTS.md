# Configuración de Supabase Storage para Documentos

Para que la funcionalidad de subir documentos funcione correctamente, necesitas configurar un bucket y sus políticas en Supabase Storage.

## Pasos para Configurar el Storage

### 1. Crear el Bucket

1. **Accede a tu proyecto en Supabase**
   - Ve a [supabase.com](https://supabase.com)
   - Selecciona tu proyecto

2. **Crea el Bucket**
   - Ve a la sección **Storage** en el menú lateral
   - Haz clic en **"New bucket"**
   - Nombre del bucket: `documents` (exactamente así, en minúsculas)
   - **Marca la opción "Public bucket"** si quieres acceso público a los documentos
   - **O déjala sin marcar** si quieres acceso privado (recomendado para documentos)
   - Haz clic en **"Create bucket"**

### 2. Configurar las Políticas de Seguridad

⚠️ **IMPORTANTE: Ejecuta cada política por separado**

Tienes dos opciones:

#### Opción 1: Desde SQL Editor (Recomendado)

1. Ve a **SQL Editor** en Supabase
2. Abre el archivo `supabase/storage_policies_documents.sql`
3. **Copia y ejecuta UNA política a la vez** (cada bloque entre los separadores `===`)
4. Repite para cada una de las 4 políticas

#### Opción 2: Desde la Interfaz de Storage (Más fácil)

⚠️ **IMPORTANTE**: En la interfaz, NO escribas `CREATE POLICY` completo, solo la expresión.

Ve a **Storage** → Selecciona el bucket `documents` → **Policies** → **New Policy**

Para cada política, completa así:

##### 1. INSERT (Subir documentos):

- **Policy name**: `Allow authenticated users to upload documents`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **USING expression**: (vacío o `true`)
- **WITH CHECK expression**: Solo escribe `bucket_id = 'documents'` (sin CREATE POLICY)
- Haz clic en **"Review"** y luego **"Save policy"**

##### 2. SELECT (Leer documentos):

- **Policy name**: `Allow authenticated users to read documents`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**: Solo escribe `bucket_id = 'documents'` (sin CREATE POLICY)
- **WITH CHECK expression**: (vacío)
- Haz clic en **"Review"** y luego **"Save policy"**

**Nota**: Si quieres que los documentos sean públicos (accesibles sin autenticación), en lugar de `authenticated` usa `public` en **Target roles**.

##### 3. DELETE (Eliminar documentos):

- **Policy name**: `Allow authenticated users to delete documents`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: Solo escribe `bucket_id = 'documents'` (sin CREATE POLICY)
- **WITH CHECK expression**: (vacío)
- Haz clic en **"Review"** y luego **"Save policy"**

##### 4. UPDATE (Actualizar documentos - Opcional):

- **Policy name**: `Allow authenticated users to update documents`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: Solo escribe `bucket_id = 'documents'` (sin CREATE POLICY)
- **WITH CHECK expression**: Solo escribe `bucket_id = 'documents'` (sin CREATE POLICY)
- Haz clic en **"Review"** y luego **"Save policy"**

## Verificación

Una vez configuradas las políticas, intenta subir un documento nuevamente. Debería funcionar correctamente.

## Notas Importantes

- **Seguridad**: Por defecto, las políticas están configuradas para usuarios autenticados. Esto es más seguro para documentos sensibles.
- **Acceso público**: Si marcas el bucket como público o cambias las políticas SELECT a `public`, los documentos serán accesibles sin autenticación.
- **Estructura de carpetas**: Los documentos se organizan automáticamente en `documents/{company_id}/{timestamp}-{filename}`.









