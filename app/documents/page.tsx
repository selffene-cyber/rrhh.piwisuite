'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { FaFile, FaFolder, FaSearch, FaSort, FaSortUp, FaSortDown, FaEye, FaEdit, FaTrash, FaUpload, FaHistory, FaDownload, FaArchive, FaUndo } from 'react-icons/fa'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  archived: 'Archivado',
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  archived: '#6b7280',
}

export default function DocumentsDashboardPage() {
  const { company: currentCompany } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalDocuments: 0,
    activeDocuments: 0,
    archivedDocuments: 0,
    categoriesCount: 0,
  })
  const [sortColumn, setSortColumn] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')

  // Debounce para el searchQuery
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500) // Espera 500ms después de que el usuario deja de escribir

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (currentCompany) {
      loadCategories()
      loadData()
    }
  }, [currentCompany, filterCategory, filterStatus, debouncedSearchQuery])

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

  const loadData = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)

      const params = new URLSearchParams({
        company_id: currentCompany.id,
      })

      if (filterCategory !== 'all') {
        params.append('category_id', filterCategory)
      }

      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }

      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery)
      }

      const response = await fetch(`/api/documents?${params.toString()}`)
      const docs = await response.json()

      // Calcular estadísticas
      const totalDocuments = docs.length
      const activeDocuments = docs.filter((d: any) => d.status === 'active').length
      const archivedDocuments = docs.filter((d: any) => d.status === 'archived').length

      setStats({
        totalDocuments,
        activeDocuments,
        archivedDocuments,
        categoriesCount: categories.length,
      })

      // Ordenar
      const sorted = [...docs].sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })

      setDocuments(sorted)
    } catch (error) {
      console.error('Error al cargar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const handleArchive = async (documentId: string) => {
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
      loadData()
    } catch (error: any) {
      alert('Error al archivar documento: ' + error.message)
    }
  }

  const handleRestore = async (documentId: string) => {
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

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <FaSort className="inline ml-1 text-gray-400" />
    return sortDirection === 'asc' ? (
      <FaSortUp className="inline ml-1" />
    ) : (
      <FaSortDown className="inline ml-1" />
    )
  }

  if (!currentCompany) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          Seleccione una empresa para ver los documentos.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '32px' }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Banco de Documentos</h1>
        <Link href="/documents/new">
          <button>Nuevo Documento</button>
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
            {stats.totalDocuments}
          </div>
          <div style={{ color: '#6b7280', marginTop: '8px' }}>Total Documentos</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {stats.activeDocuments}
          </div>
          <div style={{ color: '#6b7280', marginTop: '8px' }}>Activos</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6b7280' }}>
            {stats.archivedDocuments}
          </div>
          <div style={{ color: '#6b7280', marginTop: '8px' }}>Archivados</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {stats.categoriesCount}
          </div>
          <div style={{ color: '#6b7280', marginTop: '8px' }}>Categorías</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Buscar:
            </label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o descripción..."
                style={{ padding: '6px 12px 6px 36px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
              />
              {searchQuery !== debouncedSearchQuery && (
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#6b7280' }}>
                  Buscando...
                </div>
              )}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Categoría:
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="all">Todas</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Estado:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="archived">Archivados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de documentos */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Documentos</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th
                  style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => handleSort('name')}
                >
                  Nombre <SortIcon column="name" />
                </th>
                <th
                  style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => handleSort('category_id')}
                >
                  Categoría <SortIcon column="category_id" />
                </th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Versión</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tags</th>
                <th
                  style={{ padding: '12px', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => handleSort('status')}
                >
                  Estado <SortIcon column="status" />
                </th>
                <th
                  style={{ padding: '12px', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => handleSort('created_at')}
                >
                  Fecha <SortIcon column="created_at" />
                </th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No hay documentos registrados
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{doc.name}</div>
                      {doc.description && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          {doc.description.substring(0, 60)}
                          {doc.description.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontSize: '12px' }}>
                        {doc.document_categories?.name || 'Sin categoría'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {doc.current_version ? (
                        <span style={{ fontSize: '12px' }}>
                          v{doc.current_version.version_number}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Sin versión</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {doc.tags && doc.tags.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {doc.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#f3f4f6',
                                color: '#374151',
                                fontSize: '11px',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > 3 && (
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              +{doc.tags.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: STATUS_COLORS[doc.status] || '#6b7280',
                          color: 'white',
                          fontSize: '12px',
                        }}
                      >
                        {STATUS_LABELS[doc.status] || doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                      {formatDate(doc.created_at)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <Link href={`/documents/${doc.id}`}>
                          <button
                            style={{
                              padding: '4px 8px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            title="Ver Detalle"
                          >
                            <FaEye />
                          </button>
                        </Link>
                        {doc.current_version?.file_url && (
                          <a
                            href={doc.current_version.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '4px 8px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              textDecoration: 'none',
                              display: 'inline-block',
                            }}
                            title="Descargar"
                          >
                            <FaDownload />
                          </a>
                        )}
                        {doc.status === 'active' ? (
                          <button
                            onClick={() => handleArchive(doc.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            title="Archivar"
                          >
                            <FaArchive />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(doc.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            title="Restaurar"
                          >
                            <FaUndo />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

