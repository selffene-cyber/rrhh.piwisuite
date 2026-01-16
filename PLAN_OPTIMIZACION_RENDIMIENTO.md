# 🚀 PLAN DE OPTIMIZACIÓN DE RENDIMIENTO
## RRHH Piwi Suite - Análisis y Estrategia

---

## 📊 DIAGNÓSTICO ACTUAL

### Problemas Identificados:

1. **Consultas Ineficientes a la Base de Datos**
   - ✅ **84 ocurrencias de `select('*')`** en el código
   - ✅ Consultas secuenciales cuando podrían ser paralelas
   - ✅ Falta de paginación en tablas grandes
   - ✅ Consultas N+1 (consultas dentro de loops)

2. **Problemas de Renderizado**
   - ✅ Falta de memoización (`useMemo`, `useCallback`, `React.memo`)
   - ✅ Re-renders innecesarios de componentes pesados
   - ✅ Dashboard carga múltiples consultas al montar

3. **Falta de Caché**
   - ✅ Datos estáticos se consultan repetidamente
   - ✅ Indicadores de Previred ya tienen caché, pero otros datos no

4. **Índices de Base de Datos**
   - ⚠️ Algunos campos usados en WHERE no tienen índices
   - ⚠️ Faltan índices compuestos para consultas frecuentes

---

## 🎯 ESTRATEGIA DE OPTIMIZACIÓN

### **FASE 1: Optimización de Consultas SQL (Impacto: ALTO)**
**Tiempo estimado: 2-3 días**
**Mejora esperada: 40-60% más rápido**

#### 1.1 Reemplazar `select('*')` por campos específicos
- **Archivos afectados**: ~84 archivos
- **Ejemplo**:
  ```typescript
  // ❌ ANTES
  .select('*')
  
  // ✅ DESPUÉS
  .select('id, full_name, rut, status, company_id')
  ```
- **Beneficio**: Reduce transferencia de datos en 30-70%

#### 1.2 Paralelizar consultas independientes
- **Archivos clave**:
  - `app/page.tsx` (Dashboard)
  - `app/payroll/new/page.tsx`
  - `app/employees/[id]/page.tsx`
- **Ejemplo**:
  ```typescript
  // ❌ ANTES (secuencial)
  const employees = await loadEmployees()
  const payroll = await loadPayroll()
  
  // ✅ DESPUÉS (paralelo)
  const [employees, payroll] = await Promise.all([
    loadEmployees(),
    loadPayroll()
  ])
  ```

#### 1.3 Implementar paginación en tablas grandes
- **Archivos**:
  - `app/employees/page.tsx`
  - `app/payroll/page.tsx`
  - `app/loans/page.tsx`
  - `app/certificates/page.tsx`
- **Implementación**: Paginación de 20-50 registros por página
- **Beneficio**: Carga inicial 80-90% más rápida

#### 1.4 Eliminar consultas N+1
- **Ejemplo en `app/payroll/bulk/page.tsx`**:
  ```typescript
  // ❌ ANTES (N+1)
  for (const emp of employees) {
    const payroll = await getPayroll(emp.id)
  }
  
  // ✅ DESPUÉS (1 consulta)
  const payrolls = await getPayrollsForEmployees(employeeIds)
  ```

---

### **FASE 2: Optimización de Índices (Impacto: MEDIO-ALTO)**
**Tiempo estimado: 1 día**
**Mejora esperada: 20-40% más rápido en consultas filtradas**

#### 2.1 Crear índices faltantes
```sql
-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_payroll_slips_employee_status 
  ON payroll_slips(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_company_status 
  ON employees(company_id, status);

CREATE INDEX IF NOT EXISTS idx_loans_employee_status 
  ON loans(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_advances_employee_period 
  ON advances(employee_id, period);

-- Índices para filtros de fecha
CREATE INDEX IF NOT EXISTS idx_vacations_employee_dates 
  ON vacations(employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_medical_leaves_employee_dates 
  ON medical_leaves(employee_id, start_date, end_date);
```

#### 2.2 Índices para RLS (Row Level Security)
- Asegurar que `company_id` tenga índice en todas las tablas multi-tenant

---

### **FASE 3: Memoización y Optimización de React (Impacto: MEDIO)**
**Tiempo estimado: 2-3 días**
**Mejora esperada: 30-50% menos re-renders**

#### 3.1 Memoizar componentes pesados
- **Archivos clave**:
  - `app/page.tsx` (Dashboard)
  - `app/payroll/new/page.tsx`
  - `components/PayrollPDF.tsx`
- **Implementación**:
  ```typescript
  // Memoizar cálculos costosos
  const expensiveCalculation = useMemo(() => {
    return calculatePayroll(data)
  }, [data])
  
  // Memoizar callbacks
  const handleSubmit = useCallback(() => {
    // ...
  }, [dependencies])
  
  // Memoizar componentes
  const MemoizedTable = React.memo(DataTable)
  ```

#### 3.2 Optimizar useEffect
- Evitar dependencias innecesarias
- Usar `useMemo` para valores calculados en dependencias
- Debounce en inputs de búsqueda/filtros

#### 3.3 Lazy loading de componentes pesados
```typescript
// Cargar PDFs solo cuando se necesiten
const PayrollPDF = dynamic(() => import('@/components/PayrollPDF'), {
  ssr: false,
  loading: () => <div>Cargando PDF...</div>
})
```

---

### **FASE 4: Sistema de Caché (Impacto: ALTO)**
**Tiempo estimado: 2 días**
**Mejora esperada: 50-80% más rápido en datos repetidos**

#### 4.1 Caché en memoria (React Query / SWR)
- **Datos a cachear**:
  - Lista de empleados (por empresa)
  - Indicadores de Previred (ya existe, mejorar)
  - Configuración de empresa
  - Tipos de certificados, permisos, etc.

#### 4.2 Implementar React Query
```typescript
// Hook personalizado
const { data: employees, isLoading } = useQuery({
  queryKey: ['employees', companyId],
  queryFn: () => fetchEmployees(companyId),
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000 // 10 minutos
})
```

#### 4.3 Caché de cálculos pesados
- Cachear resultados de `calculatePayroll` para períodos ya calculados
- Cachear proyecciones del dashboard

---

### **FASE 5: Optimización del Dashboard (Impacto: ALTO)**
**Tiempo estimado: 1-2 días**
**Mejora esperada: 60-70% más rápido en carga inicial**

#### 5.1 Cargar datos críticos primero
- Mostrar skeleton/loading solo para datos críticos
- Cargar gráficos y estadísticas secundarias después

#### 5.2 Lazy load de secciones no visibles
- Cargar gráficos solo cuando están en viewport
- Cargar ranking de empleados bajo demanda

#### 5.3 Optimizar consultas del dashboard
```typescript
// ❌ ANTES: Múltiples consultas
const employees = await getEmployees()
const payroll = await getPayroll()
const loans = await getLoans()

// ✅ DESPUÉS: Una consulta agregada o paralela
const [employees, payroll, loans] = await Promise.all([
  getEmployees(),
  getPayroll(),
  getLoans()
])
```

---

### **FASE 6: Optimización de UI/UX (Impacto: MEDIO)**
**Tiempo estimado: 1 día**
**Mejora esperada: Percepción de velocidad mejorada**

#### 6.1 Loading states optimistas
- Mostrar datos anteriores mientras cargan nuevos
- Skeleton screens en lugar de spinners genéricos

#### 6.2 Debounce en búsquedas y filtros
```typescript
const debouncedSearch = useMemo(
  () => debounce((value) => {
    performSearch(value)
  }, 300),
  []
)
```

#### 6.3 Virtualización de listas grandes
- Usar `react-window` o `react-virtual` para tablas con muchos registros

---

## 📈 PRIORIZACIÓN RECOMENDADA

### **Sprint 1 (Impacto Inmediato - 1 semana)**
1. ✅ Fase 1.1: Reemplazar `select('*')` (2 días)
2. ✅ Fase 1.2: Paralelizar consultas (1 día)
3. ✅ Fase 2: Crear índices (1 día)
4. ✅ Fase 5: Optimizar dashboard (1 día)

**Resultado esperado**: 50-70% de mejora en velocidad

### **Sprint 2 (Optimización Avanzada - 1 semana)**
1. ✅ Fase 1.3: Implementar paginación (2 días)
2. ✅ Fase 3: Memoización React (2 días)
3. ✅ Fase 4: Sistema de caché (2 días)

**Resultado esperado**: 80-90% de mejora total

### **Sprint 3 (Refinamiento - 3 días)**
1. ✅ Fase 6: UI/UX optimista
2. ✅ Testing de rendimiento
3. ✅ Ajustes finales

---

## 🛠️ HERRAMIENTAS RECOMENDADAS

1. **React Query** (`@tanstack/react-query`)
   - Caché automático
   - Revalidación inteligente
   - Estado de carga unificado

2. **React.memo / useMemo / useCallback**
   - Ya incluidos en React
   - Sin dependencias adicionales

3. **Next.js Image Optimization**
   - Para logos e imágenes (si aplica)

4. **Supabase Query Optimization**
   - Usar `.select()` específico
   - Aprovechar índices existentes

---

## 📊 MÉTRICAS DE ÉXITO

### Antes de optimización:
- ⏱️ Tiempo de carga del dashboard: ~3-5 segundos
- ⏱️ Tiempo de carga de lista de empleados: ~2-3 segundos
- ⏱️ Tiempo de creación de liquidación: ~4-6 segundos

### Después de optimización (objetivo):
- ⏱️ Tiempo de carga del dashboard: <1 segundo
- ⏱️ Tiempo de carga de lista de empleados: <0.5 segundos
- ⏱️ Tiempo de creación de liquidación: <2 segundos

---

## ⚠️ CONSIDERACIONES

1. **Compatibilidad**: Todas las optimizaciones deben mantener la funcionalidad actual
2. **Testing**: Probar cada fase antes de continuar
3. **Rollback**: Mantener commits pequeños para fácil reversión
4. **Monitoreo**: Agregar logging de tiempos de carga para medir mejoras

---

## 🎯 CONCLUSIÓN

Este plan aborda los problemas de rendimiento de forma sistemática, priorizando las mejoras de mayor impacto. La implementación en sprints permite ver mejoras incrementales y ajustar la estrategia según resultados.

**Impacto total esperado**: 70-90% de mejora en velocidad general de la aplicación.

---

¿Quieres que comience con alguna fase específica o prefieres revisar el plan primero?

