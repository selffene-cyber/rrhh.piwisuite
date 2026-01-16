'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { FaCheckCircle, FaTimesCircle, FaQrcode, FaFilePdf, FaDownload } from 'react-icons/fa'

interface VerificationResult {
  valid: boolean
  document?: {
    id: string
    type: 'certificate' | 'vacation' | 'permission'
    status: string
    signed_pdf_url?: string
    pdf_hash?: string
    verification_code?: string
    verification_url?: string
    qr_code_data?: any
    approved_at?: string
    approved_by?: string
    employee?: {
      full_name: string
      rut: string
    }
    company?: {
      name: string
      rut: string
    }
  }
  error?: string
}

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const [verificationCode, setVerificationCode] = useState('')
  const [documentType, setDocumentType] = useState<'certificate' | 'vacation' | 'permission' | ''>('')
  const [documentId, setDocumentId] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)

  useEffect(() => {
    // Obtener parámetros de la URL
    const code = searchParams.get('code')
    const type = searchParams.get('type') as 'certificate' | 'vacation' | 'permission' | null
    const id = searchParams.get('id')

    if (code) {
      setVerificationCode(code)
    }
    if (type) {
      setDocumentType(type)
    }
    if (id) {
      setDocumentId(id)
    }

    // Si hay código, tipo e ID, verificar automáticamente
    if (code && type && id) {
      handleVerify(code, type, id)
    }
  }, [searchParams])

  const handleVerify = async (
    code?: string,
    type?: 'certificate' | 'vacation' | 'permission',
    id?: string
  ) => {
    const verifyCode = code || verificationCode
    const verifyType = type || documentType
    const verifyId = id || documentId

    if (!verifyCode || !verifyType || !verifyId) {
      setResult({
        valid: false,
        error: 'Por favor, completa todos los campos requeridos',
      })
      return
    }

    try {
      setVerifying(true)
      setResult(null)

      // Llamar a la API de verificación
      const response = await fetch(
        `/api/verify?code=${encodeURIComponent(verifyCode)}&type=${verifyType}&id=${verifyId}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al verificar documento')
      }

      setResult(data)
    } catch (error: any) {
      console.error('Error al verificar:', error)
      setResult({
        valid: false,
        error: error.message || 'Error al verificar el documento',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleVerify()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '40px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <FaQrcode
            style={{
              fontSize: '48px',
              color: '#3b82f6',
              marginBottom: '16px',
            }}
          />
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold' }}>
            Verificación de Documentos
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
            Verifica la autenticidad e integridad de certificados, vacaciones y permisos
          </p>
        </div>

        {!result && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                Tipo de Documento *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as any)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Selecciona un tipo</option>
                <option value="certificate">Certificado</option>
                <option value="vacation">Vacaciones</option>
                <option value="permission">Permiso</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                ID del Documento *
              </label>
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                required
                placeholder="Ingresa el ID del documento"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                Código de Verificación *
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                placeholder="Ingresa el código de verificación"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                }}
              />
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '12px' }}>
                Este código se encuentra en el documento PDF firmado
              </p>
            </div>

            <button
              type="submit"
              disabled={verifying}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: verifying ? 'not-allowed' : 'pointer',
                opacity: verifying ? 0.6 : 1,
              }}
            >
              {verifying ? 'Verificando...' : 'Verificar Documento'}
            </button>
          </form>
        )}

        {result && (
          <div>
            {result.valid ? (
              <div
                style={{
                  padding: '24px',
                  backgroundColor: '#d1fae5',
                  borderRadius: '8px',
                  border: '2px solid #10b981',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <FaCheckCircle style={{ fontSize: '32px', color: '#10b981' }} />
                  <h2 style={{ margin: 0, color: '#065f46', fontSize: '20px' }}>
                    Documento Verificado
                  </h2>
                </div>
                <p style={{ margin: '0 0 16px 0', color: '#065f46' }}>
                  Este documento ha sido verificado y es auténtico. La firma digital es válida y el
                  documento no ha sido alterado.
                </p>

                {result.document && (
                  <div
                    style={{
                      backgroundColor: 'white',
                      padding: '16px',
                      borderRadius: '6px',
                      marginTop: '16px',
                    }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
                      Información del Documento
                    </h3>
                    <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                      <div>
                        <strong>Tipo:</strong>{' '}
                        {result.document.type === 'certificate'
                          ? 'Certificado'
                          : result.document.type === 'vacation'
                          ? 'Vacaciones'
                          : 'Permiso'}
                      </div>
                      {result.document.employee && (
                        <>
                          <div>
                            <strong>Trabajador:</strong> {result.document.employee.full_name}
                          </div>
                          <div>
                            <strong>RUT:</strong> {result.document.employee.rut}
                          </div>
                        </>
                      )}
                      {result.document.company && (
                        <>
                          <div>
                            <strong>Empresa:</strong> {result.document.company.name}
                          </div>
                          <div>
                            <strong>RUT Empresa:</strong> {result.document.company.rut}
                          </div>
                        </>
                      )}
                      {result.document.approved_at && (
                        <div>
                          <strong>Fecha de Aprobación:</strong>{' '}
                          {new Date(result.document.approved_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                      <div>
                        <strong>Estado:</strong> {result.document.status}
                      </div>
                    </div>

                    {result.document.signed_pdf_url && (
                      <div style={{ marginTop: '16px' }}>
                        <a
                          href={result.document.signed_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                        >
                          <FaFilePdf /> Descargar PDF Firmado
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: '24px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '8px',
                  border: '2px solid #ef4444',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <FaTimesCircle style={{ fontSize: '32px', color: '#ef4444' }} />
                  <h2 style={{ margin: 0, color: '#991b1b', fontSize: '20px' }}>
                    Verificación Fallida
                  </h2>
                </div>
                <p style={{ margin: 0, color: '#991b1b' }}>
                  {result.error ||
                    'No se pudo verificar el documento. El código de verificación puede ser incorrecto o el documento puede no existir.'}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setResult(null)
                setVerificationCode('')
                setDocumentType('')
                setDocumentId('')
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Verificar Otro Documento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

