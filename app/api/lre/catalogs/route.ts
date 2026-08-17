import { NextResponse } from 'next/server'
import { getAllCatalogs } from '@/lib/services/lre/lreCatalogService'

export async function GET() {
  try {
    const catalogs = await getAllCatalogs()
    return NextResponse.json(catalogs)
  } catch (error) {
    console.error('[LRE Catalogs API] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener catálogos LRE' },
      { status: 500 }
    )
  }
}