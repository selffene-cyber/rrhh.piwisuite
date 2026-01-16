import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import {
  signDocument,
  generateVerificationCode,
  generateVerificationUrl,
  saveSignedPdfToStorage,
} from '@/lib/services/documentSigner'
import { generateCertificatePdf } from '@/lib/services/certificatePdfGenerator'

/**
 * API para firmar digitalmente un certificado ya emitido
 * Solo admin/owner/superadmin pueden firmar
 * Solo para certificados en estado 'issued' que aún no tienen firma digital
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

    // Obtener certificado con datos del empleado y empresa
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select(`
        *,
        employees!inner(
          id,
          full_name,
          rut,
          position,
          hire_date,
          contract_type,
          contract_other,
          company_id,
          companies!inner(
            id,
            name,
            employer_name,
            rut,
            address,
            city
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (certError || !certificate) {
      return NextResponse.json({ 
        error: 'Certificado no encontrado' 
      }, { status: 404 })
    }

    const employee = certificate.employees as any
    const company = employee.companies as any
    const companyId = employee.company_id

    // Verificar que el certificado esté en estado 'issued'
    if (certificate.status !== 'issued') {
      return NextResponse.json({ 
        error: `El certificado debe estar en estado 'issued' para poder firmarlo. Estado actual: ${certificate.status}` 
      }, { status: 400 })
    }

    // Verificar que no tenga firma digital ya
    if (certificate.signed_pdf_url) {
      return NextResponse.json({ 
        error: 'Este certificado ya tiene firma digital' 
      }, { status: 400 })
    }

    // Si no es super admin, verificar permisos granulares
    if (!isSuperAdmin) {
      const { data: permissions } = await supabase
        .from('user_permissions')
        .select('can_approve_certificates')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single()

      if (!permissions?.can_approve_certificates) {
        return NextResponse.json({ 
          error: 'No tienes permiso para firmar certificados' 
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
    const verificationUrl = generateVerificationUrl(baseUrl, verificationCode, 'certificate', certificate.id)

    // Preparar datos base para el PDF
    const pdfData: any = {
      employee: {
        full_name: employee.full_name,
        rut: employee.rut,
        position: employee.position,
        hire_date: employee.hire_date,
        contract_type: employee.contract_type,
        contract_other: employee.contract_other,
      },
      company: {
        name: company.name,
        employer_name: company.employer_name,
        rut: company.rut,
        address: company.address,
        city: company.city,
      },
      issueDate: certificate.issue_date,
      purpose: certificate.purpose || undefined,
      folioNumber: certificate.folio_number || undefined,
      certificateType: certificate.certificate_type as 'antiguedad' | 'renta' | 'vigencia',
    }

    // Agregar datos específicos según el tipo de certificado
    if (certificate.certificate_type === 'renta') {
      // Obtener liquidaciones del período
      const monthsPeriod = certificate.months_period || 12
      const issueDateObj = new Date(certificate.issue_date + 'T00:00:00')
      const startDate = new Date(issueDateObj)
      startDate.setMonth(startDate.getMonth() - monthsPeriod)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)

      const { data: payrollSlips } = await supabase
        .from('payroll_slips')
        .select(`
          *,
          payroll_periods (*)
        `)
        .eq('employee_id', employee.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', issueDateObj.toISOString())
        .order('created_at', { ascending: true })

      const payrollData = (payrollSlips || []).map(slip => {
        const period = slip.payroll_periods as any
        const periodStr = period 
          ? `${period.year}-${String(period.month).padStart(2, '0')}-01`
          : slip.created_at?.split('T')[0] || ''
        
        return {
          period: periodStr,
          baseSalary: Number(slip.base_salary || 0),
          taxableEarnings: Number(slip.total_taxable_earnings || 0),
          legalDeductions: Number(slip.total_legal_deductions || 0),
          netPay: Number(slip.net_pay || 0),
        }
      })

      pdfData.monthsPeriod = monthsPeriod
      pdfData.payrollData = payrollData
    } else if (certificate.certificate_type === 'vigencia') {
      // Obtener contrato activo
      const { data: contract } = await supabase
        .from('contracts')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      pdfData.contract = contract || undefined
      pdfData.validUntil = certificate.valid_until || undefined
    }

    // Generar PDF del certificado
    const pdfBytes = await generateCertificatePdf(pdfData)

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
      documentType: 'certificate',
      documentId: certificate.id,
    })

    // Guardar PDF firmado en Storage
    const signedPdfUrl = await saveSignedPdfToStorage(
      signedResult.signedPdfBytes,
      companyId,
      'certificate',
      certificate.id,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Actualizar certificado con todos los campos de firma digital (sin cambiar el estado)
    const { data: updated, error: updateError } = await supabase
      .from('certificates')
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
      console.error('Error al firmar certificado:', updateError)
      return NextResponse.json({ 
        error: updateError.message || 'Error al firmar certificado' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      certificate: updated,
      message: 'Certificado firmado digitalmente exitosamente' 
    })
  } catch (error: any) {
    console.error('Error al firmar certificado:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}






