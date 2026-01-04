# Ejemplos de Implementación - Servicios de Validación

Este documento muestra ejemplos prácticos de cómo integrar los servicios de validación en diferentes partes del sistema.

## 1. En API Routes

### Ejemplo: Crear Permiso (ya implementado)

```typescript
// app/api/permissions/route.ts
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'

export async function POST(request: NextRequest) {
  const supabase = await createServerClientForAPI(request)
  const body = await request.json()
  
  // Validar antes de crear
  if (body.employee_id) {
    const { employee } = createValidationServices(supabase)
    const validation = await employee.canCreatePermission(body.employee_id)
    
    const errorResponse = handleValidationError(validation)
    if (errorResponse) return errorResponse
  }
  
  // Continuar con la creación...
}
```

### Ejemplo: Crear Contrato

```typescript
// app/api/contracts/route.ts (si existe o crear)
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'

export async function POST(request: NextRequest) {
  const supabase = await createServerClientForAPI(request)
  const body = await request.json()
  
  const { contract } = createValidationServices(supabase)
  
  // Validar creación de contrato
  const validation = await contract.canCreateContract(body.employee_id)
  
  const errorResponse = handleValidationError(validation)
  if (errorResponse) return errorResponse
  
  // Crear contrato...
}
```

### Ejemplo: Crear Préstamo

```typescript
// app/api/loans/route.ts
import { createValidationServices, handleValidationError } from '@/lib/services/validationHelpers'

export async function POST(request: NextRequest) {
  const supabase = await createServerClientForAPI(request)
  const body = await request.json()
  
  const { employee } = createValidationServices(supabase)
  
  // Validar creación de préstamo
  const validation = await employee.canCreateLoan(body.employee_id)
  
  const errorResponse = handleValidationError(validation)
  if (errorResponse) return errorResponse
  
  // Crear préstamo...
}
```

## 2. En Páginas del Servidor (Server Components)

### Ejemplo: Página de Crear Contrato

```typescript
// app/contracts/new/page.tsx
import { createValidationServices } from '@/lib/services/validationHelpers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NewContractPage({ 
  searchParams 
}: { 
  searchParams: { employeeId?: string } 
}) {
  const supabase = createClient()
  const { contract } = createValidationServices(supabase)
  
  if (searchParams.employeeId) {
    const validation = await contract.canCreateContract(searchParams.employeeId)
    
    if (!validation.allowed) {
      return (
        <div className="error-message">
          <h2>No se puede crear el contrato</h2>
          <p>{validation.message}</p>
          {validation.details?.suggestion === 'create_annex' && (
            <a href={`/contracts/annex/new?employeeId=${searchParams.employeeId}`}>
              Crear anexo en su lugar
            </a>
          )}
        </div>
      )
    }
  }
  
  // Renderizar formulario...
}
```

## 3. En Componentes Cliente (Client Components)

### Ejemplo: Validación antes de enviar formulario

```typescript
// app/contracts/new/page.tsx (client component)
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createValidationServices } from '@/lib/services/validationHelpers'

export default function NewContractForm() {
  const [employeeId, setEmployeeId] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  
  const handleEmployeeChange = async (newEmployeeId: string) => {
    setEmployeeId(newEmployeeId)
    
    if (!newEmployeeId) {
      setValidationError(null)
      return
    }
    
    // Validar en el cliente antes de enviar
    const { contract } = createValidationServices(supabase)
    const validation = await contract.canCreateContract(newEmployeeId)
    
    if (!validation.allowed) {
      setValidationError(validation.message)
    } else {
      setValidationError(null)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validationError) {
      alert(validationError)
      return
    }
    
    // Enviar formulario...
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Campos del formulario */}
      {validationError && (
        <div className="error">{validationError}</div>
      )}
    </form>
  )
}
```

## 4. En Servicios

### Ejemplo: Servicio de Liquidaciones

```typescript
// lib/services/payrollService.ts
import { EmployeeEligibilityService } from './employeeEligibilityService'
import { throwIfNotAllowed } from './validationHelpers'

export async function createPayroll(
  employeeId: string,
  periodId: string,
  supabase: SupabaseClient<Database>
) {
  // Validar que el empleado pueda recibir liquidación
  const eligibility = new EmployeeEligibilityService(supabase)
  const validation = await eligibility.canOperateContractDependentModule(
    employeeId,
    'Liquidaciones de sueldo'
  )
  
  throwIfNotAllowed(validation)
  
  // Crear liquidación...
}
```

## 5. Manejo de Errores Personalizado

### Ejemplo: Con mensajes personalizados

```typescript
import { createValidationServices, getValidationErrorMessage } from '@/lib/services/validationHelpers'

export async function createSomething(employeeId: string) {
  const { employee } = createValidationServices(supabase)
  const validation = await employee.canCreateLoan(employeeId)
  
  if (!validation.allowed) {
    const userMessage = getValidationErrorMessage(validation)
    
    // Mostrar mensaje amigable al usuario
    toast.error(userMessage)
    
    // O redirigir según el código
    if (validation.code === 'EMPLOYEE_NO_ACTIVE_CONTRACT') {
      router.push(`/contracts/new?employeeId=${employeeId}`)
      return
    }
    
    throw new Error(validation.message)
  }
  
  // Continuar...
}
```

## 6. Validaciones Múltiples

### Ejemplo: Validar múltiples condiciones

```typescript
import { validateAll } from '@/lib/services/validationHelpers'

export async function complexOperation(employeeId: string) {
  const { employee, contract } = createValidationServices(supabase)
  
  // Validar múltiples condiciones
  const validation = await validateAll([
    employee.isEmployeeActive(employeeId),
    employee.canOperateContractDependentModule(employeeId, 'Liquidaciones'),
    contract.canModifyContract(employeeId, contractId)
  ])
  
  if (!validation.allowed) {
    throw new Error(validation.message)
  }
  
  // Continuar...
}
```

## 7. Integración en Formularios Existentes

### Ejemplo: Actualizar página de crear contrato existente

```typescript
// app/contracts/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createValidationServices } from '@/lib/services/validationHelpers'

export default function NewContractPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [canCreate, setCanCreate] = useState(true)
  const [validationMessage, setValidationMessage] = useState('')
  const [suggestion, setSuggestion] = useState<string | null>(null)
  
  useEffect(() => {
    if (!employeeId) {
      setCanCreate(true)
      return
    }
    
    const validate = async () => {
      const { contract } = createValidationServices(supabase)
      const validation = await contract.canCreateContract(employeeId)
      
      setCanCreate(validation.allowed)
      setValidationMessage(validation.message)
      setSuggestion(validation.details?.suggestion || null)
    }
    
    validate()
  }, [employeeId])
  
  return (
    <div>
      {/* Selector de empleado */}
      <select 
        value={employeeId} 
        onChange={(e) => setEmployeeId(e.target.value)}
      >
        {/* Opciones */}
      </select>
      
      {/* Mensaje de validación */}
      {!canCreate && (
        <div className="alert alert-warning">
          <p>{validationMessage}</p>
          {suggestion === 'create_annex' && (
            <a href={`/contracts/annex/new?employeeId=${employeeId}`}>
              Crear anexo en su lugar
            </a>
          )}
        </div>
      )}
      
      {/* Formulario deshabilitado si no puede crear */}
      <form>
        {/* Campos */}
        <button type="submit" disabled={!canCreate}>
          Crear Contrato
        </button>
      </form>
    </div>
  )
}
```

## Notas Importantes

1. **Siempre validar en el backend**: Las validaciones en el cliente son para UX, pero el backend debe validar siempre.

2. **Mensajes descriptivos**: Los servicios retornan mensajes claros que se pueden mostrar directamente al usuario.

3. **Sugerencias**: Muchas validaciones incluyen `suggestion` en `details` para guiar al usuario.

4. **Códigos de error**: Usa los códigos para manejar casos específicos en el frontend.

5. **Performance**: Las validaciones son asíncronas y hacen consultas a la BD. Considera caché si es necesario.


