# Manual de Regímenes Previsionales

## Índice

1. [Introducción](#introducción)
2. [Régimen AFP (Previred)](#régimen-afp-previred)
3. [Regímenes Especiales](#regímenes-especiales)
4. [Configuración en la Ficha del Trabajador](#configuración-en-la-ficha-del-trabajador)
5. [Impacto en Liquidaciones](#impacto-en-liquidaciones)
6. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

El sistema de gestión de RRHH Piwi soporta dos tipos de regímenes previsionales:

1. **AFP (Sistema Previred)**: El sistema previsional estándar chileno con cotizaciones automáticas desde Previred.
2. **Regímenes Especiales**: Para personal uniformado (DIPRECA, CAPREDENA), trabajadores sin previsión, u otros casos especiales.

Esta dualidad permite gestionar correctamente las liquidaciones de todos los tipos de trabajadores, respetando las normativas específicas de cada régimen.

---

## Régimen AFP (Previred)

### ¿Qué es?

El sistema previsional estándar para trabajadores del sector privado en Chile, regulado por el DL 3500/1980.

### Componentes

#### 1. **AFP (Administradora de Fondos de Pensiones)**

- **Cotización Trabajador**: ~10-13% (incluye cotización obligatoria 10% + comisión de la AFP)
- **Tasas automáticas**: El sistema obtiene las tasas actualizadas desde Previred según el período de la liquidación.
- **AFPs disponibles**:
  - Capital
  - Cuprum
  - Habitat
  - Planvital
  - Provida
  - Modelo
  - Uno

#### 2. **SIS (Seguro de Invalidez y Sobrevivencia)**

- **Paga**: Empleador (no descuento al trabajador)
- **Tasa**: Automática desde Previred (~1.54% aprox.)
- **Aplica solo a AFP**

#### 3. **Salud**

Opciones:
- **FONASA**: 7% del imponible
- **ISAPRE**: % variable según plan (se configura en UF, se calcula al momento de la liquidación)

#### 4. **AFC (Seguro de Cesantía)**

- **Trabajador**: ~0.6% (contratos indefinidos) o nada (contratos a plazo fijo)
- **Empleador**: ~2.4% (indefinidos) o ~3% (plazo fijo)
- **Excepciones**: NO se aplica AFC a:
  - Personal con régimen DIPRECA o CAPREDENA
  - Trabajadores del sector público
  - Pensionados
  - Personal de casa particular puertas adentro

### Configuración

Al seleccionar **"AFP (Sistema Previred)"** en la ficha del trabajador, se deben completar:

1. **AFP**: Seleccionar de la lista
2. **Sistema de Salud**: FONASA o ISAPRE
3. **Plan de Salud** (opcional): Nombre del plan ISAPRE
4. **Monto Plan ISAPRE** (si aplica): Valor en UF

**Ejemplo:**

```
Régimen: AFP (Sistema Previred)
AFP: PROVIDA
Sistema de Salud: ISAPRE
Plan de Salud: Plan Platino
Monto Plan ISAPRE: 2.4 UF
```

### Cálculo Automático

El sistema realiza automáticamente:

1. **Obtención de indicadores**: Conecta a la API de Previred para obtener:
   - Tasas de AFP (cotización + comisión)
   - Tasa SIS
   - Tasas AFC (trabajador y empleador)
   - Valor UF (para planes ISAPRE)

2. **Cálculo de descuentos**:
   ```
   Base Imponible = Sueldo Base + Bonos + Gratificación + Horas Extras + Vacaciones
   
   AFP = Base Imponible × Tasa AFP Trabajador
   SIS = Base Imponible × Tasa SIS (paga empleador)
   Salud FONASA = Base Imponible × 7%
   Salud ISAPRE = UF_actual × Monto_Plan_UF
   AFC Trabajador = Base Imponible × Tasa AFC Trabajador (si aplica)
   AFC Empleador = Base Imponible × Tasa AFC Empleador (si aplica)
   ```

3. **Generación de liquidación**: Muestra todos los descuentos legales correctamente clasificados.

---

## Regímenes Especiales

### ¿Qué son?

Sistemas previsionales especiales para:

- Personal uniformado (Carabineros, FFAA, etc.)
- Trabajadores sin previsión
- Casos especiales con cotizaciones manuales

### Tipos Disponibles

#### 1. **DIPRECA** (Dirección de Previsión de Carabineros de Chile)

- **Aplica a**: Carabineros de Chile y su personal
- **Cotización Trabajador**: ~6-10% (varía según tramo)
- **Cotización Empleador**: ~16% aprox.
- **Salud**: Generalmente 7% (FONASA)
- **AFC**: NO aplica
- **SIS**: NO aplica

#### 2. **CAPREDENA** (Caja de Previsión de la Defensa Nacional)

- **Aplica a**: Personal de las Fuerzas Armadas
- **Cotización Trabajador**: Variable según tramo
- **Cotización Empleador**: Variable
- **Salud**: Generalmente 7% (FONASA)
- **AFC**: NO aplica
- **SIS**: NO aplica

#### 3. **Sin Previsión** (Art. 24 DL 3500)

- **Aplica a**: Trabajadores exentos de cotización previsional
- **Casos**: Pensionados que vuelven a trabajar, extranjeros no obligados, etc.
- **Cotización**: 0%
- **Salud**: Puede aplicar 7% FONASA u otro %
- **AFC**: Generalmente NO aplica

#### 4. **Otro Régimen Especial**

- Para casos no cubiertos por los anteriores
- Permite configuración completamente manual

### Configuración

Al seleccionar **"Régimen Especial (DIPRECA, CAPREDENA, etc.)"**, se deben completar:

#### Campos Obligatorios:

1. **Tipo de Régimen Especial**: Seleccionar de la lista
2. **Porcentaje Salud Trabajador**: Generalmente 7%
3. **Base de Cálculo**: 
   - **Total Imponible**: Sueldo + bonos + gratificación
   - **Solo Sueldo Base**: Solo el sueldo base

#### Campos Opcionales:

4. **Etiqueta para Liquidación**: Cómo aparecerá en las liquidaciones (ej: "Cotización DIPRECA")
5. **Porcentaje Previsión Trabajador**: % que se descuenta al trabajador
6. **Porcentaje Empleador**: Solo para reportes y cálculos de costos

**Ejemplo DIPRECA:**

```
Régimen: Régimen Especial
Tipo: DIPRECA - Dir. Previsión Carabineros de Chile
Etiqueta: Cotización DIPRECA
Porcentaje Previsión Trabajador: 8.5%
Porcentaje Salud Trabajador: 7%
Base de Cálculo: Total Imponible
Porcentaje Empleador: 16%
```

**Ejemplo Sin Previsión:**

```
Régimen: Régimen Especial
Tipo: Sin Previsión (Art. 24 DL 3500)
Etiqueta: Sin Previsión
Porcentaje Previsión Trabajador: 0%
Porcentaje Salud Trabajador: 7%
Base de Cálculo: Total Imponible
Porcentaje Empleador: 0%
```

### Cálculo Manual

Para regímenes especiales, el cálculo es manual:

```
Base de Cálculo = 
  Si "Total Imponible": Sueldo Base + Bonos + Gratificación + Horas Extras + Vacaciones
  Si "Solo Sueldo Base": Sueldo Base

Cotización Previsional = Base de Cálculo × Porcentaje Previsión Trabajador
Cotización Salud = Base de Cálculo × Porcentaje Salud Trabajador
Cotización Empleador = Base de Cálculo × Porcentaje Empleador (solo para reportes)

SIS = No aplica
AFC = No aplica
```

---

## Configuración en la Ficha del Trabajador

### Proceso paso a paso

#### 1. Ingresar a Gestión de Trabajadores

- Ir a "Lista de Trabajadores"
- Clic en "Nuevo Trabajador" o editar uno existente

#### 2. Completar Datos Personales y Laborales

- Nombre, RUT, cargo, sueldo base, etc.

#### 3. Seleccionar Régimen Previsional

En la sección **"Régimen Previsional"**:

**Opción A: AFP (Sistema Previred)**

1. Seleccionar "AFP (Sistema Previred)"
2. Elegir la AFP del trabajador
3. Elegir sistema de salud (FONASA o ISAPRE)
4. Si es ISAPRE, ingresar plan y monto en UF
5. **Listo**: El sistema calculará automáticamente todo

**Opción B: Régimen Especial**

1. Seleccionar "Régimen Especial (DIPRECA, CAPREDENA, etc.)"
2. Elegir el tipo de régimen
3. Configurar porcentajes manualmente:
   - % Previsión Trabajador
   - % Salud Trabajador
   - % Empleador (opcional)
4. Elegir base de cálculo
5. Personalizar etiqueta si es necesario
6. **Listo**: El sistema aplicará los porcentajes configurados

#### 4. Guardar

- Clic en "Guardar" o "Actualizar"
- El régimen queda configurado para todas las liquidaciones futuras

---

## Impacto en Liquidaciones

### Liquidación AFP

```
HABERES IMPONIBLES
Sueldo Base                          $800,000
Gratificación                        $100,000
TOTAL IMPONIBLE                      $900,000

DESCUENTOS LEGALES
AFP PROVIDA (11.44%)                 $102,960
  - Cotización Obligatoria (10%)      $90,000
  - Comisión AFP (1.44%)              $12,960
Salud FONASA (7%)                     $63,000
AFC Trabajador (0.6%)                  $5,400
Impuesto Único                        $12,500
TOTAL DESCUENTOS                     $183,860

LÍQUIDO A PAGAR                      $716,140

APORTES EMPLEADOR (No descuento)
SIS (1.54%)                          $13,860
AFC Empleador (2.4%)                 $21,600
TOTAL APORTES EMPLEADOR              $35,460
```

### Liquidación DIPRECA

```
HABERES IMPONIBLES
Sueldo Base                          $800,000
Gratificación                        $100,000
TOTAL IMPONIBLE                      $900,000

DESCUENTOS LEGALES
Cotización DIPRECA (8.5%)            $76,500
Salud (7%)                           $63,000
Impuesto Único                       $12,500
TOTAL DESCUENTOS                     $152,000

LÍQUIDO A PAGAR                      $748,000

APORTES EMPLEADOR (No descuento)
Cotización DIPRECA Empleador (16%)   $144,000
TOTAL APORTES EMPLEADOR              $144,000

NOTA: No se aplica SIS ni AFC en este régimen.
```

### Diferencias Clave

| Concepto | AFP | Régimen Especial |
|----------|-----|------------------|
| **Cotización Previsional** | Automática desde Previred | Manual según configuración |
| **SIS** | Sí (automático) | No |
| **AFC** | Sí (si aplica según contrato) | No |
| **Salud** | FONASA 7% o ISAPRE en UF | % manual (generalmente 7%) |
| **Base de Cálculo** | Siempre total imponible | Configurable (imponible o solo base) |
| **Actualización** | Automática mensual | Manual (requiere actualizar % si cambian) |

---

## Preguntas Frecuentes

### ¿Puedo cambiar el régimen de un trabajador?

**Sí**, pero con precaución:

1. Editar la ficha del trabajador
2. Cambiar el régimen previsional
3. Completar la nueva configuración
4. Guardar

**Importante**: El cambio afectará todas las liquidaciones futuras. Las liquidaciones ya generadas NO se modifican.

### ¿Qué pasa si ingreso mal los porcentajes?

- Las liquidaciones se calcularán con los % incorrectos
- **Solución**: Editar la ficha del trabajador y corregir los porcentajes
- Regenerar las liquidaciones afectadas (si es posible) o crear notas de crédito/débito

### ¿Cómo sé qué porcentajes usar para DIPRECA?

- **Oficial**: Consultar con el trabajador o con la institución (DIPRECA, CAPREDENA)
- **Referencia general**:
  - DIPRECA trabajador: 6-10% (varía según tramo)
  - DIPRECA empleador: ~16%
  - Salud: 7%

### ¿Los porcentajes de regímenes especiales se actualizan solos?

**No**. A diferencia de AFP, los regímenes especiales requieren actualización manual si cambian las tasas. Recomendamos:

- Revisar anualmente las tasas con la institución correspondiente
- Actualizar masivamente si es necesario

### ¿Puedo tener trabajadores con AFP y DIPRECA en la misma empresa?

**Sí**, completamente. Cada trabajador tiene su régimen configurado individualmente.

### ¿Cómo afecta esto a los reportes?

Los reportes de costos y liquidaciones reflejarán correctamente:

- Descuentos legales según régimen
- Aportes del empleador (SIS, AFC, o cotizaciones empleador)
- Totales líquidos a pagar

Los reportes previsionales (para Previred) solo incluirán trabajadores con régimen AFP.

### ¿Qué pasa con el Seguro de Cesantía (AFC) en regímenes especiales?

Según la normativa DT, los siguientes trabajadores **NO cotizan AFC**:

- Personal con DIPRECA o CAPREDENA
- Trabajadores del sector público
- Pensionados que vuelven a trabajar
- Personal de casa particular puertas adentro

Por lo tanto, en regímenes especiales, AFC NO se calcula ni se descuenta.

### ¿Puedo configurar un régimen mixto?

**No directamente**. Un trabajador solo puede tener un régimen a la vez. Si hay casos especiales (ej: trabajador que cotiza en dos sistemas), se debe:

1. Configurar el régimen principal en el sistema
2. Hacer ajustes manuales en las liquidaciones o crear conceptos adicionales

### ¿Cómo migro trabajadores existentes al nuevo sistema?

Si ya tienes trabajadores en el sistema (versión anterior):

1. **Trabajadores AFP**: Se migran automáticamente como régimen AFP
2. **Trabajadores con configuración especial**: Debes editarlos uno por uno y configurar el régimen especial correspondiente

---

## Soporte y Contacto

Para dudas adicionales o casos especiales:

- **Email**: soporte@piwi.cl
- **Teléfono**: +56 9 XXXX XXXX
- **Documentación adicional**: Revisar Manual de Ficha del Trabajador

---

**Última actualización**: Enero 2026  
**Versión del manual**: 1.0  
**Sistema**: RH Piwi - Gestión de Recursos Humanos


