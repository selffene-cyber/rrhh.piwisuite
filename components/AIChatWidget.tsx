'use client'

import { useState, useRef, useEffect } from 'react'
import { FaRobot, FaTimes, FaPaperPlane, FaSpinner } from 'react-icons/fa'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIChatWidgetProps {
  isOpen: boolean
  onClose: () => void
}

export default function AIChatWidget({ isOpen, onClose }: AIChatWidgetProps) {
  const { companyId } = useCurrentCompany()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de RRHH. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre liquidaciones, trabajadores, vacaciones, o cualquier tema relacionado con remuneraciones.',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setLoading(true)
    setError(null)

    try {
      // Validar que tenemos companyId antes de enviar
      if (!companyId) {
        throw new Error('No se ha seleccionado una empresa. Por favor, selecciona una empresa en la aplicación.')
      }

      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          companyId: companyId, // Enviar el companyId actual
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Si es error 429 (rate limit), mostrar información más detallada
        if (response.status === 429) {
          const resetAt = errorData.rateLimit?.resetAt
          const resetInMinutes = resetAt 
            ? Math.ceil((resetAt - Date.now()) / (60 * 1000))
            : null
          
          const errorMsg = resetInMinutes 
            ? `${errorData.error}\n\nPodrás hacer nuevas consultas en aproximadamente ${resetInMinutes} minutos.`
            : errorData.error
            
          throw new Error(errorMsg)
        }
        
        throw new Error(errorData.error || 'Error al obtener respuesta')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      
      // Mostrar información de rate limit si está disponible (solo en desarrollo)
      if (process.env.NODE_ENV === 'development' && data.rateLimit) {
        console.log('Rate limit info:', {
          remaining: data.rateLimit.remaining,
          limit: data.rateLimit.limit,
          resetAt: new Date(data.rateLimit.resetAt).toLocaleString('es-CL')
        })
      }
    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con el asistente')
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Lo siento, ocurrió un error: ${err.message || 'Error desconocido'}. Por favor, intenta nuevamente.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '400px',
        maxWidth: 'calc(100vw - 40px)',
        height: '600px',
        maxHeight: 'calc(100vh - 40px)',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10000,
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaRobot size={20} />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Asistente IA
            </h3>
            <p style={{ margin: 0, fontSize: '11px', opacity: 0.9 }}>
              Powered by Gemini
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FaTimes size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#f9fafb',
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: message.role === 'user' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'white',
                color: message.role === 'user' ? 'white' : '#111827',
                boxShadow: message.role === 'assistant' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}
            >
              {message.content}
            </div>
            <span
              style={{
                fontSize: '10px',
                color: '#6b7280',
                marginTop: '4px',
                paddingLeft: message.role === 'user' ? '0' : '4px',
                paddingRight: message.role === 'user' ? '4px' : '0',
              }}
            >
              {message.timestamp.toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <FaSpinner className="fa-spin" size={16} color="#667eea" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #e5e7eb',
          background: 'white',
          borderRadius: '0 0 16px 16px',
        }}
      >
        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              marginBottom: '12px',
              fontSize: '12px',
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            style={{
              padding: '10px 16px',
              background: inputValue.trim() && !loading
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: inputValue.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              height: '44px',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <FaSpinner className="fa-spin" size={16} />
            ) : (
              <FaPaperPlane size={16} />
            )}
          </button>
        </div>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .fa-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}





