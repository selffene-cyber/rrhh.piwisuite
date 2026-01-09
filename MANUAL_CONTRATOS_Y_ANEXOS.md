# Manual del Módulo de Contratos y Anexos

## Índice

1. [Introducción](#introducción)
2. [Conceptos Clave](#conceptos-clave)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Ciclo de Vida de un Contrato](#ciclo-de-vida-de-un-contrato)
5. [Tipos de Contratos](#tipos-de-contratos)
6. [Gestión de Contratos](#gestión-de-contratos)
7. [Anexos Contractuales](#anexos-contractuales)
8. [Estados y Transiciones](#estados-y-transiciones)
9. [Reglas de Negocio](#reglas-de-negocio)
10. [Casos de Uso](#casos-de-uso)
11. [Vencimiento y Alertas](#vencimiento-y-alertas)

---

## Introducción

El **Módulo de Contratos y Anexos** es el sistema que gestiona el ciclo de vida completo de los contratos laborales en la plataforma RH Piwi. Permite crear, editar, firmar, activar y terminar contratos, así como generar anexos de modificación.

### Características Principales

- ✅ **Gestión completa de contratos laborales** (indefinidos, plazo fijo, obra/faena, part-time)
- ✅ **Numeración automática correlativa** (CT-01, CT-02, etc.)
- ✅ **Anexos de modificación** con numeración propia (ANX-01, ANX-02, etc.)
- ✅ **Generación de PDF** para impresión y firma
- ✅ **Control de versiones** (historial de cambios)
- ✅ **Validación de contratos activos** (un trabajador = un contrato activo)
- ✅ **Integración con ficha del trabajador**

---

## Conceptos Clave

### Contrato Laboral

Documento legal que establece la relación laboral entre empleador y trabajador, definiendo:
- Cargo y funciones
- Remuneración
- Jornada laboral
- Fecha de inicio (y término si aplica)
- Cláusulas especiales

### Anexo Contractual

Documento complementario que **modifica** uno o más aspectos del contrato original sin crear un nuevo contrato. Se usa para:
- Cambios de sueldo
- Cambios de cargo
- Modificación de jornada
- Prórroga de plazo (para contratos a plazo fijo)
- Otras modificaciones

### Estados del Contrato

| Estado | Descripción | Puede Editar | Puede Firmar | Es Activo |
|--------|-------------|--------------|--------------|-----------|
| **draft** | Borrador | ✅ Sí | ❌ No | ❌ No |
| **issued** | Emitido (listo para firma) | ⚠️ Limitado | ✅ Sí | ❌ No |
| **signed** | Firmado | ❌ No | ❌ No | ❌ No |
| **active** | Vigente | ❌ No | ❌ No | ✅ Sí |
| **terminated** | Terminado | ❌ No | ❌ No | ❌ No |
| **cancelled** | Cancelado | ❌ No | ❌ No | ❌ No |

---

## Arquitectura del Sistema

### Modelo de Datos

#### Tabla `contracts`

```sql
id                    UUID (PK)
contract_number       VARCHAR(20) UNIQUE  -- CT-01, CT-02
employee_id           UUID (FK → employees)
company_id            UUID (FK → companies)

-- Tipo y fechas
contract_type         VARCHAR(50)  -- indefinido, plazo_fijo, obra_faena, part_time
start_date            DATE
end_date              DATE (nullable)  -- NULL para indefinidos

-- Datos del cargo
position              TEXT
position_description  TEXT
work_schedule         TEXT
work_location         TEXT
lunch_break_duration  INTEGER (minutos)

-- Remuneraciones
base_salary           DECIMAL(12,2)
gratuity              BOOLEAN
gratuity_amount       DECIMAL(12,2)
other_allowances      TEXT
payment_method        VARCHAR(100)
payment_periodicity   VARCHAR(50)

-- Datos bancarios
bank_name             VARCHAR(100)
account_type          VARCHAR(50)
account_number        VARCHAR(50)

-- Cláusulas editables
confidentiality_clause    TEXT
authorized_deductions     TEXT
advances_clause           TEXT
internal_regulations      TEXT
additional_clauses        TEXT

-- Estado
status                VARCHAR(20)  -- draft, issued, signed, active, terminated, cancelled

-- Auditoría
created_by            UUID
issued_at             TIMESTAMP
signed_at             TIMESTAMP
terminated_at         TIMESTAMP
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### Tabla `contract_annexes`

```sql
id                    UUID (PK)
annex_number          VARCHAR(20) UNIQUE  -- ANX-01, ANX-02
contract_id           UUID (FK → contracts)
employee_id           UUID (FK → employees)
company_id            UUID (FK → companies)

-- Tipo y fechas
annex_type            VARCHAR(50)  -- modificacion_sueldo, cambio_cargo, etc.
start_date            DATE
end_date              DATE (nullable)

-- Contenido
content               TEXT
modifications_summary TEXT

-- Estado
status                VARCHAR(20)  -- draft, issued, signed, active, cancelled

-- Auditoría
created_by            UUID
issued_at             TIMESTAMP
signed_at             TIMESTAMP
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### Estructura de Archivos

```
app/
├── contracts/
│   ├── page.tsx                    # Lista de contratos
│   ├── new/
│   │   └── page.tsx                # Crear nuevo contrato
│   ├── [id]/
│   │   ├── page.tsx                # Ver detalle del contrato
│   │   ├── edit/
│   │   │   └── page.tsx            # Editar contrato
│   │   └── pdf/
│   │       └── page.tsx            # Vista previa PDF
│   └── annex/
│       ├── new/
│       │   └── page.tsx            # Crear nuevo anexo
│       └── [id]/
│           ├── page.tsx            # Ver anexo
│           ├── edit/
│           │   └── page.tsx        # Editar anexo
│           └── pdf/
│               └── page.tsx        # PDF del anexo
```

---

## Ciclo de Vida de un Contrato

### Flujo Completo

```
┌─────────┐      ┌────────┐      ┌────────┐      ┌────────┐      ┌───────────┐
│ DRAFT   │─────▶│ ISSUED │─────▶│ SIGNED │─────▶│ ACTIVE │─────▶│ TERMINATED│
└─────────┘      └────────┘      └────────┘      └────────┘      └───────────┘
     │                │                                                   
     │                │                                                   
     └────────────────┴──────────────────────────────────────────────────┐
                                                                          │
                                                             ┌───────────▼┐
                                                             │ CANCELLED  │
                                                             └────────────┘
```

### Descripción de Cada Etapa

#### 1. **DRAFT (Borrador)**
- **Inicio**: Se crea el contrato
- **Acciones permitidas**: 
  - Editar todos los campos
  - Eliminar/Cancelar
  - Pasar a "Issued"
- **Restricciones**: No se puede firmar ni activar
- **Duración típica**: Variable (hasta que se complete la información)

#### 2. **ISSUED (Emitido)**
- **Inicio**: Se marca como "listo para firma"
- **Acciones permitidas**: 
  - Ver/Descargar PDF
  - Marcar como firmado
  - Edición limitada (solo errores críticos)
  - Cancelar
- **Restricciones**: No se puede activar sin firma
- **Duración típica**: 1-7 días (tiempo de firma)
- **Marca timestamp**: `issued_at`

#### 3. **SIGNED (Firmado)**
- **Inicio**: Se marca como "firmado"
- **Acciones permitidas**: 
  - Ver/Descargar PDF
  - Activar contrato
  - Cancelar (solo antes de activar)
- **Restricciones**: No se puede editar
- **Duración típica**: 0-1 día (activación inmediata o para fecha futura)
- **Marca timestamp**: `signed_at`

#### 4. **ACTIVE (Activo)**
- **Inicio**: El contrato entra en vigencia
- **Acciones permitidas**: 
  - Ver/Descargar PDF
  - Crear anexos
  - Terminar contrato
- **Restricciones**: 
  - No se puede editar (solo por anexo)
  - Solo puede haber UN contrato activo por trabajador
  - No se puede cancelar (solo terminar)
- **Duración típica**: Meses/Años (según tipo de contrato)
- **Validaciones**:
  - La fecha actual debe ser ≥ `start_date`
  - Si es plazo fijo, la fecha actual debe ser < `end_date`

#### 5. **TERMINATED (Terminado)**
- **Inicio**: El contrato finaliza su vigencia
- **Motivos**: 
  - Vencimiento natural (plazo fijo)
  - Renuncia del trabajador
  - Despido
  - Fin de obra/faena
- **Acciones permitidas**: 
  - Ver/Descargar PDF (histórico)
  - Generar finiquito
- **Restricciones**: No se puede reactivar
- **Marca timestamp**: `terminated_at`

#### 6. **CANCELLED (Cancelado)**
- **Inicio**: Se cancela el contrato antes de ser activado (o por error)
- **Motivos**: 
  - Error en la creación
  - Cambio de decisión
  - Duplicado
- **Acciones permitidas**: Solo vista
- **Restricciones**: No se puede editar ni reactivar

---

## Tipos de Contratos

### 1. Indefinido (`indefinido`)

**Características:**
- No tiene fecha de término
- Es el tipo más común y protegido por la ley
- Puede terminar por: renuncia, despido, mutuo acuerdo, fuerza mayor

**Configuración:**
```
contract_type: 'indefinido'
start_date: '2025-01-15'
end_date: NULL
```

**Uso típico:**
- Empleados permanentes
- Cargos estables
- 90% de los contratos en empresas privadas

---

### 2. Plazo Fijo (`plazo_fijo`)

**Características:**
- Tiene fecha de inicio y término definidas
- Máximo 1 año de duración (puede renovarse hasta 2 veces)
- Vence automáticamente en la fecha de término
- Se convierte en indefinido si el trabajador sigue laborando después del vencimiento

**Configuración:**
```
contract_type: 'plazo_fijo'
start_date: '2025-01-15'
end_date: '2026-01-14'
```

**Uso típico:**
- Reemplazos temporales
- Proyectos con duración definida
- Períodos de prueba extendidos

**⚠️ IMPORTANTE**: Este tipo requiere **monitoreo de vencimiento**.

---

### 3. Obra o Faena (`obra_faena`)

**Características:**
- Ligado a la duración de una obra o proyecto específico
- Termina cuando se completa la obra
- Puede tener fecha estimada de término

**Configuración:**
```
contract_type: 'obra_faena'
start_date: '2025-01-15'
end_date: '2025-12-31'  // Fecha estimada
```

**Uso típico:**
- Construcción
- Proyectos específicos
- Consultoría por proyecto

---

### 4. Part-Time (`part_time`)

**Características:**
- Jornada reducida (menos de 45 horas semanales)
- Puede ser indefinido o plazo fijo
- Proporcionalidad en beneficios

**Configuración:**
```
contract_type: 'part_time'
start_date: '2025-01-15'
end_date: NULL  // o fecha si es a plazo fijo
work_schedule: 'Lunes a Viernes, 14:00 a 18:00 (20 hrs semanales)'
```

**Uso típico:**
- Media jornada
- Jornadas especiales
- Trabajadores con otras actividades

---

## Gestión de Contratos

### Crear un Contrato

#### Proceso paso a paso:

1. **Navegar a Contratos**
   - Menú: "Contratos"
   - Botón: "Nuevo Contrato"

2. **Seleccionar Trabajador**
   - Buscar por nombre o RUT
   - Sistema carga datos automáticamente:
     - Cargo actual
     - Sueldo actual
     - Datos bancarios
     - AFP y salud

3. **Configurar Tipo de Contrato**
   - Seleccionar tipo: Indefinido, Plazo Fijo, Obra/Faena, Part-Time
   - Ingresar fechas:
     - Fecha de inicio (obligatoria)
     - Fecha de término (solo si es plazo fijo u obra/faena)

4. **Definir Cargo y Jornada**
   - Cargo
   - Descripción del cargo (funciones)
   - Jornada laboral:
     - Tipo unificado: "Lunes a Viernes, 09:00 a 18:00"
     - Tipo detallado: Lunes-Jueves / Viernes separados
   - Lugar de trabajo
   - Duración de colación (minutos)

5. **Configurar Remuneraciones**
   - Sueldo base
   - Gratificación:
     - Legal (25% con tope)
     - Fija (monto específico)
     - Sin gratificación
   - Otros bonos/asignaciones
   - Método de pago: Transferencia, Efectivo, Cheque
   - Periodicidad: Mensual, Quincenal, Semanal

6. **Datos Bancarios**
   - Banco
   - Tipo de cuenta
   - Número de cuenta

7. **Cláusulas Contractuales** (Opcionales pero recomendadas)
   - Confidencialidad
   - Descuentos autorizados
   - Anticipos
   - Reglamento interno
   - Cláusulas adicionales

8. **Guardar**
   - Estado inicial: **DRAFT**
   - Sistema asigna número correlativo: `CT-XX`

#### Validaciones:

- ✅ El trabajador debe existir y estar activo
- ✅ El trabajador NO debe tener otro contrato activo
- ✅ La fecha de inicio debe ser válida
- ✅ Si es plazo fijo, la fecha de término debe ser posterior a la de inicio
- ✅ El sueldo base debe ser ≥ sueldo mínimo legal

---

### Editar un Contrato

**Solo se puede editar cuando está en estado DRAFT.**

#### Proceso:

1. Lista de contratos → Buscar contrato en estado "Borrador"
2. Clic en ícono de edición (✏️)
3. Modificar campos necesarios
4. Guardar cambios

#### Restricciones:

| Estado | ¿Se puede editar? | ¿Qué se puede editar? |
|--------|-------------------|----------------------|
| **DRAFT** | ✅ Sí | Todo |
| **ISSUED** | ⚠️ Solo correcciones críticas | Errores tipográficos menores |
| **SIGNED** | ❌ No | Nada (crear anexo) |
| **ACTIVE** | ❌ No | Nada (crear anexo) |
| **TERMINATED** | ❌ No | Nada |
| **CANCELLED** | ❌ No | Nada |

---

### Emitir un Contrato (DRAFT → ISSUED)

**Significa: "El contrato está listo para ser impreso y firmado"**

#### Proceso:

1. En la lista de contratos, buscar el contrato en DRAFT
2. Clic en "Ver Detalle"
3. Botón: "Emitir Contrato"
4. Confirmación
5. Estado cambia a **ISSUED**
6. Se marca `issued_at` con la fecha/hora actual

#### Qué pasa después:

- El contrato se puede descargar en PDF
- Ya no se puede editar libremente
- Está listo para impresión y firma física (o digital)

---

### Firmar un Contrato (ISSUED → SIGNED)

**Significa: "El contrato ha sido firmado por ambas partes"**

#### Proceso:

1. Contrato debe estar en **ISSUED**
2. Se imprime el PDF
3. Se firma físicamente (o digitalmente fuera del sistema)
4. En el sistema:
   - Ver detalle del contrato
   - Botón: "Marcar como Firmado"
   - Confirmación
5. Estado cambia a **SIGNED**
6. Se marca `signed_at` con la fecha/hora actual

#### Qué pasa después:

- El contrato está firmado pero aún no vigente
- Listo para ser activado

---

### Activar un Contrato (SIGNED → ACTIVE)

**Significa: "El contrato entra en vigencia legal"**

#### Proceso:

1. Contrato debe estar en **SIGNED**
2. Ver detalle del contrato
3. Botón: "Activar Contrato"
4. Sistema valida:
   - La fecha actual ≥ `start_date`
   - El trabajador NO tiene otro contrato activo
5. Confirmación
6. Estado cambia a **ACTIVE**

#### Qué pasa después:

- El contrato es el único activo para ese trabajador
- Se pueden generar liquidaciones
- Se pueden crear anexos de modificación
- Ya NO se puede editar (solo por anexo)

#### ⚠️ Restricción Crítica:

**Un trabajador solo puede tener UN contrato activo a la vez.**

Si intentas activar un contrato y el trabajador ya tiene uno activo, el sistema arroja error:
```
Error: El trabajador ya posee un contrato activo. 
Debe terminar el contrato existente o crear un anexo 
antes de activar un nuevo contrato.
```

---

### Terminar un Contrato (ACTIVE → TERMINATED)

**Significa: "El contrato finaliza su vigencia"**

#### Motivos:

1. **Vencimiento natural** (plazo fijo)
2. **Renuncia** del trabajador
3. **Despido**
4. **Fin de obra/faena**
5. **Mutuo acuerdo**

#### Proceso:

1. Contrato debe estar en **ACTIVE**
2. Ver detalle del contrato
3. Botón: "Terminar Contrato"
4. Ingresar:
   - Motivo de término
   - Fecha de término
   - Observaciones (opcional)
5. Confirmación
6. Estado cambia a **TERMINATED**
7. Se marca `terminated_at`

#### Qué pasa después:

- El trabajador queda sin contrato activo
- Se puede crear un nuevo contrato para el mismo trabajador
- Se puede generar finiquito
- El contrato queda en el historial

---

### Cancelar un Contrato (cualquier estado → CANCELLED)

**Significa: "El contrato se cancela por error o decisión antes de ser activado"**

#### Cuándo usar:

- Se creó por error
- Hubo cambio de decisión
- Es un duplicado
- Tiene errores graves no corregibles

#### Proceso:

1. Ver detalle del contrato
2. Botón: "Cancelar Contrato"
3. Confirmación con motivo
4. Estado cambia a **CANCELLED**

#### Restricciones:

- ⚠️ NO se debe cancelar contratos activos (usar "Terminar" en su lugar)
- Una vez cancelado, no se puede reactivar

---

## Anexos Contractuales

### ¿Qué es un Anexo?

Un **anexo contractual** es un documento complementario que **modifica** uno o más aspectos del contrato original **sin crear un nuevo contrato**.

### ¿Cuándo usar un Anexo?

Usa un anexo cuando:
- ✅ El trabajador tiene un contrato activo
- ✅ Necesitas cambiar algo del contrato (sueldo, cargo, jornada, etc.)
- ✅ NO quieres terminar el contrato actual

NO uses anexo si:
- ❌ El cambio es tan radical que amerita un nuevo contrato
- ❌ El trabajador cambia de tipo de contrato (ej: de plazo fijo a indefinido)

### Tipos de Anexos

1. **Modificación de Sueldo** (`modificacion_sueldo`)
   - Aumentos de sueldo
   - Cambios en bonos/asignaciones
   - Modificación de gratificación

2. **Cambio de Cargo** (`cambio_cargo`)
   - Promoción
   - Cambio de funciones
   - Reasignación de puesto

3. **Cambio de Jornada** (`cambio_jornada`)
   - Modificación de horario
   - Cambio de jornada completa a part-time (o viceversa)
   - Ajuste de días laborales

4. **Prórroga** (`prorroga`)
   - Extensión de contrato a plazo fijo
   - Solo para contratos con fecha de término

5. **Otro** (`otro`)
   - Cualquier modificación no cubierta arriba
   - Cambios múltiples
   - Ajustes especiales

---

### Crear un Anexo

#### Proceso paso a paso:

1. **Navegar a Contratos**
   - Lista de contratos
   - Buscar el contrato **ACTIVO** del trabajador

2. **Iniciar Anexo**
   - Ver detalle del contrato
   - Botón: "Crear Anexo"
   - O desde el menú: "Nuevo Anexo" → Seleccionar contrato

3. **Configurar Anexo**
   - Seleccionar tipo de anexo
   - Fecha de inicio de vigencia del anexo
   - Fecha de término (opcional, solo para ciertos tipos)

4. **Describir Modificaciones**
   - **Resumen de modificaciones** (breve, ej: "Aumento de sueldo a $1,200,000")
   - **Contenido completo** (detalle de los cambios):
     ```
     Por el presente anexo se modifica la cláusula Tercera 
     del contrato de trabajo, quedando de la siguiente manera:
     
     "TERCERA: REMUNERACIÓN
     El trabajador recibirá una remuneración mensual de 
     $1.200.000 (Un millón doscientos mil pesos), a partir 
     del 1 de febrero de 2026."
     ```

5. **Guardar**
   - Estado inicial: **DRAFT**
   - Sistema asigna número correlativo: `ANX-XX`

#### Validaciones:

- ✅ El contrato debe estar en estado **ACTIVE**
- ✅ La fecha de inicio del anexo debe ser válida
- ✅ No puede haber otro anexo activo con fecha superpuesta (opcional)

---

### Editar un Anexo

Similar a los contratos, solo se puede editar cuando está en **DRAFT**.

---

### Emitir, Firmar y Activar un Anexo

El proceso es idéntico al de los contratos:

```
DRAFT → ISSUED → SIGNED → ACTIVE
```

**Cuando un anexo se activa:**
- Se aplican las modificaciones al contrato
- El anexo queda vinculado permanentemente al contrato
- Se genera un PDF con el texto del anexo

---

## Estados y Transiciones

### Diagrama de Estados

```
                    ┌─────────┐
          ┌────────▶│ DRAFT   │◀──────────┐
          │         └────┬────┘           │
          │              │                │
          │              ▼                │
          │         ┌─────────┐           │
          │         │ ISSUED  │───────────┤
          │         └────┬────┘           │
          │              │                │
          │              ▼                │
          │         ┌─────────┐           │
          │         │ SIGNED  │───────────┤
          │         └────┬────┘           │
          │              │                │
          │              ▼                │
          │         ┌─────────┐           │
          │    ┌───▶│ ACTIVE  │◀──────────┘ (Solo contratos)
          │    │    └────┬────┘
          │    │         │
          │    │         ▼
          │    │    ┌───────────┐
          │    │    │TERMINATED │
          │    │    └───────────┘
          │    │
          │    └── Solo para anexos: 
          │        ACTIVE es el estado final
          │
          └────────────┐
                       ▼
                  ┌──────────┐
                  │CANCELLED │
                  └──────────┘
```

### Matriz de Transiciones

| Desde \ Hacia | DRAFT | ISSUED | SIGNED | ACTIVE | TERMINATED | CANCELLED |
|---------------|-------|--------|--------|--------|------------|-----------|
| **DRAFT** | - | ✅ Emitir | ❌ | ❌ | ❌ | ✅ Cancelar |
| **ISSUED** | ⚠️ Volver a borrador | - | ✅ Firmar | ❌ | ❌ | ✅ Cancelar |
| **SIGNED** | ❌ | ❌ | - | ✅ Activar | ❌ | ✅ Cancelar |
| **ACTIVE** | ❌ | ❌ | ❌ | - | ✅ Terminar | ❌ |
| **TERMINATED** | ❌ | ❌ | ❌ | ❌ | - | ❌ |
| **CANCELLED** | ❌ | ❌ | ❌ | ❌ | ❌ | - |

---

## Reglas de Negocio

### 1. Un Trabajador = Un Contrato Activo

**Regla fundamental del sistema.**

```sql
-- Validación en base de datos
CREATE TRIGGER prevent_multiple_active_contracts_trigger
BEFORE INSERT OR UPDATE OF status, employee_id ON contracts
FOR EACH ROW
EXECUTE FUNCTION check_single_active_contract();
```

**Implicaciones:**
- Para activar un nuevo contrato, el anterior debe estar en TERMINATED
- No se pueden tener 2 contratos simultáneos (incluso en empresas diferentes del sistema)
- Si necesitas cambiar algo del contrato activo → Usar anexo

---

### 2. Contratos a Plazo Fijo Requieren Fecha de Término

```typescript
if (contract_type === 'plazo_fijo' || contract_type === 'obra_faena') {
  if (!end_date) {
    throw new Error('Los contratos a plazo fijo requieren fecha de término')
  }
  if (end_date <= start_date) {
    throw new Error('La fecha de término debe ser posterior a la de inicio')
  }
}
```

---

### 3. Solo Contratos Activos Pueden Tener Anexos

```typescript
if (contract.status !== 'active') {
  throw new Error('Solo se pueden crear anexos para contratos activos')
}
```

---

### 4. Numeración Correlativa Automática

- Contratos: `CT-01`, `CT-02`, ..., `CT-99`, `CT-100`
- Anexos: `ANX-01`, `ANX-02`, ..., `ANX-99`, `ANX-100`

**Generado automáticamente por triggers en la base de datos.**

---

### 5. Validación de Fechas de Activación

```typescript
if (contract.status === 'signed' && contract.start_date > today) {
  warning('El contrato está firmado pero aún no inicia. Se puede activar desde: ' + contract.start_date)
}
```

---

## Casos de Uso

### Caso 1: Contratación Normal

**Escenario:** Contratar a un nuevo empleado con contrato indefinido.

**Pasos:**
1. Crear trabajador en "Gestión de Trabajadores"
2. Ir a "Contratos" → "Nuevo Contrato"
3. Seleccionar trabajador
4. Tipo: Indefinido
5. Fecha inicio: 01/02/2026
6. Configurar sueldo, cargo, jornada, cláusulas
7. Guardar (estado: DRAFT)
8. Revisar y corregir si es necesario
9. "Emitir Contrato" (estado: ISSUED)
10. Imprimir PDF, firmar
11. "Marcar como Firmado" (estado: SIGNED)
12. El 01/02/2026: "Activar Contrato" (estado: ACTIVE)

**Resultado:** Trabajador con contrato activo desde el 01/02/2026.

---

### Caso 2: Reemplazo Temporal (Plazo Fijo)

**Escenario:** Contratar a alguien para reemplazar a un trabajador con licencia médica por 6 meses.

**Pasos:**
1. Crear trabajador temporal
2. Nuevo contrato
3. Tipo: **Plazo Fijo**
4. Fecha inicio: 01/02/2026
5. Fecha término: 31/07/2026
6. Resto de configuración
7. Emitir → Firmar → Activar

**Resultado:** Contrato activo que vence automáticamente el 31/07/2026.

⚠️ **IMPORTANTE**: El sistema debe alertar antes del vencimiento para:
- Renovar el contrato (crear anexo de prórroga)
- Dar de baja al trabajador
- Convertir a indefinido si seguirá trabajando

---

### Caso 3: Aumento de Sueldo (Anexo)

**Escenario:** Dar un aumento de sueldo a un trabajador que tiene contrato activo.

**Pasos:**
1. Ir a "Contratos"
2. Buscar contrato activo del trabajador
3. Ver detalle → "Crear Anexo"
4. Tipo: **Modificación de Sueldo**
5. Fecha inicio: 01/03/2026
6. Resumen: "Aumento de sueldo de $800,000 a $900,000"
7. Contenido detallado (texto legal)
8. Guardar (DRAFT)
9. Emitir → Firmar → Activar

**Resultado:** Desde el 01/03/2026, el trabajador tiene sueldo $900,000. El contrato original sigue activo, pero con el anexo aplicado.

---

### Caso 4: Prórroga de Contrato a Plazo Fijo

**Escenario:** Extender un contrato que vence el 31/07/2026 hasta el 31/12/2026.

**Pasos:**
1. Ver contrato activo (tipo plazo fijo, vence 31/07/2026)
2. Antes del vencimiento → "Crear Anexo"
3. Tipo: **Prórroga**
4. Fecha inicio: 01/08/2026
5. Fecha término: 31/12/2026
6. Contenido: "Se prorroga el contrato hasta el 31 de diciembre de 2026..."
7. Emitir → Firmar → Activar

**Resultado:** El contrato original ahora vence el 31/12/2026.

---

### Caso 5: Promoción con Cambio de Cargo y Sueldo

**Escenario:** Un "Analista" es promovido a "Jefe de Área" con aumento de sueldo.

**Pasos:**
1. Ver contrato activo
2. Crear Anexo
3. Tipo: **Cambio de Cargo** (o "Otro" si incluye múltiples cambios)
4. Fecha inicio: 01/04/2026
5. Resumen: "Promoción a Jefe de Área con aumento de sueldo"
6. Contenido:
   ```
   Se modifica la cláusula Primera y Tercera del contrato:
   
   PRIMERA: CARGO
   El trabajador desempeñará el cargo de JEFE DE ÁREA DE VENTAS.
   
   TERCERA: REMUNERACIÓN
   El trabajador recibirá un sueldo de $1.500.000 mensuales.
   ```
7. Emitir → Firmar → Activar

**Resultado:** Desde el 01/04/2026, el trabajador tiene nuevo cargo y sueldo.

**Nota:** También debes actualizar la ficha del trabajador en "Gestión de Trabajadores" para que coincida.

---

## Vencimiento y Alertas

### El Problema

Actualmente, el sistema:
- ❌ NO alerta sobre contratos próximos a vencer
- ❌ NO bloquea liquidaciones para contratos vencidos
- ❌ NO marca visualmente contratos vencidos

### Contratos que Requieren Monitoreo

1. **Plazo Fijo** (`plazo_fijo`)
   - Tienen `end_date` definida
   - Vencen automáticamente en esa fecha

2. **Obra o Faena** (`obra_faena`)
   - Tienen `end_date` (estimada o real)
   - Pueden terminar antes si la obra se completa

### ¿Qué debería pasar cuando un contrato vence?

#### Escenarios Posibles:

**1. El trabajador dejó de trabajar en la fecha de término**
→ **Acción:** Cambiar estado del contrato a TERMINATED y marcar al trabajador como inactivo.

**2. El trabajador sigue trabajando después del vencimiento**
→ **Legalmente:** El contrato se convierte automáticamente en INDEFINIDO (Art. 159 Código del Trabajo)
→ **Acción:** Crear anexo de conversión a indefinido o crear nuevo contrato indefinido.

**3. Se necesita extender el contrato a plazo fijo**
→ **Acción:** Crear anexo de prórroga ANTES del vencimiento.

---

### Sistema de Alertas a Implementar

#### 1. **Alertas Proactivas** (Notificaciones)

**30 días antes del vencimiento:**
```
⚠️ ALERTA: Contrato Próximo a Vencer
Trabajador: Juan Pérez
Contrato: CT-15
Fecha de vencimiento: 15/02/2026
Acción sugerida: Crear prórroga o preparar finiquito
```

**15 días antes:**
```
⚠️ URGENTE: Contrato Próximo a Vencer
Trabajador: Juan Pérez
Contrato: CT-15
Vence en: 15 días (15/02/2026)
Acción requerida: Tomar decisión
```

**7 días antes:**
```
🚨 CRÍTICO: Contrato Vence Pronto
Trabajador: Juan Pérez
Contrato: CT-15
Vence en: 7 días (15/02/2026)
Acción urgente: Crear prórroga YA o terminar contrato
```

**El día del vencimiento:**
```
🔴 CONTRATO VENCIDO
Trabajador: Juan Pérez
Contrato: CT-15
Venció hoy: 15/02/2026
Acción inmediata requerida
```

**Después del vencimiento:**
```
🔴 CONTRATO VENCIDO (hace X días)
Trabajador: Juan Pérez
Contrato: CT-15
Venció: 15/02/2026 (hace 5 días)
Regularizar situación urgentemente
```

---

#### 2. **Badge Visual en Lista de Contratos**

```
┌────────────────────────────────────────────────────────────────┐
│ CT-15  Juan Pérez   Plazo Fijo   [🔴 VENCIDO 15/02/2026]     │
│ CT-16  María López  Indefinido    [✅ ACTIVO]                  │
│ CT-17  Pedro Rojas  Plazo Fijo    [⚠️ VENCE en 15 días]       │
│ CT-18  Ana Silva    Plazo Fijo    [🟡 VENCE en 28 días]       │
└────────────────────────────────────────────────────────────────┘
```

---

#### 3. **Dashboard con Sección de Contratos**

```
╔════════════════════════════════════════════════════════╗
║  📊 RESUMEN DE CONTRATOS                               ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Total Contratos:           45                         ║
║  Contratos Activos:         42                         ║
║  Pendientes de Firma:        2                         ║
║  Anexos Activos:            15                         ║
║                                                        ║
║  🔴 REQUIEREN ATENCIÓN INMEDIATA:                      ║
║                                                        ║
║  Vencidos (3):                                         ║
║  • Juan Pérez - CT-15 (venció hace 5 días)            ║
║  • Ana Silva - CT-20 (venció hace 2 días)             ║
║  • Luis Torres - CT-23 (vence hoy)                    ║
║                                                        ║
║  ⚠️ Próximos a Vencer (7-15 días):                    ║
║  • Pedro Rojas - CT-17 (vence en 10 días)             ║
║  • Laura Díaz - CT-19 (vence en 12 días)              ║
║                                                        ║
║  🟡 Monitorear (16-30 días):                          ║
║  • Carlos Muñoz - CT-21 (vence en 25 días)            ║
║  • Sofía Vargas - CT-24 (vence en 28 días)            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

#### 4. **Bloqueo de Liquidaciones**

```
╔══════════════════════════════════════════════════════╗
║  🚫 NO SE PUEDE GENERAR LIQUIDACIÓN                  ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Trabajador: Juan Pérez                              ║
║  Contrato: CT-15                                     ║
║                                                      ║
║  Motivo: Contrato vencido el 15/02/2026             ║
║          (hace 5 días)                               ║
║                                                      ║
║  Acción requerida antes de generar liquidación:      ║
║                                                      ║
║  1. Si el trabajador sigue laborando:               ║
║     ▶ Crear anexo de prórroga o conversión          ║
║       a indefinido                                   ║
║                                                      ║
║  2. Si el trabajador ya no trabaja:                 ║
║     ▶ Terminar contrato                             ║
║     ▶ Generar finiquito                             ║
║                                                      ║
║  [Ver Contrato]  [Crear Anexo]  [Terminar Contrato] ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

#### 5. **Banner en Ficha del Trabajador**

Cuando abres la ficha de un trabajador con contrato vencido:

```
╔══════════════════════════════════════════════════════╗
║  🚨 CONTRATO VENCIDO - ACCIÓN REQUERIDA              ║
╠══════════════════════════════════════════════════════╣
║  Este trabajador tiene un contrato a plazo fijo que  ║
║  venció el 15/02/2026 (hace 5 días).                ║
║                                                      ║
║  Según la ley, si el trabajador continúa laborando   ║
║  después del vencimiento, el contrato se convierte   ║
║  automáticamente en INDEFINIDO.                      ║
║                                                      ║
║  ¿Qué deseas hacer?                                 ║
║                                                      ║
║  [📄 Ver Contrato]  [🔄 Prorrogar]                  ║
║  [📝 Convertir a Indefinido]  [❌ Dar de Baja]      ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

### Lógica de Cálculo de Vencimiento

```typescript
// Determinar estado de un contrato a plazo fijo
function getContractExpirationStatus(contract: Contract): {
  status: 'active' | 'expiring_soon' | 'expiring_urgent' | 'expiring_critical' | 'expired'
  daysUntilExpiration: number
  message: string
} {
  if (!contract.end_date || contract.contract_type === 'indefinido') {
    return { status: 'active', daysUntilExpiration: Infinity, message: 'Contrato vigente' }
  }
  
  const today = new Date()
  const endDate = new Date(contract.end_date)
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return {
      status: 'expired',
      daysUntilExpiration: diffDays,
      message: `Vencido hace ${Math.abs(diffDays)} día(s)`
    }
  } else if (diffDays === 0) {
    return {
      status: 'expiring_critical',
      daysUntilExpiration: 0,
      message: 'Vence hoy'
    }
  } else if (diffDays <= 7) {
    return {
      status: 'expiring_critical',
      daysUntilExpiration: diffDays,
      message: `Vence en ${diffDays} día(s)`
    }
  } else if (diffDays <= 15) {
    return {
      status: 'expiring_urgent',
      daysUntilExpiration: diffDays,
      message: `Vence en ${diffDays} días`
    }
  } else if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      daysUntilExpiration: diffDays,
      message: `Vence en ${diffDays} días`
    }
  } else {
    return {
      status: 'active',
      daysUntilExpiration: diffDays,
      message: 'Contrato vigente'
    }
  }
}
```

---

## Resumen Ejecutivo

### Lo que el sistema HACE:

✅ Crear y gestionar contratos laborales  
✅ Generar anexos de modificación  
✅ Control de estados (draft → issued → signed → active → terminated)  
✅ Validar un solo contrato activo por trabajador  
✅ Numeración automática correlativa  
✅ Generación de PDF  
✅ Historial de contratos y anexos  

### Lo que el sistema NO HACE (pero debería):

❌ Alertar sobre contratos próximos a vencer  
❌ Mostrar badges visuales de vencimiento  
❌ Bloquear liquidaciones para contratos vencidos  
❌ Dashboard de contratos con métricas  
❌ Notificaciones proactivas  
❌ Conversión automática a indefinido post-vencimiento  

---

## Próximos Pasos

Ahora que comprendes cómo funciona el módulo de contratos y anexos, el siguiente paso es implementar el **Sistema de Alertas y Notificaciones** que incluye:

1. **Botón de notificaciones en el header**
2. **Sistema de alertas de contratos vencidos/por vencer**
3. **Badges visuales en tablas**
4. **Bloqueo de liquidaciones**
5. **Dashboard con métricas de contratos**

---

**Manual creado:** Enero 2026  
**Versión:** 1.0  
**Sistema:** RH Piwi - Módulo de Contratos y Anexos


