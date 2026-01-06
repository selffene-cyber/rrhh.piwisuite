'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { isCompanyAdmin } from '@/lib/services/costCenterService'
import { isSuperAdmin } from '@/lib/services/auth'
import { FaSignature, FaUpload, FaCheck, FaTimes, FaEdit, FaTrash } from 'react-icons/fa'
import Link from 'next/link'

interface DigitalSignature {
  id: string
  company_id: string
  user_id: string
  signature_image_url: string
  signer_name: string
  signer_position: string
  signer_rut: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function DigitalSignaturesPage() {
  const { companyId, loading: companyLoading } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [signatures, setSignatures] = useState<DigitalSignature[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSignature, setEditingSignature] = useState<DigitalSignature | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    signer_name: '',
    signer_position: '',
    signer_rut: '',
    is_active: true,
  })
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!companyLoading) {
      checkAdminStatus()
      if (companyId) {
        loadSignatures()
      } else {
        setLoading(false)
      }
    }
  }, [companyId, companyLoading])

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsAdmin(false)
      return
    }

    try {
      const superAdmin = await isSuperAdmin()
      if (superAdmin) {
        setIsAdmin(true)
        return
      }

      if (companyId) {
        const admin = await isCompanyAdmin(user.id, companyId, supabase)
        setIsAdmin(admin)
      }
    } catch (error) {
      console.error('Error al verificar permisos:', error)
      setIsAdmin(false)
    }
  }

  const loadSignatures = async () => {
    try {
      setLoading(true)
      // Incluir company_id en el query string si está disponible
      const url = companyId 
        ? `/api/digital-signatures?company_id=${companyId}`
        : '/api/digital-signatures'
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar firmas')
      }

      setSignatures(data.signatures || [])
    } catch (error: any) {
      console.error('Error al cargar firmas:', error)
      alert('Error al cargar firmas digitales: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de imagen')
        return
      }

      setSignatureFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signatureFile && !editingSignature) {
      alert('Por favor, selecciona una imagen de firma')
      return
    }

    if (!formData.signer_name || !formData.signer_position || !formData.signer_rut) {
      alert('Por favor, completa todos los campos requeridos')
      return
    }

    try {
      setSaving(true)

      const submitFormData = new FormData()
      if (signatureFile) {
        submitFormData.append('file', signatureFile)
      }
      submitFormData.append('signer_name', formData.signer_name)
      submitFormData.append('signer_position', formData.signer_position)
      submitFormData.append('signer_rut', formData.signer_rut)
      submitFormData.append('is_active', formData.is_active.toString())
      if (companyId) {
        submitFormData.append('company_id', companyId)
      }

      const response = await fetch('/api/digital-signatures', {
        method: 'POST',
        body: submitFormData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar firma')
      }

      alert(data.message || 'Firma digital guardada exitosamente')
      resetForm()
      loadSignatures()
    } catch (error: any) {
      console.error('Error al guardar firma:', error)
      alert('Error al guardar firma: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (signature: DigitalSignature) => {
    setEditingSignature(signature)
    setFormData({
      signer_name: signature.signer_name,
      signer_position: signature.signer_position,
      signer_rut: signature.signer_rut,
      is_active: signature.is_active,
    })
    setSignaturePreview(signature.signature_image_url)
    setShowForm(true)
  }

  const handleToggleActive = async (signature: DigitalSignature) => {
    try {
      const response = await fetch(`/api/digital-signatures/${signature.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !signature.is_active,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar firma')
      }

      loadSignatures()
    } catch (error: any) {
      console.error('Error al actualizar firma:', error)
      alert('Error al actualizar firma: ' + error.message)
    }
  }

  const handleDelete = async (signature: DigitalSignature) => {
    if (!confirm('¿Estás seguro de que deseas ELIMINAR permanentemente esta firma digital?\n\nEsta acción no se puede deshacer. Si la firma está siendo usada en documentos, no se podrá eliminar.')) {
      return
    }

    try {
      const response = await fetch(`/api/digital-signatures/${signature.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar firma')
      }

      alert('Firma digital eliminada exitosamente')
      loadSignatures()
    } catch (error: any) {
      console.error('Error al eliminar firma:', error)
      alert('Error al eliminar firma: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      signer_name: '',
      signer_position: '',
      signer_rut: '',
      is_active: true,
    })
    setSignatureFile(null)
    setSignaturePreview(null)
    setEditingSignature(null)
    setShowForm(false)
  }

  if (loading || companyLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '24px' }}>
        <p>No tienes permisos para acceder a esta página.</p>
        <Link href="/settings">
          <button>Volver a Configuración</button>
        </Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link href="/settings" style={{ color: '#6b7280', textDecoration: 'none', marginBottom: '8px', display: 'block' }}>
            ← Volver a Configuración
          </Link>
          <h1 style={{ margin: 0 }}>Firmas Digitales</h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>
            Gestiona las firmas digitales que se usarán para firmar certificados, vacaciones y permisos
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FaUpload /> Nueva Firma
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>{editingSignature ? 'Editar Firma Digital' : 'Nueva Firma Digital'}</h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Imagen de Firma *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required={!editingSignature}
                style={{ marginBottom: '12px' }}
              />
              {signaturePreview && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Vista Previa:</p>
                  <img
                    src={signaturePreview}
                    alt="Vista previa de firma"
                    style={{
                      maxWidth: '300px',
                      maxHeight: '150px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      padding: '8px',
                      backgroundColor: 'white',
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Nombre del Firmante *
              </label>
              <input
                type="text"
                value={formData.signer_name}
                onChange={(e) => setFormData({ ...formData, signer_name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Cargo *
              </label>
              <input
                type="text"
                value={formData.signer_position}
                onChange={(e) => setFormData({ ...formData, signer_position: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="Ej: Gerente de Recursos Humanos"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                RUT *
              </label>
              <input
                type="text"
                value={formData.signer_rut}
                onChange={(e) => setFormData({ ...formData, signer_rut: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="Ej: 12.345.678-9"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Estado de la Firma
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: '48px',
                      height: '24px',
                      borderRadius: '12px',
                      background: formData.is_active ? '#3b82f6' : '#d1d5db',
                      position: 'relative',
                      transition: 'background 0.2s',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: '2px',
                        left: formData.is_active ? '26px' : '2px',
                        transition: 'left 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                  <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                    Firma activa (puede ser usada para firmar documentos)
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Guardando...' : editingSignature ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Firmas Digitales Configuradas</h2>
        
        {signatures.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            No hay firmas digitales configuradas. Crea una nueva firma para comenzar.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {signatures.map((signature) => (
              <div
                key={signature.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: '0 0 200px' }}>
                  <img
                    src={signature.signature_image_url}
                    alt="Firma digital"
                    onLoad={() => {
                      console.log('Imagen de firma cargada exitosamente:', signature.signature_image_url)
                    }}
                    onError={(e) => {
                      console.error('Error al cargar imagen de firma:', signature.signature_image_url)
                      console.error('Firma ID:', signature.id)
                      // Mostrar placeholder si falla la carga
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4='
                    }}
                    style={{
                      maxWidth: '200px',
                      maxHeight: '100px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      padding: '8px',
                      backgroundColor: 'white',
                    }}
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: '0 0 4px 0' }}>{signature.signer_name}</h3>
                    <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                      {signature.signer_position}
                    </p>
                    <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                      RUT: {signature.signer_rut}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: signature.is_active ? '#d1fae5' : '#fee2e2',
                        color: signature.is_active ? '#065f46' : '#991b1b',
                      }}
                    >
                      {signature.is_active ? (
                        <>
                          <FaCheck style={{ marginRight: '4px' }} /> Activa
                        </>
                      ) : (
                        <>
                          <FaTimes style={{ marginRight: '4px' }} /> Inactiva
                        </>
                      )}
                    </span>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                      Creada: {new Date(signature.created_at).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(signature)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleToggleActive(signature)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: signature.is_active ? '#f59e0b' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title={signature.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {signature.is_active ? <FaTimes /> : <FaCheck />}
                  </button>
                  <button
                    onClick={() => handleDelete(signature)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

