import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getCompanyUsers, assignUserToCompany, removeUserFromCompany, updateUserCompanyRole, findUserByEmail } from '@/lib/services/companyUserService'

// GET: Obtener usuarios de una empresa
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

    const users = await getCompanyUsers(params.id, supabase)
    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('Error al obtener usuarios de empresa:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST: Asignar usuario a empresa (por email)
export async function POST(
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
    const { email, role = 'user' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 })
    }

    // Buscar usuario por email
    const foundUser = await findUserByEmail(email, supabase)
    
    if (!foundUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const companyUser = await assignUserToCompany(params.id, foundUser.id, supabase, role)
    return NextResponse.json({ companyUser, message: 'Usuario asignado exitosamente' })
  } catch (error: any) {
    console.error('Error al asignar usuario:', error)
    return NextResponse.json({ error: error.message || 'Error al asignar usuario' }, { status: 500 })
  }
}

// DELETE: Remover usuario de empresa
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id es requerido' }, { status: 400 })
    }

    await removeUserFromCompany(params.id, userId, supabase)
    return NextResponse.json({ message: 'Usuario removido exitosamente' })
  } catch (error: any) {
    console.error('Error al remover usuario:', error)
    return NextResponse.json({ error: error.message || 'Error al remover usuario' }, { status: 500 })
  }
}

// PUT: Actualizar rol de usuario en empresa
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
    const { user_id, role } = body

    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id y role son requeridos' }, { status: 400 })
    }

    if (!['owner', 'admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const companyUser = await updateUserCompanyRole(params.id, user_id, role, supabase)
    return NextResponse.json({ companyUser, message: 'Rol actualizado exitosamente' })
  } catch (error: any) {
    console.error('Error al actualizar rol:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar rol' }, { status: 500 })
  }
}

