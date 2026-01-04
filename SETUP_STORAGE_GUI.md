# Guía Paso a Paso: Crear Políticas desde la Interfaz de Supabase

## Crear Políticas desde Storage → Policies

### Paso 1: Acceder a las Políticas
1. Ve a **Storage** en el menú lateral de Supabase
2. Selecciona el bucket `company-assets`
3. Haz clic en la pestaña **"Policies"** (o en el botón **"New Policy"**)

### Paso 2: Crear Política INSERT (Subir logos)

1. Haz clic en **"New Policy"** o **"Create Policy"**
2. Selecciona **"For full customization"** o **"Custom Policy"**
3. Completa los campos:
   - **Policy name**: `Allow authenticated users to upload logos`
   - **Allowed operation**: Selecciona **INSERT**
   - **Target roles**: Escribe `authenticated`
   - **USING expression**: (déjalo vacío o pon `true`)
   - **WITH CHECK expression**: Escribe solo esto:
     ```
     bucket_id = 'company-assets'
     ```
   - **NO escribas** `CREATE POLICY` ni nada más, solo la expresión
4. Haz clic en **"Review"** y luego **"Save policy"**

### Paso 3: Crear Política SELECT (Leer logos)

1. Haz clic en **"New Policy"** nuevamente
2. Completa los campos:
   - **Policy name**: `Allow public to read logos`
   - **Allowed operation**: Selecciona **SELECT**
   - **Target roles**: Escribe `public`
   - **USING expression**: Escribe solo esto:
     ```
     bucket_id = 'company-assets'
     ```
   - **WITH CHECK expression**: (déjalo vacío)
3. Haz clic en **"Review"** y luego **"Save policy"**

### Paso 4: Crear Política DELETE (Eliminar logos)

1. Haz clic en **"New Policy"** nuevamente
2. Completa los campos:
   - **Policy name**: `Allow authenticated users to delete logos`
   - **Allowed operation**: Selecciona **DELETE**
   - **Target roles**: Escribe `authenticated`
   - **USING expression**: Escribe solo esto:
     ```
     bucket_id = 'company-assets'
     ```
   - **WITH CHECK expression**: (déjalo vacío)
3. Haz clic en **"Review"** y luego **"Save policy"**

### Paso 5: Crear Política UPDATE (Opcional - Actualizar logos)

1. Haz clic en **"New Policy"** nuevamente
2. Completa los campos:
   - **Policy name**: `Allow authenticated users to update logos`
   - **Allowed operation**: Selecciona **UPDATE**
   - **Target roles**: Escribe `authenticated`
   - **USING expression**: Escribe solo esto:
     ```
     bucket_id = 'company-assets'
     ```
   - **WITH CHECK expression**: Escribe solo esto:
     ```
     bucket_id = 'company-assets'
     ```
3. Haz clic en **"Review"** y luego **"Save policy"**

## ⚠️ IMPORTANTE

- **NO escribas** `CREATE POLICY` en los campos
- **NO escribas** `ON storage.objects FOR INSERT` ni nada similar
- **Solo escribe** la expresión de la condición: `bucket_id = 'company-assets'`
- La interfaz ya sabe que es para `storage.objects` y qué operación es

## Alternativa: Usar SQL Editor (Una por una)

Si prefieres usar SQL, ejecuta cada una de estas consultas **por separado** en SQL Editor:

```sql
-- Política 1: INSERT
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');
```

```sql
-- Política 2: SELECT
CREATE POLICY "Allow public to read logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');
```

```sql
-- Política 3: DELETE
CREATE POLICY "Allow authenticated users to delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');
```

```sql
-- Política 4: UPDATE (Opcional)
CREATE POLICY "Allow authenticated users to update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets')
WITH CHECK (bucket_id = 'company-assets');
```



