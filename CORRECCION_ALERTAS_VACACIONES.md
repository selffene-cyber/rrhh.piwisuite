# 🔔 Corrección de Alertas de Vacaciones - Días Disponibles vs Acumulados

**Fecha**: 15 de enero de 2026  
**Severidad**: 🔴 CRÍTICO  
**Estado**: ✅ CORREGIDO

---

## 🔍 Descripción del Bug

### Síntoma Reportado

El trabajador **Bastian Alberto Ahumada Bruna** tiene:
- ✅ **75 días acumulados** históricos (desde 2019)
- ✅ **60 días usados** en solicitudes
- ✅ **15 días disponibles** reales (75 - 60 = 15)

**Pero** la notificación mostraba:
- ❌ **"75 días"** (usando días acumulados)
- ❌ Alerta crítica incorrecta

### Problema Fundamental

**Las alertas usaban `totalAccumulated` en vez de `totalAvailable`**

```typescript
// ❌ ANTES (Incorrecto)
if (totalAccumulated >= 60 && periodsCount >= 2) {
  message: `¡CRÍTICO! Trabajador con ${totalAccumulated.toFixed(2)} días...`
}
```

---

## 🎯 Diferencia Conceptual

### Días Acumulados (totalAccumulated)

**Definición**: Suma histórica de TODOS los días generados desde el ingreso.

```
Ejemplo Bastian:
2019: 15 días generados
2020: 15 días generados
2021: 15 días generados
2022: 15 días generados
2023: 15 días generados
TOTAL ACUMULADO: 75 días (histórico)
```

**Característica**: Este número **SIEMPRE CRECE** con el tiempo, nunca disminuye.

### Días Disponibles (totalAvailable)

**Definición**: Días que el trabajador puede tomar AHORA (acumulados - usados).

```
Ejemplo Bastian:
Total Acumulado: 75 días
Total Usado: 60 días
TOTAL DISPONIBLE: 15 días (real, actual)
```

**Característica**: Este número **SUBE Y BAJA** según se tomen vacaciones.

---

## ✅ Solución Implementada

### Cambios en `calculateVacationAlertType()`

**Archivo**: `lib/services/vacationNotifications.ts`

```typescript
// ✅ AHORA (Correcto)
function calculateVacationAlertType(
  totalAccumulated: number,
  totalAvailable: number,  // ← Este es el que debe usarse
  periodsCount: number
) {
  
  // CRÍTICO: 60+ días DISPONIBLES
  if (totalAvailable >= 60 && periodsCount >= 2) {
    return {
      alertType: 'critical_loss',
      priority: 1,
      message: `¡CRÍTICO! Trabajador con ${totalAvailable.toFixed(2)} días disponibles...`,
      legalReference: 'Art. 70 Código del Trabajo'
    }
  }
  
  // URGENTE: 45+ días DISPONIBLES
  if (totalAvailable >= 45) {
    return {
      alertType: 'high_accumulation',
      priority: 2,
      message: `Trabajador con ${totalAvailable.toFixed(2)} días disponibles...`,
      legalReference: 'Ord. N°6287/2017 DT'
    }
  }
  
  // MODERADO: 30+ días DISPONIBLES
  if (totalAvailable >= 30) {
    return {
      alertType: 'moderate_accumulation',
      priority: 3,
      message: `Trabajador con ${totalAvailable.toFixed(2)} días disponibles...`,
      legalReference: 'Ord. N°307/2025 DT'
    }
  }
  
  return null
}
```

### Cambios en Ordenamiento

```typescript
// ❌ ANTES
return b.totalAccumulated - a.totalAccumulated

// ✅ AHORA
return b.totalAvailable - a.totalAvailable
```

---

## 📊 Ejemplos de Corrección

### Caso 1: Bastian Alberto Ahumada Bruna

```
ANTES (Incorrecto):
- Acumulados: 75 días
- Usados: 60 días
- Disponibles: 15 días
- Alerta: 🔴 CRÍTICA (basada en 75 días acumulados) ❌

AHORA (Correcto):
- Acumulados: 75 días (histórico)
- Usados: 60 días
- Disponibles: 15 días
- Alerta: ⚠️ Ninguna (15 días < 30 días umbral) ✅
```

### Caso 2: Trabajador con Muchos Días Disponibles

```
Trabajador: Juan Pérez
- Ingreso: 2019
- Acumulados: 75 días (histórico)
- Usados: 10 días
- Disponibles: 65 días

ANTES:
- Alerta: 🔴 CRÍTICA (por 75 acumulados) ❌

AHORA:
- Alerta: 🔴 CRÍTICA (por 65 disponibles) ✅
- Mensaje: "¡CRÍTICO! Trabajador con 65.00 días disponibles"
```

### Caso 3: Trabajador con Pocos Días Disponibles

```
Trabajador: María López
- Ingreso: 2023
- Acumulados: 22.50 días (histórico)
- Usados: 15 días
- Disponibles: 7.50 días

ANTES:
- Alerta: ⚠️ Ninguna (22.50 < 30) ✅

AHORA:
- Alerta: ⚠️ Ninguna (7.50 < 30) ✅
```

---

## 🎯 Umbrales de Alertas (Corregidos)

| Nivel | Días DISPONIBLES | Prioridad | Color | Acción Recomendada |
|-------|------------------|-----------|-------|-------------------|
| 🔴 **CRÍTICO** | ≥ 60 días | 1 | Rojo | ¡Programar vacaciones urgente! Riesgo de pérdida |
| 🟠 **URGENTE** | ≥ 45 días | 2 | Naranja | Planificar vacaciones pronto |
| 🟡 **MODERADO** | ≥ 30 días | 3 | Amarillo | Considerar programación |
| ✅ **OK** | < 30 días | - | Verde | Sin alerta |

---

## ⚖️ Justificación Legal

### Por Qué Usar Días Disponibles

1. **Art. 70 CT**: El límite de 60 días aplica a días **que puede tomar**, no a históricos.
2. **Ord. N°6287/2017**: La obligación de otorgar vacaciones se basa en días **pendientes**.
3. **Riesgo Real**: Solo los días disponibles representan riesgo de pérdida.

### Ejemplo Legal

```
Trabajador con:
- 90 días acumulados históricos
- 85 días usados
- 5 días disponibles

¿Hay riesgo de pérdida? NO
Los días históricos no importan, solo los disponibles (5 días).
```

---

## 🧪 Cómo Verificar la Corrección

### Paso 1: Recargar la Aplicación

La corrección se aplica automáticamente al recargar.

### Paso 2: Verificar Notificaciones

1. Ir a **Dashboard** o hacer clic en 🔔
2. Ver la sección **🏖️ VACACIONES**
3. Verificar que las alertas muestren **días disponibles**

### Paso 3: Validar con Bastian

Para Bastian Alberto Ahumada Bruna:
- Antes: Alerta crítica con "75 días" ❌
- Ahora: Sin alerta (15 días disponibles < 30 umbral) ✅

---

## 📈 Impacto de la Corrección

### Antes (Incorrecto)

```
❌ Alertas basadas en histórico (nunca disminuye)
❌ Trabajadores con muchas vacaciones usadas seguían en "crítico"
❌ Confusión entre acumulado histórico vs disponible
❌ Alertas falsas que no reflejaban riesgo real
```

### Después (Correcto)

```
✅ Alertas basadas en días disponibles (reflejan realidad)
✅ Trabajadores que tomaron vacaciones salen de "crítico"
✅ Claridad: alertas muestran días que puede tomar HOY
✅ Solo alertan trabajadores con riesgo real de pérdida
```

---

## 🎓 Lecciones Aprendidas

### 1. Semántica Clara

**"Acumulados"** vs **"Disponibles"** no son lo mismo:
- **Acumulados**: Histórico total generado
- **Disponibles**: Lo que puede usar ahora

### 2. Contexto de Alertas

Las alertas deben reflejar **riesgo actual**, no **histórico**.

### 3. Testing con Casos Reales

El caso de Bastian fue perfecto para detectar el bug:
- 75 acumulados (histórico alto)
- 60 usados (gestión activa)
- 15 disponibles (sin riesgo real)

---

## 📊 Comparativa Final

| Aspecto | ❌ Antes | ✅ Después |
|---------|----------|------------|
| **Métrica usada** | totalAccumulated | totalAvailable |
| **Refleja riesgo real** | No | Sí |
| **Alerta de Bastian** | Crítica (incorrecto) | Ninguna (correcto) |
| **Ordenamiento** | Por acumulados | Por disponibles |
| **Claridad** | Confuso | Claro |

---

## 🔧 Archivos Modificados

### `lib/services/vacationNotifications.ts`

**Cambios**:
- ✅ Línea 50-56: Condición crítica usa `totalAvailable`
- ✅ Línea 60-66: Condición urgente usa `totalAvailable`
- ✅ Línea 70-76: Condición moderada usa `totalAvailable`
- ✅ Línea 144-149: Ordenamiento por `totalAvailable`
- ✅ Comentarios actualizados para claridad

---

## 🚀 Resultado

### Para Bastian

**Antes**:
```
🔴 CRÍTICA: ¡Trabajador con 75.00 días acumulados!
```

**Ahora**:
```
✅ Sin alerta (15 días disponibles, sin riesgo)
```

### Para el Sistema

- ✅ Alertas precisas y útiles
- ✅ Solo notifica riesgos reales
- ✅ Trabajadores con buena gestión no aparecen como críticos
- ✅ Días históricos se siguen mostrando (para información)

---

## 📝 Nota Importante

**Los días acumulados históricos siguen siendo importantes para**:
- Auditoría y registros
- Historial del trabajador
- Cálculos de compensaciones

**Pero las ALERTAS deben basarse en días DISPONIBLES para**:
- Reflejar riesgo real actual
- Priorizar acciones correctas
- Evitar falsos positivos

---

**Fecha de Corrección**: 15 de enero de 2026  
**Criticidad**: 🔴 Alta  
**Estado**: ✅ Resuelto y Documentado  
**Versión**: 2.1
