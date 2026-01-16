# 🐛 Problema: Trabajadores sin Empresas en Portal Super Admin

**Fecha**: 15 de enero de 2026  
**Severidad**: 🟡 MEDIA  
**Estado**: 📝 IDENTIFICADO - Requiere corrección

---

## 🔍 Problema Identificado

### Síntoma

En el portal de super administrador (`/admin/users`), los trabajadores con rol `user` aparecen sin empresas asignadas, aunque en su empresa SÍ tienen `company_id` y `cost_center_id` definidos.

### Causa Raíz

**El código actual solo busca empresas en la tabla `company_users`:**

```typescript
// Línea 76-83 de app/admin/users/page.tsx
const { data: companiesData } = await supabase
  .from('company_users')  // ❌ Solo busca aquí
  .select(`
    company_id,
    role,
    companies (id, name)
  `)
  .eq('user_id', user.id)
  .eq('status', 'active')
```

**PERO** los trabajadores con rol `user` (portal trabajador) NO están en `company_users`.  
Ellos están vinculados a través de la tabla `employees`:

```
user_profiles (id, role='user')
    ↓
employees (user_id, company_id, cost_center_id)
    ↓
companies (id, name)
```

### Diferencia de Estructura

| Tipo de Usuario | Tabla de Relación | Acceso |
|-----------------|-------------------|--------|
| **Super Admin** | `user_profiles` | Todas las empresas |
| **Admin** | `company_users` | Su(s) empresa(s) específica(s) |
| **User (Trabajador)** | `employees` ❗ | Su empresa (a través de employee) |

---

## 📊 Ejemplo del Problema

### Bastian Alberto Ahumada Bruna

**En la tabla `employees`:**
```sql
id: df013bed-9d6e-47f8-bd03-d456ad3737d9
user_id: 177b3986-e9d4-4811-9f43-5ed08fce8d2e
company_id: be575ba9-e1f8-449c-a875-ff19607b1d11 ✅
cost_center_id: 87c99b3d-a11b-4c43-b240-55021a94d97d ✅
```

**En la tabla `user_profiles`:**
```sql
id: 177b3986-e9d4-4811-9f43-5ed08fce8d2e
email: bstahumada@gmail.com
role: user ✅
```

**En la tabla `company_users`:**
```sql
(No existe registro) ❌ ← Por eso no aparece en el admin
```

**Resultado**: El super admin no ve su empresa porque solo busca en `company_users`.

---

## ✅ Solución Requerida

### Lógica Correcta

```typescript
// Para cada usuario, determinar cómo buscar su empresa:

if (user.role === 'super_admin') {
  // Super admin: mostrar "Todas las empresas"
  companies = "Acceso Global"
  
} else if (user.role === 'admin') {
  // Admin: buscar en company_users
  companies = await supabase
    .from('company_users')
    .select('company_id, companies (id, name)')
    .eq('user_id', user.id)
    
} else if (user.role === 'user') {
  // ✅ Trabajador: buscar en employees
  const { data: employee } = await supabase
    .from('employees')
    .select(`
      company_id,
      cost_center_id,
      companies (id, name),
      cost_centers (id, code, name)
    `)
    .eq('user_id', user.id)
    .single()
    
  companies = employee ? [{
    company_id: employee.company_id,
    companies: employee.companies,
    cost_centers: employee.cost_centers ? [employee.cost_centers] : []
  }] : []
}
```

---

## 🔧 Archivo a Modificar

**Archivo**: `app/admin/users/page.tsx`  
**Función**: `loadData()` - Líneas 72-122

### Cambios Necesarios

1. **Agregar condicional por rol** al cargar empresas
2. **Para rol 'user'**: consultar tabla `employees` en vez de `company_users`
3. **Para rol 'admin'**: mantener consulta a `company_users`
4. **Para rol 'super_admin'**: mostrar indicador especial

---

## 📋 Verificación

Después de la corrección, en `/admin/users` se debería ver:

```
┌──────────────┬───────┬─────────────────────┬────────────────┐
│ Usuario      │ Rol   │ Empresa             │ Centro Costo   │
├──────────────┼───────┼─────────────────────┼────────────────┤
│ Bastian      │ user  │ HLMS SpA ✅         │ CC-TERRENO ✅  │
│ Francis      │ user  │ HLMS SpA ✅         │ CC-TERRENO ✅  │
│ Héctor (adm) │ admin │ HLMS SpA ✅         │ -              │
│ Jeans        │ super │ (Todas) ✅          │ -              │
└──────────────┴───────┴─────────────────────┴────────────────┘
```

---

## 🎯 Impacto

### Antes ❌
- Trabajadores aparecen sin empresa
- Confusión para el super admin
- No se puede ver qué empresa pertenece cada trabajador

### Después ✅
- Todos los usuarios muestran su empresa
- Clara visibilidad de la estructura organizacional
- Fácil identificación de centros de costo asignados

---

## 📝 Notas Técnicas

### Por Qué Esta Estructura

**Trabajadores (role='user')** no están en `company_users` porque:
1. Solo acceden al portal de trabajador (no administran)
2. Su relación empresa es 1:1 (un trabajador, una empresa)
3. Ya están vinculados a través de `employees.company_id`

**Administradores (role='admin')** SÍ están en `company_users` porque:
1. Pueden administrar múltiples empresas
2. Tienen permisos específicos por empresa
3. Relación N:M (un admin, varias empresas potencialmente)

---

**Próximo Paso**: Implementar la corrección en el código
