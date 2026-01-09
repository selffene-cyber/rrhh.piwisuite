# 🏖️ Implementación: Sistema de Vacaciones Mejorado

## 📋 Resumen Ejecutivo

Se ha implementado un sistema robusto de gestión de vacaciones conforme al **Código del Trabajo de Chile** y dictámenes de la Dirección del Trabajo, con las siguientes mejoras:

### ✅ Implementado (Fase 1-3)

1. **Descuento FIFO Multi-Período** ✅
   - Los días de vacaciones se descuentan automáticamente del período más antiguo primero
   - Si un período se agota, continúa con el siguiente automáticamente
   - Ejemplo: Tomas 20 días → descuenta 15 del 2023 (lo completa), y 5 del 2024

2. **Historial Completo de Períodos** ✅
   - Se mantiene el historial de TODOS los períodos, incluso los archivados
   - Estados: `active`, `completed`, `archived`
   - Los períodos archivados por la regla de máximo 2 se marcan con motivo legal

3. **Servicio de Notificaciones de Vacaciones** ✅
   - Detecta trabajadores con riesgo de perder días
   - 3 niveles: Crítico (60+ días), Urgente (45+ días), Moderado (30+ días)
   - Basado en Art. 70 y Ord. N°6287/2017, N°307/2025

### ⏳ En Progreso (Fase 4-6)

4. **Integración al Dropdown de Notificaciones** 🔄
   - Combinar notificaciones de contratos y vacaciones
   - Mostrar alertas en el mismo componente del header

5. **Actualización del Manual de Vacaciones** 🔄
   - Agregar ejemplo real: Contrato 2022-01-01, 15 días tomados en 2025
   - Detallar descuento FIFO con tabla visual
   - Agregar sección sobre notificaciones

6. **Actualización del Manual de Notificaciones** 🔄
   - Incorporar sección de alertas de vacaciones
   - Explicar cuándo y por qué se generan

---

## 🔧 Cambios Técnicos Implementados

### 1. Migración de Base de Datos

**Archivo**: `supabase/migrations/094_add_vacation_period_history.sql`

**Cambios**:
```sql
-- Agregar columnas para historial
ALTER TABLE vacation_periods
ADD COLUMN status VARCHAR(20) DEFAULT 'active'
CHECK (status IN ('active', 'completed', 'archived'));

ADD COLUMN archived_reason TEXT NULL;
ADD COLUMN archived_at TIMESTAMP NULL;

-- Función para archivar (en lugar de eliminar)
CREATE OR REPLACE FUNCTION archive_old_vacation_periods(p_employee_id UUID) ...
```

**Impacto**: Los períodos antiguos ya no se eliminan físicamente, se archivan con motivo legal.

---

### 2. Función FIFO Mejorada

**Archivo**: `lib/services/vacationPeriods.ts`

**Antes**:
```typescript
// Solo asignaba a UN período
export async function assignVacationDays(
  employeeId: string,
  days: number,
  periodYear?: number
): Promise<VacationPeriod | null>
```

**Después**:
```typescript
// Asigna a MÚLTIPLES períodos automáticamente (FIFO)
export async function assignVacationDays(
  employeeId: string,
  days: number,
  periodYear?: number
): Promise<VacationPeriod[]>
```

**Lógica FIFO**:
```typescript
// Ordenar períodos por año ascendente (más antiguo primero)
const sortedPeriods = [...periods].sort((a, b) => a.period_year - b.period_year)

let remainingDays = days

for (const period of sortedPeriods) {
  const availableInPeriod = period.accumulated_days - period.used_days
  const daysToAssign = Math.min(remainingDays, availableInPeriod)
  
  if (daysToAssign > 0) {
    // Actualizar período
    remainingDays -= daysToAssign
  }
  
  if (remainingDays <= 0) break
}
```

---

### 3. Historial de Períodos

**Función `getVacationPeriods` Mejorada**:
```typescript
export async function getVacationPeriods(
  employeeId: string,
  includeArchived: boolean = false  // NUEVO parámetro
): Promise<VacationPeriod[]>
```

**Uso**:
```typescript
// Solo períodos activos (para cálculos)
const activePeriods = await getVacationPeriods(employeeId)

// Historial completo (para auditoría/reportes)
const allPeriods = await getVacationPeriods(employeeId, true)
```

---

### 4. Servicio de Notificaciones de Vacaciones

**Archivo**: `lib/services/vacationNotifications.ts`

**Tipos de Alerta**:
```typescript
export type VacationAlertType = 
  | 'critical_loss'          // ≥60 días (puede perder días)
  | 'high_accumulation'      // ≥45 días (cerca del límite)
  | 'moderate_accumulation'  // ≥30 días (planificar)
  | 'pending_expiry'         // Período por expirar
```

**Función Principal**:
```typescript
export async function getVacationNotifications(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<VacationNotification[]>
```

**Estructura de Notificación**:
```typescript
interface VacationNotification {
  id: string
  employee: {
    id: string
    full_name: string
    rut: string
    hire_date: string
  }
  totalAccumulated: number
  totalUsed: number
  totalAvailable: number
  periodsCount: number
  alertType: VacationAlertType
  priority: number  // 1=crítico, 2=alto, 3=medio
  message: string
  legalReference: string  // Art. 70, Ord. N°6287/2017, etc.
}
```

---

## 📊 Ejemplo Práctico: Caso del Usuario

### Datos del Trabajador
```
Fecha de ingreso: 1 de enero de 2022
Fecha actual: 8 de enero de 2025
Meses completos: 36 meses
```

### Cálculo de Días Acumulados
```
36 meses × 1.25 días/mes = 45 días totales
```

### Distribución por Períodos (Sin tomar vacaciones)
```
┌──────┬─────────────┬────────┬──────────────┬──────────┐
│ Año  │ Acumulados  │ Usados │ Disponibles  │ Estado   │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2022 │ 12.50 días  │ 0 días │ 12.50 días   │ ARCHIVED │
│      │             │        │              │ (regla   │
│      │             │        │              │  máx 2)  │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2023 │ 15.00 días  │ 0 días │ 15.00 días   │ ACTIVE   │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2024 │ 15.00 días  │ 0 días │ 15.00 días   │ ACTIVE   │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2025 │ 2.50 días   │ 0 días │ 2.50 días    │ ACTIVE   │
│      │ (parcial)   │        │              │ (nuevo)  │
└──────┴─────────────┴────────┴──────────────┴──────────┘

Total Acumulado Real: 45.00 días
Total Disponible (máx 2 períodos + parcial): 32.50 días
Períodos Archivados: 1 (2022 - 12.50 días perdidos por regla legal)
```

### Al Tomar 15 Días en 2025 (FIFO)

**Descuento Automático**:
1. Período 2023 (más antiguo activo): Descuenta 15 días → queda en 0 (completado)
2. Período 2024: No se toca (queda con 15 días)
3. Período 2025: No se toca (queda con 2.50 días)

**Resultado**:
```
┌──────┬─────────────┬────────┬──────────────┬──────────┐
│ Año  │ Acumulados  │ Usados │ Disponibles  │ Estado   │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2022 │ 12.50 días  │ 0 días │ 0 días       │ ARCHIVED │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2023 │ 15.00 días  │ 15 días│ 0 días       │ COMPLETED│
│      │             │        │              │ (agotado)│
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2024 │ 15.00 días  │ 0 días │ 15.00 días   │ ACTIVE   │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2025 │ 2.50 días   │ 0 días │ 2.50 días    │ ACTIVE   │
└──────┴─────────────┴────────┴──────────────┴──────────┘

Total Disponible: 17.50 días (15 + 2.50)
```

---

## 🔔 Notificaciones de Vacaciones

### Cuándo Se Generan

| Días Acumulados | Tipo de Alerta | Prioridad | Base Legal |
|-----------------|----------------|-----------|------------|
| ≥ 60 días (2 períodos) | 🔴 CRÍTICO | 1 | Art. 70 Código del Trabajo |
| 45-59 días | ⚠️ URGENTE | 2 | Ord. N°6287/2017 DT |
| 30-44 días | 🟡 MODERADO | 3 | Ord. N°307/2025 DT |

### Ejemplo de Mensaje

**Crítico** (60+ días):
```
¡CRÍTICO! Trabajador con 60.00 días acumulados (2 períodos). 
Puede perder días si no toma vacaciones pronto.

Referencia Legal: Art. 70 Código del Trabajo - Máximo 2 períodos acumulados
```

**Urgente** (45-59 días):
```
Trabajador con 47.50 días acumulados. 
Planificar vacaciones pronto para evitar pérdida.

Referencia Legal: Ord. N°6287/2017 DT - Obligación de otorgar feriado antes de nuevo período
```

---

## 🎯 Próximos Pasos (Pendientes)

### 1. Integración Visual (Dropdown)

**Objetivo**: Combinar notificaciones de contratos y vacaciones en el mismo botón del header.

**Diseño Propuesto**:
```
┌─────────────────────────────────────────────┐
│  Notificaciones (Contratos y Vacaciones) [X]│
│  2 contratos vencidos, 1 vacación crítica   │
├─────────────────────────────────────────────┤
│  📄 CONTRATOS                               │
│  ⚠️ VENCIDOS / VENCEN HOY (2)              │
│  ...                                        │
├─────────────────────────────────────────────┤
│  🏖️ VACACIONES                             │
│  🔴 CRÍTICO - RIESGO DE PÉRDIDA (1)        │
│  Juan Pérez - 62.5 días acumulados         │
│  → Ver ficha del trabajador                │
└─────────────────────────────────────────────┘
```

### 2. Actualización de Manuales

**`MANUAL_GESTION_VACACIONES.md`**:
- [ ] Agregar sección "Descuento FIFO Explicado"
- [ ] Agregar tabla visual del caso real (2022-2025)
- [ ] Agregar sección "Notificaciones de Vacaciones"
- [ ] Actualizar FAQs con ejemplos de archivado

**`MANUAL_NOTIFICACIONES_CONTRATOS.md`**:
- [ ] Agregar sección "Notificaciones de Vacaciones"
- [ ] Explicar integración contratos + vacaciones
- [ ] Agregar tabla de alertas de vacaciones
- [ ] Ejemplos de uso combinado

---

## 📝 Instrucciones para Ejecutar

### 1. Ejecutar Migración

```bash
# En Supabase Dashboard → SQL Editor
# Ejecutar: supabase/migrations/094_add_vacation_period_history.sql
```

### 2. Verificar Cambios

```sql
-- Ver resumen de períodos por estado
SELECT 
  e.full_name,
  vp.period_year,
  vp.accumulated_days,
  vp.used_days,
  (vp.accumulated_days - vp.used_days) as available_days,
  vp.status,
  vp.archived_reason
FROM vacation_periods vp
JOIN employees e ON e.id = vp.employee_id
WHERE e.company_id = 'TU_COMPANY_ID'
ORDER BY e.full_name, vp.period_year DESC;
```

### 3. Probar FIFO

```typescript
import { assignVacationDays } from '@/lib/services/vacationPeriods'

// Tomar 20 días (descuenta automáticamente de múltiples períodos)
const updatedPeriods = await assignVacationDays(employeeId, 20)

console.log('Períodos actualizados:', updatedPeriods.length)
// Ejemplo: Si el primer período tenía 15 días, descuenta 15 de ahí 
// y 5 del segundo período
```

### 4. Verificar Notificaciones

```typescript
import { getVacationNotifications } from '@/lib/services/vacationNotifications'

const notifications = await getVacationNotifications(companyId, supabase)

console.log('Alertas de vacaciones:', notifications.length)
console.log('Críticas:', notifications.filter(n => n.priority === 1).length)
```

---

## 🐛 Troubleshooting

### Problema 1: Períodos no se archivan

**Síntoma**: Trabajadores con más de 2 períodos activos

**Solución**:
```typescript
// Forzar sincronización
await syncVacationPeriods(employeeId, hireDate)
```

### Problema 2: Descuento FIFO no funciona correctamente

**Verificar**:
```sql
-- Ver orden de períodos
SELECT period_year, accumulated_days, used_days, status
FROM vacation_periods
WHERE employee_id = 'EMPLOYEE_ID'
ORDER BY period_year ASC;  -- Más antiguo primero
```

### Problema 3: Notificaciones no aparecen

**Verificar**:
```typescript
// Debug notificaciones
const notifications = await getVacationNotifications(companyId, supabase)
console.log('Total notificaciones:', notifications.length)
console.log(notifications)  // Ver detalles
```

---

## 📚 Referencias Legales

### Código del Trabajo de Chile

- **Art. 67**: Derecho a feriado de 15 días hábiles por año trabajado
- **Art. 70**: Máximo 2 períodos acumulados (60 días)
- **Art. 73**: Compensación en dinero solo al término de la relación laboral

### Dictámenes Dirección del Trabajo

- **Ord. N°6287/2017**: Acumulación máxima y obligación de otorgar feriado
- **Ord. N°307/2025**: Empleador debe gestionar acumulación

---

## ✅ Checklist de Implementación

- [x] Función FIFO multi-período
- [x] Historial de períodos (incluye archivados)
- [x] Servicio de notificaciones de vacaciones
- [x] Migración de base de datos
- [x] Corrección de tipos TypeScript
- [x] Build exitoso sin errores
- [ ] Integración al dropdown de notificaciones
- [ ] Actualización Manual de Vacaciones
- [ ] Actualización Manual de Notificaciones
- [ ] Pruebas con datos reales
- [ ] Deploy y validación en producción

---

**Fecha**: 8 de enero de 2025  
**Versión**: 1.0 (Fases 1-3 completadas)  
**Estado**: 🟡 En Progreso (Fases 4-6 pendientes)


