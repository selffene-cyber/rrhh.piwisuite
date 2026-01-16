/**
 * BankSelector Component
 * ComboBox con búsqueda para seleccionar banco
 * Agrupa instituciones por tipo: Bancos, Cooperativas, Prepago, Otros
 * Permite a admins agregar nuevas instituciones
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { FaSearch, FaPlus, FaTimes, FaBuilding, FaExclamationTriangle } from 'react-icons/fa'
import { getActiveBanks, groupBanksByType, type Bank } from '@/lib/utils/employeeBankHelper'

interface BankSelectorProps {
  value?: string | null // bank_id seleccionado
  onChange: (bankId: string | null, bankName: string | null) => void
  legacyBankName?: string | null // Para mostrar valor legacy
  isAdmin?: boolean // Si true, muestra botón "+ Agregar institución"
  disabled?: boolean
  required?: boolean
  error?: string
  onNormalize?: () => void // Callback para normalizar banco legacy
}

export default function BankSelector({
  value,
  onChange,
  legacyBankName,
  isAdmin = false,
  disabled = false,
  required = false,
  error,
  onNormalize
}: BankSelectorProps) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cargar bancos al montar
  useEffect(() => {
    loadBanks()
  }, [])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const loadBanks = async () => {
    setLoading(true)
    try {
      const data = await getActiveBanks()
      setBanks(data)
    } catch (error) {
      console.error('Error cargando bancos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Banco seleccionado
  const selectedBank = banks.find(b => b.id === value)

  // Filtrar bancos por búsqueda
  const filteredBanks = searchQuery.trim()
    ? banks.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : banks

  // Agrupar bancos filtrados
  const grouped = groupBanksByType(filteredBanks)

  // Mostrar modo legacy (trabajador antiguo con bank_name)
  const isLegacy = !value && legacyBankName

  const handleSelect = (bank: Bank) => {
    onChange(bank.id, bank.name)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onChange(null, null)
    setSearchQuery('')
  }

  const handleAddBank = () => {
    setShowAddModal(true)
    setIsOpen(false)
  }

  const handleBankAdded = (bank: Bank) => {
    // Recargar lista y autoseleccionar el nuevo banco
    loadBanks()
    onChange(bank.id, bank.name)
    setShowAddModal(false)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Modo Legacy - Advertencia */}
      {isLegacy && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '6px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#92400e'
          }}
        >
          <FaExclamationTriangle />
          <div style={{ flex: 1 }}>
            <strong>Banco legacy:</strong> {legacyBankName}
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#78350f' }}>
              Este trabajador usa el sistema antiguo de bancos.
            </p>
          </div>
          {isAdmin && onNormalize && (
            <button
              type="button"
              onClick={onNormalize}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: '#fbbf24',
                color: '#78350f',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Normalizar
            </button>
          )}
        </div>
      )}

      {/* Input/Botón principal */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
          borderRadius: '8px',
          background: disabled ? '#f3f4f6' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          minHeight: '42px'
        }}
      >
        <FaBuilding style={{ color: '#6b7280', fontSize: '16px' }} />
        <div style={{ flex: 1 }}>
          {selectedBank ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#111827' }}>
                {selectedBank.name}
              </span>
              <span
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: '600',
                  background: getBankTypeColor(selectedBank.type).bg,
                  color: getBankTypeColor(selectedBank.type).text,
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}
              >
                {getBankTypeLabel(selectedBank.type)}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              {required ? 'Selecciona un banco *' : 'Selecciona un banco'}
            </span>
          )}
        </div>
        {selectedBank && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            style={{
              padding: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '14px'
            }}
          >
            <FaTimes />
          </button>
        )}
      </div>

      {error && (
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ef4444' }}>
          {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '400px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Búsqueda */}
          <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: '#f9fafb'
              }}
            >
              <FaSearch style={{ color: '#6b7280', fontSize: '14px' }} />
              <input
                type="text"
                placeholder="Buscar banco..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  padding: 0
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Lista de bancos */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Cargando bancos...
              </div>
            ) : filteredBanks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#6b7280', margin: 0 }}>
                  No se encontraron bancos
                </p>
              </div>
            ) : (
              <>
                {/* Bancos */}
                {grouped.bancos.length > 0 && (
                  <BankGroup
                    title="Bancos"
                    banks={grouped.bancos}
                    onSelect={handleSelect}
                    selectedId={value}
                  />
                )}

                {/* Cooperativas */}
                {grouped.cooperativas.length > 0 && (
                  <BankGroup
                    title="Cooperativas"
                    banks={grouped.cooperativas}
                    onSelect={handleSelect}
                    selectedId={value}
                  />
                )}

                {/* Prepago / Fintech */}
                {grouped.prepago.length > 0 && (
                  <BankGroup
                    title="Prepago / Fintech"
                    banks={grouped.prepago}
                    onSelect={handleSelect}
                    selectedId={value}
                  />
                )}

                {/* Otros */}
                {grouped.otros.length > 0 && (
                  <BankGroup
                    title="Otros"
                    banks={grouped.otros}
                    onSelect={handleSelect}
                    selectedId={value}
                  />
                )}
              </>
            )}
          </div>

          {/* Botón agregar (solo admins) */}
          {isAdmin && (
            <div style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={handleAddBank}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                <FaPlus />
                Agregar nueva institución
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para agregar banco */}
      {showAddModal && isAdmin && (
        <AddBankModal
          onClose={() => setShowAddModal(false)}
          onBankAdded={handleBankAdded}
        />
      )}
    </div>
  )
}

// Componente para grupo de bancos
function BankGroup({
  title,
  banks,
  onSelect,
  selectedId
}: {
  title: string
  banks: Bank[]
  onSelect: (bank: Bank) => void
  selectedId?: string | null
}) {
  return (
    <div>
      <div
        style={{
          padding: '8px 16px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '11px',
          fontWeight: '600',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {title}
      </div>
      {banks.map((bank) => (
        <div
          key={bank.id}
          onClick={() => onSelect(bank)}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            background: selectedId === bank.id ? '#eff6ff' : 'transparent',
            borderBottom: '1px solid #f3f4f6',
            fontSize: '14px',
            color: '#111827',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            if (selectedId !== bank.id) {
              e.currentTarget.style.background = '#f9fafb'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedId !== bank.id) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          {bank.name}
        </div>
      ))}
    </div>
  )
}

// Modal para agregar banco
function AddBankModal({
  onClose,
  onBankAdded
}: {
  onClose: () => void
  onBankAdded: (bank: Bank) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'banco' | 'cooperativa' | 'prepago' | 'otro'>('banco')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al crear banco')
        setLoading(false)
        return
      }

      // Éxito
      onBankAdded(data.bank)
    } catch (error) {
      console.error('Error creando banco:', error)
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '450px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Agregar Nueva Institución
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Nombre de la institución *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Banco de Chile"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Tipo *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none'
              }}
            >
              <option value="banco">Banco</option>
              <option value="cooperativa">Cooperativa</option>
              <option value="prepago">Prepago / Fintech</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {error && (
            <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '6px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>
                {error}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '14px',
                fontWeight: '600',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '14px',
                fontWeight: '600',
                background: loading ? '#9ca3af' : '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creando...' : 'Crear Institución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Helpers para colores y labels
function getBankTypeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case 'banco':
      return { bg: '#dbeafe', text: '#1e40af' }
    case 'cooperativa':
      return { bg: '#d1fae5', text: '#065f46' }
    case 'prepago':
      return { bg: '#fef3c7', text: '#92400e' }
    case 'otro':
      return { bg: '#f3f4f6', text: '#374151' }
    default:
      return { bg: '#f3f4f6', text: '#374151' }
  }
}

function getBankTypeLabel(type: string): string {
  switch (type) {
    case 'banco':
      return 'Banco'
    case 'cooperativa':
      return 'Coop'
    case 'prepago':
      return 'Prepago'
    case 'otro':
      return 'Otro'
    default:
      return type
  }
}

