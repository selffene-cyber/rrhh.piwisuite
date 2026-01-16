# Guía de Configuración - Sistema de Remuneraciones

## 1. Instalación de Dependencias

```bash
npm install
```

## 2. Configuración de Supabase

### 2.1 Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Anota la URL del proyecto y la clave anónima (anon key)

### 2.2 Ejecutar Migraciones SQL

1. En el panel de Supabase, ve a "SQL Editor"
2. Abre el archivo `supabase/schema.sql`
3. Copia y pega todo el contenido en el editor SQL
4. Ejecuta el script para crear todas las tablas

### 2.3 Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

También puedes copiar el archivo `env.example`:

```bash
# Windows (PowerShell)
Copy-Item env.example .env.local

# macOS/Linux
cp env.example .env.local
```

## 3. Ejecutar el Proyecto

```bash
npm run dev
```

El sistema estará disponible en `http://localhost:3000`

## 4. Configuración Inicial

### 4.1 Configurar Datos de la Empresa

1. Ve a "Configuración" en el menú
2. Completa los datos de la empresa:
   - Razón Social
   - Nombre del Empleador
   - RUT
   - Dirección
   - Ciudad/Sucursal

### 4.2 Crear Primer Trabajador

1. Ve a "Trabajadores" → "Nuevo Trabajador"
2. Completa todos los datos personales y laborales
3. Guarda el trabajador

### 4.3 Generar Primera Liquidación

1. Ve a "Liquidaciones" → "Nueva Liquidación"
2. Selecciona el trabajador
3. Completa los datos del período y haberes adicionales
4. Revisa el cálculo automático
5. Guarda la liquidación

## 5. Estructura de Carpetas

```
/app              - Páginas y rutas (App Router)
/components       - Componentes React reutilizables
/lib              - Servicios y utilidades
  /services       - Lógica de negocio (cálculos)
  /supabase       - Cliente de Supabase
  /utils          - Utilidades generales
/types            - Tipos TypeScript
/supabase         - Esquemas SQL
```

## 6. Características Implementadas

✅ Gestión completa de trabajadores
✅ Configuración de empresa
✅ Generación de liquidaciones con cálculo automático
✅ Exportación a PDF
✅ Historial de liquidaciones
✅ Cálculo según normativa chilena:
   - AFP (10% + adicional)
   - Salud (ISAPRE 7% o FONASA)
   - Seguro de cesantía
   - Impuesto único (tabla progresiva)
   - Gratificación mensual

## 7. Próximas Mejoras (Preparado para)

- Integración con API Previred
- Gestión de vacaciones
- Licencias médicas
- Control de asistencia
- Reportes avanzados


