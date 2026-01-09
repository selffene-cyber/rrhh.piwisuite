# 📊 Ejemplo Visual: Historial Completo de Vacaciones

## 🎯 Caso del Usuario

**Trabajador**: Juan Pérez  
**Fecha de ingreso**: 1 de enero de 2020  
**Fecha actual**: 8 de enero de 2025  

---

## 📅 Evolución de Períodos Año por Año

### **Año 2020-2021** (Primer Período)

**Meses trabajados**: 12 meses (enero 2020 a diciembre 2020)  
**Días acumulados**: 12 × 1.25 = **15 días**  
**Días usados**: 0 días  
**Días disponibles**: 15 días  

```
┌──────────────┬─────────────┬────────┬──────────────┬──────────┐
│ Período      │ Acumulado   │ Usado  │ Disponible   │ Estado   │
├──────────────┼─────────────┼────────┼──────────────┼──────────┤
│ 2020-2021    │ 15.00 días  │ 0 días │ 15.00 días   │ ✓ ACTIVO │
└──────────────┴─────────────┴────────┴──────────────┴──────────┘
```

**Observación**: No tomó vacaciones en este período.

---

### **Año 2021-2022** (Segundo Período)

**Meses trabajados**: 12 meses (enero 2021 a diciembre 2021)  
**Días acumulados**: 12 × 1.25 = **15 días**  
**Días usados**: 0 días  
**Días disponibles**: 15 días  

```
┌──────────────┬─────────────┬────────┬──────────────┬──────────┐
│ Período      │ Acumulado   │ Usado  │ Disponible   │ Estado   │
├──────────────┼─────────────┼────────┼──────────────┼──────────┤
│ 2020-2021    │ 15.00 días  │ 0 días │ 15.00 días   │ ✓ ACTIVO │
│ 2021-2022    │ 15.00 días  │ 0 días │ 15.00 días   │ ✓ ACTIVO │
└──────────────┴─────────────┴────────┴──────────────┴──────────┘

Total Disponible: 30 días (máximo legal = 2 períodos)
```

**Observación**: Tampoco tomó vacaciones. Ahora tiene 2 períodos activos (máximo permitido).

---

### **Año 2022-2023** (Tercer Período - SE ARCHIVA EL PRIMERO)

**Meses trabajados**: 12 meses (enero 2022 a diciembre 2022)  
**Días acumulados**: 12 × 1.25 = **15 días**  
**Días usados**: 0 días  

**⚠️ Regla de Máximo 2 Períodos se Activa**:
- El sistema archiva automáticamente el período **2020-2021** (el más antiguo)
- **Se pierden** los 15 días de ese período
- Se mantienen activos: 2021-2022 y 2022-2023

```
┌──────────────┬─────────────┬────────┬──────────────┬────────────────┐
│ Período      │ Acumulado   │ Usado  │ Disponible   │ Estado         │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2020-2021    │ 15.00 días  │ 0 días │ 0 días       │ ⚠ ARCHIVADO    │
│              │             │        │              │ (Regla máx 2)  │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2021-2022    │ 15.00 días  │ 0 días │ 15.00 días   │ ✓ ACTIVO       │
│ 2022-2023    │ 15.00 días  │ 0 días │ 15.00 días   │ ✓ ACTIVO       │
└──────────────┴─────────────┴────────┴──────────────┴────────────────┘

Total Acumulado Real: 45 días (15 + 15 + 15)
Total Disponible: 30 días (solo períodos activos)
Total Perdido: 15 días (período 2020-2021 archivado)
```

---

### **Año 2023-2024** (Cuarto Período - TOMA 10 DÍAS CON AUTORIZACIÓN)

**Meses trabajados**: 12 meses (enero 2023 a diciembre 2023)  
**Días acumulados**: 12 × 1.25 = **15 días**  

**📝 Evento**: El trabajador solicita 10 días de vacaciones en diciembre 2023.

**⚠️ Con Autorización Especial**: El jefe autoriza que use días del **período más antiguo disponible** (2021-2022), aunque ese período tenga 15 días disponibles, solo usa 10.

**Descuento FIFO (First In, First Out)**:
```
Solicita: 10 días
Sistema aplica FIFO:
  1. Período 2021-2022 (más antiguo disponible):
     Disponible: 15 días
     Usa: 10 días
     Quedan: 5 días
```

**Además, el sistema archiva el período 2021-2022 cuando se completa el nuevo**:

```
┌──────────────┬─────────────┬────────┬──────────────┬────────────────┐
│ Período      │ Acumulado   │ Usado  │ Disponible   │ Estado         │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2020-2021    │ 15.00 días  │ 0 días │ 0 días       │ ⚠ ARCHIVADO    │
│              │             │        │              │ (Regla máx 2)  │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2021-2022    │ 15.00 días  │ 10 días│ 5.00 días    │ ⚠ ARCHIVADO    │
│              │             │        │              │ (Regla máx 2)  │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2022-2023    │ 15.00 días  │ 0 días │ 15.00 días   │ ✓ ACTIVO       │
│ 2023-2024    │ 15.00 días  │ 0 días │ 15.00 días   │ ✓ ACTIVO       │
└──────────────┴─────────────┴────────┴──────────────┴────────────────┘

Total Acumulado Real: 60 días
Total Usado: 10 días (del período 2021-2022)
Total Disponible: 30 días (15 + 15 de períodos activos)
Total Perdido: 20 días (15 de 2020-2021 + 5 de 2021-2022)
```

**Nota**: Aunque el período 2021-2022 aún tiene 5 días disponibles, se archiva por la regla de máximo 2 períodos activos. Esos 5 días se pierden.

---

### **Año 2024-2025** (Quinto Período - USA TODO LO PENDIENTE)

**Meses trabajados**: 12 meses (enero 2024 a diciembre 2024)  
**Días acumulados**: 12 × 1.25 = **15 días**  

**📝 Evento**: El trabajador solicita 30 días de vacaciones (todo lo disponible) en enero 2025.

**Descuento FIFO Automático**:
```
Solicita: 30 días
Sistema aplica FIFO:
  1. Período 2022-2023 (más antiguo disponible):
     Disponible: 15 días
     Usa: 15 días completos
     Quedan: 0 días (COMPLETADO)
  
  2. Período 2023-2024:
     Disponible: 15 días
     Usa: 15 días completos
     Quedan: 0 días (COMPLETADO)
  
  Total descontado: 30 días ✓
```

**Estado Final**:

```
┌──────────────┬─────────────┬────────┬──────────────┬────────────────┐
│ Período      │ Acumulado   │ Usado  │ Disponible   │ Estado         │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2020-2021    │ 15.00 días  │ 0 días │ 0 días       │ ⚠ ARCHIVADO    │
│              │             │        │              │ (Regla máx 2)  │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2021-2022    │ 15.00 días  │ 10 días│ 0 días       │ ⚠ ARCHIVADO    │
│              │             │        │ (5 perdidos) │ (Regla máx 2)  │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2022-2023    │ 15.00 días  │ 15 días│ 0 días       │ ✓ COMPLETADO   │
│              │             │        │              │ (Agotado)      │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2023-2024    │ 15.00 días  │ 15 días│ 0 días       │ ✓ COMPLETADO   │
│              │             │        │              │ (Agotado)      │
├──────────────┼─────────────┼────────┼──────────────┼────────────────┤
│ 2024-2025    │ 15.00 días  │ 0 días │ 15.00 días   │ ✓ ACTIVO       │
│              │ (nuevo)     │        │              │                │
└──────────────┴─────────────┴────────┴──────────────┴────────────────┘

Total Acumulado Real: 75 días (5 períodos × 15)
Total Usado: 40 días (10 + 15 + 15)
Total Disponible: 15 días (solo período 2024-2025)
Total Perdido: 20 días (15 de 2020-2021 + 5 de 2021-2022)
```

---

## 🎨 Visualización en la Aplicación

### Vista en `/employees/[id]/vacations`

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📊 Períodos de Vacaciones - Historial Completo                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Año         Acumulado    Usado      Disponible    Estado              │
│ ─────────────────────────────────────────────────────────────────────│
│ 2024-2025   15.00 días   0 días     15.00 días    ✓ Activo          │
│ 2023-2024   15.00 días   15 días    0 días        ✓ Agotado         │
│ 2022-2023   15.00 días   15 días    0 días        ✓ Agotado         │
│ 2021-2022   15.00 días   10 días    0 días        ⚠ Archivado       │
│             Archivado por regla de máximo 2 períodos                  │
│ 2020-2021   15.00 días   0 días     0 días        ⚠ Archivado       │
│             Archivado por regla de máximo 2 períodos                  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ 📊 Leyenda de Estados:                                                │
│  ● Activo: Período disponible para uso                               │
│  ● Agotado: Días completamente utilizados                            │
│  ● Archivado: Eliminado por regla de máximo 2 períodos (Art. 70)    │
│                                                                        │
│ ℹ️ Según el Art. 70 del Código del Trabajo, solo se pueden mantener  │
│   máximo 2 períodos activos. Los períodos más antiguos se archivan   │
│   automáticamente, pero se mantienen en el historial para auditoría. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detalles Técnicos de la Implementación

### 1. Campo `status` en `vacation_periods`

```sql
status VARCHAR(20) CHECK (status IN ('active', 'completed', 'archived'))
```

- **active**: Período disponible para usar
- **completed**: Días completamente utilizados (acumulado = usado)
- **archived**: Archivado por regla de máximo 2 períodos

### 2. Función `getVacationPeriods(employeeId, includeArchived)`

```typescript
// Solo períodos activos (para cálculos)
const activePeriods = await getVacationPeriods(employeeId, false)

// Historial completo (para auditoría)
const allPeriods = await getVacationPeriods(employeeId, true)
```

### 3. Descuento FIFO Automático

```typescript
// Al tomar 30 días:
const updatedPeriods = await assignVacationDays(employeeId, 30)

// Resultado:
// - Descuenta 15 del período 2022-2023 (más antiguo) → COMPLETADO
// - Descuenta 15 del período 2023-2024 (siguiente) → COMPLETADO
// - Retorna: [periodo2022, periodo2023] (ambos actualizados)
```

---

## 📚 Referencias Legales

### Art. 70 del Código del Trabajo

```
"El feriado podrá acumularse por acuerdo de las partes, 
pero sólo hasta por dos períodos consecutivos."
```

**Interpretación (Ord. N°6287/2017 DT)**:
- Máximo 2 períodos = 60 días (2 × 30)
- Si el trabajador ya tiene 2 períodos acumulados, el empleador DEBE otorgar el primero antes de que se genere un nuevo período
- Si no lo hace y se genera un 3er período, el más antiguo se elimina automáticamente

---

## ✅ Beneficios del Historial Completo

1. **Transparencia**: El trabajador ve exactamente qué pasó con todos sus días
2. **Auditoría**: Se puede demostrar cumplimiento legal ante inspecciones
3. **Resolución de Conflictos**: Si hay disputa, hay registro completo
4. **Trazabilidad**: Se sabe cuándo y por qué se perdieron días
5. **Educación**: El trabajador entiende la importancia de tomar vacaciones a tiempo

---

## 🎯 Casos de Uso

### Caso 1: Trabajador Reclama Días Perdidos

**Situación**: "¿Por qué solo tengo 15 días si llevo 5 años trabajando?"

**Respuesta con Historial**:
```
Mira tu historial:
- 2020-2021: 15 días → Archivado (no tomaste a tiempo)
- 2021-2022: 15 días (usaste 10, perdiste 5) → Archivado
- 2022-2023: 15 días → Usados completamente ✓
- 2023-2024: 15 días → Usados completamente ✓
- 2024-2025: 15 días → Disponibles ahora

Has acumulado 75 días en total, pero perdiste 20 por la regla 
de máximo 2 períodos (Art. 70). La empresa te notificó oportunamente.
```

### Caso 2: Auditoría de la Dirección del Trabajo

**Solicitud DT**: "Mostrar historial de vacaciones de Juan Pérez desde 2020"

**Sistema**: Genera reporte con tabla completa, incluyendo:
- Todos los períodos (activos, completados, archivados)
- Fechas de archivado y motivos legales
- Notificaciones enviadas al trabajador
- Comprobante de cumplimiento del Art. 70

---

**Fecha**: 8 de enero de 2025  
**Versión**: 1.0  
**Basado en**: Art. 70 CT, Ord. N°6287/2017 DT



