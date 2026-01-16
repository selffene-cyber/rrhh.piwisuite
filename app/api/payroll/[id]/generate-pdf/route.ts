import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// API para guardar el PDF que viene como blob desde el cliente
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener el PDF como blob desde el body
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File

    if (!pdfFile) {
      return NextResponse.json({ error: 'No se proporcionó PDF' }, { status: 400 })
    }

    // Obtener liquidación para obtener company_id
    const { data: slip, error: slipError } = await supabase
      .from('payroll_slips')
      .select(`
        employee_id,
        employees!inner(company_id)
      `)
      .eq('id', params.id)
      .single()

    if (slipError || !slip) {
      return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 })
    }

    const companyId = (slip.employees as any).company_id
    console.log('[API generate-pdf] Company ID:', companyId, 'Slip ID:', params.id)

    // Crear path en Storage: {company_id}/payroll/{slip_id}.pdf
    const filePath = `${companyId}/payroll/${params.id}.pdf`
    console.log('[API generate-pdf] File path:', filePath)
    console.log('[API generate-pdf] PDF file size:', pdfFile.size, 'bytes')

    // Convertir File a ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[API generate-pdf] Buffer size:', buffer.length, 'bytes')

    // Subir PDF a Storage
    console.log('[API generate-pdf] Intentando subir a storage...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('signed-documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('[API generate-pdf] Error al subir PDF:', uploadError)
      console.error('[API generate-pdf] Error details:', JSON.stringify(uploadError, null, 2))
      return NextResponse.json({ 
        error: uploadError.message || 'Error al subir PDF',
        details: uploadError 
      }, { status: 500 })
    }

    console.log('[API generate-pdf] PDF subido correctamente:', uploadData)

    // Obtener URL pública del PDF
    const {
      data: { publicUrl },
    } = supabase.storage.from('signed-documents').getPublicUrl(filePath)

    console.log('[API generate-pdf] Public URL generada:', publicUrl)

    // Actualizar liquidación con la URL del PDF
    const { error: updateError } = await supabase
      .from('payroll_slips')
      .update({ pdf_url: publicUrl })
      .eq('id', params.id)

    if (updateError) {
      console.error('[API generate-pdf] Error al actualizar pdf_url:', updateError)
      return NextResponse.json({ 
        error: 'Error al actualizar pdf_url',
        details: updateError 
      }, { status: 500 })
    }

    console.log('[API generate-pdf] pdf_url actualizado correctamente en BD')
    return NextResponse.json({ pdf_url: publicUrl })
  } catch (error: any) {
    console.error('Error al guardar PDF:', error)
    return NextResponse.json({ error: error.message || 'Error al guardar PDF' }, { status: 500 })
  }
}

