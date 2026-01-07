import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { verifyDocumentByCode } from '@/lib/services/pdfIntegrityVerifier'

export const dynamic = 'force-dynamic'

/**
 * API pública para verificar documentos usando código de verificación
 * No requiere autenticación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type') as 'certificates' | 'vacations' | 'permissions' | null
    const id = searchParams.get('id')

    if (!code || !type || !id) {
      return NextResponse.json(
        { valid: false, error: 'Faltan parámetros requeridos: code, type, id' },
        { status: 400 }
      )
    }

    // Crear cliente de Supabase sin autenticación (solo lectura pública)
    const supabase = createServerClientForAPI(request)

    // Verificar documento por código
    const document = await verifyDocumentByCode(type, id, code, supabase)

    if (!document) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Documento no encontrado o código de verificación inválido',
        },
        { status: 404 }
      )
    }

    // Obtener datos adicionales del documento según el tipo
    let employee = null
    let company = null

    if (type === 'certificates') {
      const { data: certData } = await supabase
        .from('certificates')
        .select(`
          *,
          employees!inner(
            id,
            full_name,
            rut,
            company_id,
            companies!inner(
              id,
              name,
              rut
            )
          )
        `)
        .eq('id', id)
        .single()

      if (certData) {
        employee = (certData.employees as any)
        company = (employee.companies as any)
      }
    } else if (type === 'vacations') {
      const { data: vacData } = await supabase
        .from('vacations')
        .select(`
          *,
          employees!inner(
            id,
            full_name,
            rut,
            company_id,
            companies!inner(
              id,
              name,
              rut
            )
          )
        `)
        .eq('id', id)
        .single()

      if (vacData) {
        employee = (vacData.employees as any)
        company = (employee.companies as any)
      }
    } else if (type === 'permissions') {
      const { data: permData } = await supabase
        .from('permissions')
        .select(`
          *,
          employees!inner(
            id,
            full_name,
            rut,
            company_id,
            companies!inner(
              id,
              name,
              rut
            )
          )
        `)
        .eq('id', id)
        .single()

      if (permData) {
        employee = (permData.employees as any)
        company = (employee.companies as any)
      }
    }

    return NextResponse.json({
      valid: true,
      document: {
        id: document.id,
        type: type === 'certificates' ? 'certificate' : type === 'vacations' ? 'vacation' : 'permission',
        status: document.status,
        signed_pdf_url: document.signed_pdf_url,
        pdf_hash: document.pdf_hash,
        verification_code: document.verification_code,
        verification_url: document.verification_url,
        qr_code_data: document.qr_code_data,
        approved_at: document.approved_at,
        approved_by: document.approved_by,
        employee: employee
          ? {
              full_name: employee.full_name,
              rut: employee.rut,
            }
          : undefined,
        company: company
          ? {
              name: company.name,
              rut: company.rut,
            }
          : undefined,
      },
    })
  } catch (error: any) {
    console.error('Error al verificar documento:', error)
    return NextResponse.json(
      {
        valid: false,
        error: error.message || 'Error al verificar el documento',
      },
      { status: 500 }
    )
  }
}

