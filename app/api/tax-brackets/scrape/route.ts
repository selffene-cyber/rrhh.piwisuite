import { NextRequest, NextResponse } from 'next/server'
import { scrapeTaxBrackets, saveTaxBrackets } from '@/lib/services/taxBracketsScraper'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
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
    
    // Verificar que sea admin (opcional, puedes ajustar según tu lógica)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Parsear body
    const body = await request.json()
    const { year, month } = body
    
    if (!year || !month) {
      return NextResponse.json(
        { error: 'Se requiere year y month' },
        { status: 400 }
      )
    }
    
    // Scrapear tramos del SII
    console.log(`Iniciando scraper para ${month}/${year}`)
    const scrapedBrackets = await scrapeTaxBrackets(year, month)
    
    console.log('Tramos scrapeados:', scrapedBrackets.length, 'tipos de período')
    
    if (scrapedBrackets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron tramos en la página del SII. Verifica que el mes y año sean correctos.',
        message: `No se pudieron extraer tramos para ${month}/${year}`
      }, { status: 400 })
    }
    
    console.log('Datos scrapeados - resumen:', scrapedBrackets.map(b => ({
      period_type: b.period_type,
      brackets_count: b.brackets.length,
      year: b.year,
      month: b.month
    })))
    
    // Guardar en base de datos
    try {
      await saveTaxBrackets(year, month, scrapedBrackets)
      console.log('Tramos guardados correctamente')
      
      // Verificar que se guardaron
      const { createServerClient } = await import('@/lib/supabase/server')
      const verifyClient = await createServerClient()
      const { data: verifyData } = await verifyClient
        .from('tax_brackets')
        .select('*')
        .eq('year', year)
        .eq('month', month)
      
      console.log('Verificación post-guardado:', verifyData?.length || 0, 'registros encontrados')
      
    } catch (saveError: any) {
      console.error('Error al guardar tramos:', saveError)
      return NextResponse.json({
        success: false,
        error: saveError.message || 'Error al guardar tramos en la base de datos',
        details: saveError
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `Tramos actualizados para ${month}/${year}`,
      data: scrapedBrackets,
      summary: {
        totalPeriods: scrapedBrackets.length,
        periods: scrapedBrackets.map(b => b.period_type)
      }
    })
  } catch (error: any) {
    console.error('Error al scrapear tramos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener tramos del SII' },
      { status: 500 }
    )
  }
}

