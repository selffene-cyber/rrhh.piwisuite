# 🔄 Lógica FIFO de Vacaciones - Sistema Completo

## 📋 Resumen

El sistema de vacaciones usa **FIFO (First In, First Out)** para descontar días automáticamente del período más antiguo primero, **INCLUYENDO PERÍODOS ARCHIVADOS**.

---

## 🎯 Principio Fundamental

**"Los días se descuentan SIEMPRE del período más antiguo, sin importar si está archivado"**

### ¿Por Qué Incluir Períodos Archivados?

Aunque **legalmente** los días de períodos antiguos se "pierden" según el Art. 70 del Código del Trabajo (máximo 2 períodos), el sistema permite otorgar esos días por:

1. **Mutuo Acuerdo**: Empleador y trabajador pueden acordar usar días antiguos
2. **Compensación**: Por circunstancias especiales o acuerdos previos
3. **Flexibilidad**: Permite gestionar casos excepcionales

---

## 🔢 Ejemplo Práctico

### Situación: Trabajador con 4 Períodos

```
┌──────┬─────────────┬────────┬──────────────┬──────────┐
│ Año  │ Acumulados  │ Usados │ Disponibles  │ Estado   │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2020 │ 10.00 días  │ 0 días │ 10.00 días   │ ARCHIVED │
│ 2021 │ 15.00 días  │ 0 días │ 15.00 días   │ ARCHIVED │
│ 2022 │ 15.00 días  │ 0 días │ 15.00 días   │ ACTIVE   │
│ 2023 │ 15.00 días  │ 0 días │ 15.00 días   │ ACTIVE   │
└──────┴─────────────┴────────┴──────────────┴──────────┘

Total Disponible: 55 días (10 + 15 + 15 + 15)
```

### Trabajador Solicita 20 Días

**Descuento FIFO (Más Antiguo Primero):**

```
Paso 1: Periodo 2020 (más antiguo)
  - Disponible: 10 días
  - Descuenta: 10 días (los usa todos)
  - Quedan por descontar: 20 - 10 = 10 días

Paso 2: Periodo 2021 (siguiente más antiguo)
  - Disponible: 15 días  
  - Descuenta: 10 días (lo que queda)
  - Quedan por descontar: 10 - 10 = 0 días

✅ COMPLETADO: 20 días descontados de 2 períodos
```

**Resultado Final:**

```
┌──────┬─────────────┬────────┬──────────────┬──────────┐
│ Año  │ Acumulados  │ Usados │ Disponibles  │ Estado   │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2020 │ 10.00 días  │ 10 días│ 0.00 días    │ COMPLETED│ ✅
│ 2021 │ 15.00 días  │ 10 días│ 5.00 días    │ ARCHIVED │ ✅
│ 2022 │ 15.00 días  │ 0 días │ 15.00 días   │ ACTIVE   │
│ 2023 │ 15.00 días  │ 0 días │ 15.00 días   │ ACTIVE   │
└──────┴─────────────┴────────┴──────────────┴──────────┘

Total Disponible: 35 días (0 + 5 + 15 + 15)
```

---

## ⚖️ Consideración Legal vs. Práctica

### 📕 Según la Ley (Art. 70 Código del Trabajo):

```
"Solo se pueden acumular máximo 2 períodos (60 días).
Los períodos más antiguos se pierden automáticamente."
```

### 💼 En la Práctica (Este Sistema):

```
"El sistema PERMITE dar días de períodos archivados,
pero requiere:
  1. Conocimiento del empleador
  2. Mutuo acuerdo documentado
  3. Justificación clara"
```

### 🎯 Ventajas de Esta Implementación:

| Aspecto | Ventaja |
|---------|---------|
| **Flexibilidad** | Permite compensar trabajadores en casos especiales |
| **Transparencia** | El sistema registra TODO, incluso días "perdidos" |
| **Auditoría** | Historial completo de todos los períodos |
| **Justicia** | Empleador puede ser flexible cuando corresponde |

---

## 🔧 Implementación Técnica

### Función: `assignVacationDays`

```typescript
// ✅ INCLUYE TODOS LOS PERÍODOS (incluso archivados)
const allPeriods = periods // No filtrar archivados

// Ordenar por año ascendente (más antiguo primero)
const sortedPeriods = [...allPeriods].sort((a, b) => 
  a.period_year - b.period_year
)

// Asignar días empezando por el más antiguo
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

## 📊 Casos de Uso

### Caso 1: Trabajador Nuevo (1 Período)

```
2024: 12.50 días acumulados, 0 usados → Solicita 10 días
Resultado: 2024 tiene 2.50 días disponibles
```

### Caso 2: Trabajador con 2 Períodos Activos

```
2023: 15 días, 2024: 15 días → Solicita 20 días
Resultado: 
  - 2023: 15 días usados (completado)
  - 2024: 5 días usados (quedan 10)
```

### Caso 3: Trabajador con Períodos Archivados

```
2020 (archivado): 15 días
2023 (activo): 15 días
2024 (activo): 15 días
→ Solicita 40 días

Resultado:
  - 2020: 15 días usados (completado) ✅ Usa archivado
  - 2023: 15 días usados (completado)
  - 2024: 10 días usados (quedan 5)
```

---

## 🚨 Alertas y Notificaciones

El sistema genera alertas cuando un trabajador acumula muchos días:

| Días Acumulados | Nivel | Acción Recomendada |
|-----------------|-------|-------------------|
| 30-44 días | 🟡 Moderado | Planificar vacaciones próximas |
| 45-59 días | ⚠️ Urgente | Programar vacaciones pronto |
| 60+ días | 🔴 Crítico | **Obligatorio otorgar vacaciones** |

---

## 📝 Limpieza de Datos

Si los períodos muestran días usados pero no hay vacaciones:

```sql
-- Ejecutar en Supabase → SQL Editor
-- Ver: SQL_LIMPIAR_VACACIONES.sql

-- Resetear todos los períodos
UPDATE vacation_periods
SET used_days = 0, status = 'active'
WHERE employee_id = 'ID_DEL_TRABAJADOR';

-- Recalcular desde vacaciones reales
-- (El script completo está en SQL_LIMPIAR_VACACIONES.sql)
```

---

## ✅ Checklist de Verificación

Después de crear/aprobar vacaciones, verificar:

- [ ] Los días se descontaron del período más antiguo
- [ ] Si el período se agotó, status cambió a 'completed'
- [ ] El total disponible disminuyó correctamente
- [ ] La vacación tiene `period_year` asignado
- [ ] La tabla muestra la vacación en el período correcto

---

## 🎓 Referencias Legales

- **Art. 67 Código del Trabajo**: 15 días hábiles por año
- **Art. 70 Código del Trabajo**: Máximo 2 períodos (60 días)
- **Art. 73 Código del Trabajo**: Compensación solo al término del contrato
- **Ord. N°6287/2017 DT**: Obligación de otorgar feriado
- **Ord. N°307/2025 DT**: Responsabilidad del empleador

---

**Fecha**: 15 de enero de 2026  
**Versión**: 2.0  
**Estado**: ✅ Implementado y Operativo
