# 🔧 Fix: Correlativos de Contratos por Empresa y Eliminación Real

## 🎯 Problemas Identificados

### 1. **Correlativo Global (CT-##)**
```
❌ PROBLEMA ANTERIOR:
Empresa A crea CT-01
Empresa B crea CT-02  ← Debería ser CT-01 para Empresa B
Empresa A crea CT-03  ← Debería ser CT-02 para Empresa A
```

**Causa**: Secuencia global `contracts_number_seq` compartida por todas las empresas.

### 2. **Eliminar Solo Cancela**
```
❌ PROBLEMA ANTERIOR:
Click en "Eliminar" → status = 'cancelled'
El contrato sigue en la tabla
Aparece en la lista como "Cancelado"
```

**Causa**: El código hacía `UPDATE` en lugar de `DELETE`.

---

## ✅ Soluciones Implementadas

### 1. **Correlativo por Empresa**

#### Antes:
```sql
-- Secuencia global (MAL)
CREATE SEQUENCE contracts_number_seq START 1;

-- Función que usa la secuencia global
CREATE FUNCTION set_contract_number() AS $$
BEGIN
  NEW.contract_number := 'CT-' || NEXTVAL('contracts_number_seq');
  RETURN NEW;
END;
$$;
```

#### Después:
```sql
-- SIN secuencia global

-- Función que cuenta por empresa (BIEN)
CREATE FUNCTION set_contract_number() AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Obtener el máximo número de esta empresa
  SELECT COALESCE(MAX(numero_extraido), 0) + 1
  INTO next_number
  FROM contracts
  WHERE company_id = NEW.company_id;
  
  NEW.contract_number := 'CT-' || LPAD(next_number::TEXT, 2, '0');
  RETURN NEW;
END;
$$;
```

#### Resultado:
```
✅ Empresa A: CT-01, CT-02, CT-03...
✅ Empresa B: CT-01, CT-02, CT-03...
✅ Empresa C: CT-01, CT-02, CT-03...
```

---

### 2. **Eliminación Real**

#### Antes:
```typescript
// Solo marcaba como cancelled (MAL)
await supabase
  .from('contracts')
  .update({ status: 'cancelled' })
  .eq('id', id)
```

#### Después:
```typescript
// Elimina físicamente (BIEN)
await supabase
  .from('contracts')
  .delete()
  .eq('id', id)
```

#### Confirmación:
```
⚠️ ¿Estás seguro de ELIMINAR PERMANENTEMENTE este contrato?

Esta acción NO se puede deshacer.

Si solo quieres desactivarlo, usa la opción "Cancelar" 
en lugar de "Eliminar".
```

---

## 🗄️ Cambios en Base de Datos

### Migración 093: `fix_contract_number_by_company.sql`

#### Cambios principales:

1. **Eliminar secuencias globales**:
```sql
DROP SEQUENCE contracts_number_seq;
DROP SEQUENCE contract_annexes_number_seq;
```

2. **Nueva función set_contract_number()**:
```sql
-- Cuenta solo los contratos de la misma empresa
SELECT MAX(numero) + 1
FROM contracts
WHERE company_id = NEW.company_id;
```

3. **Constraint UNIQUE compuesto**:
```sql
-- Antes: UNIQUE (contract_number) → Global
ALTER TABLE contracts DROP CONSTRAINT contracts_contract_number_key;

-- Después: UNIQUE (company_id, contract_number) → Por empresa
ALTER TABLE contracts 
ADD CONSTRAINT contracts_company_number_unique 
UNIQUE (company_id, contract_number);
```

#### ¿Qué pasa con los contratos existentes?
```
✅ Se mantienen sus números actuales
✅ No se renumeran
✅ Solo los NUEVOS usan la lógica por empresa
```

---

## 📋 Ejemplos Prácticos

### Caso 1: Múltiples Empresas

#### Situación Actual (Antes de la migración):
```sql
SELECT contract_number, company_id, created_at
FROM contracts
ORDER BY created_at;

-- Resultado:
contract_number | company_id       | empresa
----------------|------------------|------------------
CT-01           | uuid-empresa-A   | HLMS Soluciones
CT-02           | uuid-empresa-B   | Otra Empresa
CT-03           | uuid-empresa-A   | HLMS Soluciones  ← Debería ser CT-02
CT-04           | uuid-empresa-A   | HLMS Soluciones  ← Debería ser CT-03
```

#### Después de la Migración (Nuevos contratos):
```sql
-- Empresa A crea contrato
INSERT INTO contracts (company_id, ...) VALUES ('uuid-empresa-A', ...);
-- → contract_number = 'CT-04' (cuenta los de Empresa A: 01, 03, 04 → siguiente 04)

-- Empresa B crea contrato
INSERT INTO contracts (company_id, ...) VALUES ('uuid-empresa-B', ...);
-- → contract_number = 'CT-02' (cuenta los de Empresa B: 02 → siguiente 02)

-- Empresa C (nueva) crea su primer contrato
INSERT INTO contracts (company_id, ...) VALUES ('uuid-empresa-C', ...);
-- → contract_number = 'CT-01' (no tiene contratos → empieza en 01)
```

---

### Caso 2: Eliminar vs Cancelar

#### Escenario: Contrato creado por error

**Opción A: Cancelar** (mantener historial)
```typescript
// Marcar como cancelled manualmente
await supabase
  .from('contracts')
  .update({ status: 'cancelled' })
  .eq('id', contractId)

// ✅ El contrato sigue existiendo
// ✅ Aparece en reportes históricos
// ✅ Se puede reactivar
```

**Opción B: Eliminar** (borrar permanentemente)
```typescript
// Usar el botón "Eliminar"
await supabase
  .from('contracts')
  .delete()
  .eq('id', contractId)

// ❌ El contrato se borra de la BD
// ❌ NO aparece en reportes
// ❌ NO se puede recuperar
```

#### ¿Cuándo usar cada uno?

| Acción | Cuándo Usar | Ejemplo |
|--------|-------------|---------|
| **Cancelar** | Contrato válido que se termina | Empleado renuncia |
| **Eliminar** | Error al crear, duplicado, prueba | Creaste CT-18 por error |

---

## 🚀 Pasos para Aplicar

### 1. **Ejecutar Migración 093**

```bash
# Via Supabase CLI
supabase db push

# O via Dashboard → SQL Editor
# Copiar y ejecutar: supabase/migrations/093_fix_contract_number_by_company.sql
```

### 2. **Verificar Resultado**

```sql
-- Ver función actualizada
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'set_contract_number';

-- Ver constraint nuevo
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'contracts'::regclass 
AND conname LIKE '%number%';

-- Resultado esperado:
-- conname: contracts_company_number_unique
-- contype: u (UNIQUE)
```

### 3. **Probar en la Aplicación**

#### Test 1: Crear Contrato
```
1. Ir a http://localhost:3007/contracts/new
2. Crear un contrato
3. Verificar que el número sea correlativo por empresa
```

#### Test 2: Eliminar Contrato
```
1. Ir a http://localhost:3007/contracts
2. Click en 🗑️ (Eliminar)
3. Confirmar la alerta
4. Verificar que el contrato desaparece de la lista
5. Verificar en BD que fue eliminado físicamente
```

---

## 🧪 Verificación en Base de Datos

### Script de Verificación:

```sql
-- 1. Ver contratos por empresa
SELECT 
  c.contract_number,
  co.name as empresa,
  c.company_id,
  c.status,
  c.created_at
FROM contracts c
JOIN companies co ON co.id = c.company_id
ORDER BY c.company_id, c.created_at;

-- 2. Verificar constraint UNIQUE
SELECT 
  conname as constraint_name,
  CASE contype
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'p' THEN 'PRIMARY KEY'
  END as constraint_type
FROM pg_constraint
WHERE conrelid = 'contracts'::regclass
AND conname LIKE '%number%';

-- Resultado esperado:
-- contracts_company_number_unique | UNIQUE

-- 3. Contar contratos por empresa
SELECT 
  co.name as empresa,
  COUNT(*) as total_contratos,
  MAX(c.contract_number) as ultimo_numero
FROM contracts c
JOIN companies co ON co.id = c.company_id
GROUP BY co.name
ORDER BY co.name;
```

---

## 📊 Casos de Prueba

### Test Case 1: Nueva Empresa

```sql
-- Empresa nueva sin contratos
-- Primer contrato debe ser CT-01

INSERT INTO contracts (
  company_id, 
  employee_id, 
  contract_type,
  start_date,
  position,
  base_salary,
  status
) VALUES (
  'uuid-empresa-nueva',
  'uuid-empleado',
  'indefinido',
  '2025-01-10',
  'Desarrollador',
  1500000,
  'draft'
);

-- Verificar:
SELECT contract_number FROM contracts 
WHERE company_id = 'uuid-empresa-nueva';

-- Resultado esperado: CT-01
```

### Test Case 2: Empresa con Contratos Existentes

```sql
-- Empresa con CT-01, CT-03, CT-05 (números salteados)
-- Siguiente contrato debe ser CT-06

-- Verificar máximo actual:
SELECT MAX(
  CAST(SUBSTRING(contract_number FROM 4) AS INTEGER)
) as max_number
FROM contracts
WHERE company_id = 'uuid-empresa-existente';

-- Resultado: 5 (de CT-05)
-- Siguiente será: 6 (CT-06)
```

### Test Case 3: Eliminación Física

```sql
-- Antes de eliminar
SELECT COUNT(*) FROM contracts WHERE id = 'uuid-contrato-test';
-- Resultado: 1

-- Eliminar desde la app (botón 🗑️)

-- Después de eliminar
SELECT COUNT(*) FROM contracts WHERE id = 'uuid-contrato-test';
-- Resultado: 0 (eliminado físicamente)
```

---

## ⚠️ Consideraciones Importantes

### 1. **Números Saltados**
```
Si eliminas CT-03, los siguientes contratos serán:
CT-01, CT-02, [ELIMINADO], CT-04, CT-05...

✅ Esto es correcto
✅ El correlativo no se "compacta"
✅ Evita confusiones en documentos físicos
```

### 2. **Contratos Cancelados vs Eliminados**
```
Estado "cancelled":
- Sigue en la BD
- Aparece en reportes históricos
- Se puede reactivar

Eliminado:
- NO está en la BD
- NO aparece en reportes
- NO se puede recuperar
```

### 3. **Anexos**
```
✅ La misma lógica aplica para anexos
✅ ANX-01, ANX-02, ANX-03... por empresa
✅ También se eliminan físicamente
```

---

## 🔄 Rollback (Si es necesario)

Si necesitas revertir los cambios:

```sql
-- 1. Recrear secuencias globales
CREATE SEQUENCE contracts_number_seq START 1;
CREATE SEQUENCE contract_annexes_number_seq START 1;

-- 2. Obtener el máximo actual
SELECT SETVAL('contracts_number_seq', 
  (SELECT MAX(CAST(SUBSTRING(contract_number FROM 4) AS INTEGER)) 
   FROM contracts WHERE contract_number ~ '^CT-[0-9]+$')
);

-- 3. Recrear función antigua
CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := 'CT-' || LPAD(NEXTVAL('contracts_number_seq')::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Eliminar constraint compuesto
ALTER TABLE contracts DROP CONSTRAINT contracts_company_number_unique;

-- 5. Recrear constraint global
ALTER TABLE contracts ADD CONSTRAINT contracts_contract_number_key UNIQUE (contract_number);
```

---

## 📚 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/093_fix_contract_number_by_company.sql` | ✅ Migración nueva |
| `app/contracts/page.tsx` | ✅ handleDelete → DELETE físico |

---

## 📝 Checklist de Implementación

- [ ] Ejecutar migración 093 en Supabase
- [ ] Verificar que funciones estén actualizadas
- [ ] Verificar constraint UNIQUE compuesto
- [ ] Probar crear contrato en Empresa A
- [ ] Probar crear contrato en Empresa B
- [ ] Verificar que ambas empiecen desde su último número
- [ ] Probar eliminar contrato (debe desaparecer)
- [ ] Verificar en BD que fue eliminado físicamente

---

## ✅ Resultado Final

### Antes:
```
❌ CT-01, CT-02, CT-03... global (todas las empresas)
❌ Eliminar → status = 'cancelled' (sigue en BD)
```

### Después:
```
✅ CT-01, CT-02, CT-03... por empresa
✅ Eliminar → DELETE físico (desaparece)
✅ Alerta de confirmación clara
```

---

**Fecha**: 2025-01-08  
**Migración**: 093  
**Estado**: ✅ Listo para ejecutar


