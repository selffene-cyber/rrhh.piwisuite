# 🔧 Fix: Configuración de Empresa No Persiste

## 🎯 Problema Identificado

### Síntoma:
```
Usuario cambia la Razón Social en /settings
→ Dice "Configuración guardada correctamente"
→ Al refrescar la página F5
→ Vuelve a aparecer el nombre anterior
```

### ¿Por qué pasa esto?

El problema es el **caché del `CompanyContext`**:

```
1. Usuario guarda cambios en /settings
   ├── ✅ Se guarda en BD correctamente
   ├── ✅ El estado local (formData) se actualiza
   └── ❌ El CompanyContext NO se entera

2. Usuario refresca la página F5
   ├── loadCompany() carga desde BD → Nombre NUEVO ✅
   ├── CompanyContext carga desde caché → Nombre VIEJO ❌
   └── El selector del header muestra el nombre viejo
```

---

## 🔍 Diagnóstico Detallado

### Flujo del Problema:

```typescript
// 1. Usuario guarda en /settings/page.tsx
await supabase
  .from('companies')
  .update({ name: 'Nuevo Nombre' })
  .eq('id', companyId)

alert('Configuración guardada correctamente')
// ❌ CompanyContext aún tiene el nombre viejo

// 2. Usuario refresca (F5)
// CompanyContext.loadCompanies() se ejecuta
// Carga empresas desde BD → Nombre NUEVO

// 3. Pero el selector del header ya renderizó con el viejo
// Porque React no detectó cambio en el contexto
```

### ¿Dónde está el caché?

```typescript
// CompanyContext.tsx (línea 114)
setCompanies(companiesData)  // ← Array de empresas cacheado

// Layout.tsx (selector de empresa)
const { companies } = useCompany()  // ← Lee del caché
companies.map(company => (
  <option value={company.id}>{company.name}</option>  // ← Nombre viejo
))
```

---

## ✅ Solución Implementada

### Cambios en `/settings/page.tsx`:

#### 1. Importar `useCompany`:
```typescript
import { useCompany } from '@/lib/contexts/CompanyContext'
```

#### 2. Obtener `refreshCompanies`:
```typescript
const { refreshCompanies } = useCompany()
```

#### 3. Llamar después de guardar:
```typescript
// Después de UPDATE exitoso
await refreshCompanies()  // ← Recarga todas las empresas desde BD

alert('Configuración guardada correctamente')
```

---

## 🔄 Flujo Corregido

### Ahora funciona así:

```typescript
// 1. Usuario guarda cambios
await supabase
  .from('companies')
  .update({ name: 'Nuevo Nombre' })
  .eq('id', companyId)

// 2. Refrescar contexto inmediatamente
await refreshCompanies()  // ✅ Recarga desde BD

// 3. El contexto se actualiza
setCompanies([...nuevasEmpresas])

// 4. React detecta el cambio
// 5. El selector del header se re-renderiza
// 6. Muestra el nombre NUEVO inmediatamente
```

---

## 📋 Lugares Donde Se Aplica

La solución se aplicó en **3 funciones**:

### 1. `handleSubmit` (Guardar configuración):
```typescript
const { error } = await supabase
  .from('companies')
  .update({
    name: formData.name,
    employer_name: formData.employer_name,
    rut: formData.rut,
    address: formData.address,
    city: formData.city,
    logo_url: formData.logo_url,
  })
  .eq('id', companyId)

if (error) throw error

// ✅ Refrescar contexto
await refreshCompanies()

alert('Configuración guardada correctamente')
```

### 2. `handleLogoUpload` (Subir logo):
```typescript
const { error: updateError } = await supabase
  .from('companies')
  .update({ logo_url: publicUrl })
  .eq('id', companyId)

if (updateError) throw updateError

// ✅ Refrescar contexto
await refreshCompanies()

alert('Logo subido correctamente')
```

### 3. `handleRemoveLogo` (Eliminar logo):
```typescript
const { error } = await supabase
  .from('companies')
  .update({ logo_url: null })
  .eq('id', companyId)

if (error) throw error

// ✅ Refrescar contexto
await refreshCompanies()

alert('Logo eliminado correctamente')
```

---

## 🧪 Verificación

### Test Case 1: Cambiar Razón Social

```
1. Ir a http://localhost:3007/settings
2. Cambiar "Razón Social" de "Empresa A" a "Empresa B"
3. Click "Guardar Configuración"
4. Verificar selector del header → Debe mostrar "Empresa B" ✅
5. Refrescar página F5
6. Verificar selector del header → Debe seguir mostrando "Empresa B" ✅
```

### Test Case 2: Cambiar Logo

```
1. Ir a http://localhost:3007/settings
2. Subir un logo nuevo
3. Click "Subir Logo"
4. Verificar que el logo aparece inmediatamente
5. El selector del header debe actualizarse
6. Refrescar página F5
7. El logo debe persistir ✅
```

### Test Case 3: Múltiples Empresas

```
Escenario: Usuario con 2 empresas (A y B)

1. Seleccionar Empresa A
2. Ir a /settings
3. Cambiar nombre de "Empresa A" a "Empresa A Modificada"
4. Guardar
5. Verificar selector: debe mostrar "Empresa A Modificada" ✅
6. Cambiar a Empresa B en el selector
7. Cambiar de vuelta a Empresa A
8. Debe mostrar "Empresa A Modificada" (no el viejo) ✅
```

---

## 📊 Comparación Antes/Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Guardar razón social | ✅ Se guarda en BD | ✅ Se guarda en BD |
| Estado local (formData) | ✅ Se actualiza | ✅ Se actualiza |
| CompanyContext | ❌ No se actualiza | ✅ Se actualiza |
| Selector del header | ❌ Muestra nombre viejo | ✅ Muestra nombre nuevo |
| Después de F5 | ❌ Vuelve al viejo (aparentemente) | ✅ Persiste el nuevo |
| Experiencia de usuario | ❌ Confusa | ✅ Consistente |

---

## 🔍 Debugging (Si sigue pasando)

### 1. Verificar en la Base de Datos:

```sql
-- Ver si el cambio se guardó realmente
SELECT id, name, employer_name, updated_at
FROM companies
WHERE id = '[tu-company-id]';

-- Si updated_at es reciente y name es el nuevo → El guardado funciona
-- Si name es el viejo → El guardado está fallando
```

### 2. Verificar el Contexto:

```typescript
// En app/settings/page.tsx, agregar console.log:

await refreshCompanies()
console.log('Contexto refrescado')

// En el navegador, Console:
// Debe aparecer "Contexto refrescado" después de guardar
```

### 3. Verificar RLS (Row Level Security):

```sql
-- Ver políticas de la tabla companies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'companies';

-- Si no hay política UPDATE para el usuario → El UPDATE está fallando silenciosamente
```

### 4. Verificar Logs de Supabase:

```
Dashboard → Logs → Database
Filtrar por UPDATE en companies
Ver si hay errores
```

---

## ⚠️ Notas Importantes

### 1. **`refreshCompanies` es async**:
```typescript
// ✅ CORRECTO: Usar await
await refreshCompanies()

// ❌ INCORRECTO: Sin await
refreshCompanies()  // El contexto puede no actualizarse a tiempo
```

### 2. **Llamar DESPUÉS del UPDATE**:
```typescript
// ✅ CORRECTO:
const { error } = await supabase.from('companies').update(...)
if (error) throw error
await refreshCompanies()  // ← Después de verificar que no hay error

// ❌ INCORRECTO:
await refreshCompanies()  // ← Antes del UPDATE
const { error } = await supabase.from('companies').update(...)
```

### 3. **No afecta el rendimiento**:
```typescript
// refreshCompanies() solo se llama cuando el usuario guarda
// No se llama en cada render
// Solo 1 query adicional por guardado (acceptable trade-off)
```

---

## 🔄 Otros Lugares Donde Puede Aplicarse

Esta misma solución puede usarse en:

### 1. **Cualquier formulario que edite empresas**:
```typescript
// Ejemplo: Si tienes /admin/companies/[id]/edit
await supabase.from('companies').update(...)
await refreshCompanies()  // ← Agregar esto
```

### 2. **Creación de nuevas empresas**:
```typescript
// Ejemplo: /admin/companies/new
await supabase.from('companies').insert(...)
await refreshCompanies()  // ← Agregar esto para que aparezca en el selector
```

### 3. **Eliminación de empresas**:
```typescript
// Ejemplo: Botón eliminar empresa
await supabase.from('companies').delete().eq('id', companyId)
await refreshCompanies()  // ← Actualizar lista
```

---

## 📝 Resumen

### Causa Raíz:
```
El CompanyContext mantiene un caché de las empresas.
Cuando guardas cambios, el caché no se actualiza automáticamente.
Por eso parece que "no persiste", pero en realidad SÍ se guarda en BD.
```

### Solución:
```
Llamar a refreshCompanies() después de guardar.
Esto recarga las empresas desde la BD y actualiza el contexto.
React detecta el cambio y re-renderiza el selector del header.
```

### Resultado:
```
✅ Los cambios se ven inmediatamente en el selector
✅ Los cambios persisten después de F5
✅ La experiencia de usuario es consistente
```

---

**Fecha**: 2025-01-08  
**Archivo Modificado**: `app/settings/page.tsx`  
**Estado**: ✅ Resuelto

