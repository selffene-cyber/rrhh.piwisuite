# 📅 Sistema de Feriados Legales - Documentación Completa

## 📋 Resumen Ejecutivo

Se ha implementado un sistema completo para gestionar feriados legales de Chile que integra:

1. ✅ **Tabla de feriados** en base de datos con datos 2019-2026 (cobertura histórica completa)
2. ✅ **API de sincronización** lista para APIs externas
3. ✅ **Cálculo correcto de días hábiles** excluyendo sábados, domingos y feriados
4. ✅ **Visualización de feriados** por año con modal interactivo
5. ✅ **Sistema 100% operativo** sin dependencia de APIs externas

---

## 🎯 Problema Que Resuelve

### ❌ Antes (Problema):
- El sistema calculaba vacaciones contando **días corridos** (calendario)
- No excluía sábados ni domingos correctamente
- **NO** consideraba feriados legales
- Ejemplo: 10 días corridos = 10 días descontados ❌

### ✅ Ahora (Solución):
- El sistema calcula **días hábiles** (lunes a viernes)
- Excluye automáticamente sábados y domingos
- Excluye feriados legales de Chile
- Ejemplo: 10 días corridos = 6-8 días hábiles descontados ✅

---

## 🛠️ Componentes Implementados

### 1. Migración de Base de Datos
**Archivo**: `supabase/migrations/095_create_holidays_table.sql`

**Tabla `holidays`**:
```sql
- id (UUID)
- date (DATE) - Fecha del feriado
- year (INTEGER) - Año
- name (TEXT) - Nombre del feriado
- type (TEXT) - 'nacional' | 'regional' | 'religioso'
- is_irrenunciable (BOOLEAN) - Si es irrenunciable por ley
- law_number (TEXT) - Número de ley que lo establece
- region (TEXT) - Para feriados regionales
- communes (TEXT[]) - Para feriados comunales
- source (TEXT) - 'api' | 'manual'
```

**Datos Iniciales**:
- ✅ Feriados 2019 (16 feriados)
- ✅ Feriados 2020 (15 feriados)
- ✅ Feriados 2021 (16 feriados)
- ✅ Feriados 2022 (16 feriados)
- ✅ Feriados 2023 (16 feriados)
- ✅ Feriados 2024 (17 feriados)
- ✅ Feriados 2025 (16 feriados)
- ✅ Feriados 2026 (17 feriados)

### 2. Servicio de Feriados
**Archivo**: `lib/services/holidaysService.ts`

**Funciones principales**:
```typescript
// Obtener feriados desde API del gobierno
fetchHolidaysFromGovernmentAPI(year: number)

// Sincronizar año completo desde API a BD
syncHolidaysFromAPI(year: number)

// Obtener feriados de un año
getHolidaysByYear(year: number)

// Obtener feriados en rango de fechas
getHolidaysInRange(startDate: string, endDate: string)

// Verificar si una fecha es feriado
isHoliday(date: string | Date)
```

### 3. Cálculo de Días Hábiles Mejorado
**Archivo**: `lib/services/vacationCalculator.ts`

**Función `calculateBusinessDays` (NUEVA)**:
```typescript
// Versión async que consulta feriados desde BD
async function calculateBusinessDays(
  startDate: Date, 
  endDate: Date,
  holidays?: string[]
): Promise<number>

// Excluye:
// - Sábados (día 6)
// - Domingos (día 0)
// - Feriados de la BD
```

**Ejemplo de uso**:
```typescript
const start = new Date('2025-09-15') // Lunes
const end = new Date('2025-09-21')   // Domingo

const days = await calculateBusinessDays(start, end)
// Resultado: 5 días (Lun, Mar, Mié, Jue, Vie)
// Excluye: Sáb 20 y Dom 21
// Si 18 o 19 sep son feriados, también se excluyen
```

### 4. API de Sincronización
**Archivo**: `app/api/holidays/sync/route.ts`

**Endpoints**:

**POST /api/holidays/sync**
```json
// Request
{
  "year": 2025
}

// Response (éxito)
{
  "success": true,
  "year": 2025,
  "count": 16,
  "message": "Se sincronizaron 16 feriados para el año 2025"
}

// Response (error)
{
  "error": "La API del gobierno retornó error 404",
  "details": "Los feriados para este año podrían no estar disponibles aún"
}
```

**GET /api/holidays/sync**
```json
// Response
{
  "totalHolidays": 50,
  "yearsCovered": [2024, 2025, 2026],
  "byYear": {
    "2024": {
      "total": 17,
      "fromAPI": 15,
      "manual": 2
    },
    "2025": {
      "total": 16,
      "fromAPI": 16,
      "manual": 0
    }
  }
}
```

### 5. Componente de Visualización
**Archivo**: `components/HolidaysModal.tsx`

**Características**:
- 📅 Ver feriados por año (2019-2028)
- 🔄 Sincronizar desde API del gobierno
- 📊 Estadísticas de feriados
- 🏷️ Etiquetas por tipo (Nacional, Regional, Religioso)
- ⚠️ Indicador de feriados irrenunciables
- 📜 Número de ley asociada

### 6. Integración en Dashboard
**Archivo**: `app/vacations/page.tsx`

**Botón agregado**: "📅 Feriados Legales"
- Ubicación: Header del dashboard de vacaciones
- Acción: Abre modal de feriados
- Color: Azul distintivo (#0ea5e9)

---

## 🔄 Flujo de Sincronización

### 1. Sincronización Manual (Por año)
```
Usuario → Click "Sincronizar" en modal
     ↓
Frontend → POST /api/holidays/sync { year: 2025 }
     ↓
Backend → fetch('https://apis.digital.gob.cl/fl/feriados/2025')
     ↓
API Gobierno → Retorna JSON con feriados
     ↓
Backend → Elimina feriados del año (source='api')
     ↓
Backend → Inserta nuevos feriados
     ↓
Frontend → Recarga lista de feriados
```

### 2. Uso en Cálculo de Vacaciones
```
Usuario → Selecciona fechas inicio/fin
     ↓
Frontend → calculateBusinessDays(start, end)
     ↓
Función → Consulta feriados en rango desde BD
     ↓
Función → Itera día por día
     ↓
Función → Excluye sábados, domingos, feriados
     ↓
Frontend → Muestra días hábiles calculados
```

---

## 📚 API del Gobierno Digital

### Endpoint Oficial
```
https://apis.digital.gob.cl/fl/feriados/{año}
```

### Ejemplo de Respuesta
```json
[
  {
    "fecha": "2025-01-01",
    "nombre": "Año Nuevo",
    "tipo": "Civil",
    "irrenunciable": "1",
    "ley": "Ley 2.977"
  },
  {
    "fecha": "2025-04-18",
    "nombre": "Viernes Santo",
    "tipo": "Religioso",
    "irrenunciable": "0"
  }
]
```

### Mapeo de Tipos
```typescript
"Civil" | "Nacional" → "nacional"
"Religioso"          → "religioso"
"Regional"           → "regional"
```

---

## 💻 Ejemplos de Uso

### Ejemplo 1: Calcular Días Hábiles
```typescript
import { calculateBusinessDays } from '@/lib/services/vacationCalculator'

// Solicitud de vacaciones: 15-21 septiembre 2025
const start = new Date('2025-09-15') // Lunes
const end = new Date('2025-09-21')   // Domingo

const days = await calculateBusinessDays(start, end)

// Resultado: 3 días
// Por qué:
// - Lun 15: Hábil ✓
// - Mar 16: Hábil ✓
// - Mié 17: Hábil ✓
// - Jue 18: FERIADO ❌ (Independencia)
// - Vie 19: FERIADO ❌ (Glorias del Ejército)
// - Sáb 20: Fin de semana ❌
// - Dom 21: Fin de semana ❌
```

### Ejemplo 2: Sincronizar Feriados
```typescript
// En el navegador
const response = await fetch('/api/holidays/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ year: 2027 })
})

const data = await response.json()
console.log(data.message)
// "Se sincronizaron 16 feriados para el año 2027"
```

### Ejemplo 3: Verificar si es Feriado
```typescript
import { isHoliday } from '@/lib/services/holidaysService'

const esNavidad = await isHoliday('2025-12-25')
console.log(esNavidad) // true

const esDiaComun = await isHoliday('2025-03-15')
console.log(esDiaComun) // false
```

---

## 🎨 Interfaz de Usuario

### Vista del Modal de Feriados

```
┌────────────────────────────────────────────────┐
│  📅 Feriados Legales de Chile            [X]  │
├────────────────────────────────────────────────┤
│  Total de feriados: 50                         │
│  Años cubiertos: 2024 - 2026                   │
├────────────────────────────────────────────────┤
│  Seleccionar Año:  [2025 ▼]  [🔄 Sincronizar] │
├────────────────────────────────────────────────┤
│  ℹ️ Los feriados se obtienen desde la API     │
│     oficial del Gobierno Digital de Chile      │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐ │
│  │ Año Nuevo              [IRRENUNCIABLE]   │ │
│  │ jueves, 1 de enero                       │ │
│  │ [Nacional] 📜 Ley 2.977              01  │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │ Viernes Santo                            │ │
│  │ viernes, 18 de abril                     │ │
│  │ [Religioso]                          18  │ │
│  └──────────────────────────────────────────┘ │
│  ...                                           │
├────────────────────────────────────────────────┤
│  Fuente oficial: Gobierno Digital de Chile    │
└────────────────────────────────────────────────┘
```

### Botón en Dashboard de Vacaciones

```
┌────────────────────────────────────────────────┐
│  🏖️ Dashboard de Vacaciones                   │
│                                                │
│  [📅 Feriados Legales] [Nueva Solicitud]      │
│                        [Volver al Dashboard]   │
└────────────────────────────────────────────────┘
```

---

## 🔒 Seguridad y Permisos

### RLS (Row Level Security)

**Ver feriados**: Todos los usuarios autenticados
```sql
CREATE POLICY "Todos pueden ver feriados"
  ON public.holidays
  FOR SELECT
  TO authenticated
  USING (true);
```

**Modificar feriados**: Solo administradores
```sql
CREATE POLICY "Solo admins pueden gestionar feriados"
  ON public.holidays
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

---

## ⚙️ Configuración y Mantenimiento

### 1. Ejecutar Migración
```bash
# En Supabase Dashboard → SQL Editor
# Ejecutar: supabase/migrations/095_create_holidays_table.sql
```

### 2. Verificar Datos Iniciales
```sql
SELECT year, COUNT(*) as total
FROM holidays
GROUP BY year
ORDER BY year;
```

Resultado esperado:
```
year | total
-----+------
2019 |   16
2020 |   15
2021 |   16
2022 |   16
2023 |   16
2024 |   17
2025 |   16
2026 |   17
```

### 3. Sincronizar Años Futuros
```typescript
// Desde el dashboard, como admin
// Click en "Feriados Legales"
// Seleccionar año (ej: 2027)
// Click en "Sincronizar"
```

### 4. Agregar Feriado Manual
```sql
INSERT INTO holidays (
  date, year, name, type, 
  is_irrenunciable, source
) VALUES (
  '2025-12-26', 2025, 'Día Bancario', 'regional',
  false, 'manual'
);
```

---

## 🐛 Solución de Problemas

### Problema 1: API del gobierno no responde

**Síntoma**: Error al sincronizar
```
❌ Error al sincronizar feriados:
La API del gobierno podría estar temporalmente fuera de servicio
```

**Solución**:
1. Los feriados 2024-2026 ya están cargados
2. Esperar y reintentar más tarde
3. Si es urgente, agregar manualmente

### Problema 2: Cálculo de días hábiles parece incorrecto

**Verificar**:
```typescript
// 1. Revisar feriados en el rango
const { data } = await supabase
  .from('holidays')
  .select('*')
  .gte('date', '2025-09-15')
  .lte('date', '2025-09-21')

console.log('Feriados en rango:', data)

// 2. Calcular manualmente
const start = new Date('2025-09-15')
const end = new Date('2025-09-21')
const days = await calculateBusinessDays(start, end)
console.log('Días hábiles:', days)
```

### Problema 3: Modal no se abre

**Verificar**:
```typescript
// 1. Revisar importación
import HolidaysModal from '@/components/HolidaysModal'

// 2. Revisar estado
const [showHolidaysModal, setShowHolidaysModal] = useState(false)

// 3. Revisar props
<HolidaysModal 
  isOpen={showHolidaysModal} 
  onClose={() => setShowHolidaysModal(false)} 
/>
```

---

## 📊 Estadísticas y Monitoreo

### Ver Resumen de Feriados
```sql
SELECT 
  year,
  COUNT(*) as total,
  SUM(CASE WHEN is_irrenunciable THEN 1 ELSE 0 END) as irrenunciables,
  SUM(CASE WHEN type = 'nacional' THEN 1 ELSE 0 END) as nacionales,
  SUM(CASE WHEN type = 'religioso' THEN 1 ELSE 0 END) as religiosos,
  SUM(CASE WHEN source = 'api' THEN 1 ELSE 0 END) as desde_api,
  SUM(CASE WHEN source = 'manual' THEN 1 ELSE 0 END) as manuales
FROM holidays
GROUP BY year
ORDER BY year DESC;
```

### Feriados Próximos
```sql
SELECT 
  date,
  name,
  type,
  is_irrenunciable,
  law_number
FROM holidays
WHERE date >= CURRENT_DATE
ORDER BY date
LIMIT 5;
```

---

## 🎓 Base Legal

### Código del Trabajo de Chile
- **Art. 67**: Feriado de 15 días hábiles por año
- **Art. 35**: Días hábiles son lunes a viernes

### Feriados Irrenunciables (Art. 169)
- 1 de enero (Año Nuevo)
- 1 de mayo (Día del Trabajo)
- 18 de septiembre (Independencia)
- 19 de septiembre (Glorias del Ejército)
- 25 de diciembre (Navidad)

Fuente: [Dirección del Trabajo](https://www.dt.gob.cl)

---

## ✅ Checklist de Implementación

- [x] Migración de base de datos
- [x] Servicio de feriados
- [x] Función de cálculo mejorada
- [x] API de sincronización
- [x] Componente visual
- [x] Integración en dashboard
- [x] Datos iniciales 2024-2026
- [x] Documentación completa
- [x] Manejo de errores
- [x] Permisos y seguridad

---

**Fecha de Implementación**: 15 de enero de 2026  
**Versión**: 1.0  
**Estado**: ✅ Completado y Operativo
