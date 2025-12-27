import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export interface DocumentCategory {
  id: string
  company_id: string
  name: string
  description?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  file_url: string
  file_name: string
  file_type?: string
  file_size?: number
  version_number: number
  valid_from?: string
  valid_to?: string
  is_current: boolean
  uploaded_by?: string
  uploaded_at: string
}

export interface Document {
  id: string
  company_id: string
  category_id: string
  name: string
  description?: string
  tags: string[]
  current_version_id?: string
  status: 'active' | 'archived'
  created_by?: string
  created_at: string
  updated_at: string
}

export interface DocumentWithDetails extends Document {
  category?: DocumentCategory
  current_version?: DocumentVersion
  versions?: DocumentVersion[]
  created_by_user?: {
    id: string
    email: string
  }
}

// Obtener todas las categorías de una empresa
export async function getDocumentCategories(
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<DocumentCategory[]> {
  const { data, error } = await supabase
    .from('document_categories')
    .select('*')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Crear una nueva categoría
export async function createDocumentCategory(
  category: Omit<DocumentCategory, 'id' | 'created_at' | 'updated_at'>,
  supabase: SupabaseClient<Database>
): Promise<DocumentCategory> {
  const { data, error } = await supabase
    .from('document_categories')
    .insert(category)
    .select()
    .single()

  if (error) throw error
  return data
}

// Obtener todos los documentos de una empresa
export async function getDocuments(
  companyId: string,
  supabase: SupabaseClient<Database>,
  filters?: {
    category_id?: string
    status?: string
    search?: string
    tags?: string[]
  }
): Promise<DocumentWithDetails[]> {
  let query = supabase
    .from('documents')
    .select(`
      *,
      document_categories (*)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags)
  }

  const { data, error } = await query

  if (error) throw error

  // Obtener versiones y datos adicionales
  const documentsWithDetails = await Promise.all(
    (data || []).map(async (doc) => {
      // Obtener versión actual
      let currentVersion = null
      if (doc.current_version_id) {
        const { data: versionData } = await supabase
          .from('document_versions')
          .select('*')
          .eq('id', doc.current_version_id)
          .single()
        currentVersion = versionData
      }

      // Obtener todas las versiones
      const { data: versionsData } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', doc.id)
        .order('version_number', { ascending: false })

      // Obtener usuario creador
      let createdByUser = null
      if (doc.created_by) {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('id', doc.created_by)
          .single()
        createdByUser = userData
      }

      return {
        ...doc,
        current_version: currentVersion,
        versions: versionsData || [],
        created_by_user: createdByUser,
      }
    })
  )

  return documentsWithDetails as DocumentWithDetails[]
}

// Obtener un documento por ID
export async function getDocument(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<DocumentWithDetails | null> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_categories (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) return null

  // Obtener versiones
  const { data: versionsData } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', id)
    .order('version_number', { ascending: false })

  // Obtener usuario creador
  let createdByUser = null
  if (data.created_by) {
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', data.created_by)
      .single()
    createdByUser = userData
  }

  return {
    ...data,
    current_version: versionsData?.find((v) => v.is_current) || null,
    versions: versionsData || [],
    created_by_user: createdByUser,
  } as DocumentWithDetails
}

// Crear un nuevo documento
export async function createDocument(
  document: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'current_version_id'>,
  supabase: SupabaseClient<Database>
): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert(document)
    .select()
    .single()

  if (error) throw error
  return data
}

// Actualizar un documento
export async function updateDocument(
  id: string,
  updates: Partial<Document>,
  supabase: SupabaseClient<Database>
): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Archivar un documento (no se elimina)
export async function archiveDocument(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<Document> {
  return updateDocument(id, { status: 'archived' }, supabase)
}

// Restaurar un documento archivado
export async function restoreDocument(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<Document> {
  return updateDocument(id, { status: 'active' }, supabase)
}

// Crear una nueva versión de documento
export async function createDocumentVersion(
  version: Omit<DocumentVersion, 'id' | 'uploaded_at' | 'version_number'>,
  supabase: SupabaseClient<Database>
): Promise<DocumentVersion> {
  // Obtener el siguiente número de versión
  const { data: versionData } = await supabase
    .rpc('get_next_version_number', { p_document_id: version.document_id })

  const versionNumber = versionData || 1

  // Si es la primera versión o se marca como vigente, marcar como current
  const isCurrent = version.is_current !== undefined ? version.is_current : versionNumber === 1

  const { data, error } = await supabase
    .from('document_versions')
    .insert({
      ...version,
      version_number: versionNumber,
      is_current: isCurrent,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Marcar una versión como vigente
export async function setCurrentVersion(
  documentId: string,
  versionId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  // Desmarcar todas las versiones del documento
  await supabase
    .from('document_versions')
    .update({ is_current: false })
    .eq('document_id', documentId)

  // Marcar la versión seleccionada como vigente
  const { error } = await supabase
    .from('document_versions')
    .update({ is_current: true })
    .eq('id', versionId)

  if (error) throw error
}

// Obtener versiones de un documento
export async function getDocumentVersions(
  documentId: string,
  supabase: SupabaseClient<Database>
): Promise<DocumentVersion[]> {
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data || []
}

