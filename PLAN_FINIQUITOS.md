# Plan de Implementación: Módulo de Finiquitos

## 📋 Resumen Ejecutivo

Implementación completa del módulo de Finiquitos conforme a Código del Trabajo chileno, con cálculo automático, auditoría completa y generación de PDF legal.

---

## 🔍 Análisis de Integración con Sistema Existente

### Datos Necesarios del Sistema:

1. **Del Trabajador (employees)**:
   - `hire_date`: Fecha de ingreso (para calcular años de servicio)
   - `base_salary`: Último sueldo base mensual
   - `company_id`: Para filtrado multi-tenant

2. **Del Contrato Activo (contracts)**:
   - `start_date`: Fecha inicio contrato (puede diferir de hire_date)
   - `base_salary`: Sueldo base del contrato
   - `contract_type`: Tipo de contrato (para validaciones)

3. **Vacaciones Pendientes (vacations + vacation_periods)**:
   - Usar `getVacationSummary()` existente
   - Obtener `totalAvailable` (días disponibles)

4. **Préstamos Pendientes (loans)**:
   - Sumar `remaining_amount` de préstamos con `status = 'active'`

5. **Anticipos Pendientes (advances)**:
   - Sumar anticipos no descontados del último período

6. **Última Liquidación (payroll_slips)**:
   - Para obtener días trabajados del último mes
   - Para obtener sueldo líquido mensual

---

## 🏗️ Fase 1: Estructura de Base de Datos

### 1.1 Tabla `settlement_causes` (Maestro de Causales)

```sql
CREATE TABLE settlement_causes (
  code VARCHAR(20) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  article VARCHAR(50), -- "art.159", "art.161"
  has_ias BOOLEAN DEFAULT false, -- Indemnización años de servicio
  has_iap BOOLEAN DEFAULT false, -- Indemnización aviso previo
  is_termination BOOLEAN DEFAULT true, -- Si es causal de término
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Causales a insertar:**
- 159_1: Mutuo acuerdo (IAS: false, IAP: false)
- 159_2: Renuncia voluntaria (IAS: false, IAP: false)
- 159_3: Muerte trabajador (IAS: false, IAP: false)
- 159_4: Vencimiento plazo fijo (IAS: false, IAP: false)
- 159_5: Conclusión obra/faena (IAS: false, IAP: false)
- 159_6: Caso fortuito (IAS: false, IAP: false)
- 160: Despido disciplinario (IAS: false, IAP: false)
- 161_1: Necesidades empresa (IAS: true, IAP: true)
- 161_2: Desahucio empleador (IAS: true, IAP: true)
- 163bis: Liquidación concursal (IAS: true, IAP: false)

### 1.2 Tabla `settlements` (Finiquitos)

```sql
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_number VARCHAR(20) UNIQUE, -- FIN-01, FIN-02
  
  -- Relaciones
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  contract_id UUID REFERENCES contracts(id), -- Contrato activo al momento del término
  
  -- Datos del finiquito
  termination_date DATE NOT NULL,
  cause_code VARCHAR(20) REFERENCES settlement_causes(code) NOT NULL,
  
  -- Cálculos base
  contract_start_date DATE NOT NULL, -- Fecha inicio contrato (snapshot)
  last_salary_monthly DECIMAL(12, 2) NOT NULL, -- Último sueldo mensual (snapshot)
  worked_days_last_month INTEGER NOT NULL, -- Días trabajados último mes
  service_days INTEGER NOT NULL, -- Días totales de servicio
  service_years_raw NUMERIC(10, 4) NOT NULL, -- Años de servicio (con decimales)
  service_years_effective INTEGER NOT NULL, -- Años efectivos (redondeo especial)
  service_years_capped INTEGER NOT NULL, -- Máximo 11 años
  
  -- Vacaciones
  vacation_days_pending NUMERIC(10, 2) NOT NULL DEFAULT 0,
  
  -- Aviso previo
  notice_given BOOLEAN DEFAULT false,
  notice_days INTEGER DEFAULT 0,
  
  -- Totales calculados
  salary_balance DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Sueldo proporcional último mes
  vacation_payout DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Pago vacaciones
  ias_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Indemnización años servicio
  iap_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Indemnización aviso previo
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Total haberes
  loan_balance DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Saldo préstamos
  advance_balance DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Saldo anticipos
  total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Total descuentos
  net_to_pay DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Líquido a pagar
  
  -- Estado y workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'signed', 'paid', 'void')),
  
  -- Auditoría y versionamiento
  calculation_version INTEGER DEFAULT 1, -- Versión del cálculo (incrementa en recálculos)
  calculation_snapshot JSONB, -- Snapshot completo de variables y resultados
  calculation_log JSONB, -- Log de cambios y recálculos
  
  -- Fechas de workflow
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  voided_at TIMESTAMP WITH TIME ZONE,
  
  -- Usuarios
  created_by UUID, -- user_id
  reviewed_by UUID,
  approved_by UUID,
  
  -- Notas
  notes TEXT,
  void_reason TEXT,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.3 Tabla `settlement_items` (Detalle de Pagos y Descuentos)

```sql
CREATE TABLE settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE NOT NULL,
  
  type VARCHAR(50) NOT NULL CHECK (type IN ('earning', 'deduction')),
  category VARCHAR(100) NOT NULL, -- 'salary_balance', 'vacation', 'ias', 'iap', 'loan', 'advance'
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  
  -- Metadata adicional
  metadata JSONB, -- Datos adicionales según categoría
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.4 Índices y Secuencias

```sql
-- Secuencia para números correlativos
CREATE SEQUENCE IF NOT EXISTS settlements_number_seq START 1;

-- Función para asignar número correlativo
CREATE OR REPLACE FUNCTION set_settlement_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.settlement_number IS NULL THEN
    NEW.settlement_number := 'FIN-' || LPAD(NEXTVAL('settlements_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_settlement_number_trigger
BEFORE INSERT ON settlements
FOR EACH ROW
EXECUTE FUNCTION set_settlement_number();

-- Índices
CREATE INDEX idx_settlements_employee ON settlements(employee_id);
CREATE INDEX idx_settlements_company ON settlements(company_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_termination_date ON settlements(termination_date);
CREATE INDEX idx_settlement_items_settlement ON settlement_items(settlement_id);
```

---

## 🧮 Fase 2: Servicio de Cálculo (`settlementCalculator.ts`)

### 2.1 Funciones Principales:

1. **`calculateServiceTime()`**: Calcula años de servicio con lógica especial
2. **`calculateSettlement()`**: Función principal que calcula todo el finiquito
3. **`validateSettlementInput()`**: Valida inputs antes de calcular
4. **`calculateIAS()`**: Calcula indemnización por años de servicio
5. **`calculateIAP()`**: Calcula indemnización por aviso previo

### 2.2 Lógica de Cálculo de Años de Servicio:

```typescript
// service_days = termination_date - contract_start_date
// service_years_raw = service_days / 365
// service_years_floor = floor(service_years_raw)
// service_months_fraction = (service_days % 365) / 30
// service_years_effective = service_years_floor + (service_months_fraction > 6 ? 1 : 0)
// service_years_capped = min(11, service_years_effective)
```

### 2.3 Fórmulas:

```typescript
salary_balance = (last_salary_monthly / 30) * worked_days_last_month
vacation_payout = (last_salary_monthly / 30) * vacation_days_pending
IAS = service_years_capped * last_salary_monthly (si cause.has_ias)
IAP = notice_given == false ? last_salary_monthly : 0 (si cause.has_iap)
total_earnings = salary_balance + vacation_payout + IAS + IAP
total_deductions = loan_balance + advance_balance
net_to_pay = total_earnings - total_deductions
```

### 2.4 Validaciones:

- `contract_start_date > termination_date` → ERROR
- `salary_base <= 0` → ERROR
- `worked_days_last_month < 0` → ERROR
- `vacation_days_pending < 0` → ERROR
- `service_years_effective < 1 AND IAS == true` → WARNING
- `vacation_days_pending > 30` → WARNING

---

## 🔧 Fase 3: Servicio de Gestión (`settlementService.ts`)

### 3.1 Funciones:

- `getSettlements(companyId, filters)`: Lista finiquitos
- `getSettlement(id)`: Obtiene finiquito con items
- `createSettlement(data)`: Crea nuevo finiquito (calcula automáticamente)
- `recalculateSettlement(id, newData)`: Recalcula finiquito (incrementa versión)
- `updateSettlementStatus(id, status, userId)`: Cambia estado
- `getEmployeeDataForSettlement(employeeId, terminationDate)`: Obtiene datos del trabajador

### 3.2 `getEmployeeDataForSettlement()`:

Debe obtener:
- Contrato activo más reciente
- Última liquidación para obtener sueldo y días trabajados
- Vacaciones pendientes (usar servicio existente)
- Préstamos activos (remaining_amount)
- Anticipos pendientes (no descontados)

---

## 🌐 Fase 4: API Routes (`/api/settlements`)

### 4.1 Endpoints:

- `GET /api/settlements`: Lista finiquitos (con filtros)
- `GET /api/settlements/[id]`: Obtiene finiquito específico
- `POST /api/settlements`: Crea nuevo finiquito
- `PUT /api/settlements/[id]`: Actualiza finiquito (recalcula si es necesario)
- `POST /api/settlements/[id]/recalculate`: Recalcula finiquito
- `POST /api/settlements/[id]/approve`: Aprueba finiquito
- `POST /api/settlements/[id]/sign`: Marca como firmado
- `POST /api/settlements/[id]/pay`: Marca como pagado
- `POST /api/settlements/[id]/void`: Anula finiquito
- `GET /api/settlements/employee/[employeeId]/data`: Obtiene datos del trabajador para finiquito

---

## 📄 Fase 5: Componente PDF (`SettlementPDF.tsx`)

### 5.1 Estructura del PDF:

1. **Encabezado**: Datos de la empresa (logo, nombre, RUT, dirección)
2. **PRIMERO**: Relación laboral
   - Datos del trabajador
   - Fechas de inicio y término
   - Causal de término
3. **SEGUNDO**: Detalle de pagos
   - Tabla con ítems de haberes (sueldo balance, vacaciones, IAS, IAP)
   - Tabla con ítems de descuentos (préstamos, anticipos)
   - Totales
4. **TERCERO**: Declaración de finiquito
   - Texto legal estándar
5. **CUARTO**: Ley 21.389 / Retenciones
   - Si aplica (IAS > 0)
6. **Firmas**: Trabajador y empleador

---

## 🎨 Fase 6: Páginas Frontend

### 6.1 `/settlements` (Lista)

- Tabla con finiquitos
- Filtros: trabajador, estado, fecha
- Acciones: Ver, Editar, Aprobar, PDF, Anular

### 6.2 `/settlements/new` (Crear)

- Paso 1: Seleccionar trabajador
- Paso 2: Ingresar datos (fecha término, causal, aviso previo)
- Paso 3: Revisar cálculo automático
- Paso 4: Guardar

### 6.3 `/settlements/[id]` (Detalle)

- Vista completa del finiquito
- Desglose de cálculos
- Historial de versiones (si se recalculó)
- Acciones según estado
- Botón para ver PDF

### 6.4 `/settlements/[id]/review` (Revisión)

- Vista optimizada para revisión
- Botones: Aprobar, Rechazar, Solicitar Correcciones

---

## 🔐 Fase 7: Permisos y RLS

### 7.1 Políticas RLS:

- Usuarios ven solo finiquitos de su empresa
- Super admin ve todos
- Solo admin/owner pueden aprobar/firmar/pagar

### 7.2 Navegación:

- Agregar "Finiquitos" al menú principal
- Agregar link desde detalle de trabajador

---

## 📊 Flujo de Trabajo

1. **Creación**: Usuario crea finiquito → Estado: `draft`
2. **Revisión**: Admin revisa → Estado: `under_review`
3. **Aprobación**: Admin aprueba → Estado: `approved`
4. **Firma**: Se firma PDF → Estado: `signed`
5. **Pago**: Se marca como pagado → Estado: `paid`
6. **Anulación**: Si se anula → Estado: `void`

---

## ✅ Checklist de Implementación

- [ ] Fase 1: Crear migraciones SQL
- [ ] Fase 2: Crear servicio de cálculo
- [ ] Fase 3: Crear servicio de gestión
- [ ] Fase 4: Crear API routes
- [ ] Fase 5: Crear componente PDF
- [ ] Fase 6: Crear páginas frontend
- [ ] Fase 7: Agregar permisos y navegación
- [ ] Testing completo
- [ ] Documentación

