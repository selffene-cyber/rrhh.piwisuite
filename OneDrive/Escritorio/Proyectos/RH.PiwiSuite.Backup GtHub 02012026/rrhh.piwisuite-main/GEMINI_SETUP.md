# Configuración del Asistente IA con Gemini

## Pasos para configurar la API Key de Gemini

### 1. Crear archivo `.env.local`

En la raíz del proyecto `rrhh.piwisuite-main`, crea un archivo llamado `.env.local` (si no existe) y agrega la siguiente línea:

```env
GEMINI_API_KEY=AIzaSyAllBI-OHHQTsugFzzmSWo7g-_TG3JQejg
```

### 2. Ubicación del archivo

El archivo `.env.local` debe estar en:
```
rrhh.piwisuite-main/.env.local
```

### 3. Verificar que el archivo existe

En Windows (PowerShell):
```powershell
cd rrhh.piwisuite-main
Test-Path .env.local
```

Si no existe, créalo:
```powershell
New-Item .env.local -ItemType File
```

Luego agrega la línea con la API key.

### 4. Reiniciar el servidor de desarrollo

Después de agregar la variable de entorno, **debes reiniciar el servidor de desarrollo** para que los cambios surtan efecto:

```bash
# Detener el servidor (Ctrl+C)
# Luego iniciarlo nuevamente
npm run dev
```

### 5. Verificar que funciona

1. Inicia sesión en la aplicación
2. Busca el botón flotante con el ícono de robot en la esquina inferior derecha
3. Haz clic en él para abrir el Asistente IA
4. Prueba haciendo una pregunta como: "¿Qué es una liquidación de sueldo?"

## Configuración en Producción (Vercel)

Si despliegas en Vercel, agrega la variable de entorno en:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyAllBI-OHHQTsugFzzmSWo7g-_TG3JQejg`
   - **Environment**: Production, Preview, Development (según necesites)

## Migraciones de Base de Datos

Antes de usar el Asistente IA, asegúrate de ejecutar las migraciones SQL:

```sql
-- Ejecutar en Supabase SQL Editor:
-- 1. 032_create_ai_queries.sql
-- 2. 033_ai_queries_rls.sql
```

O usando Supabase CLI:
```bash
supabase migration up
```

## Características del Asistente

- **Rate Limiting**: Máximo 10 consultas por hora por usuario
- **Contexto de Negocio**: Puede recibir información sobre trabajadores y períodos de liquidación
- **Logging**: Todas las consultas se registran en la tabla `ai_queries` para auditoría
- **Seguridad**: Solo usuarios autenticados pueden usar el asistente
- **RLS**: Las consultas están protegidas por Row Level Security

## Solución de Problemas

### Error: "GEMINI_API_KEY no está configurada"
- Verifica que el archivo `.env.local` existe y contiene la variable
- Reinicia el servidor de desarrollo
- Verifica que no hay espacios extra en la línea de la API key

### Error: "Error de autenticación con Gemini API"
- Verifica que la API key es correcta
- Verifica que la API key tiene permisos para usar Gemini API
- Revisa los límites de cuota en Google Cloud Console

### El botón del asistente no aparece
- Verifica que estás autenticado
- Verifica que el componente `AIChatWidget` está importado en `Layout.tsx`
- Revisa la consola del navegador para errores

