# Estrategia de Gestión de Préstamos

## 📋 Resumen

Este documento describe la estrategia implementada para gestionar préstamos en el sistema, incluyendo edición, eliminación y cancelación.

## 🔒 Reglas de Negocio

### 1. **Edición de Préstamos**

**Se puede editar un préstamo SI:**
- ✅ El préstamo está en estado `active`
- ✅ No tiene pagos registrados (`loan_payments` vacío)
- ✅ No tiene cuotas pagadas (`paid_installments = 0`)
- ✅ No tiene cuotas con estado `paid` o `partial` en `loan_installments`

**Campos editables:**
- Fecha del préstamo (`loan_date`)
- Monto solicitado (`amount`)
- Tasa de interés (`interest_rate`)
- Número de cuotas (`installments`)
- Descripción (`description`)

**Campos recalculados automáticamente:**
- `total_amount` = `amount` + (`amount` × `interest_rate` / 100)
- `installment_amount` = `total_amount` / `installments`
- `remaining_amount` = `total_amount` (se reinicia al editar)

**No se puede editar SI:**
- ❌ Tiene pagos asociados
- ❌ Tiene cuotas pagadas
- ❌ Está en estado `paid` o `cancelled`

### 2. **Cancelación de Préstamos**

**Se puede cancelar un préstamo SI:**
- ✅ El préstamo está en estado `active`
- ✅ No está pagado completamente

**Efectos de la cancelación:**
- Cambia el estado a `cancelled`
- El préstamo deja de estar activo
- No se pueden agregar más pagos
- Se puede eliminar después de cancelar (si no tiene pagos)

**No se puede cancelar SI:**
- ❌ Ya está pagado (`status = 'paid'`)
- ❌ Ya está cancelado (`status = 'cancelled'`)

### 3. **Eliminación de Préstamos**

**Se puede eliminar un préstamo SI:**
- ✅ Está cancelado (`status = 'cancelled'`) Y no tiene pagos
- ✅ Está activo (`status = 'active'`) Y no tiene pagos ni cuotas pagadas

**No se puede eliminar SI:**
- ❌ Tiene pagos registrados en `loan_payments`
- ❌ Tiene cuotas pagadas (`paid_installments > 0`)
- ❌ Tiene cuotas con estado `paid` o `partial` en `loan_installments`
- ❌ Está pagado completamente

**Relaciones eliminadas en cascada:**
- `loan_payments` (ON DELETE CASCADE)
- `loan_installments` (ON DELETE CASCADE)
- `payroll_items.loan_id` (ON DELETE SET NULL)

## 🛠️ Implementación Técnica

### API Endpoints

#### `GET /api/loans/[id]`
Obtiene un préstamo con sus relaciones (pagos, cuotas, empleado).

#### `PUT /api/loans/[id]`
Actualiza un préstamo. Valida que no tenga pagos antes de permitir la edición.

#### `DELETE /api/loans/[id]`
Elimina un préstamo. Valida que no tenga pagos antes de permitir la eliminación.

#### `PATCH /api/loans/[id]`
Cancela un préstamo (con `action: 'cancel'`).

### Interfaz de Usuario

#### Página de Detalle: `/employees/[id]/loans/[loanId]`

**Botones disponibles según estado:**

1. **Editar** (solo si `canEdit()` retorna `true`)
   - Muestra formulario de edición
   - Permite modificar campos editables
   - Recalcula automáticamente totales

2. **Cancelar** (solo si `canCancel()` retorna `true`)
   - Cambia estado a `cancelled`
   - Muestra confirmación antes de cancelar

3. **Eliminar** (solo si `canDelete()` retorna `true`)
   - Elimina el préstamo permanentemente
   - Muestra confirmación antes de eliminar
   - Redirige a la lista de préstamos después de eliminar

4. **Ver PDF** (siempre disponible)
   - Genera y muestra el PDF del préstamo

**Indicadores visuales:**
- Badge de estado (Activo, Pagado, Cancelado)
- Mensaje informativo si no se puede editar
- Validaciones en tiempo real

## 📝 Flujo de Trabajo Recomendado

### Escenario 1: Error en fecha o monto (sin pagos)
1. Ir a detalle del préstamo
2. Hacer clic en "Editar"
3. Corregir los campos necesarios
4. Guardar cambios

### Escenario 2: Préstamo creado por error (sin pagos)
1. Ir a detalle del préstamo
2. Hacer clic en "Cancelar" (opcional, para mantener historial)
3. O hacer clic en "Eliminar" (elimina permanentemente)

### Escenario 3: Préstamo con pagos (no se puede editar/eliminar)
1. El sistema mostrará mensaje informativo
2. Solo se puede cancelar si está activo
3. Para corregir, crear una reliquidación o ajuste manual

## ⚠️ Consideraciones Importantes

1. **Integridad de datos:** Los préstamos con pagos no se pueden modificar para mantener la integridad contable.

2. **Auditoría:** Los préstamos cancelados se mantienen en el sistema para auditoría, pero se pueden eliminar si no tienen pagos.

3. **Liquidaciones:** Si un préstamo ya fue aplicado en una liquidación, no se puede editar ni eliminar. Se debe usar el módulo de reliquidaciones.

4. **Validaciones:** Todas las validaciones se realizan tanto en el frontend como en el backend para seguridad.

## 🔧 Script SQL para Eliminación Manual

Si necesitas eliminar un préstamo manualmente desde la base de datos, usa el script:

```sql
-- Verificar restricciones
SELECT 
  l.id,
  l.loan_number,
  l.status,
  l.paid_installments,
  (SELECT COUNT(*) FROM loan_payments WHERE loan_id = l.id) as payments_count,
  (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id AND status IN ('paid', 'partial')) as paid_installments_count
FROM loans l
WHERE l.id = 'UUID_DEL_PRESTAMO';

-- Si no tiene pagos, eliminar
DELETE FROM loans WHERE id = 'UUID_DEL_PRESTAMO';
```

## 📊 Estados del Préstamo

| Estado | Descripción | Acciones Permitidas |
|--------|-------------|---------------------|
| `active` | Préstamo activo, pendiente de pago | Editar, Cancelar, Eliminar (si no tiene pagos) |
| `paid` | Préstamo completamente pagado | Ninguna (solo visualización) |
| `cancelled` | Préstamo cancelado | Eliminar (si no tiene pagos) |

## 🎯 Mejoras Futuras Sugeridas

1. **Historial de cambios:** Registrar quién y cuándo editó/canceló/eliminó un préstamo
2. **Notificaciones:** Notificar al trabajador cuando se cancela o modifica su préstamo
3. **Exportación:** Permitir exportar historial de préstamos
4. **Búsqueda avanzada:** Filtrar por estado, fecha, monto, etc.
