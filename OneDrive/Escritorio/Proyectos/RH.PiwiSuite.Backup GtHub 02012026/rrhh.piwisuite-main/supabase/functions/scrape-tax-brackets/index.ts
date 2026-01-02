// Supabase Edge Function para ejecutar el scraper automáticamente
// Se puede programar con pg_cron o ejecutar manualmente

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtener fecha actual
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    // Obtener mes siguiente (para actualizar antes de que comience)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year

    // Construir URL del SII
    const url = `https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto${nextYear}.htm`
    
    // Obtener HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Error al obtener página del SII: ${response.status}`)
    }
    
    const html = await response.text()
    
    // Parsear tramos (simplificado - usar la lógica del scraper principal)
    // Por ahora, esta función solo sirve como placeholder
    // La lógica completa está en lib/services/taxBracketsScraper.ts
    
    return new Response(
      JSON.stringify({ 
        message: 'Scraper ejecutado. Usar la API route /api/tax-brackets/scrape para la funcionalidad completa.',
        year: nextYear,
        month: nextMonth
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

