# Sistema de Remuneraciones y RRHH - Chile

Sistema web profesional para gestión de trabajadores y liquidaciones de sueldo según normativa chilena.

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18
- **Backend**: API Routes de Next.js
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **PDF**: @react-pdf/renderer

## Configuración Inicial

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
Crear archivo `.env.local` (puedes copiar `env.example`) con:
```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

3. Ejecutar migraciones SQL en Supabase (ver `supabase/schema.sql`)

4. Ejecutar en desarrollo:
```bash
npm run dev
```

Si entras a la app sin configurar Supabase, verás una guía en `http://localhost:3000/setup`.

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


