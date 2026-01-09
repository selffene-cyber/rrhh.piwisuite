# 📋 Manual del Módulo de Compliance y Vencimientos

## 📑 Índice

1. [Introducción](#introducción)
2. [Conceptos Clave](#conceptos-clave)
3. [Estructura del Módulo](#estructura-del-módulo)
4. [Tipos de Ítems](#tipos-de-ítems)
5. [Estados y Criticidad](#estados-y-criticidad)
6. [Dashboard Principal](#dashboard-principal)
7. [Gestión de Ítems](#gestión-de-ítems)
8. [Asignación Masiva](#asignación-masiva)
9. [Compliance por Trabajador](#compliance-por-trabajador)
10. [Notificaciones Automáticas](#notificaciones-automáticas)
11. [Reportes y Exportación](#reportes-y-exportación)
12. [Casos de Uso](#casos-de-uso)
13. [FAQs](#faqs)
14. [Troubleshooting](#troubleshooting)

---

## Introducción

### ¿Qué es el Módulo de Compliance?

El **Módulo de Compliance** es un sistema integral para gestionar y controlar vencimientos de documentos, certificaciones, licencias, cursos obligatorios y exámenes requeridos por los trabajadores de tu empresa.

### Objetivos Principales

1. **Prevenir Vencimientos**: Alertas automáticas antes de que los documentos expiren
2. **Cumplimiento Legal**: Asegurar que todos los trabajadores tengan sus certificaciones al día
3. **Trazabilidad**: Registro completo de emisiones, renovaciones y evidencias
4. **Gestión Centralizada**: Vista única de todos los cumplimientos por empresa
5. **Reportes**: Información detallada para auditorías y toma de decisiones

### Accesos

- **Admin/RH**: `/compliance` - Dashboard completo con todos los trabajadores
- **Trabajador Individual**: `/employees/[id]/compliance` - Vista personal
- **Portal del Trabajador**: `/employee/compliance` - Vista propia (autogestión)

---

## Conceptos Clave

### 1. Ítem de Compliance

Es un **tipo de documento, certificación o requisito** que debe cumplirse. Ejemplos:
- Certificado de Manipulación de Alimentos
- Licencia de Conducir Clase B
- Curso de Prevención de Riesgos
- Examen de Altura Física

**Características**:
- Tiene un nombre único
- Define la vigencia en días (ej: 365 días)
- Tiene criticidad (ALTA, MEDIA, BAJA)
- Requiere o no evidencia (archivo adjunto)
- Puede aplicar a cargos, centros de costo o condiciones específicas

### 2. Cumplimiento (Worker Compliance)

Es una **instancia de un ítem asignado a un trabajador específico** con:
- Fecha de emisión
- Fecha de vencimiento
- Estado actual (VIGENTE, POR_VENCER, VENCIDO, etc.)
- Evidencia (archivo PDF, imagen, etc.)
- Verificación por RH

### 3. Estados

| Estado | Descripción | Color |
|--------|-------------|-------|
| **VIGENTE** | Válido, con más de 30 días restantes | 🟢 Verde |
| **POR_VENCER** | Vence en 30 días o menos | 🟠 Naranja |
| **VENCIDO** | Ya pasó la fecha de vencimiento | 🔴 Rojo |
| **EN_RENOVACION** | Se está tramitando la renovación | 🔵 Azul |
| **EXENTO** | No aplica para este trabajador | ⚪ Gris |

### 4. Criticidad

| Criticidad | Prioridad | Uso |
|------------|-----------|-----|
| **ALTA** | ⚠️ Crítico | Requisitos legales obligatorios, sin los cuales el trabajador NO PUEDE laborar |
| **MEDIA** | ⚡ Importante | Requisitos recomendados, deben cumplirse en plazos razonables |
| **BAJA** | ℹ️ Informativo | Capacitaciones opcionales, certificaciones adicionales |

### 5. Tipos de Ítems

| Tipo | Icono | Ejemplos |
|------|-------|----------|
| **CERTIFICADO** | 📜 | Certificado de Manipulación de Alimentos, ISO 9001 |
| **LICENCIA** | 🪪 | Licencia de Conducir, Licencia de Operador de Grúa |
| **CURSO** | 📚 | Curso de Prevención de Riesgos, Capacitación Interna |
| **EXAMEN** | 📝 | Examen Médico Anual, Examen de Altura Física |
| **OTRO** | 📋 | Cualquier otro tipo de cumplimiento |

---

## Estructura del Módulo

### Arquitectura de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    EMPRESA (Company)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
    ┌──────▼──────┐        ┌──────▼──────┐
    │ TRABAJADORES│        │  ÍTEMS DE   │
    │ (Employees) │        │ COMPLIANCE  │
    └──────┬──────┘        └──────┬──────┘
           │                       │
           └───────────┬───────────┘
                       │
              ┌────────▼────────┐
              │  CUMPLIMIENTOS  │
              │    (Worker      │
              │   Compliance)   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ NOTIFICACIONES  │
              │  AUTOMÁTICAS    │
              └─────────────────┘
```

### Tablas Principales

#### 1. `compliance_items`
Catálogo de tipos de cumplimientos

```sql
- id: UUID
- company_id: UUID
- nombre: VARCHAR (ej: "Licencia de Conducir Clase B")
- tipo: VARCHAR ('CERTIFICADO', 'LICENCIA', 'CURSO', 'EXAMEN', 'OTRO')
- vigencia_dias: INTEGER (ej: 365, 1825 para 5 años)
- requiere_evidencia: BOOLEAN
- criticidad: VARCHAR ('ALTA', 'MEDIA', 'BAJA')
- aplica_a_cargo: BOOLEAN
- aplica_a_cc: BOOLEAN
- aplica_a_condicion: TEXT (ej: "todos los conductores")
- descripcion: TEXT
- activo: BOOLEAN
```

#### 2. `worker_compliance`
Instancias de cumplimientos asignados a trabajadores

```sql
- id: UUID
- company_id: UUID
- employee_id: UUID
- compliance_item_id: UUID
- fecha_emision: DATE
- fecha_vencimiento: DATE
- status: VARCHAR ('VIGENTE', 'POR_VENCER', 'VENCIDO', 'EN_RENOVACION', 'EXENTO')
- evidencia_url: TEXT (URL en Supabase Storage)
- evidencia_nombre: VARCHAR
- verificado_por: UUID (usuario que verificó)
- fecha_verificacion: TIMESTAMP
- notas: TEXT
- source: VARCHAR ('manual', 'onboarding', 'perfil_cargo', 'import')
```

#### 3. `compliance_notifications`
Notificaciones automáticas de vencimientos

```sql
- id: UUID
- company_id: UUID
- employee_id: UUID
- worker_compliance_id: UUID
- tipo: VARCHAR ('COMPLIANCE')
- titulo: VARCHAR
- mensaje: TEXT
- prioridad: VARCHAR ('ALTA', 'MEDIA', 'BAJA')
- leida: BOOLEAN
- action_type: VARCHAR ('SUBIR_EVIDENCIA', 'SOLICITAR_RENOVACION', 'VER_DETALLE')
- action_link: TEXT
- hito_dias: INTEGER (30, 15, 7, 0, -7, -15, -30)
```

---

## Dashboard Principal

### Acceso
`/compliance`

### Componentes del Dashboard

#### 1. Estadísticas Globales

```
┌────────────────────────────────────────────────────────────┐
│  📊 Resumen de Cumplimientos                               │
├────────────────────────────────────────────────────────────┤
│  Total: 250  │  ✅ Vigentes: 180  │  ⚠️ Por Vencer: 45   │
│  ❌ Vencidos: 20  │  🔄 En Renovación: 5                  │
│  🚨 CRÍTICOS: 15 (Vencidos o por vencer con criticidad ALTA)│
└────────────────────────────────────────────────────────────┘
```

**Interpretación**:
- **Total**: Suma de todos los cumplimientos activos
- **Vigentes**: Con más de 30 días de vigencia
- **Por Vencer**: Vencen en 30 días o menos
- **Vencidos**: Ya pasó la fecha de vencimiento
- **Críticos**: Alertas urgentes que requieren atención inmediata

#### 2. Filtros Avanzados

```
Tipo: [Todos ▼] | Estado: [Todos ▼] | Criticidad: [Todos ▼]
Centro de Costo: [Todos ▼] | Cargo: [Todos ▼]
```

**Filtros Disponibles**:
- **Tipo**: CERTIFICADO, LICENCIA, CURSO, EXAMEN, OTRO
- **Estado**: VIGENTE, POR_VENCER, VENCIDO, EN_RENOVACION, EXENTO
- **Criticidad**: ALTA, MEDIA, BAJA
- **Centro de Costo**: Filtrar por CC específico
- **Cargo**: Filtrar por posición/cargo

#### 3. Tabla de Cumplimientos

```
┌──────────────┬──────────────┬────────────┬──────────┬────────────┬──────────┬──────────┐
│ Trabajador   │ RUT          │ Ítem       │ Tipo     │ Vence      │ Días     │ Estado   │
├──────────────┼──────────────┼────────────┼──────────┼────────────┼──────────┼──────────┤
│ Juan Pérez   │ 12.345.678-9 │ Lic. Cond. │ LICENCIA │ 15/01/2025 │ 7 días   │ 🟠 POR   │
│              │              │ Clase B    │          │            │          │   VENCER │
├──────────────┼──────────────┼────────────┼──────────┼────────────┼──────────┼──────────┤
│ María Silva  │ 98.765.432-1 │ Curso Prev.│ CURSO    │ 10/12/2024 │ -29 días │ 🔴 VENCIDO│
│              │              │ Riesgos    │          │            │ VENCIDO  │          │
└──────────────┴──────────────┴────────────┴──────────┴────────────┴──────────┴──────────┘
```

**Columnas**:
- **Trabajador**: Nombre completo + RUT
- **Ítem**: Nombre del cumplimiento
- **Tipo**: CERTIFICADO, LICENCIA, CURSO, EXAMEN, OTRO
- **Vence**: Fecha de vencimiento
- **Días Restantes**: Días hasta vencimiento (o días vencido si negativo)
- **Estado**: Badge visual con el estado actual
- **Criticidad**: Badge (ALTA, MEDIA, BAJA)
- **Evidencia**: ✅ Si tiene archivo adjunto, ❌ si falta
- **Acciones**: Ver, Editar, Descargar evidencia, Eliminar

#### 4. Acciones Rápidas

```
┌────────────────────────────────────────────────────────────┐
│  [+ Agregar Ítem]  [📋 Asignar Masivamente]  [📊 Reportes] │
│  [📥 Exportar PDF]  [📥 Exportar Excel]                    │
└────────────────────────────────────────────────────────────┘
```

---

## Gestión de Ítems

### Crear Nuevo Ítem

**Ruta**: `/compliance/items` → "Crear Ítem"

#### Formulario

```
┌─────────────────────────────────────────────────────────┐
│  📋 Nuevo Ítem de Compliance                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Nombre del Ítem *                                      │
│  [ Certificado de Manipulación de Alimentos           ]│
│                                                         │
│  Tipo *                                                 │
│  [ CERTIFICADO ▼ ]                                     │
│  Opciones: CERTIFICADO, LICENCIA, CURSO, EXAMEN, OTRO  │
│                                                         │
│  Vigencia (días) *                                      │
│  [ 365 ]  (1 año)                                      │
│  Común: 365 (1 año), 730 (2 años), 1095 (3 años)      │
│                                                         │
│  Criticidad *                                           │
│  ○ ALTA    ○ MEDIA    ○ BAJA                          │
│                                                         │
│  ☑ Requiere Evidencia (archivo adjunto)               │
│                                                         │
│  Descripción (opcional)                                 │
│  [                                                    ] │
│  [                                                    ] │
│                                                         │
│  Aplicabilidad (opcional)                               │
│  ☐ Aplicar a cargo específico                         │
│  ☐ Aplicar a centro de costo específico               │
│  Condición especial: [ ej: "todos los conductores"   ]│
│                                                         │
│  [Cancelar]  [Guardar Ítem]                           │
└─────────────────────────────────────────────────────────┘
```

#### Ejemplos de Ítems Comunes

| Nombre | Tipo | Vigencia | Criticidad | Requiere Evidencia |
|--------|------|----------|------------|-------------------|
| Certificado Manipulación Alimentos | CERTIFICADO | 365 días | ALTA | ✅ Sí |
| Licencia de Conducir Clase B | LICENCIA | 1825 días (5 años) | ALTA | ✅ Sí |
| Curso Prevención de Riesgos | CURSO | 730 días (2 años) | MEDIA | ✅ Sí |
| Examen Médico Anual | EXAMEN | 365 días | ALTA | ✅ Sí |
| Examen de Altura Física | EXAMEN | 365 días | ALTA | ✅ Sí |
| Licencia Operador de Grúa | LICENCIA | 1095 días (3 años) | ALTA | ✅ Sí |
| Curso Primeros Auxilios | CURSO | 730 días | MEDIA | ✅ Sí |
| Certificado ISO 9001 (empresa) | CERTIFICADO | 365 días | MEDIA | ✅ Sí |

---

## Asignación Masiva

### ¿Cuándo usar?

Cuando necesitas asignar el mismo ítem de compliance a **múltiples trabajadores** a la vez.

**Casos de uso**:
- Todos los trabajadores deben renovar su examen médico
- Todos los conductores deben renovar su licencia
- Un centro de costo completo debe hacer un curso

### Proceso de Asignación Masiva

**Ruta**: `/compliance/assign`

#### Paso 1: Seleccionar Ítem

```
┌─────────────────────────────────────────────────────────┐
│  Seleccionar Ítem de Compliance                         │
│  [ Certificado Manipulación de Alimentos ▼ ]           │
└─────────────────────────────────────────────────────────┘
```

#### Paso 2: Seleccionar Destinatarios

```
┌─────────────────────────────────────────────────────────┐
│  Aplicar a:                                             │
│  ○ Todos los trabajadores activos                      │
│  ○ Por cargo                                            │
│     [ Conductor ▼ ]                                    │
│  ○ Por centro de costo                                 │
│     [ Operaciones ▼ ]                                  │
│  ○ Lista específica de trabajadores                    │
│     [                                                 ] │
│     [ Buscar trabajadores...                         ] │
│                                                         │
│  Trabajadores seleccionados: 15                        │
└─────────────────────────────────────────────────────────┘
```

#### Paso 3: Definir Fechas

```
┌─────────────────────────────────────────────────────────┐
│  Fecha de Emisión *                                     │
│  [ 08/01/2025 ]                                        │
│                                                         │
│  Fecha de Vencimiento (calculada automáticamente)       │
│  [ 08/01/2026 ] (365 días después)                    │
│  o ingresar manualmente: [ 08/01/2026 ]               │
│                                                         │
│  [Cancelar]  [Asignar a 15 trabajadores]              │
└─────────────────────────────────────────────────────────┘
```

#### Resultado

```
✅ Asignación masiva completada correctamente
   
   Se asignó "Certificado Manipulación de Alimentos" a 15 trabajadores.
   
   Estado:
   - 15 registros creados
   - 0 trabajadores ya tenían este ítem
   
   Los trabajadores recibirán notificaciones automáticas 30, 15 y 7 días
   antes del vencimiento.
```

---

## Compliance por Trabajador

### Vista Individual

**Ruta**: `/employees/[id]/compliance`

#### Secciones

```
┌─────────────────────────────────────────────────────────┐
│  👤 Cumplimientos de Juan Pérez (12.345.678-9)         │
├─────────────────────────────────────────────────────────┤
│  Cargo: Conductor  │  Centro de Costo: Operaciones     │
│  Estado General: ⚠️ 2 Por Vencer, 1 Vencido           │
└─────────────────────────────────────────────────────────┘
```

#### Tabla de Cumplimientos

```
┌──────────────────┬──────────┬────────────┬──────────┬──────────┬──────────┐
│ Ítem             │ Tipo     │ Emitido    │ Vence    │ Estado   │ Acciones │
├──────────────────┼──────────┼────────────┼──────────┼──────────┼──────────┤
│ 📜 Cert. Manip.  │ CERTIF.  │ 10/01/2024 │ 10/01/25 │ 🟢 VIGENTE│ 👁️ 📝   │
│    Alimentos     │          │            │ 2 días   │          │          │
├──────────────────┼──────────┼────────────┼──────────┼──────────┼──────────┤
│ 🪪 Lic. Cond.    │ LICENCIA │ 15/06/2020 │ 15/01/25 │ 🟠 POR   │ 👁️ 📝   │
│    Clase B       │          │            │ 7 días   │   VENCER │          │
├──────────────────┼──────────┼────────────┼──────────┼──────────┼──────────┤
│ 📚 Curso Prev.   │ CURSO    │ 20/12/2022 │ 20/12/24 │ 🔴 VENCIDO│ 👁️ 📝   │
│    Riesgos       │          │            │ -19 días │          │          │
└──────────────────┴──────────┴────────────┴──────────┴──────────┴──────────┘
```

### Agregar Cumplimiento Individual

```
┌─────────────────────────────────────────────────────────┐
│  ➕ Agregar Cumplimiento para Juan Pérez               │
├─────────────────────────────────────────────────────────┤
│  Ítem de Compliance *                                   │
│  [ Seleccionar ítem ▼ ]                                │
│                                                         │
│  Fecha de Emisión *                                     │
│  [ 08/01/2025 ]                                        │
│                                                         │
│  Fecha de Vencimiento *                                 │
│  [ 08/01/2026 ] (calculada automáticamente)           │
│                                                         │
│  Estado                                                 │
│  [ VIGENTE ▼ ]                                         │
│                                                         │
│  Evidencia (archivo)                                    │
│  [📎 Adjuntar archivo (PDF, JPG, PNG, max 5MB)]       │
│                                                         │
│  Notas (opcional)                                       │
│  [ Renovado en oficina central                        ]│
│                                                         │
│  [Cancelar]  [Guardar]                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Notificaciones Automáticas

### Sistema de Hitos

El sistema genera notificaciones automáticas en los siguientes momentos:

| Hito | Días Antes/Después | Prioridad | Ejemplo |
|------|-------------------|-----------|---------|
| **30 días antes** | +30 | BAJA | "Tu Certificado vence en 30 días" |
| **15 días antes** | +15 | MEDIA | "Tu Licencia vence en 15 días. Planifica su renovación" |
| **7 días antes** | +7 | MEDIA/ALTA* | "Tu Curso vence en 7 días. Es urgente renovar" |
| **Día del vencimiento** | 0 | ALTA | "Tu Examen vence hoy. Acción inmediata requerida" |
| **7 días después** | -7 | ALTA | "Tu Certificado está vencido hace 7 días" |
| **15 días después** | -15 | ALTA | "Tu Licencia está vencida hace 15 días. Regulariza" |
| **30 días después** | -30 | ALTA | "Tu Curso está vencido hace 30 días. Situación crítica" |

**\* Prioridad ALTA si la criticidad del ítem es ALTA**

### Integración con Bell Icon 🔔

Las notificaciones de compliance aparecen en el bell icon del header junto con contratos y vacaciones:

```
┌────────────────────────────────────────────┐
│  🔔 [Badge: 18]                            │
│  ▼ Dropdown                                │
├────────────────────────────────────────────┤
│ 🚨 VENCIDOS (Contratos) (3)                │
│ ⚠️ CRÍTICOS (Contratos) (4)                │
│ 🏖️ VACACIONES (5)                          │
│ 🛡️ COMPLIANCE (6)  ← NUEVA SECCIÓN        │
│   • 📜 Cert. Manip. Alimentos              │
│     Juan Pérez                             │
│     Vencido hace 19 días. Requiere         │
│     renovación inmediata.                  │
│     👤 12.345.678-9                        │
│     📅 Vence: 20/12/2024                   │
│     🔴 19 días vencido                     │
│     [ALTA]                                 │
└────────────────────────────────────────────┘
```

**Características**:
- ✅ Colores según urgencia (rojo, naranja, amarillo)
- ✅ Badge de criticidad (ALTA, MEDIA, BAJA)
- ✅ Click lleva a `/employees/[id]/compliance`
- ✅ Solo muestra items vencidos o por vencer (≤30 días)

---

## Reportes y Exportación

### Exportar a PDF

**Ruta**: `/compliance` → "Exportar PDF"

**Contenido del PDF**:
```
┌─────────────────────────────────────────────────────────┐
│  REPORTE DE CUMPLIMIENTOS - [Nombre Empresa]            │
│  Fecha: 08/01/2025  |  Total Registros: 250            │
├─────────────────────────────────────────────────────────┤
│  Resumen:                                               │
│  - Vigentes: 180 (72%)                                  │
│  - Por Vencer: 45 (18%)                                 │
│  - Vencidos: 20 (8%)                                    │
│  - En Renovación: 5 (2%)                                │
│                                                         │
│  Críticos: 15 items requieren atención inmediata       │
├─────────────────────────────────────────────────────────┤
│  Detalle por Trabajador:                                │
│  [Tabla completa con todos los registros filtrados]    │
└─────────────────────────────────────────────────────────┘
```

### Exportar a Excel

**Ruta**: `/compliance` → "Exportar Excel"

**Columnas del Excel**:
- Trabajador
- RUT
- Cargo
- Centro de Costo
- Ítem de Compliance
- Tipo
- Criticidad
- Fecha Emisión
- Fecha Vencimiento
- Días Restantes
- Estado
- Tiene Evidencia
- Notas

**Formato**: Compatible con Excel, LibreOffice, Google Sheets

---

## Casos de Uso

### Caso 1: Renovación Masiva de Exámenes Médicos

**Situación**: Es enero y todos los trabajadores deben renovar su examen médico anual.

**Pasos**:
1. Ir a `/compliance/assign`
2. Seleccionar ítem: "Examen Médico Anual"
3. Aplicar a: "Todos los trabajadores activos"
4. Fecha emisión: 15/01/2025
5. Fecha vencimiento: 15/01/2026 (calculada automáticamente)
6. Click "Asignar a [N] trabajadores"
7. ✅ Sistema crea registros y programa notificaciones automáticas

**Resultado**:
- Todos los trabajadores ven el nuevo cumplimiento en su portal
- Recibirán alertas 30, 15 y 7 días antes del vencimiento
- RH puede hacer seguimiento en tiempo real

---

### Caso 2: Control de Licencias de Conducir

**Situación**: Tienes 50 conductores y necesitas controlar que sus licencias estén vigentes.

**Pasos**:
1. Crear ítem: "Licencia de Conducir Clase B"
   - Tipo: LICENCIA
   - Vigencia: 1825 días (5 años)
   - Criticidad: ALTA
   - Requiere evidencia: Sí
2. Asignar masivamente al cargo "Conductor"
3. Solicitar a cada conductor que suba su evidencia (foto de la licencia)
4. Verificar evidencias en `/compliance`
5. Filtrar por "Licencias por vencer" para planificar renovaciones

**Resultado**:
- Control automático de todas las licencias
- Alertas antes de que venzan
- Trazabilidad completa con evidencias

---

### Caso 3: Onboarding con Cumplimientos

**Situación**: Nuevo trabajador ingresa como manipulador de alimentos.

**Pasos**:
1. Crear empleado en `/employees/new`
2. Ir a `/employees/[id]/compliance`
3. Click "Agregar Cumplimiento"
4. Seleccionar: "Certificado Manipulación de Alimentos"
5. Ingresar fechas y adjuntar certificado
6. Guardar

**Resultado**:
- Desde el día 1, el trabajador tiene sus cumplimientos registrados
- Se generan notificaciones automáticas para futuras renovaciones

---

## FAQs

### ¿Qué pasa si un cumplimiento vence?

1. El estado cambia automáticamente a **VENCIDO** 🔴
2. Se genera una notificación de **ALTA prioridad**
3. Aparece en el dashboard con resaltado crítico
4. El trabajador recibe alertas en su portal
5. RH puede filtrar por "Vencidos" para tomar acción

### ¿Puedo modificar la fecha de vencimiento?

✅ Sí, puedes editar un cumplimiento y cambiar las fechas si hay una extensión o error.

### ¿Qué pasa si un trabajador es exento de un cumplimiento?

Marca el cumplimiento como **EXENTO**. Esto:
- No genera alertas
- Se muestra con color gris
- Se excluye de contadores críticos

### ¿Puedo eliminar un cumplimiento?

✅ Sí, pero ten cuidado: al eliminar se pierde el historial. Es mejor marcarlo como EXENTO.

### ¿Cómo subo evidencias?

1. Editar el cumplimiento
2. Click en "Adjuntar archivo"
3. Seleccionar archivo (PDF, JPG, PNG, max 5MB)
4. Guardar

El archivo se sube a Supabase Storage y queda vinculado permanentemente.

---

## Troubleshooting

### Problema: Las notificaciones no se generan

**Causa**: La función cron no está configurada o no se ejecuta.

**Solución**:
1. Verificar que existe `/api/compliance/cron`
2. Configurar un servicio externo (ej: cron-job.org) para llamar a esta API cada día
3. O ejecutar manualmente: `SELECT generate_compliance_notifications();` en SQL

---

### Problema: No puedo adjuntar archivos

**Causa**: Bucket de Supabase Storage no configurado o sin permisos.

**Solución**:
1. Crear bucket "compliance-evidences" en Supabase Storage
2. Configurar políticas RLS para permitir uploads
3. Verificar que el tamaño del archivo sea < 5MB

---

### Problema: Fechas de vencimiento incorrectas

**Causa**: Error al calcular o ingresar manualmente.

**Solución**:
1. Editar el cumplimiento
2. Corregir la fecha de vencimiento
3. El sistema recalculará automáticamente el estado

---

**Fecha**: 8 de enero de 2025  
**Versión**: 1.0  
**Última actualización**: Build con integración a notificaciones

---


