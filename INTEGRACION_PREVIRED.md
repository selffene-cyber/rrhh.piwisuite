# Integración con Indicadores Previsionales de Previred

## Resumen

El sistema ahora integra automáticamente los indicadores previsionales de Previred utilizando la API de **Gael Cloud**, que proporciona datos actualizados mes a mes.

## API Utilizada

- **URL Base**: `https://api.gael.cloud/general/public/previred/`
- **Formato**: `MMYYYY` (ej: `082025` para agosto 2025)
- **Ejemplo**: `https://api.gael.cloud/general/public/previred/082025`

## Funcionamiento

1. **Obtención Automática**: Al crear una liquidación, el sistema:
   - Consulta la base de datos local para ver si ya tiene los indicadores del mes/año
   - Si no existen, consulta la API de Gael Cloud
   - Guarda los indicadores en cache para próximas consultas

2. **Cálculo Dinámico**: Los porcentajes de:
   - **AFP**: Varían según la AFP (PROVIDA, HABITAT, etc.) y se obtienen de los indicadores
   - **Salud**: 7% para ISAPRE, 0% para FONASA
   - **Seguro de Cesantía**: 0.6% del trabajador
   - **Impuesto Único**: Tabla progresiva actualizada

3. **Cache Local**: Los indicadores se almacenan en la tabla `previred_indicators` para:
   - Evitar consultas repetidas a la API
   - Funcionar offline si ya se consultaron previamente
   - Mantener histórico de indicadores por mes/año

## Configuración Inicial

### 1. Ejecutar Migración SQL

Ejecuta el siguiente SQL en Supabase para crear la tabla de indicadores:

```sql
-- Ver archivo: supabase/indicators_table.sql
```

O ejecuta directamente:

```sql
CREATE TABLE IF NOT EXISTS previred_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  uf_value DECIMAL(12, 2),
  utm_value DECIMAL(12, 2),
  uta_value DECIMAL(12, 2),
  rti_afp_pesos DECIMAL(12, 2),
  rti_ips_pesos DECIMAL(12, 2),
  rti_seg_ces_pesos DECIMAL(12, 2),
  rmi_trab_depe_ind DECIMAL(12, 2),
  rmi_men18_may65 DECIMAL(12, 2),
  rmi_trab_casa_part DECIMAL(12, 2),
  rmi_no_remu DECIMAL(12, 2),
  indicators_json JSONB,
  source VARCHAR(50) DEFAULT 'gael_cloud',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_previred_indicators_period ON previred_indicators(year, month);
```

### 2. Verificar Funcionamiento

Al crear una nueva liquidación:
1. Selecciona el mes y año
2. El sistema automáticamente obtendrá los indicadores de ese período
3. Los cálculos usarán los valores actualizados de Previred

## Tasas por AFP (Valores de Referencia - Diciembre 2025)

Según [Previred](https://www.previred.com/indicadores-previsionales/):

| AFP | Trabajador | Empleador | Total |
|-----|------------|-----------|-------|
| CAPITAL | 11.44% | 0.1% | 11.54% |
| CUPRUM | 11.44% | 0.1% | 11.54% |
| HABITAT | 11.27% | 0.1% | 11.37% |
| PLANVITAL | 11.16% | 0.1% | 11.26% |
| PROVIDA | 11.45% | 0.1% | 11.55% |
| MODELO | 10.58% | 0.1% | 10.68% |
| UNO | 10.46% | 0.1% | 10.56% |

**Nota**: Estos valores pueden cambiar mes a mes. El sistema intenta obtenerlos de la API, pero si no están disponibles, usa estos valores por defecto.

## Seguro de Cesantía

- **Contrato Plazo Indefinido**: 
  - Empleador: 2.4% R.I.
  - Trabajador: 0.6% R.I.
- **Contrato Plazo Fijo**: 
  - Empleador: 3.0% R.I.
  - Trabajador: 0%

## Salud

- **ISAPRE**: 7% del trabajador (sobre renta imponible)
- **FONASA**: 0% del trabajador (el empleador paga el 7%)

## Ventajas de la Integración

✅ **Actualización Automática**: Los indicadores se actualizan automáticamente cada mes
✅ **Cache Local**: Evita consultas repetidas a la API
✅ **Histórico**: Mantiene registro de indicadores por mes/año
✅ **Offline**: Funciona con datos cacheados si la API no está disponible
✅ **Precisión**: Usa valores oficiales de Previred

## Solución de Problemas

### Si la API no responde:

1. El sistema usará valores por defecto basados en los últimos indicadores conocidos
2. Puedes ingresar manualmente los indicadores desde Supabase
3. Los cálculos seguirán funcionando con los valores cacheados

### Para actualizar manualmente:

1. Ve a Supabase → Table Editor → `previred_indicators`
2. Edita o crea un registro para el mes/año deseado
3. El campo `indicators_json` contiene todos los datos en formato JSON

## Referencias

- [Indicadores Previsionales Previred](https://www.previred.com/indicadores-previsionales/)
- [API Gael Cloud](https://api.gael.cloud/)


