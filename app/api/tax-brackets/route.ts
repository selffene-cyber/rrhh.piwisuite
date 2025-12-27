import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignorar errores de set en Server Components
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Ignorar errores de remove en Server Components
            }
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const periodType = searchParams.get('period_type') || 'MENSUAL'
    
    let query = supabase
      .from('tax_brackets')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    
    if (year) {
      query = query.eq('year', parseInt(year))
    }
    if (month) {
      query = query.eq('month', parseInt(month))
    }
    if (periodType) {
      query = query.eq('period_type', periodType)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    // Si se especificó year y month, devolver solo el más reciente con brackets
    if (year && month) {
      const latest = data && data.length > 0 ? data[0] : null
      if (latest && latest.brackets) {
        return NextResponse.json({ brackets: latest.brackets })
      }
      return NextResponse.json({ brackets: null })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error al obtener tramos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener tramos' },
      { status: 500 }
    )
  }
}

