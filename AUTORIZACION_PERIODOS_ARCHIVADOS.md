# 🔐 Autorización para Tomar Días de Períodos Archivados

## 📋 Resumen Ejecutivo

El sistema ahora permite, **con autorización explícita de administrador**, tomar días de vacaciones de períodos archivados, siempre y cuando estos períodos **todavía tengan días disponibles**.

---

## 🎯 Caso de Uso

### Escenario Real

**Trabajador**: Juan Pérez  
**Fecha de ingreso**: 1 de enero de 2020  

**Situación en 2023**:
```
Períodos:
- 2020-2021: 15 días (ARCHIVADO por regla máx 2, pero aún tiene 15 días disponibles)
- 2021-2022: 15 días (ACTIVO)
- 2022-2023: 15 días (ACTIVO)
```

**Solicitud**: El trabajador quiere tomar 10 días en diciembre 2023.

**Problema**: Por FIFO automático, el sistema tomaría días del período 2021-2022 (el más antiguo ACTIVO), pero el jefe quiere autorizar que se tomen del período 2020-2021 (archivado) para "rescatar" esos días antes de que se pierdan completamente.

**Solución**: ✅ Con autorización de admin, especificar manualmente el año 2020-2021.

---

## 🔧 Cómo Funciona

### 1. **Modo Automático (FIFO)** - SIN autorización especial

```typescript
// Toma días automáticamente del período más antiguo ACTIVO
await assignVacationDays(employeeId, 10)
// Resultado: Descuenta del período ACTIVO más antiguo (2021-2022)
// NO considera períodos archivados
```

**Comportamiento**:
- ✅ Solo considera períodos con `status = 'active'` o `'completed'`
- ❌ Ignora períodos con `status = 'archived'`
- ✅ Aplica FIFO (First In, First Out)
- ✅ No requiere autorización especial

---

### 2. **Modo Manual con Año Específico** - CON autorización

```typescript
// Toma días de un período ESPECÍFICO (incluso archivado)
await assignVacationDays(employeeId, 10, 2020) // ← Especifica el año
// Resultado: Descuenta del período 2020-2021 (aunque esté archivado)
```

**Comportamiento**:
- ✅ Busca en TODOS los períodos (incluyendo archivados)
- ✅ Valida que el período exista
- ✅ Valida que el período tenga días disponibles
- ⚠️ Si el período está archivado, genera advertencia en consola
- ❌ Rechaza si el período archivado no tiene días disponibles

---

## 📊 Validaciones Implementadas

### Validación 1: Período Archivado Sin Días Disponibles

```typescript
// Período 2020-2021: 15 acumulados, 15 usados = 0 disponibles, ARCHIVADO

await assignVacationDays(employeeId, 10, 2020)

// ❌ ERROR:
// "El período 2020 está archivado y no tiene días disponibles (saldo: 0 días). 
//  Solo se pueden tomar días de períodos archivados si aún tienen saldo positivo."
```

---

### Validación 2: Período Archivado Con Días Disponibles

```typescript
// Período 2020-2021: 15 acumulados, 5 usados = 10 disponibles, ARCHIVADO

await assignVacationDays(employeeId, 10, 2020)

// ⚠️ ADVERTENCIA en consola:
// "AUTORIZACIÓN ESPECIAL: Se están tomando 10 días del período ARCHIVADO 2020. 
//  Disponible: 10.00 días. Esta operación requiere autorización explícita de administrador."

// ✅ ÉXITO: Se descuentan los 10 días del período 2020-2021
```

---

### Validación 3: Exceder Días Disponibles en Período Específico

```typescript
// Período 2020-2021: 15 acumulados, 10 usados = 5 disponibles, ARCHIVADO

await assignVacationDays(employeeId, 10, 2020)

// ❌ ERROR:
// "No se pueden tomar 10 días del período 2020. 
//  Solo hay 5.00 días disponibles."
```

---

## 🎨 Interfaz de Usuario

### Vista del Historial de Períodos

```
┌────────────────────────────────────────────────────────────────────┐
│ Año         Acumulado    Usado      Disponible    Estado          │
├────────────────────────────────────────────────────────────────────┤
│ 2023-2024   15.00 días   0 días     15.00 días    ✓ Activo       │
│ 2022-2023   15.00 días   0 días     15.00 días    ✓ Activo       │
│ 2021-2022   15.00 días   5 días     10.00 días    ⚠ Archivado    │
│             Archivado por regla de máximo 2 períodos              │
│             ⚠️ AÚN TIENE 10 DÍAS DISPONIBLES - SE PUEDEN RESCATAR │
│ 2020-2021   15.00 días   15 días    0 días        ⚠ Archivado    │
│             Archivado por regla de máximo 2 períodos              │
└────────────────────────────────────────────────────────────────────┘
```

**Nota**: Los períodos archivados con días disponibles se muestran con un mensaje especial indicando que se pueden rescatar con autorización.

---

## 📝 Flujo de Trabajo Recomendado

### Caso 1: Toma Normal de Vacaciones (Sin autorización especial)

1. **Trabajador**: Solicita 10 días de vacaciones
2. **Sistema**: Aplica FIFO automático
3. **Resultado**: Descuenta del período activo más antiguo

**No requiere intervención de admin**

---

### Caso 2: Rescate de Días Archivados (Con autorización)

1. **Admin**: Revisa historial y ve período archivado con días disponibles
2. **Admin**: Decide "rescatar" esos días antes de que se pierdan
3. **Admin**: Crea solicitud especificando el año archivado
4. **Sistema**: Valida que tenga días disponibles
5. **Sistema**: Genera advertencia en log (auditoría)
6. **Resultado**: Descuenta del período archivado especificado

**Requiere autorización explícita de admin**

---

## 🔍 Ejemplo Completo Paso a Paso

### Estado Inicial

```
Trabajador: Juan Pérez (ingreso: 01/01/2020)
Fecha actual: 15/12/2023

Períodos:
┌──────────┬─────────┬──────┬────────────┬──────────┐
│ Año      │ Acum.   │ Usado│ Disponible │ Estado   │
├──────────┼─────────┼──────┼────────────┼──────────┤
│ 2020-2021│ 15 días │ 0    │ 15 días    │ ARCHIVADO│
│ 2021-2022│ 15 días │ 0    │ 15 días    │ ACTIVO   │
│ 2022-2023│ 15 días │ 0    │ 15 días    │ ACTIVO   │
│ 2023-2024│ 15 días │ 0    │ 15 días    │ ACTIVO   │ ← Se genera al final de 2023
└──────────┴─────────┴──────┴────────────┴──────────┘
```

---

### Paso 1: Solicitud de 10 Días (Sin año específico)

```typescript
// Código interno del sistema cuando se aprueba la solicitud
await assignVacationDays('juan-id', 10)
// NO se especifica año → FIFO automático
```

**Resultado**: Descuenta del período 2021-2022 (más antiguo ACTIVO)

```
┌──────────┬─────────┬──────┬────────────┬──────────┐
│ Año      │ Acum.   │ Usado│ Disponible │ Estado   │
├──────────┼─────────┼──────┼────────────┼──────────┤
│ 2020-2021│ 15 días │ 0    │ 15 días    │ ARCHIVADO│ ← No se tocó
│ 2021-2022│ 15 días │ 10   │ 5 días     │ ACTIVO   │ ← Descontó 10
│ 2022-2023│ 15 días │ 0    │ 15 días    │ ACTIVO   │
│ 2023-2024│ 15 días │ 0    │ 15 días    │ ACTIVO   │
└──────────┴─────────┴──────┴────────────┴──────────┘
```

---

### Paso 2: Admin Decide Rescatar Período 2020-2021

**Razonamiento del Admin**:
- El período 2020-2021 está archivado pero tiene 15 días disponibles
- Si no se usan pronto, se perderán definitivamente
- Mejor autorizar que se tomen de ahí

```typescript
// Admin especifica manualmente el año 2020
await assignVacationDays('juan-id', 10, 2020)
//                                       ^^^^
//                                       Año específico (autorización)
```

**Sistema**:
1. Busca el período 2020-2021 (incluso archivados)
2. Verifica: ¿Tiene días disponibles? Sí (15 días)
3. Genera advertencia: "⚠️ AUTORIZACIÓN ESPECIAL: período ARCHIVADO"
4. Descuenta los 10 días

**Resultado**:

```
┌──────────┬─────────┬──────┬────────────┬──────────┐
│ Año      │ Acum.   │ Usado│ Disponible │ Estado   │
├──────────┼─────────┼──────┼────────────┼──────────┤
│ 2020-2021│ 15 días │ 10   │ 5 días     │ ARCHIVADO│ ← Descontó 10 (con autorización)
│ 2021-2022│ 15 días │ 0    │ 15 días    │ ACTIVO   │ ← No se tocó
│ 2022-2023│ 15 días │ 0    │ 15 días    │ ACTIVO   │
│ 2023-2024│ 15 días │ 0    │ 15 días    │ ACTIVO   │
└──────────┴─────────┴──────┴────────────┴──────────┘
```

✅ Se "rescataron" 10 días del período archivado 2020-2021

---

## 🛡️ Seguridad y Auditoría

### 1. Log de Advertencia

Cada vez que se toman días de un período archivado, se genera un log:

```javascript
console.warn(
  `⚠️ AUTORIZACIÓN ESPECIAL: Se están tomando 10 días del período ARCHIVADO 2020. 
   Disponible: 15.00 días. Esta operación requiere autorización explícita de administrador.`
)
```

**Propósito**: Dejar rastro auditable de estas operaciones especiales.

---

### 2. Validación de Disponibilidad

**Regla Estricta**: Solo se permiten días de períodos archivados si `available_days > 0`.

```typescript
if (availableInPeriod <= 0 && days > 0) {
  throw new Error("Período archivado sin días disponibles")
}
```

---

### 3. Separación de Modos

| Modo | Considera Archivados | Requiere Año | Requiere Autorización |
|------|---------------------|--------------|----------------------|
| **FIFO Automático** | ❌ No | ❌ No | ❌ No |
| **Manual con Año** | ✅ Sí | ✅ Sí | ✅ Sí |

---

## 📚 Referencia de API

### Función: `assignVacationDays`

```typescript
/**
 * @param employeeId - ID del trabajador
 * @param days - Días a asignar (positivo para usar, negativo para revertir)
 * @param periodYear - Año específico (opcional, requiere autorización)
 * @param allowArchived - Permitir archivados en modo automático (no recomendado)
 * @returns Array de períodos actualizados
 */
function assignVacationDays(
  employeeId: string,
  days: number,
  periodYear?: number,
  allowArchived: boolean = false
): Promise<VacationPeriod[]>
```

---

### Ejemplo 1: FIFO Automático (Solo Activos)

```typescript
const updated = await assignVacationDays('emp-123', 10)
// Descuenta de períodos activos, más antiguo primero
```

---

### Ejemplo 2: Año Específico Activo

```typescript
const updated = await assignVacationDays('emp-123', 10, 2023)
// Descuenta del período 2023 si existe y está activo
```

---

### Ejemplo 3: Año Específico Archivado (Con Autorización)

```typescript
const updated = await assignVacationDays('emp-123', 10, 2020)
// Descuenta del período 2020 AUNQUE esté archivado
// Requiere que tenga días disponibles
// Genera advertencia en log
```

---

## ✅ Casos de Éxito

### ✓ Caso 1: FIFO Normal
- Descuenta de períodos activos
- Más antiguo primero
- Sin intervención admin

### ✓ Caso 2: Rescate de Días Archivados
- Admin especifica año archivado
- Período tiene días disponibles
- Se genera log de auditoría
- Se descuentan los días

### ✓ Caso 3: Revertir Días (Negativo)
- Admin puede devolver días a cualquier período
- Útil para corregir errores

---

## ❌ Casos de Error

### ✗ Error 1: Período Archivado Sin Días
```
❌ "El período 2020 está archivado y no tiene días disponibles"
```

### ✗ Error 2: Período No Existe
```
❌ "No se encontró el período 2020"
```

### ✗ Error 3: Excede Disponibles
```
❌ "No se pueden tomar 10 días del período 2020. Solo hay 5.00 días disponibles."
```

### ✗ Error 4: Sin Períodos Activos (FIFO)
```
❌ "No hay períodos activos disponibles. 
    Si desea tomar días de un período archivado, debe especificar el año manualmente."
```

---

## 🎯 Conclusión

Esta funcionalidad permite **flexibilidad con control**: los administradores pueden "rescatar" días de períodos archivados cuando sea necesario, pero el sistema mantiene validaciones estrictas y genera logs de auditoría para cumplimiento legal.

**Modo Normal (99% de casos)**: FIFO automático, solo períodos activos  
**Modo Excepcional (1% de casos)**: Admin especifica año archivado, con validación y log

---

**Fecha**: 8 de enero de 2025  
**Versión**: 1.0  
**Implementado en**: `lib/services/vacationPeriods.ts`



