# 🎨 Prompt y Guía de Diseño para Cursor IA

## Análisis del Diseño Implementado en RHPiwiSuite

Basándome en el código real de tu aplicación, aquí están los **patrones específicos** que utilicé:

---

## 📋 Prompt Optimizado para Cursor

```
Necesito que apliques el siguiente sistema de diseño moderno a [componente/página]:

PALETA DE COLORES EXACTA:
- Azul primario: #3b82f6 (blue-500), #2563eb (blue-600)
- Violeta/Morado: #8b5cf6 (purple-500), #7c3aed (purple-600)
- Fondos: #f8fafc (slate-50), #f1f5f9 (slate-100)
- Texto principal: #1e293b (slate-800)
- Texto secundario: #64748b (slate-500)
- Bordes: #e2e8f0 (slate-200)

COLORES PARA TARJETAS DE ESTADÍSTICAS (Sólidos, NO gradientes):
- Azul: bg-blue-600
- Ámbar/Naranja: bg-amber-500
- Morado: bg-purple-600
- Rosa: bg-rose-500
- Verde: bg-emerald-500

ESTRUCTURA DE COMPONENTES:
Usa Tailwind CSS con las siguientes clases específicas que ya están probadas y funcionan perfectamente.
```

---

## 🎯 Fragmentos de Código Específicos

### 1. **Tarjetas de Estadísticas (StatCard)** - Colores Sólidos

```tsx
// IMPORTANTE: Usa colores SÓLIDOS, no gradientes
<div className={`${colorClass} rounded-2xl p-6 text-white shadow-md relative overflow-hidden transition-transform hover:scale-[1.02]`}>
  
  {/* Icono de fondo decorativo */}
  <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 scale-150 pointer-events-none">
    {icon}
  </div>

  <div className="flex justify-between items-start relative z-10">
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">{title}</h3>
      <div className="text-4xl font-extrabold tracking-tight mb-2">
        {value}
      </div>
      
      {/* Trend indicator */}
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
          ↑ 12%
        </span>
        <span>vs mes anterior</span>
      </div>
    </div>

    {/* Icono principal con glassmorphism */}
    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
      {icon}
    </div>
  </div>
</div>
```

**Uso en página:**
```tsx
<StatCard
  title="Trabajadores Activos"
  value={8}
  icon={<FaUsers size={24} />}
  colorClass="bg-blue-600"  // Color sólido
  trend={{ value: 12, label: "vs mes anterior", positive: true }}
/>
```

---

### 2. **Tarjetas de Acceso Rápido (QuickActionCard)**

```tsx
<button
  type="button"
  onClick={onClick}
  className="group flex items-center w-full p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-sm hover:bg-slate-50/50 hover:border-slate-300 transition-all duration-200 text-left cursor-pointer"
>
  {/* Icono con color de fondo */}
  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mr-4 ${colorClass} transition-transform group-hover:scale-110 duration-200`}>
    {icon}
  </div>
  
  <div className="flex-1 min-w-0">
    <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-700 transition-colors">
      {title}
    </h3>
    <p className="text-xs text-slate-400 truncate mt-0.5 group-hover:text-slate-500 transition-colors">
      {description}
    </p>
  </div>
  
  {/* Flecha indicadora */}
  <div className="text-slate-300 group-hover:text-blue-500 transition-colors pl-2">
    <FaChevronRight size={14} />
  </div>
</button>
```

**Colores para iconos:**
```tsx
colorClass="bg-blue-100 text-blue-600"
colorClass="bg-emerald-100 text-emerald-600"
colorClass="bg-amber-100 text-amber-600"
colorClass="bg-orange-100 text-orange-600"
colorClass="bg-rose-100 text-rose-600"
colorClass="bg-purple-100 text-purple-600"
```

---

### 3. **Gráficos con Gradientes Sutiles (ChartsSection)**

```tsx
// Definición de gradientes para áreas de gráfico
<defs>
  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
  </linearGradient>
  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
  </linearGradient>
</defs>

{/* Área con gradiente */}
<Area
  type="monotone"
  dataKey="netPay"
  name="Sueldo Líquido"
  stroke="#3b82f6"
  strokeWidth={2}
  fillOpacity={1}
  fill="url(#colorNet)"
  activeDot={{ r: 4, strokeWidth: 0 }}
/>
```

**Tabs para cambiar vista:**
```tsx
<div className="flex bg-slate-50 p-1.5 rounded-xl gap-4">
  {['Líquido', 'Detallado', 'Costo Empleador'].map((view) => (
    <button
      key={view}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
        activeView === view
          ? 'bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-200'
          : 'text-slate-500 hover:text-slate-800 hover:bg-white bg-white/50'
      }`}
    >
      {view}
    </button>
  ))}
</div>
```

---

### 4. **Tabla de Ranking con Efectos Hover**

```tsx
<table className="w-full text-left border-collapse">
  <thead>
    <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
      <th className="py-4 px-6 font-semibold cursor-pointer hover:text-slate-700 transition-colors group">
        <div className="flex items-center gap-2">
          Trabajador 
          <FaSort className="text-slate-300" />
        </div>
      </th>
    </tr>
  </thead>
  
  <tbody className="divide-y divide-slate-100">
    <tr className="group hover:bg-slate-50 transition-colors">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          {/* Avatar circular */}
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">
            J
          </div>
          <div>
            <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              Juan Pérez
            </div>
            <div className="text-xs text-slate-400">12.345.678-9</div>
          </div>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

---

### 5. **Tarjetas de Detalles con Iconos de Fondo**

```tsx
<div className={`p-4 rounded-xl border ${colorClass} relative overflow-hidden transition-all hover:shadow-md`}>
  <div className="relative z-10">
    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">
      {title}
    </p>
    <h4 className="text-xl font-extrabold mb-1">
      {formatCurrency(value)}
    </h4>
    <p className="text-[10px] opacity-80">
      {subtext}
    </p>
  </div>
  
  {/* Icono decorativo de fondo */}
  <div className={`absolute -bottom-2 -right-2 text-4xl opacity-10 ${accentColor}`}>
    {icon}
  </div>
</div>
```

**Combinaciones de colores:**
```tsx
colorClass="bg-blue-50 border-blue-200 text-blue-900"
colorClass="bg-emerald-50 border-emerald-200 text-emerald-900"
colorClass="bg-amber-50 border-amber-200 text-amber-900"
colorClass="bg-pink-50 border-pink-200 text-pink-900"
colorClass="bg-rose-50 border-rose-200 text-rose-900"
```

---

### 6. **Banner Principal con Fondo Destacado**

```tsx
<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
  {/* Header con icono */}
  <div className="p-4 border-b border-slate-100 flex items-center gap-3">
    <div className="bg-amber-500 text-white p-2 rounded-lg shadow-sm">
      <FaChartLine />
    </div>
    <div>
      <h3 className="font-bold text-slate-800 text-sm">
        Proyección de sueldos para el mes de ENERO
      </h3>
      <p className="text-xs text-slate-500">
        Estimación basada en trabajadores activos
      </p>
    </div>
  </div>
  
  {/* Contenido destacado */}
  <div className="bg-amber-50/50 p-6">
    <div className="bg-amber-100 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center shadow-sm">
      <div>
        <p className="text-amber-800 font-bold text-sm mb-1">Sueldos Líquidos</p>
        <h2 className="text-4xl font-black text-amber-900 tracking-tight">
          $12.500.000
        </h2>
        <p className="text-xs text-amber-700 mt-2">
          * Proyección estimada
        </p>
      </div>
      <div className="hidden md:flex bg-amber-200 w-12 h-12 rounded-full items-center justify-center text-amber-700 text-xl font-bold shadow-inner">
        $
      </div>
    </div>
  </div>
</div>
```

---

### 7. **Header de Página**

```tsx
<div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
      Panel de Control
    </h1>
    <p className="text-slate-500 text-sm">
      Visión general de <span className="font-semibold text-blue-600">RH PiwiSuite</span>
    </p>
  </div>

  <div className="flex gap-3">
    <div className="px-3 py-1.5 bg-white rounded-md shadow-sm border border-slate-200 flex items-center gap-2 text-xs font-medium text-slate-600">
      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
      Sistema Operativo
    </div>
  </div>
</div>
```

---

### 8. **Tooltip Personalizado para Gráficos**

```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-slate-600 font-medium">{entry.name}:</span>
            <span className="text-slate-900 font-bold">
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}
```

---

## 🎨 Configuración de Tailwind

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        slate: {
          850: '#151e2e',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
      },
    },
  },
}
```

---

## 📱 Responsive Design

```tsx
{/* Grid responsive */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Contenido */}
</div>

{/* Flex responsive */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
  {/* Contenido */}
</div>

{/* Ocultar en mobile */}
<div className="hidden md:flex">
  {/* Solo visible en desktop */}
</div>
```

---

## ✨ Efectos y Transiciones Clave

```tsx
// Hover con escala
className="transition-transform hover:scale-[1.02]"

// Hover con sombra
className="hover:shadow-lg transition-all duration-300"

// Hover con color
className="group-hover:text-blue-600 transition-colors"

// Hover con escala de icono
className="transition-transform group-hover:scale-110 duration-200"

// Glassmorphism
className="bg-white/20 backdrop-blur-sm"
```

---

## 🎯 Prompt Final para Cursor

```
Aplica este diseño al componente [nombre]:

1. USA COLORES SÓLIDOS para tarjetas principales (bg-blue-600, bg-amber-500, bg-purple-600, bg-rose-500)
2. Bordes redondeados: rounded-xl o rounded-2xl
3. Sombras sutiles: shadow-sm con hover:shadow-md
4. Espaciado generoso: p-6 para tarjetas
5. Transiciones suaves: transition-all duration-200
6. Efectos hover: scale-[1.02], text-blue-600, shadow-lg
7. Iconos con fondo de color pastel (bg-blue-100 text-blue-600)
8. Texto: slate-800 para títulos, slate-500 para secundario
9. Bordes: border-slate-200
10. Fondo de página: bg-slate-50

ESTRUCTURA DE COMPONENTE:
- Contenedor: bg-white border border-slate-200 rounded-xl shadow-sm p-6
- Header: border-b border-slate-100 pb-4 mb-4
- Título: text-lg font-bold text-slate-800
- Subtítulo: text-xs text-slate-500

NO uses gradientes en fondos de tarjetas principales, solo colores sólidos.
Usa gradientes SOLO en gráficos (linearGradient con stopOpacity).

Mantén toda la funcionalidad existente, solo aplica estos estilos visuales.
```

---

## 📸 Referencia Visual

![Diseño implementado](C:/Users/JEANS/.gemini/antigravity/brain/5e8ce0bb-9016-4a7e-86cd-770a86c220b4/uploaded_image_1767985680885.png)

---

## 🔑 Puntos Clave

1. **Colores sólidos** en tarjetas de estadísticas (NO gradientes)
2. **Gradientes sutiles** solo en gráficos de área
3. **Iconos con fondos pasteles** para acciones rápidas
4. **Efectos hover** en todos los elementos interactivos
5. **Sombras suaves** que aumentan en hover
6. **Bordes redondeados** consistentes (xl o 2xl)
7. **Espaciado generoso** para respiración visual
8. **Transiciones suaves** de 200-300ms
9. **Glassmorphism** en elementos decorativos (bg-white/20 backdrop-blur-sm)
10. **Responsive** con breakpoints md y lg
