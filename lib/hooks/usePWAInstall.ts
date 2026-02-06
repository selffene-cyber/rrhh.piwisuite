'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detectar plataforma
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)
    
    setIsIOS(isIOSDevice)
    setIsAndroid(isAndroidDevice)

    // Verificar si ya está instalada
    const checkInstalled = () => {
      // Para iOS
      if (isIOSDevice) {
        // En iOS, si está en modo standalone, está instalada
        const isStandalone = (window.navigator as any).standalone === true
        if (isStandalone) {
          setIsInstalled(true)
          return true
        }
      }

      // Para Android/Chrome
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return true
      }

      // Verificar si está en pantalla de inicio (Android)
      if (window.matchMedia('(display-mode: fullscreen)').matches) {
        setIsInstalled(true)
        return true
      }

      return false
    }

    const installed = checkInstalled()

    // Función para mostrar el banner
    const showBannerIfNeeded = () => {
      const bannerDismissed = localStorage.getItem('pwa-install-banner-dismissed')
      const currentlyInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                                  (window.navigator as any).standalone === true
      
      if (!bannerDismissed && !currentlyInstalled && !installed) {
        console.log('[PWA] Mostrando banner de instalación')
        setShowBanner(true)
      }
    }

    let deferredPromptValue: BeforeInstallPromptEvent | null = null

    // Escuchar evento beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      deferredPromptValue = promptEvent
      setDeferredPrompt(promptEvent)
      console.log('[PWA] Evento beforeinstallprompt recibido')
      
      // Mostrar banner después de un delay
      setTimeout(() => {
        showBannerIfNeeded()
      }, 2000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Para Android/iOS o modo desarrollo, mostrar banner después de un delay
    // (incluso si no se dispara beforeinstallprompt, útil para testing)
    const bannerDismissed = localStorage.getItem('pwa-install-banner-dismissed')
    const isMobileView = window.innerWidth <= 768
    
    if ((isIOSDevice || isAndroidDevice || isMobileView) && !bannerDismissed && !installed) {
      // Esperar un poco para dar tiempo a que se dispare beforeinstallprompt
      const timer = setTimeout(() => {
        // Mostrar banner después de 2 segundos si es móvil/Android/iOS
        console.log('[PWA] Mostrando banner (móvil/Android/iOS detectado)', {
          isIOSDevice,
          isAndroidDevice,
          isMobileView,
          hasPrompt: !!deferredPromptValue
        })
        setShowBanner(true)
      }, 2000)

      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) {
      return false
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setShowBanner(false)
        setDeferredPrompt(null)
        return true
      }
      
      setDeferredPrompt(null)
      return false
    } catch (error) {
      console.error('Error al instalar PWA:', error)
      return false
    }
  }

  const dismissBanner = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-install-banner-dismissed', 'true')
  }

  return {
    isInstalled,
    isIOS,
    isAndroid,
    showBanner,
    install,
    dismissBanner,
    canInstall: !!deferredPrompt || isIOS || isAndroid, // Permitir mostrar en Android incluso sin prompt (modo desarrollo)
  }
}
