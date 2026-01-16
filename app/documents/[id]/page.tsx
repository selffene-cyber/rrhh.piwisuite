'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/date'
import { FaDownload, FaUpload, FaHistory, FaCheck, FaFile, FaArchive, FaUndo } from 'react-icons/fa'

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  const [loading, setLoading] = useState(true)
  const [document, setDocument] = useState<any>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  useEffect(() => {
    loadData()
  }, [documentId])

  const loadData = async () => {
    try {
      setLoading(true)

      const [docResponse, versionsResponse] = await Promise.all([
        fetch(`/api/documents/${documentId}`),
        fetch(`/api/documents/${documentId}/versions`),
      ])

      const doc = await docResponse.json()
      const vers = await versionsResponse.json()

      setDocument(doc)
      setVersions(vers)
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadVersion = async () => {
    if (!uploadFile || !document) return

    try {
      // 1. Subir archivo
      const uploadFormData = new FormData()
      uploadFormData.append('file', uploadFile)
      uploadFormData.append('company_id', document.company_id)

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Error al subir archivo')
      }

      const uploadData = await uploadResponse.json()

      // 2. Crear nueva versión
      const versionResponse = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_url: uploadData.file_url,
          file_name: uploadData.file_name,
          file_type: uploadData.file_type,
          file_size: uploadData.file_size,
          is_current: true, // Marcar como vigente automáticamente
        }),
      })

      if (!versionResponse.ok) {
        const error = await versionResponse.json()
        throw new Error(error.error || 'Error al crear versión')
      }

      alert('Nueva versión creada correctamente')
      setShowUploadForm(false)
      setUploadFile(null)
      loadData()
    } catch (error: any) {
      alert('Error al subir versión: ' + error.message)
    }
  }

  const handleSetCurrentVersion = async (versionId: string) => {
    if (!confirm('¿Está seguro de marcar esta versión como vigente?')) return

    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions/${versionId}/set-current`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al establecer versión vigente')
      }

      alert('Versión marcada como vigente')
      loadData()
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const handleArchive = async () => {
    if (!confirm('¿Está seguro de archivar este documento?')) return

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al archivar documento')
      }

      alert('Documento archivado correctamente')
      router.push('/documents')
    } catch (error: any) {
      alert('Error al archivar documento: ' + error.message)
    }
  }

  const handleRestore = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/restore`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al restaurar documento')
      }

      alert('Documento restaurado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al restaurar documento: ' + error.message)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!document) {
    return <div>Documento no encontrado</div>
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1>{document.name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {document.status === 'active' ? (
            <button onClick={handleArchive} className="secondary">
              <FaArchive /> Archivar
            </button>
          ) : (
            <button onClick={handleRestore}>
              <FaUndo /> Restaurar
            </button>
          )}
          <Link href="/documents">
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      {/* Información del documento */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Información</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Categoría
            </label>
            <div style={{ fontWeight: '500' }}>
              {document.document_categories?.name || 'Sin categoría'}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Estado
            </label>
            <div>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: document.status === 'active' ? '#10b981' : '#6b7280',
                  color: 'white',
                  fontSize: '12px',
                }}
              >
                {document.status === 'active' ? 'Activo' : 'Archivado'}
              </span>
            </div>
          </div>
          {document.description && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Descripción
              </label>
              <div>{document.description}</div>
            </div>
          )}
          {document.tags && document.tags.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Tags
              </label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {document.tags.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: '#f3f4f6',
                      color: '#374151',
                      fontSize: '12px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Creado
            </label>
            <div style={{ fontSize: '12px' }}>{formatDate(document.created_at)}</div>
          </div>
        </div>
      </div>

      {/* Versión actual */}
      {document.current_version && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Versión Vigente</h2>
            <a
              href={document.current_version.file_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FaDownload /> Descargar
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Versión
              </label>
              <div style={{ fontWeight: '500' }}>v{document.current_version.version_number}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Archivo
              </label>
              <div style={{ fontSize: '12px' }}>{document.current_version.file_name}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Tipo
              </label>
              <div style={{ fontSize: '12px' }}>{document.current_version.file_type || 'N/A'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Subido
              </label>
              <div style={{ fontSize: '12px' }}>{formatDate(document.current_version.uploaded_at)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de versiones */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Historial de Versiones</h2>
          <button onClick={() => setShowUploadForm(!showUploadForm)}>
            <FaUpload /> Nueva Versión
          </button>
        </div>

        {showUploadForm && (
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '6px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Nuevo Archivo *</label>
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setUploadFile(file)
                  }
                }}
              />
              {uploadFile && (
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Archivo seleccionado: {uploadFile.name}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={handleUploadVersion} disabled={!uploadFile}>
                Subir Versión
              </button>
              <button className="secondary" onClick={() => {
                setShowUploadForm(false)
                setUploadFile(null)
              }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {versions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
            No hay versiones registradas
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Versión</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Archivo</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Vigente</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Subido</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>
                    v{version.version_number}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px' }}>
                    {version.file_name}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>
                    {version.file_type || 'N/A'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {version.is_current ? (
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: '#10b981',
                          color: 'white',
                          fontSize: '12px',
                        }}
                      >
                        <FaCheck /> Vigente
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetCurrentVersion(version.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Marcar Vigente
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                    {formatDate(version.uploaded_at)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <a
                      href={version.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '4px 8px',
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FaDownload /> Descargar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

