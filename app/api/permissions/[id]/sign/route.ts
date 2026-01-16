import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import {
  signDocument,
  generateVerificationCode,
  generateVerificationUrl,
  saveSignedPdfToStorage,
} from '@/lib/services/documentSigner'
import { generatePermissionPdf } from '@/lib/services/permissionPdfGenerator'

/**
 * API para firmar digitalmente un permiso ya aprobado
 * Solo admin/owner/superadmin pueden firmar
 * Solo para permisos en estado 'approved' que aún no tienen firma digital
 */
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

    // Verificar permisos (solo admin/owner/superadmin)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'

    // Obtener permiso con datos del empleado, empresa y tipo de permiso
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select(`
        *,
        employees!inner(
          id,
          full_name,
          rut,
          position,
          company_id,
          companies!inner(
            id,
            name,
            employer_name,
            rut,
            address,
            city
          )
        ),
        permission_types!inner(
          code,
          label,
          affects_payroll
        )
      `)
      .eq('id', params.id)
      .single()

    if (permError || !permission) {
      return NextResponse.json({ 
        error: 'Permiso no encontrado' 
      }, { status: 404 })
    }

    const employee = permission.employees as any
    const company = employee.companies as any
    const companyId = employee.company_id

    // Verificar que el permiso esté en estado 'approved'
    if (permission.status !== 'approved') {
      return NextResponse.json({ 
        error: `El permiso debe estar en estado 'approved' para poder firmarlo. Estado actual: ${permission.status}` 
      }, { status: 400 })
    }

    // Verificar que no tenga firma digital ya
    if (permission.signed_pdf_url) {
      return NextResponse.json({ 
        error: 'Este permiso ya tiene firma digital' 
      }, { status: 400 })
    }

    // Si no es super admin, verificar que pertenece a una empresa del usuario
    if (!isSuperAdmin) {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('role, company_id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .single()

      if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
        return NextResponse.json({ 
          error: 'No autorizado para firmar este permiso' 
        }, { status: 403 })
      }
    }

    // Obtener firma digital activa del usuario para esta empresa
    const { data: signature, error: sigError } = await supabase
      .from('digital_signatures')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (sigError || !signature) {
      return NextResponse.json({ 
        error: 'No se encontró una firma digital activa. Por favor, configure una firma digital antes de firmar documentos.' 
      }, { status: 400 })
    }

    // Generar código de verificación único
    const verificationCode = generateVerificationCode()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3007'
    const verificationUrl = generateVerificationUrl(baseUrl, verificationCode, 'permission', permission.id)

    // Generar PDF del permiso
    const permissionType = permission.permission_types as any
    const isWithPay = !permissionType?.affects_payroll
    
    const pdfBytes = await generatePermissionPdf({
      permission: {
        permission_type: permissionType?.code || permission.permission_type_code,
        start_date: permission.start_date,
        end_date: permission.end_date,
        days: permission.days || 1,
        hours: permission.hours,
        reason: permission.reason,
        status: 'approved',
        permission_number: permission.permission_number || undefined,
        notes: permission.notes || undefined,
        isWithPay: isWithPay,
      },
      employee: {
        full_name: employee.full_name,
        rut: employee.rut,
        position: employee.position,
      },
      company: {
        name: company.name,
        employer_name: company.employer_name,
        rut: company.rut,
        address: company.address,
        city: company.city,
      },
    })

    // Firmar el PDF
    const signedResult = await signDocument({
      pdfBytes,
      signatureData: {
        signatureImageUrl: signature.signature_image_url,
        signerName: signature.signer_name,
        signerPosition: signature.signer_position,
        signerRut: signature.signer_rut,
      },
      verificationCode,
      verificationUrl,
      companyId,
      documentType: 'permission',
      documentId: permission.id,
    })

    // Guardar PDF firmado en Storage
    const signedPdfUrl = await saveSignedPdfToStorage(
      signedResult.signedPdfBytes,
      companyId,
      'permission',
      permission.id,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Actualizar permiso con todos los campos de firma digital (sin cambiar el estado)
    const { data: updated, error: updateError } = await supabase
      .from('permissions')
      .update({
        signature_id: signature.id,
        signed_pdf_url: signedPdfUrl,
        pdf_hash: signedResult.pdfHash,
        verification_code: verificationCode,
        verification_url: verificationUrl,
        qr_code_data: signedResult.qrCodeData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error al firmar permiso:', updateError)
      return NextResponse.json({ 
        error: updateError.message || 'Error al firmar permiso' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      permission: updated,
      message: 'Permiso firmado digitalmente exitosamente' 
    })
  } catch (error: any) {
    console.error('Error al firmar permiso:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}






