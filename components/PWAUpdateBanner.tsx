'use client'

import { useState, useEffect } from 'react'
import { usePWAUpdate } from '@/lib/hooks/usePWAUpdate'
import { RefreshCw, X } from 'lucide-react'

interface PWAUpdateBannerProps {
  className?: string
}

export default function PWAUpdateBanner({ className = '' }: PWAUpdateBannerProps) {
  const { updateAvailable, isUpdating, update } = usePWAUpdate()
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (updateAvailable && !dismissed) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [updateAvailable, dismissed])

  const handleUpdate = async () => {
    await update()
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setDismissed(true)
    // Volver a mostrar después de 24 horas
    setTimeout(() => {
      setDismissed(false)
    }, 24 * 60 * 60 * 1000)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={`pwa-update-banner ${className}`}>
      <div className="pwa-update-content">
        <div className="pwa-update-icon">
          <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
        </div>
        
        <div className="pwa-update-text">
          <p className="pwa-update-title">Actualización disponible</p>
          <p className="pwa-update-description">
            Hay una nueva versión de la app disponible
          </p>
        </div>

        <div className="pwa-update-actions">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="pwa-update-button"
          >
            {isUpdating ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            onClick={handleDismiss}
            className="pwa-update-close"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
