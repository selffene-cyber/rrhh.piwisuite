/**
 * RegionCommuneSelector Component
 * Selector de Región y Comuna con dropdowns dependientes
 * Datos desde BD local (API DPA sincronizada)
 * Retrocompatibilidad con datos legacy
 */

'use client'

import { useState, useEffect } from 'react'
import { FaMapMarkerAlt, FaExclamationTriangle } from 'react-icons/fa'
import {
  getActiveRegions,
  getActiveCommunes,
  type GeoRegion,
  type GeoCommune
} from '@/lib/utils/employeeLocationHelper'

interface RegionCommuneSelectorProps {
  regionValue?: string | null  // region_id seleccionado
  communeValue?: string | null // commune_id seleccionado
  onChange: (regionId: string | null, communeId: string | null) => void
  legacyRegionName?: string | null
  legacyCityName?: string | null
  isAdmin?: boolean
  disabled?: boolean
  onNormalize?: () => void
}

export default function RegionCommuneSelector({
  regionValue,
  communeValue,
  onChange,
  legacyRegionName,
  legacyCityName,
  isAdmin = false,
  disabled = false,
  onNormalize
}: RegionCommuneSelectorProps) {
  const [regions, setRegions] = useState<GeoRegion[]>([])
  const [communes, setCommunes] = useState<GeoCommune[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingCommunes, setLoadingCommunes] = useState(false)
  const [communeSearch, setCommuneSearch] = useState('')

  // Cargar regiones al montar
  useEffect(() => {
    loadRegions()
  }, [])

  // Cargar comunas cuando cambia la región seleccionada
  useEffect(() => {
    if (regionValue) {
      loadCommunes(regionValue)
    } else {
      setCommunes([])
    }
  }, [regionValue])

  const loadRegions = async () => {
    setLoadingRegions(true)
    try {
      const data = await getActiveRegions()
      setRegions(data)
    } catch (error) {
      console.error('Error cargando regiones:', error)
    } finally {
      setLoadingRegions(false)
    }
  }

  const loadCommunes = async (regId: string) => {
    setLoadingCommunes(true)
    try {
      const data = await getActiveCommunes(regId)
      setCommunes(data)
    } catch (error) {
      console.error('Error cargando comunas:', error)
    } finally {
      setLoadingCommunes(false)
    }
  }

  const selectedRegion = regions.find(r => r.id === regionValue)
  const selectedCommune = communes.find(c => c.id === communeValue)

  // Filtrar comunas por búsqueda
  const filteredCommunes = communeSearch.trim()
    ? communes.filter(c =>
        c.name.toLowerCase().includes(communeSearch.toLowerCase())
      )
    : communes

  const handleRegionChange = (newRegionId: string) => {
    // Al cambiar región, resetear comuna
    onChange(newRegionId, null)
    setCommuneSearch('')
  }

  const handleCommuneChange = (newCommuneId: string) => {
    onChange(regionValue || null, newCommuneId)
  }

  const handleClearRegion = () => {
    onChange(null, null)
    setCommuneSearch('')
  }

  const handleClearCommune = () => {
    onChange(regionValue || null, null)
    setCommuneSearch('')
  }

  // Mostrar modo legacy
  const isLegacy = !regionValue && !communeValue && (legacyRegionName || legacyCityName)

  return (
    <div style={{ width: '100%' }}>
      {/* Modo Legacy - Advertencia */}
      {isLegacy && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '6px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#92400e'
          }}
        >
          <FaExclamationTriangle />
          <div style={{ flex: 1 }}>
            <strong>Ubicación legacy:</strong>
            {legacyRegionName && ` ${legacyRegionName}`}
            {legacyCityName && `, ${legacyCityName}`}
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#78350f' }}>
              Este trabajador usa el sistema antiguo de ubicación.
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Selector de Región */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Región
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={regionValue || ''}
              onChange={(e) => handleRegionChange(e.target.value)}
              disabled={disabled || loadingRegions}
              style={{
                width: '100%',
                padding: '10px 14px',
                paddingLeft: '36px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: disabled ? '#f3f4f6' : '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                outline: 'none'
              }}
            >
              <option value="">Selecciona región</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            <FaMapMarkerAlt 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                fontSize: '16px',
                pointerEvents: 'none'
              }}
            />
            {regionValue && !disabled && (
              <button
                type="button"
                onClick={handleClearRegion}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '4px 8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                ✕
              </button>
            )}
          </div>
          {loadingRegions && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Cargando regiones...
            </p>
          )}
        </div>

        {/* Selector de Comuna */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Comuna
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={communeValue || ''}
              onChange={(e) => handleCommuneChange(e.target.value)}
              disabled={disabled || !regionValue || loadingCommunes}
              style={{
                width: '100%',
                padding: '10px 14px',
                paddingLeft: '36px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: disabled || !regionValue ? '#f3f4f6' : '#fff',
                cursor: disabled || !regionValue ? 'not-allowed' : 'pointer',
                outline: 'none'
              }}
            >
              <option value="">
                {!regionValue
                  ? 'Selecciona región primero'
                  : loadingCommunes
                  ? 'Cargando comunas...'
                  : 'Selecciona comuna'}
              </option>
              {filteredCommunes.map((commune) => (
                <option key={commune.id} value={commune.id}>
                  {commune.name}
                </option>
              ))}
            </select>
            <FaMapMarkerAlt 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                fontSize: '16px',
                pointerEvents: 'none'
              }}
            />
            {communeValue && !disabled && (
              <button
                type="button"
                onClick={handleClearCommune}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '4px 8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                ✕
              </button>
            )}
          </div>
          {regionValue && communes.length === 0 && !loadingCommunes && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ef4444' }}>
              No hay comunas disponibles para esta región
            </p>
          )}
        </div>
      </div>

      {/* Información de ubicación seleccionada */}
      {selectedRegion && selectedCommune && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaMapMarkerAlt />
          <span>
            <strong>Ubicación:</strong> {selectedCommune.name}, {selectedRegion.name}
          </span>
        </div>
      )}
    </div>
  )
}

