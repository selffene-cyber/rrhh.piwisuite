'use client'

import { useState, useEffect } from 'react'

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Registrar service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        setRegistration(reg)
        console.log('[PWA] Service Worker registrado:', reg)

        // Verificar actualizaciones cada hora
        setInterval(() => {
          reg.update()
        }, 60 * 60 * 1000)

        // Escuchar actualizaciones
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay una nueva versión disponible
              console.log('[PWA] Nueva versión disponible')
              setUpdateAvailable(true)
            }
          })
        })
      })
      .catch((error) => {
        console.error('[PWA] Error al registrar Service Worker:', error)
      })

    // Escuchar cuando el service worker toma control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Service Worker actualizado, recargando...')
      window.location.reload()
    })
  }, [])

  const update = async () => {
    if (!registration || !registration.waiting) {
      return
    }

    setIsUpdating(true)

    // Enviar mensaje al service worker para que se active
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })

    // Esperar a que el nuevo service worker tome control
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve()
      })
    })

    // Recargar la página
    window.location.reload()
  }

  const checkForUpdate = async () => {
    if (registration) {
      await registration.update()
    }
  }

  return {
    updateAvailable,
    isUpdating,
    update,
    checkForUpdate,
  }
}
