# ⏰ Integración de Pactos de Horas Extras en Notificaciones

## 📋 Resumen

Se ha integrado el **Módulo de Pactos de Horas Extras** en el sistema de notificaciones del bell icon del header, permitiendo alertas en tiempo real sobre vencimientos de pactos según el Art. 32 del Código del Trabajo chileno.

---

## 🚨 **¿Por qué es Crítico?**

### Marco Legal

Según el **Art. 32 del Código del Trabajo de Chile**:

> "Las horas extraordinarias solo podrán pactarse para atender necesidades o situaciones temporales de la empresa. Dichas horas extraordinarias se pagarán con un recargo del cincuenta por ciento sobre el sueldo convenido para la jornada ordinaria y deberán liquidarse y pagarse conjuntamente con las remuneraciones ordinarias del respectivo período."

**Puntos Clave**:
1. **Pacto Previo Obligatorio**: Sin pacto escrito, las horas extras son ILEGALES
2. **Duración Máxima**: 90 días (renovables)
3. **Límite Diario**: Máximo 2 horas extras por día
4. **Multa**: Sin pacto vigente, la empresa puede ser multada por la Dirección del Trabajo

### Riesgos de un Pacto Vencido

| Situación | Consecuencia |
|-----------|--------------|
| **Trabajador hace HH.EE. sin pacto vigente** | 🚨 Ilegal - Multa DT |
| **Pacto vencido hace más de 7 días** | 🔴 Riesgo alto de fiscalización |
| **Renovación tardía** | ⚠️ Debe generarse nuevo pacto, no puede ser retroactivo |

---

## ✅ **¿Qué se Integró?**

### 1. Servicio de Notificaciones de Horas Extras

**Archivo**: `lib/services/overtimeNotifications.ts`

**Funcionalidades**:
- ✅ Detecta pactos que vencen en 30 días o menos
- ✅ Detecta pactos ya vencidos
- ✅ Calcula prioridad según días restantes
- ✅ Genera mensajes dinámicos con referencia legal
- ✅ Filtra solo pactos activos o expirados (no drafts)

---

### 2. Tipos de Alertas

| Tipo | Condición | Prioridad | Mensaje | Referencia Legal |
|------|-----------|-----------|---------|------------------|
| **expired** | Días < 0 | 🔴 1 | "Vencido hace X días. El trabajador NO PUEDE hacer horas extras." | Art. 32 CT - Pacto obligatorio |
| **expires_today** | Días = 0 | 🔴 1 | "Vence hoy. Renovar inmediatamente." | Art. 32 inc. 1° CT |
| **expiring_critical** | Días ≤ 7 | 🔴 1 | "Vence en X días. Urgente: preparar renovación." | DT Ord. N°1263/2019 |
| **expiring_urgent** | Días ≤ 15 | 🟠 2 | "Vence en X días. Planificar renovación pronto." | Art. 32 CT - Duración 90 días |
| **expiring_soon** | Días ≤ 30 | 🟡 3 | "Vence en X días. Considerar renovación." | Art. 32 CT |

---

### 3. Integración en NotificationsDropdown

**Archivo**: `components/NotificationsDropdown.tsx`

**Cambios**:
- ✅ Importado `getOvertimeNotifications` y tipos
- ✅ Agregado tipo `overtime` al `UnifiedNotification`
- ✅ Carga paralela de **4 servicios** (contratos, vacaciones, compliance, overtime)
- ✅ Contadores combinados en el badge
- ✅ Nueva sección visual "⏰ PACTOS HORAS EXTRAS" en el dropdown
- ✅ Componente `OvertimeNotificationItem` para renderizar cada alerta
- ✅ Click redirige a `/overtime/[id]`

---

## 🎨 **Resultado Visual**

### Bell Icon con Notificaciones de 4 Módulos

```
┌──────────────────────────────────────────────────────────────┐
│  🔔  [Badge: 42]  ← 7 contratos + 5 vacaciones + 13 compliance + 17 HH.EE. │
│  ▼ Dropdown                                                   │
├──────────────────────────────────────────────────────────────┤
│ 🚨 VENCIDOS (Contratos) (3)                                  │
│   • Contrato Juan Pérez - Vencido hace 5 días               │
│                                                              │
│ ⚠️ CRÍTICOS (Contratos) (4)                                  │
│   • Contrato María Silva - Vence en 3 días                  │
│                                                              │
│ 🏖️ VACACIONES (5)                                            │
│   • Juan Pérez - 60 días acumulados                         │
│                                                              │
│ 🛡️ COMPLIANCE (13)                                           │
│   • 📜 Certificado Manipulación Alimentos - Vencido         │
│                                                              │
│ ⏰ PACTOS HORAS EXTRAS (17)  ← NUEVA SECCIÓN                │
│   • ⏰ Pacto Horas Extras [PHE-042]                          │
│     Juan Pérez                                               │
│     Vencido hace 12 días. El trabajador NO PUEDE hacer      │
│     horas extras sin pacto vigente.                          │
│     👤 12.345.678-9                                          │
│     📅 Vence: 26/12/2024                                     │
│     ⏱️ Máx: 2h/día                                           │
│     🔴 12 días vencido                                       │
│     Art. 32 Código del Trabajo - Pacto obligatorio          │
│                                                              │
│   • ⏰ Pacto Horas Extras [PHE-089]                          │
│     María Silva                                              │
│     Vence en 5 días. Urgente: preparar renovación.          │
│     👤 98.765.432-1                                          │
│     📅 Vence: 13/01/2025                                     │
│     ⏱️ Máx: 2h/día                                           │
│     🟠 5 días restantes                                      │
│     DT Ord. N°1263/2019                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔍 **Lógica de Priorización Global**

El sistema ahora ordena **4 tipos de notificaciones** por prioridad:

| Prioridad | Tipo | Condición |
|-----------|------|-----------|
| **🔴 1** | Contrato | Vencido o vence hoy |
| **🔴 1** | Vacación | ≥60 días (riesgo pérdida legal) |
| **🔴 1** | Compliance | Vencido o vence hoy o ≤7 días ALTA |
| **🔴 1** | **Horas Extras** | **Vencido o vence hoy o ≤7 días** |
| **🟠 2** | Contrato | Vence en 1-7 días |
| **🟠 2** | Vacación | ≥45 días |
| **🟠 2** | Compliance | ≤7-15 días |
| **🟠 2** | **Horas Extras** | **≤15 días** |
| **🟡 3** | Contrato | Vence en 8-15 días |
| **🟡 3** | Vacación | ≥30 días |
| **🟡 3** | Compliance | ≤30 días |
| **🟡 3** | **Horas Extras** | **≤30 días** |

**Resultado**: Las alertas más críticas aparecen primero, independiente del módulo.

---

## 📊 **Colores y Badges**

### Colores de Fondo según Tipo de Alerta

```typescript
// Vencido o vence hoy
bg: '#fef2f2'    // Rojo muy claro
iconColor: '#dc2626'  // Rojo
textColor: '#991b1b'  // Rojo oscuro

// Crítico (7 días)
bg: '#fffbeb'    // Naranja muy claro
iconColor: '#f59e0b'  // Naranja
textColor: '#92400e'  // Marrón

// Urgente (15 días)
bg: '#fff7ed'    // Naranja claro
iconColor: '#f97316'  // Naranja intenso
textColor: '#9a3412'  // Marrón rojizo

// Próximo (30 días)
bg: '#f0f9ff'    // Azul muy claro
iconColor: '#0284c7'  // Azul
textColor: '#075985'  // Azul oscuro
```

### Badge de Número de Pacto

```
[PHE-042]  → bg: '#e0e7ff', color: '#3730a3' (índigo)
```

---

## 🔧 **Archivos Modificados**

| Archivo | Cambio |
|---------|--------|
| `lib/services/overtimeNotifications.ts` | ✅ **NUEVO** - Servicio completo de notificaciones |
| `components/NotificationsDropdown.tsx` | ✅ Integración de 4 tipos de notificaciones |
| ✓ Importaciones | Agregado `getOvertimeNotifications` y `FaClock` |
| ✓ Tipo unificado | Agregado `overtime` a `UnifiedNotification` |
| ✓ loadNotifications() | Carga paralela de 4 servicios (`Promise.all`) |
| ✓ Contadores | Combinación de overtime con otros módulos |
| ✓ Renderizado | Nueva sección "⏰ PACTOS HORAS EXTRAS" |
| ✓ Componente nuevo | `OvertimeNotificationItem` |

---

## ⚙️ **Cómo Funciona**

### 1. Carga Paralela

```typescript
const [contractNotifs, vacationNotifs, complianceNotifs, overtimeNotifs] = await Promise.all([
  getContractNotifications(companyId, supabase),
  getVacationNotifications(companyId, supabase),
  getComplianceNotifications(companyId, supabase),
  getOvertimeNotifications(companyId, supabase)  // ← NUEVO
])
```

**Ventaja**: Las 4 consultas se ejecutan simultáneamente, manteniendo la rapidez.

---

### 2. Combinar Notificaciones

```typescript
const allNotifications: UnifiedNotification[] = [
  ...contractNotifs.map(n => ({ ...n, type: 'contract' as const })),
  ...vacationNotifs.map(n => ({ ...n, type: 'vacation' as const })),
  ...complianceNotifs.map(n => ({ ...n, type: 'compliance' as const })),
  ...overtimeNotifs.map(n => ({ ...n, type: 'overtime' as const }))  // ← NUEVO
]
```

---

### 3. Filtrar Solo Pactos Activos/Vencidos

```typescript
// En lib/services/overtimeNotifications.ts
.in('status', ['active', 'expired'])  // No incluye 'draft', 'void', 'renewed'
```

**Razón**: 
- `draft`: Aún no está vigente
- `void`: Anulado (no aplica)
- `renewed`: Ya fue renovado (el nuevo pacto genera su propia alerta)

---

## 🎯 **Ejemplo Completo**

### Escenario Real

**Empresa**: 50 trabajadores  
**Pactos de Horas Extras**:
- 8 pactos vencidos (riesgo legal alto)
- 5 pactos por vencer en 5 días (crítico)
- 4 pactos por vencer en 12 días (urgente)

**Estado Actual**: Enero 2025

---

### Resultado en Bell Icon

```
Badge: 42 notificaciones

Dropdown (ordenado por prioridad):

🚨 VENCIDOS (Contratos) (3)  ← Prioridad 1
🔴 Contrato Juan Pérez - Vencido hace 10 días

⏰ PACTOS HORAS EXTRAS - VENCIDOS (8)  ← Prioridad 1
🔴 Pacto HH.EE. [PHE-042]
   Juan Pérez - Vencido hace 12 días
   El trabajador NO PUEDE hacer horas extras sin pacto vigente.

⚠️ CRÍTICOS (Contratos) (2)  ← Prioridad 2
🟠 Contrato Pedro López - Vence en 5 días

⏰ PACTOS HORAS EXTRAS - CRÍTICOS (5)  ← Prioridad 1
🔴 Pacto HH.EE. [PHE-089]
   María Silva - Vence en 5 días
   Urgente: preparar renovación.

🛡️ COMPLIANCE (13)  ← Prioridad variada

⏰ PACTOS HORAS EXTRAS - URGENTES (4)  ← Prioridad 2
🟠 Pacto HH.EE. [PHE-103]
   Carlos Gómez - Vence en 12 días
   Planificar renovación pronto.

🏖️ VACACIONES (2)  ← Prioridad 1
```

---

## 🚀 **Cómo Probar**

### Paso 1: Crear Pacto de Prueba Vencido

1. Ir a `/overtime/new`
2. Seleccionar trabajador
3. **Fecha inicio**: 01/10/2024
4. **Fecha término**: 29/12/2024 (**VENCIDO**)
5. Máximo horas: 2
6. Motivo: "Prueba notificación"
7. Estado: **active**
8. Guardar

---

### Paso 2: Verificar Notificación

1. Refrescar navegador: `Ctrl + Shift + R`
2. Ver bell icon en el header
3. **Badge debe mostrar +1**
4. Click en el bell
5. **Debe aparecer sección "⏰ PACTOS HORAS EXTRAS (1)"**
6. **Debe mostrar**:
   ```
   ⏰ Pacto Horas Extras [PHE-###]
   [Nombre Trabajador]
   Vencido hace 10 días. El trabajador NO PUEDE hacer horas extras sin pacto vigente.
   👤 [RUT]
   📅 Vence: 29/12/2024
   ⏱️ Máx: 2h/día
   🔴 10 días vencido
   Art. 32 Código del Trabajo - Pacto obligatorio
   ```

---

### Paso 3: Click en Notificación

1. Click en la notificación de horas extras
2. **Debe redirigir a** `/overtime/[id]`
3. **Debe mostrar** el pacto vencido con badge rojo

---

## 📚 **Flujo de Renovación Recomendado**

### 1. Recibir Alerta (15 días antes)

```
⏰ Notificación: "Pacto vence en 15 días. Planificar renovación pronto."
```

---

### 2. Preparar Nuevo Pacto (7 días antes)

1. Ir a `/overtime/new`
2. **Fecha inicio**: Día siguiente al vencimiento del pacto actual
3. **Fecha término**: Hasta 90 días después
4. Motivo: Puede ser el mismo u otro
5. Estado: **draft** (para revisión)

---

### 3. Activar Nuevo Pacto (Antes del vencimiento)

1. Cambiar estado a **active**
2. El pacto anterior automáticamente cambia a **expired**
3. El nuevo pacto genera sus propias notificaciones

---

### 4. Comunicar al Trabajador

- Imprimir PDF del nuevo pacto
- Firma del trabajador
- Archivar en expediente laboral

---

## 📋 **Datos Técnicos**

### Estructura de Datos

```typescript
interface OvertimeNotification {
  id: string
  employee: {
    id: string
    full_name: string
    rut: string
  }
  pact: {
    id: string
    pact_number: string | null  // ej: "PHE-042"
    start_date: string
    end_date: string
    max_daily_hours: number      // siempre ≤ 2
    reason: string
  }
  dias_restantes: number          // negativo si vencido
  status: 'active' | 'expired'
  alertType: 'expired' | 'expires_today' | 'expiring_critical' | 'expiring_urgent' | 'expiring_soon'
  priority: 1 | 2 | 3
  message: string
  legalReference: string
}
```

---

### Referencias Legales Incluidas

| Referencia | Contenido |
|------------|-----------|
| **Art. 32 CT** | Base legal del pacto de horas extras |
| **Art. 32 inc. 1° CT** | Máximo 2 horas diarias |
| **DT Ord. N°1263/2019** | Pacto debe estar vigente al trabajar |
| **Art. 32 CT - Duración 90 días** | Límite temporal renovable |

---

## ✅ **Checklist de Verificación**

- [x] Servicio `overtimeNotifications.ts` creado
- [x] Integración en `NotificationsDropdown.tsx`
- [x] Carga paralela de 4 servicios (Promise.all)
- [x] Contadores combinados en badge
- [x] Sección "⏰ PACTOS HORAS EXTRAS" en dropdown
- [x] Componente `OvertimeNotificationItem`
- [x] Colores dinámicos según prioridad
- [x] Badge de número de pacto [PHE-###]
- [x] Click redirige a `/overtime/[id]`
- [x] Referencias legales en cada alerta
- [x] Build exitoso sin errores TypeScript
- [x] Documentación completa

---

## 🎯 **Impacto en la Empresa**

### Antes ❌

```
- Sin alertas proactivas de vencimiento
- Riesgo de trabajadores haciendo HH.EE. ilegalmente
- Multas de la DT por incumplimiento
- Renovaciones tardías o perdidas
```

### Ahora ✅

```
- ✅ Alertas 30, 15 y 7 días antes
- ✅ Notificación crítica el mismo día de vencimiento
- ✅ Alerta urgente para pactos vencidos
- ✅ Referencias legales para cada caso
- ✅ Integración con otros módulos críticos
- ✅ Trazabilidad completa
```

---

## 📊 **Sistema Completo de Notificaciones**

| Módulo | Estados | Icono | Documentación |
|--------|---------|-------|---------------|
| Contratos | Vencido, Crítico, Urgente, Próximo | ⚠️ | `MANUAL_CONTRATOS_Y_ANEXOS.md` |
| Vacaciones | Crítico (≥60), Alto (≥45), Medio (≥30) | 🏖️ | `MANUAL_GESTION_VACACIONES.md` |
| Compliance | Vencido, Crítico, Urgente, Próximo | 🛡️ | `MANUAL_COMPLIANCE.md` |
| **Horas Extras** | **Vencido, Crítico, Urgente, Próximo** | **⏰** | **`INTEGRACION_HORAS_EXTRAS_NOTIFICACIONES.md`** |

**Total**: **4 módulos integrados** en un sistema unificado de alertas legales y operativas.

---

**Fecha**: 8 de enero de 2025  
**Versión**: 1.0  
**Build**: ✅ Exitoso  
**Estado**: Funcional y listo para producción


