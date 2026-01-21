import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import {
  signDocument,
  generateVerificationCode,
  generateVerificationUrl,
  saveSignedPdfToStorage,
} from '@/lib/services/documentSigner'
import { generateVacationPdf } from '@/lib/services/vacationPdfGenerator'
import { createAuditService } from '@/lib/services/auditService'
import { assignVacationDays, syncVacationPeriods } from '@/lib/services/vacationPeriods'

/**
 * API para aprobar una solicitud de vacaciones y firmarla digitalmente
 * Solo admin/owner pueden aprobar
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

    // Verificar permisos (solo admin/owner)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'

    // Obtener vacación con datos del empleado y empresa
    const { data: vacation, error: vacError } = await supabase
      .from('vacations')
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
        )
      `)
      .eq('id', params.id)
      .single()

    if (vacError || !vacation) {
      return NextResponse.json({ 
        error: 'Vacación no encontrada' 
      }, { status: 404 })
    }

    const employee = vacation.employees as any
    const company = employee.companies as any
    const companyId = employee.company_id

    // Si no es super admin, verificar permisos granulares
    if (!isSuperAdmin) {
      const { data: permissions } = await supabase
        .from('user_permissions')
        .select('can_approve_vacations')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single()

      if (!permissions?.can_approve_vacations) {
        return NextResponse.json({ 
          error: 'No tienes permiso para aprobar vacaciones' 
        }, { status: 403 })
      }
    }

    // Verificar que la vacación está en estado 'solicitada'
    if (vacation.status !== 'solicitada') {
      return NextResponse.json({ 
        error: `La vacación no puede ser aprobada. Estado actual: ${vacation.status}` 
      }, { status: 400 })
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
        error: 'No se encontró una firma digital activa. Por favor, configure una firma digital antes de aprobar documentos.' 
      }, { status: 400 })
    }

    // Generar código de verificación único
    const verificationCode = generateVerificationCode()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3007'
    const verificationUrl = generateVerificationUrl(baseUrl, verificationCode, 'vacation', vacation.id)

    // Generar PDF de la vacación
    const pdfBytes = await generateVacationPdf({
      vacation: {
        start_date: vacation.start_date,
        end_date: vacation.end_date,
        days_count: vacation.days_count,
        days_business: vacation.days_business,
        status: 'aprobada',
        reason: vacation.reason || undefined,
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
      documentType: 'vacation',
      documentId: vacation.id,
    })

    // Guardar PDF firmado en Storage
    const signedPdfUrl = await saveSignedPdfToStorage(
      signedResult.signedPdfBytes,
      companyId,
      'vacation',
      vacation.id,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Actualizar vacación con todos los campos de firma digital
    const { data: updated, error: updateError } = await supabase
      .from('vacations')
      .update({
        status: 'aprobada',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        signature_id: signature.id,
        signed_pdf_url: signedPdfUrl,
        pdf_hash: signedResult.pdfHash,
        verification_code: verificationCode,
        verification_url: verificationUrl,
        qr_code_data: signedResult.qrCodeData,
        approval_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error al aprobar vacación:', updateError)
      return NextResponse.json({ 
        error: updateError.message || 'Error al aprobar vacación' 
      }, { status: 500 })
    }

    // ✅ DESCONTAR DÍAS DEL PERÍODO DE VACACIONES (FIFO)
    // Obtener datos del empleado para sincronizar períodos
    const { data: employeeData } = await supabase
      .from('employees')
      .select('hire_date')
      .eq('id', vacation.employee_id)
      .single()

    if (employeeData?.hire_date) {
      try {
        // Sincronizar períodos primero (asegura que estén actualizados)
        await syncVacationPeriods(vacation.employee_id, employeeData.hire_date)
        
        // Asignar días al período usando FIFO (descontar del más antiguo)
        // NO especificamos periodYear para que use FIFO automático
        const updatedPeriods = await assignVacationDays(
          vacation.employee_id,
          vacation.days_count
        )
        
        // ✅ Actualizar el period_year de la vacación con el periodo real (FIFO)
        if (updatedPeriods.length > 0) {
          const realPeriodYear = updatedPeriods[0].period_year
          
          await supabase
            .from('vacations')
            .update({ period_year: realPeriodYear })
            .eq('id', params.id)
          
          console.log(`✅ Días descontados usando FIFO: ${vacation.days_count} días del periodo ${realPeriodYear} (${updatedPeriods.length} período(s) afectado(s))`)
        }
      } catch (periodError) {
        console.error('Error al descontar días del período:', periodError)
        // No fallar la aprobación por este error, solo loguearlo
        // La vacación ya está aprobada, pero los días no se descontaron
      }
    }

    // Registrar evento de auditoría
    try {
      const auditService = createAuditService(supabase)
      await auditService.logEvent({
        companyId: companyId,
        employeeId: vacation.employee_id,
        actorUserId: user.id,
        source: 'admin_dashboard',
        actionType: 'vacation.approved',
        module: 'vacations',
        entityType: 'vacations',
        entityId: params.id,
        status: 'success',
        beforeData: { status: vacation.status },
        afterData: { 
          status: 'aprobada',
          approved_at: updated.approved_at,
          signed_pdf_url: updated.signed_pdf_url,
        },
        metadata: {
          approval_date: updated.approval_date,
        },
      })
    } catch (auditError) {
      console.error('Error al registrar auditoría:', auditError)
      // No interrumpir el flujo
    }

    return NextResponse.json({ 
      success: true, 
      vacation: updated,
      message: 'Vacación aprobada y firmada exitosamente' 
    })
  } catch (error: any) {
    console.error('Error al aprobar vacación:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}


