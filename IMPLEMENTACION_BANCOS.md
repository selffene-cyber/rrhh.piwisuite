# 🏦 Sistema de Gestión de Bancos - Documentación de Implementación

## 📋 Resumen Ejecutivo

Se ha implementado exitosamente un **Sistema de Gestión de Instituciones Financieras** para la Ficha del Trabajador, reemplazando el campo de texto libre `bank_name` por un selector profesional conectado a una tabla maestra en Supabase.

### ✅ Características Principales

- ✅ **Tabla maestra de bancos** en Supabase con 28 instituciones pre-cargadas
- ✅ **Retrocompatibilidad total** - trabajadores antiguos NO requieren edición
- ✅ **Selector inteligente** con búsqueda y agrupación por tipo
- ✅ **Admin puede agregar** nuevas instituciones desde la UI
- ✅ **API RESTful** para gestión de bancos
- ✅ **Script de backfill** opcional para normalizar datos históricos
- ✅ **Build exitoso** sin errores

---

## 📁 Archivos Creados

### 1. Migración de Base de Datos

```
supabase/migrations/085_add_banks_table_and_seed.sql
```

**Contenido:**
- Crea tabla `banks` con campos: `id`, `name`, `type`, `active`
- Agrega columna `bank_id` a tabla `employees` (nullable)
- Seed completo con 28 instituciones:
  - 17 Bancos
  - 4 Cooperativas
  - 7 Prepago/Fintech
- RLS (Row Level Security) configurado
- Índices para búsqueda rápida

**Ejecutar:**
```bash
npx supabase db push
```

---

### 2. Script de Backfill Opcional

```
supabase/migrations/086_backfill_employee_banks_optional.sql
```

**Contenido:**
- Función `backfill_employee_banks()` para normalizar datos históricos
- Función `preview_bank_backfill()` para previsualizar sin ejecutar
- **NO se ejecuta automáticamente**

**Uso:**
```sql
-- Previsualizar qué se creará
SELECT * FROM preview_bank_backfill();

-- Ejecutar backfill
SELECT * FROM backfill_employee_banks();

-- Ver estadísticas
SELECT 
  COUNT(*) FILTER (WHERE bank_id IS NOT NULL) as con_bank_id,
  COUNT(*) FILTER (WHERE bank_id IS NULL AND bank_name IS NOT NULL) as solo_legacy,
  COUNT(*) FILTER (WHERE bank_id IS NULL AND bank_name IS NULL) as sin_banco,
  COUNT(*) as total
FROM employees;
```

---

### 3. Helper de Retrocompatibilidad

```
lib/utils/employeeBankHelper.ts
```

**Funciones principales:**

| Función | Descripción |
|---------|-------------|
| `getEmployeeBankDisplay(employee)` | Obtiene nombre del banco (nunca null) |
| `getActiveBanks(searchQuery?)` | Lista bancos activos |
| `groupBanksByType(banks)` | Agrupa por tipo (banco, cooperativa, prepago, otro) |
| `createBank(name, type)` | Crea nuevo banco |
| `findBankByName(bankName)` | Busca banco por nombre |
| `normalizeEmployeeBank(employeeId)` | Normaliza 1 empleado (legacy → nuevo) |
| `getBankUsageStats()` | Estadísticas de uso |

**Lógica de fallback:**
```typescript
1. Si employee.bank_id existe → mostrar banks.name
2. Si employee.bank_id es null → mostrar employee.bank_name (legacy)
3. Si ambos son null → mostrar "Sin banco"
```

---

### 4. API Routes

```
app/api/banks/route.ts
```

**Endpoints:**

#### GET /api/banks
- Retorna bancos activos
- Query param: `?q=` para búsqueda
- Ordenados por tipo y nombre
- Requiere autenticación

**Ejemplo:**
```javascript
// Obtener todos
fetch('/api/banks')

// Buscar
fetch('/api/banks?q=chile')
```

#### POST /api/banks
- Crea nueva institución
- Solo: super_admin, owner, admin
- Valida duplicados (case-insensitive)

**Ejemplo:**
```javascript
fetch('/api/banks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Banco Nuevo',
    type: 'banco' // 'banco' | 'cooperativa' | 'prepago' | 'otro'
  })
})
```

---

### 5. Componente BankSelector

```
components/BankSelector.tsx
```

**Características:**
- ComboBox con búsqueda en tiempo real
- Agrupado por tipo (Bancos, Cooperativas, Prepago, Otros)
- Modal "+ Agregar institución" para admins
- Advertencia para bancos legacy con botón "Normalizar"
- Badge de tipo con colores distintivos

**Props:**
```typescript
interface BankSelectorProps {
  value?: string | null          // bank_id seleccionado
  onChange: (bankId, bankName) => void
  legacyBankName?: string | null // Muestra advertencia legacy
  isAdmin?: boolean               // Habilita botón "+"
  disabled?: boolean
  required?: boolean
  error?: string
  onNormalize?: () => void        // Callback para normalizar
}
```

**Uso:**
```tsx
<BankSelector
  value={formData.bank_id}
  onChange={(bankId, bankName) => {
    setFormData({ 
      ...formData, 
      bank_id: bankId,
      bank_name: bankName || ''
    })
  }}
  legacyBankName={!formData.bank_id ? formData.bank_name : null}
  isAdmin={isAdmin}
  onNormalize={async () => {
    const success = await normalizeEmployeeBank(employeeId)
    if (success) alert('Banco normalizado')
  }}
/>
```

---

### 6. Integración en Formularios

**Modificados:**
- `app/employees/new/page.tsx` - Crear empleado
- `app/employees/[id]/edit/page.tsx` - Editar empleado

**Cambios:**
1. Agregado import de `BankSelector`
2. Agregado `bank_id` al estado `formData`
3. Reemplazado input de texto por `BankSelector`
4. Actualizado guardado para incluir `bank_id`
5. En edición: agregada función de normalización

**Antes:**
```tsx
<input
  type="text"
  value={formData.bank_name}
  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
  placeholder="Ej: Banco de Chile"
/>
```

**Después:**
```tsx
<BankSelector
  value={formData.bank_id}
  onChange={(bankId, bankName) => {
    setFormData({ 
      ...formData, 
      bank_id: bankId,
      bank_name: bankName || ''
    })
  }}
  isAdmin={isAdmin}
/>
```

---

## 🏗️ Arquitectura de la Solución

### Diagrama de Datos

```
┌─────────────────────────┐
│       banks             │
│─────────────────────────│
│ id (PK)                 │◄───┐
│ name (UNIQUE)           │    │
│ type                    │    │ FK
│ active                  │    │
│ created_at              │    │
│ updated_at              │    │
└─────────────────────────┘    │
                               │
                               │
┌─────────────────────────┐    │
│      employees          │    │
│─────────────────────────│    │
│ id (PK)                 │    │
│ bank_id (FK, nullable)  │────┘
│ bank_name (legacy)      │
│ ...                     │
└─────────────────────────┘
```

### Flujo de Datos

```
1. CREAR EMPLEADO:
   User → BankSelector → selecciona banco
   → onChange(bank_id, bank_name)
   → formData actualizado
   → submit → INSERT employees(bank_id=X)

2. EDITAR EMPLEADO (nuevo):
   Load employee → tiene bank_id
   → BankSelector muestra banco seleccionado
   → User cambia → actualiza bank_id

3. EDITAR EMPLEADO (legacy):
   Load employee → NO tiene bank_id, tiene bank_name
   → BankSelector muestra advertencia legacy
   → User puede:
      a) Seleccionar banco → actualiza bank_id
      b) Normalizar → ejecuta backfill para ese empleado
      c) Dejar como está → mantiene bank_name

4. MOSTRAR BANCO (UI/PDF/Reportes):
   employee → getEmployeeBankDisplay(employee)
   → Si bank_id → busca banks.name
   → Si no bank_id → usa bank_name
   → Retorna string (nunca null)
```

---

## 📊 Instituciones Financieras Pre-cargadas

### Bancos (17)
1. Banco de Chile
2. Banco Internacional
3. BancoEstado
4. Scotiabank Chile
5. Banco de Crédito e Inversiones (BCI)
6. Banco Falabella
7. Banco Ripley
8. Banco Consorcio
9. Banco Itaú Chile
10. Banco Security
11. Banco Santander Chile
12. Banco BICE
13. Banco BTG Pactual Chile
14. Banco Edwards
15. Banco do Brasil S.A.
16. JPMorgan Chase Bank N.A.
17. HSBC Bank Chile

### Cooperativas (4)
1. Coopeuch
2. Detacoop
3. Oriencoop
4. Capual

### Prepago / Fintech (7)
1. Tenpo
2. MACH
3. Mercado Pago
4. Dale
5. Global66
6. Prex
7. CuentaRUT Prepago (BancoEstado)

---

## 🔄 Gestión de la Lista de Bancos

### Desde la UI (Admins)

**Para agregar un banco:**
1. Ir a formulario de empleado (crear o editar)
2. En campo "Banco", hacer clic
3. Hacer clic en botón "+ Agregar nueva institución"
4. Llenar formulario:
   - Nombre: "Mi Banco Nuevo"
   - Tipo: Banco / Cooperativa / Prepago / Otro
5. Guardar
6. El banco queda disponible inmediatamente

### Desde la Base de Datos (SQL)

**Para agregar un banco:**
```sql
INSERT INTO banks (name, type, active) 
VALUES ('Banco Nuevo', 'banco', true);
```

**Para desactivar un banco (no eliminarlo):**
```sql
UPDATE banks 
SET active = false 
WHERE name = 'Banco Antiguo';
```

**Para reactivar un banco:**
```sql
UPDATE banks 
SET active = true 
WHERE name = 'Banco Antiguo';
```

**Para cambiar nombre o tipo:**
```sql
UPDATE banks 
SET name = 'Nombre Corregido', 
    type = 'cooperativa' 
WHERE id = 'uuid-del-banco';
```

---

## 🔐 Seguridad y Permisos

### RLS (Row Level Security)

**Lectura (SELECT):**
- ✅ Todos los usuarios autenticados pueden leer bancos

**Escritura (INSERT/UPDATE/DELETE):**
- ✅ Super admins: Todos los permisos
- ✅ Owners y admins: Pueden insertar nuevos bancos
- ❌ Usuarios normales: Sin permisos de escritura

### Validaciones

1. **Unicidad de nombre:** Case-insensitive (no puede haber "Banco de Chile" y "banco de chile")
2. **Tipo válido:** Solo: 'banco', 'cooperativa', 'prepago', 'otro'
3. **Autenticación:** Todas las operaciones requieren usuario autenticado

---

## 🧪 Testing y Validación

### Build Exitoso ✅
```bash
npm run build
# ✓ Compiled successfully
# ✓ Build completed in X seconds
```

### Tests Manuales Recomendados

1. **Crear empleado nuevo:**
   - ✅ Seleccionar banco del dropdown
   - ✅ Buscar banco por nombre
   - ✅ Agregar banco nuevo (como admin)
   - ✅ Guardar y verificar en BD

2. **Editar empleado antiguo (legacy):**
   - ✅ Ver advertencia de banco legacy
   - ✅ Botón "Normalizar" funciona
   - ✅ Seleccionar banco nuevo actualiza bank_id
   - ✅ Sin seleccionar nada, mantiene bank_name

3. **API endpoints:**
   ```bash
   # GET bancos
   curl http://localhost:3000/api/banks
   
   # GET con búsqueda
   curl http://localhost:3000/api/banks?q=chile
   
   # POST nuevo banco (requiere auth)
   curl -X POST http://localhost:3000/api/banks \
     -H "Content-Type: application/json" \
     -d '{"name": "Banco Test", "type": "banco"}'
   ```

4. **Backfill:**
   ```sql
   -- Ver preview
   SELECT * FROM preview_bank_backfill();
   
   -- Ejecutar
   SELECT * FROM backfill_employee_banks();
   ```

---

## 📈 Estadísticas y Monitoreo

### Consultas Útiles

**Ver todos los bancos activos:**
```sql
SELECT * FROM banks WHERE active = true ORDER BY type, name;
```

**Contar empleados por tipo de banco:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE bank_id IS NOT NULL) as con_bank_id,
  COUNT(*) FILTER (WHERE bank_id IS NULL AND bank_name IS NOT NULL) as solo_legacy,
  COUNT(*) FILTER (WHERE bank_id IS NULL AND bank_name IS NULL) as sin_banco
FROM employees;
```

**Bancos más usados:**
```sql
SELECT 
  b.name, 
  b.type, 
  COUNT(e.id) as empleados
FROM banks b
LEFT JOIN employees e ON e.bank_id = b.id
GROUP BY b.id, b.name, b.type
ORDER BY empleados DESC;
```

**Empleados que necesitan normalización:**
```sql
SELECT 
  id, 
  full_name, 
  bank_name
FROM employees
WHERE bank_id IS NULL 
  AND bank_name IS NOT NULL 
  AND trim(bank_name) != '';
```

### Desde el código

```typescript
import { getBankUsageStats } from '@/lib/utils/employeeBankHelper'

const stats = await getBankUsageStats()
console.log({
  total_employees: stats.total_employees,
  using_bank_id: stats.using_bank_id,        // Normalizados
  using_bank_name: stats.using_bank_name,    // Legacy
  no_bank: stats.no_bank                     // Sin banco
})
```

---

## 🚀 Pasos para Despliegue

### 1. Ejecutar Migraciones
```bash
# Asegurarse de estar en la carpeta del proyecto
cd /path/to/proyecto

# Push migraciones a Supabase
npx supabase db push

# Verificar que se creó la tabla banks
npx supabase db remote --db-url=<tu-url> "SELECT COUNT(*) FROM banks;"
```

### 2. Verificar Seed
```bash
# Debe retornar 28 (17 bancos + 4 coop + 7 prepago)
npx supabase db remote --db-url=<tu-url> "SELECT COUNT(*) FROM banks WHERE active = true;"
```

### 3. Deploy de la Aplicación
```bash
# Build local (ya verificado ✅)
npm run build

# Deploy a tu plataforma (Vercel, etc.)
git add .
git commit -m "feat: Sistema de gestión de bancos"
git push origin main
```

### 4. Backfill Opcional (después del deploy)
```bash
# Conectarse a producción y ejecutar
SELECT * FROM preview_bank_backfill();  # Verificar
SELECT * FROM backfill_employee_banks();  # Ejecutar
```

---

## 🐛 Troubleshooting

### Problema: "Ya existe un banco con ese nombre"
**Causa:** Intentando crear banco duplicado (case-insensitive)  
**Solución:** Verificar en BD si existe, o usar nombre ligeramente diferente

### Problema: Dropdown de bancos vacío
**Causa:** No se ejecutó migración 085 o seed falló  
**Solución:**
```sql
SELECT COUNT(*) FROM banks WHERE active = true;
-- Si retorna 0, ejecutar migración nuevamente
```

### Problema: Empleados antiguos muestran "Sin banco"
**Causa:** No tienen `bank_id` ni `bank_name`  
**Solución:** Normal si nunca tuvieron banco. Si tenían, verificar campo `bank_name` en BD

### Problema: Modal de agregar banco no aparece
**Causa:** Usuario no es admin/owner  
**Solución:** Verificar rol en tabla `company_users` o `users.role`

### Problema: Error al normalizar banco legacy
**Causa:** Banco con nombre no encontrado en tabla `banks`  
**Solución:**
```typescript
// El sistema debería crear automáticamente como tipo 'otro'
// Verificar logs en consola del navegador
```

---

## 📝 Notas Importantes

### ⚠️ Retrocompatibilidad
- **NO** eliminar columna `bank_name` de `employees`
- Se mantiene como fallback para trabajadores antiguos
- El sistema prioriza `bank_id` sobre `bank_name`

### 🔄 Migración Progresiva
- Nuevos trabajadores → usan `bank_id` automáticamente
- Trabajadores editados → pueden actualizar a `bank_id`
- Trabajadores no tocados → siguen con `bank_name` (funciona bien)

### 💾 Soft Delete
- Bancos NO se eliminan, se desactivan (`active = false`)
- Empleados con `bank_id` de banco inactivo → siguen mostrando el nombre
- Solo dropdown de selección oculta bancos inactivos

### 🔍 Case-Insensitive
- Búsquedas y unicidad son case-insensitive
- "Banco de Chile" = "banco de chile" = "BANCO DE CHILE"
- Se almacena con la capitalización original

---

## 📚 Recursos Adicionales

### Documentación Relacionada
- [Manual de Ficha del Trabajador](./MANUAL_FICHA_TRABAJADOR.md)
- [Manual de Regímenes Previsionales](./MANUAL_REGIMENES_PREVISIONALES.md)

### Archivos Clave
- `supabase/migrations/085_add_banks_table_and_seed.sql` - Migración principal
- `supabase/migrations/086_backfill_employee_banks_optional.sql` - Backfill
- `lib/utils/employeeBankHelper.ts` - Helper functions
- `components/BankSelector.tsx` - Componente UI
- `app/api/banks/route.ts` - API endpoints

---

## ✅ Checklist de Implementación

- [x] Crear tabla `banks` en Supabase
- [x] Agregar columna `bank_id` a `employees`
- [x] Seed de 28 instituciones financieras
- [x] RLS configurado
- [x] Helper de retrocompatibilidad
- [x] API GET /api/banks
- [x] API POST /api/banks
- [x] Componente BankSelector
- [x] Modal AddBankModal
- [x] Integración en formulario de crear
- [x] Integración en formulario de editar
- [x] Función de normalización
- [x] Script de backfill opcional
- [x] Build exitoso sin errores
- [x] Documentación completa

---

## 🎉 Conclusión

El Sistema de Gestión de Bancos ha sido implementado exitosamente con:

- ✅ **100% de retrocompatibilidad** - nada se rompe
- ✅ **UX profesional** - dropdown con búsqueda y agrupación
- ✅ **Gestión flexible** - admins pueden agregar instituciones
- ✅ **Migración segura** - backfill opcional, no obligatorio
- ✅ **Código limpio** - bien estructurado y documentado
- ✅ **Build exitoso** - sin errores de compilación

**Listo para producción** 🚀

---

**Última actualización:** Enero 2025  
**Versión:** 1.0  
**Estado:** ✅ Completado


