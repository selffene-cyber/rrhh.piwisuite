# 🔔 Integración de Compliance en Notificaciones

## 📋 Resumen

Se ha integrado el **Módulo de Compliance** en el sistema de notificaciones del bell icon del header, permitiendo alertas en tiempo real sobre vencimientos de certificados, licencias, cursos y exámenes.

---

## ✅ **¿Qué se Integró?**

### 1. Servicio de Notificaciones de Compliance

**Archivo**: `lib/services/complianceNotifications.ts`

**Funcionalidades**:
- ✅ Detecta cumplimientos que vencen en 30 días o menos
- ✅ Detecta cumplimientos ya vencidos
- ✅ Calcula prioridad según días restantes y criticidad del ítem
- ✅ Genera mensajes dinámicos según el estado
- ✅ Asigna iconos según el tipo (📜 Certificado, 🪪 Licencia, 📚 Curso, 📝 Examen)

---

### 2. Tipos de Alertas

| Tipo | Condición | Prioridad | Mensaje |
|------|-----------|-----------|---------|
| **expired** | Días restantes < 0 | 🔴 1 | "Vencido hace X días. Requiere renovación inmediata." |
| **expires_today** | Días restantes = 0 | 🔴 1 | "Vence hoy. Acción inmediata requerida." |
| **expiring_critical** | Días restantes ≤ 7 o (≤15 si criticidad ALTA) | 🟠 1-2 | "Vence en X días. Criticidad ALTA/Urgente." |
| **expiring_urgent** | Días restantes ≤ 15 | 🟠 2 | "Vence en X días. Planificar renovación." |
| **expiring_soon** | Días restantes ≤ 30 | 🟡 3 | "Vence en X días." |

---

### 3. Integración en NotificationsDropdown

**Archivo**: `components/NotificationsDropdown.tsx`

**Cambios**:
- ✅ Importado `getComplianceNotifications` y tipos
- ✅ Agregado tipo `compliance` al `UnifiedNotification`
- ✅ Carga paralela de 3 servicios (contratos, vacaciones, compliance)
- ✅ Contadores combinados en el badge
- ✅ Nueva sección visual "🛡️ COMPLIANCE" en el dropdown
- ✅ Componente `ComplianceNotificationItem` para renderizar cada alerta

---

## 🎨 **Resultado Visual**

### Bell Icon con Notificaciones Mixtas

```
┌────────────────────────────────────────────────────────────┐
│  🔔  [Badge: 25]  ← 7 contratos + 5 vacaciones + 13 compliance │
│  ▼ Dropdown                                                 │
├────────────────────────────────────────────────────────────┤
│ 🚨 VENCIDOS (Contratos) (3)                                │
│   • Contrato Juan Pérez - Vencido hace 5 días             │
│                                                            │
│ ⚠️ CRÍTICOS (Contratos) (4)                                │
│   • Contrato María Silva - Vence en 3 días                │
│                                                            │
│ 🏖️ VACACIONES (5)                                          │
│   • Juan Pérez - 60 días acumulados                       │
│                                                            │
│ 🛡️ COMPLIANCE (13)  ← NUEVA SECCIÓN                       │
│   • 📜 Certificado Manipulación de Alimentos [ALTA]       │
│     Juan Pérez                                             │
│     Vencido hace 19 días. Requiere renovación inmediata.  │
│     👤 12.345.678-9                                        │
│     📅 Vence: 20/12/2024                                   │
│     🔴 19 días vencido                                     │
│                                                            │
│   • 🪪 Licencia de Conducir Clase B [ALTA]                │
│     María Silva                                            │
│     Vence en 7 días. Criticidad ALTA.                     │
│     👤 98.765.432-1                                        │
│     📅 Vence: 15/01/2025                                   │
│     🟠 7 días restantes                                    │
│                                                            │
│   • 📚 Curso Prevención de Riesgos [MEDIA]                │
│     Pedro López                                            │
│     Vence en 25 días.                                     │
│     👤 11.222.333-4                                        │
│     📅 Vence: 02/02/2025                                   │
│     🟢 25 días restantes                                   │
└────────────────────────────────────────────────────────────┘
```

---

## 🔍 **Lógica de Priorización**

El sistema ordena todas las notificaciones (contratos, vacaciones, compliance) por prioridad global:

| Prioridad | Tipo | Condición |
|-----------|------|-----------|
| **🔴 1** | Contrato | Vencido o vence hoy |
| **🔴 1** | Vacación | ≥60 días (crítico - puede perder días) |
| **🔴 1** | Compliance | Vencido o vence hoy |
| **🔴 1** | Compliance | ≤7 días y criticidad ALTA |
| **🟠 2** | Contrato | Vence en 1-7 días (crítico) |
| **🟠 2** | Vacación | ≥45 días (urgente) |
| **🟠 2** | Compliance | ≤7 días (sin criticidad ALTA) |
| **🟠 2** | Compliance | ≤15 días |
| **🟡 3** | Contrato | Vence en 8-15 días (urgente) |
| **🟡 3** | Vacación | ≥30 días (moderado) |
| **🟡 3** | Compliance | ≤30 días |

**Resultado**: Las alertas más críticas (independiente del módulo) aparecen primero.

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
bg: '#fffbeb'    // Naranja muy claro
iconColor: '#f59e0b'  // Naranja
textColor: '#92400e'  // Marrón

// Próximo (30 días)
bg: '#fefce8'    // Amarillo muy claro
iconColor: '#ca8a04'  // Amarillo oscuro
textColor: '#713f12'  // Marrón oscuro
```

### Badges de Criticidad

```
[ALTA]   → bg: '#fee2e2', color: '#991b1b' (rojo)
[MEDIA]  → bg: '#fef3c7', color: '#92400e' (naranja)
[BAJA]   → bg: '#dcfce7', color: '#166534' (verde)
```

---

## 🔧 **Archivos Modificados**

| Archivo | Cambio |
|---------|--------|
| `lib/services/complianceNotifications.ts` | ✅ **NUEVO** - Servicio completo de notificaciones |
| `components/NotificationsDropdown.tsx` | ✅ Integración de 3 tipos de notificaciones |
| ✓ Importaciones | Agregado `getComplianceNotifications` y `FaShieldAlt` |
| ✓ Tipo unificado | Agregado `compliance` a `UnifiedNotification` |
| ✓ loadNotifications() | Carga paralela de 3 servicios (`Promise.all`) |
| ✓ Contadores | Combinación de compliance con contratos y vacaciones |
| ✓ Renderizado | Nueva sección "🛡️ COMPLIANCE" en dropdown |
| ✓ Componente nuevo | `ComplianceNotificationItem` |

---

## ⚙️ **Cómo Funciona**

### 1. Carga Paralela

```typescript
const [contractNotifs, vacationNotifs, complianceNotifs] = await Promise.all([
  getContractNotifications(companyId, supabase),
  getVacationNotifications(companyId, supabase),
  getComplianceNotifications(companyId, supabase)  // ← NUEVO
])
```

**Ventaja**: Las 3 consultas se ejecutan simultáneamente, reduciendo el tiempo de carga.

---

### 2. Combinar Notificaciones

```typescript
const allNotifications: UnifiedNotification[] = [
  ...contractNotifs.map(n => ({ ...n, type: 'contract' as const })),
  ...vacationNotifs.map(n => ({ ...n, type: 'vacation' as const })),
  ...complianceNotifs.map(n => ({ ...n, type: 'compliance' as const }))  // ← NUEVO
]
```

Cada notificación tiene un campo `type` que permite discriminar su origen.

---

### 3. Ordenar por Prioridad

```typescript
allNotifications.sort((a, b) => {
  const priorityA = a.type === 'contract' 
    ? (a.status === 'expired' ? 1 : a.status === 'expiring_critical' ? 2 : 3)
    : a.priority
  const priorityB = b.type === 'contract' 
    ? (b.status === 'expired' ? 1 : b.status === 'expiring_critical' ? 2 : 3)
    : b.priority
  return priorityA - priorityB
})
```

Las notificaciones con `priority = 1` (críticas) aparecen primero, independiente del módulo.

---

### 4. Renderizar Sección de Compliance

```tsx
{complianceNotifs.length > 0 && (
  <div>
    <div style={{ background: '#fef3c7' }}>
      <FaShieldAlt /> COMPLIANCE ({complianceNotifs.length})
    </div>
    {complianceNotifs
      .sort((a, b) => a.priority - b.priority)
      .map(notif => (
        <ComplianceNotificationItem
          key={notif.id}
          notification={notif}
          onClick={(employeeId) => {
            setIsOpen(false)
            router.push(`/employees/${employeeId}/compliance`)
          }}
        />
      ))}
  </div>
)}
```

---

## 🎯 **Ejemplo Completo**

### Escenario

**Empresa**: 50 trabajadores  
**Compliance**:
- 10 con certificados vencidos (criticidad ALTA)
- 5 con licencias por vencer en 7 días (criticidad ALTA)
- 8 con cursos por vencer en 15 días (criticidad MEDIA)

**Contratos**:
- 3 contratos vencidos
- 2 contratos por vencer en 5 días

**Vacaciones**:
- 2 trabajadores con 60 días acumulados (crítico)

---

### Resultado en Bell Icon

```
Badge: 30 notificaciones

Dropdown (ordenado por prioridad):

🚨 VENCIDOS (Contratos) (3)  ← Prioridad 1
🔴 Contrato Juan Pérez - Vencido hace 10 días

🛡️ COMPLIANCE - VENCIDOS (10)  ← Prioridad 1
📜 Certificado Manipulación Alimentos [ALTA]
   María Silva - Vencido hace 20 días

⚠️ CRÍTICOS (Contratos) (2)  ← Prioridad 2
🟠 Contrato Pedro López - Vence en 5 días

🛡️ COMPLIANCE - CRÍTICOS (5)  ← Prioridad 1-2
🪪 Licencia Conducir Clase B [ALTA]
   Ana Martínez - Vence en 7 días

🏖️ VACACIONES (2)  ← Prioridad 1
⚠️ Juan Pérez - 60 días acumulados

🛡️ COMPLIANCE - URGENTES (8)  ← Prioridad 3
📚 Curso Prevención Riesgos [MEDIA]
   Carlos Gómez - Vence en 15 días
```

---

## 🚀 **Cómo Probar**

### Paso 1: Crear Cumplimientos de Prueba

1. Ir a `/compliance/items`
2. Crear ítem: "Prueba Certificado Vencido"
   - Tipo: CERTIFICADO
   - Vigencia: 365 días
   - Criticidad: ALTA
3. Ir a `/compliance/assign`
4. Asignar a 1 trabajador con:
   - Fecha emisión: 01/01/2023
   - Fecha vencimiento: 01/01/2024 (hace 1 año - **VENCIDO**)

---

### Paso 2: Verificar Notificación

1. Refrescar navegador: `Ctrl + Shift + R`
2. Ver bell icon en el header
3. **Badge debe mostrar +1**
4. Click en el bell
5. **Debe aparecer sección "🛡️ COMPLIANCE (1)"**
6. **Debe mostrar**:
   ```
   📜 Prueba Certificado Vencido [ALTA]
   [Nombre Trabajador]
   Vencido hace 372 días. Requiere renovación inmediata.
   👤 [RUT]
   📅 Vence: 01/01/2024
   🔴 372 días vencido
   ```

---

### Paso 3: Click en Notificación

1. Click en la notificación de compliance
2. **Debe redirigir a** `/employees/[id]/compliance`
3. **Debe mostrar** el cumplimiento vencido resaltado

---

## 📚 **Documentación Creada**

| Documento | Contenido |
|-----------|-----------|
| `lib/services/complianceNotifications.ts` | Servicio completo de notificaciones |
| `MANUAL_COMPLIANCE.md` | Manual completo del módulo (14 páginas) |
| `INTEGRACION_COMPLIANCE_NOTIFICACIONES.md` | Este documento - Explicación de la integración |

---

## ✅ **Checklist de Verificación**

- [x] Servicio `complianceNotifications.ts` creado
- [x] Integración en `NotificationsDropdown.tsx`
- [x] Carga paralela de 3 servicios (Promise.all)
- [x] Contadores combinados en badge
- [x] Sección "🛡️ COMPLIANCE" en dropdown
- [x] Componente `ComplianceNotificationItem`
- [x] Colores dinámicos según prioridad
- [x] Badges de criticidad (ALTA, MEDIA, BAJA)
- [x] Click redirige a `/employees/[id]/compliance`
- [x] Build exitoso sin errores TypeScript
- [x] Manual completo creado

---

## 🎯 **Próximos Pasos**

### Opcional: Función Cron para Notificaciones

Actualmente, las notificaciones se generan **en tiempo real** al abrir el dropdown.

Para **notificaciones push** o **correos electrónicos**, necesitarás:

1. **Configurar Cron Job**:
   - Servicio externo (ej: cron-job.org)
   - Llamar a `/api/compliance/cron` cada día a las 8:00 AM

2. **La función ya existe**:
   ```sql
   SELECT generate_compliance_notifications();
   ```
   Esta función:
   - Itera sobre todos los cumplimientos
   - Verifica hitos (30, 15, 7, 0, -7, -15, -30 días)
   - Crea notificaciones en `compliance_notifications`
   - Las notificaciones se pueden usar para emails/push

3. **Integrar con servicio de emails** (ej: SendGrid, Resend):
   ```typescript
   // En /api/compliance/cron
   const notifs = await getUnreadNotifications()
   for (const notif of notifs) {
     await sendEmail(notif.employee.email, notif.titulo, notif.mensaje)
   }
   ```

---

**Fecha**: 8 de enero de 2025  
**Versión**: 1.0  
**Build**: ✅ Exitoso  
**Estado**: Funcional y listo para producción



