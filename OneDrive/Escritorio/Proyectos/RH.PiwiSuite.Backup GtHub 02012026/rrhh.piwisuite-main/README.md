# Sistema de Remuneraciones y RRHH - Chile

Sistema web profesional para gestión de trabajadores y liquidaciones de sueldo según normativa chilena.

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18
- **Backend**: API Routes de Next.js
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **PDF**: @react-pdf/renderer

## Configuración Inicial para Desarrollo Local

### Opción 1: Desde la raíz del repositorio (Recomendado)

El proyecto tiene un `package.json` en la raíz que ejecuta los comandos en el subdirectorio `rrhh.piwisuite-main/`:

1. **Instalar dependencias:**
```bash
npm run install:app
# O directamente:
cd rrhh.piwisuite-main
npm install
```

2. **Configurar variables de entorno:**
   - Copiar `env.example` a `.env.local` en `rrhh.piwisuite-main/`
   - Completar las variables requeridas:
```env
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui  # Opcional, para endpoints admin
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. **Ejecutar migraciones SQL en Supabase** (ver `supabase/schema.sql` y `supabase/rls_policies.sql`)

4. **Ejecutar en desarrollo:**
```bash
# Desde la raíz:
npm run dev

# O desde rrhh.piwisuite-main:
cd rrhh.piwisuite-main
npm run dev
```

5. **Abrir en el navegador:**
   - La aplicación estará disponible en `http://localhost:3000`
   - Si entras sin configurar Supabase, verás una guía en `http://localhost:3000/setup`

### Opción 2: Trabajar directamente en rrhh.piwisuite-main/

Si prefieres trabajar directamente en el subdirectorio:

```bash
cd rrhh.piwisuite-main
npm install
# Crear .env.local con las variables de entorno
npm run dev
```

## Scripts Disponibles (desde la raíz)

- `npm run install:app` - Instala dependencias en `rrhh.piwisuite-main/`
- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## Estructura del Proyecto

```
/app              - Rutas y páginas (App Router)
/components       - Componentes React reutilizables
/lib              - Utilidades y servicios
/types            - Tipos TypeScript
/supabase         - Configuración y esquemas SQL
/public           - Archivos estáticos
```

## Funcionalidades

- ✅ Gestión de trabajadores
- ✅ Configuración de empresa
- ✅ Generación de liquidaciones mensuales
- ✅ Cálculo automático de haberes y descuentos
- ✅ Exportación a PDF
- ✅ Historial de liquidaciones


