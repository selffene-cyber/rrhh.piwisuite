import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClientForAPI(request)
    const formData = await request.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('company_id') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id es requerido' },
        { status: 400 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Crear path en Storage: documents/{company_id}/{timestamp}-{filename}
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    const filePath = `documents/${companyId}/${fileName}`

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error al subir archivo:', uploadError)
      return NextResponse.json(
        { error: uploadError.message || 'Error al subir archivo' },
        { status: 500 }
      )
    }

    // Obtener URL pública del archivo
    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(filePath)

    return NextResponse.json({
      file_url: publicUrl,
      file_path: filePath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    })
  } catch (error: any) {
    console.error('Error al subir archivo:', error)
    return NextResponse.json(
      { error: error.message || 'Error al subir archivo' },
      { status: 500 }
    )
  }
}

