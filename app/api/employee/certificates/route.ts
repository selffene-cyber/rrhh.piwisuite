import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API para que un trabajador vea sus certificados
 * Solo puede ver sus propios certificados
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que es trabajador y obtener su employee_id
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ 
        error: 'No se encontró información del trabajador' 
      }, { status: 403 })
    }

    // Obtener certificados del trabajador
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    console.log(`[Employee Certificates API] Buscando certificados para employee_id: ${employee.id}, status: ${status || 'all'}`)
    console.log(`[Employee Certificates API] User ID: ${user.id}`)

    // Las políticas RLS deberían filtrar automáticamente por employee_id
    // Hacemos la consulta sin filtro manual primero para ver qué devuelve RLS
    let query = supabase
      .from('certificates')
      .select(`
        *,
        companies (id, name)
      `)
      .order('created_at', { ascending: false })
    
    // Aplicar filtro manual SOLO si se especifica un status
    // Esto permite que RLS funcione primero, y luego filtramos por status si es necesario
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    // NOTA: No filtramos por employee_id manualmente aquí
    // Las políticas RLS deberían hacerlo automáticamente
    // Si RLS no funciona, los certificados de otros empleados no deberían aparecer de todos modos

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: certificates, error: certError } = await query

    if (certError) {
      console.error('[Employee Certificates API] Error al obtener certificados:', certError)
      console.error('[Employee Certificates API] Error code:', certError.code)
      console.error('[Employee Certificates API] Error message:', certError.message)
      console.error('[Employee Certificates API] Error details:', JSON.stringify(certError, null, 2))
      return NextResponse.json({ 
        error: certError.message || 'Error al obtener certificados' 
      }, { status: 500 })
    }

    // Filtrar manualmente por employee_id como medida de seguridad adicional
    // (aunque RLS debería haberlo hecho ya)
    const filteredCertificates = (certificates || []).filter(cert => cert.employee_id === employee.id)
    
    console.log(`[Employee Certificates API] Certificados encontrados por RLS: ${certificates?.length || 0}`)
    console.log(`[Employee Certificates API] Certificados después de filtro manual: ${filteredCertificates.length}`)
    
    if (filteredCertificates.length > 0) {
      filteredCertificates.forEach((cert, idx) => {
        console.log(`[Employee Certificates API] Certificado ${idx + 1}: id=${cert.id}, status=${cert.status}, employee_id=${cert.employee_id}, created_at=${cert.created_at}, requested_at=${cert.requested_at}`)
      })
      
      // Verificar si hay certificados con status 'requested'
      const requestedCerts = filteredCertificates.filter(c => c.status === 'requested')
      console.log(`[Employee Certificates API] Certificados con status 'requested': ${requestedCerts.length}`)
      
      if (requestedCerts.length > 0) {
        console.log(`[Employee Certificates API] ✅ Los certificados con status 'requested' SÍ están apareciendo`)
      } else {
        console.warn(`[Employee Certificates API] ⚠️ No hay certificados con status 'requested' en los resultados`)
      }
    } else {
      console.log('[Employee Certificates API] No se encontraron certificados')
      if (certificates && certificates.length > 0) {
        console.warn(`[Employee Certificates API] ⚠️ RLS devolvió ${certificates.length} certificados, pero ninguno coincide con employee_id ${employee.id}`)
        certificates.forEach((cert, idx) => {
          console.warn(`[Employee Certificates API] Certificado ${idx + 1}: employee_id=${cert.employee_id} (esperado: ${employee.id})`)
        })
      }
    }

    return NextResponse.json({ certificates: filteredCertificates })
  } catch (error: any) {
    console.error('Error al obtener certificados:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al procesar la solicitud' 
    }, { status: 500 })
  }
}



