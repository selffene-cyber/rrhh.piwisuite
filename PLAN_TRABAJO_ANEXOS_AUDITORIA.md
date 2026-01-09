# Plan de Trabajo - Mejoras de Anexos y Sistema de Auditoría

## 📋 RESUMEN EJECUTIVO

Este plan cubre 3 iniciativas principales:
1. **PROMPT 1**: Evolución de la lógica de creación y gestión de Anexos de Contrato
2. **PROMPT 2**: Sistema de Histórico de Acciones del Trabajador (Auditoría integral)
3. **PROMPT 3**: Diseño técnico del sistema de auditoría (complementa Prompt 2)

---

## 🎯 PROMPT 1: Mejora de Anexos de Contrato

### Estado Actual ✅
- ✅ Sistema básico de creación de anexos existe
- ✅ Carga de contratos y trabajadores
- ✅ Generación de cláusulas básicas
- ✅ Almacenamiento en formato JSON con cláusulas activables

### Tareas Pendientes ❌

#### Etapa 1.1: Carga Contextual Inicial
- ❌ **1.1.1**: Modificar `loadData()` para identificar contrato activo automáticamente
- ❌ **1.1.2**: Cargar anexos existentes asociados al contrato activo
- ❌ **1.1.3**: Mostrar historial de anexos en UI con estados y vigencias
- ❌ **1.1.4**: Validar que el trabajador tenga contrato activo antes de crear anexo

#### Etapa 1.2: Lista de Conceptos Modificables
- ❌ **1.2.1**: Crear lista de conceptos basada en campos editables del contrato
  - Tipo de contrato
  - Cargo y descripción de funciones
  - Jornada / Horario de trabajo
  - Remuneraciones (sueldo base, gratificación, bonos)
  - Lugar de trabajo
  - Método y periodicidad de pago
- ❌ **1.2.2**: Crear dropdown de conceptos en UI
- ❌ **1.2.3**: Mapear cada concepto a campos específicos del contrato

#### Etapa 1.3: Renderizado Dinámico por Concepto
- ❌ **1.3.1**: Crear servicio para obtener valor vigente (contrato + anexos activos)
- ❌ **1.3.2**: Implementar lógica de "valor vigente" considerando vigencias
- ❌ **1.3.3**: Reutilizar componentes de creación de contrato para inputs
- ❌ **1.3.4**: Generar cláusula textual automática según concepto seleccionado
- ❌ **1.3.5**: Mostrar preview de cláusula generada

#### Etapa 1.4: Actualización Automática al Emitir
- ❌ **1.4.1**: Crear función para actualizar `contracts` (snapshot contractual)
- ❌ **1.4.2**: Crear función para actualizar `employees` (campos impactados)
- ❌ **1.4.3**: Integrar actualizaciones en flujo de emisión de anexo
- ❌ **1.4.4**: Validar qué campos impactan en ficha del trabajador

#### Etapa 1.5: Control de Modificaciones Repetidas
- ❌ **1.5.1**: Crear función para detectar modificaciones previas por concepto
- ❌ **1.5.2**: Consultar historial de anexos por concepto modificado
- ❌ **1.5.3**: Implementar tooltip/nota contextual en UI
- ❌ **1.5.4**: Mostrar fecha de emisión y estado de vigencia de anexo anterior
- ❌ **1.5.5**: Agregar botón de visualización rápida del anexo previo

#### Etapa 1.6: Lógica de Vigencia
- ❌ **1.6.1**: Implementar cálculo de valor vigente considerando fechas
- ❌ **1.6.2**: Considerar contrato base + último anexo activo por concepto
- ❌ **1.6.3**: Manejar casos de anexos expirados
- ❌ **1.6.4**: Validar conflictos de vigencia (anexos superpuestos)

#### Etapa 1.7: Flujo Mejorado de Creación
- ❌ **1.7.1**: Agregar opción "Modificar Contrato" vs "Crear Anexo"
- ❌ **1.7.2**: Agregar opción "Visualizar Anexos Existentes"
- ❌ **1.7.3**: Mejorar UX de selección inicial

---

## 📊 PROMPT 2: Sistema de Histórico de Acciones

### Estado Actual ✅
- ✅ Existen campos de auditoría en algunas tablas (created_by, created_at, etc.)
- ✅ Sistema de RLS implementado

### Estado Pendiente ❌
- ❌ No existe sistema centralizado de auditoría
- ❌ No existe tabla de eventos
- ❌ No existe servicio de logging

### Tareas Pendientes ❌

#### Etapa 2.1: Diseño y Creación de Tabla de Auditoría
- ❌ **2.1.1**: Crear migración para tabla `audit_events`
- ❌ **2.1.2**: Implementar campos según diseño del Prompt 3
- ❌ **2.1.3**: Agregar índices para performance
- ❌ **2.1.4**: Crear función de fingerprint/huella digital

#### Etapa 2.2: Servicio Centralizado de Logging
- ❌ **2.2.1**: Crear `lib/services/auditService.ts`
- ❌ **2.2.2**: Implementar función `logEvent()`
- ❌ **2.2.3**: Implementar cálculo de fingerprint
- ❌ **2.2.4**: Manejar errores sin romper flujo principal
- ❌ **2.2.5**: Obtener datos del actor (usuario) automáticamente

#### Etapa 2.3: Integración en API Routes
- ❌ **2.3.1**: Integrar logging en creación de contratos
- ❌ **2.3.2**: Integrar logging en creación/edición/emisión de anexos
- ❌ **2.3.3**: Integrar logging en vacaciones (solicitud/aprobación/rechazo)
- ❌ **2.3.4**: Integrar logging en permisos (solicitud/aprobación/rechazo)
- ❌ **2.3.5**: Integrar logging en liquidaciones (creación/edición/emisión)
- ❌ **2.3.6**: Integrar logging en pactos de horas extra
- ❌ **2.3.7**: Integrar logging en cambios de ficha del trabajador
- ❌ **2.3.8**: Integrar logging en anticipos
- ❌ **2.3.9**: Integrar logging en préstamos
- ❌ **2.3.10**: Integrar logging en cumplimientos/vencimientos
- ❌ **2.3.11**: Integrar logging en RAAT, amonestaciones, finiquitos

#### Etapa 2.4: Políticas RLS para Auditoría
- ❌ **2.4.1**: Crear migración de RLS para `audit_events`
- ❌ **2.4.2**: Admin puede leer todos los eventos de su empresa
- ❌ **2.4.3**: Trabajador solo puede leer sus propios eventos
- ❌ **2.4.4**: Implementar función helper para verificar permisos

#### Etapa 2.5: APIs de Consulta
- ❌ **2.5.1**: Crear `/api/employees/[id]/audit-events` (admin)
- ❌ **2.5.2**: Crear `/api/employee/audit-events` (portal trabajador)
- ❌ **2.5.3**: Implementar filtros (fecha, módulo, tipo, usuario, status)
- ❌ **2.5.4**: Implementar paginación

#### Etapa 2.6: UI - Pestaña Histórico en Ficha Trabajador
- ❌ **2.6.1**: Crear componente `AuditHistoryTab.tsx`
- ❌ **2.6.2**: Implementar vista timeline/tabla
- ❌ **2.6.3**: Implementar filtros en UI
- ❌ **2.6.4**: Implementar modal "Ver detalle" con before/after/diff
- ❌ **2.6.5**: Agregar links a entidades relacionadas
- ❌ **2.6.6**: Integrar en `/employees/[id]` como nueva pestaña

#### Etapa 2.7: Casos Especiales
- ❌ **2.7.1**: Manejar acciones automáticas (cron) con source="cron"
- ❌ **2.7.2**: Manejar errores (status="error" con entity_id=null)
- ❌ **2.7.3**: Manejar eventos masivos (batch_id en metadata)

---

## 🔧 PROMPT 3: Diseño Técnico de Auditoría (Complementa Prompt 2)

### Tareas Pendientes ❌

#### Etapa 3.1: Estructura de Tabla `audit_events`
- ❌ **3.1.1**: Definir schema completo según Prompt 3
- ❌ **3.1.2**: Campos: id, company_id, employee_id, actor_user_id, actor_name, actor_email, actor_role, source, action_type, module, entity_type, entity_id, status, happened_at, ip, user_agent, fingerprint, before, after, diff, metadata
- ❌ **3.1.3**: Tipos TypeScript para audit_events

#### Etapa 3.2: Fingerprint/Huella Digital
- ❌ **3.2.1**: Implementar función de cálculo de hash SHA-256
- ❌ **3.2.2**: Formato: sha256(company_id + employee_id + action_type + entity_id + happened_at + JSON.stringify(after|metadata))
- ❌ **3.2.3**: Validación de integridad (opcional, para futuro)

#### Etapa 3.3: Servicio `logEvent()`
- ❌ **3.3.1**: Obtener actor_user_id desde sesión
- ❌ **3.3.2**: Resolver company_id y snapshot de actor
- ❌ **3.3.3**: Calcular fingerprint
- ❌ **3.3.4**: Insertar en audit_events
- ❌ **3.3.5**: Manejar errores sin interrumpir operación principal
- ❌ **3.3.6**: Logging a consola si falla

#### Etapa 3.4: Convenciones de `action_type` y `module`
- ❌ **3.4.1**: Definir convención de nombres (ej: "contract.created", "annex.issued")
- ❌ **3.4.2**: Documentar todos los módulos posibles
- ❌ **3.4.3**: Crear tipos TypeScript para action_type y module

---

## 🚀 ORDEN DE EJECUCIÓN RECOMENDADO

1. **FASE 1 - Fundación**: Prompt 3 (Diseño técnico) + Prompt 2 Etapa 2.1 y 2.2
   - Crear tabla audit_events
   - Crear servicio de logging básico
   - Esto permite comenzar a registrar eventos inmediatamente

2. **FASE 2 - Integración Inicial**: Prompt 2 Etapa 2.3 (parcial)
   - Integrar logging en operaciones críticas (contratos, anexos, liquidaciones)
   - Esto genera datos de prueba mientras se desarrolla el resto

3. **FASE 3 - Mejora de Anexos**: Prompt 1 (todas las etapas)
   - Mejorar lógica de creación de anexos
   - Integrar logging durante el desarrollo

4. **FASE 4 - Completar Auditoría**: Prompt 2 (resto de etapas)
   - Integrar logging en todos los módulos restantes
   - Crear UI de histórico
   - Crear APIs de consulta

---

## 📝 NOTAS IMPORTANTES

- El sistema de auditoría debe ser **append-only** (nunca editar ni eliminar)
- Si el logging falla, NO debe interrumpir la operación principal
- El fingerprint es para integridad futura, no crítico para funcionalidad inicial
- Los eventos deben respetar RLS estricto (trabajadores solo ven sus eventos)
- Considerar performance: índices adecuados, posible archivado histórico en futuro





