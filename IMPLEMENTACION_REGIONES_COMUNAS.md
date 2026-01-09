# 🗺️ Sistema de Regiones y Comunas de Chile - Documentación de Implementación

## 📋 Resumen Ejecutivo

Se ha implementado exitosamente un **Sistema de División Político-Administrativa (DPA)** de Chile para la Ficha del Trabajador, conectado con la **API oficial del Gobierno de Chile**.

### ✅ Características Principales

- ✅ **Tablas maestras** de regiones, provincias y comunas desde API DPA
- ✅ **Sincronización bajo demanda** con API del Gobierno Digital
- ✅ **Retrocompatibilidad total** - trabajadores antiguos NO requieren edición
- ✅ **Selectores dependientes** - Comuna se filtra por región
- ✅ **Datos locales** - No dependencia runtime de API externa
- ✅ **Normalización opcional** - Script de backfill disponible
- ✅ **Build exitoso** sin errores

---

## 📁 Archivos Creados

### 1. Migración de Base de Datos

```
supabase/migrations/087_add_geo_regions_communes.sql
```

**Contenido:**
- Crea tabla `geo_regions` (16 regiones de Chile)
- Crea tabla `geo_provinces` (56 provincias)
- Crea tabla `geo_communes` (346 comunas)
- Crea tabla `geo_sync_logs` (logs de sincronización)
- Agrega columnas a `employees`:
  - `region_id` (FK, nullable)
  - `commune_id` (FK, nullable)
  - `province_id` (FK, nullable, opcional)
  - `region_name_legacy` (fallback texto)
  - `city_name_legacy` (fallback texto)
- RLS (Row Level Security) configurado
- Triggers para `updated_at`

**Ejecutar:**
```bash
npx supabase db push
```

**NOTA IMPORTANTE:** Esta migración crea las tablas vacías. Después debes ejecutar la sincronización inicial para poblarlas.

---

### 2. Script de Backfill Opcional

```
supabase/migrations/088_backfill_employee_location_optional.sql
```

**Contenido:**
- Función `backfill_employee_locations()` para normalizar datos históricos
- Función `preview_location_backfill()` para previsualizar sin ejecutar
- **NO se ejecuta automáticamente**

**Uso:**
```sql
-- Previsualizar qué se normalizará
SELECT * FROM preview_location_backfill();

-- Ejecutar backfill
SELECT * FROM backfill_employee_locations();

-- Ver estadísticas
SELECT 
  COUNT(*) FILTER (WHERE region_id IS NOT NULL) as con_region_id,
  COUNT(*) FILTER (WHERE region_id IS NULL AND region_name_legacy IS NOT NULL) as solo_legacy,
  COUNT(*) as total
FROM employees;
```

---

### 3. API de Sincronización (Admin Only)

```
app/api/admin/geo/sync-dpa/route.ts
```

**Endpoints:**

#### POST /api/admin/geo/sync-dpa
- Sincroniza regiones, provincias y comunas desde API DPA
- Solo: super_admin
- Guarda log en `geo_sync_logs`
- Marca como `active=false` lo que ya no existe

**Fuente de datos:**
- API oficial: `https://apis.digital.gob.cl/dpa/`
  - `/regiones` - 16 regiones
  - `/provincias` - 56 provincias
  - `/comunas` - 346 comunas

**Uso:**
```javascript
// Ejecutar sincronización inicial (OBLIGATORIO después de migración)
fetch('/api/admin/geo/sync-dpa', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>'
  }
})
```

#### GET /api/admin/geo/sync-dpa
- Retorna último log de sincronización
- Para verificar si ya se ejecutó sync

---

### 4. API de Lectura (Para UI)

```
app/api/geo/regions/route.ts
app/api/geo/communes/route.ts
```

**Endpoints:**

#### GET /api/geo/regions
```javascript
// Obtener todas las regiones activas
fetch('/api/geo/regions')
// Respuesta: { regions: [...], count: 16 }
```

#### GET /api/geo/communes?regionId=xxx
```javascript
// Obtener comunas de una región
fetch('/api/geo/communes?regionId=<uuid>')
// Respuesta: { communes: [...], count: N, region_id: "..." }

// Con búsqueda
fetch('/api/geo/communes?regionId=<uuid>&q=sant')
```

---

### 5. Helper de Retrocompatibilidad

```
lib/utils/employeeLocationHelper.ts
```

**Funciones principales:**

| Función | Descripción |
|---------|-------------|
| `getEmployeeRegionDisplay(employee)` | Obtiene nombre de región (nunca null) |
| `getEmployeeCommuneDisplay(employee)` | Obtiene nombre de comuna (nunca null) |
| `getEmployeeFullLocation(employee)` | Retorna "Comuna, Región" formateado |
| `isLegacyLocation(employee)` | Verifica si usa sistema legacy |
| `getActiveRegions()` | Lista regiones activas |
| `getActiveCommunes(regionId, q?)` | Lista comunas filtradas por región |
| `findRegionByName(name)` | Busca región por nombre |
| `findCommuneByName(name, regionId?)` | Busca comuna por nombre |
| `normalizeEmployeeLocation(employeeId)` | Normaliza 1 empleado (legacy → IDs) |
| `getLocationUsageStats()` | Estadísticas de uso |

**Lógica de fallback:**
```typescript
1. Si employee.region_id existe → mostrar geo_regions.name
2. Si employee.region_id es null → mostrar employee.region_name_legacy
3. Si ambos son null → mostrar "Sin región"

// Mismo patrón para commune_id / city_name_legacy
```

---

### 6. Componente RegionCommuneSelector

```
components/RegionCommuneSelector.tsx
```

**Características:**
- Dos dropdowns dependientes (Región → Comuna)
- Comuna se carga dinámicamente al seleccionar región
- Advertencia visual para datos legacy
- Botón "Normalizar" para admins
- Limpieza de selección (botón ✕)
- Display de ubicación seleccionada

**Props:**
```typescript
interface RegionCommuneSelectorProps {
  regionValue?: string | null       // region_id seleccionado
  communeValue?: string | null      // commune_id seleccionado
  onChange: (regionId, communeId) => void
  legacyRegionName?: string | null  // Muestra advertencia legacy
  legacyCityName?: string | null
  isAdmin?: boolean                  // Habilita botón normalizar
  disabled?: boolean
  onNormalize?: () => void           // Callback normalizar
}
```

**Uso:**
```tsx
<RegionCommuneSelector
  regionValue={formData.region_id}
  communeValue={formData.commune_id}
  onChange={(regionId, communeId) => {
    setFormData({ 
      ...formData, 
      region_id: regionId,
      commune_id: communeId
    })
  }}
  legacyRegionName={!formData.region_id ? formData.region_name_legacy : null}
  legacyCityName={!formData.commune_id ? formData.city_name_legacy : null}
  isAdmin={isAdmin}
  onNormalize={async () => {
    const success = await normalizeEmployeeLocation(employeeId)
    if (success) alert('Ubicación normalizada')
  }}
/>
```

---

### 7. Integración en Formularios

**Modificados:**
- `app/employees/new/page.tsx` - Crear empleado
- `app/employees/[id]/edit/page.tsx` - Editar empleado

**Cambios:**
1. Agregado import de `RegionCommuneSelector`
2. Agregado `region_id` y `commune_id` al estado `formData`
3. Agregado `region_name_legacy` y `city_name_legacy` (edit only)
4. Integrado selector después del campo de dirección
5. Actualizado guardado para incluir region_id/commune_id
6. En edición: agregada función de normalización

---

## 🏗️ Arquitectura de la Solución

### Diagrama de Datos

```
┌─────────────────────────┐
│     geo_regions         │
│─────────────────────────│
│ id (PK)                 │◄───┐
│ code (UNIQUE)           │    │
│ name                    │    │ FK
│ active                  │    │
└─────────────────────────┘    │
         ▲                     │
         │                     │
         │ FK                  │
         │                     │
┌─────────────────────────┐    │
│    geo_provinces        │    │
│─────────────────────────│    │
│ id (PK)                 │    │
│ code (UNIQUE)           │    │
│ name                    │    │
│ region_id (FK)          │────┘
│ active                  │
└─────────────────────────┘
         ▲
         │ FK
         │
┌─────────────────────────┐
│     geo_communes        │
│─────────────────────────│
│ id (PK)                 │
│ code (UNIQUE)           │
│ name                    │
│ region_id (FK)          │────┐
│ province_id (FK)        │    │
│ active                  │    │
└─────────────────────────┘    │
         ▲                     │
         │ FK                  │
         │                     │
┌─────────────────────────┐    │
│      employees          │    │
│─────────────────────────│    │
│ id (PK)                 │    │
│ region_id (FK nullable) │────┘
│ commune_id (FK nullable)│
│ region_name_legacy      │
│ city_name_legacy        │
│ ...                     │
└─────────────────────────┘
```

### Flujo de Sincronización DPA

```
1. SYNC INICIAL (UNA VEZ):
   Admin → POST /api/admin/geo/sync-dpa
   → Llama API DPA Gobierno
   → Descarga regiones (16)
   → Descarga provincias (56)
   → Descarga comunas (346)
   → UPSERT en tablas maestras
   → Guarda log en geo_sync_logs
   → Sistema listo para usar

2. SYNC PERIÓDICO (OPCIONAL):
   Ejecutar cada N meses si hay cambios DPA
   → Actualiza nombres
   → Marca active=false lo eliminado
   → NO elimina registros (soft delete)
```

### Flujo de Uso en UI

```
1. CREAR EMPLEADO:
   User → Abre formulario
   → Selector carga regiones desde /api/geo/regions
   → User selecciona región
   → Selector carga comunas desde /api/geo/communes?regionId=X
   → User selecciona comuna
   → Submit → INSERT employees(region_id=X, commune_id=Y)

2. EDITAR EMPLEADO (nuevo):
   Load employee → tiene region_id/commune_id
   → Selector muestra región/comuna seleccionada
   → User puede cambiar

3. EDITAR EMPLEADO (legacy):
   Load employee → NO tiene IDs, tiene legacy
   → Selector muestra advertencia amarilla
   → User puede:
      a) Seleccionar región/comuna nueva → actualiza IDs
      b) Normalizar → ejecuta función de normalización
      c) Dejar como está → mantiene legacy

4. MOSTRAR UBICACIÓN (UI/PDF/Reportes):
   employee → getEmployeeFullLocation(employee)
   → Si region_id/commune_id → busca nombres en tablas
   → Si no → usa region_name_legacy/city_name_legacy
   → Retorna string formateado (nunca null)
```

---

## 📊 Datos de Chile Pre-sincronizables

### Regiones (16)
1. Arica y Parinacota
2. Tarapacá
3. Antofagasta
4. Atacama
5. Coquimbo
6. Valparaíso
7. Metropolitana de Santiago
8. O'Higgins
9. Maule
10. Ñuble
11. Biobío
12. Araucanía
13. Los Ríos
14. Los Lagos
15. Aysén
16. Magallanes y Antártica Chilena

### Provincias
56 provincias distribuidas en las 16 regiones

### Comunas
346 comunas distribuidas en las 56 provincias

---

## 🔄 Gestión de Datos

### Sincronización Inicial (OBLIGATORIA)

**Después de ejecutar migración 087:**

```bash
# 1. Ejecutar migración
npx supabase db push

# 2. Ejecutar sincronización inicial
# Desde la aplicación (como super_admin):
POST /api/admin/geo/sync-dpa

# O desde Supabase Dashboard → SQL Editor:
# (No disponible, debe hacerse desde la app)
```

**Resultado esperado:**
- ✅ 16 regiones insertadas
- ✅ 56 provincias insertadas
- ✅ 346 comunas insertadas
- ✅ Log guardado en `geo_sync_logs`

### Actualización Periódica (OPCIONAL)

```bash
# Ejecutar cada 6-12 meses o cuando Gobierno actualice DPA
POST /api/admin/geo/sync-dpa
```

Esto actualizará nombres y marcará como inactivas las regiones/comunas que ya no existan.

### Desde la Base de Datos (SQL)

**Para marcar una comuna como inactiva:**
```sql
UPDATE geo_communes 
SET active = false 
WHERE name = 'Comuna Antigua';
```

**Para reactivar:**
```sql
UPDATE geo_communes 
SET active = true 
WHERE name = 'Comuna Reactiva';
```

**Para cambiar nombre:**
```sql
UPDATE geo_communes 
SET name = 'Nombre Corregido' 
WHERE code = '13101';  -- Usar código DPA
```

---

## 🔐 Seguridad y Permisos

### RLS (Row Level Security)

**Lectura (SELECT):**
- ✅ Todos los usuarios autenticados pueden leer regiones/comunas

**Sincronización (POST):**
- ✅ Solo super_admins pueden ejecutar sync DPA

**Escritura directa (INSERT/UPDATE/DELETE):**
- ✅ Solo super_admins

---

## 🧪 Testing y Validación

### Build Exitoso ✅
```bash
npm run build
# ✓ Compiled successfully
# ✓ Build completed
```

### Tests Recomendados

1. **Sincronización inicial:**
   ```bash
   # Como super_admin, ejecutar:
   POST /api/admin/geo/sync-dpa
   
   # Verificar en Supabase:
   SELECT COUNT(*) FROM geo_regions;  -- Debe ser 16
   SELECT COUNT(*) FROM geo_communes; -- Debe ser ~346
   ```

2. **Crear empleado nuevo:**
   - ✅ Seleccionar región
   - ✅ Ver comunas filtradas
   - ✅ Seleccionar comuna
   - ✅ Guardar y verificar en BD

3. **Editar empleado antiguo (legacy):**
   - ✅ Ver advertencia de ubicación legacy
   - ✅ Botón "Normalizar" funciona
   - ✅ Seleccionar nueva región/comuna actualiza IDs
   - ✅ Sin tocar nada, mantiene legacy

4. **Backfill:**
   ```sql
   -- Ver preview
   SELECT * FROM preview_location_backfill();
   
   -- Ejecutar
   SELECT * FROM backfill_employee_locations();
   ```

---

## 📈 Estadísticas y Monitoreo

### Consultas Útiles

**Ver todas las regiones activas:**
```sql
SELECT * FROM geo_regions WHERE active = true ORDER BY name;
```

**Ver comunas de una región:**
```sql
SELECT c.name as comuna, r.name as region
FROM geo_communes c
JOIN geo_regions r ON c.region_id = r.id
WHERE r.name = 'Metropolitana de Santiago'
  AND c.active = true
ORDER BY c.name;
```

**Contar empleados por ubicación:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE region_id IS NOT NULL) as con_region_id,
  COUNT(*) FILTER (WHERE region_id IS NULL AND region_name_legacy IS NOT NULL) as solo_legacy,
  COUNT(*) FILTER (WHERE region_id IS NULL AND region_name_legacy IS NULL) as sin_ubicacion
FROM employees;
```

**Regiones más comunes:**
```sql
SELECT 
  r.name, 
  COUNT(e.id) as empleados
FROM geo_regions r
LEFT JOIN employees e ON e.region_id = r.id
GROUP BY r.id, r.name
ORDER BY empleados DESC;
```

**Último sync:**
```sql
SELECT * FROM geo_sync_logs ORDER BY created_at DESC LIMIT 1;
```

### Desde el código

```typescript
import { getLocationUsageStats } from '@/lib/utils/employeeLocationHelper'

const stats = await getLocationUsageStats()
console.log({
  total_employees: stats.total_employees,
  using_ids: stats.using_ids,          // Normalizados
  using_legacy: stats.using_legacy,    // Legacy
  no_location: stats.no_location       // Sin ubicación
})
```

---

## 🚀 Pasos para Despliegue

### 1. Ejecutar Migraciones
```bash
cd /path/to/proyecto
npx supabase db push

# Verificar que se crearon las tablas
# Supabase Dashboard → Table Editor → ver geo_regions, geo_communes
```

### 2. Sincronización Inicial (CRÍTICO)
```bash
# Desde la aplicación web, como super_admin:
# 1. Login como super_admin
# 2. Abrir consola del navegador (F12)
# 3. Ejecutar:

fetch('/api/admin/geo/sync-dpa', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}).then(res => res.json()).then(console.log)

# Debe retornar:
# { success: true, data: { regions: 16, provinces: 56, communes: 346 } }
```

### 3. Verificar Sync
```sql
-- En Supabase Dashboard → SQL Editor:
SELECT COUNT(*) FROM geo_regions WHERE active = true;  -- 16
SELECT COUNT(*) FROM geo_communes WHERE active = true; -- ~346
```

### 4. Deploy de la Aplicación
```bash
# Build local (ya verificado ✅)
npm run build

# Deploy
git add .
git commit -m "feat: Sistema de regiones y comunas de Chile"
git push origin main
```

### 5. Backfill Opcional (después del deploy)
```sql
-- Conectarse a producción
SELECT * FROM preview_location_backfill();  # Verificar
SELECT * FROM backfill_employee_locations(); # Ejecutar
```

---

## 🐛 Troubleshooting

### Problema: Dropdowns vacíos
**Causa:** No se ejecutó sincronización inicial  
**Solución:**
```sql
SELECT COUNT(*) FROM geo_regions;
-- Si retorna 0, ejecutar POST /api/admin/geo/sync-dpa
```

### Problema: "No hay comunas para esta región"
**Causa:** Sincronización falló o región sin comunas  
**Solución:** Ejecutar sync nuevamente

### Problema: API DPA no responde
**Causa:** API del gobierno caída temporalmente  
**Solución:** 
- El sistema sigue funcionando con datos en BD
- Reintentar sync más tarde
- Los datos locales son suficientes

### Problema: Empleados antiguos muestran "Sin ubicación"
**Causa:** No tienen `region_id` ni `region_name_legacy`  
**Solución:** Normal si nunca tuvieron ubicación registrada

### Problema: Error "super_admin required" al hacer sync
**Causa:** Usuario no tiene rol super_admin  
**Solución:** Verificar rol en `users.raw_user_meta_data->>'role'`

---

## 📝 Notas Importantes

### ⚠️ Retrocompatibilidad
- **NO** eliminar columnas `region_name_legacy` / `city_name_legacy`
- Se mantienen como fallback para trabajadores antiguos
- El sistema prioriza IDs sobre legacy

### 🔄 Migración Progresiva
- Nuevos trabajadores → usan IDs automáticamente
- Trabajadores editados → pueden actualizar a IDs
- Trabajadores no tocados → siguen con legacy (funciona bien)

### 💾 Soft Delete
- Regiones/comunas NO se eliminan, se desactivan
- Empleados con IDs de ubicaciones inactivas → siguen mostrando el nombre
- Solo dropdowns ocultan ubicaciones inactivas

### 🔍 Sincronización
- **Primera vez**: Obligatoria después de migración
- **Periódica**: Opcional, solo si DPA cambia
- **No runtime**: Frontend NUNCA llama API DPA, solo BD local

---

## 📚 Recursos Adicionales

### API DPA Gobierno de Chile
- **Base URL**: `https://apis.digital.gob.cl/dpa/`
- **Endpoints**:
  - `/regiones` - Lista de regiones
  - `/provincias` - Lista de provincias
  - `/comunas` - Lista de comunas
- **Documentación**: https://apis.digital.gob.cl/

### Archivos Clave
- `supabase/migrations/087_add_geo_regions_communes.sql` - Migración principal
- `supabase/migrations/088_backfill_employee_location_optional.sql` - Backfill
- `lib/utils/employeeLocationHelper.ts` - Helper functions
- `components/RegionCommuneSelector.tsx` - Componente UI
- `app/api/admin/geo/sync-dpa/route.ts` - API sync
- `app/api/geo/regions/route.ts` - API lectura regiones
- `app/api/geo/communes/route.ts` - API lectura comunas

---

## ✅ Checklist de Implementación

- [x] Crear tablas geo_* en Supabase
- [x] Agregar columnas a employees
- [x] RLS configurado
- [x] Helper de retrocompatibilidad
- [x] API POST /api/admin/geo/sync-dpa
- [x] API GET /api/geo/regions
- [x] API GET /api/geo/communes
- [x] Componente RegionCommuneSelector
- [x] Integración en formulario de crear
- [x] Integración en formulario de editar
- [x] Función de normalización
- [x] Script de backfill opcional
- [x] Build exitoso sin errores
- [x] Documentación completa
- [ ] **PENDIENTE: Ejecutar sync inicial** ⚠️

---

## 🎉 Conclusión

El Sistema de Regiones y Comunas ha sido implementado exitosamente con:

- ✅ **100% de retrocompatibilidad** - nada se rompe
- ✅ **Datos oficiales** - API DPA Gobierno de Chile
- ✅ **Sin dependencia runtime** - BD local, no API en producción
- ✅ **UX profesional** - dropdowns dependientes
- ✅ **Migración segura** - backfill opcional
- ✅ **Código limpio** - bien estructurado y documentado
- ✅ **Build exitoso** - sin errores de compilación

**Próximo paso crítico**: Ejecutar sincronización inicial con API DPA

---

**Última actualización:** Enero 2025  
**Versión:** 1.0  
**Estado:** ✅ Completado (pendiente sync inicial)


