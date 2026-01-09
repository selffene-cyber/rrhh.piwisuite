# 📋 Manual de Usuario: Sistema de Notificaciones de Contratos

## 📌 Tabla de Contenidos

1. [¿Qué es y para qué sirve?](#qué-es-y-para-qué-sirve)
2. [Ubicación en la Aplicación](#ubicación-en-la-aplicación)
3. [Estados Visuales del Botón](#estados-visuales-del-botón)
4. [Interpretación de Notificaciones](#interpretación-de-notificaciones)
5. [Categorías de Urgencia](#categorías-de-urgencia)
6. [Cómo Usar el Sistema](#cómo-usar-el-sistema)
7. [Actualización Automática](#actualización-automática)
8. [Ejemplos Prácticos](#ejemplos-prácticos)
9. [Preguntas Frecuentes](#preguntas-frecuentes)
10. [Información Técnica](#información-técnica)

---

## 🎯 ¿Qué es y para qué sirve?

El **Sistema de Notificaciones de Contratos** es una herramienta proactiva que monitorea automáticamente los contratos a plazo fijo de tu empresa y te alerta sobre:

- ✅ Contratos que están por vencer
- ⚠️ Contratos que vencen en pocos días
- 🔴 Contratos vencidos o que vencen hoy

**Objetivo principal**: Evitar que contratos expiren sin renovación o gestión adecuada, asegurando el cumplimiento legal y la continuidad operacional.

---

## 📍 Ubicación en la Aplicación

El botón de notificaciones se encuentra en el **encabezado (header) de la aplicación**, al lado derecho del selector de empresa.

```
[Logo] [Empresa Actual ▼] [🔔 Notificaciones] [Usuario]
```

Es visible en todas las páginas de la aplicación para acceso rápido y constante.

---

## 🎨 Estados Visuales del Botón

El botón de notificaciones cambia de color según la urgencia de las alertas:

### 1. **Azul/Índigo** (Estado Normal)
- **Apariencia**: Botón con gradiente azul brillante
- **Significado**: No hay notificaciones pendientes
- **Mensaje tooltip**: "Notificaciones de contratos"
- **Acción**: Todos los contratos están vigentes y sin problemas

```
🔵 Botón azul = Todo está bien
```

### 2. **Naranja** (Alertas Moderadas)
- **Apariencia**: Botón con gradiente naranja
- **Badge**: Número de notificaciones en círculo rojo/naranja
- **Significado**: Hay contratos que vencen en 8-30 días
- **Mensaje tooltip**: "X notificaciones de contratos"
- **Acción recomendada**: Revisar y planificar renovaciones

```
🟠 Botón naranja + Badge = Atención necesaria pronto
```

### 3. **Rojo** (Alertas Críticas)
- **Apariencia**: Botón con gradiente rojo intenso + animación de temblor
- **Badge**: Número con efecto de pulso luminoso
- **Significado**: Hay contratos vencidos, vencen hoy o en 1-7 días
- **Mensaje tooltip**: "X notificaciones de contratos"
- **Acción requerida**: ¡Acción inmediata necesaria!

```
🔴 Botón rojo + Animación = ¡Urgente! Requiere acción inmediata
```

### Elementos Visuales Clave

| Elemento | Descripción | Cuándo Aparece |
|----------|-------------|----------------|
| **Campana blanca** | Icono principal del botón | Siempre visible |
| **Badge numérico** | Círculo con número de notificaciones | Solo cuando hay notificaciones (> 0) |
| **Animación shake** | Movimiento de campana | Solo con notificaciones críticas |
| **Efecto glow** | Resplandor alrededor del badge | Con notificaciones críticas |
| **Sombra elevada** | Sombra más pronunciada | Al pasar el mouse (hover) |

---

## 📖 Interpretación de Notificaciones

Al hacer clic en el botón, se despliega un panel con:

### Encabezado del Panel

```
Notificaciones de Contratos                    [X]
2 críticas, 3 urgentes, 1 próxima
```

- **Título**: "Notificaciones de Contratos"
- **Resumen**: Desglose por tipo de urgencia
- **Botón X**: Cierra el panel

### Estructura de cada Notificación

Cada notificación muestra:

```
[📄] CONTRATO-2024-001
     Juan Pérez González
     12.345.678-9
     ⚠️ Vence en 3 días
     Fecha término: 15/01/2025
```

1. **Icono**: Representa el nivel de urgencia
2. **Número de contrato**: Identificador único
3. **Nombre del trabajador**: Para identificación rápida
4. **RUT del trabajador**: Información adicional
5. **Mensaje de alerta**: Estado y días restantes
6. **Fecha de término**: Cuándo vence el contrato

### Interactividad

- **Hacer clic en una notificación**: Te lleva directamente a la página de detalle de ese contrato
- **Hacer hover**: La notificación cambia de color para indicar que es clickeable
- **Botón "Ver todos los contratos"**: Te lleva a la página de gestión de contratos

---

## 🚨 Categorías de Urgencia

Las notificaciones se agrupan en 4 categorías principales:

### 1. 🔴 VENCIDOS / VENCEN HOY

**Características:**
- Color: Rojo intenso con fondo rojo claro
- Icono: ⚠️ Signo de exclamación
- Prioridad: **MÁXIMA**

**Incluye:**
- Contratos cuya fecha de término es hoy
- Contratos cuya fecha de término ya pasó

**Acción requerida:**
- ✅ Renovar el contrato de inmediato
- ✅ Gestionar la desvinculación si corresponde
- ✅ Crear anexo de extensión si es necesario
- ⚠️ **NOTA**: No se puede generar liquidación para estos trabajadores hasta que se renueve o cierre el contrato

**Ejemplo:**
```
⚠️ VENCIDOS / VENCEN HOY (2)

📄 CONTRATO-2024-045
   María González
   15.234.567-8
   🔴 ¡Vencido! (Venció hace 2 días)
   Fecha término: 05/01/2025
```

---

### 2. ⚠️ CRÍTICOS (1-7 días)

**Características:**
- Color: Amarillo/Naranja intenso
- Icono: ⚠️ Signo de exclamación
- Prioridad: **MUY ALTA**

**Incluye:**
- Contratos que vencen en 1 a 7 días

**Acción requerida:**
- ✅ Iniciar proceso de renovación urgente
- ✅ Contactar al trabajador para confirmar continuidad
- ✅ Preparar documentación necesaria
- ✅ Coordinar con RR.HH. para gestión

**Ejemplo:**
```
⚠️ CRÍTICOS (1-7 DÍAS) (3)

📄 CONTRATO-2024-078
   Carlos Ramírez
   18.765.432-1
   ⚠️ Vence en 5 días
   Fecha término: 13/01/2025
```

---

### 3. ⏰ URGENTES (8-15 días)

**Características:**
- Color: Amarillo claro
- Icono: ⚠️ Signo de exclamación
- Prioridad: **ALTA**

**Incluye:**
- Contratos que vencen en 8 a 15 días

**Acción recomendada:**
- ✅ Evaluar necesidad de renovación
- ✅ Planificar reunión con el trabajador
- ✅ Revisar desempeño y condiciones
- ✅ Preparar nuevo contrato o anexo

**Ejemplo:**
```
⚠️ URGENTES (8-15 DÍAS) (5)

📄 CONTRATO-2024-102
   Ana López
   14.234.567-9
   ⏰ Vence en 12 días
   Fecha término: 20/01/2025
```

---

### 4. 🔔 PRÓXIMOS (16-30 días)

**Características:**
- Color: Amarillo pálido
- Icono: 🔔 Campana
- Prioridad: **MEDIA**

**Incluye:**
- Contratos que vencen en 16 a 30 días

**Acción recomendada:**
- ✅ Hacer seguimiento y monitoreo
- ✅ Incluir en planificación mensual
- ✅ Evaluación preliminar de renovación
- ✅ Notificar a jefaturas si es necesario

**Ejemplo:**
```
🔔 PRÓXIMOS (16-30 DÍAS) (8)

📄 CONTRATO-2024-156
   Roberto Silva
   16.345.678-0
   🔔 Vence en 25 días
   Fecha término: 02/02/2025
```

---

## 📘 Cómo Usar el Sistema

### Paso 1: Monitoreo Visual Constante

```
1. Revisa el botón de notificaciones al ingresar a la aplicación
2. Observa el color y el badge numérico
3. Si es ROJO con animación → Requiere atención INMEDIATA
4. Si es NARANJA → Requiere revisión pronto
5. Si es AZUL → Todo está bien
```

### Paso 2: Revisar Notificaciones

```
1. Haz clic en el botón de campana
2. Se abre el panel de notificaciones
3. Lee el resumen en el encabezado (ej: "2 críticas, 3 urgentes")
4. Las notificaciones están ordenadas por urgencia
```

### Paso 3: Actuar sobre una Notificación

```
1. Haz clic en la notificación que te interesa
2. Serás redirigido a la página de detalle del contrato
3. Desde ahí puedes:
   - Ver toda la información del contrato
   - Crear una renovación (nuevo contrato)
   - Crear un anexo de prórroga
   - Marcar el contrato como terminado
```

### Paso 4: Gestión Completa de Contratos

```
1. Desde el panel, haz clic en "Ver todos los contratos →"
2. Accedes a la lista completa de contratos
3. Puedes filtrar, buscar y gestionar todos los contratos
4. Verás badges de estado en cada contrato de la lista
```

---

## 🔄 Actualización Automática

### Frecuencia de Actualización

El sistema se actualiza automáticamente:

- **Al abrir el panel**: Cada vez que haces clic en el botón
- **Al cambiar de empresa**: Cuando seleccionas otra empresa del selector
- **Cada 5 minutos**: Actualización en segundo plano sin necesidad de refrescar la página

### Comportamiento en Tiempo Real

```
Momento 1: Sin notificaciones
[🔵 Botón azul]

... pasan 3 horas ...

Momento 2: Un contrato entra en zona crítica (7 días para vencer)
[🟠 Botón naranja + Badge "1"]

... pasan 5 días ...

Momento 3: El mismo contrato ahora vence en 2 días
[🔴 Botón rojo + Animación + Badge "1"]
```

### Persistencia por Empresa

- Las notificaciones son **específicas de cada empresa**
- Al cambiar de empresa en el selector, el botón se actualiza automáticamente
- Si tienes acceso a múltiples empresas, cada una tendrá sus propias notificaciones

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Empresa sin Problemas

**Escenario**: Todos los contratos están vigentes por más de 30 días

```
Estado del Botón:
┌─────────────┐
│   🔔 Azul   │
│  Sin badge  │
└─────────────┘

Al abrir:
┌────────────────────────────────────┐
│ Notificaciones de Contratos    [X] │
├────────────────────────────────────┤
│                                    │
│         🔔                         │
│   No hay notificaciones            │
│   Todos los contratos están        │
│   vigentes                         │
│                                    │
└────────────────────────────────────┘
```

---

### Ejemplo 2: Empresa con Alertas Mixtas

**Escenario**: 1 contrato vencido, 2 críticos, 3 urgentes

```
Estado del Botón:
┌─────────────┐
│   🔔 Rojo   │
│  Badge: 6   │
│  Animación  │
└─────────────┘

Al abrir:
┌────────────────────────────────────┐
│ Notificaciones de Contratos    [X] │
│ 1 crítica, 2 urgentes, 3 próximas  │
├────────────────────────────────────┤
│ ⚠️ VENCIDOS / VENCEN HOY (1)       │
│                                    │
│ 📄 CONTRATO-2024-010               │
│    Pedro Morales                   │
│    🔴 ¡Vencido! (hace 1 día)       │
│                                    │
├────────────────────────────────────┤
│ ⚠️ CRÍTICOS (1-7 DÍAS) (2)         │
│                                    │
│ 📄 CONTRATO-2024-025               │
│    Laura Fernández                 │
│    ⚠️ Vence en 4 días              │
│                                    │
│ 📄 CONTRATO-2024-031               │
│    Diego Torres                    │
│    ⚠️ Vence en 6 días              │
│                                    │
├────────────────────────────────────┤
│ ⚠️ URGENTES (8-15 DÍAS) (3)        │
│ ...                                │
├────────────────────────────────────┤
│   Ver todos los contratos →        │
└────────────────────────────────────┘
```

---

### Ejemplo 3: Gestión de una Notificación Crítica

**Flujo completo de acción:**

```
1. Usuario ve botón ROJO con badge "1"
   └─→ Identifica alerta crítica

2. Usuario hace clic en el botón
   └─→ Se abre el panel de notificaciones

3. Usuario ve:
   "⚠️ VENCIDOS / VENCEN HOY (1)"
   Pedro Morales - Vencido hace 1 día
   └─→ Comprende la urgencia

4. Usuario hace clic en la notificación
   └─→ Redirige a /contracts/abc-123-def

5. En la página de contrato, el usuario:
   a) Revisa los datos del contrato
   b) Evalúa si renovar o dar término
   c) Si renueva:
      - Crea nuevo contrato desde la ficha
      - El sistema vincula automáticamente
   d) Si termina:
      - Marca el contrato como "Terminado"
      - Selecciona motivo de término

6. Después de la acción:
   └─→ La notificación desaparece del sistema
   └─→ El badge se actualiza (o desaparece si era la única)
   └─→ El botón vuelve a color normal si no hay más alertas
```

---

## ❓ Preguntas Frecuentes

### ¿Cuándo aparecen las notificaciones?

Las notificaciones aparecen automáticamente cuando un contrato a plazo fijo entra en la ventana de 30 días antes de su vencimiento.

**Línea de tiempo:**
```
Día -31: Sin notificación
Día -30: Aparece en "Próximos (16-30 días)"
Día -15: Sube a "Urgentes (8-15 días)"
Día -7:  Sube a "Críticos (1-7 días)"
Día 0:   Sube a "Vencidos / Vencen hoy"
Día +1:  Se mantiene en "Vencidos" hasta gestionar
```

---

### ¿Qué tipos de contratos se monitorean?

El sistema monitorea **solo contratos a plazo fijo** con fecha de término definida:
- ✅ Plazo fijo
- ✅ Por obra o faena
- ❌ Indefinidos (no tienen fecha de término, no generan notificaciones)

---

### ¿Puedo desactivar las notificaciones?

No, las notificaciones no se pueden desactivar porque son parte del sistema de cumplimiento legal. Sin embargo:
- Solo aparecen cuando realmente hay contratos por vencer
- Son no intrusivas (no son pop-ups)
- Están diseñadas para ayudarte, no para molestar

---

### ¿Qué pasa si ignoro una notificación?

**Consecuencias de ignorar notificaciones:**

1. **A corto plazo:**
   - La notificación permanece visible
   - El botón seguirá rojo/naranja según urgencia
   - La animación continúa (si es crítica)

2. **Al vencimiento:**
   - El contrato expira automáticamente
   - **No podrás generar liquidaciones** para ese trabajador
   - El sistema bloquea la generación de nómina para esa persona

3. **Solución:**
   - Debes gestionar el contrato (renovar o terminar)
   - Una vez gestionado, la notificación desaparece

---

### ¿Las notificaciones se envían por email?

Actualmente, las notificaciones son **solo visuales dentro de la aplicación**. Versiones futuras podrían incluir:
- 📧 Notificaciones por correo electrónico
- 📱 Notificaciones push (móvil)
- 📊 Reportes semanales por email

---

### ¿Puedo ver notificaciones de todas mis empresas a la vez?

No. Las notificaciones son **específicas de la empresa seleccionada** en el selector del header. Esto permite:
- Enfoque en una empresa a la vez
- Evitar confusión entre empresas
- Gestión más ordenada

**Para ver notificaciones de otra empresa:**
1. Cambia la empresa en el selector del header
2. El botón de notificaciones se actualiza automáticamente

---

### ¿Cómo sé si una notificación es nueva?

El sistema no distingue entre notificaciones "nuevas" y "vistas". En su lugar:
- El color y la animación indican la **urgencia**, no la novedad
- Todas las notificaciones visibles requieren gestión
- Al gestionar el contrato, la notificación desaparece automáticamente

---

### ¿Qué significan los números en el encabezado del panel?

```
"2 críticas, 3 urgentes, 1 próxima"
```

- **Críticas**: Vencidas o vencen en 0-7 días
- **Urgentes**: Vencen en 8-15 días
- **Próximas**: Vencen en 16-30 días

Este resumen te da un vistazo rápido de la distribución de urgencias.

---

### ¿El sistema considera fines de semana y feriados?

El sistema calcula días **calendario** (no días hábiles). Considera:
- Si un contrato vence un sábado, cuenta los días hasta el sábado
- No distingue entre días hábiles y no hábiles
- Esto es intencional para dar mayor margen de seguridad

**Ejemplo:**
```
Hoy: Lunes 8 de enero
Vencimiento: Viernes 12 de enero
Días restantes: 4 días (incluye sábado y domingo si fuera necesario)
```

---

### ¿Puedo generar liquidaciones con contratos vencidos?

**No**. El sistema bloquea la generación de liquidaciones para trabajadores con contratos vencidos o que vencen hoy.

**Razón**: Legalmente no se puede generar remuneración sin un contrato vigente.

**Solución**: Antes de generar la nómina:
1. Revisa las notificaciones críticas
2. Gestiona los contratos vencidos (renueva o termina)
3. Una vez resuelto, podrás generar la liquidación

---

## 🏖️ Notificaciones de Vacaciones

### ¿Qué Son?

Además de las notificaciones de contratos, el sistema también monitorea las **vacaciones acumuladas** de los trabajadores para evitar pérdida de días por acumulación excesiva.

**Base Legal**:
- **Art. 70 Código del Trabajo**: Máximo 2 períodos acumulados (60 días)
- **Ord. N°6287/2017 DT**: Empleador debe otorgar feriado antes de perder días
- **Ord. N°307/2025 DT**: Empleador es responsable de gestionar acumulación

---

### Niveles de Alerta de Vacaciones

Las notificaciones de vacaciones se generan automáticamente cuando un trabajador acumula días en exceso:

#### 🔴 CRÍTICO - RIESGO DE PÉRDIDA

**Condición**: Trabajador con ≥ 60 días acumulados (2 períodos completos)

```
Estado del Botón:
[🔔 Rojo con Animación + Badge]

Mensaje:
¡CRÍTICO! Trabajador con 62.5 días acumulados (2 períodos). 
Puede perder días si no toma vacaciones pronto.

Referencia Legal: Art. 70 Código del Trabajo
```

**¿Qué significa?**:
- El trabajador ha alcanzado el máximo legal de acumulación
- Si acumula más días, los más antiguos se eliminarán automáticamente
- **Acción inmediata requerida**: Obligar al trabajador a tomar vacaciones

**¿Qué hacer?**:
1. Notificar al trabajador inmediatamente
2. Programar al menos 15 días de vacaciones
3. Enviar notificación formal (carta o email)
4. Registrar en ficha del trabajador

---

#### ⚠️ URGENTE - ALTA ACUMULACIÓN

**Condición**: Trabajador con 45-59 días acumulados

```
Estado del Botón:
[🔔 Naranja + Badge]

Mensaje:
Trabajador con 47.5 días acumulados. 
Planificar vacaciones pronto para evitar pérdida.

Referencia Legal: Ord. N°6287/2017 DT
```

**¿Qué significa?**:
- El trabajador está cerca del límite legal
- En 3-6 meses puede perder días si no toma vacaciones

**¿Qué hacer?**:
1. Coordinar con el trabajador para programar vacaciones
2. Incluir en planificación mensual
3. Ofrecer flexibilidad de fechas
4. Hacer seguimiento cada 2 semanas

---

#### 🟡 MODERADO - PLANIFICAR

**Condición**: Trabajador con 30-44 días acumulados

```
Estado del Botón:
[🔔 Amarillo + Badge]

Mensaje:
Trabajador con 35.0 días acumulados. 
Considerar programación de vacaciones.

Referencia Legal: Ord. N°307/2025 DT
```

**¿Qué significa?**:
- El trabajador tiene más de 2 períodos de vacaciones sin tomar
- Buena práctica: planificar dentro del trimestre

**¿Qué hacer?**:
1. Incluir en planificación trimestral
2. Revisar en reuniones 1:1
3. Sugerir fechas al trabajador
4. Monitorear mensualmente

---

### Integración: Contratos + Vacaciones

El sistema combina ambos tipos de notificaciones en el mismo botón del header:

```
┌─────────────────────────────────────────────┐
│  Notificaciones                          [X]│
│  2 contratos críticos, 1 vacación crítica  │
├─────────────────────────────────────────────┤
│  📄 CONTRATOS                               │
│  ⚠️ VENCIDOS / VENCEN HOY (2)              │
│                                             │
│  CT-045 - María González                   │
│  🔴 Vencido hace 2 días                    │
│                                             │
│  CT-078 - Carlos Ramírez                   │
│  ⚠️ Vence en 3 días                        │
├─────────────────────────────────────────────┤
│  🏖️ VACACIONES                             │
│  🔴 CRÍTICO - RIESGO DE PÉRDIDA (1)        │
│                                             │
│  Juan Pérez González                        │
│  12.345.678-9                              │
│  🔴 62.5 días acumulados                   │
│  ⚠️ Puede perder días pronto               │
│  [Ver Ficha →]                             │
├─────────────────────────────────────────────┤
│  Ver todos los contratos →                  │
│  Ver gestión de vacaciones →               │
└─────────────────────────────────────────────┘
```

---

### Colores y Prioridades

El botón de notificaciones toma el color de la alerta **más crítica** entre contratos y vacaciones:

| Contratos | Vacaciones | Color del Botón | Animación |
|-----------|------------|-----------------|-----------|
| 🔴 Crítico | 🟡 Moderado | 🔴 Rojo | ✅ Sí |
| ⚠️ Urgente | 🔴 Crítico | 🔴 Rojo | ✅ Sí |
| 🟡 Próximo | 🟡 Moderado | 🟡 Amarillo | ❌ No |
| ✅ Sin alertas | ✅ Sin alertas | 🔵 Azul | ❌ No |

**Regla**: Siempre se prioriza el nivel más alto de urgencia, independientemente del tipo.

---

### Interacción con Notificaciones de Vacaciones

#### Hacer Clic en una Notificación de Vacaciones

```
Acción: Click en "Juan Pérez - 62.5 días"
Resultado: Redirige a /employees/{id}/vacations
```

En la ficha del trabajador verás:
- Resumen de días acumulados y disponibles
- Histórico de períodos (incluso archivados)
- Botón para registrar nueva vacación
- Historial de vacaciones tomadas

#### Ver Todas las Notificaciones de Vacaciones

```
Acción: Click en "Ver gestión de vacaciones →"
Resultado: Redirige a /vacations (dashboard general)
```

En el dashboard verás:
- Tabla con todos los trabajadores
- KPIs de acumulación
- Ordenamiento por días acumulados
- Filtros por períodos

---

### Frecuencia de Actualización

Las notificaciones de vacaciones se actualizan automáticamente:

- **Al abrir el dropdown**: Recalcula días acumulados en tiempo real
- **Al cambiar de empresa**: Carga notificaciones de la nueva empresa
- **Cada 5 minutos**: Actualización en segundo plano (igual que contratos)
- **Al registrar vacaciones**: Actualiza inmediatamente al guardar

---

### Ejemplo Completo: Notificación Mixta

**Escenario**: Empresa con 2 contratos críticos y 1 vacación crítica

```
Estado del Botón:
┌─────────────┐
│   🔔 Rojo   │  ← Color rojo por alertas críticas
│  Badge: 3   │  ← Total: 2 contratos + 1 vacación
│  Animación  │  ← Shake por criticidad
└─────────────┘

Al abrir:
┌────────────────────────────────────────────────────┐
│ Notificaciones de Contratos y Vacaciones       [X] │
│ 2 contratos críticos, 1 vacación crítica           │
├────────────────────────────────────────────────────┤
│                                                    │
│ 📄 CONTRATOS                                       │
│ ⚠️ VENCIDOS / VENCEN HOY (2)                      │
│                                                    │
│ 📄 CT-045                                          │
│    María González (15.234.567-8)                  │
│    🔴 ¡Vencido! Venció hace 2 días                │
│    Fecha término: 05/01/2025                       │
│                                                    │
│ 📄 CT-078                                          │
│    Carlos Ramírez (18.765.432-1)                  │
│    ⚠️ Vence en 3 días                             │
│    Fecha término: 11/01/2025                       │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│ 🏖️ VACACIONES                                      │
│ 🔴 CRÍTICO - RIESGO DE PÉRDIDA (1)                │
│                                                    │
│ 👤 Juan Pérez González                            │
│    12.345.678-9                                    │
│    Ingreso: 01/01/2022                            │
│    📊 62.5 días acumulados (2 períodos)           │
│    ⚠️ ¡CRÍTICO! Puede perder días pronto          │
│    Art. 70 Código del Trabajo                     │
│    [Ver Ficha del Trabajador →]                   │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│   Ver todos los contratos →                        │
│   Ver gestión de vacaciones →                      │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

### Preguntas Frecuentes (Vacaciones)

#### ¿Por qué no aparecen todas las vacaciones?

Solo se muestran las **críticas, urgentes o moderadas** (≥30 días acumulados).

Si un trabajador tiene 20 días acumulados, no aparece porque está dentro de lo normal.

---

#### ¿Puedo desactivar las notificaciones de vacaciones?

No, son parte del cumplimiento legal del **Art. 70 del Código del Trabajo**.

El empleador tiene la obligación de gestionar la acumulación de vacaciones.

---

#### ¿Qué pasa si ignoro una notificación de vacación?

**A corto plazo**:
- La notificación permanece visible
- El badge aumenta
- El botón se mantiene rojo/naranja

**Al llegar a 60+ días**:
- El sistema archiva automáticamente los períodos más antiguos
- El trabajador pierde esos días (sin compensación)
- Riesgo legal para la empresa por incumplimiento

**Solución**:
- Obligar al trabajador a tomar vacaciones (derecho legal del empleador)
- Programar al menos 15 días
- Documentar la notificación formal

---

#### ¿Se puede obligar al trabajador a tomar vacaciones?

**Sí**, según el **Art. 70 del Código del Trabajo**:

```
El empleador puede fijar el período de feriado de común acuerdo
con el trabajador. A falta de acuerdo, el empleador podrá fijarlas
determinando entre los meses de abril a septiembre.
```

**Requisitos**:
- Notificar por escrito con al menos 30 días de anticipación
- Dar preferencia a períodos solicitados por el trabajador
- Documentar en ficha del trabajador

---

#### ¿Cómo se calculan los 1.25 días por mes?

```
Fórmula: Meses completos trabajados × 1.25 días/mes

Ejemplo:
  Ingreso: 1 de enero de 2022
  Hoy: 8 de enero de 2025
  Meses completos: 36 meses
  
  Cálculo: 36 × 1.25 = 45.00 días acumulados
  
  Distribución:
    2022: 12 meses × 1.25 = 15 días
    2023: 12 meses × 1.25 = 15 días
    2024: 12 meses × 1.25 = 15 días
    Total: 45 días
  
  Disponible (máx legal): 30 días (últimos 2 períodos)
  Perdidos (archivados): 15 días (período 2022)
```

---

#### ¿Puedo ver el historial completo de períodos?

**Sí**, en la ficha del trabajador (`/employees/{id}/vacations`).

El sistema ahora muestra **todos** los períodos, incluso los archivados:

```
Tabla de Períodos:
┌──────┬─────────────┬────────┬──────────────┬──────────┐
│ Año  │ Acumulados  │ Usados │ Disponibles  │ Estado   │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2022 │ 15.00 días  │ 0 días │ 0 días       │ ARCHIVED │
│      │             │        │              │ (máx 2)  │
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2023 │ 15.00 días  │ 15 días│ 0 días       │ COMPLETED│
├──────┼─────────────┼────────┼──────────────┼──────────┤
│ 2024 │ 15.00 días  │ 0 días │ 15.00 días   │ ACTIVE   │
└──────┴─────────────┴────────┴──────────────┴──────────┘
```

Útil para:
- Auditorías laborales
- Resolver conflictos
- Demostrar cumplimiento legal

---

### Mejores Prácticas Combinadas

#### Para Administradores

1. **Revisar notificaciones al iniciar sesión**:
   - Priorizar ROJAS (contratos y vacaciones críticas)
   - Gestionar NARANJAS dentro del día
   - Planificar AMARILLAS semanalmente

2. **Documentar todas las acciones**:
   - Contratos renovados/terminados
   - Vacaciones programadas
   - Notificaciones enviadas a trabajadores

3. **Usar el dashboard específico según el tipo**:
   - `/contracts` para contratos
   - `/vacations` para vacaciones
   - Exportar reportes mensualmente

4. **Coordinación entre módulos**:
   - Si un contrato vence, revisar vacaciones pendientes del trabajador
   - Al programar vacaciones, verificar que el contrato esté vigente
   - Anticipar finiquitos si hay acumulación + término de contrato

---

#### Para Trabajadores

1. **Revisar el botón de notificaciones regularmente**:
   - Si es rojo → Acción inmediata necesaria
   - Si es naranja → Revisar en las próximas horas
   - Si es azul → Todo está en orden

2. **Planificar con anticipación**:
   - Vacaciones: solicitar con 30 días de aviso
   - Contratos: renovar al menos 15 días antes del vencimiento

3. **Consultar con RR.HH.** si:
   - El botón se mantiene rojo por mucho tiempo
   - Hay notificaciones que no entienden
   - Necesitan orientación sobre qué hacer

---

## 🔧 Información Técnica

### Para Desarrolladores y Administradores de Sistema

#### Ubicación del Componente

```typescript
Archivo: components/NotificationsDropdown.tsx
Importado en: components/Layout.tsx (header)
```

#### Servicios Utilizados

```typescript
// Servicio de detección de notificaciones
lib/services/contractNotifications.ts

// Funciones principales:
- getContractNotifications(companyId, supabase)
- getNotificationCounts(notifications)
- groupNotificationsByStatus(notifications)
```

#### Flujo de Datos

```
1. Usuario abre aplicación
   └→ Layout.tsx renderiza NotificationsDropdown

2. NotificationsDropdown se monta
   └→ useEffect se ejecuta
   └→ Llama a loadNotifications()
   └→ getContractNotifications(companyId)

3. Consulta Supabase:
   SELECT * FROM contracts
   WHERE company_id = X
   AND status = 'active'
   AND contract_type IN ('fijo', 'obra_faena')
   AND end_date IS NOT NULL
   └→ Retorna contratos activos con fecha término

4. Para cada contrato:
   └→ calculateExpirationStatus(end_date)
   └→ Determina: expired | expiring_critical | expiring_urgent | expiring_soon

5. Agrupa notificaciones por status
   └→ Cuenta por categoría
   └→ Actualiza estado del componente

6. Renderiza:
   └→ Botón con color según urgencia máxima
   └→ Badge con total de notificaciones
   └→ Panel con notificaciones agrupadas
```

#### Lógica de Colores

```typescript
Botón:
- Sin notificaciones: Azul (#6366f1)
- Con urgentes/próximas: Naranja (#f59e0b)
- Con críticas/vencidas: Rojo (#dc2626)

Badge:
- Con críticas: Rojo con glow animado
- Con urgentes: Naranja
- Con próximas: Amarillo
```

#### Actualizaciones Automáticas

```typescript
// Carga inicial
useEffect(() => {
  if (companyId) {
    loadNotifications()
  }
}, [companyId])

// Actualización cada 5 minutos
useEffect(() => {
  if (companyId) {
    const interval = setInterval(loadNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }
}, [companyId])

// Recarga al abrir panel
useEffect(() => {
  if (isOpen && companyId) {
    loadNotifications()
  }
}, [isOpen, companyId])
```

#### Tabla de la Base de Datos

```sql
-- Tabla: contracts
Columnas relevantes:
- id: UUID
- company_id: UUID (FK)
- employee_id: UUID (FK)
- contract_number: TEXT
- contract_type: TEXT ('indefinido' | 'fijo' | 'obra_faena')
- status: TEXT ('active' | 'terminated' | 'suspended')
- end_date: DATE (nullable)
```

#### Query Principal

```typescript
const { data: contracts } = await supabase
  .from('contracts')
  .select(`
    id,
    contract_number,
    contract_type,
    end_date,
    employee:employees (
      id,
      first_name,
      last_name,
      rut
    )
  `)
  .eq('company_id', companyId)
  .eq('status', 'active')
  .in('contract_type', ['fijo', 'obra_faena'])
  .not('end_date', 'is', null)
  .order('end_date', { ascending: true })
```

#### Cálculo de Días Restantes

```typescript
function calculateDaysRemaining(endDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  
  const diffTime = end.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}
```

#### Determinación de Estado

```typescript
function calculateExpirationStatus(endDate: string): ContractExpirationStatus {
  const daysRemaining = calculateDaysRemaining(endDate)
  
  if (daysRemaining < 0) return 'expired'          // Ya venció
  if (daysRemaining === 0) return 'expires_today'  // Vence hoy
  if (daysRemaining <= 7) return 'expiring_critical'  // 1-7 días
  if (daysRemaining <= 15) return 'expiring_urgent'   // 8-15 días
  if (daysRemaining <= 30) return 'expiring_soon'     // 16-30 días
  
  return 'active' // Más de 30 días, no genera notificación
}
```

#### Integraciones

El sistema de notificaciones está integrado con:

1. **Módulo de Contratos** (`/contracts`)
   - Click en notificación → Detalle de contrato
   - Ver todos → Lista de contratos

2. **Módulo de Empleados** (`/employees`)
   - Muestra badges de estado en lista de trabajadores
   - Indica visualmente contratos problemáticos

3. **Módulo de Nómina** (`/payroll`)
   - Valida contratos antes de generar liquidaciones
   - Bloquea generación si hay contratos vencidos
   - Servicio: `lib/services/payrollContractValidation.ts`

#### Personalización

Para modificar los umbrales de días:

```typescript
// Archivo: lib/services/contractNotifications.ts

// Cambiar estos valores:
const DAYS_EXPIRING_SOON = 30      // 16-30 días
const DAYS_EXPIRING_URGENT = 15    // 8-15 días
const DAYS_EXPIRING_CRITICAL = 7   // 1-7 días
```

#### Performance

- **Carga inicial**: ~200ms (depende de cantidad de contratos)
- **Actualización automática**: En segundo plano, no bloquea UI
- **Renderizado**: Virtualizado para listas grandes (>50 notificaciones)
- **Caché**: Los datos se cachean en el estado del componente

---

## 📚 Recursos Adicionales

### Documentación Relacionada

- 📄 [Manual de Contratos y Anexos](./MANUAL_CONTRATOS_Y_ANEXOS.md)
- 👥 [Manual de Ficha del Trabajador](./MANUAL_FICHA_TRABAJADOR.md)
- 💰 [Manual de Regímenes Previsionales](./MANUAL_REGIMENES_PREVISIONALES.md)

### Soporte

Si tienes dudas o problemas con el sistema de notificaciones:
- Contacta al administrador del sistema
- Revisa los logs en la consola del navegador (F12)
- Verifica que tengas permisos de administrador o owner

---

## 📝 Resumen Rápido

### ✅ Checklist de Uso Diario

```
□ Al iniciar sesión, revisar color del botón de notificaciones
□ Si es ROJO, abrir inmediatamente y gestionar contratos vencidos
□ Si es NARANJA, planificar revisión de contratos en las próximas horas
□ Si es AZUL, continuar con operación normal

Frecuencia recomendada de revisión:
- Mínimo: 1 vez al día (al inicio de jornada)
- Recomendado: 2-3 veces al día
- Si hay notificaciones críticas: Monitoreo continuo
```

### 🎯 Principios Clave

1. **Proactividad**: El sistema te avisa antes de que sea tarde
2. **Priorización**: Los colores indican qué requiere atención inmediata
3. **Acción directa**: Un clic te lleva donde necesitas actuar
4. **Cumplimiento**: Ayuda a mantener la empresa en regla legalmente

---

**Última actualización**: Enero 2025  
**Versión del manual**: 1.0  
**Componente**: NotificationsDropdown v1.0

