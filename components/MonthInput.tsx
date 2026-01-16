'use client'

import { useState, useEffect } from 'react'

interface MonthInputProps {
  value: string // Formato: YYYY-MM
  onChange: (value: string) => void
  required?: boolean
  min?: string
  max?: string
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function MonthInput({ value, onChange, required, min, max }: MonthInputProps) {
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-')
      setYear(y || '')
      setMonth(m || '')
    } else {
      setYear('')
      setMonth('')
    }
  }, [value])

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const y = e.target.value
    setYear(y)
    if (y && month) {
      onChange(`${y}-${month}`)
    }
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = e.target.value
    setMonth(m)
    if (year && m) {
      onChange(`${year}-${m}`)
    }
  }

  // Generar años (últimos 5 años y próximos 2)
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear - 5; i <= currentYear + 2; i++) {
    years.push(i)
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <select
        value={month}
        onChange={handleMonthChange}
        required={required}
        style={{ flex: 1 }}
      >
        <option value="">Mes</option>
        {MONTHS_ES.map((monthName, index) => (
          <option key={index + 1} value={String(index + 1).padStart(2, '0')}>
            {monthName}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => {
          setYear(e.target.value)
          if (e.target.value && month) {
            onChange(`${e.target.value}-${month}`)
          }
        }}
        required={required}
        style={{ flex: 1 }}
      >
        <option value="">Año</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      {/* Input nativo oculto para validación HTML5 */}
      <input
        type="month"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        required={required}
        style={{
          position: 'absolute',
          opacity: 0,
          width: '1px',
          height: '1px',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}

