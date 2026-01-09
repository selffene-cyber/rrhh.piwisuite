# ⏰ Lógica Final: Notificaciones de Pactos de Horas Extras

## ✅ **Lógica Implementada (Correcta)**

### Regla Simple y Clara

```
Para CADA trabajador activo de la empresa:
  ├─ ¿Tiene pacto de horas extras?
  │  │
  │  ├─ SÍ → Verificar estado del pacto:
  │  │     ├─ Vencido → 🔴 CRÍTICO
  │  │     ├─ Vence hoy → 🔴 CRÍTICO
  │  │     ├─ Vence en 1-7 días → 🔴 CRÍTICO
  │  │     ├─ Vence en 8-15 días → 🟠 URGENTE
  │  │     ├─ Vence en 16-30 días → 🟡 PRÓXIMO
  │  │     └─ Vence en >30 días → ✅ Sin alerta
  │  │
  │  └─ NO → ⚠️ ALERTA: "Trabajador sin pacto"
```

**Importante**: NO se verifica si el trabajador está haciendo horas extras o no. Solo se verifica:
1. **Tiene pacto** → Revisar vencimiento
2. **No tiene pacto** → Alertar que falta

---

## 🎯 **Casos de Uso**

### Caso 1: Roberto tiene pacto que vence en 5 días

**Datos**:
- Trabajador: Roberto Vásquez (16.789.012-3)
- Pacto: [PHE-042]
- Vence: 13/01/2025
- Hoy: 08/01/2025

**¿Roberto está haciendo HH.EE.?** → **NO IMPORTA**

**Resultado**:
```
🔴 CRÍTICO
⏰ Pacto Horas Extras [PHE-042]
Roberto Vásquez
Vence en 5 días. Urgente: preparar renovación.
👤 16.789.012-3
📅 Vence: 13/01/2025
⏱️ Máx: 2h/día
🔴 5 días restantes
DT Ord. N°1263/2019
```

---

### Caso 2: Roberto NO tiene ningún pacto

**Datos**:
- Trabajador: Roberto Vásquez (16.789.012-3)
- Pacto: NINGUNO
- Estado: Activo

**¿Roberto está haciendo HH.EE.?** → **NO IMPORTA**

**Resultado**:
```
🟠 ALERTA
⏰ Trabajador Sin Pacto [⚠️ SIN PACTO]
Roberto Vásquez
Trabajador sin pacto de horas extras vigente. 
Debe generar pacto si requiere trabajar horas extras.
👤 16.789.012-3
📋 Debe crear pacto si requiere trabajar HH.EE.
Art. 32 CT - Pacto previo obligatorio para trabajar horas extraordinarias.
```

**Click** → Redirige a `/overtime` para crear pacto

---

### Caso 3: Roberto tiene pacto vigente (40 días restantes)

**Datos**:
- Trabajador: Roberto Vásquez (16.789.012-3)
- Pacto: [PHE-089]
- Vence: 17/02/2025
- Días restantes: 40 días

**Resultado**: ✅ **Sin alertas** (todo está en orden)

---

### Caso 4: Roberto tiene pacto vencido

**Datos**:
- Trabajador: Roberto Vásquez (16.789.012-3)
- Pacto: [PHE-056]
- Vence: 25/12/2024
- Días vencido: 14 días

**Resultado**:
```
🔴 CRÍTICO
⏰ Pacto Horas Extras [PHE-056]
Roberto Vásquez
Vencido hace 14 días. El trabajador NO PUEDE hacer horas extras sin pacto vigente.
👤 16.789.012-3
📅 Vence: 25/12/2024
⏱️ Máx: 2h/día
🔴 14 días vencido
Art. 32 CT - Pacto obligatorio
```

---

## 📊 **Tabla Completa de Escenarios**

| # | Tiene Pacto | Estado Pacto | ¿Alerta? | Tipo | Prioridad |
|---|-------------|--------------|----------|------|-----------|
| 1 | ❌ No | - | ✅ Sí | ⚠️ Sin pacto | 🟠 2 (Alta) |
| 2 | ✅ Sí | Vencido hace X días | ✅ Sí | 🔴 Vencido | 🔴 1 (Crítica) |
| 3 | ✅ Sí | Vence hoy | ✅ Sí | 🔴 Vence hoy | 🔴 1 (Crítica) |
| 4 | ✅ Sí | Vence en 1-7 días | ✅ Sí | 🔴 Crítico | 🔴 1 (Crítica) |
| 5 | ✅ Sí | Vence en 8-15 días | ✅ Sí | 🟠 Urgente | 🟠 2 (Alta) |
| 6 | ✅ Sí | Vence en 16-30 días | ✅ Sí | 🟡 Próximo | 🟡 3 (Media) |
| 7 | ✅ Sí | Vence en >30 días | ❌ No | - | - |

**Nota**: La columna "Tiene HH.EE." fue eliminada porque **NO afecta** las alertas.

---

## 🔧 **Implementación Técnica**

### Función 1: Detectar Trabajadores Sin Pacto

```typescript
async function detectEmployeesWithoutValidPact(
  companyId: string,
  employeeIds: string[],
  supabase: SupabaseClient<any>
): Promise<OvertimeNotification[]>
```

**Lógica**:
1. Obtiene TODOS los trabajadores activos de la empresa
2. Para cada trabajador, verifica si tiene un pacto VIGENTE (status='active' y fecha dentro del rango)
3. Si NO tiene pacto vigente → Genera alerta con prioridad 2 (ALTA, no crítica)

**Resultado**: Array de notificaciones para trabajadores SIN pacto

---

### Función 2: Detectar Pactos por Vencer o Vencidos

```typescript
// Obtener pactos activos o expired
const { data: pactsData } = await supabase
  .from('overtime_pacts')
  .select(...)
  .in('employee_id', employeeIds)
  .in('status', ['active', 'expired'])
  .order('end_date', { ascending: true })
```

**Lógica**:
1. Obtiene TODOS los pactos con status 'active' o 'expired'
2. Para cada pacto, calcula días restantes hasta vencimiento
3. Según días restantes, asigna prioridad y tipo de alerta
4. Filtra solo los que vencen en ≤30 días o ya están vencidos

**Resultado**: Array de notificaciones para pactos existentes

---

### Función 3: Combinar Notificaciones

```typescript
const allNotifications = [...noPactNotifications, ...notifications]

allNotifications.sort((a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority
  // Ordenar por días restantes
  if (a.dias_restantes !== null && b.dias_restantes !== null) {
    return a.dias_restantes - b.dias_restantes
  }
  return 0
})
```

**Resultado**: Array unificado ordenado por prioridad

---

## 🎨 **Visualización Final**

### Ejemplo: Empresa con 5 trabajadores

```
┌────────────────────────────────────────────────────────────┐
│  🔔  [Badge: 7]                                            │
│  ▼ Dropdown                                                │
├────────────────────────────────────────────────────────────┤
│ ⏰ PACTOS HORAS EXTRAS (7)                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 🔴 CRÍTICOS (3)                                            │
│   • Pacto [PHE-042] - Roberto Vásquez                     │
│     Vence en 5 días                                       │
│   • Pacto [PHE-056] - María Silva                         │
│     Vencido hace 8 días                                   │
│   • Pacto [PHE-089] - Juan Pérez                          │
│     Vence en 7 días                                       │
│                                                            │
│ 🟠 URGENTES (2)                                            │
│   • Pacto [PHE-103] - Carlos Gómez                        │
│     Vence en 12 días                                      │
│   • Sin Pacto - Pedro López                               │
│     Debe crear pacto                                      │
│                                                            │
│ 🟡 PRÓXIMOS (2)                                            │
│   • Pacto [PHE-120] - Ana Martínez                        │
│     Vence en 25 días                                      │
│   • Sin Pacto - Luis Torres                               │
│     Debe crear pacto                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## ✅ **Ventajas de Esta Lógica**

### 1. Simplicidad
✅ No necesita verificar si están haciendo HH.EE.  
✅ Solo revisa: ¿Tiene pacto? ¿Está vigente?

### 2. Cobertura Total
✅ Detecta trabajadores sin pacto  
✅ Detecta pactos por vencer  
✅ Detecta pactos vencidos

### 3. Proactividad
✅ Alerta 30, 15, 7 días antes del vencimiento  
✅ Permite planificar renovaciones

### 4. Cumplimiento Legal
✅ Previene multas por pactos vencidos  
✅ Asegura que todos tengan pacto disponible si necesitan hacer HH.EE.

---

## 📋 **Diferencia con Versión Anterior**

### Versión Anterior (Incorrecta)
```
❌ Solo alertaba si:
   - Trabajador tiene HH.EE. recientes Y
   - NO tiene pacto vigente

Problema: Si un trabajador tenía pacto vencido pero no estaba haciendo HH.EE., 
NO alertaba. O si un trabajador no tenía pacto pero tampoco HH.EE., NO alertaba.
```

### Versión Actual (Correcta)
```
✅ Alerta en 2 casos independientes:
   1. Trabajador NO tiene pacto → Alerta (sin importar HH.EE.)
   2. Trabajador tiene pacto → Alerta según vencimiento (sin importar HH.EE.)

Ventaja: Cobertura completa, todos los trabajadores supervisados.
```

---

## 🎯 **Filosofía de Diseño**

> **Todos los trabajadores activos deberían tener un pacto de horas extras vigente**,  
> ya que en cualquier momento podrían necesitar trabajar horas extras.

**Principio**: **Prevención proactiva** en lugar de reacción tardía.

- ✅ Alertar ANTES de que necesiten hacer HH.EE. sin pacto
- ✅ Alertar cuando un pacto está por vencer
- ✅ Permitir renovaciones planificadas

---

## 📊 **Prioridades**

| Prioridad | Color | Situación | Acción |
|-----------|-------|-----------|--------|
| **🔴 1 (Crítica)** | Rojo | Pacto vencido, vence hoy, vence en ≤7 días | Renovar urgente |
| **🟠 2 (Alta)** | Naranja | Pacto vence en 8-15 días, Trabajador sin pacto | Planificar renovación |
| **🟡 3 (Media)** | Amarillo | Pacto vence en 16-30 días | Considerar renovación |

---

## ✅ **Checklist de Funcionalidad**

- [x] Detecta trabajadores sin pacto (sin importar HH.EE.)
- [x] Detecta pactos vencidos
- [x] Detecta pactos por vencer (30, 15, 7 días)
- [x] Priorización correcta (1, 2, 3)
- [x] Navegación a `/overtime` para crear pacto
- [x] Navegación a `/overtime/[id]` para renovar pacto
- [x] Colores diferenciados por urgencia
- [x] Referencias legales (Art. 32 CT)
- [x] Build exitoso sin errores

---

**Fecha**: 8 de enero de 2025  
**Versión**: 2.1 (Final)  
**Build**: ✅ Exitoso  
**Estado**: ✅ Lógica correcta implementada


