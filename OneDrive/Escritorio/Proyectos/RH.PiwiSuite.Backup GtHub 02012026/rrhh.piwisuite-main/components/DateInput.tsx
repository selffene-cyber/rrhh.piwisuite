'use client'

import { useState, useEffect } from 'react'

interface DateInputProps {
  value: string // Formato ISO: YYYY-MM-DD
  onChange: (value: string) => void
  required?: boolean
  min?: string
  max?: string
  placeholder?: string
}

export default function DateInput({ value, onChange, required, min, max, placeholder = 'DD/MM/AAAA' }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  // Convertir de ISO (YYYY-MM-DD) a formato chileno (DD/MM/YYYY)
  const formatToChilean = (isoDate: string): string => {
    if (!isoDate) return ''
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
  }

  // Convertir de formato chileno (DD/MM/YYYY) a ISO (YYYY-MM-DD)
  const parseFromChilean = (chileanDate: string): string => {
    if (!chileanDate) return ''
    // Remover espacios y caracteres no numéricos excepto /
    const cleaned = chileanDate.replace(/[^\d/]/g, '')
    const parts = cleaned.split('/')
    
    if (parts.length === 3) {
      const [day, month, year] = parts
      // Validar que sean números válidos
      const d = parseInt(day, 10)
      const m = parseInt(month, 10)
      const y = parseInt(year, 10)
      
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }
    }
    return ''
  }

  useEffect(() => {
    if (value) {
      setDisplayValue(formatToChilean(value))
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setDisplayValue(input)
    
    // Intentar parsear mientras el usuario escribe
    const isoDate = parseFromChilean(input)
    if (isoDate) {
      onChange(isoDate)
    }
  }

  const handleBlur = () => {
    // Validar y formatear al perder el foco
    const isoDate = parseFromChilean(displayValue)
    if (isoDate) {
      onChange(isoDate)
      setDisplayValue(formatToChilean(isoDate))
    } else if (displayValue) {
      // Si hay valor pero no es válido, limpiar
      setDisplayValue('')
      onChange('')
    }
  }

  // Meses en español
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const getCurrentDate = () => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    return new Date()
  }

  const [currentDate, setCurrentDate] = useState(getCurrentDate())

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number)
      setCurrentDate(new Date(y, m - 1, d))
    }
  }, [value])

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const isoDate = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(isoDate)
    setShowPicker(false)
  }

  const handleMonthChange = (delta: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentDate(newDate)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    return firstDay.getDay()
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []
    
    // Días vacíos al inicio
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    const selectedDay = value ? parseInt(value.split('-')[2], 10) : null
    const selectedMonth = value ? parseInt(value.split('-')[1], 10) - 1 : null
    const selectedYear = value ? parseInt(value.split('-')[0], 10) : null
    const isCurrentMonth = currentDate.getMonth() === selectedMonth && currentDate.getFullYear() === selectedYear

    return (
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '4px',
        background: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        padding: '16px',
        minWidth: '280px'
      }}>
        {/* Header del calendario */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => handleMonthChange(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px 8px'
            }}
          >
            ‹
          </button>
          <div style={{ fontWeight: 'bold' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button
            type="button"
            onClick={() => handleMonthChange(1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px 8px'
            }}
          >
            ›
          </button>
        </div>

        {/* Días de la semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {dayNames.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: '#6b7280' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {days.map((day, index) => {
            if (day === null) {
              return <div key={index} />
            }
            const isSelected = isCurrentMonth && day === selectedDay
            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day)}
                style={{
                  padding: '8px',
                  background: isSelected ? '#2563eb' : 'transparent',
                  color: isSelected ? 'white' : '#111827',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isSelected ? 'bold' : 'normal'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f3f4f6'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => setShowPicker(true)}
          placeholder={placeholder}
          required={required}
          style={{ flex: 1 }}
          pattern="\d{2}/\d{2}/\d{4}"
          maxLength={10}
        />
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          style={{
            padding: '8px 12px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title="Abrir calendario"
        >
          📅
        </button>
      </div>
      {showPicker && renderCalendar()}
      {displayValue && !parseFromChilean(displayValue) && (
        <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>
          Formato: DD/MM/AAAA
        </small>
      )}
      {/* Click fuera para cerrar */}
      {showPicker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

