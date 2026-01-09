'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { isCompanyAdmin } from '@/lib/services/costCenterService'
import { isSuperAdmin } from '@/lib/services/auth'

export default function SettingsPage() {
  const { companyId, loading: companyLoading } = useCurrentCompany()
  const { refreshCompanies } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    employer_name: '',
    rut: '',
    address: '',
    city: '',
    logo_url: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    if (!companyLoading) {
      checkAdminStatus()
      if (companyId) {
        loadCompany()
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
      // Verificar si es super admin del sistema
      const superAdmin = await isSuperAdmin()
      console.log('Super Admin check:', superAdmin)
      
      if (superAdmin) {
        setIsAdmin(true)
        return
      }

      // Si no es super admin, verificar si es admin de la empresa actual
      if (companyId) {
        const admin = await isCompanyAdmin(user.id, companyId, supabase)
        console.log('Company Admin check:', admin)
        setIsAdmin(admin)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Error verificando permisos:', error)
      setIsAdmin(false)
    }
  }

  const loadCompany = async () => {
    if (!companyId) return

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setFormData({
          name: data.name || '',
          employer_name: data.employer_name || '',
          rut: data.rut || '',
          address: data.address || '',
          city: data.city || '',
          logo_url: data.logo_url || '',
        })
        if (data.logo_url) {
          setLogoPreview(data.logo_url)
        }
      }
    } catch (error: any) {
      alert('Error al cargar configuración: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    try {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen')
        setUploadingLogo(false)
        return
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB')
        setUploadingLogo(false)
        return
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `company-logos/${fileName}`

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        // Si el bucket no existe, intentar crearlo
        if (uploadError.message.includes('Bucket not found')) {
          alert('El bucket de almacenamiento no está configurado. Por favor, crea un bucket llamado "company-assets" en Supabase Storage con acceso público.')
          setUploadingLogo(false)
          return
        }
        throw uploadError
      }

      // Obtener URL pública del archivo
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath)

      // Actualizar logo_url en la base de datos
      if (!companyId) {
        throw new Error('No hay empresa seleccionada')
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', companyId)

      if (updateError) throw updateError

      // Refrescar el contexto de empresas
      await refreshCompanies()

      setFormData((prev) => ({ ...prev, logo_url: publicUrl }))
      setLogoPreview(publicUrl)
      setLogoFile(null)
      alert('Logo subido correctamente')
    } catch (error: any) {
      console.error('Error al subir logo:', error)
      alert('Error al subir logo: ' + error.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('¿Estás seguro de eliminar el logo?')) {
      return
    }

    try {
      // Eliminar archivo del storage si existe
      if (formData.logo_url) {
        const urlParts = formData.logo_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const filePath = `company-logos/${fileName}`

        await supabase.storage
          .from('company-assets')
          .remove([filePath])
      }

      // Actualizar en base de datos
      if (!companyId) {
        throw new Error('No hay empresa seleccionada')
      }

      const { error } = await supabase
        .from('companies')
        .update({ logo_url: null })
        .eq('id', companyId)

      if (error) throw error

      // Refrescar el contexto de empresas
      await refreshCompanies()

      setFormData((prev) => ({ ...prev, logo_url: '' }))
      setLogoPreview(null)
      setLogoFile(null)
      alert('Logo eliminado correctamente')
    } catch (error: any) {
      alert('Error al eliminar logo: ' + error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Si hay un archivo nuevo, subirlo primero
      if (logoFile) {
        await handleLogoUpload(logoFile)
      }

      // Actualizar empresa
      if (!companyId) {
        throw new Error('No hay empresa seleccionada')
      }

      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          employer_name: formData.employer_name,
          rut: formData.rut,
          address: formData.address,
          city: formData.city,
          logo_url: formData.logo_url,
        })
        .eq('id', companyId)

      if (error) throw error

      // Refrescar el contexto de empresas para actualizar el selector del header
      await refreshCompanies()

      alert('Configuración guardada correctamente')
      setLogoFile(null)
    } catch (error: any) {
      alert('Error al guardar configuración: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || companyLoading) {
    return <div>Cargando...</div>
  }

  if (!companyId) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Configuración</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isAdmin && (
              <Link href="/admin/cost-centers">
                <button>Centros de Costo</button>
              </Link>
            )}
          </div>
        </div>
        <div className="card">
          <p>Por favor, selecciona una empresa para ver su configuración.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Configuración</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isAdmin && (
            <>
              <Link href="/admin/cost-centers">
                <button>Centros de Costo</button>
              </Link>
              <Link href="/settings/signatures">
                <button>Firmas Digitales</button>
              </Link>
            </>
          )}
          <Link href="/settings/indicators">
            <button>Indicadores Previsionales</button>
          </Link>
          <Link href="/settings/tax-brackets">
            <button>Impuesto Único</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Configuración de Empresa</h2>
        <p style={{ marginBottom: '24px', color: '#6b7280' }}>
          Estos datos aparecerán automáticamente en el encabezado de cada liquidación de sueldo y documentos.
        </p>

        {/* Sección de Logo */}
        <div style={{ marginBottom: '32px', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Logo de la Empresa</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            El logo aparecerá en los documentos generados (contratos, liquidaciones, etc.)
          </p>
          
          {logoPreview && (
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '150px', 
                height: '150px', 
                border: '2px solid #e5e7eb', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                padding: '8px'
              }}>
                <img 
                  src={logoPreview} 
                  alt="Logo de la empresa" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    objectFit: 'contain' 
                  }} 
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Eliminar Logo
                </button>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              {logoPreview ? 'Cambiar Logo' : 'Subir Logo'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploadingLogo}
              style={{
                marginBottom: '8px',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                width: '100%',
                maxWidth: '400px'
              }}
            />
            {logoFile && !logoPreview?.includes('supabase') && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleLogoUpload(logoFile)}
                  disabled={uploadingLogo}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: uploadingLogo ? 0.6 : 1
                  }}
                >
                  {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null)
                    setLogoPreview(formData.logo_url || null)
                  }}
                  disabled={uploadingLogo}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
            <small style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
              Formatos aceptados: JPG, PNG, GIF. Tamaño máximo: 5MB
            </small>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Razón Social *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre de la empresa"
            />
          </div>
          <div className="form-group">
            <label>Nombre del Empleador *</label>
            <input
              type="text"
              required
              value={formData.employer_name}
              onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
              placeholder="Nombre completo del empleador"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>RUT Empresa/Empleador *</label>
              <input
                type="text"
                required
                value={formData.rut}
                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                placeholder="12.345.678-9"
              />
            </div>
            <div className="form-group">
              <label>Ciudad / Sucursal</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ciudad o sucursal"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Dirección completa"
            />
          </div>

          <div style={{ marginTop: '32px' }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
