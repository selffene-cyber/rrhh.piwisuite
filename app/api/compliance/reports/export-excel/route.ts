import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const status = searchParams.get('status')
    const tipo = searchParams.get('tipo')
    const criticidad = searchParams.get('criticidad')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
    }

    // Obtener datos de cumplimientos
    const params = new URLSearchParams({ company_id: companyId })
    if (status) params.append('status', status)

    const complianceResponse = await fetch(
      `${request.nextUrl.origin}/api/compliance/worker?${params.toString()}`
    )
    if (!complianceResponse.ok) {
      throw new Error('Error al obtener cumplimientos')
    }
    const complianceData = await complianceResponse.json()

    // Obtener items para completar información
    const itemsResponse = await fetch(
      `${request.nextUrl.origin}/api/compliance/items?company_id=${companyId}`
    )
    const items = itemsResponse.ok ? await itemsResponse.json() : []
    const itemsMap = new Map(items.map((item: any) => [item.id, item]))

    // Transformar datos
    let transformed = complianceData.map((item: any) => {
      const complianceItem = itemsMap.get(item.compliance_item_id) as any
      const diasRestantes = Math.ceil(
        (new Date(item.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        'RUT Trabajador': item.employees?.rut || 'N/A',
        'Nombre Trabajador': item.employees?.full_name || 'N/A',
        'Cargo': item.employees?.position || 'N/A',
        'Ítem de Cumplimiento': complianceItem?.nombre || item.compliance_items?.nombre || 'N/A',
        'Tipo': complianceItem?.tipo || item.compliance_items?.tipo || 'OTRO',
        'Criticidad': complianceItem?.criticidad || item.compliance_items?.criticidad || 'MEDIA',
        'Fecha Emisión': new Date(item.fecha_emision).toLocaleDateString('es-CL'),
        'Fecha Vencimiento': new Date(item.fecha_vencimiento).toLocaleDateString('es-CL'),
        'Días Restantes': diasRestantes < 0 ? `Vencido hace ${Math.abs(diasRestantes)}` : diasRestantes,
        'Estado': item.status,
        'Evidencia': item.evidencia_url ? 'Sí' : 'No',
        'Verificado Por': item.verificado_por || 'Pendiente',
        'Fecha Verificación': item.fecha_verificacion
          ? new Date(item.fecha_verificacion).toLocaleDateString('es-CL')
          : 'Pendiente',
        'Notas': item.notas || '',
      }
    })

    // Aplicar filtros adicionales
    if (tipo && tipo !== 'all') {
      transformed = transformed.filter((c: any) => c.Tipo === tipo)
    }
    if (criticidad && criticidad !== 'all') {
      transformed = transformed.filter((c: any) => c.Criticidad === criticidad)
    }

    // Generar CSV (compatible con Excel)
    const headers = Object.keys(transformed[0] || {})
    const rows = transformed.map((row: any) => headers.map((header) => row[header] || ''))

    // Escapar valores que contengan comas, comillas o saltos de línea
    const escapeCSV = (value: any) => {
      const str = String(value || '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row: any[]) => row.map(escapeCSV).join(','))
    ].join('\n')

    // Agregar BOM para Excel (UTF-8)
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    const fileName = `reporte-cumplimientos-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Error generando reporte Excel:', error)
    return NextResponse.json({ error: 'Error al generar reporte Excel' }, { status: 500 })
  }
}

