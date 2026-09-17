'use client'

import { useState, useEffect, useCallback } from 'react'

interface ActionOverlayProps {
  isVisible: boolean
  message?: string
  errorMessage?: string | null
  onSuccess?: () => void
}

export default function ActionOverlay({ 
  isVisible, 
  message = 'Procesando...', 
  errorMessage,
}: ActionOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const [animateOut, setAnimateOut] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShowOverlay(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true)
        })
      })
    } else if (showOverlay) {
      setAnimateIn(false)
      setAnimateOut(true)
      const timer = setTimeout(() => {
        setShowOverlay(false)
        setAnimateOut(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  if (!showOverlay) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: animateIn && !animateOut ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
        transition: 'background-color 300ms ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          transform: animateIn && !animateOut ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(10px)',
          opacity: animateIn && !animateOut ? 1 : 0,
          transition: 'all 300ms ease-in-out',
          maxWidth: '400px',
          textAlign: 'center',
        }}
      >
        {errorMessage ? (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '15px' }}>
              Error
            </div>
            <div style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.5' }}>
              {errorMessage}
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              position: 'relative',
            }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                style={{
                  animation: 'spin 1.2s linear infinite',
                }}
              >
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeDasharray="40 86"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ color: '#374151', fontWeight: 500, fontSize: '15px' }}>
              {message}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function useActionOverlay() {
  const [isActing, setIsActing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const executeAction = useCallback(async (action: () => Promise<void>, message?: string) => {
    setErrorMessage(null)
    setIsActing(true)
    try {
      await action()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Error al procesar la accion')
      setTimeout(() => setErrorMessage(null), 4000)
    } finally {
      setIsActing(false)
    }
  }, [])

  return { isActing, errorMessage, executeAction }
}