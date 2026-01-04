import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'
import { getPayrollBook } from '@/lib/services/payrollBookGenerator'

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

    const bookId = params.id

    if (!bookId) {
      return NextResponse.json({ error: 'ID del libro es requerido' }, { status: 400 })
    }

    const book = await getPayrollBook(bookId, supabase)

    // Generar CSV
    const headers = [
      'RUT',
      'Nombre',
      'Fecha Ingreso',
      'Fecha Término',
      'Tipo Contrato',
      'AFP',
      'Sistema Salud',
      'Plan Salud',
      'Cargo',
      'Centro Costo',
      'Sueldo Base',
      'Gratificación Mensual',
      'Bonos',
      'Horas Extra',
      'Vacaciones Pagadas',
      'Otros Haberes Imponibles',
      'Total Haberes Imponibles',
      'Transporte',
      'Colación',
      'Aguinaldo',
      'Otros Haberes No Imponibles',
      'Total Haberes No Imponibles',
      'Descuento AFP',
      'Descuento Salud',
      'Descuento Seguro Cesantía',
      'Descuento Impuesto Único',
      'Total Descuentos Legales',
      'Descuento Préstamos',
      'Descuento Anticipos',
      'Otros Descuentos',
      'Total Otros Descuentos',
      'Aporte Empleador AFP',
      'Aporte Empleador SIS',
      'Aporte Empleador AFC',
      'Total Aportes Empleador',
      'Líquido a Pagar'
    ]

    const rows = book.entries.map(entry => [
      entry.employee_rut || '',
      entry.employee_name || '',
      entry.employee_hire_date || '',
      entry.employee_contract_end_date || '',
      entry.employee_contract_type || '',
      entry.employee_afp || '',
      entry.employee_health_system || '',
      entry.employee_health_plan || '',
      entry.employee_position || '',
      entry.employee_cost_center || '',
      entry.base_salary?.toString() || '0',
      entry.monthly_gratification?.toString() || '0',
      entry.bonuses?.toString() || '0',
      entry.overtime?.toString() || '0',
      entry.vacation_paid?.toString() || '0',
      entry.other_taxable_earnings?.toString() || '0',
      entry.total_taxable_earnings?.toString() || '0',
      entry.transportation?.toString() || '0',
      entry.meal_allowance?.toString() || '0',
      entry.aguinaldo?.toString() || '0',
      entry.other_non_taxable_earnings?.toString() || '0',
      entry.total_non_taxable_earnings?.toString() || '0',
      entry.afp_deduction?.toString() || '0',
      entry.health_deduction?.toString() || '0',
      entry.unemployment_insurance_deduction?.toString() || '0',
      entry.unique_tax_deduction?.toString() || '0',
      entry.total_legal_deductions?.toString() || '0',
      entry.loans_deduction?.toString() || '0',
      entry.advances_deduction?.toString() || '0',
      entry.other_deductions?.toString() || '0',
      entry.total_other_deductions?.toString() || '0',
      entry.employer_afp_contribution?.toString() || '0',
      entry.employer_sis_contribution?.toString() || '0',
      entry.employer_afc_contribution?.toString() || '0',
      entry.total_employer_contributions?.toString() || '0',
      entry.net_pay?.toString() || '0'
    ])

    // Escapar valores que contengan comas o comillas
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Agregar BOM para Excel
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="libro-remuneraciones-${book.year}-${String(book.month).padStart(2, '0')}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar CSV:', error)
    return NextResponse.json({ error: error.message || 'Error al exportar CSV' }, { status: 500 })
  }
}

