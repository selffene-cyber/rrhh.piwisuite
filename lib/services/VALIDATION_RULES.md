# Reglas de Validación de Negocio - Sistema RRHH

Este documento describe todas las reglas de negocio implementadas en los servicios de validación.

## Servicios Disponibles

### 1. EmployeeEligibilityService
Valida la elegibilidad de empleados para diferentes operaciones.

### 2. ContractValidationService
Valida operaciones relacionadas con contratos y anexos.

## Reglas Implementadas

### 1. Gestión de Contratos

#### 1.1 Creación de Contrato
**Servicio:** `ContractValidationService.canCreateContract()`

**Regla:**
- ✅ Se permite crear contrato SOLO si:
  - `employee.status = 'active'`
  - NO existe contrato con `status = 'active'`

**Código de error:** `EMPLOYEE_HAS_ACTIVE_CONTRACT`
**Mensaje:** "El trabajador ya posee un contrato activo. Para realizar modificaciones, debe crear un anexo al contrato existente."

#### 1.2 Terminación de Contrato
**Servicio:** `ContractValidationService.canTerminateContract()`

**Regla:**
- ✅ El contrato debe estar `status = 'active'`
- ✅ El empleado debe estar `status = 'active'`

**Código de error:** `CONTRACT_INVALID_STATUS`

#### 1.3 Nuevo Contrato Después de Terminación
**Servicio:** `ContractValidationService.canCreateContractAfterTermination()`

**Regla:**
- ✅ Debe existir finiquito con `status = 'approved'`
- ✅ NO debe existir contrato activo

**Código de error:** `CONTRACT_SETTLEMENT_REQUIRED`

#### 1.4 Modificación de Contrato
**Servicio:** `ContractValidationService.canModifyContract()`

**Regla:**
- ❌ NO se permite si `medical_leaves.is_active = true`
- ✅ Se permite ver y generar documentos

**Código de error:** `EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE`

### 2. Gestión de Anexos

#### 2.1 Creación de Anexo
**Servicio:** `ContractValidationService.canCreateAnnex()`

**Regla:**
- ✅ Requiere:
  - Contrato con `status = 'active'`
  - `employee.status = 'active'`
  - `medical_leaves.is_active = false`

**Código de error:** `ANNEX_REQUIRES_ACTIVE_CONTRACT` o `EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE`

#### 2.2 Anexo sobre Contrato Específico
**Servicio:** `ContractValidationService.canCreateAnnexForContract()`

**Regla:**
- ❌ NO se pueden crear anexos sobre contratos:
  - `terminated`
  - `cancelled`
  - `draft`

**Código de error:** `ANNEX_CONTRACT_INVALID_STATUS`

### 3. Módulos Dependientes de Contrato

Los siguientes módulos REQUIEREN contrato activo:

- Liquidaciones de sueldo
- Anticipos
- Amonestaciones
- Certificados laborales
- Pactos de horas extraordinarias
- Vacaciones

**Servicio:** `EmployeeEligibilityService.canOperateContractDependentModule()`

**Código de error:** `EMPLOYEE_NO_ACTIVE_CONTRACT`
**Mensaje:** "El trabajador no posee un contrato activo."

### 4. Reglas Específicas

#### 4.1 Préstamos
**Servicio:** `EmployeeEligibilityService.canCreateLoan()`

**Regla:**
- ✅ Requiere:
  - Contrato con `status = 'active'`
  - `contract.contract_type = 'indefinido'`

**Código de error:** `LOAN_REQUIRES_INDEFINIDO_CONTRACT`

#### 4.2 Permisos Laborales
**Servicio:** `EmployeeEligibilityService.canCreatePermission()`

**Regla:**
- ✅ Requiere:
  - Contrato con `status = 'active'`
  - NO debe existir permiso vigente (solapado en fechas)

**Código de error:** `PERMISSION_ALREADY_ACTIVE`

## Códigos de Validación

Todos los códigos están definidos en `validationTypes.ts`:

```typescript
EMPLOYEE_NOT_ACTIVE
EMPLOYEE_INACTIVE
EMPLOYEE_HAS_ACTIVE_CONTRACT
EMPLOYEE_NO_ACTIVE_CONTRACT
EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE
CONTRACT_ALREADY_ACTIVE
CONTRACT_NOT_ACTIVE
CONTRACT_INVALID_STATUS
CONTRACT_TERMINATION_REQUIRED
CONTRACT_SETTLEMENT_REQUIRED
ANNEX_REQUIRES_ACTIVE_CONTRACT
ANNEX_CONTRACT_INVALID_STATUS
LOAN_REQUIRES_INDEFINIDO_CONTRACT
PERMISSION_ALREADY_ACTIVE
OPERATION_ALLOWED
```

## Ejemplos de Uso

### En API Routes

```typescript
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { employeeId } = await request.json()
  
  const { employee, contract } = createValidationServices(supabase)
  
  // Validar creación de contrato
  const validation = await contract.canCreateContract(employeeId)
  
  const errorResponse = handleValidationError(validation)
  if (errorResponse) return errorResponse
  
  // Continuar con la creación...
}
```

### En Componentes del Servidor

```typescript
import { createValidationServices } from '@/lib/services/validationHelpers'
import { createClient } from '@/lib/supabase/server'

export default async function Page({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { employee, contract } = createValidationServices(supabase)
  
  const validation = await employee.canCreateLoan(params.id)
  
  if (!validation.allowed) {
    return <div>Error: {validation.message}</div>
  }
  
  // Renderizar formulario...
}
```

### En Servicios

```typescript
import { EmployeeEligibilityService } from '@/lib/services/employeeEligibilityService'
import { throwIfNotAllowed } from '@/lib/services/validationHelpers'

export async function createLoan(
  employeeId: string,
  amount: number,
  supabase: SupabaseClient<Database>
) {
  const eligibility = new EmployeeEligibilityService(supabase)
  
  const validation = await eligibility.canCreateLoan(employeeId)
  throwIfNotAllowed(validation)
  
  // Crear préstamo...
}
```

## Árbol de Decisión

### Crear Contrato
```
¿Empleado activo?
├─ NO → Error: EMPLOYEE_NOT_ACTIVE
└─ SÍ → ¿Tiene contrato activo?
    ├─ SÍ → Error: EMPLOYEE_HAS_ACTIVE_CONTRACT (sugerir anexo)
    └─ NO → ✅ Permitir creación
```

### Crear Anexo
```
¿Empleado activo?
├─ NO → Error: EMPLOYEE_NOT_ACTIVE
└─ SÍ → ¿Tiene contrato activo?
    ├─ NO → Error: EMPLOYEE_NO_ACTIVE_CONTRACT
    └─ SÍ → ¿Tiene licencia médica activa?
        ├─ SÍ → Error: EMPLOYEE_HAS_ACTIVE_MEDICAL_LEAVE
        └─ NO → ✅ Permitir creación
```

### Crear Préstamo
```
¿Empleado activo?
├─ NO → Error: EMPLOYEE_NOT_ACTIVE
└─ SÍ → ¿Tiene contrato activo?
    ├─ NO → Error: EMPLOYEE_NO_ACTIVE_CONTRACT
    └─ SÍ → ¿Tipo de contrato = 'indefinido'?
        ├─ NO → Error: LOAN_REQUIRES_INDEFINIDO_CONTRACT
        └─ SÍ → ✅ Permitir creación
```

## Notas de Implementación

1. **Todas las validaciones son asíncronas** porque requieren consultas a la base de datos
2. **Las validaciones son reutilizables** entre API Routes, Server Components y servicios
3. **Los mensajes de error son descriptivos** e incluyen sugerencias cuando aplica
4. **Los códigos de error son consistentes** para facilitar el manejo en el frontend
5. **Las validaciones incluyen detalles** (como IDs de contratos) para facilitar la navegación


