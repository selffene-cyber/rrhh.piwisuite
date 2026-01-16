'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function NewDocumentPage() {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [isEmployeeDocument, setIsEmployeeDocument] = useState(false)
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    tags: '',
    file: null as File | null,
    employee_id: null as string | null,
  })

  useEffect(() => {
    if (currentCompany) {
      loadCategories()
      loadEmployees()
    }
  }, [currentCompany])

  const loadCategories = async () => {
    if (!currentCompany) return

    try {
      const response = await fetch(
        `/api/document-categories?company_id=${currentCompany.id}`
      )
      const cats = await response.json()
      setCategories(cats)
    } catch (error) {
      console.error('Error al cargar categorías:', error)
    }
  }

  const loadEmployees = async () => {
    if (!currentCompany) return

    try {
      const response = await fetch(
        `/api/employees?company_id=${currentCompany.id}&status=active`
      )
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const emps = await response.json()
      console.log('Empleados cargados:', emps)
      
      if (Array.isArray(emps)) {
        setEmployees(emps)
      } else {
        console.error('La respuesta no es un array:', emps)
        setEmployees([])
      }
    } catch (error) {
      console.error('Error al cargar empleados:', error)
      setEmployees([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCompany) return

    if (!formData.category_id) {
      alert('Debe seleccionar una categoría')
      return
    }

    if (!formData.name.trim()) {
      alert('Debe ingresar un nombre para el documento')
      return
    }

    if (!formData.file) {
      alert('Debe seleccionar un archivo')
      return
    }

    setLoading(true)

    try {
      // 1. Subir archivo
      const uploadFormData = new FormData()
      uploadFormData.append('file', formData.file)
      uploadFormData.append('company_id', currentCompany.id)

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Error al subir archivo')
      }

      const uploadData = await uploadResponse.json()

      // 2. Crear documento
      const docResponse = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: currentCompany.id,
          category_id: formData.category_id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          tags: formData.tags
            ? formData.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
            : [],
          status: 'active',
          employee_id: isEmployeeDocument ? formData.employee_id : null,
        }),
      })

      if (!docResponse.ok) {
        const error = await docResponse.json()
        throw new Error(error.error || 'Error al crear documento')
      }

      const document = await docResponse.json()

      // 3. Crear versión del documento
      const versionResponse = await fetch(`/api/documents/${document.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_url: uploadData.file_url,
          file_name: uploadData.file_name,
          file_type: uploadData.file_type,
          file_size: uploadData.file_size,
          is_current: true,
        }),
      })

      if (!versionResponse.ok) {
        const error = await versionResponse.json()
        throw new Error(error.error || 'Error al crear versión')
      }

      alert('Documento creado correctamente')
      router.push('/documents')
    } catch (error: any) {
      alert('Error al crear documento: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!currentCompany) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          Seleccione una empresa para crear un documento.
        </p>
      </div>
    )
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
        <h1>Nuevo Documento</h1>
        <Link href="/documents">
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Categoría *</label>
            <select
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">Seleccione una categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Nombre del Documento *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Reglamento Interno de Orden, Higiene y Seguridad"
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Descripción del documento..."
            />
          </div>

          <div className="form-group">
            <label>Tags (separados por comas)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Ej: rrhh, seguridad, protocolo"
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Los tags ayudan a buscar y clasificar documentos
            </p>
          </div>

          {/* Toggle para documento de empleado específico */}
          <div className="form-group" style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', background: '#f9fafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: isEmployeeDocument ? '16px' : '0' }}>
              <label style={{ margin: 0, flex: 1, fontWeight: '500' }}>
                📄 Documento de Empleado Específico
              </label>
              <label className="toggle-switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isEmployeeDocument}
                  onChange={(e) => {
                    setIsEmployeeDocument(e.target.checked)
                    if (!e.target.checked) {
                      setFormData({ ...formData, employee_id: null })
                    }
                  }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {isEmployeeDocument && (
              <>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                  Este documento se asociará al historial del empleado seleccionado
                </p>
                <select
                  required={isEmployeeDocument}
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value || null })}
                  style={{ width: '100%' }}
                >
                  <option value="">
                    {employees.length === 0 
                      ? 'No hay empleados activos disponibles' 
                      : 'Seleccione un empleado'}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.rut}
                    </option>
                  ))}
                </select>
                {employees.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                    ✓ {employees.length} empleado{employees.length !== 1 ? 's' : ''} disponible{employees.length !== 1 ? 's' : ''}
                  </p>
                )}
                {employees.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                    ⚠️ No se encontraron empleados activos. Verifique que haya empleados con estado "activo" en la empresa.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="form-group">
            <label>Archivo *</label>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setFormData({ ...formData, file })
                }
              }}
            />
            {formData.file && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Archivo seleccionado: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Documento'}
            </button>
            <Link href="/documents">
              <button type="button" className="secondary">
                Cancelar
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

