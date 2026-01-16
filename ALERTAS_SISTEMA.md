# Sistema de Alertas y Sugerencias

## Resumen

Sistema completo de alertas y sugerencias para la aplicación de RRHH/Remuneraciones, implementado en la rama `ALERT-TOOLTIPS`.

## Componentes Implementados

### 1. Base de Datos

**Archivo:** `supabase/alerts_table.sql`

Tabla `alerts` con los siguientes campos:
- `id` (UUID)
- `company_id` (UUID, FK a companies)
- `severity` (critical|high|info)
- `type` (contract_expiry|vacation_balance|legal_params_missing|sick_leave_active|...)
- `title` (VARCHAR)
- `message` (TEXT)
- `entity_type` (employee|payroll_period|company)
- `entity_id` (UUID nullable)
- `due_date` (DATE nullable)
- `metadata` (JSONB)
- `status` (open|dismissed|resolved)
- `created_at`, `updated_at`

**Índices:**
- Por company_id, status, severity, type
- Índice único para evitar duplicados (mismo tipo + entidad + fecha)

### 2. Servicio Alert Engine

**Archivo:** `lib/services/alertEngine.ts`

**Funciones principales:**
- `runAlertEngine(company_id, supabaseClient)`: Ejecuta todas las reglas de alertas

**Reglas implementadas:**

1. **Contract Expiry (plazo fijo)**
   - Alerta `high` cuando faltan ≤ 30 días
   - Alerta `critical` cuando faltan ≤ 10 días
   - Se resuelve automáticamente cuando el contrato vence o se renueva

2. **Vacation Balance (saldo alto)**
   - Alerta `high` cuando saldo ≥ 20 días
   - Alerta `critical` cuando saldo ≥ 30 días
   - Calcula: acumuladas (1.25 días/mes) - usadas

3. **Legal Params Missing**
   - Alerta `critical` cuando faltan parámetros legales (UTM/UF) del mes actual o siguiente
   - Se resuelve cuando se cargan los indicadores

4. **Sick Leave Active**
   - Alerta `info` cuando hay licencia médica activa
   - Informa sobre liquidación proporcional

### 3. Componentes UI

#### AlertFab (`components/AlertFab.tsx`)
- Botón flotante (FAB) en esquina inferior derecha
- Ícono de ampolleta (FaLightbulb)
- Badge con número de alertas activas
- Animación "bounce" solo cuando hay alertas
- Estilo corporativo (cuadrado, sin bordes redondeados)
- Color: fondo gris oscuro (#1f2937), ícono amarillo (#fbbf24)

#### AlertDrawer (`components/AlertDrawer.tsx`)
- Panel lateral (drawer) que se abre desde la derecha
- Tabs: "Críticas", "Importantes", "Info"
- Contador de alertas por severidad en cada tab
- Lista de alertas ordenadas por severidad y fecha

#### AlertListItem (`components/AlertListItem.tsx`)
- Item individual de alerta
- Muestra título, mensaje, fecha de vencimiento
- Botones de acción:
  - "Ir" → navega a la entidad relacionada
  - "Resolver" → marca como resuelta
  - "Ocultar" → marca como dismissed
- Colores según severidad:
  - Critical: rojo (#ef4444)
  - High: naranja (#f59e0b)
  - Info: azul (#3b82f6)

### 4. API Routes

#### GET `/api/alerts`
- Obtiene alertas abiertas de una empresa
- Query params: `company_id`
- Retorna: `{ alerts: Alert[] }`

#### POST `/api/alerts/[id]/resolve`
- Marca una alerta como resuelta
- Body: `{ status: 'resolved' }`
- Retorna: `{ success: true }`

#### POST `/api/alerts/run`
- Ejecuta el Alert Engine para una empresa
- Requiere autenticación y rol admin
- Body: `{ company_id: string }`
- Retorna: `{ success: true, created: number, resolved: number }`

### 5. Integración

El `AlertFab` está integrado en `components/Layout.tsx` y se muestra en todas las páginas (excepto login).

## Instalación

1. **Ejecutar SQL:**
   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- Ver archivo: supabase/alerts_table.sql
   ```

2. **El sistema está listo para usar**

## Uso

### Ejecutar Alert Engine manualmente

```bash
# Desde el frontend (requiere ser admin)
POST /api/alerts/run
Body: { "company_id": "uuid-de-la-empresa" }
```

### Automatización

Para ejecutar automáticamente, puedes:
1. Crear un cron job en Supabase (si está disponible)
2. Llamar a la API desde un servicio externo
3. Ejecutar manualmente desde la UI (futuro: botón en configuración)

## Estilo

- **Corporativo**: Sin bordes redondeados, líneas rectas
- **Tipografía**: Arial, sans-serif
- **Colores**: Grises corporativos, acentos según severidad
- **Sin iconos decorativos** en menú (excepto el FAB de alertas)

## Próximos Pasos (Opcional)

- [ ] Botón en Configuración para ejecutar Alert Engine manualmente
- [ ] Filtros adicionales en el drawer (por tipo, fecha, etc.)
- [ ] Notificaciones push cuando hay alertas críticas
- [ ] Exportar alertas a PDF/Excel
- [ ] Historial de alertas resueltas

