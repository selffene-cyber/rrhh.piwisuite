import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API para gestionar firmas digitales
 * GET: Obtener firmas de la empresa del usuario
 * POST: Crear/actualizar firma digital
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar si es super admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, default_company_id')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'

    // Obtener company_id del query string si es super admin
    const { searchParams } = new URL(request.url)
    const requestedCompanyId = searchParams.get('company_id')

    // Obtener company_id
    let companyId: string | null = null

    if (isSuperAdmin) {
      // Si es super admin, usar company_id del query string, o default_company_id, o la primera empresa disponible
      if (requestedCompanyId) {
        // Verificar que la empresa existe
        const { data: companyExists } = await supabase
          .from('companies')
          .select('id')
          .eq('id', requestedCompanyId)
          .maybeSingle()
        
        if (companyExists) {
          companyId = requestedCompanyId
        }
      }
      
      // Si no se pudo obtener del query string, usar default_company_id o la primera empresa
      if (!companyId) {
        if (profile?.default_company_id) {
          companyId = profile.default_company_id
        } else {
          const { data: firstCompany } = await supabase
            .from('companies')
            .select('id')
            .limit(1)
            .maybeSingle()
          companyId = firstCompany?.id || null
        }
      }
    } else {
      // Si no es super admin, obtener de company_users (puede tener múltiples empresas)
      const { data: companyUsers } = await supabase
        .from('company_users')
        .select('company_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)

      if (!companyUsers || companyUsers.length === 0) {
        return NextResponse.json({ error: 'Usuario no asociado a una empresa' }, { status: 403 })
      }

      // Usar la primera empresa activa
      companyId = companyUsers[0].company_id
    }

    if (!companyId) {
      return NextResponse.json({ error: 'No se pudo determinar la empresa' }, { status: 403 })
    }

    console.log('GET digital-signatures - companyId:', companyId, 'isSuperAdmin:', isSuperAdmin)

    // Obtener firmas digitales de la empresa
    // Usar adminClient para evitar problemas con RLS (especialmente para super admins)
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: signatures, error } = await adminClient
      .from('digital_signatures')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al obtener firmas:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('GET digital-signatures - firmas encontradas:', signatures?.length || 0)

    return NextResponse.json({ signatures: signatures || [] })
  } catch (error: any) {
    console.error('Error al obtener firmas digitales:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar la solicitud' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar permisos (solo admin/owner)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, default_company_id')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'super_admin'

    // Obtener company_id
    let companyId: string | null = null
    let companyUserRole: string | null = null

    if (isSuperAdmin) {
      // Si es super admin, usar default_company_id o la primera empresa disponible
      if ((profile as any)?.default_company_id) {
        companyId = (profile as any).default_company_id
      } else {
        const { data: firstCompany } = await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .maybeSingle()
        companyId = firstCompany?.id || null
      }
    } else {
      // Si no es super admin, obtener de company_users (puede tener múltiples empresas)
      const { data: companyUsers } = await supabase
        .from('company_users')
        .select('company_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('role', ['owner', 'admin'])
        .order('created_at', { ascending: true })
        .limit(1)

      if (!companyUsers || companyUsers.length === 0) {
        return NextResponse.json({ error: 'Usuario no asociado a una empresa o no tiene permisos de admin/owner' }, { status: 403 })
      }

      // Usar la primera empresa activa donde es owner/admin
      companyId = companyUsers[0].company_id
      companyUserRole = companyUsers[0].role
    }

    if (!companyId) {
      return NextResponse.json({ error: 'No se pudo determinar la empresa' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const signerName = formData.get('signer_name') as string
    const signerPosition = formData.get('signer_position') as string
    const signerRut = formData.get('signer_rut') as string
    const isActive = formData.get('is_active') === 'true'
    const requestedCompanyId = formData.get('company_id') as string | null

    // Si viene company_id en el request y es super admin, usarlo
    if (isSuperAdmin && requestedCompanyId) {
      // Verificar que la empresa existe
      const { data: companyExists } = await supabase
        .from('companies')
        .select('id')
        .eq('id', requestedCompanyId)
        .maybeSingle()
      
      if (companyExists) {
        companyId = requestedCompanyId
      }
    }

    console.log('POST digital-signatures - companyId:', companyId, 'isSuperAdmin:', isSuperAdmin, 'requestedCompanyId:', requestedCompanyId)

    if (!file || !signerName || !signerPosition || !signerRut) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: file, signer_name, signer_position, signer_rut' 
      }, { status: 400 })
    }

    // Validar que el archivo sea una imagen
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 })
    }

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Crear path en Storage: digital-signatures/{company_id}/{user_id}-{timestamp}.{ext}
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${user.id}-${timestamp}.${fileExt}`
    const filePath = `digital-signatures/${companyId}/${fileName}`

    // Subir imagen a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('digital-signatures')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error al subir firma:', uploadError)
      return NextResponse.json({ 
        error: uploadError.message || 'Error al subir imagen de firma' 
      }, { status: 500 })
    }

    // Obtener URL pública de la imagen
    // Si el bucket no es público, getPublicUrl aún funciona pero puede requerir autenticación
    // Para buckets privados, usaríamos createSignedUrl, pero para firmas digitales es mejor que sea público
    const {
      data: { publicUrl },
    } = supabase.storage.from('digital-signatures').getPublicUrl(filePath)
    
    console.log('URL pública generada para firma:', publicUrl)

    // Usar adminClient (service_role) para evitar problemas con RLS al verificar/crear firmas
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Si se está activando una firma, primero desactivar TODAS las demás firmas activas del mismo usuario en la misma empresa
    // Esto evita violar la restricción unique_active_signature
    if (isActive) {
      const { error: deactivateError } = await adminClient
        .from('digital_signatures')
        .update({ is_active: false })
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (deactivateError) {
        console.error('Error al desactivar firmas anteriores:', deactivateError)
        // Continuar de todas formas
      }
    }

    // Verificar si ya existe una firma para este usuario en esta empresa
    const { data: existing } = await adminClient
      .from('digital_signatures')
      .select('id, created_at')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle()

    let signature
    let wasUpdate = false

    if (existing) {
      // Actualizar firma existente (no eliminar porque puede estar referenciada por certificates, vacations, permissions)
      const { data: updated, error: updateError } = await adminClient
        .from('digital_signatures')
        .update({
          signature_image_url: publicUrl,
          signer_name: signerName,
          signer_position: signerPosition,
          signer_rut: signerRut,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error al actualizar firma:', updateError)
        return NextResponse.json({ 
          error: updateError.message || 'Error al actualizar firma digital' 
        }, { status: 500 })
      }

      signature = updated
      wasUpdate = true
    } else {
      // Crear nueva firma solo si no existe ninguna
      const { data: created, error: createError } = await adminClient
        .from('digital_signatures')
        .insert({
          company_id: companyId,
          user_id: user.id,
          signature_image_url: publicUrl,
          signer_name: signerName,
          signer_position: signerPosition,
          signer_rut: signerRut,
          is_active: isActive,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error al crear firma:', createError)
        // Si el error es por restricción única, intentar actualizar en su lugar
        if (createError.code === '23505' || createError.message?.includes('unique')) {
          // Buscar la firma existente nuevamente (puede haber sido creada por otra transacción)
          const { data: existingRetry } = await adminClient
            .from('digital_signatures')
            .select('id')
            .eq('company_id', companyId)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (existingRetry) {
            // Actualizar la firma existente
            const { data: updated, error: updateError } = await adminClient
              .from('digital_signatures')
              .update({
                signature_image_url: publicUrl,
                signer_name: signerName,
                signer_position: signerPosition,
                signer_rut: signerRut,
                is_active: isActive,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingRetry.id)
              .select()
              .single()

            if (updateError) {
              return NextResponse.json({ 
                error: updateError.message || 'Error al actualizar firma digital' 
              }, { status: 500 })
            }

            signature = updated
            wasUpdate = true
          } else {
            return NextResponse.json({ 
              error: createError.message || 'Error al crear firma digital' 
            }, { status: 500 })
          }
        } else {
          return NextResponse.json({ 
            error: createError.message || 'Error al crear firma digital' 
          }, { status: 500 })
        }
      } else {
        signature = created
        wasUpdate = false
      }
    }

    return NextResponse.json({ 
      success: true, 
      signature,
      message: wasUpdate ? 'Firma digital actualizada exitosamente' : 'Firma digital creada exitosamente'
    })
  } catch (error: any) {
    console.error('Error al gestionar firma digital:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar la solicitud' }, { status: 500 })
  }
}

