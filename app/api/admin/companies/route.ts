import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getAllCompanies, createCompany } from '@/lib/services/companyService'

// GET: Obtener todas las empresas (solo super admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    // Verificar que el usuario esté autenticado y sea super admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const companies = await getAllCompanies(supabase)
    return NextResponse.json({ companies })
  } catch (error: any) {
    console.error('Error al obtener empresas:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener empresas' }, { status: 500 })
  }
}

// POST: Crear nueva empresa
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Solo los super administradores pueden crear empresas' }, { status: 403 })
    }

    const body = await request.json()
    const { name, employer_name, rut, address, city, owner_id } = body

    if (!name || !employer_name || !rut) {
      return NextResponse.json({ error: 'Nombre, nombre del empleador y RUT son requeridos' }, { status: 400 })
    }

    const company = await createCompany({
      name,
      employer_name,
      rut,
      address: address || null,
      city: city || null,
    }, supabase, owner_id)

    return NextResponse.json({ company, message: 'Empresa creada exitosamente' })
  } catch (error: any) {
    console.error('Error al crear empresa:', error)
    return NextResponse.json({ error: error.message || 'Error al crear empresa' }, { status: 500 })
  }
}

