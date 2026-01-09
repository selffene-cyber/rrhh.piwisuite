'use client'

import { useState, useEffect, useRef, ChangeEvent, FocusEvent } from 'react'
import { formatRut, cleanRut, validateRutWithMessage, hasRutChanged } from '@/lib/utils/rutHelper'

interface RutInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  originalValue?: string  // Para detectar si cambió (retrocompatibilidad)
  skipValidationIfUnchanged?: boolean  // No validar si no cambió
  placeholder?: string
  autoComplete?: string
}

export default function RutInput({
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  originalValue,
  skipValidationIfUnchanged = false,
  placeholder = 'Ej: 18.968.229-8',
  autoComplete = 'off'
}: RutInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincronizar displayValue con value (para carga inicial y updates externos)
  useEffect(() => {
    if (value) {
      setDisplayValue(formatRut(value))
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const cursorPosition = e.target.selectionStart || 0
    
    // Limpiar (solo dígitos + K)
    const cleaned = cleanRut(input)
    
    // Formatear
    const formatted = cleaned ? formatRut(cleaned) : ''
    
    // Calcular nueva posición del cursor
    // (intentar mantener cursor estable después del formateo)
    const charsBeforeCursor = input.slice(0, cursorPosition).replace(/[^0-9kK]/gi, '').length
    let newCursorPos = 0
    let charCount = 0
    
    for (let i = 0; i < formatted.length && charCount < charsBeforeCursor; i++) {
      if (/[0-9kK]/i.test(formatted[i])) {
        charCount++
      }
      newCursorPos = i + 1
    }
    
    // Actualizar display
    setDisplayValue(formatted)
    
    // Actualizar valor limpio hacia el padre
    onChange(cleaned)
    
    // Limpiar error mientras escribe
    if (error) {
      setError(null)
    }
    
    // Restaurar posición del cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setTouched(true)
    
    const rutValue = e.target.value
    
    // Si está vacío y no es requerido, no validar
    if (!rutValue && !required) {
      setError(null)
      if (onBlur) onBlur()
      return
    }
    
    // Si no cambió y se debe omitir validación (retrocompatibilidad)
    if (
      skipValidationIfUnchanged && 
      originalValue && 
      !hasRutChanged(originalValue, cleanRut(rutValue))
    ) {
      setError(null)
      if (onBlur) onBlur()
      return
    }
    
    // Validar
    const validation = validateRutWithMessage(rutValue)
    
    if (!validation.valid) {
      setError(validation.error || 'RUT inválido')
    } else {
      setError(null)
    }
    
    if (onBlur) onBlur()
  }

  const handleFocus = () => {
    setTouched(true)
  }

  return (
    <div style={{ width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={12}  // XX.XXX.XXX-X = 12 caracteres
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '14px',
          border: error && touched ? '1px solid #ef4444' : '1px solid #ccc',
          borderRadius: '4px',
          outline: 'none',
          transition: 'border-color 0.2s',
          backgroundColor: disabled ? '#f5f5f5' : 'white',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
      />
      
      {error && touched && (
        <div 
          style={{ 
            marginTop: '4px', 
            fontSize: '12px', 
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      
      {!error && touched && displayValue && (
        <div 
          style={{ 
            marginTop: '4px', 
            fontSize: '12px', 
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>✓</span>
          <span>RUT válido</span>
        </div>
      )}
    </div>
  )
}

// =====================================================
// Componente auxiliar: Display de RUT formateado
// =====================================================

interface RutDisplayProps {
  rut: string
  fallback?: string
}

/**
 * Componente para mostrar RUT formateado en display (no editable)
 * Uso: <RutDisplay rut={employee.rut} />
 */
export function RutDisplay({ rut, fallback = '-' }: RutDisplayProps) {
  if (!rut) return <span>{fallback}</span>
  
  const formatted = formatRut(rut)
  return <span style={{ fontFamily: 'monospace' }}>{formatted || fallback}</span>
}


