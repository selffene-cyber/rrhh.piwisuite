import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getCompanyById, updateCompany, deleteCompany } from '@/lib/services/companyService'

// GET: Obtener empresa por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const company = await getCompanyById(params.id, supabase)
    
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ company })
  } catch (error: any) {
    console.error('Error al obtener empresa:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener empresa' }, { status: 500 })
  }
}

// PUT: Actualizar empresa
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClientForAPI(request)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const updates: any = {}

    if (body.name !== undefined) updates.name = body.name
    if (body.employer_name !== undefined) updates.employer_name = body.employer_name
    if (body.rut !== undefined) updates.rut = body.rut
    if (body.address !== undefined) updates.address = body.address
    if (body.city !== undefined) updates.city = body.city
    if (body.status !== undefined) updates.status = body.status
    if (body.subscription_tier !== undefined) updates.subscription_tier = body.subscription_tier
    if (body.max_users !== undefined) updates.max_users = body.max_users
    if (body.max_employees !== undefined) updates.max_employees = body.max_employees

    const company = await updateCompany(params.id, updates, supabase)
    return NextResponse.json({ company, message: 'Empresa actualizada exitosamente' })
  } catch (error: any) {
    console.error('Error al actualizar empresa:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar empresa' }, { status: 500 })
  }
}

// DELETE: Eliminar empresa
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: 'Solo los super administradores pueden eliminar empresas' }, { status: 403 })
    }

    await deleteCompany(params.id, supabase)
    return NextResponse.json({ message: 'Empresa eliminada exitosamente' })
  } catch (error: any) {
    console.error('Error al eliminar empresa:', error)
    return NextResponse.json({ error: error.message || 'Error al eliminar empresa' }, { status: 500 })
  }
}

