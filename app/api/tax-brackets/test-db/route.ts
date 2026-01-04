import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Endpoint de prueba para verificar conexión a la tabla tax_brackets
 */
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
    
    // Intentar leer todos los registros
    const { data, error } = await supabase
      .from('tax_brackets')
      .select('*')
      .limit(10)
    
    if (error) {
      return NextResponse.json({
        error: 'Error al consultar tabla',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }
    
    // Intentar insertar un registro de prueba
    const testData = {
      year: 2025,
      month: 12,
      period_type: 'MENSUAL',
      brackets: [{ desde: 0, hasta: 1000000, factor: 0, cantidad_rebajar: 0, tasa_efectiva: 'Exento' }],
      source: 'test'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('tax_brackets')
      .insert(testData)
      .select()
    
    if (insertError) {
      return NextResponse.json({
        error: 'Error al insertar en tabla',
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
        existingData: data
      }, { status: 500 })
    }
    
    // Eliminar el registro de prueba
    await supabase
      .from('tax_brackets')
      .delete()
      .eq('id', insertData[0].id)
    
    return NextResponse.json({
      success: true,
      message: 'Tabla tax_brackets funciona correctamente',
      existingRecords: data?.length || 0,
      testInsert: 'OK',
      testDelete: 'OK'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Error inesperado',
      details: error.message
    }, { status: 500 })
  }
}

