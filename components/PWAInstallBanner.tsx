'use client'

import { useState, useEffect } from 'react'
import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { X, Download, Share2 } from 'lucide-react'

// Solo mostrar en móviles
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

interface PWAInstallBannerProps {
  className?: string
}

export default function PWAInstallBanner({ className = '' }: PWAInstallBannerProps) {
  const { isInstalled, isIOS, isAndroid, showBanner, install, dismissBanner, canInstall } = usePWAInstall()
  const [isVisible, setIsVisible] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkMobile = () => {
      return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    }
    
    setIsMobileDevice(checkMobile())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Verificar si es móvil
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Mostrar si:
    // 1. showBanner es true (desde el hook)
    // 2. No está instalada
    // 3. Es dispositivo móvil o ancho <= 768px
    const shouldShow = showBanner && !isInstalled && isMobile
    
    setIsVisible(shouldShow)
    
    // Debug en consola (siempre mostrar para debugging)
    console.log('[PWA Banner] Estado completo:', { 
      showBanner, 
      isInstalled, 
      canInstall, 
      isMobileDevice: isMobile, 
      isIOS, 
      isAndroid,
      shouldShow,
      windowWidth: window.innerWidth,
      userAgent: navigator.userAgent.substring(0, 50)
    })
  }, [showBanner, isInstalled, canInstall, isMobileDevice, isIOS, isAndroid])
  
  // También escuchar cambios de tamaño de ventana
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobileDevice(isMobile)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Debug: mostrar siempre en consola si no se muestra
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (!isVisible && !isInstalled) {
      console.log('[PWA Banner] NO VISIBLE - Razones:', {
        showBanner,
        isInstalled,
        isMobileDevice,
        windowWidth: window.innerWidth
      })
    }
  }, [isVisible, isInstalled, showBanner, isMobileDevice])

  if (!isVisible || isInstalled) {
    return null
  }

  const handleInstall = async () => {
    if (isIOS) {
      // En iOS, solo mostrar instrucciones (no hay API de instalación)
      return
    }
    
    const success = await install()
    if (success) {
      setIsVisible(false)
      dismissBanner()
    }
  }

  return (
    <div className={`pwa-install-banner ${className}`}>
      <div className="pwa-install-content">
        <div className="pwa-install-icon">
          <Download size={20} />
        </div>
        
        <div className="pwa-install-text">
          <p className="pwa-install-title">Instalar App</p>
          {isIOS ? (
            <p className="pwa-install-description">
              Toca el botón <strong>Compartir</strong> <Share2 size={12} className="inline mx-1" /> y luego <strong>"Añadir a pantalla de inicio"</strong>
            </p>
          ) : isAndroid ? (
            <p className="pwa-install-description">
              Instala la app para acceso rápido desde tu pantalla de inicio
            </p>
          ) : (
            <p className="pwa-install-description">
              Instala la app para una mejor experiencia
            </p>
          )}
        </div>

        <div className="pwa-install-actions">
          {!isIOS && (
            <button
              onClick={handleInstall}
              className="pwa-install-button"
            >
              Instalar
            </button>
          )}
          <button
            onClick={dismissBanner}
            className="pwa-install-close"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
