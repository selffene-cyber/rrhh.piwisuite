# 🔧 Corrección FIFO para Vacaciones

## 📋 Problema Detectado

El sistema **NO** estaba aplicando correctamente la lógica **FIFO (First In, First Out)** para el descuento de vacaciones.

### ❌ Comportamiento Incorrecto (Anterior):

Cuando un empleado solicitaba vacaciones para febrero 2026:
- El sistema asignaba el `period_year = 2026` (año de la fecha de toma)
- **Ignoraba** que aún quedaban días del periodo 2025
- Los días del 2025 quedaban sin usar y podían vencer

**Ejemplo:**
```
Periodo 2025: 10 días disponibles
Periodo 2026: 15 días disponibles

Solicitud: 02/02/2026 - 06/02/2026 (5 días)
❌ INCORRECTO: Se descontaba del periodo 2026
✅ CORRECTO: Debe descontarse del periodo 2025 (FIFO)
```

---

## ✅ Solución Implementada

### **Lógica FIFO:**

**FIFO = "First In, First Out" = "Primero en entrar, primero en salir"**

Los días de vacaciones deben consumirse en el **orden de acumulación de los periodos**, NO en el orden de la fecha en que se toman.

**Prioridad de descuento:**
1. Periodo 2025 (más antiguo) - descontar primero
2. Periodo 2026 (más reciente) - solo si se agotó el 2025
3. Periodos futuros - según orden cronológico

**Razón:** Los días antiguos suelen tener fecha de vencimiento. Deben usarse primero para no perderlos.

---

## 📝 Archivos Modificados

### 1. **Frontend - Creación de Vacaciones**
`app/employees/[id]/vacations/page.tsx`

**Cambio:**
- Ahora **SIEMPRE** calcula el periodo FIFO al crear una solicitud, incluso si está en estado 'solicitada'
- Busca el primer periodo con días disponibles, ordenando por `period_year` ascendente
- Asigna ese periodo a la vacación desde el inicio

```typescript
// ✅ SIEMPRE determinar el período usando FIFO
const allPeriods = await getVacationPeriods(params.id, false)
const sortedPeriods = [...allPeriods].sort((a, b) => a.period_year - b.period_year)

// Encontrar el primer período con días disponibles (FIFO)
const firstAvailablePeriod = sortedPeriods.find(p => 
  (p.accumulated_days - p.used_days) > 0
)

const periodYear = firstAvailablePeriod ? firstAvailablePeriod.period_year : startDate.getFullYear()
```

---

### 2. **API - Creación de Vacaciones (Admin Dashboard)**
`app/api/vacations/route.ts`

**Cambio:**
- Antes de insertar la vacación, calcula el periodo FIFO
- Si el estado es 'aprobada' o 'tomada', descuenta días inmediatamente usando `assignVacationDays()`
- Actualiza el `period_year` con el periodo real asignado

```typescript
// ✅ Determinar el período usando FIFO
await syncVacationPeriods(body.employee_id, employee.hire_date)

const allPeriods = await getVacationPeriods(body.employee_id, false)
const sortedPeriods = [...allPeriods].sort((a, b) => a.period_year - b.period_year)

const firstAvailablePeriod = sortedPeriods.find(p => 
  (p.accumulated_days - p.used_days) > 0
)

const periodYear = firstAvailablePeriod ? firstAvailablePeriod.period_year : startDate.getFullYear()
body.period_year = periodYear

// Si es aprobada/tomada, descontar días
if (body.status === 'aprobada' || body.status === 'tomada') {
  const updatedPeriods = await assignVacationDays(body.employee_id, body.days_count)
  if (updatedPeriods.length > 0) {
    body.period_year = updatedPeriods[0].period_year
  }
}
```

---

### 3. **API - Aprobación de Vacaciones**
`app/api/vacations/[id]/approve/route.ts`

**Cambio:**
- Al aprobar una vacación, descuenta días usando FIFO con `assignVacationDays()`
- **Actualiza el `period_year`** de la vacación con el periodo real del que se descontaron los días
- Esto corrige solicitudes que tenían un `period_year` incorrecto desde su creación

```typescript
// ✅ DESCONTAR DÍAS DEL PERÍODO DE VACACIONES (FIFO)
await syncVacationPeriods(vacation.employee_id, employeeData.hire_date)

const updatedPeriods = await assignVacationDays(
  vacation.employee_id,
  vacation.days_count
)

// ✅ Actualizar el period_year con el periodo real (FIFO)
if (updatedPeriods.length > 0) {
  const realPeriodYear = updatedPeriods[0].period_year
  
  await supabase
    .from('vacations')
    .update({ period_year: realPeriodYear })
    .eq('id', params.id)
  
  console.log(`✅ Días descontados usando FIFO: ${vacation.days_count} días del periodo ${realPeriodYear}`)
}
```

---

### 4. **API - Solicitud de Vacaciones (Portal Empleado)**
`app/api/employee/vacations/request/route.ts`

**Cambio:**
- Al crear una solicitud desde el portal del empleado, ahora calcula el periodo FIFO
- Asigna el `period_year` correcto desde el inicio

```typescript
// ✅ Determinar el período usando FIFO
const allPeriods = await getVacationPeriods(employee.id, false)
const sortedPeriods = [...allPeriods].sort((a, b) => a.period_year - b.period_year)

const firstAvailablePeriod = sortedPeriods.find(p => 
  (p.accumulated_days - p.used_days) > 0
)

const periodYear = firstAvailablePeriod ? firstAvailablePeriod.period_year : start.getFullYear()

vacationData.period_year = periodYear // ✅ Asignar período FIFO
```

---

## 🎯 Beneficios de la Corrección

### ✅ **Cumplimiento Legal:**
- Respeta la legislación chilena sobre vacaciones
- Los días más antiguos se usan primero (evita vencimientos)

### ✅ **Transparencia:**
- El `period_year` en la tabla refleja el periodo REAL del que se descontaron los días
- Los administradores ven claramente qué periodos están siendo consumidos

### ✅ **Automatización:**
- El sistema calcula automáticamente el periodo correcto
- No hay necesidad de selección manual (menos errores)

### ✅ **Consistencia:**
- Todas las vías de creación de vacaciones usan la misma lógica:
  - Creación desde admin dashboard
  - Solicitud desde portal de empleado
  - Aprobación de solicitudes existentes

---

## 📊 Ejemplo Práctico

### Escenario:
```
Empleado: Juan Pérez
Fecha ingreso: 01/03/2023

Periodo 2025: 15 días acumulados, 10 días usados → 5 días disponibles
Periodo 2026: 15 días acumulados, 0 días usados → 15 días disponibles
```

### Solicitud:
```
Fecha: 05/02/2026 - 09/02/2026 (5 días hábiles)
```

### Resultado FIFO (Correcto):

**ANTES de aprobar:**
```sql
INSERT INTO vacations (
  employee_id,
  start_date,
  end_date,
  days_count,
  status,
  period_year  -- ✅ 2025 (FIFO, no 2026)
) VALUES (
  'juan-id',
  '2026-02-05',
  '2026-02-09',
  5,
  'solicitada',
  2025  -- ✅ Asignado al periodo más antiguo
);
```

**DESPUÉS de aprobar:**
```
Periodo 2025: 15 - 15 = 0 días disponibles (completado)
Periodo 2026: 15 - 0 = 15 días disponibles (sin tocar)

Vacación actualizada:
- period_year = 2025 (confirmado por FIFO en aprobación)
- status = 'aprobada'
```

---

## 🧪 Testing

### ✅ Para probar la corrección:

1. **Crear un empleado** con fecha de ingreso antigua (ej: 2023)
2. **Verificar periodos** en la tabla `vacation_periods`:
   - Debe tener múltiples periodos (2023, 2024, 2025, 2026)
   - Algunos con días disponibles

3. **Crear una solicitud de vacaciones** para una fecha futura (ej: marzo 2026)
4. **Verificar** que el `period_year` sea del periodo MÁS ANTIGUO con días disponibles
5. **Aprobar** la solicitud
6. **Verificar** que los días se descontaron del periodo correcto (FIFO)

### 📝 Consulta SQL para verificar:

```sql
-- Ver periodos de un empleado
SELECT 
  period_year,
  accumulated_days,
  used_days,
  (accumulated_days - used_days) as available_days,
  status
FROM vacation_periods
WHERE employee_id = 'EMPLOYEE_ID'
ORDER BY period_year ASC;

-- Ver vacaciones con sus periodos asignados
SELECT 
  v.id,
  v.start_date,
  v.end_date,
  v.days_count,
  v.status,
  v.period_year,  -- ✅ Debe ser del periodo más antiguo
  vp.accumulated_days,
  vp.used_days,
  (vp.accumulated_days - vp.used_days) as available_in_period
FROM vacations v
JOIN vacation_periods vp ON vp.employee_id = v.employee_id AND vp.period_year = v.period_year
WHERE v.employee_id = 'EMPLOYEE_ID'
ORDER BY v.start_date DESC;
```

---

## 📌 Notas Importantes

### 1. **Vacaciones Existentes:**
- Las vacaciones creadas ANTES de esta corrección pueden tener `period_year` incorrecto
- Al **aprobarlas**, el sistema las corregirá automáticamente usando FIFO

### 2. **Periodos Archivados:**
- Los periodos archivados se incluyen en el cálculo FIFO
- Esto permite dar vacaciones de periodos antiguos por mutuo acuerdo (legal en Chile)

### 3. **Días Negativos:**
- El sistema permite días negativos (dar vacaciones de periodos futuros)
- Esto es legal en Chile por mutuo acuerdo empleador-trabajador

### 4. **Sincronización de Periodos:**
- Antes de calcular FIFO, siempre se sincronizan los periodos con `syncVacationPeriods()`
- Esto asegura que los periodos estén actualizados con los días acumulados

---

## ✅ Estado Final

- ✅ Build exitoso (sin errores de compilación)
- ✅ Lógica FIFO implementada en todas las rutas de creación
- ✅ Aprobación de vacaciones corrige `period_year` incorrecto
- ✅ Portal de empleado usa FIFO automáticamente
- ✅ Consistencia entre frontend y backend

---

## 🚀 Próximos Pasos

1. **Probar** con datos reales en localhost
2. **Verificar** que las solicitudes nuevas usen el periodo correcto
3. **Aprobar** solicitudes existentes para corregir su `period_year`
4. **Desplegar** a producción cuando se confirme el funcionamiento

---

**Fecha de corrección:** 15/01/2026  
**Archivos modificados:** 4  
**Complejidad:** Media  
**Impacto:** Alto (afecta toda la gestión de vacaciones)
