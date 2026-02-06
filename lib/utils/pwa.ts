// Utilidades para PWA

export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope)

        // Verificar actualizaciones periódicamente
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000) // Cada hora
      })
      .catch((error) => {
        console.error('[PWA] Error al registrar Service Worker:', error)
      })
  })
}

export const isPWAInstalled = (): boolean => {
  if (typeof window === 'undefined') return false

  // iOS
  if ((window.navigator as any).standalone === true) {
    return true
  }

  // Android/Chrome
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }

  return false
}

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
}

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false
  return /android/.test(navigator.userAgent.toLowerCase())
}
