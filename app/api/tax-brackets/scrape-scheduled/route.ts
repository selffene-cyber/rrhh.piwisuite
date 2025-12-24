import { NextRequest, NextResponse } from 'next/server'
import { scrapeTaxBrackets, saveTaxBrackets } from '@/lib/services/taxBracketsScraper'

/**
 * Endpoint para ejecutar el scraper programado
 * Se puede llamar desde un cron job (Vercel Cron, GitHub Actions, etc.)
 * Requiere un token secreto para seguridad
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar token secreto
    const authHeader = request.headers.get('authorization')
    const secretToken = process.env.CRON_SECRET_TOKEN
    
    if (secretToken && authHeader !== `Bearer ${secretToken}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    // Obtener fecha actual
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    // Obtener mes siguiente (para actualizar antes de que comience)
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
    
    const results = []
    
    // Scrapear mes actual (por si hay actualizaciones)
    try {
      console.log(`Scrapeando tramos para mes actual: ${currentMonth}/${currentYear}`)
      const currentBrackets = await scrapeTaxBrackets(currentYear, currentMonth)
      await saveTaxBrackets(currentYear, currentMonth, currentBrackets)
      results.push({ month: currentMonth, year: currentYear, success: true })
    } catch (error: any) {
      console.error(`Error al scrapear mes actual:`, error)
      results.push({ month: currentMonth, year: currentYear, success: false, error: error.message })
    }
    
    // Scrapear mes siguiente (para tener datos listos)
    try {
      console.log(`Scrapeando tramos para mes siguiente: ${nextMonth}/${nextYear}`)
      const nextBrackets = await scrapeTaxBrackets(nextYear, nextMonth)
      await saveTaxBrackets(nextYear, nextMonth, nextBrackets)
      results.push({ month: nextMonth, year: nextYear, success: true })
    } catch (error: any) {
      console.error(`Error al scrapear mes siguiente:`, error)
      results.push({ month: nextMonth, year: nextYear, success: false, error: error.message })
    }
    
    const successCount = results.filter(r => r.success).length
    
    return NextResponse.json({
      success: successCount > 0,
      message: `Tramos actualizados: ${successCount}/${results.length} meses procesados`,
      results
    })
  } catch (error: any) {
    console.error('Error en scraper programado:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener tramos del SII' },
      { status: 500 }
    )
  }
}

