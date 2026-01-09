# 📚 MANUAL COMPLETO: Gestión de Vacaciones

## 🎯 Índice

1. [Introducción](#introducción)
2. [Marco Legal](#marco-legal)
3. [Estructura del Módulo](#estructura-del-módulo)
4. [Dashboard de Vacaciones](#dashboard-de-vacaciones)
5. [Períodos de Vacaciones](#períodos-de-vacaciones)
6. [Solicitudes de Vacaciones](#solicitudes-de-vacaciones)
7. [Casos de Uso](#casos-de-uso)
8. [Ejemplos Prácticos](#ejemplos-prácticos)
9. [FAQs](#faqs)
10. [Troubleshooting](#troubleshooting)

---

## 📖 Introducción

El **Módulo de Gestión de Vacaciones** permite administrar las vacaciones de todos los trabajadores de acuerdo con la legislación laboral chilena. El sistema automatiza el cálculo de días acumulados, controla los períodos disponibles y gestiona las solicitudes.

### URL del Módulo:
```
http://localhost:3007/vacations
```

### Objetivos:
- ✅ Calcular automáticamente días acumulados según años de servicio
- ✅ Gestionar hasta 2 períodos simultáneos (regla legal)
- ✅ Controlar solicitudes y aprobaciones
- ✅ Evitar saldos negativos no autorizados
- ✅ Generar reportes y estadísticas

---

## ⚖️ Marco Legal

### Código del Trabajo de Chile

El sistema implementa las siguientes reglas legales:

#### 1. **Acumulación de Vacaciones** (Art. 67)
```
Fórmula: 1.25 días hábiles por cada mes completo trabajado
```

**Ejemplo**:
- 12 meses trabajados = **15 días** de vacaciones
- 24 meses trabajados = **30 días** de vacaciones
- 36 meses trabajados = **45 días** de vacaciones

#### 2. **¿Cuándo se considera "mes completo"?**
```
Un mes se completa cuando se alcanza el mismo día del mes siguiente
```

**Ejemplo**:
- Fecha de ingreso: **4 de marzo de 2023**
- Primer mes completo: **4 de abril de 2023** (acumula 1.25 días)
- Segundo mes completo: **4 de mayo de 2023** (acumula 2.50 días totales)

#### 3. **Máximo de Períodos Acumulados** (Art. 73)
```
Máximo: 2 períodos completos (60 días)
```

**¿Qué significa?**:
- Si no tomas vacaciones por 2 años → Acumulas 30 días (2 períodos)
- Al tercer año, debes tomar al menos el período más antiguo
- El sistema elimina automáticamente períodos antiguos

#### 4. **Días Hábiles vs Corridos**
```
Las vacaciones son en DÍAS HÁBILES (lunes a viernes)
```

**Ejemplo**:
- 10 días hábiles = 2 semanas completas (incluye fines de semana)
- 15 días hábiles = 3 semanas completas

#### 5. **Antigüedad Mínima**
```
Derecho a vacaciones: Desde el primer mes trabajado
Solicitud: Después de 1 año de servicio
```

---

## 🏗️ Estructura del Módulo

### Base de Datos

#### Tabla: `vacation_periods`
```sql
CREATE TABLE vacation_periods (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  period_year INTEGER,              -- Año del período (2023, 2024, etc.)
  accumulated_days DECIMAL(5,2),    -- Días acumulados en ese período
  used_days INTEGER DEFAULT 0,      -- Días ya tomados
  available_days DECIMAL(5,2),      -- Calculado: accumulated - used
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(employee_id, period_year)  -- Un período por año por empleado
);
```

**Campos clave**:
- `period_year`: Año calendario (para gestión)
- `accumulated_days`: Calculado automáticamente según años de servicio
- `used_days`: Se actualiza al aprobar vacaciones
- `available_days`: Saldo disponible

#### Tabla: `vacations`
```sql
CREATE TABLE vacations (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  start_date DATE,                  -- Fecha inicio vacaciones
  end_date DATE,                    -- Fecha término
  days_count INTEGER,               -- Total días hábiles
  status VARCHAR(20),               -- 'draft', 'solicitada', 'aprobada', 'rechazada', 'tomada', 'cancelada'
  request_date DATE,                -- Cuándo se solicitó
  approval_date DATE,               -- Cuándo se aprobó
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Estados de vacaciones**:
- `draft`: Borrador (no enviado)
- `solicitada`: Pendiente de aprobación
- `aprobada`: Aprobada, por tomar
- `rechazada`: Rechazada por admin
- `tomada`: Ya disfrutada
- `cancelada`: Cancelada después de aprobar

---

## 📊 Dashboard de Vacaciones

### Vista Principal

Al ingresar a `/vacations` se muestra:

#### 1. **KPIs Principales**

```
┌────────────────────────────────────────────────┐
│ 🟣 TRABAJADORES CON                   5       │
│    MÚLTIPLES PERÍODOS                          │
│    33% del total                               │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 🟡 TOTAL DÍAS ACUMULADOS              450     │
│    Entre todos los trabajadores               │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 🟠 CON SALDO NEGATIVO                 2       │
│    Días de períodos futuros                   │
└────────────────────────────────────────────────┘
```

**¿Qué significa cada KPI?**

1. **Trabajadores con Múltiples Períodos**:
   - Empleados que tienen 2 períodos activos
   - Indica que llevan 2+ años sin tomar todas sus vacaciones

2. **Total Días Acumulados**:
   - Suma de todos los días disponibles de la empresa
   - Útil para calcular provisión de vacaciones

3. **Con Saldo Negativo**:
   - Empleados que tomaron días de períodos futuros
   - Requiere seguimiento especial

#### 2. **Tabla de Trabajadores**

```
┌────────────────┬──────────────┬─────────────┬────────────┬───────────────┬──────────┬──────────┐
│ Trabajador     │ RUT          │ Total       │ Total      │ Total         │ Períodos │ Acciones │
│                │              │ Acumulado   │ Usado      │ Disponible    │          │          │
├────────────────┼──────────────┼─────────────┼────────────┼───────────────┼──────────┼──────────┤
│ Juan Pérez     │ 12.345.678-9 │ 45.00 días  │ 10 días    │ 35.00 días    │ 2        │ [Ver]    │
│ María García   │ 98.765.432-1 │ 30.00 días  │ 15 días    │ 15.00 días    │ 2        │ [Ver]    │
│ Pedro López    │ 15.234.567-8 │ 15.00 días  │ 0 días     │ 15.00 días    │ 1        │ [Ver]    │
└────────────────┴──────────────┴─────────────┴────────────┴───────────────┴──────────┴──────────┘
```

**Funcionalidades de la tabla**:

1. **Ordenamiento** (click en encabezados):
   - Por Total Acumulado (↑↓)
   - Por Total Usado (↑↓)
   - Por Total Disponible (↑↓)
   - Por Cantidad de Períodos (↑↓)

2. **Colores**:
   - 🔵 **Azul**: Días acumulados
   - 🔴 **Rojo**: Días usados
   - 🟢 **Verde**: Días disponibles (positivos)
   - 🔴 **Rojo**: Días disponibles (negativos)

3. **Acciones**:
   - Click en fila → Ver detalle del empleado
   - Botón "Ver Detalle" → Mismo efecto

---

## 📅 Períodos de Vacaciones

### ¿Cómo funcionan los períodos?

#### Ejemplo: Trabajador que ingresó el 4 de marzo de 2022

```
Fecha de Ingreso: 4 de marzo de 2022
Hoy: 8 de enero de 2025
Meses Completos Trabajados: 34 meses
```

**Cálculo de días acumulados**:
```
34 meses × 1.25 días/mes = 42.50 días totales acumulados
```

**Distribución por períodos** (año calendario):

```
┌─────────┬──────────────┬──────────┬──────────────┐
│ Año     │ Acumulado    │ Usado    │ Disponible   │
├─────────┼──────────────┼──────────┼──────────────┤
│ 2023    │ 15.00 días   │ 10 días  │ 5.00 días    │
│ 2024    │ 15.00 días   │ 0 días   │ 15.00 días   │
└─────────┴──────────────┴──────────┴──────────────┘

Total Acumulado: 42.50 días
Total Usado: 10 días
Total Disponible: 32.50 días
```

**¿Por qué suman solo 30 días los períodos?**
- Los períodos muestran **años completos** (15 días por año)
- Los días parciales (ej: 12.50 días) se suman al total acumulado
- El total acumulado siempre refleja los meses exactos trabajados

### Regla de Máximo 2 Períodos

```
┌─────────────────────────────────────────────┐
│ Si el trabajador tiene 3 o más períodos:   │
│ ✅ Se mantienen los 2 más recientes        │
│ ❌ Se eliminan automáticamente los antiguos │
└─────────────────────────────────────────────┘
```

**Ejemplo**:
```
Trabajador ingresó en 2020, hoy es 2025, nunca tomó vacaciones:

Períodos creados:
- 2021: 15 días
- 2022: 15 días
- 2023: 15 días
- 2024: 15 días

Sistema automáticamente elimina:
- 2021 ❌ (más antiguo)
- 2022 ❌ (segundo más antiguo)

Mantiene:
- 2023 ✅
- 2024 ✅

Total disponible: 30 días (máximo legal)
```

### Sincronización Automática

El sistema sincroniza períodos:
- ✅ Al cargar el dashboard
- ✅ Al ver el detalle de un empleado
- ✅ Al crear una solicitud de vacaciones

**¿Qué hace la sincronización?**
1. Calcula meses completos desde fecha de ingreso
2. Calcula días acumulados (meses × 1.25)
3. Distribuye días por año calendario
4. Aplica regla de máximo 2 períodos
5. Actualiza la base de datos

---

## 📝 Solicitudes de Vacaciones

### Flujo Completo

```
┌─────────────┐
│  1. CREAR   │ Usuario crea solicitud
│  SOLICITUD  │ (selecciona fechas, días)
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  2. ENVIAR  │ Status: 'draft' → 'solicitada'
│  A APROBAR  │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  3. APROBAR │ Admin revisa y aprueba
│  O RECHAZAR │ Status: 'solicitada' → 'aprobada' o 'rechazada'
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  4. TOMAR   │ Cuando llega la fecha
│  VACACIONES │ Status: 'aprobada' → 'tomada'
└─────────────┘
```

### Estados Detallados

| Estado | Descripción | Puede editar | Puede cancelar |
|--------|-------------|--------------|----------------|
| **draft** | Borrador no enviado | ✅ Sí | ✅ Sí |
| **solicitada** | Pendiente de aprobación | ❌ No | ✅ Sí |
| **aprobada** | Aprobada, por tomar | ❌ No | ⚠️ Con permiso |
| **rechazada** | Rechazada por admin | ❌ No | ❌ No |
| **tomada** | Ya disfrutada | ❌ No | ❌ No |
| **cancelada** | Cancelada después de aprobar | ❌ No | ❌ No |

### Validaciones al Solicitar

El sistema valida:

1. **Fecha de inicio >= Hoy**:
```
❌ No puedes solicitar vacaciones en el pasado
```

2. **Fecha término > Fecha inicio**:
```
❌ La fecha de término debe ser posterior
```

3. **Días suficientes disponibles**:
```
Disponible: 10 días
Solicita: 15 días
❌ No tienes suficientes días acumulados
```

4. **No solapamiento con vacaciones existentes**:
```
Vacaciones aprobadas: 1 al 15 de febrero
Nueva solicitud: 10 al 20 de febrero
❌ Se solapa con vacaciones existentes
```

### Autorización de Días Futuros

```
Si el trabajador no tiene suficientes días:

Opción 1: Rechazar
"No tienes suficientes días disponibles"

Opción 2: Autorizar días futuros (admin)
"Se autorizarán 5 días de períodos futuros"
→ Saldo queda negativo temporalmente
```

---

## 📚 Casos de Uso

### Caso 1: Trabajador Nuevo (Menos de 1 Año)

**Escenario**:
```
Fecha de ingreso: 15 de julio de 2024
Hoy: 8 de enero de 2025
Meses completos: 5 meses
```

**Cálculo**:
```
5 meses × 1.25 = 6.25 días acumulados
Usado: 0 días
Disponible: 6.25 días
```

**¿Puede solicitar vacaciones?**:
- ✅ Sí, puede solicitar hasta 6 días
- ⚠️ Si solicita más, requiere autorización admin
- ✅ Los días seguirán acumulándose mensualmente

---

### Caso 2: Trabajador con 2 Años de Servicio

**Escenario**:
```
Fecha de ingreso: 1 de enero de 2023
Hoy: 8 de enero de 2025
Meses completos: 24 meses
```

**Cálculo**:
```
24 meses × 1.25 = 30 días acumulados
```

**Períodos**:
```
Período 2023: 15 días (completo)
  - Usado: 10 días
  - Disponible: 5 días

Período 2024: 15 días (completo)
  - Usado: 0 días
  - Disponible: 15 días

Total disponible: 20 días
```

**Solicitud**:
```
Solicita 15 días en febrero 2025
Sistema usa:
  1. Período 2023: 5 días (lo agota)
  2. Período 2024: 10 días (quedan 5)

✅ Aprobado
```

---

### Caso 3: Trabajador con Saldo Negativo

**Escenario**:
```
Acumulado: 10 días
Solicita: 15 días
```

**Opción A: Rechazar**:
```
❌ Solicitud rechazada
Motivo: "No tienes suficientes días disponibles"
```

**Opción B: Autorizar (admin)**:
```
⚠️ Solicitud aprobada con autorización especial
Saldo después: -5 días (negativo)

El trabajador deberá acumular 5 días antes de
solicitar nuevas vacaciones
```

---

### Caso 4: Trabajador con Más de 4 Años

**Escenario**:
```
Fecha de ingreso: 1 de enero de 2021
Hoy: 8 de enero de 2025
Meses completos: 48 meses
```

**Cálculo**:
```
48 meses × 1.25 = 60 días totales acumulados
```

**Sin tomar vacaciones**:
```
Períodos creados:
- 2022: 15 días
- 2023: 15 días
- 2024: 15 días

Sistema aplica regla:
✅ Mantiene 2023 (15 días)
✅ Mantiene 2024 (15 días)
❌ Elimina 2022 (más antiguo)

Total disponible: 30 días (máximo legal)
```

**¿Se pierden los 30 días restantes?**
- ⚠️ Sí, según la ley chilena (Art. 73)
- El empleador debió obligar al trabajador a tomar vacaciones
- Alternativa: Negociar compensación (fuera del sistema)

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Calcular Días Acumulados

**Datos**:
```
Fecha de ingreso: 4 de marzo de 2023
Fecha de consulta: 8 de enero de 2025
```

**Paso 1: Calcular meses completos**
```
De 4 de marzo 2023 a 4 de enero 2025 = 22 meses
+ De 4 de enero 2025 a 8 de enero 2025 = aún no completa el mes
= 22 meses completos
```

**Paso 2: Calcular días**
```
22 meses × 1.25 días/mes = 27.50 días acumulados
```

**Paso 3: Distribución por períodos**
```
Año 2023:
  Desde: 4 de marzo de 2023
  Hasta: 31 de diciembre de 2023
  Meses en 2023: 9 meses (marzo a diciembre, completando el 4 de cada mes)
  Días: 9 × 1.25 = 11.25 días

Año 2024:
  Desde: 1 de enero de 2024
  Hasta: 31 de diciembre de 2024
  Meses en 2024: 12 meses completos
  Días: 12 × 1.25 = 15.00 días

Año 2025:
  Desde: 1 de enero de 2025
  Hasta: 8 de enero de 2025
  Meses en 2025: 1 mes (completado el 4 de enero)
  Días: 1 × 1.25 = 1.25 días

Total: 11.25 + 15.00 + 1.25 = 27.50 días ✅
```

---

### Ejemplo 2: Solicitar Vacaciones

**Trabajador**: Juan Pérez  
**Disponible**: 20 días

**Solicitud**:
```
Fecha inicio: 10 de febrero de 2025 (lunes)
Fecha término: 21 de febrero de 2025 (viernes)
```

**Cálculo de días hábiles**:
```
Semana 1: Lun 10 a Vie 14 = 5 días
Semana 2: Lun 17 a Vie 21 = 5 días
Total: 10 días hábiles
```

**Validación**:
```
✅ Tiene 20 días disponibles
✅ Solicita 10 días
✅ No se solapa con otras vacaciones
✅ Fecha es futura

→ APROBADO
```

**Actualización de saldo**:
```
Antes:
  Disponible: 20 días

Después:
  Usado: 10 días
  Disponible: 10 días
```

---

### Ejemplo 3: Múltiples Solicitudes

**Trabajador**: María García  
**Disponible**: 30 días

**Solicitudes en el año**:

```
1. Febrero: 10 días
   Disponible después: 30 - 10 = 20 días

2. Julio: 5 días
   Disponible después: 20 - 5 = 15 días

3. Diciembre: 15 días
   Disponible después: 15 - 15 = 0 días

✅ Todas aprobadas
Saldo final del año: 0 días
```

---

## ❓ FAQs

### 1. ¿Las vacaciones son por año calendario o años de servicio?

**Respuesta**: Por **años de servicio** desde la fecha de ingreso.

**Ejemplo**:
```
Ingreso: 15 de julio de 2023
Primer año completo: 15 de julio de 2024 (15 días)
Segundo año completo: 15 de julio de 2025 (30 días totales)
```

Los períodos por año calendario son solo para **gestión interna**.

---

### 2. ¿Qué pasa si el trabajador no toma vacaciones?

**Respuesta**: Se acumulan hasta un **máximo de 2 períodos (60 días)**.

```
Si tiene más de 60 días:
  ✅ Se mantienen los 2 períodos más recientes
  ❌ Los períodos antiguos se eliminan automáticamente
```

**Nota legal**: El empleador debe obligar al trabajador a tomar vacaciones (Art. 73).

---

### 3. ¿Se pueden vender las vacaciones?

**Respuesta**: **Parcialmente**.

Según Art. 73:
```
Se puede negociar vender:
  ✅ Solo el excedente de 15 días por año
  ❌ No se pueden vender los primeros 15 días
```

**Ejemplo**:
```
Acumulado: 30 días
Puede vender: máximo 15 días
Debe tomar: mínimo 15 días
```

**En el sistema**: Esta funcionalidad NO está implementada (requiere acuerdo especial).

---

### 4. ¿Qué son los días negativos?

**Respuesta**: Días de **períodos futuros** que se autorizan anticipadamente.

**Ejemplo**:
```
Trabajador tiene: 5 días
Solicita: 10 días
Admin autoriza: 5 días futuros

Saldo queda: -5 días (negativo)

El trabajador deberá acumular esos 5 días
antes de solicitar nuevas vacaciones.
```

---

### 5. ¿Cómo se calculan los días hábiles?

**Respuesta**: Solo se cuentan **lunes a viernes**.

**Ejemplo**:
```
Solicita del 10 al 21 de febrero (12 días corridos)

Desglose:
  - Semana 1: Lun, Mar, Mié, Jue, Vie = 5 días
  - Fin de semana: Sáb, Dom = NO SE CUENTAN
  - Semana 2: Lun, Mar, Mié, Jue, Vie = 5 días

Total: 10 días hábiles (consume 10 días del saldo)
```

---

### 6. ¿Se pueden tomar vacaciones en el primer año?

**Respuesta**: **Sí**, desde el primer mes.

```
Primer mes: 1.25 días acumulados
Puede solicitar: hasta 1 día

Después de 6 meses: 7.50 días acumulados
Puede solicitar: hasta 7 días

✅ No hay restricción de antigüedad mínima
```

---

### 7. ¿Qué pasa si un trabajador renuncia?

**Respuesta**: Se le deben **pagar** las vacaciones no tomadas.

**Ejemplo**:
```
Al momento de la renuncia:
  Acumulado: 20 días
  Tomado: 5 días
  Por pagar: 15 días

Cálculo del pago:
  Sueldo diario: $40,000
  Días por pagar: 15 días
  Total: $600,000 (se paga en el finiquito)
```

**En el sistema**: Se calcula automáticamente en el módulo de Finiquitos.

---

## 🔧 Troubleshooting

### Problema 1: Los días acumulados no coinciden

**Síntomas**:
```
El trabajador dice que tiene 30 días
El sistema muestra 25 días
```

**Causas posibles**:

1. **Fecha de ingreso incorrecta**:
```sql
-- Verificar en la BD
SELECT full_name, hire_date 
FROM employees 
WHERE id = '[employee-id]';

-- Si está mal, corregir:
UPDATE employees 
SET hire_date = '2023-03-15' 
WHERE id = '[employee-id]';
```

2. **Sincronización no ejecutada**:
```
Solución:
1. Ir al dashboard de vacaciones
2. El sistema sincroniza automáticamente al cargar
3. O hacer click en "Ver Detalle" del empleado
```

3. **Uso de días no registrado**:
```sql
-- Verificar vacaciones tomadas
SELECT start_date, end_date, days_count, status
FROM vacations
WHERE employee_id = '[employee-id]'
ORDER BY start_date DESC;
```

---

### Problema 2: No puede solicitar vacaciones

**Síntomas**:
```
Error: "No tienes suficientes días disponibles"
```

**Verificación**:

1. **Ver saldo real**:
```
Dashboard → Click en el trabajador → Ver períodos
```

2. **Verificar si tiene saldo negativo**:
```
Si aparece en rojo: El trabajador ya usó días futuros
Debe esperar a acumular más días
```

3. **Verificar vacaciones pendientes**:
```sql
SELECT * FROM vacations
WHERE employee_id = '[employee-id]'
AND status IN ('solicitada', 'aprobada')
AND start_date > CURRENT_DATE;
```

---

### Problema 3: Períodos no se eliminan automáticamente

**Síntomas**:
```
El trabajador tiene 3 o más períodos
El sistema no elimina los antiguos
```

**Solución**:

```sql
-- Ejecutar sincronización manual
-- El sistema debería hacer esto automáticamente, pero puedes forzarlo:

-- 1. Ver períodos actuales
SELECT * FROM vacation_periods
WHERE employee_id = '[employee-id]'
ORDER BY period_year DESC;

-- 2. Si tiene más de 2, eliminar manualmente los más antiguos
DELETE FROM vacation_periods
WHERE employee_id = '[employee-id]'
AND period_year < (
  SELECT period_year
  FROM vacation_periods
  WHERE employee_id = '[employee-id]'
  ORDER BY period_year DESC
  LIMIT 1 OFFSET 1
);
```

---

### Problema 4: Días acumulados no aumentan

**Síntomas**:
```
Han pasado meses y los días siguen iguales
```

**Verificación**:

1. **Revisar fecha de ingreso**:
```sql
SELECT hire_date FROM employees WHERE id = '[employee-id]';
```

2. **Calcular manualmente**:
```
Fecha ingreso: 1 de enero de 2023
Hoy: 8 de enero de 2025
Meses: 24 meses

Esperado: 24 × 1.25 = 30 días
```

3. **Forzar sincronización**:
```
1. Ir a /vacations
2. Click en "Ver Detalle" del trabajador
3. El sistema recalcula automáticamente
```

4. **Si persiste, verificar la lógica**:
```
El sistema sincroniza SOLO cuando:
- Se carga el dashboard
- Se ve el detalle de un empleado
- Se crea una solicitud

No se actualiza en tiempo real.
```

---

## 📊 Consultas SQL Útiles

### Ver resumen de todos los trabajadores:

```sql
SELECT 
  e.full_name,
  e.hire_date,
  COUNT(vp.id) as periodos,
  SUM(vp.accumulated_days) as acumulado,
  SUM(vp.used_days) as usado,
  SUM(vp.accumulated_days - vp.used_days) as disponible
FROM employees e
LEFT JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.status = 'active'
AND e.company_id = '[company-id]'
GROUP BY e.id, e.full_name, e.hire_date
ORDER BY e.full_name;
```

### Ver detalle de un trabajador:

```sql
SELECT 
  e.full_name,
  e.hire_date,
  vp.period_year,
  vp.accumulated_days,
  vp.used_days,
  (vp.accumulated_days - vp.used_days) as disponible
FROM employees e
JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.id = '[employee-id]'
ORDER BY vp.period_year DESC;
```

### Ver vacaciones tomadas:

```sql
SELECT 
  v.start_date,
  v.end_date,
  v.days_count,
  v.status,
  v.request_date,
  v.approval_date
FROM vacations v
WHERE v.employee_id = '[employee-id]'
ORDER BY v.start_date DESC;
```

### Encontrar trabajadores con saldo negativo:

```sql
SELECT 
  e.full_name,
  SUM(vp.accumulated_days - vp.used_days) as saldo
FROM employees e
JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.company_id = '[company-id]'
GROUP BY e.id, e.full_name
HAVING SUM(vp.accumulated_days - vp.used_days) < 0
ORDER BY saldo ASC;
```

---

## 🎯 Mejores Prácticas

### Para Administradores:

1. **Revisar el dashboard regularmente**:
   - Al menos 1 vez al mes
   - Identificar trabajadores con muchos días acumulados
   - Planificar rotación de vacaciones

2. **No autorizar días negativos sin control**:
   - Solo en casos excepcionales
   - Documentar el motivo
   - Hacer seguimiento del saldo

3. **Obligar a tomar vacaciones**:
   - Si un trabajador tiene 2 períodos (60 días)
   - Programar vacaciones obligatorias
   - Evitar pérdida de días

4. **Sincronizar antes de nómina**:
   - Verificar días usados
   - Confirmar que el descuento se aplicó
   - Cruzar con asistencia

### Para Trabajadores:

1. **Planificar con anticipación**:
   - Solicitar al menos 30 días antes
   - Coordinar con el equipo
   - Verificar días disponibles

2. **No dejar acumular**:
   - Tomar al menos 15 días al año
   - Evitar pérdida de días por regla de máximo 2 períodos

3. **Confirmar aprobación antes de comprar pasajes**:
   - Esperar status "aprobada"
   - Guardar comprobante de aprobación

---

---

## 🎓 Caso Práctico Completo: Trabajador con 3 Años de Servicio

### Escenario del Usuario

```
Fecha de ingreso: 1 de enero de 2022
Fecha actual: 8 de enero de 2025
Meses completos trabajados: 36 meses
Vacaciones tomadas: 15 días en enero 2025
```

### Paso 1: Cálculo de Días Acumulados

**Fórmula Base**:
```
Meses completos × 1.25 días/mes = Días acumulados totales
36 meses × 1.25 = 45.00 días totales
```

**¿Por qué 36 meses?**
```
De: 1 de enero de 2022
A: 1 de enero de 2025 = 3 años exactos = 36 meses

Nota: El 8 de enero de 2025 aún no completa un nuevo mes,
por lo que sigue siendo 36 meses completos.
```

---

### Paso 2: Distribución por Períodos (Año Calendario)

El sistema organiza los días acumulados por **año calendario** para facilitar la gestión:

```
Año 2022:
  Desde: 1 de enero de 2022
  Hasta: 31 de diciembre de 2022
  Meses en el año: 12 meses completos
  Días acumulados: 12 × 1.25 = 15.00 días

Año 2023:
  Desde: 1 de enero de 2023
  Hasta: 31 de diciembre de 2023
  Meses en el año: 12 meses completos
  Días acumulados: 12 × 1.25 = 15.00 días

Año 2024:
  Desde: 1 de enero de 2024
  Hasta: 31 de diciembre de 2024
  Meses en el año: 12 meses completos
  Días acumulados: 12 × 1.25 = 15.00 días

Año 2025 (parcial):
  Desde: 1 de enero de 2025
  Hasta: 8 de enero de 2025
  Meses en el año: 0 meses completos (aún no cumple el mes)
  Días acumulados: 0 × 1.25 = 0.00 días

Total: 15 + 15 + 15 = 45.00 días ✅
```

---

### Paso 3: Aplicación de Regla de Máximo 2 Períodos (Art. 70)

**Según el Código del Trabajo**:
```
Máximo legal: 2 períodos completos (60 días)
```

**Antes de tomar vacaciones (sin vacaciones tomadas)**:
```
Períodos activos: 2022, 2023, 2024 = 3 períodos
↓
Sistema archiva automáticamente el más antiguo:
  2022: ARCHIVADO (12.50 días eliminados por ley)
  2023: ACTIVO (15.00 días disponibles)
  2024: ACTIVO (15.00 días disponibles)

Total disponible: 30 días (máximo legal)
Total perdido: 15 días (por no tomar a tiempo)
```

**Tabla de Períodos (Sin Vacaciones Tomadas)**:

```
┌──────┬─────────────┬────────┬──────────────┬────────────────────┐
│ Año  │ Acumulados  │ Usados │ Disponibles  │ Estado             │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2022 │ 15.00 días  │ 0 días │ 0 días       │ 🔴 ARCHIVED        │
│      │             │        │              │ (Regla máx 2)      │
│      │             │        │              │ Art. 70 CT         │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2023 │ 15.00 días  │ 0 días │ 15.00 días   │ ✅ ACTIVE          │
│      │             │        │              │ (Más antiguo)      │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2024 │ 15.00 días  │ 0 días │ 15.00 días   │ ✅ ACTIVE          │
│      │             │        │              │ (Más reciente)     │
└──────┴─────────────┴────────┴──────────────┴────────────────────┘

📊 Resumen:
  Total Acumulado Real: 45.00 días
  Total Disponible (máx legal): 30.00 días
  Días Perdidos (archivados): 15.00 días
```

---

### Paso 4: Tomar 15 Días en Enero 2025 (Descuento FIFO)

**FIFO = First In, First Out (Primero en Entrar, Primero en Salir)**

El sistema **siempre** descuenta primero del período más antiguo:

```
Trabajador solicita: 15 días de vacaciones
Sistema aplica FIFO:
  
  1. Período 2023 (más antiguo disponible):
     Disponible: 15 días
     Solicita: 15 días
     Descuenta: 15 días → queda en 0 (COMPLETADO)
  
  2. Período 2024:
     No se toca (quedan 15 días disponibles)
```

**Tabla de Períodos (Después de Tomar 15 Días)**:

```
┌──────┬─────────────┬────────┬──────────────┬────────────────────┐
│ Año  │ Acumulados  │ Usados │ Disponibles  │ Estado             │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2022 │ 15.00 días  │ 0 días │ 0 días       │ 🔴 ARCHIVED        │
│      │             │        │              │ (Regla máx 2)      │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2023 │ 15.00 días  │ 15 días│ 0 días       │ ✅ COMPLETED       │
│      │             │        │              │ (Agotado)          │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2024 │ 15.00 días  │ 0 días │ 15.00 días   │ ✅ ACTIVE          │
│      │             │        │              │ (Disponible)       │
└──────┴─────────────┴────────┴──────────────┴────────────────────┘

📊 Resumen:
  Total Acumulado Real: 45.00 días
  Total Usado: 15 días (del período 2023)
  Total Disponible: 15.00 días (solo período 2024)
```

---

### Paso 5: ¿Qué Pasa si Toma 20 Días? (FIFO Multi-Período)

**Escenario**: Trabajador solicita 20 días (más de lo que tiene en un solo período)

```
Trabajador solicita: 20 días
Sistema aplica FIFO automático:

  1. Período 2023 (más antiguo):
     Disponible: 15 días
     Toma: 15 días completos → queda en 0 (COMPLETADO)
     Restante por descontar: 20 - 15 = 5 días

  2. Período 2024 (siguiente):
     Disponible: 15 días
     Toma: 5 días → quedan 10 días disponibles
     Restante por descontar: 0 días ✅
```

**Tabla de Períodos (Si Hubiera Tomado 20 Días)**:

```
┌──────┬─────────────┬────────┬──────────────┬────────────────────┐
│ Año  │ Acumulados  │ Usados │ Disponibles  │ Estado             │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2022 │ 15.00 días  │ 0 días │ 0 días       │ 🔴 ARCHIVED        │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2023 │ 15.00 días  │ 15 días│ 0 días       │ ✅ COMPLETED       │
│      │             │        │              │ (Agotado total)    │
├──────┼─────────────┼────────┼──────────────┼────────────────────┤
│ 2024 │ 15.00 días  │ 5 días │ 10.00 días   │ ✅ ACTIVE          │
│      │             │        │              │ (Parcial)          │
└──────┴─────────────┴────────┴──────────────┴────────────────────┘

📊 Resumen:
  Total Usado: 20 días (15 de 2023 + 5 de 2024)
  Total Disponible: 10 días
```

---

## 🔔 Sistema de Notificaciones de Vacaciones

### ¿Por Qué Existen las Notificaciones?

**Base Legal**:
- **Art. 70 Código del Trabajo**: Máximo 2 períodos acumulados
- **Ord. N°6287/2017 DT**: Empleador debe otorgar feriado antes de perder días
- **Ord. N°307/2025 DT**: Empleador es responsable de gestionar la acumulación

**Objetivo**: Evitar que los trabajadores pierdan días de vacaciones por acumulación excesiva.

---

### Niveles de Alerta

#### 🔴 CRÍTICO (Prioridad 1)

**Condición**: Trabajador con ≥ 60 días acumulados (2 períodos completos)

**Mensaje**:
```
¡CRÍTICO! Trabajador con 60.00 días acumulados (2 períodos). 
Puede perder días si no toma vacaciones pronto.

Referencia Legal: Art. 70 Código del Trabajo - Máximo 2 períodos acumulados
```

**Acción requerida**:
- ✅ Obligar al trabajador a tomar vacaciones inmediatamente
- ✅ Programar al menos 15 días de vacaciones
- ⚠️ Si no toma, los días más antiguos se perderán automáticamente

---

#### ⚠️ URGENTE (Prioridad 2)

**Condición**: Trabajador con 45-59 días acumulados

**Mensaje**:
```
Trabajador con 47.50 días acumulados. 
Planificar vacaciones pronto para evitar pérdida.

Referencia Legal: Ord. N°6287/2017 DT - Obligación de otorgar feriado antes de nuevo período
```

**Acción recomendada**:
- ✅ Planificar vacaciones dentro del mes
- ✅ Coordinar con el trabajador
- ✅ Priorizar en calendario de vacaciones

---

#### 🟡 MODERADO (Prioridad 3)

**Condición**: Trabajador con 30-44 días acumulados

**Mensaje**:
```
Trabajador con 35.00 días acumulados. 
Considerar programación de vacaciones.

Referencia Legal: Ord. N°307/2025 DT - Empleador debe gestionar acumulación
```

**Acción recomendada**:
- ✅ Incluir en planificación trimestral
- ✅ Revisar en reuniones de seguimiento
- ✅ Ofrecer flexibilidad para programar

---

### Ubicación de las Notificaciones

Las notificaciones de vacaciones aparecen en:

1. **Header de la aplicación** (al lado del selector de empresa):
   - Botón de campana 🔔
   - Badge con número de alertas
   - Color según urgencia (rojo = crítico, naranja = urgente, amarillo = moderado)

2. **Dashboard de Vacaciones** (`/vacations`):
   - KPI: "CON SALDO ALTO"
   - Ordenamiento por días acumulados (↑↓)

3. **Ficha del Trabajador**:
   - Alerta visible si tiene >30 días acumulados
   - Recomendación de acción

---

### Ejemplo Práctico de Notificación

**Trabajador del Caso Anterior** (45 días acumulados, solo 30 disponibles por regla):

```
🟡 MODERADO - ACUMULACIÓN ALTA

Juan Pérez González
RUT: 12.345.678-9
Fecha de ingreso: 1 de enero de 2022

Total acumulado: 45.00 días
Total disponible: 30.00 días (máximo legal)
Períodos activos: 2

⚠️ Trabajador con 45.00 días acumulados. 
Planificar vacaciones pronto para evitar pérdida.

Referencia Legal: Ord. N°6287/2017 DT

[Ver Ficha del Trabajador →]
```

Al hacer clic, te lleva a `/employees/{id}/vacations` para gestionar.

---

## 🎯 Mejores Prácticas Actualizadas

### Para Administradores

1. **Revisar notificaciones diariamente**:
   - Al menos 1 vez al día
   - Priorizar alertas CRÍTICAS (rojas)
   - Actuar inmediatamente en casos de 60+ días

2. **Obligar vacaciones cuando sea necesario**:
   - Art. 70 permite al empleador fijar período si el trabajador no lo hace
   - Notificar por escrito al trabajador
   - Dar al menos 30 días de aviso

3. **Mantener histórico visible**:
   - El sistema ahora muestra todos los períodos (incluso archivados)
   - Útil para auditorías y conflictos laborales
   - Demuestra cumplimiento legal

4. **Uso del dashboard**:
   - Ordenar por "Total Acumulado" (↓) para ver casos críticos
   - Filtrar trabajadores con múltiples períodos
   - Exportar reportes mensualmente

---

### Para Trabajadores

1. **No dejar acumular más de 30 días**:
   - Riesgo de perder días por regla de máximo 2 períodos
   - Planificar al menos 1 período de vacaciones al año

2. **Revisar saldo periódicamente**:
   - Dashboard de vacaciones muestra saldo actualizado
   - Considerar días acumulados vs. disponibles

3. **Coordinar con anticipación**:
   - Solicitar al menos 30 días antes
   - Confirmar aprobación antes de comprar pasajes

---

**Fecha de creación**: 8 de enero de 2025  
**Versión**: 1.1  
**Última actualización**: 8 de enero de 2025  
**Cambios v1.1**: Agregado caso práctico completo, descuento FIFO, sistema de notificaciones

