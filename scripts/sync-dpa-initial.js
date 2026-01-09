/**
 * Script para ejecutar sincronización inicial con API DPA
 * Ejecutar como: node scripts/sync-dpa-initial.js
 */

const API_DPA_BASE = 'https://apis.digital.gob.cl/dpa'

async function syncDPA() {
  console.log('🗺️  Iniciando sincronización con API DPA de Chile...\n')

  try {
    // 1. Obtener regiones
    console.log('📍 Obteniendo regiones...')
    const regionsResponse = await fetch(`${API_DPA_BASE}/regiones`)
    
    if (!regionsResponse.ok) {
      throw new Error(`Error obteniendo regiones: ${regionsResponse.status}`)
    }

    const regions = await regionsResponse.json()
    console.log(`   ✅ ${regions.length} regiones obtenidas`)

    // 2. Obtener provincias
    console.log('📍 Obteniendo provincias...')
    const provincesResponse = await fetch(`${API_DPA_BASE}/provincias`)
    
    if (!provincesResponse.ok) {
      throw new Error(`Error obteniendo provincias: ${provincesResponse.status}`)
    }

    const provinces = await provincesResponse.json()
    console.log(`   ✅ ${provinces.length} provincias obtenidas`)

    // 3. Obtener comunas
    console.log('📍 Obteniendo comunas...')
    const communesResponse = await fetch(`${API_DPA_BASE}/comunas`)
    
    if (!communesResponse.ok) {
      throw new Error(`Error obteniendo comunas: ${communesResponse.status}`)
    }

    const communes = await communesResponse.json()
    console.log(`   ✅ ${communes.length} comunas obtenidas\n`)

    // 4. Generar SQL
    console.log('📝 Generando SQL para inserción...\n')

    console.log('-- =====================================================')
    console.log('-- DATOS DPA DE CHILE - Generado automáticamente')
    console.log('-- =====================================================')
    console.log('-- Ejecuta este SQL en Supabase Dashboard → SQL Editor\n')

    // Map para tracking de códigos
    const regionCodeToId = new Map()

    // Insertar regiones
    console.log('-- 1. REGIONES')
    console.log('INSERT INTO geo_regions (code, name, active) VALUES')
    regions.forEach((region, idx) => {
      const comma = idx < regions.length - 1 ? ',' : ''
      console.log(`  ('${region.codigo}', '${region.nombre.replace(/'/g, "''")}', true)${comma}`)
      
      // Para el map, usar un UUID ficticio (en producción Supabase generará el real)
      regionCodeToId.set(region.codigo, `region_${region.codigo}`)
    })
    console.log('ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active;\n')

    // Insertar provincias
    console.log('-- 2. PROVINCIAS')
    console.log('INSERT INTO geo_provinces (code, name, region_id, active)')
    console.log('SELECT')
    console.log('  p.code,')
    console.log('  p.name,')
    console.log('  r.id,')
    console.log('  p.active')
    console.log('FROM (VALUES')
    
    provinces.forEach((province, idx) => {
      const comma = idx < provinces.length - 1 ? ',' : ''
      console.log(`  ('${province.codigo}', '${province.nombre.replace(/'/g, "''")}', '${province.region_codigo}', true)${comma}`)
    })
    
    console.log(') AS p(code, name, region_code, active)')
    console.log('JOIN geo_regions r ON r.code = p.region_code')
    console.log('ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active;\n')

    // Insertar comunas
    console.log('-- 3. COMUNAS')
    console.log('INSERT INTO geo_communes (code, name, region_id, province_id, active)')
    console.log('SELECT')
    console.log('  c.code,')
    console.log('  c.name,')
    console.log('  r.id,')
    console.log('  p.id,')
    console.log('  c.active')
    console.log('FROM (VALUES')
    
    communes.forEach((commune, idx) => {
      const comma = idx < communes.length - 1 ? ',' : ''
      console.log(`  ('${commune.codigo}', '${commune.nombre.replace(/'/g, "''")}', '${commune.region_codigo}', '${commune.provincia_codigo}', true)${comma}`)
    })
    
    console.log(') AS c(code, name, region_code, province_code, active)')
    console.log('JOIN geo_regions r ON r.code = c.region_code')
    console.log('LEFT JOIN geo_provinces p ON p.code = c.province_code')
    console.log('ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active;')

    console.log('\n-- =====================================================')
    console.log('-- VERIFICACIÓN')
    console.log('-- =====================================================')
    console.log('SELECT COUNT(*) as total_regiones FROM geo_regions WHERE active = true;')
    console.log('SELECT COUNT(*) as total_provincias FROM geo_provinces WHERE active = true;')
    console.log('SELECT COUNT(*) as total_comunas FROM geo_communes WHERE active = true;')

    console.log('\n✅ SQL generado exitosamente!')
    console.log('\n📋 SIGUIENTE PASO:')
    console.log('   1. Copia todo el SQL generado arriba')
    console.log('   2. Ve a Supabase Dashboard → SQL Editor')
    console.log('   3. Pega el SQL y ejecuta (Run)')
    console.log('   4. Verifica los resultados')
    console.log('   5. Refresca la aplicación\n')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

syncDPA()


