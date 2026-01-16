# Manual de Usuario - Ficha del Trabajador

## Índice
1. [Introducción](#introducción)
2. [Crear un Nuevo Trabajador](#crear-un-nuevo-trabajador)
3. [Campos de la Ficha](#campos-de-la-ficha)
4. [Campos AFP y Salud - Explicación Detallada](#campos-afp-y-salud---explicación-detallada)
5. [Editar un Trabajador Existente](#editar-un-trabajador-existente)
6. [Estados del Trabajador](#estados-del-trabajador)
7. [Permisos y Acceso](#permisos-y-acceso)

---

## Introducción

La **Ficha del Trabajador** es el registro maestro de cada empleado en el sistema. Contiene toda la información personal, contractual, bancaria y previsional necesaria para la gestión de remuneraciones y cumplimiento legal.

### ¿Quién puede acceder?
- **Super Admin**: Acceso total a todos los trabajadores
- **Owner/Admin**: Acceso a trabajadores de su(s) empresa(s)
- **Usuario Regular**: Solo puede ver trabajadores asignados a sus centros de costo

---

## Crear un Nuevo Trabajador

### Acceso
1. Ir a **Trabajadores** → **Lista de Trabajadores**
2. Hacer clic en el botón **"+ Nuevo Trabajador"**

### Requisitos Previos
- Tener una empresa seleccionada
- Tener permisos de admin/owner

---

## Campos de la Ficha

### 1. Información Personal

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| **Nombre Completo** | Texto | ✅ Sí | Nombre y apellidos del trabajador |
| **RUT** | Texto | ✅ Sí | RUT con formato chileno (debe ser único en el sistema) |
| **Fecha de Nacimiento** | Fecha | ❌ No | Para cálculos de edad y beneficios |
| **Dirección** | Texto | ❌ No | Domicilio del trabajador |
| **Teléfono** | Texto | ❌ No | Contacto telefónico |
| **Email** | Email | ❌ No | Correo electrónico (si se ingresa, se puede crear acceso al portal) |

### 2. Información Contractual

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| **Fecha de Ingreso** | Fecha | ✅ Sí | Fecha de inicio del contrato |
| **Cargo** | Texto | ✅ Sí | Posición o cargo del trabajador |
| **Tipo de Contrato** | Selector | ✅ Sí | Opciones: Indefinido, Plazo Fijo, Obra o Faena, Honorarios, Otro |
| **Fecha Término Contrato** | Fecha | ❌ Condicional | Solo si es contrato a plazo fijo |
| **Descripción Otro Contrato** | Texto | ❌ Condicional | Solo si tipo = "Otro" |

### 3. Asignación Organizacional

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| **Centro de Costo** | Selector | ❌ No | Asignar a un centro de costo existente o crear uno nuevo |
| **Departamento** | Selector | ❌ No | Asignar a un departamento de la estructura organizacional |

**Nota importante sobre Centros de Costo:**
- Los admins ven todos los centros de costo
- Los usuarios regulares solo ven sus centros de costo asignados
- Si no existe el centro de costo deseado, se puede crear uno nuevo directamente desde el formulario

### 4. Información Bancaria

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| **Banco** | Texto | ❌ No | Nombre del banco |
| **Tipo de Cuenta** | Selector | ❌ No | Vista, Corriente, Chequera Electrónica, RUT |
| **Número de Cuenta** | Texto | ❌ No | Número de cuenta bancaria |

### 5. Remuneraciones

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| **Sueldo Base** | Número | ✅ Sí | Sueldo mensual bruto (formato: $1.000.000) |
| **Movilización** | Número | ❌ No | Asignación de movilización mensual |
| **Colación** | Número | ❌ No | Asignación de colación mensual |
| **Solicita Anticipo** | Checkbox | ❌ No | Indica si el trabajador solicita anticipos regularmente |
| **Monto Anticipo** | Número | ❌ Condicional | Monto del anticipo regular (solo si solicita anticipo) |

**Formato de Montos:**
- El sistema acepta números con o sin separador de miles
- Se muestra automáticamente con formato chileno ($1.000.000)
- Se almacena internamente como número entero

---

## Campos AFP y Salud - Explicación Detallada

### 📊 Campo AFP (Administradora de Fondos de Pensiones)

#### ¿Qué es?
La AFP es la entidad que administra los fondos de pensiones del trabajador. El sistema permite seleccionar entre las 7 AFPs vigentes en Chile.

#### AFPs Disponibles

| Código | Nombre Completo |
|--------|----------------|
| **CAPITAL** | AFP Capital |
| **CUPRUM** | AFP Cuprum |
| **HABITAT** | AFP Habitat |
| **PLANVITAL** | AFP PlanVital |
| **PROVIDA** | AFP Provida |
| **MODELO** | AFP Modelo |
| **UNO** | AFP Uno |

#### Valor por Defecto
Si no se selecciona, el sistema asigna **PROVIDA** por defecto.

#### ¿Cómo se usa en el sistema?

1. **Al Crear Trabajador:**
   - Seleccionar la AFP del trabajador del listado desplegable
   - El sistema valida que sea una AFP válida

2. **En Cálculo de Liquidaciones:**
   - El sistema obtiene automáticamente la **tasa de cotización** actual de esa AFP
   - La tasa se obtiene desde los indicadores de Previred (actualizados mensualmente)
   - Se calcula: `Descuento AFP = Sueldo Imponible × Tasa AFP`
   
3. **Componentes de la Cotización AFP:**
   - **Cotización Obligatoria**: ~10% (varía según AFP)
   - **Comisión AFP**: Varía por AFP (ej: PROVIDA: 1.16%)
   - **SIS (Seguro Invalidez y Sobrevivencia)**: ~1.49% (variable mensual)
   
4. **Ejemplo Práctico:**
   ```
   Trabajador: Juan Pérez
   AFP: PROVIDA
   Sueldo Base: $1.000.000
   
   Cálculo automático en liquidación:
   - Cotización Obligatoria: $100.000 (10%)
   - Comisión AFP PROVIDA: $11.600 (1.16%)
   - SIS: $14.900 (1.49%)
   - Total descuento AFP: $126.500
   ```

#### ¿Cuándo actualizar?
- Cuando el trabajador cambia de AFP
- El trabajador debe informar el cambio con su certificado de AFP
- Se puede editar en cualquier momento desde la ficha del trabajador

---

### 🏥 Campo Sistema de Salud

#### ¿Qué es?
El sistema de salud define dónde se realizará la cotización de salud del trabajador (7% del sueldo imponible).

#### Sistemas de Salud Disponibles

| Sistema | Descripción |
|---------|-------------|
| **FONASA** | Fondo Nacional de Salud (Sistema Público) |
| **ISAPRE** | Institución de Salud Previsional (Sistema Privado) |

#### Valor por Defecto
Si no se selecciona, el sistema asigna **FONASA** por defecto.

---

### 📋 Diferencias entre FONASA e ISAPRE

#### FONASA (Sistema Público)

**Características:**
- Cotización fija del **7%** del sueldo imponible
- No requiere datos adicionales
- Es el sistema por defecto

**Cálculo en Liquidación:**
```
Sueldo Imponible: $1.000.000
Cotización FONASA: $70.000 (7% fijo)
```

**Campos requeridos en la ficha:**
- ✅ Sistema de Salud: FONASA
- ❌ Nombre Plan: No aplica
- ❌ Porcentaje Plan: No aplica

---

#### ISAPRE (Sistema Privado)

**Características:**
- Cotización mínima del **7%** + cotización adicional voluntaria
- Requiere información del plan contratado
- Puede tener descuentos superiores al 7%

**Campos adicionales requeridos:**

1. **Nombre del Plan de Salud** (Texto)
   - Nombre del plan contratado con la ISAPRE
   - Ejemplo: "Plan Preferente", "Plan Familiar 3 UF", etc.
   - Campo obligatorio si Sistema = ISAPRE

2. **Porcentaje del Plan de Salud** (Número)
   - Porcentaje total de cotización del plan
   - Incluye el 7% legal + cotización adicional
   - Se ingresa como número (ejemplo: 10.5 para 10.5%)
   - Puede ser mayor o igual a 7%
   - Campo obligatorio si Sistema = ISAPRE

**Cálculo en Liquidación:**
```
Ejemplo 1: Plan básico 7%
Sueldo Imponible: $1.000.000
Porcentaje Plan: 7%
Cotización ISAPRE: $70.000

Ejemplo 2: Plan premium 12%
Sueldo Imponible: $1.000.000
Porcentaje Plan: 12%
Cotización ISAPRE: $120.000
```

**Validaciones del Sistema:**
- El porcentaje debe ser ≥ 7% (mínimo legal)
- El porcentaje debe ser un número válido
- No puede estar vacío si Sistema = ISAPRE

---

### 🔄 Flujo de Trabajo con ISAPRE

#### 1. Al Crear/Editar Trabajador

```
1. Seleccionar Sistema de Salud: ISAPRE
   ↓
2. Se habilitan campos adicionales:
   - Nombre del Plan ✏️
   - Porcentaje del Plan ✏️
   ↓
3. Ingresar información del plan
   Ejemplo:
   - Nombre: "Plan Familia 4 UF"
   - Porcentaje: 9.5
   ↓
4. Guardar trabajador
```

#### 2. Al Calcular Liquidación

```
1. Sistema obtiene datos del trabajador:
   - Sistema Salud: ISAPRE
   - Porcentaje Plan: 9.5%
   ↓
2. Calcula sueldo imponible
   Base + Gratificación = Imponible
   ↓
3. Aplica porcentaje:
   $1.000.000 × 9.5% = $95.000
   ↓
4. Descuento aparece en liquidación:
   "Cotización ISAPRE: -$95.000"
```

#### 3. Información en Certificados

- Los certificados de renta muestran el sistema de salud
- Se indica si es FONASA o ISAPRE (con nombre del plan)
- Útil para trámites médicos y subsidios

---

### ⚠️ Casos Especiales y Consideraciones

#### Caso 1: Trabajador sin Previsión
```
Situación: Trabajador extranjero sin previsión chilena
Solución: 
- AFP: Seleccionar cualquiera (se puede marcar como "No aplica" en notas)
- Salud: FONASA (cotización obligatoria del 7%)
```

#### Caso 2: Cambio de ISAPRE
```
Situación: Trabajador cambia de ISAPRE o plan
Pasos:
1. Editar ficha del trabajador
2. Actualizar nombre del plan
3. Actualizar porcentaje si cambió
4. Guardar cambios
5. Liquidaciones futuras usarán el nuevo plan
```

#### Caso 3: Trabajador con Plan Complementario
```
Situación: Trabajador tiene seguro complementario privado
Aclaración:
- En "Sistema de Salud" solo va FONASA o ISAPRE (cotización legal)
- Seguros complementarios se descuentan como "Otros Descuentos"
- No mezclar cotización legal con seguros privados adicionales
```

#### Caso 4: Topes de Imponibilidad
```
Importante:
- El sistema aplica automáticamente el tope de 81.6 UF
- Si el sueldo supera el tope, se cotiza solo sobre el máximo
- Ejemplo:
  Sueldo: $5.000.000
  Tope (81.6 UF): ~$2.900.000
  Cotización sobre: $2.900.000 (no sobre $5.000.000)
```

---

### 📝 Ejemplos Prácticos Completos

#### Ejemplo 1: Trabajador con FONASA
```yaml
Datos del Trabajador:
  Nombre: María González
  AFP: HABITAT
  Sistema Salud: FONASA
  Sueldo Base: $800.000

Cálculo en Liquidación:
  Haberes:
    Sueldo Base: $800.000
  
  Descuentos Previsionales:
    AFP (10% + 1.16% com.): -$89.280
    SIS: -$11.920
    FONASA (7%): -$56.000
  
  Total Descuentos Prev.: -$157.200
  Sueldo Líquido: $642.800
```

#### Ejemplo 2: Trabajador con ISAPRE
```yaml
Datos del Trabajador:
  Nombre: Carlos Muñoz
  AFP: PROVIDA
  Sistema Salud: ISAPRE
  Plan: Más Vida Plus 10 UF
  Porcentaje Plan: 11.5%
  Sueldo Base: $1.500.000

Cálculo en Liquidación:
  Haberes:
    Sueldo Base: $1.500.000
  
  Descuentos Previsionales:
    AFP (10% + 1.16% com.): -$167.400
    SIS: -$22.350
    ISAPRE (11.5%): -$172.500
  
  Total Descuentos Prev.: -$362.250
  Sueldo Líquido: $1.137.750
```

---

## Editar un Trabajador Existente

### Acceso
1. Ir a **Lista de Trabajadores**
2. Hacer clic en el ícono ✏️ (Editar) del trabajador deseado

### Campos Editables
- ✅ Todos los campos personales
- ✅ Información contractual
- ✅ Remuneraciones
- ✅ AFP y Sistema de Salud
- ✅ Información bancaria
- ⚠️ RUT: Se puede editar pero debe seguir siendo único

### Campos No Editables
- ❌ Fecha de creación del registro
- ❌ ID interno del sistema

### Cambios que Afectan Liquidaciones Futuras
- Cambios en AFP: Aplican desde la próxima liquidación
- Cambios en Salud: Aplican desde la próxima liquidación
- Cambios en Sueldo: Aplican desde la próxima liquidación
- ⚠️ No se modifican liquidaciones ya emitidas

---

## Estados del Trabajador

| Estado | Descripción | Impacto |
|--------|-------------|---------|
| **Activo** | Trabajador en funciones normales | Aparece en liquidaciones, reportes y todo el sistema |
| **Inactivo** | Trabajador dado de baja | No aparece en nuevas liquidaciones, pero mantiene historial |
| **Licencia Médica** | En licencia temporal | Aparece con indicador especial, puede tener cálculos diferenciados |
| **Permiso** | Permiso temporal aprobado | Aparece con indicador, puede afectar cálculos de asistencia |

### Cambiar Estado
1. Editar trabajador
2. Seleccionar nuevo estado en el campo "Estado"
3. Si pasa a Inactivo:
   - Ingresar "Fecha de Término"
   - Opcionalmente agregar "Nota de Inactivación"
4. Guardar cambios

---

## Permisos y Acceso

### Super Admin
- ✅ Ver todos los trabajadores de todas las empresas
- ✅ Crear, editar y eliminar trabajadores
- ✅ Acceso a todos los centros de costo

### Owner/Admin
- ✅ Ver todos los trabajadores de su(s) empresa(s)
- ✅ Crear, editar y eliminar trabajadores de su(s) empresa(s)
- ✅ Acceso a todos los centros de costo de su(s) empresa(s)
- ✅ Crear nuevos centros de costo

### Usuario Regular
- ✅ Ver trabajadores de centros de costo asignados
- ❌ No puede ver trabajadores de otros centros de costo
- ⚠️ Permisos de edición según configuración del admin

### Trabajador (Portal Empleado)
- ✅ Ver solo su propia ficha (datos básicos)
- ❌ No puede editar información
- ✅ Puede solicitar cambios vía portal

---

## Preguntas Frecuentes (FAQ)

### ¿Qué pasa si ingreso mal la AFP?
R: Puedes editarla en cualquier momento. Las liquidaciones futuras usarán la AFP correcta. Las liquidaciones ya emitidas NO se modifican automáticamente.

### ¿Puedo dejar el campo AFP vacío?
R: No, es obligatorio seleccionar una AFP. Si tienes dudas, consulta el certificado de AFP del trabajador.

### ¿Qué pasa si el trabajador no tiene ISAPRE pero ingreso datos de plan?
R: Si el sistema de salud es FONASA, los campos de plan ISAPRE se ignoran. Solo se usan si Sistema = ISAPRE.

### ¿Cómo sé qué porcentaje tiene el plan ISAPRE del trabajador?
R: El trabajador debe proporcionar su certificado de cotización ISAPRE donde aparece el porcentaje. Generalmente va del 7% al 15%.

### ¿Puedo cambiar el sueldo a mitad de mes?
R: Sí, pero el cambio aplicará desde la próxima liquidación. Si necesitas ajustar una liquidación ya emitida, debes crear un ajuste o bono/descuento adicional.

### ¿El RUT debe tener formato especial?
R: El sistema acepta RUT con o sin formato (12345678-9 o 123456789). Se valida que sea único.

### ¿Qué pasa con las tasas AFP antiguas?
R: El sistema obtiene las tasas actuales de Previred cada mes. Las tasas históricas se usan para liquidaciones del pasado.

---

## Soporte

Para más información o soporte técnico:
- 📧 Email: soporte@piwisuite.cl
- 📱 WhatsApp: +56 9 XXXX XXXX
- 🌐 Web: www.piwisuite.cl

---

**Versión del Manual**: 1.0  
**Última Actualización**: Enero 2026  
**Sistema**: RH Piwi Suite

